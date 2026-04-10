<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="4" :rows="3" />
  <div v-else role="region" aria-label="Structure &amp; Ownership">
    <div>
      <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Structure &amp; Ownership</h2>
      <p class="text-gray-400 mb-8">Define the share structure, shareholders, directors, and key corporate details.</p>

      <div class="space-y-8">
        <section class="card-glass p-6 rounded-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-100">Share Classes</h3>
            <button @click="addShareClass" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">+ Add Class</button>
          </div>
          <div v-if="localData.shareClasses.length === 0" class="text-sm text-gray-500 italic mb-2">No share classes defined. Add at least one.</div>
          <div v-for="(sc, i) in localData.shareClasses" :key="sc.id" class="bg-gray-800/50 rounded-lg p-4 mb-3">
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Class Name <span class="text-red-400">*</span></label>
                <FieldHelper v-bind="h.shareClassName" class="mb-1" />
                <input v-model="sc.className" class="input-modern w-full" :class="sc.className.trim() === '' ? 'border-red-500/60' : ''" placeholder="e.g., Common" />
                <p v-if="sc.className.trim() === ''" class="text-red-400 text-xs mt-1">Class name is required.</p>
                <p v-else-if="isDuplicateClassName(sc.className, i)" class="text-red-400 text-xs mt-1">Duplicate class name.</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Max Shares (0 = unlimited)</label>
                <FieldHelper v-bind="h.maxShares" class="mb-1" />
                <input
                  v-model.number="sc.maxShares"
                  type="number"
                  min="0"
                  class="input-modern w-full"
                  :class="isInvalidMaxShares(sc.maxShares) ? 'border-red-500/60' : ''"
                />
                <p v-if="isInvalidMaxShares(sc.maxShares)" class="text-red-400 text-xs mt-1">Enter a whole-number maximum share count or leave it blank.</p>
              </div>
            </div>
            <FieldHelper v-bind="h.shareRights" class="mb-2" />
            <div class="flex flex-wrap gap-4 text-sm">
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="sc.votingRights" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Voting</label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="sc.dividendRights" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Dividends</label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="sc.liquidationRights" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Liquidation</label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="sc.redeemable" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Redeemable</label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="sc.retractable" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Retractable</label>
            </div>
            <button @click="removeShareClass(i)" class="text-xs text-red-400 hover:text-red-300 mt-3">Remove Class</button>
          </div>
          <div v-if="localData.shareClasses.length && !hasCoreRightsClass" class="text-amber-400 text-sm bg-amber-500/10 p-3 rounded-lg">
            At least one share class must include voting, dividend, and liquidation rights.
          </div>
        </section>

        <section class="card-glass p-6 rounded-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-100">Initial Shareholders</h3>
            <div class="flex items-center gap-3">
              <span v-if="totalSharesIssued > 0" class="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                Total: {{ totalSharesIssued.toLocaleString() }} shares
              </span>
              <button @click="addShareholder" class="text-sm text-emerald-400 hover:text-emerald-300">+ Add Shareholder</button>
            </div>
          </div>
          <div v-for="(sh, i) in localData.initialShareholders" :key="sh.id" class="bg-gray-800/50 rounded-lg p-4 mb-3">
            <div class="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Full Name</label>
                <FieldHelper v-bind="h.shareholderName" class="mb-1" />
                <input v-model="sh.fullName" class="input-modern w-full" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Email (optional)</label>
                <FieldHelper v-bind="h.shareholderEmail" class="mb-1" />
                <input
                  v-model="sh.email"
                  type="email"
                  class="input-modern w-full"
                  :class="isInvalidOptionalEmail(sh.email) ? 'border-red-500/60' : ''"
                />
                <p v-if="isInvalidOptionalEmail(sh.email)" class="text-red-400 text-xs mt-1">Enter a valid email address.</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Share Class</label>
                <select v-model="sh.shareClassId" class="input-modern w-full appearance-none" @change="syncShareholderClass(sh)">
                  <option value="">Select class...</option>
                  <option v-for="sc in definedShareClasses" :key="sc.id" :value="sc.id">{{ sc.className }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Number of Shares</label>
                <FieldHelper v-bind="h.numberOfShares" class="mb-1" />
                <input
                  v-model.number="sh.numberOfShares"
                  type="number"
                  min="1"
                  class="input-modern w-full"
                  :class="isInvalidShareCount(sh.numberOfShares) || sharesExceedMax(sh) ? 'border-red-500/60' : ''"
                />
                <p v-if="isInvalidShareCount(sh.numberOfShares)" class="text-red-400 text-xs mt-1">Enter a whole-number share count of at least 1.</p>
                <p v-else-if="sharesExceedMax(sh)" class="text-red-400 text-xs mt-1">
                  Exceeds the maximum shares allowed for {{ shareholderClassName(sh) }}.
                </p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Consideration Type</label>
                <FieldHelper v-bind="h.considerationType" class="mb-1" />
                <select v-model="sh.considerationType" class="input-modern w-full appearance-none">
                  <option value="cash">Cash</option>
                  <option value="property">Property</option>
                  <option value="past_services">Past Services</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Consideration Amount ($)</label>
                <FieldHelper v-bind="h.considerationAmount" class="mb-1" />
                <input
                  v-model.number="sh.considerationAmount"
                  type="number"
                  step="0.01"
                  class="input-modern w-full"
                  :class="isInvalidConsiderationAmount(sh.considerationAmount) ? 'border-red-500/60' : ''"
                  placeholder="0.00"
                />
                <p v-if="isInvalidConsiderationAmount(sh.considerationAmount)" class="text-red-400 text-xs mt-1">Consideration amount cannot be negative.</p>
                <p v-else-if="sh.considerationAmount === 0" class="text-amber-400 text-xs mt-1">A $0 consideration amount may cause share issuance issues. Confirm with your lawyer.</p>
              </div>
            </div>
            <button @click="removeShareholder(i)" class="text-xs text-red-400 hover:text-red-300 mt-2">Remove</button>
          </div>
        </section>

        <section class="card-glass p-6 rounded-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-100">Directors</h3>
            <button @click="addDirector" class="text-sm text-emerald-400 hover:text-emerald-300">+ Add Director</button>
          </div>
          <div v-for="(d, i) in localData.directors" :key="d.id" class="bg-gray-800/50 rounded-lg p-4 mb-3">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Full Name</label>
                <FieldHelper v-bind="h.directorFullName" class="mb-1" />
                <input v-model="d.fullName" class="input-modern w-full" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Address</label>
                <FieldHelper v-bind="h.directorAddress" class="mb-1" />
                <input v-model="d.address" class="input-modern w-full" />
              </div>
            </div>
            <div class="mt-3">
              <FieldHelper v-bind="h.canadianResident" class="mb-1" />
              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" v-model="d.isCanadianResident" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Canadian Resident
              </label>
            </div>
            <button @click="removeDirector(i)" class="text-xs text-red-400 hover:text-red-300 mt-2">Remove</button>
          </div>
          <div v-if="residencyWarning" class="mt-3 text-yellow-400 text-sm bg-yellow-500/10 p-3 rounded-lg">{{ residencyWarning }}</div>
        </section>

        <section class="card-glass p-6 rounded-xl">
          <h3 class="text-lg font-semibold text-gray-100 mb-4">Corporate Details</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Registered Office Address</label>
              <FieldHelper v-bind="h.registeredOfficeAddress" class="mb-1" />
              <input
                v-model="localData.registeredOfficeAddress"
                class="input-modern w-full"
                :class="isPoBoxAddress(localData.registeredOfficeAddress) ? 'border-red-500/60' : ''"
              />
              <p v-if="isPoBoxAddress(localData.registeredOfficeAddress)" class="text-red-400 text-xs mt-1">The registered office must be a physical street address, not a P.O. Box.</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Province</label>
              <FieldHelper v-bind="h.registeredOfficeProvince" class="mb-1" />
              <select v-model="localData.registeredOfficeProvince" class="input-modern w-full appearance-none">
                <option value="">Select province...</option>
                <option value="AB">Alberta</option>
                <option value="BC">British Columbia</option>
                <option value="MB">Manitoba</option>
                <option value="NB">New Brunswick</option>
                <option value="NL">Newfoundland and Labrador</option>
                <option value="NS">Nova Scotia</option>
                <option value="NT">Northwest Territories</option>
                <option value="NU">Nunavut</option>
                <option value="ON">Ontario</option>
                <option value="PE">Prince Edward Island</option>
                <option value="QC">Quebec</option>
                <option value="SK">Saskatchewan</option>
                <option value="YT">Yukon</option>
              </select>
            </div>
            <div v-if="isCBCA">
              <label class="block text-xs text-gray-500 mb-1">Records Office Address <span class="text-cyan-400">(CBCA)</span></label>
              <FieldHelper v-bind="h.recordsOfficeAddress" class="mb-1" />
              <input v-model="localData.recordsOfficeAddress" class="input-modern w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Fiscal Year End (MM-DD)</label>
              <FieldHelper v-bind="h.fiscalYearEnd" class="mb-1" />
              <input
                v-model="localData.fiscalYearEnd"
                type="text"
                class="input-modern w-full"
                placeholder="e.g., 12-31"
                pattern="\d{2}-\d{2}"
                :class="localData.fiscalYearEnd && !isValidFiscalYearEnd(localData.fiscalYearEnd) ? 'border-red-500/60' : ''"
              />
              <p v-if="localData.fiscalYearEnd && !isValidFiscalYearEnd(localData.fiscalYearEnd)" class="text-red-400 text-xs mt-1">
                Must be in MM-DD format (e.g., 12-31).
              </p>
            </div>
            <div class="mt-4">
              <FieldHelper v-bind="h.corporateFlags" class="mb-2" />
              <div class="flex flex-wrap gap-6 text-sm">
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="localData.requiresUSA" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Unanimous Shareholders' Agreement</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="localData.requiresS85Rollover" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> s.85 ITA Rollover</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="localData.isReportingIssuer" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Reporting Issuer</label>
              </div>
            </div>
          </div>
        </section>
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
    buildClassTotals,
    isPoBoxAddress,
    isValidEmail,
    isValidFiscalYearEnd,
    normalizeText,
    validateIncorpSection,
} from '../../utils/incorpRules';
import {
    type DraftNumber,
    type ShareholderDraft,
    type StructureOwnershipDraft,
    hasClassWithCoreRights,
    normalizeDisplayDraft,
    reconcileDirectorConsents,
    reconcileSubscriptionAgreements,
    serializeStructureOwnershipDraft,
    syncShareholderClassSelection,
} from '../../utils/incorpStructureOwnership';

const h = incorpHelpers.structureOwnership;

const store = useIncorpIntakeStore();
const isLoading = ref(true);

const jurisdiction = computed(() => store.incorpData.preIncorporation?.jurisdiction);
const isCBCA = computed(() => jurisdiction.value === 'cbca');

const localData = reactive<StructureOwnershipDraft>(normalizeDisplayDraft(undefined, jurisdiction.value));

const definedShareClasses = computed(() =>
    localData.shareClasses
        .map((shareClass) => ({
            id: shareClass.id,
            className: normalizeText(shareClass.className),
            maxShares: shareClass.maxShares,
        }))
        .filter((shareClass) => !!shareClass.className)
);

const serializedStructure = computed(() => serializeStructureOwnershipDraft(localData, jurisdiction.value));
const hasCoreRightsClass = computed(() => hasClassWithCoreRights(localData.shareClasses));

const buildStepData = () => {
    const structureOwnership = serializedStructure.value;
    const existingShareIssuance = store.incorpData.shareIssuance || {};
    const existingPostIncorp = store.incorpData.postIncorpOrg || {};

    return {
        structureOwnership,
        shareIssuance: {
            ...existingShareIssuance,
            subscriptionAgreements: reconcileSubscriptionAgreements(
                structureOwnership.initialShareholders || [],
                existingShareIssuance.subscriptionAgreements
            ),
        },
        postIncorpOrg: {
            ...existingPostIncorp,
            directorConsents: reconcileDirectorConsents(
                structureOwnership.directors || [],
                existingPostIncorp.directorConsents
            ),
        },
    };
};

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

const toNumber = (value: DraftNumber) => (typeof value === 'number' ? value : 0);

const isInvalidMaxShares = (value: DraftNumber) =>
    value !== '' && (!Number.isInteger(value) || value < 0);

const isInvalidShareCount = (value: DraftNumber) =>
    value === '' || !Number.isInteger(value) || value < 1;

const isInvalidConsiderationAmount = (value: DraftNumber) =>
    typeof value === 'number' && value < 0;

const isInvalidOptionalEmail = (email?: string) =>
    !!normalizeText(email) && !isValidEmail(email);

const totalSharesIssued = computed(() =>
    localData.initialShareholders.reduce((sum, shareholder) => sum + toNumber(shareholder.numberOfShares), 0)
);

const isDuplicateClassName = (name: string, index: number) =>
    localData.shareClasses.some((shareClass, currentIndex) =>
        currentIndex !== index
        && normalizeText(shareClass.className).toLowerCase() === normalizeText(name).toLowerCase()
        && normalizeText(name) !== ''
    );

const shareholderClassName = (shareholder: ShareholderDraft) =>
    definedShareClasses.value.find((shareClass) => shareClass.id === shareholder.shareClassId)?.className
    || normalizeText(shareholder.shareClass)
    || 'this class';

const syncShareholderClass = (shareholder: ShareholderDraft) => {
    syncShareholderClassSelection(shareholder, localData.shareClasses);
};

const sharesExceedMax = (shareholder: ShareholderDraft) => {
    const totals = buildClassTotals(
        serializedStructure.value.shareClasses,
        serializedStructure.value.initialShareholders
    );
    const key = normalizeText(shareholder.shareClassId) || normalizeText(shareholder.shareClass).toLowerCase();
    const match = totals.find((entry) => entry.key === key);
    return !!(match?.shareClass.maxShares && match.totalIssued > match.shareClass.maxShares);
};

const residencyWarning = computed(() => {
    if (!isCBCA.value || localData.directors.length === 0) return null;

    const residentCount = localData.directors.filter((director) => director.isCanadianResident).length;
    if (localData.directors.length < 4 && residentCount < 1) {
        return 'CBCA requires at least 1 director to be a resident Canadian when there are fewer than 4 directors.';
    }
    if (localData.directors.length >= 4 && residentCount / localData.directors.length < 0.25) {
        return `CBCA requires at least 25% of directors to be resident Canadians. Currently ${residentCount} of ${localData.directors.length}.`;
    }
    return null;
});

const addShareClass = () => {
    localData.shareClasses.push({
        id: `share_class_${Math.random().toString(36).slice(2, 10)}`,
        className: '',
        votingRights: true,
        dividendRights: true,
        liquidationRights: true,
        redeemable: false,
        retractable: false,
        maxShares: 0,
    });
};

const addShareholder = () => {
    localData.initialShareholders.push({
        id: `shareholder_${Math.random().toString(36).slice(2, 10)}`,
        fullName: '',
        email: '',
        shareClassId: '',
        shareClass: '',
        numberOfShares: 1,
        considerationType: 'cash',
        considerationAmount: 0,
    });
};

const addDirector = () => {
    localData.directors.push({
        id: `director_${Math.random().toString(36).slice(2, 10)}`,
        fullName: '',
        address: '',
        isCanadianResident: true,
    });
};

const removeShareClass = (index: number) => {
    const shareClass = localData.shareClasses[index];
    const name = shareClass?.className || 'this share class';
    if (!window.confirm(`Remove '${name}'? This will also clear linked shareholder references.`)) return;

    if (shareClass?.id) {
        localData.initialShareholders.forEach((shareholder) => {
            if (shareholder.shareClassId === shareClass.id) {
                shareholder.shareClassId = '';
                shareholder.shareClass = '';
            }
        });
    }

    localData.shareClasses.splice(index, 1);
};

const removeShareholder = (index: number) => {
    const shareholderName = normalizeText(localData.initialShareholders[index]?.fullName) || 'this shareholder';
    if (!window.confirm(`Remove ${shareholderName}? This also updates the staged subscription agreements.`)) return;
    localData.initialShareholders.splice(index, 1);
};

const removeDirector = (index: number) => {
    const directorName = normalizeText(localData.directors[index]?.fullName) || 'this director';
    if (!window.confirm(`Remove ${directorName}? This also updates the staged director consents.`)) return;
    localData.directors.splice(index, 1);
};

const validateLocal = () => validateIncorpSection('structureOwnership', {
    ...store.incorpData,
    ...buildStepData(),
} as any);

onMounted(() => {
    Object.assign(localData, normalizeDisplayDraft(store.incorpData.structureOwnership, jurisdiction.value));
    isLoading.value = false;
    markInitialized();
});

watch(jurisdiction, (value) => {
    if (value === 'obca' && !normalizeText(localData.registeredOfficeProvince)) {
        localData.registeredOfficeProvince = 'ON';
    }
});

watch(localData, () => {
    scheduleSave();
}, { deep: true });

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
