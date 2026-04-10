<template>
  <!-- Reusable loading skeleton for incorporation wizard steps -->
  <div class="space-y-6 animate-pulse">
    <div class="h-8 w-56 bg-gray-700/60 rounded-lg"></div>
    <div class="h-4 w-80 bg-gray-700/40 rounded"></div>
    <div v-for="i in sections" :key="i" class="card-glass p-6 rounded-xl">
      <div class="h-4 w-36 bg-gray-700/50 rounded mb-4"></div>
      <div class="space-y-3">
        <div v-for="j in rows" :key="j" class="h-10 bg-gray-700/30 rounded-lg"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ sections?: number; rows?: number }>(), {
    sections: 3,
    rows: 2,
});
</script>
