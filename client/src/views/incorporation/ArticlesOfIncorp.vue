<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="5" :rows="2" />
  <div v-else role="region" aria-label="Articles of Incorporation">
    <div>
      <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Articles of Incorporation</h2>
      <p class="text-gray-400 mb-8">Draft the Articles of Incorporation for filing with the registry.</p>

      <div class="space-y-6">
        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Corporate Name</label>
          <FieldHelper v-bind="h.corporateName" class="mb-2" />
          <input
            v-model="localData.corporateName"
            class="input-modern w-full"
            :placeholder="isNumbered ? 'Will be assigned by registry' : 'Full corporate name including legal ending'"
            :disabled="isNumbered"
            @input="handleCorporateNameInput(localData.corporateName)"
          />
          <p v-if="corporateNameError" class="text-amber-400 text-xs mt-1">{{ corporateNameError }}</p>
          <p
            v-if="showCorporateNameSuggestion"
            class="text-xs text-amber-400 mt-1"
          >
            Suggested from Step 1:
            <button type="button" class="underline" @click="acceptCorporateNameSuggestion">
              {{ autoPopulatedName }}
            </button>
          </p>
        </div>

        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Full Registered Office Address</label>
          <FieldHelper v-bind="h.registeredAddress" class="mb-2" />
          <input
            v-model="localData.registeredAddress"
            class="input-modern w-full"
            :class="registeredAddressError ? 'border-red-500/60' : ''"
            placeholder="Street address (P.O. Box not acceptable)"
            @input="handleRegisteredAddressInput(localData.registeredAddress)"
          />
          <p v-if="registeredAddressError" class="text-red-400 text-xs mt-1">{{ registeredAddressError }}</p>
          <p
            v-if="showRegisteredAddressSuggestion"
            class="text-xs text-amber-400 mt-1"
          >
            Synced from Step 2:
            <button type="button" class="underline" @click="acceptRegisteredAddressSuggestion">
              {{ syncedAddress }}
            </button>
          </p>
        </div>

        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Number of Directors <span class="text-red-400">*</span></label>
          <FieldHelper v-bind="h.directorCountType" class="mb-3" />
          <div class="flex gap-4 mb-4">
            <button
              type="button"
              @click="localData.directorCountType = 'fixed'"
              class="flex-1 py-2 rounded-lg border transition-all text-center text-sm"
              :class="localData.directorCountType === 'fixed' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800/40 border-gray-700 text-gray-400'"
            >
              Fixed Number
            </button>
            <button
              type="button"
              @click="localData.directorCountType = 'range'"
              class="flex-1 py-2 rounded-lg border transition-all text-center text-sm"
              :class="localData.directorCountType === 'range' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800/40 border-gray-700 text-gray-400'"
            >
              Min/Max Range
            </button>
          </div>

          <FieldHelper v-if="localData.directorCountType" v-bind="h.directorFixedRange" class="mb-3" />

          <div v-if="localData.directorCountType === 'fixed'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Fixed Count</label>
              <input
                v-model.number="localData.directorCountFixed"
                type="number"
                min="1"
                step="1"
                class="input-modern w-full"
              />
            </div>
          </div>

          <div v-if="localData.directorCountType === 'range'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Minimum</label>
              <input
                v-model.number="localData.directorCountMin"
                type="number"
                min="1"
                step="1"
                class="input-modern w-full"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Maximum</label>
              <input
                v-model.number="localData.directorCountMax"
                type="number"
                min="1"
                step="1"
                class="input-modern w-full"
              />
            </div>
          </div>

          <p v-if="directorCountError" class="text-red-400 text-xs mt-3">{{ directorCountError }}</p>
        </div>

        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">
            Authorized Share Capital <span class="text-red-400">*</span>
          </label>
          <FieldHelper v-bind="h.shareCapitalDescription" class="mb-2" />
          <textarea
            v-model="localData.shareCapitalDescription"
            class="input-modern w-full min-h-[120px]"
            :class="shareCapitalError ? 'border-amber-500/40' : ''"
            placeholder="Describe each class and the rights, privileges, restrictions, and conditions attaching to each..."
            maxlength="5000"
          />
          <div class="flex justify-between items-center mt-1">
            <p v-if="shareCapitalError" class="text-amber-400 text-xs">{{ shareCapitalError }}</p>
            <p class="text-xs text-gray-600 ml-auto">{{ localData.shareCapitalDescription.length }} / 5000</p>
          </div>
        </div>

        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Share Transfer Restrictions</label>
          <FieldHelper v-bind="h.transferRestrictions" class="mb-2" />
          <textarea
            v-model="localData.transferRestrictions"
            class="input-modern w-full"
            placeholder="Required for closely-held / private corporations..."
            maxlength="3000"
          />
          <p class="text-xs text-gray-600 text-right mt-1">{{ localData.transferRestrictions.length }} / 3000</p>
        </div>

        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Business Restrictions</label>
          <FieldHelper v-bind="h.businessRestrictions" class="mb-2" />
          <input
            v-model="localData.businessRestrictions"
            class="input-modern w-full"
            placeholder="Restrictions on business activities (or 'None')"
            maxlength="1000"
          />
          <p class="text-xs text-gray-600 text-right mt-1">{{ localData.businessRestrictions.length }} / 1000</p>
        </div>

        <div class="card-glass p-6 rounded-xl">
          <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Other Provisions</label>
          <FieldHelper v-bind="h.otherProvisions" class="mb-2" />
          <textarea
            v-model="localData.otherProvisions"
            class="input-modern w-full"
            placeholder="Borrowing powers, indemnification, pre-emptive rights, etc."
            maxlength="3000"
          />
          <p class="text-xs text-gray-600 text-right mt-1">{{ localData.otherProvisions.length }} / 3000</p>
        </div>

        <div class="card-glass p-6 rounded-xl border-l-4 border-l-emerald-500">
          <h3 class="text-lg font-semibold text-gray-100 mb-1">Filing Status</h3>
          <FieldHelper v-bind="h.filingFeeCert" class="mb-4" />
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="localData.filingFeePaid" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300 text-sm">Government filing fee paid</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="localData.certificateReceived" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300 text-sm">Certificate of Incorporation received</span>
            </label>
            <div v-if="localData.certificateReceived" class="ml-7 space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Corporation Number</label>
                <input v-model="localData.corporationNumber" class="input-modern w-full" placeholder="Assigned corporation number" />
                <p v-if="certificateNumberError" class="text-red-400 text-xs mt-1">{{ certificateNumberError }}</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Certificate Date</label>
                <input
                  v-model="localData.certificateDate"
                  type="date"
                  class="input-modern w-full"
                  :max="todayISO"
                />
                <p v-if="certificateDateError" class="text-red-400 text-xs mt-1">{{ certificateDateError }}</p>
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-xs text-gray-500 mb-2">Filing Method</label>
              <div v-if="resolvedFilingMethod" class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-gray-200">
                {{ filingMethodLabel }}
              </div>
              <p v-else class="text-amber-400 text-xs">Select a jurisdiction in Step 1 to determine the filing method.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import IncorpStepSkeleton from '../../components/incorporation/IncorpStepSkeleton.vue';
import FieldHelper from '../../components/incorporation/FieldHelper.vue';
import { useIncorpStepSave } from '../../composables/useIncorpStepSave';
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import { incorpHelpers } from '../../utils/incorpFieldHelpers';
import {
    createEmptyArticlesDraft,
    getArticlesSuggestions,
    getLocalTodayISO,
    hydrateArticlesDraft,
    serializeArticlesDraft,
    textsMatch,
} from '../../utils/incorpArticles';
import {
    isFutureDate,
    isPoBoxAddress,
    normalizeText,
    validateIncorpSection,
} from '../../utils/incorpRules';

const h = incorpHelpers.articles;
const store = useIncorpIntakeStore();

const isLoading = ref(true);
const localData = reactive(createEmptyArticlesDraft());

const jurisdiction = computed(() => store.incorpData.preIncorporation?.jurisdiction || '');
const isNumbered = computed(() => store.incorpData.preIncorporation?.nameType === 'numbered');
const todayISO = computed(() => getLocalTodayISO());

const articleSuggestions = computed(() => getArticlesSuggestions(store.incorpData));
const autoPopulatedName = computed(() => articleSuggestions.value.corporateNameSuggestion);
const syncedAddress = computed(() => articleSuggestions.value.registeredAddressSuggestion);

const resolvedFilingMethod = computed(() =>
    jurisdiction.value === 'obca'
        ? 'obr'
        : jurisdiction.value === 'cbca'
            ? 'corporations_canada'
            : undefined
);

const filingMethodLabel = computed(() =>
    resolvedFilingMethod.value === 'obr'
        ? 'Ontario Business Registry'
        : resolvedFilingMethod.value === 'corporations_canada'
            ? 'Corporations Canada'
            : ''
);

const currentDirectorCount = computed(() =>
    (store.incorpData.structureOwnership?.directors || [])
        .filter((director) => !!normalizeText(director.fullName))
        .length
);

const corporateNameError = computed(() => {
    if (isNumbered.value) return null;
    if (!normalizeText(localData.corporateName)) {
        return 'Corporate name is required for named corporations.';
    }
    return null;
});

const isPOBox = computed(() => isPoBoxAddress(localData.registeredAddress));

const registeredAddressError = computed(() => {
    if (!normalizeText(localData.registeredAddress)) {
        return 'The full registered office address is required in the Articles.';
    }
    if (isPOBox.value) {
        return 'P.O. Box addresses are not acceptable for the registered office.';
    }
    return null;
});

const directorCountError = computed(() => {
    if (!localData.directorCountType) {
        return 'Please specify how the number of directors is determined (fixed or range).';
    }

    if (localData.directorCountType === 'fixed') {
        if (!Number.isInteger(localData.directorCountFixed) || Number(localData.directorCountFixed) <= 0) {
            return 'Enter a valid fixed number of directors.';
        }
        if (
            currentDirectorCount.value > 0
            && Number(localData.directorCountFixed) !== currentDirectorCount.value
        ) {
            return `Articles director count must match the ${currentDirectorCount.value} director(s) listed in Structure & Ownership.`;
        }
        return null;
    }

    if (
        !Number.isInteger(localData.directorCountMin)
        || Number(localData.directorCountMin) <= 0
        || !Number.isInteger(localData.directorCountMax)
        || Number(localData.directorCountMax) <= 0
    ) {
        return 'Enter both a minimum and maximum director count.';
    }

    if (Number(localData.directorCountMax) < Number(localData.directorCountMin)) {
        return 'Director count maximum must be greater than or equal to minimum.';
    }

    if (
        currentDirectorCount.value > 0
        && (
            currentDirectorCount.value < Number(localData.directorCountMin)
            || currentDirectorCount.value > Number(localData.directorCountMax)
        )
    ) {
        return `Articles director range must include the ${currentDirectorCount.value} director(s) listed in Structure & Ownership.`;
    }

    return null;
});

const shareCapitalError = computed(() =>
    normalizeText(localData.shareCapitalDescription)
        ? null
        : 'Authorized share capital description is required for Articles of Incorporation.'
);

const certificateNumberError = computed(() => {
    if (!localData.certificateReceived) return null;
    if (!normalizeText(localData.corporationNumber)) {
        return 'Corporation number is required once the certificate is received.';
    }
    return null;
});

const certificateDateError = computed(() => {
    if (!localData.certificateReceived) return null;
    if (!localData.certificateDate) {
        return 'Certificate date is required once the certificate is received.';
    }
    if (isFutureDate(localData.certificateDate)) {
        return 'Certificate date cannot be in the future.';
    }
    return null;
});

const showCorporateNameSuggestion = computed(() =>
    !isNumbered.value
    && !!autoPopulatedName.value
    && !textsMatch(localData.corporateName, autoPopulatedName.value)
);

const showRegisteredAddressSuggestion = computed(() =>
    !!syncedAddress.value
    && !textsMatch(localData.registeredAddress, syncedAddress.value)
);

const serializedArticles = computed(() => serializeArticlesDraft(localData, {
    isNumbered: isNumbered.value,
    filingMethod: resolvedFilingMethod.value,
}));

const buildStepData = () => ({
    articles: serializedArticles.value,
});

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

const assignDraft = () => {
    Object.assign(localData, createEmptyArticlesDraft(), hydrateArticlesDraft(store.incorpData));
};

const acceptCorporateNameSuggestion = () => {
    localData.corporateName = autoPopulatedName.value;
    localData.corporateNameOverridden = false;
    localData.lastAcceptedCorporateNameSuggestion = autoPopulatedName.value;
};

const acceptRegisteredAddressSuggestion = () => {
    localData.registeredAddress = syncedAddress.value;
    localData.registeredAddressOverridden = false;
    localData.lastAcceptedRegisteredAddressSuggestion = syncedAddress.value;
};

const handleCorporateNameInput = (value: string) => {
    if (!normalizeText(value) || textsMatch(value, autoPopulatedName.value)) {
        localData.corporateNameOverridden = false;
        localData.lastAcceptedCorporateNameSuggestion = autoPopulatedName.value;
        return;
    }

    localData.corporateNameOverridden = true;
};

const handleRegisteredAddressInput = (value: string) => {
    if (!normalizeText(value) || textsMatch(value, syncedAddress.value)) {
        localData.registeredAddressOverridden = false;
        localData.lastAcceptedRegisteredAddressSuggestion = syncedAddress.value;
        return;
    }

    localData.registeredAddressOverridden = true;
};

const validateLocal = () => validateIncorpSection('articles', {
    ...store.incorpData,
    articles: serializedArticles.value,
} as any);

onMounted(() => {
    assignDraft();
    isLoading.value = false;
    markInitialized();
});

watch(
    [autoPopulatedName, isNumbered],
    ([suggestion, numbered]) => {
        if (numbered) return;

        if (
            !normalizeText(localData.corporateName)
            || textsMatch(localData.corporateName, localData.lastAcceptedCorporateNameSuggestion)
        ) {
            localData.corporateName = suggestion;
            localData.corporateNameOverridden = false;
            localData.lastAcceptedCorporateNameSuggestion = suggestion;
        }
    }
);

watch(syncedAddress, (suggestion) => {
    if (
        !normalizeText(localData.registeredAddress)
        || textsMatch(localData.registeredAddress, localData.lastAcceptedRegisteredAddressSuggestion)
    ) {
        localData.registeredAddress = suggestion;
        localData.registeredAddressOverridden = false;
        localData.lastAcceptedRegisteredAddressSuggestion = suggestion;
    }
});

watch(serializedArticles, () => {
    scheduleSave();
}, { deep: true });

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
