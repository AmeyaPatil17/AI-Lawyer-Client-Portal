<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Prior Wills & History</h2>
    <p class="text-gray-400 mb-6">It is important to explicitly revoke any previous wills to avoid confusion.</p>
    
    <div class="space-y-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
      
      <!-- Existing Will Check -->
      <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
           <QuestionHelper v-bind="h.hasPriorWill">
           <div :id="h.hasPriorWill.inputId" class="flex items-center justify-between cursor-pointer mb-2" role="radiogroup" aria-label="Do you have an existing will?">
              <span class="font-medium text-lg">Do you have an existing Will?</span>
              <div class="flex items-center space-x-4">
                  <label class="flex items-center space-x-2">
                     <input type="radio" value="yes" v-model="form.hasPriorWill" class="text-blue-500 bg-gray-800 border-gray-600" />
                     <span>Yes</span>
                  </label>
           
                  <label class="flex items-center space-x-2">
                     <input type="radio" value="no" v-model="form.hasPriorWill" class="text-blue-500 bg-gray-800 border-gray-600" />
                     <span>No</span>
                  </label>
              </div>
           </div>
           </QuestionHelper>
           
           <div v-if="form.hasPriorWill === 'yes'" class="mt-4 pt-4 border-t border-gray-600 animate-slide-up">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <QuestionHelper v-bind="h.priorWillDate">
                    <input v-model="form.priorWillDate" type="date" :max="today" min="1900-01-01" :id="h.priorWillDate.inputId" class="input-modern" />
                    </QuestionHelper>
                 </div>
                 <div>
                    <QuestionHelper v-bind="h.priorWillLocation">
                    <input v-model="form.priorWillLocation" type="text" :id="h.priorWillLocation.inputId" class="input-modern" placeholder="e.g. My Safe, Lawyer's Office..." />
                    </QuestionHelper>
                 </div>
              </div>
              <p class="mt-3 text-sm text-yellow-400 flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Note: Your new will is intended to revoke all previous wills.
              </p>
           </div>
      </div>

       <!-- Foreign Wills -->
       <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
           <QuestionHelper v-bind="h.hasForeignWill">
           <div :id="h.hasForeignWill.inputId" class="flex items-center justify-between cursor-pointer mb-2" role="radiogroup" aria-label="Do you have assets in another country covered by a foreign will?">
              <span class="font-medium">Do you have assets in another country covered by a foreign will?</span>
              <div class="flex items-center space-x-4">
                  <label class="flex items-center space-x-2">
                     <input type="radio" value="yes" v-model="form.hasForeignWill" class="text-blue-500 bg-gray-800 border-gray-600" />
                     <span>Yes</span>
                  </label>
           
                  <label class="flex items-center space-x-2">
                     <input type="radio" value="no" v-model="form.hasForeignWill" class="text-blue-500 bg-gray-800 border-gray-600" />
                     <span>No</span>
                  </label>
              </div>
           </div>
           </QuestionHelper>
           
           <div v-if="form.hasForeignWill === 'yes'" class="mt-4 pt-4 border-t border-gray-600 animate-slide-up">
               <QuestionHelper v-bind="h.foreignWillDetails" :currentValue="form.foreignWillDetails" @use-legal="form.foreignWillDetails = $event">
               <textarea v-model="form.foreignWillDetails" :id="h.foreignWillDetails.inputId" class="input-modern w-full" rows="2" placeholder="Country, approximate date..."></textarea>
               </QuestionHelper>
               <p class="mt-2 text-xs text-red-300">
                   <strong>Important:</strong> We must ensure your new Ontario will does NOT inadvertently revoke your foreign will. This will require careful drafting.
               </p>
           </div>
       </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import QuestionHelper from '../../components/QuestionHelper.vue';
import { willsHelpers } from '../../utils/willsFieldHelpers';
import type { PriorWills } from '../../types/intake';

const store = useIntakeStore();
const { showToast } = useToast();
const h = willsHelpers.priorWills;

// PW4: today computed for max attribute on date input
const today = computed(() => new Date().toISOString().split('T')[0]);

// PW5: Properly typed form
const form = ref<PriorWills>({
  hasPriorWill: 'no',
  priorWillDate: '',
  priorWillLocation: '',
  hasForeignWill: 'no',
  foreignWillDetails: ''
});

const priorWillsPayload = () => ({
  priorWills: { ...form.value },
});
const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(priorWillsPayload);

// PW3: Clear stale fields when toggled back to 'no'
watch(() => form.value.hasPriorWill, (val) => {
    if (val === 'no') {
        form.value.priorWillDate = '';
        form.value.priorWillLocation = '';
    }
});
watch(() => form.value.hasForeignWill, (val) => {
    if (val === 'no') form.value.foreignWillDetails = '';
});

watch(form, () => {
    scheduleSave();
}, { deep: true });

onMounted(async () => {
    // S1: Use isInitialized flag
    if (!store.isInitialized) {
        await store.fetchIntake();
    }
    if (store.intakeData.priorWills) {
        form.value = { ...form.value, ...store.intakeData.priorWills };
    }

    store.stageIntakeStep(priorWillsPayload());
    markInitialized();
});

const validateLocal = () => {
  if (form.value.hasPriorWill === 'yes') {
      if (!form.value.priorWillDate || !form.value.priorWillLocation) {
          const message = 'Please provide the date and location of your existing will.';
          showToast(message, 'warning');
          return message;
      }
      const priorDate = new Date(form.value.priorWillDate);
      if (priorDate > new Date()) {
          const message = 'The date of your prior will cannot be in the future.';
          showToast(message, 'warning');
          return message;
      }
  }

  if (form.value.hasForeignWill === 'yes' && !form.value.foreignWillDetails?.trim()) {
      const message = 'Please provide details about your foreign will (country, approximate date).';
      showToast(message, 'warning');
      return message;
  }

  if (form.value.hasForeignWill === 'yes') {
    const assetsList = (store.intakeData.assets as any)?.list ?? [];
    const hasForeignAssets = assetsList.some((a: any) => a.category === 'foreignAssets');
    if (!hasForeignAssets) {
      const proceed = window.confirm(
        'You indicated you have a foreign will, but no foreign assets were entered in the Assets step.\n\nThis may be a discrepancy. Click OK to proceed anyway, or Cancel to fix.'
      );
      if (!proceed) {
        return 'Foreign will details should match the assets section.';
      }
    }
  }

  return null;
};

defineExpose({
  commitStep,
  hasPendingChanges,
  validateLocal,
});
</script>
