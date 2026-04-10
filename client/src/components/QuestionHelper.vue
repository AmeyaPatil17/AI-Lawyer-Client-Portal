<template>
  <div class="question-helper min-w-0">
    <label
      v-if="label && helperKind !== 'group'"
      :for="inputId"
      class="question-helper__label mb-2 block min-w-0 text-sm font-medium text-gray-200"
    >
      {{ label }}
      <span v-if="required" class="ml-1 text-red-400">*</span>
    </label>

    <div
      v-if="hasHelperActions"
      class="question-helper__actions mb-3 flex min-w-0 flex-wrap items-center gap-2"
    >
      <button
        v-if="example"
        type="button"
        :aria-expanded="showExample"
        :aria-controls="inputId ? `${inputId}-example` : undefined"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-600/60 bg-gray-800/60 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-blue-500/40 hover:bg-gray-700/70 hover:text-blue-300"
        :class="{ 'border-blue-500/50 bg-gray-700/80 text-blue-300': showExample }"
        @click="toggleInfoPanel('example')"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 2.75h5.5L12.5 5.75V13a1 1 0 0 1-1 1h-7A1.5 1.5 0 0 1 3 12.5v-8A1.75 1.75 0 0 1 4.75 2.75H4Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
          <path d="M9.5 2.75V5a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
        </svg>
        <span>Example</span>
      </button>

      <button
        v-if="whyItMatters"
        type="button"
        :aria-expanded="showWhy"
        :aria-controls="inputId ? `${inputId}-why` : undefined"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-600/60 bg-gray-800/60 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-purple-500/40 hover:bg-gray-700/70 hover:text-purple-300"
        :class="{ 'border-purple-500/50 bg-gray-700/80 text-purple-300': showWhy }"
        @click="toggleInfoPanel('why')"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2.5a3 3 0 0 0-1.9 5.32c.42.34.65.86.65 1.4V9.5h2.5v-.28c0-.54.24-1.06.65-1.4A3 3 0 0 0 8 2.5Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
          <path d="M6.75 11.5h2.5M7 13h2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
        </svg>
        <span>Why?</span>
      </button>

      <button
        v-if="canShowLegalTemplate"
        type="button"
        :aria-expanded="showLegal"
        :aria-controls="inputId ? `${inputId}-legal` : undefined"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-600/60 bg-gray-800/60 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-green-500/40 hover:bg-gray-700/70 hover:text-green-300"
        :class="{ 'border-green-500/50 bg-gray-700/80 text-green-300': showLegal, 'animate-pulse': legalState === 'loading' }"
        :disabled="legalState === 'loading'"
        @click="toggleLegalWording"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4.5 4.5 3 7.5h4M11.5 4.5 13 7.5H9M8 3v9M5.5 12.5h5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Legal Template</span>
      </button>

      <button
        v-if="canAskAI"
        type="button"
        :title="`Ask AI about '${safeLabel}'`"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-600/60 bg-gray-800/60 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-yellow-500/40 hover:bg-gray-700/70 hover:text-yellow-300"
        :class="{ 'opacity-60 cursor-not-allowed': isAskingAi }"
        :disabled="isAskingAi"
        @click="askAIAboutField"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5ZM6.8 6.6a1.2 1.2 0 1 1 2.24.6c-.23.37-.55.62-.85.88-.32.28-.57.61-.57 1.17v.2M8 11.25h.01" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Ask AI</span>
      </button>
    </div>

    <transition name="slide-down">
      <div
        v-if="showExample && example"
        :id="inputId ? `${inputId}-example` : undefined"
        role="region"
        :aria-label="`Example for ${safeLabel}`"
        class="mb-3 rounded-lg border border-blue-700/50 bg-blue-900/20 p-3 text-sm"
      >
        <div class="flex items-start gap-2">
          <span class="shrink-0 text-blue-400" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M4 2.75h5.5L12.5 5.75V13a1 1 0 0 1-1 1h-7A1.5 1.5 0 0 1 3 12.5v-8A1.75 1.75 0 0 1 4.75 2.75H4Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
              <path d="M9.5 2.75V5a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
            </svg>
          </span>
          <div>
            <p class="mb-1 text-xs font-medium uppercase tracking-wide text-blue-200">Example</p>
            <p class="text-gray-300">{{ example }}</p>
          </div>
        </div>
      </div>
    </transition>

    <transition name="slide-down">
      <div
        v-if="showWhy && whyItMatters"
        :id="inputId ? `${inputId}-why` : undefined"
        role="region"
        :aria-label="`Why ${safeLabel} matters`"
        class="mb-3 rounded-lg border border-purple-700/50 bg-purple-900/20 p-3 text-sm"
      >
        <div class="flex items-start gap-2">
          <span class="shrink-0 text-purple-400" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 2.5a3 3 0 0 0-1.9 5.32c.42.34.65.86.65 1.4V9.5h2.5v-.28c0-.54.24-1.06.65-1.4A3 3 0 0 0 8 2.5Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
              <path d="M6.75 11.5h2.5M7 13h2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
          </span>
          <div>
            <p class="mb-1 text-xs font-medium uppercase tracking-wide text-purple-200">Why This Matters</p>
            <p class="text-gray-300">{{ whyItMatters }}</p>
          </div>
        </div>
      </div>
    </transition>

    <transition name="slide-down">
      <div
        v-if="showLegal"
        :id="inputId ? `${inputId}-legal` : undefined"
        role="region"
        :aria-label="`Legal template for ${safeLabel}`"
        class="mb-3 rounded-lg border border-green-700/50 bg-green-900/20 p-3 text-sm"
      >
        <div class="flex items-start gap-2">
          <span class="shrink-0 text-green-400" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M4.5 4.5 3 7.5h4M11.5 4.5 13 7.5H9M8 3v9M5.5 12.5h5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <div class="flex-1">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-green-200">Legal Template</p>

            <div
              v-if="legalState === 'loading'"
              class="rounded-lg border border-gray-700/50 bg-gray-900/60 p-3 text-xs leading-relaxed text-gray-300"
            >
              Generating a field-ready legal template...
            </div>

            <div
              v-else-if="legalState === 'error'"
              class="rounded-lg border border-red-700/40 bg-red-900/10 p-3 text-xs leading-relaxed text-red-200"
            >
              {{ legalFeedbackMessage }}
            </div>

            <div
              v-else-if="legalState === 'empty'"
              class="rounded-lg border border-gray-700/50 bg-gray-900/60 p-3 text-xs leading-relaxed text-gray-300"
            >
              {{ legalFeedbackMessage }}
            </div>

            <pre
              v-else-if="legalState === 'success'"
              class="whitespace-pre-wrap rounded-lg border border-gray-700/50 bg-gray-900/60 p-3 text-xs leading-relaxed text-gray-300"
            >{{ legalSuggestion }}</pre>

            <div class="mt-2 flex gap-2">
              <button
                v-if="legalState === 'success'"
                type="button"
                class="question-helper__use-legal rounded bg-green-600/20 px-3 py-1 text-xs text-green-300 transition-colors hover:bg-green-600/40"
                @click="useLegalWording"
              >
                Copy Into Field
              </button>
              <button
                v-if="legalState === 'error' || legalState === 'empty'"
                type="button"
                class="question-helper__retry-legal rounded bg-gray-700/80 px-3 py-1 text-xs text-gray-200 transition-colors hover:bg-gray-600"
                @click="retryLegalSuggestion"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="question-helper__content min-w-0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import api from '../api';
import { useAiChatStore } from '../stores/aiChat';
import { useIntakeStore } from '../stores/intake';
import type {
  QuestionHelperAiFlow,
  QuestionHelperAiStep,
  QuestionHelperPrimitiveValue,
} from '../types/questionHelper';

type HelperPanel = 'example' | 'why' | 'legal' | null;
type LegalState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

const VALID_AI_STEPS = new Set<QuestionHelperAiStep>([
  'profile',
  'personalProfile',
  'family',
  'executors',
  'beneficiaries',
  'assets',
  'guardians',
  'poa',
  'funeral',
  'prior-wills',
  'priorWills',
  'review',
  'general',
  'unknown',
  'incorporation',
  'jurisdiction',
  'directors',
  'shareholders',
  'shares',
  'company',
  'preIncorporation',
]);

const LEGACY_AI_STEP_PREFIXES: Array<[string, QuestionHelperAiStep]> = [
  ['personal_', 'personalProfile'],
  ['family_', 'family'],
  ['guardian_', 'guardians'],
  ['executor_', 'executors'],
  ['ben_', 'beneficiaries'],
  ['asset_', 'assets'],
  ['liability_', 'assets'],
  ['poa_', 'poa'],
  ['funeral_', 'funeral'],
  ['prior_', 'priorWills'],
  ['spouse_', 'family'],
  ['marital_', 'personalProfile'],
];

const FLOW_PROMPT_LABELS: Record<QuestionHelperAiFlow, string> = {
  wills: 'Ontario wills questionnaire',
  incorporation: 'business incorporation questionnaire',
  general: 'legal questionnaire',
};

interface Props {
  helperKind?: 'field' | 'group';
  label?: string;
  inputId?: string;
  required?: boolean;
  example?: string;
  whyItMatters?: string;
  hasLegalWording?: boolean;
  allowLegalInsert?: boolean;
  aiFlow?: QuestionHelperAiFlow;
  aiStep?: QuestionHelperAiStep | string;
  legalContext?: string;
  fieldContext?: string;
  currentValue?: QuestionHelperPrimitiveValue;
}

const props = withDefaults(defineProps<Props>(), {
  helperKind: 'field',
  required: false,
  hasLegalWording: false,
  allowLegalInsert: false,
  aiFlow: 'wills',
});

const emit = defineEmits<{
  (e: 'use-legal', value: string): void;
}>();

const aiStore = useAiChatStore();
const intakeStore = useIntakeStore();

const activePanel = ref<HelperPanel>(null);
const isAskingAi = ref(false);
const legalSuggestion = ref('');
const legalState = ref<LegalState>('idle');
const legalError = ref('');
const legalRequestId = ref(0);

const safeLabel = computed(() => props.label?.trim() || 'this field');
const showExample = computed(() => activePanel.value === 'example');
const showWhy = computed(() => activePanel.value === 'why');
const showLegal = computed(() => activePanel.value === 'legal');
const resolvedLegalContext = computed(() => props.legalContext?.trim() || props.fieldContext?.trim() || '');
const resolvedAiStep = computed<QuestionHelperAiStep>(() => {
  const explicitStep = typeof props.aiStep === 'string' ? props.aiStep.trim() : '';
  if (explicitStep && VALID_AI_STEPS.has(explicitStep as QuestionHelperAiStep)) {
    return explicitStep as QuestionHelperAiStep;
  }

  const legacyContext = props.fieldContext?.trim() || '';
  const legacyMatch = LEGACY_AI_STEP_PREFIXES.find(([prefix]) => legacyContext.startsWith(prefix));
  return legacyMatch?.[1] || 'general';
});
const canAskAI = computed(() => Boolean(props.aiStep || props.fieldContext));
const canShowLegalTemplate = computed(() =>
  Boolean(props.hasLegalWording && props.allowLegalInsert && resolvedLegalContext.value)
);
const hasHelperActions = computed(() =>
  Boolean(props.example || props.whyItMatters || canShowLegalTemplate.value || canAskAI.value)
);
const normalizedCurrentValue = computed(() => {
  if (props.currentValue === null || props.currentValue === undefined) return '';
  if (typeof props.currentValue === 'boolean') return props.currentValue ? 'Yes' : 'No';
  return String(props.currentValue).trim();
});
const legalCacheKey = computed(() =>
  JSON.stringify([resolvedLegalContext.value, normalizedCurrentValue.value])
);
const openHelperIds = computed(() => {
  if (!props.inputId) return [] as string[];

  const ids: string[] = [];
  if (showExample.value) ids.push(`${props.inputId}-example`);
  if (showWhy.value) ids.push(`${props.inputId}-why`);
  if (showLegal.value) ids.push(`${props.inputId}-legal`);
  return ids;
});
const legalFeedbackMessage = computed(() => {
  if (legalState.value === 'error') return legalError.value || 'Unable to generate a legal template right now.';
  if (legalState.value === 'empty') return 'No legal template is available for this field yet.';
  return '';
});

const toggleInfoPanel = (panel: Exclude<HelperPanel, 'legal' | null>) => {
  activePanel.value = activePanel.value === panel ? null : panel;
};

const buildAiPrompt = () => {
  const promptParts = [
    `Help me complete the "${safeLabel.value}" field in this ${FLOW_PROMPT_LABELS[props.aiFlow]}.`,
  ];

  if (props.example) promptParts.push(`Example: ${props.example}`);
  if (props.whyItMatters) promptParts.push(`Why it matters: ${props.whyItMatters}`);

  if (normalizedCurrentValue.value) {
    promptParts.push(`Current value: "${normalizedCurrentValue.value}".`);
  } else {
    promptParts.push('Current value: blank.');
  }

  promptParts.push('In under 50 words, explain what belongs here and why it matters. Be direct.');
  return promptParts.join(' ');
};

const askAIAboutField = async () => {
  if (isAskingAi.value || !canAskAI.value) return;

  isAskingAi.value = true;
  aiStore.chatState.isOpen = true;

  try {
    await aiStore.sendAIMessage(buildAiPrompt(), {
        intakeData: intakeStore.intakeData,
        contextStep: resolvedAiStep.value,
        flow: 'wills',
    });
  } finally {
    isAskingAi.value = false;
  }
};

const resetLegalState = () => {
  legalRequestId.value += 1;
  legalState.value = 'idle';
  legalSuggestion.value = '';
  legalError.value = '';
  if (activePanel.value === 'legal') {
    activePanel.value = null;
  }
};

const fetchLegalSuggestion = async () => {
  if (!canShowLegalTemplate.value) return;

  const requestId = ++legalRequestId.value;
  legalState.value = 'loading';
  legalSuggestion.value = '';
  legalError.value = '';
  activePanel.value = 'legal';

  try {
    const response = await api.post('/intake/legal-phrasing', {
      context: resolvedLegalContext.value,
      currentValue: normalizedCurrentValue.value || null,
    });

    if (requestId !== legalRequestId.value) return;

    const suggestion = String(response.data?.suggestion ?? '').trim();
    if (!suggestion) {
      legalState.value = 'empty';
      return;
    }

    legalSuggestion.value = suggestion;
    legalState.value = 'success';
  } catch (error) {
    if (requestId !== legalRequestId.value) return;

    console.error('Failed to get legal phrasing:', error);
    legalState.value = 'error';
    legalError.value = 'Unable to generate a legal template right now. Please try again.';
  }
};

const toggleLegalWording = async () => {
  if (!canShowLegalTemplate.value) return;

  if (showLegal.value) {
    activePanel.value = null;
    return;
  }

  activePanel.value = 'legal';

  if (legalState.value === 'success' || legalState.value === 'error' || legalState.value === 'empty') {
    return;
  }

  await fetchLegalSuggestion();
};

const retryLegalSuggestion = async () => {
  await fetchLegalSuggestion();
};

const useLegalWording = () => {
  if (legalState.value === 'success' && legalSuggestion.value) {
    emit('use-legal', legalSuggestion.value);
  }
};

const syncHelperDescriptions = () => {
  if (!props.inputId || typeof document === 'undefined') return;

  const control = document.getElementById(props.inputId);
  if (!control) return;

  const previousHelperIds = (control.getAttribute('data-question-helper-ids') || '')
    .split(' ')
    .filter(Boolean);
  const existingIds = (control.getAttribute('aria-describedby') || '')
    .split(' ')
    .filter(Boolean)
    .filter((id) => !previousHelperIds.includes(id));
  const mergedIds = Array.from(new Set([...existingIds, ...openHelperIds.value]));

  if (mergedIds.length > 0) {
    control.setAttribute('aria-describedby', mergedIds.join(' '));
  } else {
    control.removeAttribute('aria-describedby');
  }

  if (openHelperIds.value.length > 0) {
    control.setAttribute('data-question-helper-ids', openHelperIds.value.join(' '));
  } else {
    control.removeAttribute('data-question-helper-ids');
  }
};

watch(legalCacheKey, resetLegalState);
watch([openHelperIds, () => props.inputId], () => {
  void nextTick(syncHelperDescriptions);
}, { immediate: true });

onBeforeUnmount(() => {
  if (!props.inputId || typeof document === 'undefined') return;

  const control = document.getElementById(props.inputId);
  if (!control) return;

  const previousHelperIds = (control.getAttribute('data-question-helper-ids') || '')
    .split(' ')
    .filter(Boolean);
  const existingIds = (control.getAttribute('aria-describedby') || '')
    .split(' ')
    .filter(Boolean)
    .filter((id) => !previousHelperIds.includes(id));

  if (existingIds.length > 0) {
    control.setAttribute('aria-describedby', existingIds.join(' '));
  } else {
    control.removeAttribute('aria-describedby');
  }

  control.removeAttribute('data-question-helper-ids');
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease-out;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
