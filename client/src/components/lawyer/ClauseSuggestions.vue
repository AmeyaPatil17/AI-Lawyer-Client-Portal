<script setup lang="ts">
const props = defineProps<{
    suggestions: any[];
    loading: boolean;
}>();
</script>

<template>
    <div class="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
            Draft Suggestions
            <span class="text-purple-400 text-xs bg-purple-900/20 px-2 py-0.5 rounded">AI</span>
        </h3>
        
        <div v-if="loading" class="text-xs text-gray-500 animate-pulse">Analyzing intake...</div>
        <div v-else-if="suggestions && suggestions.length > 0" class="space-y-4">
            <div v-for="suggestion in suggestions" :key="suggestion.id" class="group">
                <div class="font-semibold text-purple-300 text-sm mb-1 group-hover:text-purple-200 transition-colors">{{ suggestion.title }}</div>
                <p class="text-xs text-gray-400 mb-2">{{ suggestion.description }}</p>
                <div class="bg-gray-900/50 p-2 rounded text-xs text-gray-300 font-mono border border-gray-700 select-all cursor-pointer hover:border-purple-500/50 transition-colors" title="Click to copy">
                    {{ suggestion.content }}
                </div>
            </div>
        </div>
        <div v-else class="text-gray-500 text-sm">No specific clauses recommended.</div>
    </div>
</template>
