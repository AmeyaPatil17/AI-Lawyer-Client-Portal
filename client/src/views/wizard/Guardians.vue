<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Guardians for Minors</h2>
    <p class="text-gray-400 mb-6">Appoint someone to care for your minor children if you pass away.</p>
    
    <SkeletonLoader v-if="store.isLoading" variant="form" :lines="4" />
    <div v-else class="space-y-8">
      
      <!-- Primary Guardian -->
      <div class="card-glass p-6 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-900/10 relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors"></div>
        
        <div class="mb-6">
            <h3 class="text-xl font-bold text-gray-100">Primary Guardian</h3>
            <p class="text-xs text-gray-400 mt-1">Person appointed to have custody of your minor children.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-800/40 p-4 rounded-xl border border-gray-700/30">
          <div>
            <QuestionHelper v-bind="h.primaryFullName" :currentValue="form.primary.fullName">
              <PeoplePicker 
                v-model="form.primary.fullName"
                placeholder="e.g. Mary Poppins"
                inputClass="input-modern"
              />
            </QuestionHelper>
          </div>
           <div>
            <QuestionHelper v-bind="h.primaryRelationship">
               <select 
                v-model="form.primary.relationship"
                :id="h.primaryRelationship.inputId"
                class="input-modern"
              >
                <option value="">Select Relationship</option>
                <option value="Sibling">Sibling</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Aunt/Uncle">Aunt / Uncle</option>
                <option value="In-Law">In-Law</option>
                <option value="Relative">Other Relative</option>
                <option value="Friend">Friend</option>
              </select>
            </QuestionHelper>
          </div>
        </div>
      </div>

      <!-- Alternates -->
      <div class="card-glass p-6 rounded-xl border border-gray-700/50 relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-1 h-full bg-gray-600 group-hover:bg-gray-500 transition-colors"></div>

        <div class="flex justify-between items-center mb-4">
             <div>
                 <h3 class="text-xl font-bold text-gray-200">Alternate Guardians</h3>
                 <p class="text-xs text-gray-500 mt-1">Backup if the primary guardian is unable to act.</p>
             </div>
             <button @click="addAlternate" class="text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 px-4 py-2 rounded-lg transition-all shadow-lg flex items-center">
                <span class="mr-2 text-lg leading-none">+</span> Add Alternate
             </button>
        </div>

        <transition-group name="list" tag="div" class="space-y-4">
            <div v-if="form.alternates.length === 0" key="empty" class="text-gray-500 italic p-6 text-center bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-700/50 flex flex-col items-center">
                <svg class="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                No alternates added.
            </div>

            <div v-for="(alt, index) in form.alternates" :key="alt.id || index" class="bg-gray-800/80 p-5 rounded-xl relative group border border-gray-700 hover:border-gray-600 transition-colors">
                <button @click="removeAlternate(index)" class="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-60 hover:opacity-100 transition-all p-2 hover:bg-red-900/20 rounded-full">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <QuestionHelper v-bind="h.alternateName">
                          <PeoplePicker 
                            v-model="alt.fullName"
                            :id="h.alternateName.inputId + '-' + index"
                            placeholder="Alternate guardian name"
                            inputClass="input-modern"
                          />
                      </QuestionHelper>
                    </div>
                    <div>
                      <QuestionHelper v-bind="h.alternateRelationship">
                          <select v-model="alt.relationship" :id="h.alternateRelationship.inputId + '-' + index" class="input-modern">
                              <option value="">Select Relationship</option>
                              <option value="Sibling">Sibling</option>
                              <option value="Grandparent">Grandparent</option>
                              <option value="Aunt/Uncle">Aunt / Uncle</option>
                              <option value="In-Law">In-Law</option>
                              <option value="Relative">Other Relative</option>
                              <option value="Friend">Friend</option>
                          </select>
                      </QuestionHelper>
                    </div>
                </div>
            </div>
        </transition-group>
      </div>

      <!-- W5: Trustee Designation Section -->
      <div class="card-glass p-6 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-900/10 relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-1 h-full bg-purple-500/50 group-hover:bg-purple-500 transition-colors"></div>
        
        <div class="mb-6">
            <h3 class="text-xl font-bold text-gray-100">Trustee Designation</h3>
            <p class="text-xs text-gray-400 mt-1">Who will manage finances for your minor children? Trust distribution ages are configured in the Beneficiaries step.</p>
        </div>

        <div class="space-y-4">
          <!-- Same as Guardian toggle -->
          <QuestionHelper v-bind="h.trusteeSameAsGuardian">
            <label class="flex items-center space-x-3 cursor-pointer select-none group">
                <input 
                  v-model="form.trusteeSameAsGuardian" 
                  :id="h.trusteeSameAsGuardian.inputId"
                  type="checkbox" 
                  class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500/30" 
                />
                <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Same as Primary Guardian</span>
            </label>
          </QuestionHelper>

          <!-- Separate Trustee Fields -->
          <div v-if="!form.trusteeSameAsGuardian" class="bg-gray-800/40 p-4 rounded-xl border border-gray-700/30 space-y-4 animate-fade-in">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <QuestionHelper v-bind="h.trusteeName">
                        <PeoplePicker 
                          v-model="form.trustee.fullName"
                          :id="h.trusteeName.inputId"
                          placeholder="e.g. John Smith"
                          inputClass="input-modern"
                        />
                    </QuestionHelper>
                  </div>
                  <div>
                    <QuestionHelper v-bind="h.trusteeRelationship">
                        <select v-model="form.trustee.relationship" :id="h.trusteeRelationship.inputId" class="input-modern">
                            <option value="">Select Relationship</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Parent">Parent</option>
                            <option value="Relative">Relative</option>
                            <option value="Trust Company">Trust Company</option>
                            <option value="Professional">Professional (Lawyer/Accountant)</option>
                        </select>
                    </QuestionHelper>
                  </div>
              </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import PeoplePicker from '../../components/PeoplePicker.vue';
import QuestionHelper from '../../components/QuestionHelper.vue';
import SkeletonLoader from '../../components/common/SkeletonLoader.vue';
import { willsHelpers } from '../../utils/willsFieldHelpers';
import { useWizardStepSave } from '../../composables/useWizardStepSave';

const h = willsHelpers.guardians;
import type { Guardians, Guardian } from '../../types/intake';
import { useToast } from '../../composables/useToast';

// G1: Extended type — ageOfDistribution and stagedDistribution are now in Beneficiaries.trustConditions
interface GuardiansWithTrustee extends Guardians {
    trusteeSameAsGuardian: boolean;
    trustee: Guardian & { id?: string };
}

const store = useIntakeStore();
const { showToast } = useToast();

const defaultForm = (): GuardiansWithTrustee => ({
    primary: { fullName: '', relationship: '' },
    alternates: [] as (Guardian & { id?: string })[],
    trusteeSameAsGuardian: true,
    trustee: { fullName: '', relationship: '' },
});

const form = ref<GuardiansWithTrustee>(defaultForm());
const guardiansPayload = () => ({ guardians: JSON.parse(JSON.stringify(form.value)) });
const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(guardiansPayload);

// G6: Clear trustee fields when toggled back to "same as guardian"
watch(() => form.value.trusteeSameAsGuardian, (isSame) => {
    if (isSame) {
        form.value.trustee.fullName = '';
        form.value.trustee.relationship = '';
    }
});

watch(form, () => {
    scheduleSave();
}, { deep: true });

onMounted(async () => {
    // S1: Use isInitialized flag instead of Object.keys check
    if (!store.isInitialized) {
        await store.fetchIntake();
    }
    if (store.intakeData.guardians) {
        // G4: Merge with defaults so trustee fields always have fallback values
        form.value = {
            ...defaultForm(),
            ...JSON.parse(JSON.stringify(store.intakeData.guardians))
        };
    }

    store.stageIntakeStep(guardiansPayload());
    markInitialized();
});

const addAlternate = () => {
    // G3: Assign UUID so v-for key works correctly
    form.value.alternates.push({
        id: crypto.randomUUID(),
        fullName: '',
        relationship: ''
    } as any);
};

const removeAlternate = (index: number) => {
    const name = form.value.alternates[index]?.fullName || 'this alternate';
    if (!window.confirm(`Remove ${name} as alternate guardian?`)) return;
    form.value.alternates.splice(index, 1);
};

const validateLocal = () => {
    if (!form.value.primary.fullName) {
        showToast('Primary Guardian Name is required.', 'warning');
        return 'Primary Guardian Name is required.';
    }
    if (!form.value.primary.relationship) {
        showToast('Primary Guardian Relationship is required.', 'warning');
        return 'Primary Guardian Relationship is required.';
    }

    const creatorName = store.intakeData.personalProfile?.fullName;
    if (creatorName && form.value.primary.fullName === creatorName) {
        const message = 'You cannot appoint yourself as Guardian - the guardian acts after your passing.';
        showToast(message, 'warning');
        return message;
    }

    if (!form.value.trusteeSameAsGuardian && !form.value.trustee.fullName) {
        showToast('Trustee Name is required when not using the Guardian as Trustee.', 'warning');
        return 'Trustee Name is required when not using the Guardian as Trustee.';
    }

    const emptyAlternate = form.value.alternates.find(a => !a.fullName || a.fullName.trim() === '');
    if (emptyAlternate) {
        const message = 'Please provide a name for all added alternate guardians, or remove the empty entry.';
        showToast(message, 'warning');
        return message;
    }

    const executorName = store.intakeData.executors?.primary?.fullName;
    if (executorName && form.value.primary.fullName === executorName) {
        const proceed = window.confirm(
            `"${form.value.primary.fullName}" is also your primary Executor. This is allowed but concentrates significant responsibility in one person.\n\nClick OK to proceed, or Cancel to change.`
        );
        if (!proceed) return 'Guardian and executor conflict requires review.';
    }

    return null;
};

defineExpose({
    commitStep,
    hasPendingChanges,
    validateLocal,
});
</script>
