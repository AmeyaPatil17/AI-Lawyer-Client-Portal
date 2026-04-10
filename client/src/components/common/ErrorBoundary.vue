<template>
  <div v-if="error" class="min-h-[200px] flex items-center justify-center">
    <div class="text-center max-w-md p-8 rounded-2xl bg-red-900/10 border border-red-500/30">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center text-red-400">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-bold text-red-300 mb-2">Something went wrong</h3>
      <p class="text-sm text-gray-400 mb-4">{{ errorMessage }}</p>
      <button 
        @click="retry" 
        class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const props = defineProps<{
  fallbackMessage?: string;
}>();

const error = ref<Error | null>(null);

const errorMessage = ref(props.fallbackMessage || 'An unexpected error occurred. Please try again.');

onErrorCaptured((err: Error) => {
  error.value = err;
  errorMessage.value = props.fallbackMessage || err.message || 'An unexpected error occurred.';
  console.error('[ErrorBoundary]', err);
  return false; // Prevent propagation
});

const retry = () => {
  error.value = null;
};
</script>
