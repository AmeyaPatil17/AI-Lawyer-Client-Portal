<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Family & Dependants</h2>

    <SkeletonLoader v-if="store.isLoading" variant="form" :lines="5" />
    <div v-else class="space-y-8">
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 class="text-xl font-semibold mb-4 text-blue-400">Spouse / Partner</h3>

        <div class="mb-4">
          <QuestionHelper v-bind="h.maritalStatus" :currentValue="form.maritalStatus">
            <select
              v-model="form.maritalStatus"
              :id="h.maritalStatus.inputId"
              aria-required="true"
              :aria-invalid="hasError('maritalStatus')"
              :aria-describedby="hasError('maritalStatus') ? 'family-marital-error' : undefined"
              class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              :class="{ 'border-red-500 focus:border-red-500': hasError('maritalStatus') }"
              @blur="handleBlur('maritalStatus')"
            >
              <option value="">Select Status</option>
              <option value="single">Single (Never Married)</option>
              <option value="married">Married</option>
              <option value="commonLaw">Common Law</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </QuestionHelper>
          <p v-if="hasError('maritalStatus')" id="family-marital-error" class="mt-1 text-xs text-red-400" aria-live="polite">
            {{ errors.maritalStatus }}
          </p>
        </div>

        <div v-if="showSpouseField">
          <QuestionHelper v-bind="h.spouseName" :currentValue="form.spouseName">
            <PeoplePicker
              v-model="form.spouseName"
              id="spouse-name"
              name="spouseName"
              placeholder="e.g. Jane Doe"
              :exclude-names="spouseExcludeNames"
              :input-class="spouseInputClass"
              :aria-invalid="hasError('spouseName')"
              :aria-describedby="hasError('spouseName') ? 'family-spouse-error' : undefined"
              @blur="handleBlur('spouseName')"
            />
          </QuestionHelper>
          <p v-if="hasError('spouseName')" id="family-spouse-error" class="mt-1 text-xs text-red-400" aria-live="polite">
            {{ errors.spouseName }}
          </p>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-gray-200">Children</h3>
          <div class="flex space-x-3">
            <button
              type="button"
              @click="addChild('current')"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-all shadow-lg shadow-blue-900/40 hover:-translate-y-0.5 flex items-center"
            >
              <span class="mr-1 text-lg leading-none">+</span> Current
            </button>
            <button
              type="button"
              @click="addChild('previous')"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white font-medium transition-all border border-gray-600 hover:border-gray-500 flex items-center"
            >
              <span class="mr-1 text-lg leading-none">+</span> Previous
            </button>
          </div>
        </div>

        <div
          v-if="showMinorChildBanner"
          class="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-900/20 border border-amber-500/30 rounded-lg text-amber-300 text-sm"
        >
          <svg class="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>You indicated you have children under 18. Please add at least one minor child before continuing.</span>
        </div>

        <transition-group name="list" tag="div" class="space-y-6">
          <div
            v-if="form.children.length === 0"
            key="empty"
            class="text-gray-500 italic p-8 text-center bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-700/50 flex flex-col items-center"
          >
            <svg class="w-10 h-10 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            No children added yet. Click above to add.
          </div>

          <div
            v-for="(child, index) in form.children"
            :key="child.uiKey"
            class="card-glass p-6 rounded-xl relative group hover:border-blue-500/30 transition-all"
          >
            <div class="absolute -top-3 left-4">
              <span
                v-if="child.parentage === 'current'"
                class="bg-blue-900/80 backdrop-blur-sm text-blue-200 text-xs px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-wide font-bold shadow-sm"
              >
                Current Relationship
              </span>
              <span
                v-else
                class="bg-indigo-900/80 backdrop-blur-sm text-indigo-200 text-xs px-3 py-1 rounded-full border border-indigo-500/30 uppercase tracking-wide font-bold shadow-sm"
              >
                Previous Relationship
              </span>
            </div>

            <button
              type="button"
              @click="removeChild(index)"
              class="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-60 hover:opacity-100 transition-all p-2 hover:bg-red-900/20 rounded-full"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <QuestionHelper v-bind="h.childName">
                  <PeoplePicker
                    v-model="child.fullName"
                    :id="childNameInputId(index)"
                    :name="`child-full-name-${index}`"
                    :exclude-names="childExcludeNames(index)"
                    placeholder="Legal Name"
                    :input-class="childNameInputClass(child)"
                    :aria-invalid="hasChildError(child, 'fullName')"
                    :aria-describedby="hasChildError(child, 'fullName') ? childNameErrorId(child) : undefined"
                  />
                </QuestionHelper>
                <p
                  v-if="hasChildError(child, 'fullName')"
                  :id="childNameErrorId(child)"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ getChildError(child, 'fullName') }}
                </p>
              </div>

              <div>
                <QuestionHelper v-bind="h.childDob">
                  <input
                    v-model="child.dateOfBirth"
                    :id="childDobInputId(index)"
                    :name="`child-dob-${index}`"
                    type="date"
                    :max="todayISO"
                    class="input-modern w-full"
                    :class="{ 'border-red-500 focus:border-red-500': hasChildError(child, 'dateOfBirth') }"
                    :aria-invalid="hasChildError(child, 'dateOfBirth')"
                    :aria-describedby="hasChildError(child, 'dateOfBirth') ? childDobErrorId(child) : undefined"
                  />
                </QuestionHelper>
                <p v-if="isChildMinor(child)" class="mt-1 text-xs text-amber-400 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Under 18 - Guardian step required
                </p>
                <p
                  v-if="hasChildError(child, 'dateOfBirth')"
                  :id="childDobErrorId(child)"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ getChildError(child, 'dateOfBirth') }}
                </p>
              </div>

              <div>
                <QuestionHelper v-bind="h.childPob">
                  <input
                    v-model="child.placeOfBirth"
                    :id="childPobInputId(index)"
                    type="text"
                    class="input-modern w-full"
                    placeholder="e.g. Toronto, Ontario, Canada"
                  />
                </QuestionHelper>
              </div>

              <div class="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-900/30 p-4 rounded-lg border border-gray-700/30">
                <QuestionHelper v-bind="h.residesInCanada">
                  <label class="flex items-center space-x-3 cursor-pointer select-none group">
                    <input
                      v-model="child.residesInCanada"
                      :id="checkboxId(h.residesInCanada.inputId, index)"
                      type="checkbox"
                      class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 transition-colors group-hover:border-blue-500"
                    />
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Yes</span>
                  </label>
                </QuestionHelper>
                <QuestionHelper v-bind="h.isMarried">
                  <label class="flex items-center space-x-3 cursor-pointer select-none group">
                    <input
                      v-model="child.isMarried"
                      :id="checkboxId(h.isMarried.inputId, index)"
                      type="checkbox"
                      class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 transition-colors group-hover:border-blue-500"
                    />
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Yes</span>
                  </label>
                </QuestionHelper>
                <QuestionHelper v-bind="h.hasChildren">
                  <label class="flex items-center space-x-3 cursor-pointer select-none group">
                    <input
                      v-model="child.hasChildren"
                      :id="checkboxId(h.hasChildren.inputId, index)"
                      type="checkbox"
                      class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 transition-colors group-hover:border-blue-500"
                    />
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Yes</span>
                  </label>
                </QuestionHelper>
              </div>

              <div class="md:col-span-2">
                <div class="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
                  <span class="text-xs font-bold text-red-400 uppercase tracking-wide block mb-3 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    Special Considerations
                  </span>
                  <div class="flex flex-col sm:flex-row gap-6">
                    <QuestionHelper v-bind="h.isDisabled">
                      <label class="flex items-center space-x-3 cursor-pointer select-none group">
                        <input
                          v-model="child.isDisabled"
                          :id="checkboxId(h.isDisabled.inputId, index)"
                          type="checkbox"
                          class="w-5 h-5 rounded bg-gray-800 border-red-500/30 text-red-500 focus:ring-red-500/30 active:scale-95 transition-all group-hover:border-red-400"
                        />
                        <span class="text-sm text-gray-300 group-hover:text-red-200 transition-colors">Yes</span>
                      </label>
                    </QuestionHelper>
                    <QuestionHelper v-bind="h.hasSpendthrift">
                      <label class="flex items-center space-x-3 cursor-pointer select-none group">
                        <input
                          v-model="child.hasSpendthriftIssues"
                          :id="checkboxId(h.hasSpendthrift.inputId, index)"
                          type="checkbox"
                          class="w-5 h-5 rounded bg-gray-800 border-red-500/30 text-red-500 focus:ring-red-500/30 active:scale-95 transition-all group-hover:border-red-400"
                        />
                        <span class="text-sm text-gray-300 group-hover:text-red-200 transition-colors">Yes</span>
                      </label>
                    </QuestionHelper>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition-group>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import { useTriageStore } from '../../stores/triage';
import PeoplePicker from '../../components/PeoplePicker.vue';
import QuestionHelper from '../../components/QuestionHelper.vue';
import { useStepValidation, isRequired } from '../../composables/useStepValidation';
import { useToast } from '../../composables/useToast';
import SkeletonLoader from '../../components/common/SkeletonLoader.vue';
import { willsHelpers } from '../../utils/willsFieldHelpers';
import {
  compareIsoDates,
  createEmptyChildRow,
  createEmptyFamilyForm,
  getAgeFromIsoDate,
  getTodayIsoDate,
  hasMinorChildren,
  isFutureIsoDate,
  isMinorFromIsoDate,
  isValidIsoDate,
  normalizeFamilyData,
  requiresSpouseName,
  serializeFamilyForSave,
  type FamilyChildForm,
  type FamilyFormData,
} from '../../utils/family';
import { useWizardStepSave } from '../../composables/useWizardStepSave';

const h = willsHelpers.family;

type ChildFieldName = 'fullName' | 'dateOfBirth';
type ChildErrorMap = Record<string, Partial<Record<ChildFieldName, string>>>;

const CHILD_NAME_ERROR_PREFIX = 'family-child-name-error';
const CHILD_DOB_ERROR_PREFIX = 'family-child-dob-error';

const store = useIntakeStore();
const triageStore = useTriageStore();
const { showToast } = useToast();

const resolveInitialMaritalStatus = () =>
  store.intakeData.family?.maritalStatus
  || store.intakeData.personalProfile?.maritalStatus
  || (store.intakeData as any).triage?.maritalStatus
  || triageStore.triageData.maritalStatus
  || '';

const form = ref<FamilyFormData>(createEmptyFamilyForm({ maritalStatusFallback: resolveInitialMaritalStatus() }));
const childErrors = ref<ChildErrorMap>({});

const familyPayload = computed(() => ({
  family: serializeFamilyForSave(form.value),
}));

const { scheduleSave, commitStep, markInitialized, hasPendingChanges } = useWizardStepSave(() => familyPayload.value);

const isSpouseRequired = (message: string) => (value: string) => {
  if (requiresSpouseName(form.value.maritalStatus) && (!value || value.trim() === '')) {
    return message;
  }
  return true;
};

const { errors, handleBlur, validateAll, hasError, clearError } = useStepValidation(
  form,
  {
    maritalStatus: [isRequired('Marital Status is required')],
    spouseName: [isSpouseRequired('Spouse Name is required')],
  },
  {
    maritalStatus: h.maritalStatus.inputId,
    spouseName: 'spouse-name',
  }
);

const todayISO = computed(() => getTodayIsoDate());
const showSpouseField = computed(() => requiresSpouseName(form.value.maritalStatus));
const triageHasMinors = computed(() =>
  Boolean(triageStore.triageData.hasMinors || (store.intakeData as any).triage?.hasMinors)
);
const hasMinorChildrenLive = computed(() => hasMinorChildren(form.value.children));
const showMinorChildBanner = computed(() => triageHasMinors.value && !hasMinorChildrenLive.value);

const spouseExcludeNames = computed(() => {
  const names = [
    store.intakeData.personalProfile?.fullName || '',
    ...form.value.children.map((child) => child.fullName || ''),
  ];
  return names.filter(Boolean);
});

const spouseInputClass = computed(() => [
  'w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500',
  hasError('spouseName') ? 'border-red-500 focus:border-red-500' : '',
]);

const checkboxId = (baseId: string, index: number) => `${baseId}-${index}`;
const childNameInputId = (index: number) => `${h.childName.inputId}-${index}`;
const childDobInputId = (index: number) => `${h.childDob.inputId}-${index}`;
const childPobInputId = (index: number) => `${h.childPob.inputId}-${index}`;
const childNameErrorId = (child: FamilyChildForm) => `${CHILD_NAME_ERROR_PREFIX}-${child.uiKey}`;
const childDobErrorId = (child: FamilyChildForm) => `${CHILD_DOB_ERROR_PREFIX}-${child.uiKey}`;

const normalizeComparableName = (value?: string | null) => (value || '').trim().toLowerCase();

const getChildError = (child: FamilyChildForm, field: ChildFieldName) =>
  childErrors.value[child.uiKey]?.[field] || '';

const hasChildError = (child: FamilyChildForm, field: ChildFieldName) =>
  !!childErrors.value[child.uiKey]?.[field];

const childNameInputClass = (child: FamilyChildForm) => [
  'input-modern',
  hasChildError(child, 'fullName') ? 'border-red-500 focus:border-red-500' : '',
];

const isChildMinor = (child: FamilyChildForm) => isMinorFromIsoDate(child.dateOfBirth);

const childExcludeNames = (index: number) => {
  const selfName = store.intakeData.personalProfile?.fullName || '';
  const spouseName = form.value.spouseName || '';
  const siblingNames = form.value.children
    .filter((_, siblingIndex) => siblingIndex !== index)
    .map((child) => child.fullName || '');

  return [selfName, spouseName, ...siblingNames].filter(Boolean);
};

const resetChildErrors = () => {
  childErrors.value = {};
};

const scrollToChildError = (uiKey: string, field: ChildFieldName) => {
  const childIndex = form.value.children.findIndex((child) => child.uiKey === uiKey);
  if (childIndex === -1) return;

  const targetId = field === 'fullName'
    ? childNameInputId(childIndex)
    : childDobInputId(childIndex);

  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const buildChildValidationErrors = (): { valid: boolean; message: string | null } => {
  const nextErrors: ChildErrorMap = {};
  const seenNames = new Map<string, string>();
  const clientName = normalizeComparableName(store.intakeData.personalProfile?.fullName);
  const spouseName = normalizeComparableName(form.value.spouseName);
  const parentDob = store.intakeData.personalProfile?.dateOfBirth || '';
  let hasMinorChild = false;

  for (const child of form.value.children) {
    const rowErrors: Partial<Record<ChildFieldName, string>> = {};
    const normalizedName = normalizeComparableName(child.fullName);

    if (!normalizedName) {
      rowErrors.fullName = 'Child name is required.';
    } else if (seenNames.has(normalizedName)) {
      rowErrors.fullName = 'Each child must have a unique name.';
    } else if (clientName && normalizedName === clientName) {
      rowErrors.fullName = 'A child cannot have the same name as the client.';
    } else if (spouseName && normalizedName === spouseName) {
      rowErrors.fullName = 'A child cannot have the same name as the spouse or partner.';
    } else {
      seenNames.set(normalizedName, child.uiKey);
    }

    if (!child.dateOfBirth) {
      rowErrors.dateOfBirth = 'Date of birth is required.';
    } else if (!isValidIsoDate(child.dateOfBirth)) {
      rowErrors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (isFutureIsoDate(child.dateOfBirth)) {
      rowErrors.dateOfBirth = 'Date of birth cannot be in the future.';
    } else if (parentDob && (compareIsoDates(child.dateOfBirth, parentDob) ?? 1) <= 0) {
      rowErrors.dateOfBirth = `Date of birth must be after your own date of birth (${parentDob}).`;
    } else {
      const age = getAgeFromIsoDate(child.dateOfBirth);
      if (age !== null && age > 120) {
        rowErrors.dateOfBirth = 'Enter a realistic date of birth.';
      }
      if (isChildMinor(child)) {
        hasMinorChild = true;
      }
    }

    if (rowErrors.fullName || rowErrors.dateOfBirth) {
      nextErrors[child.uiKey] = rowErrors;
    }
  }

  childErrors.value = nextErrors;

  const firstChildError = Object.entries(nextErrors)[0];
  if (firstChildError) {
    const [uiKey, rowErrors] = firstChildError;
    const firstField = rowErrors.fullName ? 'fullName' : 'dateOfBirth';
    scrollToChildError(uiKey, firstField);
    return { valid: false, message: 'Please review the highlighted child entries.' };
  }

  if (triageHasMinors.value && !hasMinorChild) {
    return {
      valid: false,
      message: 'You indicated you have children under 18. Please add at least one child under 18 before continuing.',
    };
  }

  return { valid: true, message: null };
};

const validateLocal = () => {
  const topLevelValid = validateAll();
  if (!topLevelValid) {
    return errors.value.maritalStatus || errors.value.spouseName || 'Please review the highlighted fields.';
  }

  const childValidation = buildChildValidationErrors();
  if (!childValidation.valid) {
    if (childValidation.message) {
      showToast(childValidation.message, 'warning');
    }
    return childValidation.message;
  }

  return null;
};

watch(() => form.value.maritalStatus, (maritalStatus) => {
  if (!requiresSpouseName(maritalStatus)) {
    if (form.value.spouseName) {
      form.value.spouseName = '';
    }
    clearError('spouseName');
  }
});

watch(form, () => {
  resetChildErrors();
  scheduleSave();
}, { deep: true });

onMounted(async () => {
  if (!store.isInitialized) {
    await store.fetchIntake();
  }

  form.value = normalizeFamilyData(store.intakeData.family, {
    maritalStatusFallback: resolveInitialMaritalStatus(),
  });

  store.stageIntakeStep(familyPayload.value);
  markInitialized();
});

const addChild = (parentage: 'current' | 'previous') => {
  form.value.children.push(createEmptyChildRow(parentage));
};

const removeChild = (index: number) => {
  form.value.children.splice(index, 1);
  resetChildErrors();
};

defineExpose({
  commitStep,
  hasPendingChanges,
  validateLocal,
});
</script>
