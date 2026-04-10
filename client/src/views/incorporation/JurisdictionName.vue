<template>
  <div v-if="isLoading" class="space-y-6 animate-pulse">
    <div class="h-8 w-64 rounded-lg bg-gray-700/60"></div>
    <div class="mb-8 h-4 w-96 rounded bg-gray-700/40"></div>
    <div v-for="n in 4" :key="n" class="card-glass rounded-xl p-6">
      <div class="mb-4 h-4 w-32 rounded bg-gray-700/60"></div>
      <div class="flex gap-4">
        <div class="h-12 flex-1 rounded-lg bg-gray-700/40"></div>
        <div class="h-12 flex-1 rounded-lg bg-gray-700/40"></div>
      </div>
    </div>
  </div>

  <div v-else role="region" aria-label="Jurisdiction &amp; Name Planning">
    <h2 class="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-3xl font-bold text-transparent">Jurisdiction &amp; Name Planning</h2>
    <p class="mb-8 text-gray-400">Confirm the incorporation jurisdiction and corporate name details.</p>

    <div class="space-y-6">
      <div class="card-glass rounded-xl p-6">
        <label class="mb-1 block text-sm font-bold uppercase tracking-wider text-gray-400">Incorporation Jurisdiction</label>
        <FieldHelper v-bind="h.jurisdiction" class="mb-3" />
        <div class="flex gap-4">
          <button
            id="jurisdiction-obca"
            type="button"
            class="flex-1 rounded-lg border py-3 text-center transition-all"
            :class="localData.jurisdiction === 'obca' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500'"
            :aria-pressed="localData.jurisdiction === 'obca'"
            @click="setJurisdiction('obca')"
          >
            Ontario (OBCA)
          </button>
          <button
            id="jurisdiction-cbca"
            type="button"
            class="flex-1 rounded-lg border py-3 text-center transition-all"
            :class="localData.jurisdiction === 'cbca' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500'"
            :aria-pressed="localData.jurisdiction === 'cbca'"
            @click="setJurisdiction('cbca')"
          >
            Federal (CBCA)
          </button>
        </div>
        <p v-if="errors.jurisdiction" class="mt-2 text-xs text-red-400" role="alert">{{ errors.jurisdiction }}</p>
      </div>

      <div class="card-glass rounded-xl p-6">
        <label class="mb-1 block text-sm font-bold uppercase tracking-wider text-gray-400">Corporation Name Type</label>
        <FieldHelper v-bind="h.nameType" class="mb-3" />
        <div class="flex gap-4">
          <button
            id="name-type-named"
            type="button"
            class="flex-1 rounded-lg border py-3 transition-all"
            :class="localData.nameType === 'named' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500'"
            :aria-pressed="localData.nameType === 'named'"
            @click="setNameType('named')"
          >
            Named Company
          </button>
          <button
            id="name-type-numbered"
            type="button"
            class="flex-1 rounded-lg border py-3 transition-all"
            :class="localData.nameType === 'numbered' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500'"
            :aria-pressed="localData.nameType === 'numbered'"
            @click="setNameType('numbered')"
          >
            Numbered Company
          </button>
        </div>
        <p v-if="errors.nameType" class="mt-2 text-xs text-red-400" role="alert">{{ errors.nameType }}</p>
      </div>

      <template v-if="localData.nameType === 'named'">
        <div class="card-glass rounded-xl p-6">
          <label for="proposedName" class="mb-1 block text-sm font-bold uppercase tracking-wider text-gray-400">
            Proposed Corporate Name <span class="text-red-400">*</span>
          </label>
          <FieldHelper v-bind="h.proposedName" class="mb-2" />
          <input
            id="proposedName"
            v-model="localData.proposedName"
            type="text"
            class="input-modern w-full"
            :class="errors.proposedName ? 'border-red-500' : ''"
            placeholder="e.g., Acme Technologies"
            maxlength="120"
            @blur="localData.proposedName = normalizeText(localData.proposedName)"
          />
          <p v-if="errors.proposedName" class="mt-1 text-xs text-red-400" role="alert">{{ errors.proposedName }}</p>
        </div>

        <div class="card-glass rounded-xl p-6">
          <label for="legalEnding" class="mb-1 block text-sm font-bold uppercase tracking-wider text-gray-400">
            Legal Ending <span class="text-red-400">*</span>
          </label>
          <FieldHelper v-bind="h.legalEnding" class="mb-2" />
          <select
            id="legalEnding"
            v-model="localData.legalEnding"
            class="input-modern w-full appearance-none"
            :class="errors.legalEnding ? 'border-red-500' : ''"
          >
            <option disabled value="">Select legal ending...</option>
            <option value="Inc.">Inc.</option>
            <option value="Ltd.">Ltd.</option>
            <option value="Corp.">Corp.</option>
            <option value="Incorporated">Incorporated</option>
            <option value="Limited">Limited</option>
            <option value="Corporation">Corporation</option>
          </select>
          <p v-if="errors.legalEnding" class="mt-1 text-xs text-red-400" role="alert">{{ errors.legalEnding }}</p>
        </div>

        <div class="card-glass rounded-xl p-6" :class="nuansHasError ? 'border border-red-500/60' : ''">
          <label for="nuansDate" class="mb-1 block text-sm font-bold uppercase tracking-wider text-gray-400">
            NUANS Report Date <span class="text-red-400">*</span>
          </label>
          <FieldHelper v-bind="h.nuansReportDate" class="mb-2" />
          <input
            id="nuansDate"
            v-model="localData.nuansReportDate"
            type="date"
            class="input-modern w-full"
            :class="nuansHasError ? 'border-red-500' : ''"
          />
          <p class="mt-2 text-xs text-gray-500">Report must be dated within 90 days of filing.</p>
          <p v-if="errors.nuansReportDate" class="mt-1 text-xs font-semibold text-red-400" role="alert">{{ errors.nuansReportDate }}</p>

        <div class="mt-4">
          <label class="flex cursor-pointer items-center gap-3">
            <input v-model="localData.nuansReviewed" type="checkbox" class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-sm text-gray-300">NUANS results reviewed, with no unresolved conflicting names or trademarks</span>
          </label>
          <p v-if="errors.nuansReviewed" class="mt-1 text-xs font-semibold text-red-400" role="alert">{{ errors.nuansReviewed }}</p>
        </div>

          <div class="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label class="mb-1 block text-xs text-gray-500">NUANS File Reference (optional)</label>
              <FieldHelper v-bind="h.nuansFileReference" class="mb-1" />
              <input v-model="localData.nuansFileReference" type="text" class="input-modern w-full" placeholder="e.g., NUANS-2024-123456" />
            </div>
            <label class="flex cursor-pointer items-center gap-3">
              <input v-model="localData.nuansHasConflicts" type="checkbox" class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500" />
              <span class="text-sm text-red-300">Conflicting name or trademark found</span>
            </label>
            <div v-if="localData.nuansHasConflicts">
              <label class="mb-1 block text-xs text-gray-500">Conflict Details</label>
              <FieldHelper v-bind="h.nuansConflictDetails" class="mb-1" />
              <textarea
                v-model="localData.nuansConflictDetails"
                class="input-modern w-full"
                rows="2"
                placeholder="Describe the conflict..."
              ></textarea>
              <p v-if="errors.nuansConflictDetails" class="mt-1 text-xs text-red-400" role="alert">{{ errors.nuansConflictDetails }}</p>
            </div>
          </div>
        </div>

        <div v-if="localData.jurisdiction === 'cbca'" class="card-glass rounded-xl border-l-4 border-l-cyan-500 p-6">
          <label class="mb-1 block text-sm font-bold uppercase tracking-wider text-gray-400">
            Bilingual Name (French) <span class="text-cyan-400">CBCA Only</span>
          </label>
          <FieldHelper v-bind="h.bilingualName" class="mb-2" />
          <input
            v-model="localData.bilingualName"
            type="text"
            class="input-modern w-full"
            placeholder="Nom en francais (optional)"
          />
          <p class="mt-1 text-xs text-gray-500">Optional, but allows the corporation to use both English and French forms.</p>
        </div>
      </template>

      <div v-if="localData.nameType" class="card-glass rounded-xl p-6">
        <label class="flex cursor-pointer items-center gap-3">
          <input v-model="localData.nameConfirmed" type="checkbox" class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500" />
          <span class="text-gray-300">
            {{ localData.nameType === 'numbered' ? 'I confirm this will be a numbered company' : 'I confirm the corporate name is finalized' }}
          </span>
        </label>
        <FieldHelper v-bind="h.nameConfirmed" class="mt-2" />
        <p v-if="errors.nameConfirmed" class="mt-2 text-xs text-red-400" role="alert">{{ errors.nameConfirmed }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useIncorpStepSave } from '../../composables/useIncorpStepSave';
import FieldHelper from '../../components/incorporation/FieldHelper.vue';
import { incorpHelpers } from '../../utils/incorpFieldHelpers';

const h = incorpHelpers.jurisdiction;
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import { isFutureDate, isNuansExpired, normalizeText, validateIncorpSection } from '../../utils/incorpRules';

const store = useIncorpIntakeStore();
const isLoading = ref(true);

const localData = reactive({
    jurisdiction: '' as 'obca' | 'cbca' | '',
    nameType: '' as 'named' | 'numbered' | '',
    proposedName: '',
    legalEnding: '',
    bilingualName: '',
    nuansReportDate: '',
    nuansReviewed: false,
    nuansHasConflicts: false,
    nuansConflictDetails: '',
    nuansFileReference: '',
    nameConfirmed: false,
});

const sanitizeLocalData = () => {
    if (localData.jurisdiction !== 'cbca') {
        localData.bilingualName = '';
    }

    if (localData.nameType !== 'named') {
        localData.proposedName = '';
        localData.legalEnding = '';
        localData.nuansReportDate = '';
        localData.nuansReviewed = false;
        localData.nuansHasConflicts = false;
        localData.nuansConflictDetails = '';
        localData.nuansFileReference = '';
    }

    if (!localData.nuansHasConflicts) {
        localData.nuansConflictDetails = '';
    }
};

const buildStepData = () => {
    sanitizeLocalData();

    const preIncorporation: Record<string, unknown> = {
        jurisdiction: localData.jurisdiction || undefined,
        nameType: localData.nameType || undefined,
        nameConfirmed: localData.nameType ? localData.nameConfirmed : false,
    };

    if (localData.nameType === 'named') {
        preIncorporation.proposedName = normalizeText(localData.proposedName) || undefined;
        preIncorporation.legalEnding = localData.legalEnding || undefined;
        preIncorporation.bilingualName = localData.jurisdiction === 'cbca'
            ? normalizeText(localData.bilingualName) || undefined
            : undefined;
        preIncorporation.nuansReviewed = localData.nuansReviewed;
        preIncorporation.nuansReport = localData.nuansReportDate ? {
            reportDate: localData.nuansReportDate,
            hasConflicts: localData.nuansHasConflicts,
            conflictDetails: normalizeText(localData.nuansConflictDetails) || undefined,
            fileReference: normalizeText(localData.nuansFileReference) || undefined,
        } : undefined;
    }

    return { preIncorporation };
};

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

const nuansIsStale = computed(() =>
    localData.nameType === 'named' && !!localData.nuansReportDate && isNuansExpired(localData.nuansReportDate)
);

const nuansIsFuture = computed(() =>
    localData.nameType === 'named' && !!localData.nuansReportDate && isFutureDate(localData.nuansReportDate)
);

const nuansHasError = computed(() => !!errors.nuansReportDate);

const errors = reactive({
    jurisdiction: '',
    nameType: '',
    proposedName: '',
    legalEnding: '',
    nuansReportDate: '',
    nuansReviewed: '',
    nuansConflictDetails: '',
    nameConfirmed: '',
});

const clearErrors = () => {
    Object.keys(errors).forEach((key) => {
        (errors as Record<string, string>)[key] = '';
    });
};

const validateLocal = () => {
    clearErrors();

    if (!localData.jurisdiction) {
        errors.jurisdiction = 'Select the incorporation jurisdiction.';
    }
    if (!localData.nameType) {
        errors.nameType = 'Select whether the corporation is named or numbered.';
    }

    if (localData.nameType === 'named') {
        if (!normalizeText(localData.proposedName)) {
            errors.proposedName = 'Enter the proposed corporate name.';
        }
        if (!localData.legalEnding) {
            errors.legalEnding = 'Select the legal ending.';
        }
        if (!localData.nuansReportDate) {
            errors.nuansReportDate = 'Enter the NUANS report date.';
        } else if (nuansIsFuture.value) {
            errors.nuansReportDate = 'The NUANS report date cannot be in the future.';
        } else if (nuansIsStale.value) {
            errors.nuansReportDate = 'The NUANS report is older than 90 days.';
        }
        if (!localData.nuansReviewed) {
            errors.nuansReviewed = 'Please confirm that the NUANS results were reviewed.';
        }
        if (localData.nuansHasConflicts && !normalizeText(localData.nuansConflictDetails)) {
            errors.nuansConflictDetails = 'Describe the NUANS conflict or clear the conflict flag.';
        }
    }

    if (localData.nameType && !localData.nameConfirmed) {
        errors.nameConfirmed = localData.nameType === 'numbered'
            ? 'Confirm that this will be a numbered company.'
            : 'Confirm that the corporate name is finalized.';
    }

    const inlineError = Object.values(errors).find(Boolean);
    if (inlineError) return inlineError;

    return validateIncorpSection('preIncorporation', {
        ...store.incorpData,
        ...buildStepData(),
    } as any);
};

const hydrateFromStore = () => {
    const pre = store.incorpData.preIncorporation;
    if (!pre) return;

    localData.jurisdiction = pre.jurisdiction || '';
    localData.nameType = pre.nameType || '';
    localData.proposedName = pre.proposedName || '';
    localData.legalEnding = pre.legalEnding || '';
    localData.bilingualName = pre.bilingualName || '';
    localData.nuansReportDate = pre.nuansReport?.reportDate || '';
    localData.nuansReviewed = pre.nuansReviewed || false;
    localData.nuansHasConflicts = pre.nuansReport?.hasConflicts || false;
    localData.nuansConflictDetails = pre.nuansReport?.conflictDetails || '';
    localData.nuansFileReference = pre.nuansReport?.fileReference || '';
    localData.nameConfirmed = pre.nameConfirmed || false;
};

const setJurisdiction = (jurisdiction: 'obca' | 'cbca') => {
    if (localData.jurisdiction === jurisdiction) return;
    localData.jurisdiction = jurisdiction;
    sanitizeLocalData();
    localData.nameConfirmed = false;
};

const setNameType = (nameType: 'named' | 'numbered') => {
    if (localData.nameType === nameType) return;
    localData.nameType = nameType;
    sanitizeLocalData();
    localData.nameConfirmed = false;
};

onMounted(() => {
    hydrateFromStore();
    sanitizeLocalData();
    isLoading.value = false;
    markInitialized();
});

watch(() => ({ ...localData }), () => {
    sanitizeLocalData();
    if (localData.jurisdiction) errors.jurisdiction = '';
    if (localData.nameType) errors.nameType = '';
    if (normalizeText(localData.proposedName)) errors.proposedName = '';
    if (localData.legalEnding) errors.legalEnding = '';
    if (localData.nuansReportDate && !nuansIsFuture.value && !nuansIsStale.value) errors.nuansReportDate = '';
    if (localData.nuansReviewed) errors.nuansReviewed = '';
    if (!localData.nuansHasConflicts || normalizeText(localData.nuansConflictDetails)) errors.nuansConflictDetails = '';
    if (localData.nameConfirmed) errors.nameConfirmed = '';
    scheduleSave();
}, { deep: true });

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
