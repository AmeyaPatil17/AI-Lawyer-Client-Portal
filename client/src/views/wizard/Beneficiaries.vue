<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Beneficiaries</h2>
    <p class="text-gray-400 mb-6">Who should receive your assets (residue of estate) after debts and specific gifts are paid?</p>
    
    <div class="space-y-8">
      
      <!-- AI: Henson Trust Suggester -->
      <div v-if="showHensonSuggestion" class="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl text-amber-200 text-sm animate-fade-in">
        <span class="text-2xl shrink-0">🧠</span>
        <div>
          <strong class="block font-semibold mb-1">AI Suggestion: Henson Trust Recommended</strong>
          One of your children has a disability. Receiving an inheritance directly will revoke their ODSP benefits. 
          Please set the Trust Type below to <strong class="text-amber-100">"Henson Trust"</strong> to protect their government support.
        </div>
      </div>

      <!-- AI: Spousal Omission Detector -->
      <div v-if="spouseOmitted" class="flex items-start gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm animate-fade-in">
        <span class="text-2xl shrink-0">⚠️</span>
        <div>
          <strong class="block font-semibold mb-1">Spousal Omission Detected</strong>
          You indicated you are married or in a common law relationship but no beneficiary with 
          relationship "Spouse" has been added. In Ontario, your spouse may have a right to equalization. 
          Consider explicitly including your spouse or consult your lawyer.
        </div>
      </div>

      <!-- Personal Effects -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div class="flex items-center space-x-3 mb-4">
               <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">1</div>
               <h3 class="text-xl font-semibold text-white">Personal Effects</h3>
          </div>
          <div class="ml-11">
              <QuestionHelper v-bind="h.personalEffectsSpouseAll">
                <label class="flex items-center space-x-3 cursor-pointer mb-4">
                     <input type="checkbox" v-model="form.personalEffects.spouseAll" :id="h.personalEffectsSpouseAll.inputId" class="form-checkbox w-5 h-5 bg-gray-900 border-gray-600 rounded text-purple-500" />
                     <span class="text-gray-300">Leave all personal effects to Spouse (if alive), then Children?</span>
                </label>
              </QuestionHelper>
              
              <div v-if="!form.personalEffects.spouseAll" class="bg-gray-900/50 p-4 rounded-lg border border-gray-600 space-y-3">
                   <p class="text-sm text-gray-400">Please list specific items and beneficiaries:</p>
                   <div v-for="(item, idx) in form.personalEffects.specificItems" :key="idx" class="flex gap-2">
                       <QuestionHelper v-bind="h.specificItem">
                         <input v-model="item.item" :id="h.specificItem.inputId + '-' + idx" placeholder="Item (e.g. Gold Watch)" class="input-modern flex-1 text-sm" />
                       </QuestionHelper>
                       <QuestionHelper v-bind="h.specificItemBen">
                         <input v-model="item.beneficiary" :id="h.specificItemBen.inputId + '-' + idx" placeholder="Beneficiary" class="input-modern flex-1 text-sm" />
                       </QuestionHelper>
                       <button @click="form.personalEffects.specificItems.splice(idx,1)" class="text-red-400 font-bold px-2">&times;</button>
                   </div>
                   <button @click="form.personalEffects.specificItems.push({ item: '', beneficiary: '' })" class="text-xs text-blue-400 underline">+ Add Item</button>
              </div>
          </div>
      </div>

      <!-- Specific Cash Gifts (Legacies) -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
           <div class="flex items-center space-x-3 mb-4">
               <div class="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">2</div>
               <h3 class="text-xl font-semibold text-white">Specific Cash Gifts (Legacies)</h3>
          </div>
          <div class="ml-11">
               <p class="text-sm text-gray-400 mb-4">Do you want to leave cash gifts to anyone before the rest is divided?</p>
               
               <div class="space-y-3">
                   <div v-for="(legacy, idx) in form.legacies" :key="legacy.id || idx" class="grid grid-cols-7 gap-2 items-center bg-gray-900 p-2 rounded">
                       <div class="col-span-3">
                         <QuestionHelper v-bind="h.legacyName">
                             <PeoplePicker 
                                v-model="legacy.name"
                                :id="h.legacyName.inputId + '-' + idx"
                                placeholder="Name / Charity"
                                inputClass="py-1 text-sm bg-gray-800 border-gray-600 focus:border-blue-500 rounded"
                             />
                         </QuestionHelper>
                       </div>
                        <div class="col-span-2">
                          <QuestionHelper v-bind="h.legacyRelationship">
                            <input
                              v-model="legacy.relationship"
                              :id="h.legacyRelationship.inputId + '-' + idx"
                              placeholder="Relationship"
                              class="input-modern py-1 text-sm"
                            />
                          </QuestionHelper>
                        </div>
                       <div class="col-span-1">
                         <QuestionHelper v-bind="h.legacyAmount">
                           <input v-model.number="legacy.amount" :id="h.legacyAmount.inputId + '-' + idx" type="number" min="0" placeholder="$ Amount" class="input-modern py-1 text-sm" />
                         </QuestionHelper>
                       </div>
                       <div class="col-span-1 text-right">
                            <button @click="form.legacies.splice(idx,1)" class="text-red-400 font-bold hover:text-red-300">Rem</button>
                       </div>
                   </div>
                   <button @click="form.legacies.push({ name: '', relationship: '', amount: '' })" class="text-sm text-yellow-500 hover:text-yellow-400 flex items-center">
                       <span class="mr-1 text-lg leading-none">+</span> Add Cash Gift
                   </button>
               </div>
          </div>
      </div>

      <!-- Beneficiaries List -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div class="flex justify-between items-center mb-4">
             <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">3</div>
                <h3 class="text-xl font-semibold text-gray-200">Residue Beneficiaries</h3>
             </div>
             <button @click="addBeneficiary" class="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors">+ Add Beneficiary</button>
        </div>

        <div v-if="form.beneficiaries.length === 0" class="text-gray-500 italic p-4 text-center bg-gray-900/50 rounded-lg">
            No beneficiaries added.
        </div>

        <div v-else class="space-y-4">
            <div v-for="(ben, index) in form.beneficiaries" :key="(ben as any).id || index" class="bg-gray-900 p-4 rounded-lg relative group border border-gray-700">
                <button @click="removeBeneficiary(index)" class="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    &times; Remove
                </button>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <QuestionHelper v-bind="h.benName">
                          <PeoplePicker 
                             v-model="ben.fullName"
                             :id="h.benName.inputId + '-' + index"
                             label="Full Name / Organization"
                             inputClass="py-2 px-3 text-sm"
                          />
                      </QuestionHelper>
                    </div>
                    <div>
                      <QuestionHelper v-bind="h.benRelationship">
                          <select v-model="ben.relationship" :id="h.benRelationship.inputId + '-' + index" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm">
                               <option value="">Select Relationship</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Child">Child</option>
                              <option value="Sibling">Sibling</option>
                              <option value="Relative">Relative</option>
                              <option value="Friend">Friend</option>
                              <option value="Charity">Charity</option>
                          </select>
                      </QuestionHelper>
                    </div>
                    <div>
                      <QuestionHelper v-bind="h.benShare">
                          <input v-model.number="ben.share" :id="h.benShare.inputId + '-' + index" type="number" min="0" max="100" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" />
                      </QuestionHelper>
                    </div>
                </div>
            </div>
            
            <!-- Total Check -->
            <div class="mt-4 p-3 rounded-lg text-right text-sm">
                <span :class="totalShare === 100 ? 'text-green-400' : 'text-red-400'">Total Allocation: {{ totalShare }}%</span>
                <span v-if="totalShare !== 100" class="ml-2 text-red-300">(Must equal 100%)</span>
            </div>
        </div>
      </div>
      
      <!-- Contingency Plan -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 class="text-xl font-semibold mb-4 text-blue-400">Contingency Plan</h3>
        <p class="text-sm text-gray-400 mb-4">If a beneficiary predeceases you, what happens to their share?</p>
        
        <div class="space-y-2">
          <QuestionHelper v-bind="h.contingency">
            <div :id="h.contingency.inputId">
              <label class="flex items-center space-x-3 cursor-pointer p-3 rounded hover:bg-gray-700/50">
                  <input v-model="form.contingency" type="radio" value="perStirpes" class="text-blue-600 bg-gray-900 border-gray-600" />
                  <div>
                      <span class="block font-medium">To their children (Per Stirpes)</span>
                      <span class="text-xs text-gray-500">The share goes to their lineal descendants.</span>
                  </div>
              </label>
               <label class="flex items-center space-x-3 cursor-pointer p-3 rounded hover:bg-gray-700/50">
                  <input v-model="form.contingency" type="radio" value="proRata" class="text-blue-600 bg-gray-900 border-gray-600" />
                  <div>
                      <span class="block font-medium">Divide among surviving beneficiaries</span>
                      <span class="text-xs text-gray-500">The share is split between the others in the list above.</span>
                  </div>
              </label>
            </div>
          </QuestionHelper>
        </div>
      </div>

       <!-- Trust Provisions (W8, W9) -->
       <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
           <div class="flex items-center space-x-3 mb-4">
               <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">4</div>
               <h3 class="text-xl font-semibold text-white">Trust Provisions</h3>
           </div>
           
           <div class="ml-11 space-y-6">
               <p class="text-sm text-gray-400">Establish rules for how and when beneficiaries receive their inheritance, especially if they are minors or require financial protection.</p>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <!-- Trust Type -->
                   <div>
                     <QuestionHelper v-bind="h.trustType">
                         <select v-model="form.trustConditions.type" :id="h.trustType.inputId" class="input-modern">
                             <option value="discretionary">Fully Discretionary (Trustee decides)</option>
                             <option value="fixed">Fixed Interest (Income paid annually)</option>
                             <option value="henson">Henson Trust (Disability protection)</option>
                         </select>
                     </QuestionHelper>
                   </div>
                    <!-- Age of Majority -->
                   <div>
                     <QuestionHelper v-bind="h.trustAge">
                         <input v-model.number="form.trustConditions.ageOfMajority" :id="h.trustAge.inputId" type="number" class="input-modern" placeholder="e.g. 21" />
                     </QuestionHelper>
                   </div>
               </div>

               <!-- Trustee for this specific trust (W9) -->
               <div class="p-4 bg-gray-900/30 border border-gray-600 rounded-lg">
                 <QuestionHelper v-bind="h.separateTrustee">
                   <label class="flex items-center space-x-3 cursor-pointer mb-3">
                        <input type="checkbox" v-model="form.trustConditions.separateTrustee" :id="h.separateTrustee.inputId" class="rounded bg-gray-800 border-gray-500 text-green-500" />
                        <span class="font-medium text-gray-200">Appoint a separate trustee for these trusts?</span>
                   </label>
                   <p class="text-xs text-gray-500 mb-3" v-if="!form.trustConditions.separateTrustee">Otherwise, your Executors will act as Trustees.</p>
                 </QuestionHelper>
                   
                   <div v-if="form.trustConditions.separateTrustee" class="animate-fade-in mt-3">
                     <QuestionHelper v-bind="h.separateTrusteeName">
                         <PeoplePicker 
                             v-model="form.trustConditions.trusteeName"
                             :id="h.separateTrusteeName.inputId"
                             placeholder="e.g. Trust Company or Individual"
                             inputClass="input-modern"
                         />
                     </QuestionHelper>
                   </div>
               </div>

               <!-- Spendthrift Clause (W9) -->
                <div class="p-4 bg-yellow-900/10 border border-yellow-600/30 rounded-lg">
                 <QuestionHelper v-bind="h.spendthrift">
                    <label class="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" v-model="form.trustConditions.spendthriftClause" :id="h.spendthrift.inputId" class="rounded bg-gray-800 border-yellow-500/50 text-yellow-500" />
                        <div>
                             <span class="block font-medium text-yellow-200">Include Spendthrift Clause</span>
                             <span class="text-xs text-yellow-200/70">Protects the trust assets from a beneficiary's creditors or bankruptcy.</span>
                        </div>
                   </label>
                 </QuestionHelper>
               </div>

               <!-- Staged Distribution -->
                <div class="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                 <QuestionHelper v-bind="h.stagedDist">
                    <label class="flex items-center space-x-3 cursor-pointer mb-2">
                        <input type="checkbox" v-model="form.trustConditions.stagedDistribution" :id="h.stagedDist.inputId" class="rounded bg-gray-800 border-gray-500 text-green-500" />
                        <span class="font-medium text-sm">Use Staged Distribution?</span>
                    </label>
                    <p class="text-xs text-gray-500 mb-3">Release funds in stages (e.g. 25% at 21, 25% at 25, Balance at 30).</p>
                 </QuestionHelper>

                    <transition name="list">
                        <div v-if="form.trustConditions.stagedDistribution" class="space-y-2">
                             <div v-for="(stage, idx) in form.trustConditions.stages" :key="idx" class="flex gap-2 items-center">
                                 <span class="text-sm text-gray-400">Release</span>
                                 <input v-model.number="stage.percentage" type="number" class="input-modern w-20 px-1 py-1 text-center" placeholder="%" />
                                 <span class="text-sm text-gray-400">% at Age</span>
                                 <input v-model.number="stage.age" type="number" class="input-modern w-20 px-1 py-1 text-center" placeholder="Age" />
                                 <button @click="form.trustConditions.stages.splice(idx,1)" class="text-red-400 font-bold px-2 hover:bg-red-900/20 rounded">&times;</button>
                             </div>
                             <button @click="form.trustConditions.stages.push({ percentage: 0, age: 0 })" class="text-xs text-green-400 underline mt-2">+ Add Stage</button>
                        </div>
                    </transition>
               </div>
           </div>
       </div>

       <!-- Common Disaster -->
       <div class="bg-red-900/20 p-6 rounded-xl border border-red-900/50">
         <QuestionHelper v-bind="h.disaster" :currentValue="form.disasterClause" @use-legal="form.disasterClause = $event">
            <h3 class="text-lg font-semibold text-red-300 mb-2">Common Disaster Clause</h3>
            <p class="text-sm text-gray-400 mb-3">If ALL beneficiaries named above predecease you (e.g. entire family perishes), who inherits?</p>
            <textarea v-model="form.disasterClause" :id="h.disaster.inputId" class="input-modern w-full" rows="2" placeholder="e.g. One half to my parents, one half to spouse's parents..."></textarea>
         </QuestionHelper>
       </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import PeoplePicker from '../../components/PeoplePicker.vue';
import type { Beneficiary } from '../../types/intake';
import { useIntakeValidation } from '../../composables/useIntakeValidation';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import QuestionHelper from '../../components/QuestionHelper.vue';
import { willsHelpers } from '../../utils/willsFieldHelpers';

const h = willsHelpers.beneficiaries;

const store = useIntakeStore();
const { validateWithAI } = useIntakeValidation();
const { showToast } = useToast();
const isValidating = ref(false);

const spouseOmitted = computed(() => {
    const isMarried = store.intakeData.personalProfile?.maritalStatus === 'Married' || store.intakeData.personalProfile?.maritalStatus === 'CommonLaw';
    const hasSpouseBen = form.value.beneficiaries.some(b => b.relationship === 'Spouse');
    return isMarried && !hasSpouseBen && form.value.beneficiaries.length > 0;
});

const showHensonSuggestion = computed(() => {
    const children = store.intakeData.family?.children || [];
    const hasDisabledChild = children.some((c: any) => c.isDisabled);
    return hasDisabledChild && form.value.trustConditions.type !== 'henson';
});

// We use a local form that extends the strict type to include UI-specific fields
// that might be stored loosely or are planned for future strict types.
const form = ref({
    personalEffects: { spouseAll: false, specificItems: [] as any[] },
    legacies: [] as any[],
    beneficiaries: [] as Beneficiary[], 
    contingency: '',
    trustConditions: { 
        type: 'discretionary',
        ageOfMajority: 21, 
        stagedDistribution: false, 
        stages: [] as any[],
        separateTrustee: false,
        trusteeName: '',
        spendthriftClause: false
    },
    disasterClause: ''
});

const beneficiariesPayload = computed(() => ({
    beneficiaries: JSON.parse(JSON.stringify(form.value)),
}));

const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(() => beneficiariesPayload.value);

const totalShare = computed(() => {
    return form.value.beneficiaries.reduce((sum, b) => sum + (b.share || 0), 0);
});

onMounted(async () => {
    if (!store.isInitialized) {
        await store.fetchIntake();
    }
    if (store.intakeData.beneficiaries) {
        // Deep copy
        const data = JSON.parse(JSON.stringify(store.intakeData.beneficiaries));
        // Merge into form
        form.value = { ...form.value, ...data };
    }

    store.stageIntakeStep(beneficiariesPayload.value);
    markInitialized();
});

watch(form, () => {
    scheduleSave();
}, { deep: true });

const addBeneficiary = () => {
    form.value.beneficiaries.push({ 
        id: crypto.randomUUID(),
        fullName: '', 
        relationship: '', 
        share: 0 
    } as any);
};

const removeBeneficiary = (index: number) => {
    form.value.beneficiaries.splice(index, 1);
};

const validateLocal = () => {
    if (form.value.beneficiaries.length === 0) {
        showToast('Please add at least one residue beneficiary.', 'warning');
        return 'Please add at least one residue beneficiary.';
    }

    const total = form.value.beneficiaries.reduce((sum, b) => sum + (b.share || 0), 0);
    if (total !== 100) {
        const message = `Total allocation must equal 100%. Current total: ${total}%`;
        showToast(message, 'warning');
        return message;
    }

    return null;
};

const afterCommitContinue = async () => {
    isValidating.value = true;
    const warning = await validateWithAI('validating_beneficiaries');
    isValidating.value = false;

    if (warning) {
        const proceed = window.confirm(`AI Guard Notice:\n\n${warning}\n\nDo you want to address this now? (Click Cancel to fix, OK to proceed)`);
        if (!proceed) return false;
    }

    return true;
};

defineExpose({
    commitStep,
    hasPendingChanges,
    validateLocal,
    afterCommitContinue,
    getPrimaryActionState: () => ({
        disabled: isValidating.value,
        loading: isValidating.value,
    }),
});
</script>
