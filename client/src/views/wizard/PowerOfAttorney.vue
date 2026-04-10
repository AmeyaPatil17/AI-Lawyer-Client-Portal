<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Power of Attorney</h2>
    <p class="text-gray-400 mb-8">
      Designate who will make decisions for you if you become incapacitated. You need separate attorneys for
      <strong>Property</strong> (financials) and <strong>Personal Care</strong> (health).
    </p>

    <div class="space-y-12">
      <section class="space-y-6">
        <div class="flex items-center space-x-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">1</div>
          <h3 class="text-xl font-semibold text-white">Power of Attorney for Property</h3>
        </div>

        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p class="text-sm text-gray-400 mb-4">Who will manage your finances and property if you cannot?</p>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2 text-blue-300">Primary Attorney</label>
            <div class="bg-gray-900 p-4 rounded-lg border border-gray-600">
              <QuestionHelper v-bind="h.primaryNameProp" :currentValue="form.property.primaryName">
                <PeoplePicker
                  v-model="form.property.primaryName"
                  :id="h.primaryNameProp.inputId"
                  placeholder="Full Name of Attorney"
                  inputClass="input-modern mb-3"
                  :excludeNames="propertyPrimaryExcludedNames"
                />
              </QuestionHelper>
              <QuestionHelper v-bind="h.primaryRelProp">
                <select v-model="relationshipUi.propertyPrimary.mode" :id="h.primaryRelProp.inputId" class="input-modern">
                  <option value="">Select Relationship</option>
                  <option v-for="option in relationshipOptions" :key="option" :value="option">{{ option }}</option>
                  <option value="Other">Other</option>
                </select>
              </QuestionHelper>
              <input
                v-if="relationshipUi.propertyPrimary.mode === 'Other'"
                v-model="relationshipUi.propertyPrimary.other"
                :id="`${h.primaryRelProp.inputId}-other`"
                class="input-modern mt-3"
                placeholder="Describe relationship"
              />
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2 text-gray-400">Alternate Attorney</label>
            <div class="bg-gray-900 p-4 rounded-lg border border-gray-600">
              <p class="text-xs text-gray-500 mb-2">If the primary attorney cannot act:</p>
              <QuestionHelper v-bind="h.alternateNameProp">
                <PeoplePicker
                  v-model="form.property.alternateName"
                  :id="h.alternateNameProp.inputId"
                  placeholder="Full Name of Alternate"
                  inputClass="input-modern mb-3"
                  :excludeNames="propertyAlternateExcludedNames"
                />
              </QuestionHelper>
              <QuestionHelper v-bind="h.alternateRelProp">
                <select v-model="relationshipUi.propertyAlternate.mode" :id="h.alternateRelProp.inputId" class="input-modern">
                  <option value="">Select Relationship</option>
                  <option v-for="option in relationshipOptions" :key="option" :value="option">{{ option }}</option>
                  <option value="Other">Other</option>
                </select>
              </QuestionHelper>
              <input
                v-if="relationshipUi.propertyAlternate.mode === 'Other'"
                v-model="relationshipUi.propertyAlternate.other"
                :id="`${h.alternateRelProp.inputId}-other`"
                class="input-modern mt-3"
                placeholder="Describe relationship"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <div class="flex items-center space-x-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">2</div>
          <h3 class="text-xl font-semibold text-white">Power of Attorney for Personal Care</h3>
        </div>

        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p class="text-sm text-gray-400 mb-4">Who will make healthcare and medical decisions if you cannot?</p>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2 text-green-300">Primary Attorney</label>
            <div class="bg-gray-900 p-4 rounded-lg border border-gray-600">
              <div class="flex justify-end mb-2">
                <button
                  type="button"
                  @click="copyFromProperty"
                  class="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Copy Property Primary
                </button>
              </div>
              <QuestionHelper v-bind="h.primaryNameCare" :currentValue="form.personalCare.primaryName">
                <PeoplePicker
                  v-model="form.personalCare.primaryName"
                  :id="h.primaryNameCare.inputId"
                  placeholder="Full Name of Attorney"
                  inputClass="input-modern mb-3"
                  :excludeNames="personalCarePrimaryExcludedNames"
                />
              </QuestionHelper>
              <QuestionHelper v-bind="h.primaryRelCare">
                <select v-model="relationshipUi.personalCarePrimary.mode" :id="h.primaryRelCare.inputId" class="input-modern">
                  <option value="">Select Relationship</option>
                  <option v-for="option in relationshipOptions" :key="option" :value="option">{{ option }}</option>
                  <option value="Other">Other</option>
                </select>
              </QuestionHelper>
              <input
                v-if="relationshipUi.personalCarePrimary.mode === 'Other'"
                v-model="relationshipUi.personalCarePrimary.other"
                :id="`${h.primaryRelCare.inputId}-other`"
                class="input-modern mt-3"
                placeholder="Describe relationship"
              />
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2 text-gray-400">Alternate Attorney</label>
            <div class="bg-gray-900 p-4 rounded-lg border border-gray-600">
              <QuestionHelper v-bind="h.alternateNameCare">
                <PeoplePicker
                  v-model="form.personalCare.alternateName"
                  :id="h.alternateNameCare.inputId"
                  placeholder="Full Name of Alternate"
                  inputClass="input-modern mb-3"
                  :excludeNames="personalCareAlternateExcludedNames"
                />
              </QuestionHelper>
              <QuestionHelper v-bind="h.alternateRelCare">
                <select v-model="relationshipUi.personalCareAlternate.mode" :id="h.alternateRelCare.inputId" class="input-modern">
                  <option value="">Select Relationship</option>
                  <option v-for="option in relationshipOptions" :key="option" :value="option">{{ option }}</option>
                  <option value="Other">Other</option>
                </select>
              </QuestionHelper>
              <input
                v-if="relationshipUi.personalCareAlternate.mode === 'Other'"
                v-model="relationshipUi.personalCareAlternate.other"
                :id="`${h.alternateRelCare.inputId}-other`"
                class="input-modern mt-3"
                placeholder="Describe relationship"
              />
            </div>
          </div>

          <div class="mt-6 border-t border-gray-700 pt-6">
            <p class="text-xs text-gray-500 mb-2">Specific wishes regarding life support, treatments, and end-of-life care.</p>
            <QuestionHelper
              v-bind="h.healthInstructions"
              :currentValue="form.personalCare.healthInstructions"
              @use-legal="form.personalCare.healthInstructions = $event"
            >
              <textarea
                v-model="form.personalCare.healthInstructions"
                :id="h.healthInstructions.inputId"
                class="input-modern w-full h-32"
                placeholder="e.g. No heroic measures, palliative care only..."
              ></textarea>
            </QuestionHelper>
            <div class="mt-2 flex gap-4">
              <QuestionHelper v-bind="h.hasLivingWill">
                <label class="flex items-center space-x-2 text-sm text-gray-300">
                  <input
                    v-model="form.personalCare.hasLivingWill"
                    type="checkbox"
                    :id="h.hasLivingWill.inputId"
                    class="rounded bg-gray-700 border-gray-600"
                  />
                  <span>Include "Living Will" clause</span>
                </label>
              </QuestionHelper>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PeoplePicker from '../../components/PeoplePicker.vue';
import QuestionHelper from '../../components/QuestionHelper.vue';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import { useIntakeStore } from '../../stores/intake';
import { willsHelpers } from '../../utils/willsFieldHelpers';
import {
  POA_RELATIONSHIP_OPTIONS,
  getPoaRelationshipModel,
  getPoaValidationError,
  normalizePoaData,
  normalizePoaText,
  serializePoaData,
  type PoaFormData,
} from '../../utils/poa';

type RelationshipUiKey =
  | 'propertyPrimary'
  | 'propertyAlternate'
  | 'personalCarePrimary'
  | 'personalCareAlternate';

const store = useIntakeStore();
const { showToast } = useToast();
const h = willsHelpers.poa;
const relationshipOptions = [...POA_RELATIONSHIP_OPTIONS];

const form = ref<PoaFormData>(normalizePoaData());
const relationshipUi = ref<Record<RelationshipUiKey, { mode: string; other: string }>>({
  propertyPrimary: { mode: '', other: '' },
  propertyAlternate: { mode: '', other: '' },
  personalCarePrimary: { mode: '', other: '' },
  personalCareAlternate: { mode: '', other: '' },
});

const poaPayload = computed(() => ({
  poa: serializePoaData(form.value),
}));
const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(() => poaPayload.value);

const creatorName = computed(() => {
  const fullName = normalizePoaText(store.intakeData.personalProfile?.fullName);
  return fullName ? [fullName] : [];
});

const buildExcludeNames = (...values: Array<string | undefined>) =>
  Array.from(new Set(values.map((value) => normalizePoaText(value)).filter(Boolean)));

const propertyPrimaryExcludedNames = computed(() =>
  buildExcludeNames(...creatorName.value, form.value.property.alternateName),
);
const propertyAlternateExcludedNames = computed(() =>
  buildExcludeNames(...creatorName.value, form.value.property.primaryName),
);
const personalCarePrimaryExcludedNames = computed(() =>
  buildExcludeNames(...creatorName.value, form.value.personalCare.alternateName),
);
const personalCareAlternateExcludedNames = computed(() =>
  buildExcludeNames(...creatorName.value, form.value.personalCare.primaryName),
);

const syncRelationshipUi = (key: RelationshipUiKey, value: string) => {
  const next = getPoaRelationshipModel(value);
  if (relationshipUi.value[key].mode !== next.selectValue) {
    relationshipUi.value[key].mode = next.selectValue;
  }
  if (relationshipUi.value[key].other !== next.otherValue) {
    relationshipUi.value[key].other = next.otherValue;
  }
};

const bindRelationshipUi = (
  key: RelationshipUiKey,
  read: () => string,
  write: (value: string) => void,
) => {
  syncRelationshipUi(key, read());

  watch(read, (value) => {
    syncRelationshipUi(key, value);
  });

  watch(
    () => [relationshipUi.value[key].mode, relationshipUi.value[key].other],
    () => {
      const state = relationshipUi.value[key];
      const nextValue = state.mode === 'Other' ? state.other : state.mode;
      if (read() !== nextValue) {
        write(nextValue);
      }
    },
    { deep: true },
  );
};

bindRelationshipUi(
  'propertyPrimary',
  () => form.value.property.primaryRelationship,
  (value) => {
    form.value.property.primaryRelationship = value;
  },
);

bindRelationshipUi(
  'propertyAlternate',
  () => form.value.property.alternateRelationship,
  (value) => {
    form.value.property.alternateRelationship = value;
  },
);

bindRelationshipUi(
  'personalCarePrimary',
  () => form.value.personalCare.primaryRelationship,
  (value) => {
    form.value.personalCare.primaryRelationship = value;
  },
);

bindRelationshipUi(
  'personalCareAlternate',
  () => form.value.personalCare.alternateRelationship,
  (value) => {
    form.value.personalCare.alternateRelationship = value;
  },
);

onMounted(async () => {
  if (!store.isInitialized) {
    await store.fetchIntake();
  }

  form.value = normalizePoaData(store.intakeData.poa);
  markInitialized();
});

watch(form, () => {
  scheduleSave();
}, { deep: true });

const copyFromProperty = () => {
  const propertyPrimaryName = normalizePoaText(form.value.property.primaryName);
  const propertyPrimaryRelationship = normalizePoaText(form.value.property.primaryRelationship);

  if (!propertyPrimaryName) {
    showToast('Choose a Property Attorney before copying this appointment.', 'warning');
    return;
  }

  const existingName = normalizePoaText(form.value.personalCare.primaryName);
  const existingRelationship = normalizePoaText(form.value.personalCare.primaryRelationship);
  const willOverwrite =
    (!!existingName || !!existingRelationship) &&
    (existingName !== propertyPrimaryName || existingRelationship !== propertyPrimaryRelationship);

  if (willOverwrite && !window.confirm('Replace the current Personal Care primary attorney with the Property primary attorney?')) {
    return;
  }

  form.value.personalCare.primaryName = propertyPrimaryName;
  form.value.personalCare.primaryRelationship = propertyPrimaryRelationship;
};

const validateLocal = () => {
  const error = getPoaValidationError(form.value, {
    clientFullName: store.intakeData.personalProfile?.fullName,
  });

  if (error) {
    showToast(error, 'warning');
  }

  return error;
};

defineExpose({
  commitStep,
  hasPendingChanges,
  validateLocal,
});
</script>
