<template>
  <div class="field-helper mt-1 flex min-w-0 flex-col gap-2">
    <div class="field-helper__actions flex min-w-0 flex-wrap items-center gap-2">
      <button
        v-if="example"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-600/60 bg-gray-800/60 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-blue-500/40 hover:bg-gray-700/70 hover:text-blue-300"
        :class="activeBadge === 'example' ? 'border-blue-500/50 bg-gray-700/80 text-blue-300' : ''"
        @click.prevent="activeBadge = activeBadge === 'example' ? null : 'example'"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 2.75h5.5L12.5 5.75V13a1 1 0 0 1-1 1h-7A1.5 1.5 0 0 1 3 12.5v-8A1.75 1.75 0 0 1 4.75 2.75H4Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
          <path d="M9.5 2.75V5a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
        </svg>
        <span>Example</span>
      </button>

      <button
        v-if="why"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-600/60 bg-gray-800/60 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-amber-500/40 hover:bg-gray-700/70 hover:text-amber-200"
        :class="activeBadge === 'why' ? 'border-amber-500/50 bg-gray-700/80 text-amber-200' : ''"
        @click.prevent="activeBadge = activeBadge === 'why' ? null : 'why'"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2.5a3 3 0 0 0-1.9 5.32c.42.34.65.86.65 1.4V9.5h2.5v-.28c0-.54.24-1.06.65-1.4A3 3 0 0 0 8 2.5Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
          <path d="M6.75 11.5h2.5M7 13h2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
        </svg>
        <span>Why?</span>
      </button>

      <button
        v-if="askAi"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-teal-600/40 bg-teal-900/20 px-2.5 py-1 text-xs font-medium text-teal-300 transition-all hover:border-teal-500/60 hover:bg-teal-900/40"
        :class="{ 'cursor-not-allowed opacity-60': isAskingAi }"
        :disabled="isAskingAi"
        @click.prevent="triggerAskAi"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5ZM6.8 6.6a1.2 1.2 0 1 1 2.24.6c-.23.37-.55.62-.85.88-.32.28-.57.61-.57 1.17v.2M8 11.25h.01" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Ask AI</span>
      </button>

      <button
        v-if="legal"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-900/20 px-2.5 py-1 text-xs font-medium text-purple-300 transition-all hover:border-purple-500/60 hover:bg-purple-900/40"
        :class="activeBadge === 'legal' ? 'ring-1 ring-purple-500/50 bg-purple-900/60' : ''"
        @click.prevent="activeBadge = activeBadge === 'legal' ? null : 'legal'"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4.5 4.5 3 7.5h4M11.5 4.5 13 7.5H9M8 3v9M5.5 12.5h5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Legal Template</span>
      </button>
    </div>

    <div
      v-if="activeBadge"
      class="overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800/80 p-3 text-sm leading-relaxed text-gray-300 shadow-inner"
    >
      <p v-if="activeBadge === 'example'" class="mb-1 font-mono text-xs text-gray-400">EXAMPLE:</p>
      <p v-if="activeBadge === 'example'" class="text-white">
        {{ example }}
      </p>

      <p v-if="activeBadge === 'why'" class="mb-1 font-mono text-xs text-amber-500/80">RATIONALE:</p>
      <p v-if="activeBadge === 'why'">
        {{ why }}
      </p>

      <p v-if="activeBadge === 'legal'" class="mb-1 font-mono text-xs text-purple-400">LEGAL CONTEXT:</p>
      <p v-if="activeBadge === 'legal'">
        {{ legal }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAiChatStore } from '../../stores/aiChat';
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import type { IncorpFieldHelperConfig } from '../../utils/incorpFieldHelpers';

const props = defineProps<IncorpFieldHelperConfig>();

const activeBadge = ref<'example' | 'why' | 'legal' | null>(null);
const isAskingAi = ref(false);

const aiChatStore = useAiChatStore();
const incorpStore = useIncorpIntakeStore();

const triggerAskAi = async () => {
  if (!props.askAi || isAskingAi.value) return;

  if (!aiChatStore.chatState.isOpen) {
    aiChatStore.chatState.isOpen = true;
  }

  isAskingAi.value = true;

  try {
    await aiChatStore.sendAIMessage(props.askAi.prompt, {
      intakeData: incorpStore.incorpData,
      contextStep: props.askAi.step,
      flow: 'incorporation',
    });
  } finally {
    isAskingAi.value = false;
  }
};
</script>
