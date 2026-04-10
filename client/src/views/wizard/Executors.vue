<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Executors & Alternates</h2>
    <p class="text-gray-400 mb-6">
      An executor is the person responsible for carrying out the instructions in your will.
    </p>

    <SkeletonLoader v-if="store.isLoading" variant="form" :lines="4" />
    <div v-else class="space-y-8">
      <div class="card-glass p-6 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-900/10 relative overflow-visible z-10 group">
        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors"></div>

        <div class="flex justify-between items-start mb-6">
          <div>
            <h3 class="text-xl font-bold text-gray-100">Primary Executor</h3>
            <p class="text-xs text-gray-400 mt-1">First choice to manage your estate.</p>
          </div>

          <button
            type="button"
            @click="smartFillSpouse"
            :disabled="!canQuickFillSpouse"
            class="text-xs bg-purple-900/50 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-purple-200 px-3 py-1.5 rounded-full border border-purple-500/30 transition-all flex items-center shadow-sm hover:shadow-purple-900/40 transform hover:-translate-y-0.5"
          >
            <span class="mr-1">Quick</span> Fill Spouse
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-800/40 p-4 rounded-xl border border-gray-700/30">
          <div>
            <QuestionHelper
              v-bind="h.primaryFullName"
              :currentValue="form.primary.fullName"
            >
              <PeoplePicker
                v-model="form.primary.fullName"
                id="primary-executor-name"
                name="primaryExecutorName"
                placeholder="e.g. Jane Doe"
                :exclude-names="primaryExcludeNames"
                :input-class="primaryInputClass"
                :aria-invalid="hasPrimaryNameError"
                :aria-describedby="hasPrimaryNameError ? primaryNameErrorId : undefined"
                @blur="touched.primaryFullName = true"
              />
            </QuestionHelper>
            <p
              v-if="hasPrimaryNameError"
              :id="primaryNameErrorId"
              class="mt-1 text-xs text-red-400"
              aria-live="polite"
            >
              {{ fieldErrors.primaryFullName }}
            </p>
          </div>
          <div>
            <QuestionHelper v-bind="h.primaryRelationship">
              <select
                v-model="form.primary.relationship"
                :id="h.primaryRelationship.inputId"
                class="input-modern"
              >
                <option value="">Select Relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Relative">Relative</option>
                <option value="Friend">Friend</option>
                <option value="Professional">Professional (Lawyer/Trust Co)</option>
              </select>
            </QuestionHelper>
          </div>
        </div>
      </div>

      <div class="card-glass p-6 rounded-xl border border-gray-700/50 relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-1 h-full bg-gray-600 group-hover:bg-gray-500 transition-colors"></div>

        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-xl font-bold text-gray-200">Alternate Executors</h3>
            <p class="text-xs text-gray-500 mt-1">Back-up if the primary executor cannot act.</p>
          </div>
          <button
            type="button"
            @click="addAlternate"
            class="text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 px-4 py-2 rounded-lg transition-all shadow-lg flex items-center"
          >
            <span class="mr-2 text-lg leading-none">+</span> Add Alternate
          </button>
        </div>

        <transition-group name="list" tag="div" class="space-y-4">
          <div
            v-if="form.alternates.length === 0"
            key="empty"
            class="text-gray-500 italic p-6 text-center bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-700/50 flex flex-col items-center"
          >
            <svg class="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
              </path>
            </svg>
            No alternates added yet. It is highly recommended to have at least one.
          </div>

          <div
            v-for="(alt, index) in form.alternates"
            :key="alt.uiKey"
            class="bg-gray-800/80 p-5 rounded-xl relative group border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <button
              type="button"
              @click="removeAlternate(index)"
              class="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-60 hover:opacity-100 transition-all p-2 hover:bg-red-900/20 rounded-full"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <QuestionHelper v-bind="h.alternateName">
                  <PeoplePicker
                    v-model="alt.fullName"
                    :id="alternateNameInputId(index)"
                    :name="`alternateExecutorName${index}`"
                    :exclude-names="alternateExcludeNames(index)"
                    label="Full Name"
                    :input-class="alternateNameInputClass(alt)"
                    :aria-invalid="hasAlternateError(alt.uiKey, 'fullName')"
                    :aria-describedby="hasAlternateError(alt.uiKey, 'fullName') ? alternateNameErrorId(alt.uiKey) : undefined"
                    @blur="markAlternateTouched(alt.uiKey, 'fullName')"
                  />
                </QuestionHelper>
                <p
                  v-if="hasAlternateError(alt.uiKey, 'fullName')"
                  :id="alternateNameErrorId(alt.uiKey)"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ getAlternateError(alt.uiKey, 'fullName') }}
                </p>
              </div>
              <div>
                <QuestionHelper v-bind="h.alternateRelationship">
                  <select
                    v-model="alt.relationship"
                    :id="alternateRelationshipInputId(index)"
                    class="input-modern"
                    :class="{ 'border-red-500 focus:border-red-500': hasAlternateError(alt.uiKey, 'relationship') }"
                    :aria-invalid="hasAlternateError(alt.uiKey, 'relationship')"
                    :aria-describedby="hasAlternateError(alt.uiKey, 'relationship') ? alternateRelationshipErrorId(alt.uiKey) : undefined"
                    @blur="markAlternateTouched(alt.uiKey, 'relationship')"
                  >
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Relative">Relative</option>
                    <option value="Friend">Friend</option>
                    <option value="Professional">Professional (Lawyer/Trust Co)</option>
                  </select>
                </QuestionHelper>
                <p
                  v-if="hasAlternateError(alt.uiKey, 'relationship')"
                  :id="alternateRelationshipErrorId(alt.uiKey)"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ getAlternateError(alt.uiKey, 'relationship') }}
                </p>
              </div>
            </div>
          </div>
        </transition-group>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 class="text-xl font-semibold mb-4 text-purple-400">Administrative Preferences</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <QuestionHelper v-bind="h.compensation">
              <select
                v-model="form.compensation"
                :id="h.compensation.inputId"
                class="input-modern mb-2"
              >
                <option value="guidelines">Standard Court Guidelines (~5%)</option>
                <option value="gratis">Gratis (Work for free)</option>
                <option value="specific">Specific Amount / Terms</option>
              </select>
            </QuestionHelper>
            <div v-if="form.compensation === 'specific'">
              <QuestionHelper
                v-bind="h.compensationDetails"
                :currentValue="form.compensationDetails"
                @use-legal="form.compensationDetails = $event"
              >
                <input
                  v-model="form.compensationDetails"
                  :id="h.compensationDetails.inputId"
                  name="executorCompensationDetails"
                  type="text"
                  class="input-modern"
                  :class="{ 'border-red-500 focus:border-red-500': hasCompensationDetailsError }"
                  :aria-invalid="hasCompensationDetailsError"
                  :aria-describedby="hasCompensationDetailsError ? compensationDetailsErrorId : undefined"
                  placeholder="e.g. $5,000 flat fee"
                  @blur="touched.compensationDetails = true"
                />
              </QuestionHelper>
              <p
                v-if="hasCompensationDetailsError"
                :id="compensationDetailsErrorId"
                class="mt-1 text-xs text-red-400"
                aria-live="polite"
              >
                {{ fieldErrors.compensationDetails }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import PeoplePicker from '../../components/PeoplePicker.vue';
import QuestionHelper from '../../components/QuestionHelper.vue';
import SkeletonLoader from '../../components/common/SkeletonLoader.vue';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import {
  createEmptyAlternateExecutor,
  createEmptyExecutorsForm,
  getExecutorsValidationResult,
  getSpouseExecutorCandidate,
  normalizeComparableName,
  normalizeExecutorsData,
  normalizeText,
  serializeExecutorsData,
  type ExecutorFieldErrors,
  type ExecutorFormRow,
  type ExecutorRowField,
  type ExecutorsFormData,
} from '../../utils/executors';
import { willsHelpers } from '../../utils/willsFieldHelpers';

const h = willsHelpers.executors;
const store = useIntakeStore();
const { showToast } = useToast();

type AlternateTouchedMap = Record<string, Partial<Record<ExecutorRowField, boolean>>>;

const primaryNameErrorId = 'executors-primary-name-error';
const compensationDetailsErrorId = 'executors-compensation-details-error';

const form = ref<ExecutorsFormData>(createEmptyExecutorsForm());
const fieldErrors = ref<ExecutorFieldErrors>({ alternates: {} });
const touched = ref<{
  primaryFullName: boolean;
  compensationDetails: boolean;
  alternates: AlternateTouchedMap;
}>({
  primaryFullName: false,
  compensationDetails: false,
  alternates: {},
});
const isSaving = computed(() => store.isSaving);

const executorsPayload = computed(() => ({
  executors: serializeExecutorsData(form.value),
  _draftExecutors: normalizeExecutorsData(form.value),
}) as any);

const { scheduleSave, commitStep, markInitialized, hasPendingChanges } = useWizardStepSave(() => executorsPayload.value);

const primaryExcludeNames = computed(() =>
  [
    store.intakeData.personalProfile?.fullName || '',
    ...form.value.alternates.map((alternate) => alternate.fullName || ''),
  ].filter(Boolean)
);

const spouseCandidate = computed(() => getSpouseExecutorCandidate(store.intakeData.family));
const canQuickFillSpouse = computed(() => !!spouseCandidate.value);

const primaryInputClass = computed(() => [
  'input-modern',
  hasPrimaryNameError.value ? 'border-red-500 focus:border-red-500' : '',
]);

const hasPrimaryNameError = computed(() =>
  touched.value.primaryFullName && !!fieldErrors.value.primaryFullName
);

const hasCompensationDetailsError = computed(() =>
  touched.value.compensationDetails && !!fieldErrors.value.compensationDetails
);

const alternateNameInputId = (index: number) => `${h.alternateName.inputId}-${index}`;
const alternateRelationshipInputId = (index: number) => `${h.alternateRelationship.inputId}-${index}`;
const alternateNameErrorId = (uiKey: string) => `${uiKey}-alternate-name-error`;
const alternateRelationshipErrorId = (uiKey: string) => `${uiKey}-alternate-relationship-error`;

const normalizeComparisonName = (value?: string | null) => normalizeComparableName(value);

const alternateExcludeNames = (index: number) => {
  const clientName = store.intakeData.personalProfile?.fullName || '';
  const primaryName = form.value.primary.fullName || '';
  const otherAlternates = form.value.alternates
    .filter((_, alternateIndex) => alternateIndex !== index)
    .map((alternate) => alternate.fullName || '');

  return [clientName, primaryName, ...otherAlternates].filter(Boolean);
};

const getAlternateError = (uiKey: string, field: ExecutorRowField) =>
  fieldErrors.value.alternates[uiKey]?.[field] || '';

const hasAlternateError = (uiKey: string, field: ExecutorRowField) =>
  !!touched.value.alternates[uiKey]?.[field] && !!fieldErrors.value.alternates[uiKey]?.[field];

const alternateNameInputClass = (alternate: ExecutorFormRow) => [
  'input-modern',
  hasAlternateError(alternate.uiKey, 'fullName') ? 'border-red-500 focus:border-red-500' : '',
];

const markAlternateTouched = (uiKey: string, field: ExecutorRowField) => {
  touched.value.alternates[uiKey] = {
    ...touched.value.alternates[uiKey],
    [field]: true,
  };
};

const focusFirstError = (target: ReturnType<typeof getExecutorsValidationResult>['firstTarget']) => {
  if (!target) return;

  let targetId: string | null = null;

  if (target.type === 'primaryFullName') {
    targetId = 'primary-executor-name';
  } else if (target.type === 'compensationDetails') {
    targetId = h.compensationDetails.inputId;
  } else if (target.type === 'alternate') {
    const index = form.value.alternates.findIndex((alternate) => alternate.uiKey === target.uiKey);
    if (index !== -1) {
      targetId = target.field === 'fullName'
        ? alternateNameInputId(index)
        : alternateRelationshipInputId(index);
    }
  }

  if (!targetId) return;

  const element = document.getElementById(targetId) as HTMLElement | null;
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (typeof (element as any)?.focus === 'function') {
    (element as any).focus();
  }
};

const applyValidationState = (markAllTouched = false) => {
  const validation = getExecutorsValidationResult(form.value, {
    clientFullName: store.intakeData.personalProfile?.fullName,
  });

  fieldErrors.value = validation.errors;

  if (markAllTouched) {
    touched.value.primaryFullName = true;
    if (form.value.compensation === 'specific') {
      touched.value.compensationDetails = true;
    }

    touched.value.alternates = form.value.alternates.reduce((acc, alternate) => {
      acc[alternate.uiKey] = {
        fullName: true,
        relationship: true,
      };
      return acc;
    }, {} as AlternateTouchedMap);
  }

  return validation;
};

const validateLocal = () => {
  const validation = applyValidationState(true);
  if (!validation.isValid) {
    focusFirstError(validation.firstTarget);
    return validation.message;
  }

  return null;
};

watch(() => form.value.compensation, (compensation) => {
  if (compensation !== 'specific' && form.value.compensationDetails) {
    form.value.compensationDetails = '';
    fieldErrors.value.compensationDetails = undefined;
    touched.value.compensationDetails = false;
  }
});

watch(form, () => {
  applyValidationState(false);
  scheduleSave();
}, { deep: true });

onMounted(async () => {
  if (!store.isInitialized) {
    await store.fetchIntake();
  }

  form.value = normalizeExecutorsData((store.intakeData as any)._draftExecutors ?? store.intakeData.executors);
  store.stageIntakeStep(executorsPayload.value as any);
  applyValidationState(false);
  markInitialized();
});

const addAlternate = () => {
  form.value.alternates.push(createEmptyAlternateExecutor());
};

const removeAlternate = (index: number) => {
  const [removed] = form.value.alternates.splice(index, 1);
  if (!removed) return;

  delete touched.value.alternates[removed.uiKey];
  delete fieldErrors.value.alternates[removed.uiKey];
};

const smartFillSpouse = () => {
  const spouseName = spouseCandidate.value;
  if (!spouseName) {
    showToast('No spouse or partner name is available from the Family section yet.', 'warning');
    return;
  }

  const existingPrimary = normalizeText(form.value.primary.fullName);
  if (existingPrimary && normalizeComparisonName(existingPrimary) !== normalizeComparisonName(spouseName)) {
    const confirmed = window.confirm(`Replace "${existingPrimary}" with "${spouseName}" as the primary executor?`);
    if (!confirmed) {
      return;
    }
  }

  form.value.primary.fullName = spouseName;
  form.value.primary.relationship = 'Spouse';
  touched.value.primaryFullName = true;
};

defineExpose({
  commitStep,
  hasPendingChanges,
  validateLocal,
});
</script>
