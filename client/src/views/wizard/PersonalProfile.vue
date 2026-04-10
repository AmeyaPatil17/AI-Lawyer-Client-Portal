<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Personal Profile</h2>
    
    <SkeletonLoader v-if="store.isLoading" variant="form" :lines="6" />
    <div v-else class="space-y-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
      
      <!-- Full Name -->
      <div>
        <QuestionHelper v-bind="h.fullName" :currentValue="form.fullName">
          <input 
            v-model="form.fullName"
            id="personal-fullname"
            type="text" 
            aria-required="true"
            :aria-invalid="hasError('fullName')"
            :aria-describedby="hasError('fullName') ? 'fullName-error' : undefined"
            class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            :class="{'border-red-500 focus:border-red-500': hasError('fullName')}"
            placeholder="e.g. John Doe"
            @blur="handleBlur('fullName')"
          />
        </QuestionHelper>
        <p v-if="hasError('fullName')" id="fullName-error" class="mt-1 text-xs text-red-400" aria-live="polite">{{ errors.fullName }}</p>
      </div>

      <!-- Date of Birth -->
      <div>
        <QuestionHelper v-bind="h.dateOfBirth" :currentValue="form.dateOfBirth">
          <input 
            v-model="form.dateOfBirth"
            id="personal-dob"
            type="date"
            :max="today"
            min="1900-01-01" 
            aria-required="true"
            :aria-invalid="hasError('dateOfBirth')"
            :aria-describedby="hasError('dateOfBirth') ? 'dob-error' : undefined"
            class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            :class="{'border-red-500 focus:border-red-500': hasError('dateOfBirth')}"
            @blur="handleBlur('dateOfBirth')"
          />
        </QuestionHelper>
        <p v-if="hasError('dateOfBirth')" id="dob-error" class="mt-1 text-xs text-red-400" aria-live="polite">{{ errors.dateOfBirth }}</p>
      </div>

      <!-- Address -->
      <div>
        <QuestionHelper v-bind="h.address">
          <textarea 
            v-model="form.address"
            :id="h.address.inputId"
            rows="3"
            class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="Street, City, Postal Code"
          ></textarea>
        </QuestionHelper>
      </div>

       <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Occupation -->
        <div>
          <QuestionHelper v-bind="h.occupation">
            <input 
              v-model="form.occupation"
              :id="h.occupation.inputId"
              type="text" 
              class="input-modern"
              placeholder="e.g. Software Engineer"
            />
          </QuestionHelper>
        </div>
        <!-- Employer -->
        <div>
            <QuestionHelper v-bind="h.employer">
              <input 
                v-model="form.employer"
                :id="h.employer.inputId"
                type="text" 
                class="input-modern"
                placeholder="e.g. Acme Corp"
              />
            </QuestionHelper>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Place of Birth -->
          <div>
            <QuestionHelper v-bind="h.placeOfBirth">
              <input 
                v-model="form.placeOfBirth"
                :id="h.placeOfBirth.inputId"
                type="text" 
                class="input-modern"
                placeholder="City, Country"
              />
            </QuestionHelper>
          </div>
          <!-- Citizenship -->
          <div>
              <QuestionHelper v-bind="h.citizenship">
                <input 
                  v-model="form.citizenship"
                  :id="h.citizenship.inputId"
                  type="text" 
                  class="input-modern"
                  placeholder="e.g. Canadian, US"
                />
              </QuestionHelper>
          </div>
      </div>

      <hr class="border-gray-700 my-4" />

      <!-- Marital Status Details -->
      <div>
          <QuestionHelper v-bind="h.maritalStatus" :currentValue="form.maritalStatus">
            <select 
              v-model="form.maritalStatus" 
              id="personal-marital"
                aria-required="true"
                :aria-invalid="hasError('maritalStatus')"
                :aria-describedby="hasError('maritalStatus') ? 'marital-error' : undefined"
                class="input-modern"
                :class="{'border-red-500 focus:border-red-500': hasError('maritalStatus')}"
                @blur="handleBlur('maritalStatus')"
             >
                <option value="">Select...</option>
                <option value="single">Single (Never Married)</option>
                <option value="married">Married</option>
                <option value="commonLaw">Common Law</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
             </select>
         </QuestionHelper>
         <p v-if="hasError('maritalStatus')" id="marital-error" class="mt-1 text-xs text-red-400" aria-live="polite">{{ errors.maritalStatus }}</p>
      </div>

      <div v-if="['married', 'commonLaw'].includes(form.maritalStatus ?? '')" class="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20 space-y-4 animate-fade-in">
          <h3 class="text-sm font-bold text-blue-400 uppercase">{{ form.maritalStatus === 'married' ? 'Marriage Details' : 'Common-Law Union Details' }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <QuestionHelper v-bind="h.marriageDate">
                    <input
                      v-model="form.marriageDate"
                      :id="h.marriageDate.inputId"
                      type="date"
                       :max="today"
                       class="input-modern"
                      :class="{'border-red-500': hasError('marriageDate')}"
                      @blur="handleBlur('marriageDate')"
                    />
                  </QuestionHelper>
                  <p v-if="hasError('marriageDate')" class="mt-1 text-xs text-red-400" aria-live="polite">{{ errors.marriageDate }}</p>
               </div>
               <div>
                  <QuestionHelper v-bind="h.marriagePlace">
                    <input v-model="form.marriagePlace" :id="h.marriagePlace.inputId" type="text" class="input-modern" placeholder="City, Country" />
                  </QuestionHelper>
               </div>
          </div>
      </div>

       <!-- Domestic Contract -->
       <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
           <QuestionHelper v-bind="h.hasDomesticContract" :currentValue="form.hasDomesticContract">
           <div :id="h.hasDomesticContract.inputId" class="space-y-2">
           <label class="flex items-center justify-between cursor-pointer mb-2">
              <span class="font-medium">Do you have a Domestic Contract?</span>
              <div class="flex items-center space-x-4">
                 <label class="flex items-center space-x-2">
                    <input type="radio" value="yes" v-model="form.hasDomesticContract" class="text-blue-500 bg-gray-800 border-gray-600" />
                    <span>Yes</span>
                 </label>
                 <label class="flex items-center space-x-2">
                    <input type="radio" value="no" v-model="form.hasDomesticContract" class="text-blue-500 bg-gray-800 border-gray-600" />
                    <span>No</span>
                 </label>
              </div>
           </label>
           </div>
          </QuestionHelper>
           <p class="text-xs text-gray-400 mb-3">(e.g. Marriage Contract, Cohabitation Agreement, Separation Agreement)</p>
           
           <div v-if="form.hasDomesticContract === 'yes'" class="animate-fade-in">
             <QuestionHelper v-bind="h.domesticContractDetails" :currentValue="form.domesticContractDetails" @use-legal="form.domesticContractDetails = $event">
               <textarea v-model="form.domesticContractDetails" :id="h.domesticContractDetails.inputId" class="input-modern w-full" rows="2" placeholder="Please provide brief details..."></textarea>
             </QuestionHelper>
           </div>
        </div>

        <!-- Support Obligations -->
       <div class="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
          <QuestionHelper v-bind="h.hasSupportObligations" :currentValue="form.hasSupportObligations">
          <div :id="h.hasSupportObligations.inputId" class="space-y-2">
          <label class="flex items-center justify-between cursor-pointer mb-2">
             <span class="font-medium">Do you have support obligations?</span>
              <div class="flex items-center space-x-4">
                 <label class="flex items-center space-x-2">
                    <input type="radio" value="yes" v-model="form.hasSupportObligations" class="text-blue-500 bg-gray-800 border-gray-600" />
                    <span>Yes</span>
                 </label>
                 <label class="flex items-center space-x-2">
                    <input type="radio" value="no" v-model="form.hasSupportObligations" class="text-blue-500 bg-gray-800 border-gray-600" />
                    <span>No</span>
                 </label>
              </div>
           </label>
          </div>
          </QuestionHelper>
          <p class="text-xs text-gray-400 mb-3">(e.g. Spousal support or child support from a previous relationship)</p>
          
          <div v-if="form.hasSupportObligations === 'yes'" class="animate-fade-in">
             <QuestionHelper v-bind="h.supportObligationDetails" :currentValue="form.supportObligationDetails" @use-legal="form.supportObligationDetails = $event">
               <textarea v-model="form.supportObligationDetails" :id="h.supportObligationDetails.inputId" class="input-modern w-full" rows="2" placeholder="Please provide brief details..."></textarea>
             </QuestionHelper>
           </div>
        </div>



        <!-- Professional Advisors (Optional) -->
       <div class="mt-6 pt-6 border-t border-gray-700">
          <h3 class="text-lg font-semibold mb-4 text-gray-300">Professional Advisors</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <QuestionHelper v-bind="h.accountant">
                    <input v-model="form.accountant" :id="h.accountant.inputId" type="text" class="input-modern" placeholder="Name & Firm" />
                  </QuestionHelper>
               </div>
               <div>
                  <QuestionHelper v-bind="h.advisor">
                    <input v-model="form.advisor" :id="h.advisor.inputId" type="text" class="input-modern" placeholder="Name & Firm" />
                  </QuestionHelper>
               </div>
          </div>
       </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import { useTriageStore } from '../../stores/triage';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import QuestionHelper from '../../components/QuestionHelper.vue';
import SkeletonLoader from '../../components/common/SkeletonLoader.vue';
import { useStepValidation, isRequired, isNotFutureDate, isReasonableAge, isAfterDate } from '../../composables/useStepValidation';
import type { PersonalProfile } from '../../types/intake';
import { willsHelpers } from '../../utils/willsFieldHelpers';

const h = willsHelpers.personalProfile;

const store = useIntakeStore();
const triageStore = useTriageStore();
const { showToast } = useToast();

const form = ref<PersonalProfile>({
  fullName: '',
  dateOfBirth: '',
  address: '',
  occupation: '',
  employer: '',
  placeOfBirth: '',
  citizenship: '',
  maritalStatus: '',
  marriageDate: '',
  marriagePlace: '',
  hasDomesticContract: 'no',
  domesticContractDetails: '',
  hasSupportObligations: 'no',
  supportObligationDetails: '',
  accountant: '',
  advisor: ''
} as PersonalProfile);

const personalProfilePayload = computed(() => ({
    personalProfile: { ...form.value },
}));

const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(() => personalProfilePayload.value);

// Validation rules — date validators run on blur so user sees feedback immediately
const { errors, handleBlur, validateAll, hasError } = useStepValidation(form, {
    fullName:      [isRequired('Full Name is required')],
    dateOfBirth:   [
        isRequired('Date of Birth is required'),
        isNotFutureDate('Date of Birth cannot be in the future'),
        isReasonableAge(),
    ],
    maritalStatus: [isRequired('Marital Status is required')],
    marriageDate:  [
        isNotFutureDate('Marriage date cannot be in the future'),
        isAfterDate(() => form.value.dateOfBirth ?? '', 'Marriage date must be after your date of birth'),
    ],
});

// P3: Clear stale conditional data when toggles are flipped back to 'no'
watch(() => form.value.hasDomesticContract, (val) => {
    if (val === 'no') form.value.domesticContractDetails = '';
});
watch(() => form.value.hasSupportObligations, (val) => {
    if (val === 'no') form.value.supportObligationDetails = '';
});

watch(form, () => {
    scheduleSave();
}, { deep: true });

// P4: Today for max attribute on date inputs
const today = computed(() => new Date().toISOString().split('T')[0]);

onMounted(async () => {
    // S1: Use isInitialized flag
    if (!store.isInitialized) {
        await store.fetchIntake();
    }
    if (store.intakeData.personalProfile) {
        form.value = { ...form.value, ...store.intakeData.personalProfile };
    }

    // Pre-fill marital status from triage if not already saved
    if (!form.value.maritalStatus) {
        const triageMarital = (store.intakeData as any).triage?.maritalStatus
            || triageStore.triageData.maritalStatus;
        if (triageMarital) {
            // P2: Normalise to lowercase to match <option> values
            form.value.maritalStatus = triageMarital.toLowerCase();
        }
    }

    store.stageIntakeStep(personalProfilePayload.value);
    markInitialized();
});

const validateLocal = () => {
    if (!validateAll()) {
        return errors.value.fullName
            || errors.value.dateOfBirth
            || errors.value.maritalStatus
            || errors.value.marriageDate
            || 'Please review the highlighted fields.';
    }

    const isInUnion = ['married', 'commonLaw'].includes(form.value.maritalStatus ?? '');
    if (isInUnion && form.value.marriageDate && form.value.dateOfBirth) {
        const dobDate      = new Date(form.value.dateOfBirth);
        const marriageDate = new Date(form.value.marriageDate);
        const ageAtUnion = (marriageDate.getTime() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageAtUnion <= 0) {
            const message = form.value.maritalStatus === 'married'
                ? 'Marriage date must be after your date of birth.'
                : 'Union start date must be after your date of birth.';
            showToast(message, 'warning');
            return message;
        }
        if (form.value.maritalStatus === 'married' && ageAtUnion < 16) {
            const message = 'Marriage date is invalid - you would have been under 16 at that date.';
            showToast(message, 'warning');
            return message;
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
