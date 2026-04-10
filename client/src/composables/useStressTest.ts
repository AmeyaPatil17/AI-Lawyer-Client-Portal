import { ref, onUnmounted } from 'vue';
import { useAiChatStore, type AIChatFlow, type SystemMessageDraft } from '../stores/aiChat';
import api from '../api';

interface QueueStressTestOptions {
    flow: AIChatFlow;
    intakeId?: string | null;
    context: string;
}

const normalizeQuestionKey = (question: string) =>
    question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'question';

export function useStressTest() {
    const aiChatStore = useAiChatStore();
    const timeoutId = ref<ReturnType<typeof setTimeout> | null>(null);
    const activeRequest = ref(0);

    const clearPending = () => {
        if (timeoutId.value) {
            clearTimeout(timeoutId.value);
            timeoutId.value = null;
        }
        activeRequest.value++;
        aiChatStore.chatState.isScanning = false;
    };

    const runContinuousStressTest = ({ flow, intakeId, context }: QueueStressTestOptions) => {
        clearPending();

        if (!intakeId || context === 'general') {
            aiChatStore.setSystemMessages(context, 'stress', []);
            return;
        }

        aiChatStore.chatState.isScanning = true;
        const requestId = activeRequest.value + 1;
        activeRequest.value = requestId;

        timeoutId.value = setTimeout(async () => {
            try {
                const response = await api.post<{ questions: string[] }>(
                    `/intake/${intakeId}/stress-test`,
                    { context }
                );

                if (requestId !== activeRequest.value) return;

                const drafts: SystemMessageDraft[] = (response.data.questions || []).map((question) => ({
                    id: `stress:${context}:${normalizeQuestionKey(question)}`,
                    text: question,
                    context,
                    source: 'stress',
                    severity: 'warning',
                }));

                aiChatStore.setSystemMessages(context, 'stress', drafts);
            } catch (error) {
                if (requestId === activeRequest.value) {
                    aiChatStore.setSystemMessages(context, 'stress', []);
                }
                console.error('[StressTest] Silent fail:', error);
            } finally {
                if (requestId === activeRequest.value) {
                    aiChatStore.chatState.isScanning = false;
                }
            }
        }, 3000);
    };

    onUnmounted(clearPending);

    return {
        runContinuousStressTest,
        clearPendingStressTest: clearPending,
    };
}
