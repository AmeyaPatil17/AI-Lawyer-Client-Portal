<script setup lang="ts">
import { ref } from 'vue';
import api from '../../api';

const props = defineProps<{
    flags: any[];
    logicWarnings: any[];
    intakeId: string;
}>();

const explanationCode = ref<string | null>(null);
const explanationText = ref<string | null>(null);
const explanationLoading = ref(false);

const explainFlag = async (code: string) => {
    if (explanationCode.value === code) {
        // Toggle off
        explanationCode.value = null;
        return;
    }
    
    explanationCode.value = code;
    explanationText.value = null;
    explanationLoading.value = true;
    
    try {
        const response = await api.post(`/intake/${props.intakeId}/explain-flag`, { code });
        explanationText.value = response.data.explanation;
    } catch (e) {
        explanationText.value = "Unable to fetch explanation.";
    } finally {
        explanationLoading.value = false;
    }
};
</script>

<template>
    <div class="glass-panel p-6 rounded-2xl border-l-4" :class="flags && flags.length > 0 ? 'border-l-red-500' : 'border-l-green-500'">
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
            Risk Analysis
            <span v-if="(flags?.length || 0) + (logicWarnings?.length || 0) > 0" class="text-red-400 text-xs bg-red-900/20 px-2 py-0.5 rounded">
                {{ (flags?.length || 0) + (logicWarnings?.length || 0) }} Issues
            </span>
        </h3>
        
        <div v-if="(flags && flags.length > 0) || (logicWarnings && logicWarnings.length > 0)" class="space-y-3">
            <!-- Warnings (Yellow) -->
            <div v-for="(warn, j) in logicWarnings || []" :key="'w'+j" class="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 relative">
                 <div class="text-yellow-300 font-bold text-xs mb-1 flex items-center justify-between">
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        {{ warn.code }}
                    </span>
                    <button @click.stop="explainFlag(warn.code)" class="text-yellow-500 hover:text-white transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                </div>
                <div class="text-yellow-200 text-sm leading-snug">{{ warn.message }}</div>
                
                <!-- AI Explanation Popover -->
                <div v-if="explanationCode === warn.code" class="mt-3 bg-gray-900 rounded p-3 text-xs text-gray-300 border border-gray-700 shadow-xl animate-fade-in-up">
                    <div v-if="explanationLoading" class="flex items-center space-x-2">
                        <svg class="animate-spin h-3 w-3 text-purple-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Consulting AI Risk Knowledge Base...</span>
                    </div>
                    <div v-else>
                        <strong class="text-purple-400 block mb-1">Why is this a risk?</strong>
                        {{ explanationText }}
                    </div>
                </div>
            </div>

            <!-- Critical Flags (Red) -->
            <div v-for="(flag, i) in flags" :key="i" class="bg-red-500/10 p-3 rounded-lg border border-red-500/20 relative">
                <div class="text-red-300 font-bold text-xs mb-1 flex items-center justify-between">
                    {{ flag.code }}
                    <button @click.stop="explainFlag(flag.code)" class="text-red-500 hover:text-white transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                </div>
                <div class="text-red-200 text-sm leading-snug">{{ flag.message }}</div>
                
                <!-- AI Explanation Popover -->
                <div v-if="explanationCode === flag.code" class="mt-3 bg-gray-900 rounded p-3 text-xs text-gray-300 border border-gray-700 shadow-xl animate-fade-in-up">
                    <div v-if="explanationLoading" class="flex items-center space-x-2">
                        <svg class="animate-spin h-3 w-3 text-purple-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Consulting AI Risk Knowledge Base...</span>
                    </div>
                    <div v-else>
                        <strong class="text-purple-400 block mb-1">Why is this a risk?</strong>
                        {{ explanationText }}
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-green-400 flex items-center text-sm py-2">
             <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             No high-risk issues detected.
        </div>
    </div>
</template>
