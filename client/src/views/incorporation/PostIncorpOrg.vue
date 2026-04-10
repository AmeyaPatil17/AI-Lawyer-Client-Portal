<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="3" :rows="3" />
  <div v-else role="region" aria-label="Post-Incorporation Organization">
    <div>
      <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Post-Incorporation Organization</h2>
      <p class="text-gray-400 mb-4">Complete the organizational steps required after receiving the Certificate of Incorporation.</p>
      <div v-if="certificatePrereqMessage" class="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        {{ certificatePrereqMessage }}
      </div>

      <div class="space-y-6">
        <section class="card-glass p-6 rounded-xl">
          <h3 class="text-lg font-semibold text-gray-100 mb-2">By-Laws</h3>
          <FieldHelper v-bind="h.generalByLaw" class="mb-4" />
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="localData.generalByLawDrafted" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300">General By-Law No. 1 drafted (directors, officers, meetings, quorum, banking, notices)</span>
            </label>
            <p v-if="generalByLawError" class="ml-7 text-xs text-rose-300">{{ generalByLawError }}</p>

            <label class="flex items-center gap-3 cursor-pointer mt-4">
              <input v-model="localData.bankingByLawSeparate" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300">Banking or borrowing by-law is separate from General By-Law No. 1</span>
            </label>
            <FieldHelper v-bind="h.bankingByLaw" class="ml-7 mb-2" />
            <label v-if="localData.bankingByLawSeparate" class="flex items-center gap-3 cursor-pointer ml-6">
              <input v-model="localData.bankingByLawDrafted" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300">Separate banking by-law drafted</span>
            </label>
            <p v-if="bankingByLawError" class="ml-7 text-xs text-rose-300">{{ bankingByLawError }}</p>
          </div>
        </section>

        <section class="card-glass p-6 rounded-xl">
          <h3 class="text-lg font-semibold text-gray-100 mb-4">Organizational Resolutions</h3>
          <div class="space-y-4">
            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="localData.orgResolutionsPrepared" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">Written organizational resolutions of first directors prepared</span>
              </label>
              <FieldHelper v-bind="h.orgResolutions" class="ml-7 mt-1" />
              <p class="text-xs text-gray-500 ml-7 mt-1">Adopt by-laws, appoint officers, authorize share issuance, approve bank accounts, set fiscal year-end, and designate an auditor or waiver.</p>
              <p v-if="orgResolutionsError" class="ml-7 text-xs text-rose-300 mt-1">{{ orgResolutionsError }}</p>
            </div>

            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="localData.shareholderResolutionPrepared" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">Optional shareholder resolution confirming by-laws prepared</span>
              </label>
              <FieldHelper v-bind="h.shareholderResolution" class="ml-7 mt-1" />
              <p class="ml-7 text-xs text-gray-500 mt-1">{{ shareholderResolutionAdvisory }}</p>
            </div>

            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="localData.auditWaiverResolution" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">Optional audit waiver resolution prepared</span>
              </label>
              <FieldHelper v-bind="h.auditWaiver" class="ml-7 mt-1" />
              <p class="ml-7 text-xs text-gray-500 mt-1">{{ auditWaiverAdvisory }}</p>
            </div>

            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="localData.officeResolutionPassed" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">Resolution confirming registered or records office addresses</span>
              </label>
              <FieldHelper v-bind="h.officeResolution" class="ml-7 mt-1" />
              <p v-if="officeResolutionError" class="ml-7 text-xs text-rose-300 mt-1">{{ officeResolutionError }}</p>
            </div>
          </div>
        </section>

        <section class="card-glass p-6 rounded-xl">
          <div class="flex justify-between items-center mb-1">
            <h3 class="text-lg font-semibold text-gray-100">Director Consents</h3>
            <div class="flex gap-3">
              <button
                v-if="activeDirectorConsents.length"
                @click="markAllSigned"
                type="button"
                class="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {{ allSigned ? 'Unmark All' : 'Mark All Signed' }}
              </button>
              <button @click="syncDirectorConsents" type="button" class="text-sm text-emerald-400 hover:text-emerald-300">Sync Directors</button>
            </div>
          </div>
          <FieldHelper v-bind="h.directorConsents" class="mb-3" />
          <p class="text-xs text-amber-400 mb-3">
            Director names come from Step 2. Signature status and consent dates are managed here.
          </p>
          <div v-if="directorSyncWarning" class="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            {{ directorSyncWarning }}
          </div>
          <p v-if="!eligibleDirectorCount" class="text-xs text-gray-500 italic">
            No eligible directors available yet. Return to Step 2 to add a director name before preparing consents.
          </p>
          <p v-else-if="consentListError" class="mb-3 text-xs text-rose-300">{{ consentListError }}</p>

          <div v-for="consent in localData.directorConsents" :key="consent.id" class="bg-gray-800/50 rounded-lg p-4 mb-3">
            <div
              v-if="consent.syncState === 'orphaned'"
              class="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"
            >
              {{ consent.syncIssue === 'ambiguous'
                ? 'This consent could not be matched safely to the current Step 2 director list. Sync after confirming the director roster.'
                : 'This consent belongs to a director who is no longer in Step 2. Sync Directors to remove it from the active roster.' }}
            </div>
            <div class="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Director Name</label>
                <input :value="consent.directorName" class="input-modern w-full opacity-70" readonly />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Consent Date</label>
                <input
                  v-model="consent.consentDate"
                  type="date"
                  class="input-modern w-full"
                  :max="todayISO"
                  :disabled="consent.syncState === 'orphaned' || !consent.consentSigned"
                />
              </div>
            </div>
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer shrink-0 text-sm">
                <input
                  v-model="consent.consentSigned"
                  type="checkbox"
                  class="rounded border-gray-600 bg-gray-800 text-emerald-500"
                  :disabled="consent.syncState === 'orphaned'"
                  @change="handleConsentSignedToggle(consent)"
                />
                Consent Signed
              </label>
              <span class="text-xs text-gray-500">{{ consent.syncState === 'orphaned' ? 'Retained until sync' : 'Ready to file' }}</span>
            </div>
            <div v-if="getConsentRowErrors(consent).length" class="mt-2 space-y-1">
              <p v-for="error in getConsentRowErrors(consent)" :key="error" class="text-xs text-rose-300">
                {{ error }}
              </p>
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            {{ completedConsents }} of {{ activeDirectorConsents.length }} active consents complete
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { Director } from '../../stores/incorpTypes';
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import { useIncorpStepSave } from '../../composables/useIncorpStepSave';
import IncorpStepSkeleton from '../../components/incorporation/IncorpStepSkeleton.vue';
import FieldHelper from '../../components/incorporation/FieldHelper.vue';
import { incorpHelpers } from '../../utils/incorpFieldHelpers';
import { validateIncorpSection } from '../../utils/incorpRules';
import {
  createEmptyPostIncorpOrgDraft,
  getDirectorConsentRowErrors,
  getDirectorConsentSyncSummary,
  getEligibleDirectorCount,
  getLocalTodayISO,
  hydratePostIncorpOrgDraft,
  isDirectorConsentComplete,
  serializePostIncorpOrgDraft,
  syncDirectorConsentDrafts,
  type DirectorConsentDraft,
  type PostIncorpOrgDraft,
} from '../../utils/incorpPostIncorpOrg';

const h = incorpHelpers.postIncorpOrg;

const isLoading = ref(true);
const store = useIncorpIntakeStore();
const suppressAutoSave = ref(true);
const todayISO = getLocalTodayISO();
const lastSerializedKey = ref('');
const lastDirectorRosterKey = ref('');

const currentDirectors = computed(() => (store.incorpData.structureOwnership?.directors || []) as Director[]);
const directorRosterKey = computed(() => JSON.stringify(
  currentDirectors.value.map((director) => ({
    id: director.id || '',
    fullName: director.fullName || '',
  }))
));
const shareholderCount = computed(() =>
  (store.incorpData.structureOwnership?.initialShareholders || []).filter((shareholder) => !!shareholder.fullName?.trim()).length
);
const eligibleDirectorCount = computed(() => getEligibleDirectorCount(currentDirectors.value));

const localData = reactive<PostIncorpOrgDraft>(createEmptyPostIncorpOrgDraft());
const directorSyncWarning = ref('');

const applyWithoutAutosave = (updater: () => void) => {
  suppressAutoSave.value = true;
  updater();
  lastSerializedKey.value = serializedStepKey.value;
};

const syncDraftWithDirectors = (dropOrphans: boolean) => {
  const reconciliation = syncDirectorConsentDrafts(localData.directorConsents, currentDirectors.value);
  directorSyncWarning.value = getDirectorConsentSyncSummary(reconciliation);

  const nextConsents = dropOrphans
    ? reconciliation.directorConsents.filter((consent) => consent.syncState === 'active')
    : reconciliation.directorConsents;

  applyWithoutAutosave(() => {
    localData.directorConsents = nextConsents;
  });
  lastDirectorRosterKey.value = directorRosterKey.value;

  return reconciliation;
};

const buildStepData = () => ({
  postIncorpOrg: serializePostIncorpOrgDraft(localData),
});

const serializedStepKey = computed(() => JSON.stringify(buildStepData()));

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

const activeDirectorConsents = computed(() =>
  localData.directorConsents.filter((consent) => consent.syncState === 'active')
);
const completedConsents = computed(() =>
  activeDirectorConsents.value.filter((consent) => isDirectorConsentComplete(consent)).length
);
const allSigned = computed(() =>
  activeDirectorConsents.value.length > 0
  && activeDirectorConsents.value.every((consent) => consent.consentSigned)
);

const validationError = computed(() => validateIncorpSection('postIncorpOrg', {
  ...store.incorpData,
  ...buildStepData(),
} as any));

const certificatePrereqMessage = computed(() =>
  store.incorpData.articles?.certificateReceived
    ? ''
    : 'Articles does not yet show the Certificate of Incorporation as received. You can prepare this checklist now, but final post-incorporation organization usually follows certificate receipt.'
);

const generalByLawError = computed(() =>
  !localData.generalByLawDrafted
    ? 'General By-Law No. 1 should be drafted before completing post-incorporation steps.'
    : ''
);
const bankingByLawError = computed(() =>
  localData.bankingByLawSeparate && !localData.bankingByLawDrafted
    ? 'Draft the separate banking by-law or turn off the separate banking by-law option.'
    : ''
);
const orgResolutionsError = computed(() =>
  !localData.orgResolutionsPrepared
    ? 'Written organizational resolutions of the first directors must be prepared.'
    : ''
);
const officeResolutionError = computed(() =>
  !localData.officeResolutionPassed
    ? 'Please confirm the registered or records office resolution.'
    : ''
);
const consentListError = computed(() => {
  if (localData.directorConsents.some((consent) => consent.syncState === 'orphaned')) {
    return 'Director consents must match the current director list.';
  }

  return validationError.value?.includes('Director consents')
    ? validationError.value
    : '';
});
const shareholderResolutionAdvisory = computed(() =>
  shareholderCount.value <= 1
    ? 'Optional. This is usually only needed when shareholders are formally confirming the by-laws.'
    : `Optional. Use this when shareholders are formally confirming the by-laws for all ${shareholderCount.value} shareholders.`
);
const auditWaiverAdvisory = computed(() => {
  if (shareholderCount.value === 0) {
    return 'Optional. Add shareholders in Step 2 before relying on an audit waiver resolution.';
  }
  if (shareholderCount.value === 1) {
    return 'Optional. A sole shareholder can sign the waiver if one is needed.';
  }
  return `Optional. Requires unanimous shareholder consent from all ${shareholderCount.value} shareholders if used.`;
});

const handleConsentSignedToggle = (consent: DirectorConsentDraft) => {
  if (consent.syncState === 'orphaned') return;

  if (consent.consentSigned) {
    if (!consent.consentDate) {
      consent.consentDate = todayISO;
    }
    return;
  }

  consent.consentDate = '';
};

const markAllSigned = () => {
  const target = !allSigned.value;

  activeDirectorConsents.value.forEach((consent) => {
    consent.consentSigned = target;
    consent.consentDate = target
      ? (consent.consentDate || todayISO)
      : '';
  });
};

const syncDirectorConsents = () => {
  const reconciliation = syncDirectorConsentDrafts(localData.directorConsents, currentDirectors.value);

  if (reconciliation.hasSyncIssues) {
    const confirmationMessage = reconciliation.orphanedEntries.some((entry) => entry.issue === 'ambiguous')
      ? 'Syncing directors will drop retained consent history that could not be matched safely to the current Step 2 roster. Continue?'
      : 'Syncing directors will remove consent history for directors that are no longer listed in Step 2. Continue?';

    if (!window.confirm(confirmationMessage)) {
      return;
    }
  }

  syncDraftWithDirectors(true);
  suppressAutoSave.value = false;
  scheduleSave();
};

const getConsentRowErrors = (consent: DirectorConsentDraft) => getDirectorConsentRowErrors(consent);

const validateLocal = () => validationError.value;

onMounted(() => {
  applyWithoutAutosave(() => {
    Object.assign(localData, hydratePostIncorpOrgDraft(store.incorpData.postIncorpOrg));
  });

  syncDraftWithDirectors(false);

  isLoading.value = false;
  markInitialized();
  lastSerializedKey.value = serializedStepKey.value;
  lastDirectorRosterKey.value = directorRosterKey.value;
  suppressAutoSave.value = false;
});

watch(directorRosterKey, (nextKey) => {
  if (nextKey === lastDirectorRosterKey.value) return;
  const wasSuppressed = suppressAutoSave.value;
  syncDraftWithDirectors(false);
  suppressAutoSave.value = wasSuppressed;
});

watch(serializedStepKey, (nextKey) => {
  if (suppressAutoSave.value || nextKey === lastSerializedKey.value) {
    lastSerializedKey.value = nextKey;
    return;
  }
  lastSerializedKey.value = nextKey;
  scheduleSave();
});

defineExpose({
  commitStep: flushSave,
  validateLocal,
});
</script>
