<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Funeral & Burial Wishes</h2>
    <p class="text-gray-400 mb-6">These wishes are not legally binding but provide important guidance to your executors and family.</p>
    
    <div class="space-y-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
      
      <!-- Body Disposal -->
      <div>
        <QuestionHelper v-bind="h.type">
        <p class="block text-lg font-semibold mb-4 text-gray-200">How would you like your remains to be handled?</p>
        <div :id="h.type.inputId" class="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup" aria-label="How would you like your remains to be handled?">
             <label class="cursor-pointer border border-gray-600 rounded-lg p-4 hover:bg-gray-700/50 transition-colors" :class="{'bg-blue-900/20 border-blue-500': form.type === 'cremation'}">
                 <input type="radio" value="cremation" v-model="form.type" class="hidden" />
                 <div class="font-bold text-white mb-1">Cremation</div>
                 <div class="text-xs text-gray-400">Ashes returned to family or scattered.</div>
             </label>

             <label class="cursor-pointer border border-gray-600 rounded-lg p-4 hover:bg-gray-700/50 transition-colors" :class="{'bg-blue-900/20 border-blue-500': form.type === 'burial'}">
                 <input type="radio" value="burial" v-model="form.type" class="hidden" />
                 <div class="font-bold text-white mb-1">Burial</div>
                 <div class="text-xs text-gray-400">Interment in a cemetery plot.</div>
             </label>

             <label class="cursor-pointer border border-gray-600 rounded-lg p-4 hover:bg-gray-700/50 transition-colors" :class="{'bg-blue-900/20 border-blue-500': form.type === 'scientific'}">
                 <input type="radio" value="scientific" v-model="form.type" class="hidden" />
                 <div class="font-bold text-white mb-1">Scientific Use</div>
                 <div class="text-xs text-gray-400">Donation to a medical school / science.</div>
             </label>
        </div>
        </QuestionHelper>
      </div>

      <!-- Specific Details -->
      <div v-if="form.type === 'cremation'" class="bg-gray-900/50 p-4 rounded-lg border border-gray-600 animate-fade-in">
           <QuestionHelper v-bind="h.ashesDetails" :currentValue="form.ashesDetails" @use-legal="form.ashesDetails = $event">
            <textarea v-model="form.ashesDetails" :id="h.ashesDetails.inputId" class="input-modern w-full" rows="2" maxlength="500" placeholder="e.g. Scatter at cottage, Keep in urn..."></textarea>
            <p class="text-xs text-gray-500 text-right mt-1">{{ (form.ashesDetails || '').length }} / 500</p>
           </QuestionHelper>
      </div>

      <div v-if="form.type === 'burial'" class="bg-gray-900/50 p-4 rounded-lg border border-gray-600 animate-fade-in">
           <QuestionHelper v-bind="h.burialDetails" :currentValue="form.burialDetails" @use-legal="form.burialDetails = $event">
            <textarea v-model="form.burialDetails" :id="h.burialDetails.inputId" class="input-modern w-full" rows="2" maxlength="500" placeholder="e.g. Pine Hills Cemetery, Plot 45B..."></textarea>
            <p class="text-xs text-gray-500 text-right mt-1">{{ (form.burialDetails || '').length }} / 500</p>
           </QuestionHelper>
      </div>

      <!-- Ceremony -->
      <div class="pt-6 border-t border-gray-700">
           <QuestionHelper v-bind="h.serviceType">
           <h3 class="text-lg font-semibold mb-3">Service / Ceremony</h3>
           <div :id="h.serviceType.inputId" class="space-y-3" role="radiogroup" aria-label="Service or ceremony">
               <label class="flex items-center space-x-3 cursor-pointer">
                   <input type="radio" value="formal" v-model="form.service" class="form-radio text-blue-500 bg-gray-900 border-gray-600" />
                   <span class="text-gray-300">Formal Service (Church / Chapel)</span>
               </label>
               <label class="flex items-center space-x-3 cursor-pointer">
                   <input type="radio" value="informal" v-model="form.service" class="form-radio text-blue-500 bg-gray-900 border-gray-600" />
                   <span class="text-gray-300">Informal Gathering / Celebration of Life</span>
               </label>
               <label class="flex items-center space-x-3 cursor-pointer">
                   <input type="radio" value="none" v-model="form.service" class="form-radio text-blue-500 bg-gray-900 border-gray-600" />
                   <span class="text-gray-300">No Service</span>
               </label>
           </div>
           </QuestionHelper>
           
           <div v-if="form.service !== 'none'" class="mt-4">
                <QuestionHelper v-bind="h.serviceDetails" :currentValue="form.serviceDetails" @use-legal="form.serviceDetails = $event">
                 <textarea v-model="form.serviceDetails" :id="h.serviceDetails.inputId" class="input-modern w-full" rows="2" maxlength="1000" placeholder="e.g. Hymns, Readings, Flowers..."></textarea>
                 <p class="text-xs text-gray-500 text-right mt-1">{{ (form.serviceDetails || '').length }} / 1000</p>
             </QuestionHelper>
           </div>
      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import type { Funeral } from '../../types/intake';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import QuestionHelper from '../../components/QuestionHelper.vue';
import { willsHelpers } from '../../utils/willsFieldHelpers';

const store = useIntakeStore();
const { showToast } = useToast();
const h = willsHelpers.funeral;

const form = ref<Funeral>({
  type: undefined,
  ashesDetails: '',
  burialDetails: '',
  service: undefined,
  serviceDetails: ''
});

const funeralPayload = () => ({
  funeral: JSON.parse(JSON.stringify(form.value)),
});
const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(funeralPayload);

// FUN2: Clear stale conditional details when type changes
watch(() => form.value.type, (newType) => {
    if (newType !== 'cremation') form.value.ashesDetails = '';
    if (newType !== 'burial') form.value.burialDetails = '';
});

// Clear service details when switching to 'No Service'
watch(() => form.value.service, (newService) => {
    if (newService === 'none') form.value.serviceDetails = '';
});

watch(form, () => {
    scheduleSave();
}, { deep: true });

onMounted(async () => {
    // S1: Use isInitialized flag
    if (!store.isInitialized) {
        await store.fetchIntake();
    }
    if (store.intakeData.funeral) {
        form.value = JSON.parse(JSON.stringify(store.intakeData.funeral));
    }

    store.stageIntakeStep(funeralPayload());
    markInitialized();
});

const validateLocal = () => {
  if (!form.value.type) {
    const message = 'Please select how you would like your remains to be handled.';
    showToast(message, 'warning');
    return message;
  }

  return null;
};

defineExpose({
  commitStep,
  hasPendingChanges,
  validateLocal,
});
</script>
