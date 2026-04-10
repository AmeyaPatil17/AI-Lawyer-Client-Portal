import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    getCurrentAISettings,
    hasProviderApiKey,
    getAiOperationalSettings,
    type AIProvider,
} from './aiSettingsService';

type UsageMetadata = {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
};

type WrappedResponse = {
    text(): string;
    usageMetadata?: UsageMetadata;
};

type WrappedResult = {
    response: Promise<WrappedResponse> | WrappedResponse;
};

type WrappedStreamChunk = {
    text(): string;
};

type WrappedStreamResult = {
    stream: AsyncIterable<WrappedStreamChunk>;
    response: Promise<WrappedResponse>;
};

type ChatHistoryEntry = {
    role: string;
    parts: Array<{ text: string }>;
};

type ModelWrapper = {
    generateContent(input: any): Promise<WrappedResult>;
    startChat(config: { history: ChatHistoryEntry[] }): {
        sendMessage(message: string): Promise<WrappedResult>;
        sendMessageStream(message: string): Promise<WrappedStreamResult>;
    };
};

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<Record<string, any>>;
};

let cachedGenAI: GoogleGenerativeAI | null = null;
const cachedGeminiModels = new Map<string, any>();

const normalizeUsageMetadata = (usage: any): UsageMetadata | undefined => {
    if (!usage) return undefined;

    if (typeof usage.promptTokenCount === 'number') {
        return {
            promptTokenCount: usage.promptTokenCount || 0,
            candidatesTokenCount: usage.candidatesTokenCount || 0,
            totalTokenCount: usage.totalTokenCount || 0,
        };
    }

    if (typeof usage.prompt_tokens === 'number') {
        return {
            promptTokenCount: usage.prompt_tokens || 0,
            candidatesTokenCount: usage.completion_tokens || 0,
            totalTokenCount: usage.total_tokens || 0,
        };
    }

    return undefined;
};

const extractOpenAIText = (content: any): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item?.text) return String(item.text);
                return '';
            })
            .join('');
    }
    return '';
};

const toGeminiCacheKey = (model: string, config: any = {}) => `${model}:${JSON.stringify(config || {})}`;

const getGenAI = () => {
    if (!cachedGenAI) {
        cachedGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }
    return cachedGenAI;
};

const getGeminiModel = (modelName: string, config: any = {}) => {
    const cacheKey = toGeminiCacheKey(modelName, config);
    if (!cachedGeminiModels.has(cacheKey)) {
        cachedGeminiModels.set(cacheKey, getGenAI().getGenerativeModel({ model: modelName, ...config }));
    }
    return cachedGeminiModels.get(cacheKey);
};

const getOpenAIHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
});

const buildOpenAIMessagesFromHistory = (history: ChatHistoryEntry[], currentMessage?: string): OpenAIMessage[] => {
    const messages: OpenAIMessage[] = history.map((entry, index) => {
        const text = entry.parts.map((part) => part.text).join('\n');
        const role = entry.role === 'model' ? 'assistant' : 'user';

        if (index === 0 && role === 'user') {
            return { role: 'system', content: text };
        }

        return { role, content: text };
    });

    if (currentMessage) {
        messages.push({ role: 'user', content: currentMessage });
    }

    return messages;
};

const buildOpenAIContentPayload = (input: any) => {
    if (Array.isArray(input)) {
        const [prompt, image] = input;
        const content: Array<Record<string, any>> = [];

        if (typeof prompt === 'string') {
            content.push({ type: 'text', text: prompt });
        }

        if (image?.inlineData?.data && image?.inlineData?.mimeType) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:${image.inlineData.mimeType};base64,${image.inlineData.data}`,
                },
            });
        }

        return content;
    }

    return typeof input === 'string' ? input : JSON.stringify(input);
};

const createWrappedResponse = (text: string, usage?: any): WrappedResponse => ({
    text: () => text,
    usageMetadata: normalizeUsageMetadata(usage),
});

// ── Retry & rate-limit helpers ───────────────────────────────────────────
// Initialize to a large value so the bucket is effectively "full" on startup.
// The refill math in acquireRateToken() will cap it to rateLimitPerMinute.
const rateBucket = { tokens: 1_000_000, lastRefill: Date.now() };

function acquireRateToken(): boolean {
    const { rateLimitPerMinute } = getAiOperationalSettings();
    const now = Date.now();
    const elapsed = (now - rateBucket.lastRefill) / 60_000; // fraction of a minute
    rateBucket.tokens = Math.min(rateLimitPerMinute, rateBucket.tokens + elapsed * rateLimitPerMinute);
    rateBucket.lastRefill = now;
    if (rateBucket.tokens < 1) return false;
    rateBucket.tokens -= 1;
    return true;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (!acquireRateToken()) {
        throw new Error('AI rate limit exceeded. Please try again shortly.');
    }
    const { maxRetries } = getAiOperationalSettings();
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try { return await fn(); }
        catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}
// ─────────────────────────────────────────────────────────────────────────

const callOpenAIChatCompletion = async (body: Record<string, any>) => {
    const response = await withRetry(() => fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: getOpenAIHeaders(),
        body: JSON.stringify(body),
    }));

    if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    return await response.json();
};

const getOpenAIModelWrapper = (modelName: string, config: any = {}): ModelWrapper => ({
    async generateContent(input: any) {
        const body: Record<string, any> = {
            model: modelName,
            messages: [{ role: 'user', content: buildOpenAIContentPayload(input) }],
        };

        if (config?.generationConfig?.responseMimeType === 'application/json') {
            body.response_format = { type: 'json_object' };
        }

        const json = await callOpenAIChatCompletion(body);
        const text = extractOpenAIText(json?.choices?.[0]?.message?.content);

        return {
            response: createWrappedResponse(text, json?.usage),
        };
    },

    startChat({ history }) {
        return {
            async sendMessage(message: string) {
                const json = await callOpenAIChatCompletion({
                    model: modelName,
                    messages: buildOpenAIMessagesFromHistory(history, message),
                });

                return {
                    response: createWrappedResponse(
                        extractOpenAIText(json?.choices?.[0]?.message?.content),
                        json?.usage
                    ),
                };
            },

            async sendMessageStream(message: string) {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: getOpenAIHeaders(),
                    body: JSON.stringify({
                        model: modelName,
                        messages: buildOpenAIMessagesFromHistory(history, message),
                        stream: true,
                        stream_options: { include_usage: true },
                    }),
                });

                if (!response.ok || !response.body) {
                    throw new Error(`OpenAI stream request failed with status ${response.status}`);
                }

                const decoder = new TextDecoder();
                const reader = response.body.getReader();
                let buffered = '';
                let accumulated = '';
                let usageMetadata: UsageMetadata | undefined;
                let doneResolve: (value: WrappedResponse) => void = () => undefined;
                let doneReject: (reason?: unknown) => void = () => undefined;

                const donePromise = new Promise<WrappedResponse>((resolve, reject) => {
                    doneResolve = resolve;
                    doneReject = reject;
                });

                const stream = (async function* () {
                    try {
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;

                            buffered += decoder.decode(value, { stream: true });
                            const events = buffered.split('\n\n');
                            buffered = events.pop() || '';

                            for (const event of events) {
                                const lines = event
                                    .split('\n')
                                    .filter((line) => line.startsWith('data:'))
                                    .map((line) => line.replace(/^data:\s*/, '').trim())
                                    .filter(Boolean);

                                for (const line of lines) {
                                    if (line === '[DONE]') {
                                        doneResolve(createWrappedResponse(accumulated, usageMetadata));
                                        return;
                                    }

                                    const payload = JSON.parse(line);
                                    if (payload?.usage) {
                                        usageMetadata = normalizeUsageMetadata(payload.usage);
                                    }

                                    const delta = payload?.choices?.[0]?.delta?.content;
                                    const text = extractOpenAIText(delta);
                                    if (text) {
                                        accumulated += text;
                                        yield { text: () => text };
                                    }
                                }
                            }
                        }

                        doneResolve(createWrappedResponse(accumulated, usageMetadata));
                    } catch (error) {
                        doneReject(error);
                        throw error;
                    }
                })();

                return {
                    stream,
                    response: donePromise,
                };
            },
        };
    },
});

export const getModel = (config: any = {}): ModelWrapper => {
    const settings = getCurrentAISettings();

    if (settings.provider === 'openai') {
        return getOpenAIModelWrapper(settings.model, config);
    }

    const geminiModel = getGeminiModel(settings.model, config);
    return {
        generateContent: (input: any) => withRetry(() => geminiModel.generateContent(input)),
        startChat: (chatConfig: { history: ChatHistoryEntry[] }) => geminiModel.startChat(chatConfig),
    };
};

export const getActiveAIProvider = (): AIProvider => getCurrentAISettings().provider;

export const isActiveAIConfigured = () => {
    const settings = getCurrentAISettings();
    return hasProviderApiKey(settings.provider);
};

export const resetAIModel = () => {
    cachedGenAI = null;
    cachedGeminiModels.clear();
};
