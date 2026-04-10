<template>
  <Teleport to="body">
    <div class="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto max-w-sm w-80 rounded-xl shadow-xl border backdrop-blur-md px-4 py-3 flex items-start gap-3"
          :class="toastClasses[toast.type]"
        >
          <!-- Icon -->
          <span class="shrink-0 text-lg mt-0.5">{{ icons[toast.type] }}</span>

          <!-- Content -->
          <p class="flex-1 text-sm leading-snug">{{ toast.message }}</p>

          <!-- Dismiss -->
          <button
            @click="removeToast(toast.id)"
            class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../../composables/useToast';

const { toasts, removeToast } = useToast();

const toastClasses: Record<string, string> = {
  success: 'bg-green-900/90 border-green-600/50 text-green-100',
  warning: 'bg-yellow-900/90 border-yellow-600/50 text-yellow-100',
  error: 'bg-red-900/90 border-red-600/50 text-red-100',
  info: 'bg-blue-900/90 border-blue-600/50 text-blue-100',
};

const icons: Record<string, string> = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
};
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(60px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(60px) scale(0.95);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
