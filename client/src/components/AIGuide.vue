<template>
    <div
        v-if="embedded || showFloatingLauncher || showFloatingPanel"
        :class="embedded ? 'h-full flex flex-col' : 'fixed bottom-6 right-6 z-50 flex flex-col items-end'"
    >
        <transition name="slide-up">
            <div
                v-show="embedded || showFloatingPanel"
                :id="!embedded ? 'ai-guide-panel' : undefined"
                :class="[
                    'bg-gray-800 border-gray-700 flex flex-col overflow-hidden shadow-2xl',
                    embedded
                        ? 'h-full w-full border-l rounded-none'
                        : 'mb-4 w-80 md:w-96 border rounded-2xl max-h-[500px]'
                ]"
                role="dialog"
                aria-label="Valiant AI legal information assistant"
                aria-modal="false"
                @keydown.esc.prevent.stop="handleEscapeKey"
            >
                <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center shrink-0">
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm" aria-hidden="true">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-bold text-white text-sm">Valiant AI</h3>
                            <p class="text-[10px] text-blue-200">Legal Information Assistant</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <span
                            v-if="isScanning"
                            class="text-[10px] text-blue-200 animate-pulse flex items-center"
                            aria-live="polite"
                            aria-label="Analyzing your form data"
                        >
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Analyzing...
                        </span>

                        <button
                            @click="handleResetChat"
                            class="text-white/60 hover:text-white p-1 rounded transition-colors"
                            title="Clear conversation"
                            aria-label="Clear conversation and start fresh"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>

                        <button
                            v-if="!embedded"
                            @click="closeFloatingChat"
                            class="text-white/70 hover:text-white p-1 rounded transition-colors"
                            aria-label="Close AI assistant"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div
                    ref="messagesContainer"
                    class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/95"
                    role="log"
                    aria-live="polite"
                    aria-label="Chat messages"
                    aria-relevant="additions"
                    @scroll="handleMessagesScroll"
                >
                    <div
                        v-for="msg in visibleMessages"
                        :key="msg.id"
                        class="flex"
                        :class="msg.sender === 'user' ? 'justify-end' : 'justify-start'"
                    >
                        <div v-if="msg.sender === 'user'" class="max-w-[85%] group">
                            <div class="bg-blue-600 text-white rounded-2xl rounded-br-none px-3 py-2 text-sm">
                                <p>{{ msg.text }}</p>
                            </div>
                            <p class="text-[10px] text-gray-600 mt-0.5 text-right">{{ formatTimestamp(msg.timestamp) }}</p>
                        </div>

                        <div v-else-if="msg.kind === 'system'" class="max-w-[92%]">
                            <div
                                class="rounded-xl rounded-bl-none px-3 py-2.5 text-sm border"
                                :class="systemBubbleClasses(msg)"
                            >
                                <div class="flex items-start gap-2">
                                    <span
                                        class="shrink-0 mt-0.5"
                                        :class="systemIconClasses(msg)"
                                        aria-hidden="true"
                                    >
                                        <svg v-if="msg.severity === 'warning'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </span>
                                    <div
                                        class="ai-message-content leading-relaxed"
                                        :class="systemTextClasses(msg)"
                                        v-html="renderMarkdown(msg.text)"
                                    />
                                </div>
                            </div>
                            <p class="text-[10px] text-gray-600 mt-0.5">{{ formatTimestamp(msg.timestamp) }}</p>
                        </div>

                        <div v-else class="max-w-[92%] group">
                            <div
                                class="bg-gray-700 text-gray-200 rounded-2xl rounded-bl-none px-3 py-2.5 text-sm relative"
                                :class="{ 'border border-red-600/40 bg-red-900/20': msg.isError }"
                            >
                                <div v-if="msg.isError" class="flex items-start gap-2">
                                    <span class="text-red-400 shrink-0" aria-hidden="true">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.2 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </span>
                                    <div class="flex-1">
                                        <p class="text-red-200 text-sm">{{ msg.text }}</p>
                                        <button
                                            v-if="msg.retryable && msg.exchangeId"
                                            @click="aiChatStore.retryExchange(msg.exchangeId)"
                                            class="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition-colors border border-blue-600/30"
                                            aria-label="Retry sending this message"
                                        >
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Retry
                                        </button>
                                    </div>
                                </div>

                                <div
                                    v-else
                                    class="ai-message-content leading-relaxed"
                                    v-html="renderMarkdown(msg.text)"
                                />

                                <button
                                    v-if="!msg.isError && msg.text"
                                    @click="copyMessage(msg.text, msg.id)"
                                    class="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-600 hover:bg-gray-500 rounded-full border border-gray-500"
                                    :title="copiedId === msg.id ? 'Copied!' : 'Copy message'"
                                    :aria-label="copiedId === msg.id ? 'Copied to clipboard' : 'Copy this message to clipboard'"
                                >
                                    <svg v-if="copiedId !== msg.id" class="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <svg v-else class="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            </div>
                            <p class="text-[10px] text-gray-600 mt-0.5">{{ formatTimestamp(msg.timestamp) }}</p>
                        </div>
                    </div>

                    <div v-if="isTyping" class="flex justify-start" role="status" aria-label="AI is composing a response">
                        <div class="bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex space-x-1.5">
                            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms" />
                            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms" />
                            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms" />
                        </div>
                    </div>
                </div>

                <div class="p-3 bg-gray-800 border-t border-gray-700 shrink-0">
                    <div class="relative">
                        <label :for="inputId" class="sr-only">Ask the legal assistant a question</label>
                        <input
                            :id="inputId"
                            ref="inputRef"
                            v-model="inputText"
                            @keydown.enter.prevent="sendMessage"
                            type="text"
                            :placeholder="embedded ? 'Ask your legal assistant...' : 'Ask a question...'"
                            class="w-full bg-gray-900 border border-gray-600 rounded-full py-2 px-4 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                            autocomplete="off"
                            autocorrect="off"
                            spellcheck="false"
                        />
                        <button
                            @click="sendMessage"
                            :disabled="!inputText.trim() || isTyping"
                            class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-full"
                            aria-label="Send message"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                    <p class="text-[10px] text-gray-500 mt-1.5 text-center">AI provides legal information, not legal advice.</p>
                </div>
            </div>
        </transition>

        <button
            v-if="showFloatingLauncher"
            @click.prevent.stop="aiChatStore.toggleChat()"
            class="relative group flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 hover:scale-110 transition-transform duration-300"
            :aria-expanded="isOpen"
            aria-controls="ai-guide-panel"
            aria-label="Toggle AI legal assistant"
        >
            <svg v-if="!isOpen" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>

            <span
                v-if="!showFloatingPanel && unreadCount > 0"
                class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-gray-900 font-bold"
                :aria-label="`${unreadCount} unread messages`"
            >
                {{ unreadCount }}
            </span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useIntakeStore } from '../stores/intake';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { useAiChatStore, type ChatMessage, type AIChatFlow } from '../stores/aiChat';
import { useProactiveGuide } from '../composables/useProactiveGuide';
import { useStressTest } from '../composables/useStressTest';
import { useWizardContext, isIncorporationPath } from '../composables/useWizardContext';

const props = withDefaults(defineProps<{
    embedded?: boolean;
    instanceRole?: 'primary' | 'embedded';
}>(), {
    embedded: false,
    instanceRole: 'primary',
});

const willsStore = useIntakeStore();
const incorpStore = useIncorpIntakeStore();
const aiChatStore = useAiChatStore();
const route = useRoute();
const { context } = useWizardContext();
const { checkLocalRules, clearPendingLocalRules } = useProactiveGuide();
const { runContinuousStressTest, clearPendingStressTest } = useStressTest();

marked.setOptions({ breaks: true, gfm: true });

const renderMarkdown = (text: string): string => {
    if (!text) return '';
    const raw = marked.parse(text) as string;
    return DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre', 'br', 'a', 'blockquote'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
};

const isPrimaryInstance = computed(() => props.instanceRole === 'primary');
const currentFlow = computed<AIChatFlow>(() => isIncorporationPath(route.path) ? 'incorporation' : 'wills');
const activeData = computed(() =>
    currentFlow.value === 'incorporation'
        ? (incorpStore.incorpData as any)
        : willsStore.intakeData
);
const activeIntakeId = computed(() =>
    currentFlow.value === 'incorporation'
        ? incorpStore.currentIncorpId
        : willsStore.currentIntakeId
);

const isEmbeddedChatRoute = computed(() =>
    route.path === '/wizard' ||
    route.path.startsWith('/wizard/') ||
    route.path === '/incorporation' ||
    route.path.startsWith('/incorporation/')
);
const showFloatingLauncher = computed(() =>
    !props.embedded &&
    isPrimaryInstance.value &&
    !isEmbeddedChatRoute.value
);
const showFloatingPanel = computed(() =>
    showFloatingLauncher.value && isOpen.value
);

const localId = Math.random().toString(36).slice(2, 9);
const assistantId = `ai-guide-${localId}`;
const inputId = `ai-guide-input-${localId}`;
const messagesContainer = ref<HTMLDivElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const inputText = ref('');
const copiedId = ref<string | null>(null);
const nowTick = ref(Date.now());
const isPinnedToBottom = ref(true);
const forceAutoScroll = ref(false);
const lastFocusedElement = ref<HTMLElement | null>(null);
let timestampInterval: ReturnType<typeof setInterval> | null = null;

const isOpen = computed({
    get: () => aiChatStore.chatState.isOpen,
    set: (value) => {
        aiChatStore.chatState.isOpen = value;
    },
});
const messages = computed(() => aiChatStore.chatState.messages);
const unreadCount = computed(() => aiChatStore.chatState.unreadCount);
const isTyping = computed(() => aiChatStore.chatState.isTyping);
const isScanning = computed(() => aiChatStore.chatState.isScanning);
const visibleMessages = computed(() =>
    messages.value.filter((message) =>
        message.kind === 'chat' ||
        !message.context ||
        message.context === 'general' ||
        message.context === context.value
    )
);

const systemBubbleClasses = (msg: ChatMessage) =>
    msg.severity === 'warning'
        ? 'bg-amber-900/30 border-amber-600/50'
        : 'bg-blue-900/30 border-blue-600/40';

const systemTextClasses = (msg: ChatMessage) =>
    msg.severity === 'warning' ? 'text-amber-100' : 'text-blue-100';

const systemIconClasses = (msg: ChatMessage) =>
    msg.severity === 'warning' ? 'text-amber-400' : 'text-blue-400';

const formatTimestamp = (timestamp: number): string => {
    void nowTick.value;
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isNearBottom = () => {
    const container = messagesContainer.value;
    if (!container) return true;
    return container.scrollHeight - (container.scrollTop + container.clientHeight) < 72;
};

const handleMessagesScroll = () => {
    isPinnedToBottom.value = isNearBottom();
};

const scrollToBottom = (force = false) => {
    nextTick(() => {
        const container = messagesContainer.value;
        if (!container) return;
        if (force || isPinnedToBottom.value) {
            container.scrollTop = container.scrollHeight;
            isPinnedToBottom.value = true;
        }
        forceAutoScroll.value = false;
    });
};

const refreshGuidance = () => {
    if (!isPrimaryInstance.value) return;

    const currentContext = context.value;
    if (currentContext === 'general') {
        clearPendingLocalRules();
        clearPendingStressTest();
        aiChatStore.chatState.isScanning = false;
        return;
    }

    checkLocalRules(route.path, activeData.value, currentFlow.value);
    runContinuousStressTest({
        flow: currentFlow.value,
        intakeId: activeIntakeId.value,
        context: currentContext,
    });
};

const closeFloatingChat = () => {
    isOpen.value = false;
};

const handleEscapeKey = () => {
    if (showFloatingPanel.value) {
        closeFloatingChat();
    }
};

const isEditableTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT' ||
        element.isContentEditable;
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
    if (!isPrimaryInstance.value) return;
    if (isEditableTarget(event.target)) return;
    if (!showFloatingLauncher.value && !showFloatingPanel.value) return;
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        aiChatStore.toggleChat();
    }
};

const sendMessage = async () => {
    if (!inputText.value.trim() || isTyping.value) return;

    const message = inputText.value.trim();
    inputText.value = '';
    forceAutoScroll.value = true;

    await aiChatStore.sendAIMessage(message, {
        intakeData: activeData.value,
        contextStep: context.value,
        flow: currentFlow.value,
    });
};

const handleResetChat = () => {
    aiChatStore.resetChat();
};

const copyMessage = async (text: string, id: string) => {
    try {
        await navigator.clipboard.writeText(text);
        copiedId.value = id;
        setTimeout(() => {
            copiedId.value = null;
        }, 2000);
    } catch {
        // Clipboard can fail in unsupported contexts.
    }
};

watch(
    () => props.embedded || showFloatingPanel.value,
    (visible) => {
        if (visible) {
            aiChatStore.registerVisibleAssistant(assistantId);
        } else {
            aiChatStore.unregisterVisibleAssistant(assistantId);
        }
    },
    { immediate: true }
);

watch(showFloatingPanel, (visible) => {
    if (props.embedded || !isPrimaryInstance.value) return;

    if (visible) {
        lastFocusedElement.value = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        forceAutoScroll.value = true;
        aiChatStore.chatState.unreadCount = 0;
        scrollToBottom(true);
        nextTick(() => inputRef.value?.focus());
    } else if (lastFocusedElement.value) {
        nextTick(() => lastFocusedElement.value?.focus());
    }
});

watch(
    () => visibleMessages.value.map((message) => `${message.id}:${message.text.length}:${message.severity || ''}`).join('|'),
    () => scrollToBottom(forceAutoScroll.value)
);

if (isPrimaryInstance.value) {
    watch(
        () => route.path,
        () => {
            refreshGuidance();
        },
        { immediate: true }
    );

    watch(
        activeData,
        () => {
            refreshGuidance();
        },
        { deep: true }
    );
}

onMounted(() => {
    if (isPrimaryInstance.value) {
        timestampInterval = setInterval(() => {
            nowTick.value = Date.now();
        }, 30000);

        window.addEventListener('keydown', handleKeyboardShortcut);
    }
});

onUnmounted(() => {
    aiChatStore.unregisterVisibleAssistant(assistantId);
    if (timestampInterval) {
        clearInterval(timestampInterval);
    }

    if (isPrimaryInstance.value) {
        clearPendingLocalRules();
        clearPendingStressTest();
        aiChatStore.disconnectSocket();
        window.removeEventListener('keydown', handleKeyboardShortcut);
    }
});
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateY(16px);
}

.ai-message-content :deep(p) { margin: 0 0 0.4em; }
.ai-message-content :deep(p:last-child) { margin-bottom: 0; }
.ai-message-content :deep(ul),
.ai-message-content :deep(ol) { padding-left: 1.25rem; margin: 0.3em 0; }
.ai-message-content :deep(li) { margin-bottom: 0.15em; }
.ai-message-content :deep(strong) { font-weight: 600; color: inherit; }
.ai-message-content :deep(em) { font-style: italic; }
.ai-message-content :deep(code) {
    background: rgba(255,255,255,0.1);
    padding: 0.1em 0.35em;
    border-radius: 0.25rem;
    font-size: 0.85em;
    font-family: ui-monospace, monospace;
}
.ai-message-content :deep(blockquote) {
    border-left: 2px solid currentColor;
    opacity: 0.75;
    padding-left: 0.75rem;
    margin: 0.3em 0;
}
.ai-message-content :deep(pre) {
    background: rgba(0,0,0,0.3);
    padding: 0.5rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 0.3em 0;
}
.ai-message-content :deep(a) { color: #60a5fa; text-decoration: underline; }
</style>
