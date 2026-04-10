<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useToast } from '../composables/useToast';
import MatterHeader from '../components/lawyer/MatterHeader.vue';
import MatterAIPanel from '../components/lawyer/MatterAIPanel.vue';
import MatterDataViewer from '../components/lawyer/MatterDataViewer.vue';
import ErrorBoundary from '../components/common/ErrorBoundary.vue';

const { showToast } = useToast();
const route = useRoute();
const router = useRouter();

const intake = ref<any>(null);
const loading = ref(true);
const suggestions = ref<any[]>([]);
const suggestionsLoading = ref(false);

const isEditing = ref(false);
const isSaving = ref(false);
const originalData = ref<string>(''); // For rollback

const cancelEdit = () => {
    if (originalData.value) {
        intake.value.data = JSON.parse(originalData.value);
    }
    isEditing.value = false;
};

const saveChanges = async () => {
    isSaving.value = true;
    try {
        const response = await api.put(`/intake/${intake.value._id}`, {
            data: intake.value.data
        });
        
        // Check for Auto Note Suggestion
        if (response.data.autoNoteSuggestion) {
            const noteText = response.data.autoNoteSuggestion;
            if (confirm(`AI Suggestion:\n\n"${noteText}"\n\nAdd this to Case Notes?`)) {
                 await api.post(`/intake/${intake.value._id}/notes`, { text: noteText });
                 intake.value.notes.push({ text: noteText, author: 'Lawyer (AI)', createdAt: new Date() });
            }
        }
        
        intake.value = response.data;
        originalData.value = JSON.stringify(intake.value.data);
        isEditing.value = false;
        fetchSuggestions();
    } catch (error) {
        console.error('Failed to save', error);
        showToast('Failed to save changes', 'error');
    } finally {
        isSaving.value = false;
    }
};

const fetchSuggestions = async () => {
    suggestionsLoading.value = true;
    try {
        const res = await api.get(`/lawyer/intake/${route.params.id}/suggestions`);
        suggestions.value = res.data?.suggestions || [];
    } catch (e) {
        console.error("Failed to fetch suggestions", e);
        suggestions.value = [];
    } finally {
        suggestionsLoading.value = false;
    }
};

onMounted(async () => {
    try {
        const id = route.params.id as string;
        const response = await api.get(`/lawyer/intake/${id}`);
        intake.value = response.data;
        originalData.value = JSON.stringify(intake.value.data); // Snapshot
        
        fetchSuggestions();
    } catch (error) {
        console.error('Failed to load matter', error);
    } finally {
        loading.value = false;
    }
});

const downloadDoc = async () => {
    try {
        const id = route.params.id;
        const response = await api.get(`/lawyer/intake/${id}/download`, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Intake_Summary_${id}.docx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('Download failed', error);
        showToast('Failed to generate document', 'error');
    }
};
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8 relative overflow-hidden">
     <!-- Background Decor -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div class="absolute top-0 -left-1/4 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-3xl opacity-20"></div>
    </div>

    <div v-if="loading" class="flex items-center justify-center min-h-[60vh] animate-pulse text-gray-400">
        Loading Matter Details...
    </div>
    
    <div v-else-if="!intake" class="flex flex-col items-center justify-center min-h-[60vh] text-red-400">
        <span class="text-2xl font-bold mb-2">Matter Not Found</span>
        <button @click="router.push('/lawyer')" class="text-gray-400 hover:text-white underline">Return to Dashboard</button>
    </div>

    <div v-else class="max-w-7xl mx-auto animate-fade-in">
      
      <MatterHeader 
        :intake="intake"
        :isEditing="isEditing"
        :isSaving="isSaving"
        @update:isEditing="isEditing = $event"
        @save="saveChanges"
        @cancel="cancelEdit"
        @download="downloadDoc"
      />

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: Summary & Flags (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
            <ErrorBoundary fallbackMessage="AI Panel temporarily unavailable">
               <MatterAIPanel 
                 :intake="intake"
                 :suggestions="suggestions"
                 :suggestionsLoading="suggestionsLoading"
               />
            </ErrorBoundary>
        </div>

        <!-- Right Column: Intake Data (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
            <MatterDataViewer 
                :intake="intake"
                :isEditing="isEditing"
                @update:intake="intake = $event"
            />
        </div>
      </div>
    </div>
  </div>
</template>
