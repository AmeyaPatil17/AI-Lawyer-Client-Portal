<script setup lang="ts">


const props = defineProps<{
    intake: any;
    isEditing: boolean;
    isSaving: boolean;
}>();

const emit = defineEmits(['update:isEditing', 'save', 'cancel', 'download']);

const displayName = (val: any) => {
    if (typeof val === 'string') return val;
    return val?.name || '';
};
</script>

<template>
  <div class="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
     <div>
        <button @click="$router.push('/lawyer')" class="text-gray-400 hover:text-white text-sm flex items-center mb-2 transition-colors">
         &larr; Back to Dashboard
        </button>
        <h1 class="text-3xl font-bold flex items-center gap-3">
            {{ displayName(intake?.data?.personalProfile?.fullName) || 'Untitled Matter' }}
            <span class="text-sm font-normal px-2.5 py-0.5 rounded-full border bg-gray-800 text-gray-400 border-gray-700 uppercase tracking-widest text-xs">
                {{ intake?.status || 'Unknown' }}
            </span>
        </h1>
     </div>
     <div class="flex gap-3">
         <div v-if="!isEditing" class="flex gap-3">
             <button @click="emit('update:isEditing', true)" class="text-gray-400 hover:text-white border border-gray-600 hover:border-white px-4 py-2 rounded-lg text-sm transition-colors">
                 Edit Data
             </button>
             <button @click="emit('download')" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors border border-blue-500 flex items-center text-sm px-6">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Download Word Doc
            </button>
         </div>
         <div v-else class="flex gap-3">
             <button @click="emit('cancel')" class="text-red-400 hover:text-red-300 px-4 py-2 text-sm transition-colors">
                 Cancel
             </button>
             <button @click="emit('save')" :disabled="isSaving" class="bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors border border-green-500 px-6 py-2 text-sm flex items-center">
                <span v-if="isSaving" class="animate-spin mr-2">⟳</span>
                Save Changes
             </button>
         </div>
     </div>
  </div>
</template>
