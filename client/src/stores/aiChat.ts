import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { io as socketIO, Socket } from 'socket.io-client';
import { getStoredToken } from '../utils/authStorage';

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    kind: 'chat' | 'system';
    context?: string;
    timestamp: number;
    isError?: boolean;
    source?: 'welcome' | 'chat' | 'proactive' | 'stress';
    severity?: 'info' | 'warning' | 'error';
    exchangeId?: string;
    retryable?: boolean;
}

export type AIChatFlow = 'wills' | 'incorporation';

export interface SendAIMessageOptions {
    intakeData: any;
    contextStep?: string;
    flow?: AIChatFlow;
}

export interface SystemMessageDraft {
    id: string;
    text: string;
    context: string;
    source: 'proactive' | 'stress';
    severity?: 'info' | 'warning' | 'error';
}

const generateId = () => Math.random().toString(36).slice(2, 9);
const SEEN_WARNINGS_KEY = 'valiant_seen_warnings';

function loadSeenWarnings(): Set<string> {
    try {
        const raw = sessionStorage.getItem(SEEN_WARNINGS_KEY);
        if (raw) return new Set<string>(JSON.parse(raw));
    } catch {
        // Ignore storage failures.
    }
    return new Set<string>();
}

function saveSeenWarnings(set: Set<string>) {
    try {
        sessionStorage.setItem(SEEN_WARNINGS_KEY, JSON.stringify([...set]));
    } catch {
        // Ignore storage failures.
    }
}

const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    text: "Hi! I'm **Valiant AI**, your legal information assistant. I'm here to help explain legal terms or guide you through your estate plan. What can I help with?",
    sender: 'ai',
    kind: 'system',
    context: 'general',
    timestamp: Date.now(),
    source: 'welcome',
    severity: 'info',
};

function buildAuthHeaders() {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useAiChatStore = defineStore('aiChat', () => {
    const chatState = ref({
        isOpen: false,
        messages: [{ ...WELCOME_MESSAGE }] as ChatMessage[],
        unreadCount: 0,
        isTyping: false,
        seenWarnings: loadSeenWarnings(),
        isScanning: false,
    });

    const pendingReviewItems = ref<any[]>([]);
    const failedExchanges = ref<Record<string, { msg: string; options: SendAIMessageOptions }>>({});
    const streamFailCount = ref(0);
    const visibleAssistants = ref(new Set<string>());

    let wsSocket: Socket | null = null;

    function _getSocket(): Socket {
        if (wsSocket && wsSocket.connected) return wsSocket;

        const token = getStoredToken();
        if (!token) {
            throw new Error('WebSocket transport requires a stored bearer token');
        }

        const isProduction = import.meta.env.PROD;
        const serverURL = import.meta.env.VITE_API_BASE_URL
            ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
            : (isProduction ? '' : 'http://localhost:3000');

        wsSocket = socketIO(serverURL, {
            auth: { token },
            transports: ['websocket'],
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
            reconnectionAttempts: 5,
            timeout: 10000,
        });

        wsSocket.on('connect_error', (err) => {
            console.warn('[AI WS] Connection error:', err.message);
        });

        return wsSocket;
    }

    watch(
        () => chatState.value.seenWarnings,
        (set) => saveSeenWarnings(set),
        { deep: true }
    );

    const toggleChat = () => {
        chatState.value.isOpen = !chatState.value.isOpen;
        if (chatState.value.isOpen) chatState.value.unreadCount = 0;
    };

    const isChatVisible = () =>
        chatState.value.isOpen || visibleAssistants.value.size > 0;

    const registerVisibleAssistant = (assistantId: string) => {
        visibleAssistants.value.add(assistantId);
        chatState.value.unreadCount = 0;
    };

    const unregisterVisibleAssistant = (assistantId: string) => {
        visibleAssistants.value.delete(assistantId);
    };

    const resetChat = () => {
        chatState.value.messages = [{ ...WELCOME_MESSAGE, timestamp: Date.now() }];
        chatState.value.unreadCount = 0;
        chatState.value.isTyping = false;
        chatState.value.seenWarnings = new Set<string>();
        failedExchanges.value = {};
        saveSeenWarnings(chatState.value.seenWarnings);
        if (wsSocket) {
            wsSocket.disconnect();
            wsSocket = null;
        }
    };

    const disconnectSocket = () => {
        if (wsSocket) {
            wsSocket.disconnect();
            wsSocket = null;
        }
        streamFailCount.value = 0;
    };

    const _buildSystemMessage = (
        draft: SystemMessageDraft,
        existing?: ChatMessage,
        timestampOffset = 0
    ): ChatMessage => ({
        id: draft.id,
        text: draft.text,
        sender: 'ai',
        kind: 'system',
        context: draft.context,
        timestamp: existing?.timestamp ?? (Date.now() + timestampOffset),
        source: draft.source,
        severity: draft.severity ?? 'info',
        retryable: false,
    });

    const setSystemMessages = (
        context: string,
        source: 'proactive' | 'stress',
        drafts: SystemMessageDraft[]
    ) => {
        const currentMessages = chatState.value.messages;
        const existingScoped = currentMessages.filter((msg) =>
            msg.kind === 'system' &&
            msg.context === context &&
            msg.source === source
        );

        const nextScoped = drafts.map((draft, index) => {
            const existing = existingScoped.find((msg) => msg.id === draft.id);
            return _buildSystemMessage(
                {
                    ...draft,
                    context,
                    source,
                    severity: draft.severity ?? 'info',
                },
                existing,
                index
            );
        });

        const unchanged = existingScoped.length === nextScoped.length &&
            existingScoped.every((msg, index) =>
                msg.id === nextScoped[index]?.id &&
                msg.text === nextScoped[index]?.text &&
                msg.severity === nextScoped[index]?.severity
            );

        if (unchanged) return;

        const previousFingerprints = new Set(
            existingScoped.map((msg) => `${msg.id}|${msg.text}|${msg.severity}`)
        );

        chatState.value.messages = currentMessages
            .filter((msg) =>
                !(msg.kind === 'system' && msg.context === context && msg.source === source)
            )
            .concat(nextScoped);

        if (!isChatVisible()) {
            const newCount = nextScoped.filter((msg) =>
                !previousFingerprints.has(`${msg.id}|${msg.text}|${msg.severity}`)
            ).length;
            chatState.value.unreadCount += newCount;
        }
    };

    const _resolveEndpoints = (flow: AIChatFlow) => {
        const isProduction = import.meta.env.PROD;
        const baseURL = import.meta.env.VITE_API_BASE_URL || (isProduction ? '/api' : 'http://localhost:3000/api');
        const isIncorporation = flow === 'incorporation';
        const streamPath = isIncorporation ? '/incorporation/chat/stream' : '/intake/chat/stream';
        const fallbackPath = isIncorporation ? '/incorporation/chat' : '/intake/chat';
        return { baseURL, streamPath, fallbackPath };
    };

    const _buildHistory = () =>
        chatState.value.messages
            .filter((msg) => msg.kind === 'chat' && !msg.isError)
            .slice(-10)
            .map((msg) => ({ role: msg.sender === 'user' ? 'user' : 'model', text: msg.text }));

    const _sendWebSocket = (
        userMsg: string,
        intakeData: any,
        currentStep: string,
        aiMsgIndex: number,
        flow: AIChatFlow
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const socket = _getSocket();
            const history = _buildHistory();
            const isIncorporation = flow === 'incorporation';

            chatState.value.isTyping = false;

            const onChunk = (data: { text: string }) => {
                chatState.value.messages[aiMsgIndex].text += data.text;
            };

            const onDone = () => {
                cleanup();
                resolve();
            };

            const onError = (data: { message: string }) => {
                cleanup();
                reject(new Error(data.message || 'WebSocket AI error'));
            };

            function cleanup() {
                socket.off('ai:chunk', onChunk);
                socket.off('ai:done', onDone);
                socket.off('ai:error', onError);
            }

            socket.on('ai:chunk', onChunk);
            socket.once('ai:done', onDone);
            socket.once('ai:error', onError);

            const emitPayload = () => {
                socket.emit('ai:chat', {
                    message: userMsg,
                    intakeData,
                    currentStep,
                    history,
                    isIncorporation,
                });
            };

            if (socket.connected) {
                emitPayload();
            } else {
                socket.once('connect', emitPayload);
                socket.once('connect_error', () => {
                    cleanup();
                    reject(new Error('WebSocket connection failed'));
                });
            }
        });
    };

    const _sendFallback = async (
        userMsg: string,
        intakeData: any,
        currentStep: string,
        aiMsgIndex: number,
        flow: AIChatFlow
    ) => {
        const { baseURL, fallbackPath } = _resolveEndpoints(flow);
        const history = _buildHistory();

        const response = await fetch(`${baseURL}${fallbackPath}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...buildAuthHeaders(),
            },
            body: JSON.stringify({ message: userMsg, intakeData, currentStep, history }),
        });

        const data = await response.json();
        const reply = data.reply || data.error || 'Unable to connect to knowledge base.';
        chatState.value.messages[aiMsgIndex].text = reply;
    };

    const _sendStream = async (
        userMsg: string,
        intakeData: any,
        currentStep: string,
        aiMsgIndex: number,
        flow: AIChatFlow
    ) => {
        const { baseURL, streamPath } = _resolveEndpoints(flow);
        const history = _buildHistory();

        const response = await fetch(`${baseURL}${streamPath}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...buildAuthHeaders(),
            },
            body: JSON.stringify({ message: userMsg, intakeData, currentStep, history }),
        });

        if (!response.ok) {
            throw new Error(`Streaming request failed with status ${response.status}`);
        }
        if (!response.body) {
            throw new Error('ReadableStream not supported');
        }

        chatState.value.isTyping = false;

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            for (const line of chunkStr.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.text) {
                        chatState.value.messages[aiMsgIndex].text += parsed.text;
                    }
                } catch {
                    // Ignore partial chunks.
                }
            }
        }
    };

    const sendAIMessage = async (
        userMsg: string,
        options: SendAIMessageOptions
    ) => {
        if (!userMsg.trim()) return;

        const currentStep = options.contextStep || 'general';
        const flow = options.flow || 'wills';
        const exchangeId = generateId();

        chatState.value.messages.push({
            id: generateId(),
            text: userMsg,
            sender: 'user',
            kind: 'chat',
            timestamp: Date.now(),
            source: 'chat',
            severity: 'info',
            exchangeId,
        });
        chatState.value.isTyping = true;

        const aiMsgIndex = chatState.value.messages.push({
            id: generateId(),
            text: '',
            sender: 'ai',
            kind: 'chat',
            timestamp: Date.now(),
            source: 'chat',
            severity: 'info',
            exchangeId,
        }) - 1;

        try {
            const hasBearerToken = Boolean(getStoredToken());
            const transports: Array<'ws' | 'sse' | 'rest'> = hasBearerToken
                ? (streamFailCount.value >= 3
                    ? ['rest']
                    : streamFailCount.value >= 2
                        ? ['sse', 'rest']
                        : ['ws', 'rest'])
                : ['sse', 'rest'];

            let delivered = false;
            let lastError: unknown = null;

            for (const transport of transports) {
                try {
                    if (transport === 'ws') {
                        await _sendWebSocket(userMsg, options.intakeData, currentStep, aiMsgIndex, flow);
                    } else if (transport === 'sse') {
                        await _sendStream(userMsg, options.intakeData, currentStep, aiMsgIndex, flow);
                    } else {
                        await _sendFallback(userMsg, options.intakeData, currentStep, aiMsgIndex, flow);
                    }
                    delivered = true;
                    break;
                } catch (error) {
                    lastError = error;
                }
            }

            if (!delivered) {
                throw lastError instanceof Error ? lastError : new Error('AI transport failed');
            }

            streamFailCount.value = 0;
            delete failedExchanges.value[exchangeId];

            if (!isChatVisible()) {
                chatState.value.unreadCount++;
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            streamFailCount.value++;

            chatState.value.messages[aiMsgIndex].text = "I'm having trouble connecting to the knowledge base right now.";
            chatState.value.messages[aiMsgIndex].isError = true;
            chatState.value.messages[aiMsgIndex].severity = 'error';
            chatState.value.messages[aiMsgIndex].retryable = true;
            failedExchanges.value[exchangeId] = { msg: userMsg, options };
        } finally {
            chatState.value.isTyping = false;
        }
    };

    const retryExchange = async (exchangeId: string) => {
        const failed = failedExchanges.value[exchangeId];
        if (!failed) return;

        streamFailCount.value = 0;
        delete failedExchanges.value[exchangeId];
        chatState.value.messages = chatState.value.messages.filter((message) => message.exchangeId !== exchangeId);

        await sendAIMessage(failed.msg, failed.options);
    };

    return {
        chatState,
        pendingReviewItems,
        failedExchanges,
        visibleAssistants,
        toggleChat,
        registerVisibleAssistant,
        unregisterVisibleAssistant,
        resetChat,
        disconnectSocket,
        setSystemMessages,
        sendAIMessage,
        retryExchange,
    };
});
