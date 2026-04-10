<template>
  <div class="animate-pulse" :class="containerClass">
    <!-- Lines variant (default) -->
    <template v-if="variant === 'lines'">
      <div v-for="n in lines" :key="n" class="rounded-lg bg-gray-700/40" :class="lineClass" :style="{ width: lineWidths[n - 1] || '100%' }"></div>
    </template>

    <!-- Card variant -->
    <template v-else-if="variant === 'card'">
      <div class="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 space-y-4">
        <div class="h-5 bg-gray-700/40 rounded w-1/3"></div>
        <div class="space-y-3">
          <div class="h-4 bg-gray-700/30 rounded w-full"></div>
          <div class="h-4 bg-gray-700/30 rounded w-5/6"></div>
          <div class="h-4 bg-gray-700/30 rounded w-2/3"></div>
        </div>
        <div class="flex gap-3 pt-2">
          <div class="h-8 bg-gray-700/40 rounded-lg w-24"></div>
          <div class="h-8 bg-gray-700/40 rounded-lg w-20"></div>
        </div>
      </div>
    </template>

    <!-- Table variant -->
    <template v-else-if="variant === 'table'">
      <div class="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        <div class="bg-gray-800/80 p-4 border-b border-gray-700/50">
          <div class="h-4 bg-gray-700/40 rounded w-1/4"></div>
        </div>
        <div v-for="n in lines" :key="n" class="p-4 border-b border-gray-700/30 flex justify-between">
          <div class="h-4 bg-gray-700/30 rounded w-1/3"></div>
          <div class="h-4 bg-gray-700/30 rounded w-1/5"></div>
          <div class="h-4 bg-gray-700/30 rounded w-1/6"></div>
        </div>
      </div>
    </template>

    <!-- Form variant -->
    <template v-else-if="variant === 'form'">
      <div class="space-y-6">
        <div v-for="n in lines" :key="n" class="space-y-2">
          <div class="h-3 bg-gray-700/40 rounded w-24"></div>
          <div class="h-10 bg-gray-700/30 rounded-lg w-full"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'lines' | 'card' | 'table' | 'form';
  lines?: number;
  containerClass?: string;
  lineClass?: string;
}>(), {
  variant: 'lines',
  lines: 4,
  containerClass: 'space-y-3',
  lineClass: 'h-4',
});

const lineWidths = computed(() => {
  // Generate varying widths for a natural look
  const widths = ['100%', '85%', '70%', '92%', '60%', '78%', '95%', '65%'];
  return Array.from({ length: props.lines }, (_, i) => widths[i % widths.length]);
});
</script>
