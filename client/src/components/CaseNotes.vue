<template>
  <div class="h-full flex flex-col bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
    <div class="p-4 border-b border-gray-700/50 bg-gray-800/30">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
            Case Notes
            <span class="ml-2 bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full">{{ notes.length }}</span>
        </h3>
    </div>
    
    <!-- Notes List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="notesContainer">
        <div v-if="loading" class="text-center py-10">
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <div v-else-if="notes.length === 0" class="text-center py-10 text-gray-500 text-sm italic">
            No notes added yet.
        </div>
        <div v-for="(note, index) in notes" :key="index" class="animate-fade-in">
            <div class="flex justify-between items-baseline mb-1">
                <span class="text-xs font-bold text-blue-400">{{ note.author || 'User' }}</span>
                <span class="text-[10px] text-gray-500">{{ formatDate(note.createdAt) }}</span>
            </div>
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700 text-sm text-gray-200 leading-snug whitespace-pre-wrap">
                {{ note.text }}
            </div>
        </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-gray-800/50 border-t border-gray-700/50">
        <div class="relative">
            <textarea 
                v-model="newNote"
                @keydown.enter.ctrl.prevent="addNote"
                placeholder="Add a private note... (Ctrl+Enter to save)"
                class="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-gray-600"
                rows="2"
            ></textarea>
            <button 
                @click="addNote"
                :disabled="!newNote.trim() || submitting"
                class="absolute bottom-2 right-2 text-blue-500 hover:text-white disabled:opacity-30 disabled:hover:text-blue-500 transition-colors"
                title="Add Note"
            >
                <svg v-if="!submitting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                <span v-else class="animate-spin">⟳</span>
            </button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import api from '../api';
import { useToast } from '../composables/useToast';

const props = defineProps<{
    intakeId: string;
    initialNotes?: any[];
}>();

const notes = ref<any[]>(props.initialNotes || []);
const newNote = ref('');
const submitting = ref(false);
const loading = ref(false);
const notesContainer = ref<HTMLElement | null>(null);

// Watch for prop updates (if parent re-fetches)
watch(() => props.initialNotes, (newVal) => {
    if (newVal) {
        notes.value = newVal;
        scrollToBottom();
    }
});

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = async () => {
    await nextTick();
    if (notesContainer.value) {
        notesContainer.value.scrollTop = notesContainer.value.scrollHeight;
    }
};

const addNote = async () => {
    if (!newNote.value.trim() || submitting.value) return;
    
    submitting.value = true;
    try {
        const response = await api.post(`/lawyer/intake/${props.intakeId}/notes`, {
            text: newNote.value
        });
        
        // Response should be the updated notes array
        notes.value = response.data;
        newNote.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Failed to add note:', error);
        const { showToast } = useToast();
        showToast('Failed to save note.', 'error');
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    scrollToBottom();
});
</script>

<style scoped>
/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1); 
}
::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5); 
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.8); 
}
</style>
