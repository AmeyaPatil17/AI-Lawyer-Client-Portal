import SystemSetting from '../models/SystemSetting';

export type AIProvider = 'gemini' | 'openai';

export interface AIRuntimeSettings {
    provider: AIProvider;
    model: string;
}

export interface AIProviderOption {
    id: AIProvider;
    label: string;
    enabled: boolean;
    reason?: string;
}

export interface AIModelOption {
    id: string;
    label: string;
}

const AI_SETTINGS_KEY = 'ai.runtime';

const buildUniqueModelList = (...values: Array<string | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => !!value && value.trim().length > 0)));

const GEMINI_MODEL_OPTIONS = buildUniqueModelList(
    process.env.GEMINI_MODEL,
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
);

const OPENAI_MODEL_OPTIONS = buildUniqueModelList(
    process.env.OPENAI_MODEL,
    'gpt-4.1-mini',
    'gpt-4o-mini',
    'gpt-5-mini',
);

const DEFAULT_PROVIDER: AIProvider = process.env.AI_PROVIDER === 'openai' ? 'openai' : 'gemini';

function resolveDefaultModel(provider: AIProvider) {
    if (provider === 'openai') {
        return process.env.OPENAI_MODEL || OPENAI_MODEL_OPTIONS[0] || 'gpt-4.1-mini';
    }
    return process.env.GEMINI_MODEL || GEMINI_MODEL_OPTIONS[0] || 'gemini-1.5-flash';
}

let currentSettings: AIRuntimeSettings = {
    provider: DEFAULT_PROVIDER,
    model: resolveDefaultModel(DEFAULT_PROVIDER),
};

let aiSettingsInitialized = false;

function isValidProvider(provider: unknown): provider is AIProvider {
    return provider === 'gemini' || provider === 'openai';
}

function normalizeSettings(value: unknown): AIRuntimeSettings {
    const provider = isValidProvider((value as AIRuntimeSettings | undefined)?.provider)
        ? (value as AIRuntimeSettings).provider
        : DEFAULT_PROVIDER;
    const rawModel = typeof (value as AIRuntimeSettings | undefined)?.model === 'string'
        ? (value as AIRuntimeSettings).model.trim()
        : '';

    return {
        provider,
        model: rawModel || resolveDefaultModel(provider),
    };
}

export function hasProviderApiKey(provider: AIProvider) {
    return provider === 'openai'
        ? !!process.env.OPENAI_API_KEY
        : !!process.env.GEMINI_API_KEY;
}

export function getCurrentAISettings() {
    return currentSettings;
}

export function getCurrentAIModelName() {
    return currentSettings.model;
}

export function getCurrentAITrackingLabel() {
    return `${currentSettings.provider}:${currentSettings.model}`;
}

export function isCurrentAIProviderConfigured() {
    return hasProviderApiKey(currentSettings.provider);
}

export function getAISettingsMetadata() {
    return {
        current: currentSettings,
        defaults: {
            provider: DEFAULT_PROVIDER,
            model: resolveDefaultModel(DEFAULT_PROVIDER),
        },
        providers: [
            {
                id: 'gemini' as const,
                label: 'Gemini',
                enabled: hasProviderApiKey('gemini'),
                reason: hasProviderApiKey('gemini') ? undefined : 'Missing GEMINI_API_KEY',
            },
            {
                id: 'openai' as const,
                label: 'ChatGPT',
                enabled: hasProviderApiKey('openai'),
                reason: hasProviderApiKey('openai') ? undefined : 'Missing OPENAI_API_KEY',
            },
        ] satisfies AIProviderOption[],
        models: {
            gemini: GEMINI_MODEL_OPTIONS.map((id) => ({ id, label: id })) satisfies AIModelOption[],
            openai: OPENAI_MODEL_OPTIONS.map((id) => ({ id, label: id })) satisfies AIModelOption[],
        },
        credentials: {
            geminiConfigured: hasProviderApiKey('gemini'),
            openaiConfigured: hasProviderApiKey('openai'),
        },
        initialized: aiSettingsInitialized,
        operational: currentOperational,
        operationalDefaults: DEFAULT_OPERATIONAL,
    };
}

export async function initializeAiRuntimeSettings() {
    try {
        const setting = await SystemSetting.findOne({ key: AI_SETTINGS_KEY }).lean();
        if (setting?.value) {
            currentSettings = normalizeSettings(setting.value);
        }
    } catch (_error) {
        // Ignore initialization failures and continue with env defaults.
    } finally {
        aiSettingsInitialized = true;
    }

    return currentSettings;
}

export async function updateAiRuntimeSettings(input: Partial<AIRuntimeSettings>) {
    const nextSettings = normalizeSettings({
        provider: input.provider ?? currentSettings.provider,
        model: input.model ?? currentSettings.model,
    });

    if (!hasProviderApiKey(nextSettings.provider)) {
        throw new Error(nextSettings.provider === 'openai'
            ? 'OPENAI_API_KEY is required to activate ChatGPT models.'
            : 'GEMINI_API_KEY is required to activate Gemini models.');
    }

    currentSettings = nextSettings;
    aiSettingsInitialized = true;

    await SystemSetting.findOneAndUpdate(
        { key: AI_SETTINGS_KEY },
        { $set: { value: nextSettings } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return currentSettings;
}

// ============================================================
// AI Operational Settings
// ============================================================

export interface AIOperationalSettings {
    rateLimitPerMinute: number;
    maxRetries: number;
    cacheTtlSeconds: number;
}

const AI_OPERATIONAL_KEY = 'ai.operational';

export const DEFAULT_OPERATIONAL: AIOperationalSettings = {
    rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT  || '30',   10),
    maxRetries:         parseInt(process.env.AI_MAX_RETRIES || '3',    10),
    cacheTtlSeconds:    parseInt(process.env.AI_CACHE_TTL   || '3600', 10),
};

let currentOperational: AIOperationalSettings = { ...DEFAULT_OPERATIONAL };

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeOperational(raw: unknown): AIOperationalSettings {
    const v = (raw as Partial<AIOperationalSettings>) ?? {};
    return {
        rateLimitPerMinute: clampInt(v.rateLimitPerMinute, 1,   600,   DEFAULT_OPERATIONAL.rateLimitPerMinute),
        maxRetries:         clampInt(v.maxRetries,         0,   10,    DEFAULT_OPERATIONAL.maxRetries),
        cacheTtlSeconds:    clampInt(v.cacheTtlSeconds,    0,   86400, DEFAULT_OPERATIONAL.cacheTtlSeconds),
    };
}

export function getAiOperationalSettings(): AIOperationalSettings {
    return currentOperational;
}

export async function initializeAiOperationalSettings(): Promise<void> {
    try {
        const setting = await SystemSetting.findOne({ key: AI_OPERATIONAL_KEY }).lean();
        if (setting?.value) {
            currentOperational = normalizeOperational(setting.value);
        }
    } catch {
        // Use env defaults on failure
    }
}

export async function updateAiOperationalSettings(
    input: Partial<AIOperationalSettings>,
): Promise<AIOperationalSettings> {
    const next = normalizeOperational({ ...currentOperational, ...input });
    currentOperational = next;

    await SystemSetting.findOneAndUpdate(
        { key: AI_OPERATIONAL_KEY },
        { $set: { value: next } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return next;
}
