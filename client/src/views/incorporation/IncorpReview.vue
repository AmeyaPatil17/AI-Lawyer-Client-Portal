<template>
  <div>
    <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Review &amp; Submit</h2>
    <p class="text-gray-400 mb-8">Review your incorporation checklist and submit for lawyer review.</p>

    <div role="region" aria-label="Review &amp; Submit" class="space-y-6">
      <div class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-3">Jurisdiction &amp; Name</h3>
        <p class="text-gray-300">
          {{ data.preIncorporation?.jurisdiction?.toUpperCase() || 'Not set' }} -
          {{ namedCompany ? corporateName || 'Name not set' : 'Numbered Company' }}
        </p>
        <div v-if="namedCompany" class="mt-2 text-sm">
          <span v-if="preIncorpIssue" class="text-red-400">
            {{ preIncorpIssue }}
          </span>
          <span v-else-if="data.preIncorporation?.nuansReport?.reportDate" class="text-green-400">
            NUANS report current.
          </span>
          <span v-else class="text-amber-400">No NUANS report date entered.</span>
        </div>
      </div>

      <div class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-3">Registered Office</h3>
        <p class="text-gray-300">{{ data.structureOwnership?.registeredOfficeAddress || 'Not entered' }}</p>
        <p v-if="data.structureOwnership?.registeredOfficeProvince" class="text-gray-400 text-sm mt-1">{{ data.structureOwnership.registeredOfficeProvince }}</p>
        <p class="text-gray-400 text-sm mt-1">Fiscal Year End: {{ data.structureOwnership?.fiscalYearEnd || 'Not set' }}</p>
      </div>

      <div class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-3">Directors ({{ directors.length }})</h3>
        <div v-for="director in directors" :key="director.id || director.fullName" class="text-gray-300 text-sm py-1 flex items-center gap-2">
          {{ director.fullName }}
          <span v-if="director.isCanadianResident" class="text-xs bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 px-1.5 rounded">CA Resident</span>
        </div>
        <p v-if="directors.length === 0" class="text-gray-500 text-sm italic">No directors defined.</p>
      </div>

      <div class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-3">Share Classes ({{ shareClasses.length }})</h3>
        <div v-for="shareClass in shareClasses" :key="shareClass.id || shareClass.className" class="text-gray-300 text-sm py-1">
          {{ shareClass.className }} - {{ shareClass.votingRights ? 'Voting' : 'Non-voting' }} {{ shareClass.maxShares ? `(Max: ${shareClass.maxShares})` : '(Unlimited)' }}
        </div>
        <p v-if="shareClasses.length === 0" class="text-gray-500 text-sm italic">No share classes defined.</p>
      </div>

      <div class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-3">Shareholders ({{ shareholders.length }})</h3>
        <div v-for="shareholder in shareholders" :key="shareholder.id || shareholder.fullName" class="text-gray-300 text-sm py-1">
          {{ shareholder.fullName || shareholder.subscriberName }} -
          {{ shareholder.numberOfShares || 0 }}
          {{ shareholder.shareClass || 'unassigned' }} shares
          <span v-if="shareholder.considerationType">({{ shareholder.considerationType }})</span>
        </div>
        <p v-if="shareholders.length === 0" class="text-gray-500 text-sm italic">No shareholders defined.</p>
      </div>

      <div v-if="serverFlags.length || serverWarnings.length" class="card-glass p-6 rounded-xl border-l-4 border-l-red-500">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Server Flags &amp; Logic Warnings</h3>
        <div class="space-y-3">
          <!-- Gap 17: Human-readable labels; Gap 18: Hard flag distinction with red border -->
          <div v-for="flag in serverFlags" :key="flag.code" class="rounded-lg border border-red-700/50 bg-red-500/10 p-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-900/40 px-2 py-0.5 rounded">⛔ Hard Flag</span>
              <span class="text-sm font-medium text-red-300">{{ flagLabels[flag.code] || flag.code }}</span>
            </div>
            <p class="text-sm text-gray-300">{{ flag.message }}</p>
          </div>
          <div v-for="warning in serverWarnings" :key="warning.code" class="rounded-lg border border-amber-700/40 bg-amber-500/10 p-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-900/40 px-2 py-0.5 rounded">⚠️ Advisory</span>
              <span class="text-sm font-medium text-amber-300">{{ flagLabels[warning.code] || warning.code }}</span>
            </div>
            <p class="text-sm text-gray-300">{{ warning.message }}</p>
          </div>
        </div>
      </div>

      <div class="card-glass p-6 rounded-xl border-l-4 border-l-emerald-500">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Checklist Status</h3>
        <div
          v-for="step in checklistSteps"
          :key="step.context"
          class="flex items-center gap-3 py-2 rounded-lg px-2 transition-colors"
          :class="!step.complete ? 'hover:bg-gray-700/30 cursor-pointer' : ''"
          @click="!step.complete ? navigateToStep(step.path) : undefined"
        >
          <span :class="step.complete ? 'text-green-500' : 'text-gray-600'">{{ step.complete ? 'Done' : 'Open' }}</span>
          <span class="text-gray-300 text-sm flex-1">{{ step.label }}</span>
          <span v-if="!step.complete" class="text-xs text-amber-400 hover:text-amber-300">Fix -></span>
        </div>

        <div v-if="hasBlockingIssues" class="mt-4 bg-red-500/10 border border-red-700/40 rounded-lg p-3 space-y-2">
          <p class="text-red-300 text-sm font-semibold">Resolve these issues before submitting.</p>
          <button
            v-for="issue in blockingIssues"
            :key="issue.context"
            type="button"
            class="block w-full text-left text-sm text-gray-300 hover:text-white"
            @click="navigateToContext(issue.context)"
          >
            {{ sectionLabels[issue.context] }}: {{ issue.message }}
          </button>
        </div>
      </div>

      <div class="card-glass p-6 rounded-xl">
        <label class="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Additional Notes for Your Lawyer</label>
        <textarea
          v-model="clientNotes"
          @input="saveNotes"
          class="input-modern w-full min-h-[100px]"
          placeholder="Any additional information, questions, or context..."
        ></textarea>
      </div>

      <div class="flex justify-end">
        <button
          @click="printReview"
          class="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print / Export
        </button>
      </div>
      <p v-if="hasBlockingIssues" class="text-center text-red-400 text-sm">
        Submission blocked until all checklist issues are resolved.
      </p>
    </div>

    <div v-if="showConfirmModal" class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-2">Submit for Review?</h3>
        <p class="text-gray-400 text-sm mb-2">
          You are submitting this incorporation intake to <strong class="text-white">Valiant Law</strong>. Your lawyer will contact you to discuss next steps.
        </p>
        <div v-if="hasBlockingIssues" class="bg-red-500/10 border border-red-700/40 p-3 rounded-lg mb-4">
          <p class="text-red-300 text-sm">Submission is still blocked. Resolve the checklist issues first.</p>
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="showConfirmModal = false" class="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
          <button @click="handleSubmit" :disabled="isSubmitting || hasBlockingIssues" class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium">
            Yes, Submit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import { useIncorpValidation } from '../../composables/useIncorpValidation';
import { useToast } from '../../composables/useToast';
import api from '../../api';
import type { IncorporationData } from '../../stores/incorpTypes';
import { buildCorporateName } from '../../utils/incorpRules';
import { getClientNotes, setClientNotes } from '../../utils/incorpData';

const router = useRouter();
const store = useIncorpIntakeStore();
const { getBlockingIssues, isStepComplete } = useIncorpValidation();
const { showToast } = useToast();

const stepPaths = {
    preIncorporation: 'jurisdiction-name',
    structureOwnership: 'structure-ownership',
    articles: 'articles',
    postIncorpOrg: 'post-incorp',
    shareIssuance: 'share-issuance',
    corporateRecords: 'corporate-records',
    registrations: 'registrations',
    bankingSetup: 'banking-setup',
} as const;

const sectionLabels = {
    preIncorporation: 'Jurisdiction & Name',
    structureOwnership: 'Structure & Ownership',
    articles: 'Articles of Incorporation',
    postIncorpOrg: 'Post-Incorporation',
    shareIssuance: 'Share Issuance',
    corporateRecords: 'Corporate Records',
    registrations: 'Registrations',
    bankingSetup: 'Banking & Compliance',
} as const;

const data = computed(() => store.incorpData);
const namedCompany = computed(() => data.value.preIncorporation?.nameType === 'named');
const directors = computed(() => data.value.structureOwnership?.directors || []);
const shareClasses = computed(() => data.value.structureOwnership?.shareClasses || []);
const shareholders = computed(() =>
    data.value.shareIssuance?.subscriptionAgreements?.length
        ? data.value.shareIssuance.subscriptionAgreements
        : data.value.structureOwnership?.initialShareholders || []
);
const corporateName = computed(() => buildCorporateName(data.value.preIncorporation));
const serverFlags = computed(() => store.intakeFlags || []);
const serverWarnings = computed(() => store.logicWarnings || []);

// Gap 17: Human-readable flag code labels
const flagLabels: Record<string, string> = {
    RESIDENCY_FAIL: 'Director Residency Requirement',
    MISSING_GUARDIAN: 'Missing Guardian',
    SPOUSAL_OMISSION: 'Spousal Omission',
    FOREIGN_ASSETS: 'Foreign Assets Detected',
    BUSINESS_ASSETS: 'Business Assets Detected',
    POSSIBLE_DISINHERITANCE: 'Possible Disinheritance',
    EXECUTOR_CAPABILITY: 'Executor Capability Concern',
    NUANS_EXPIRED: 'NUANS Report Expired',
    SHARE_TRANSFER_MISSING: 'Share Transfer Restrictions Missing',
    DIRECTOR_COUNT_MISMATCH: 'Director Count Mismatch',
};

const clientNotes = ref('');
let notesTimeout: ReturnType<typeof setTimeout> | null = null;
let notesDirty = false;

const saveNotes = () => {
    if (notesTimeout) {
        clearTimeout(notesTimeout);
    }
    const notePatch = setClientNotes({}, clientNotes.value);
    store.stageIncorpStep(notePatch);
      notesDirty = true;
      notesTimeout = setTimeout(() => {
          notesTimeout = null;
        store.saveIncorpStep(notePatch, false, { mode: 'background' }).then(() => {
              notesDirty = false;
          });
      }, 800);
};

const flushNotes = async () => {
    if (notesTimeout) {
        clearTimeout(notesTimeout);
        notesTimeout = null;
    }
    const notePatch = setClientNotes({}, clientNotes.value);
    store.stageIncorpStep(notePatch);
    await store.saveIncorpStep(notePatch);
    notesDirty = false;
};

const isSubmitting = ref(false);
const showConfirmModal = ref(false);

const blockingIssues = computed(() => getBlockingIssues(data.value as IncorporationData));
const hasBlockingIssues = computed(() => blockingIssues.value.length > 0);
const preIncorpIssue = computed(() => blockingIssues.value.find((issue) => issue.context === 'preIncorporation')?.message || '');

const checklistSteps = computed(() => [
    { label: 'Jurisdiction & Name', context: 'preIncorporation', path: stepPaths.preIncorporation, complete: isStepComplete('preIncorporation', data.value as IncorporationData) },
    { label: 'Structure & Ownership', context: 'structureOwnership', path: stepPaths.structureOwnership, complete: isStepComplete('structureOwnership', data.value as IncorporationData) },
    { label: 'Articles of Incorporation', context: 'articles', path: stepPaths.articles, complete: isStepComplete('articles', data.value as IncorporationData) },
    { label: 'Post-Incorporation', context: 'postIncorpOrg', path: stepPaths.postIncorpOrg, complete: isStepComplete('postIncorpOrg', data.value as IncorporationData) },
    { label: 'Share Issuance', context: 'shareIssuance', path: stepPaths.shareIssuance, complete: isStepComplete('shareIssuance', data.value as IncorporationData) },
    { label: 'Corporate Records', context: 'corporateRecords', path: stepPaths.corporateRecords, complete: isStepComplete('corporateRecords', data.value as IncorporationData) },
    { label: 'Registrations', context: 'registrations', path: stepPaths.registrations, complete: isStepComplete('registrations', data.value as IncorporationData) },
    { label: 'Banking & Compliance', context: 'bankingSetup', path: stepPaths.bankingSetup, complete: isStepComplete('bankingSetup', data.value as IncorporationData) },
]);

const navigateToStep = async (path: string) => {
    await router.push(`/incorporation/${path}`);
};

const navigateToContext = async (context: keyof typeof stepPaths) => {
    await navigateToStep(stepPaths[context]);
};

const printReview = () => window.print();

const confirmSubmit = () => {
    if (hasBlockingIssues.value) {
        showToast('Resolve the remaining checklist issues before submitting.', 'error');
        return;
    }
    showConfirmModal.value = true;
};

const handleSubmit = async () => {
    if (hasBlockingIssues.value) {
        showConfirmModal.value = false;
        return;
    }

    showConfirmModal.value = false;
    isSubmitting.value = true;

    try {
        const id = store.currentIncorpId;
        if (!id) {
            throw new Error('No intake ID found');
        }

        await flushNotes();
        const response = await api.post(`/incorporation/${id}/submit`, { clientNotes: clientNotes.value });

        store.stageIncorpStep({
            submitted: true,
            submissionDate: response.data?.submissionDate || new Date().toISOString(),
        });
        store.intakeFlags = response.data?.flags || store.intakeFlags;
        store.logicWarnings = response.data?.logicWarnings || store.logicWarnings;

        showToast('Incorporation intake submitted successfully.', 'success');
        await router.push('/dashboard');
    } catch (err: any) {
        console.error('Submit error:', err?.response?.data || err);
        const details = err?.response?.data?.details;
        let message = err?.response?.data?.message || 'Submission failed. Please try again.';
        if (details) {
            message += ' ' + JSON.stringify(details);
        }
        showToast(message, 'error');
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    clientNotes.value = getClientNotes(store.incorpData);
});

onUnmounted(() => {
    if (notesTimeout) {
        clearTimeout(notesTimeout);
        notesTimeout = null;
    }
});

defineExpose({
    commitStep: flushNotes,
    hasPendingChanges: () => notesDirty || !!notesTimeout,
    triggerPrimaryAction: confirmSubmit,
    getPrimaryActionState: () => ({
        disabled: isSubmitting.value || hasBlockingIssues.value,
        loading: isSubmitting.value,
        label: isSubmitting.value ? 'Submitting...' : 'Submit',
    }),
});
</script>
