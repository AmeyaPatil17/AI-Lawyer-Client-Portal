<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="3" :rows="2" />
  <div v-else role="region" aria-label="Share Issuance">
    <div>
      <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Share Issuance</h2>
      <p class="text-gray-400 mb-8">Prepare and track share subscriptions, certificates, and the securities register.</p>

      <div v-if="currentShareholders.length === 0" class="card-glass p-4 rounded-xl border border-amber-700/50 mb-6 flex items-start gap-3">
        <span class="text-amber-400 text-xl">!</span>
        <div>
          <p class="text-amber-300 text-sm font-semibold">No shareholders defined yet.</p>
          <p class="text-gray-400 text-xs mt-1">Return to Step 2 - Structure &amp; Ownership to add shareholders. They will appear here automatically.</p>
        </div>
      </div>

      <div class="space-y-6">
        <section class="card-glass p-6 rounded-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-100">Subscription Agreements</h3>
            <button @click="syncSubscriptionAgreements" type="button" class="text-sm text-emerald-400 hover:text-emerald-300">Sync Shareholders</button>
          </div>
          <p class="text-xs text-gray-500 mb-4 flex items-center gap-1">
            <span class="text-yellow-400">!</span> Future services are not valid consideration under OBCA or CBCA.
          </p>

          <div v-for="agreement in localData.subscriptionAgreements" :key="agreement.id" class="bg-gray-800/50 rounded-lg p-4 mb-3">
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Subscriber Name</label>
                <input :value="agreement.subscriberName" class="input-modern w-full opacity-70" readonly />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Share Class</label>
                <input :value="agreement.shareClass" class="input-modern w-full opacity-70" readonly />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Number of Shares</label>
                <input :value="agreement.numberOfShares" type="number" class="input-modern w-full opacity-70" readonly />
                <p v-if="sharesExceedClassMax(agreement)" class="text-red-400 text-xs mt-1">
                  Exceeds max shares for {{ agreement.shareClass }}.
                </p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Consideration Type</label>
                <input :value="formatConsideration(agreement.considerationType)" class="input-modern w-full opacity-70" readonly />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Consideration Amount ($)</label>
                <FieldHelper v-bind="h.considerationAmount" class="mb-1" />
                <input v-model.number="agreement.considerationAmount" type="number" min="0" step="0.01" class="input-modern w-full" placeholder="0.00" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Subscriber Address <span class="text-gray-600 font-normal normal-case">(required for register)</span></label>
                <FieldHelper v-bind="h.subscriberAddress" class="mb-1" />
                <input v-model="agreement.subscriberAddress" class="input-modern w-full" placeholder="Full mailing address" />
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="flex items-center gap-2 cursor-pointer text-sm">
                  <input v-model="agreement.agreementExecuted" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                  Agreement Executed
                </label>
                <FieldHelper v-bind="h.agreementExecuted" class="mt-2" />
              </div>
              <span class="text-xs text-gray-500">Managed from Step 2</span>
            </div>
          </div>
        </section>

        <section class="card-glass p-6 rounded-xl">
          <h3 class="text-lg font-semibold text-gray-100 mb-4">Certificates &amp; Register</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Certificate Type <span class="text-red-400">*</span></label>
              <FieldHelper v-bind="h.certificateType" class="mb-2" />
              <div class="flex gap-4">
                <button
                  @click="localData.certificateType = 'certificated'"
                  type="button"
                  class="flex-1 py-2 rounded-lg border text-sm transition-all"
                  :class="localData.certificateType === 'certificated' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800/40 border-gray-700 text-gray-400'"
                >
                  Certificated
                </button>
                <button
                  @click="localData.certificateType = 'uncertificated'"
                  type="button"
                  class="flex-1 py-2 rounded-lg border text-sm transition-all"
                  :class="localData.certificateType === 'uncertificated' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800/40 border-gray-700 text-gray-400'"
                >
                  Uncertificated
                </button>
              </div>
              <p v-if="!localData.certificateType" class="text-amber-400 text-xs mt-1">Please select a certificate type.</p>
            </div>
            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="localData.securitiesRegisterComplete" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">Securities register complete (name, address, date, class, number per holder)</span>
              </label>
              <FieldHelper v-bind="h.securitiesRegisterComplete" class="ml-7 mt-1" />
            </div>
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="localData.considerationCollected" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300">Consideration collected from all shareholders</span>
            </label>
            <div v-if="requiresS85">
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="localData.s85DocumentsComplete" type="checkbox" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">Section 85 rollover documentation complete</span>
              </label>
              <FieldHelper v-bind="h.s85Documents" class="ml-7 mt-1" />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, computed, ref } from 'vue';
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import { useIncorpStepSave } from '../../composables/useIncorpStepSave';
import IncorpStepSkeleton from '../../components/incorporation/IncorpStepSkeleton.vue';
import FieldHelper from '../../components/incorporation/FieldHelper.vue';
import { incorpHelpers } from '../../utils/incorpFieldHelpers';

const h = incorpHelpers.shareIssuance;
import { buildClassTotals, normalizeText, validateIncorpSection } from '../../utils/incorpRules';
import { reconcileSubscriptionAgreements } from '../../utils/incorpStructureOwnership';

type SubscriptionAgreementRow = {
    id: string;
    shareholderId?: string;
    subscriberName: string;
    shareClass?: string;
    shareClassId?: string;
    numberOfShares?: number;
    considerationType?: 'cash' | 'property' | 'past_services';
    considerationAmount?: number;
    agreementExecuted?: boolean;
    subscriberAddress?: string;
};

const store = useIncorpIntakeStore();
const isLoading = ref(true);

const currentShareholders = computed(() => store.incorpData.structureOwnership?.initialShareholders || []);
const requiresS85 = computed(() => store.incorpData.structureOwnership?.requiresS85Rollover || false);

const localData = reactive({
    subscriptionAgreements: [] as SubscriptionAgreementRow[],
    certificateType: '' as 'certificated' | 'uncertificated' | '',
    securitiesRegisterComplete: false,
    considerationCollected: false,
    s85DocumentsComplete: false,
});

const syncSubscriptionAgreements = () => {
    localData.subscriptionAgreements = reconcileSubscriptionAgreements(
        currentShareholders.value as any[],
        localData.subscriptionAgreements
    ).map((agreement) => ({
        ...agreement,
        shareClass: agreement.shareClass || '',
        subscriberAddress: agreement.subscriberAddress || '',
    }));
};

const buildStepData = () => ({
    shareIssuance: {
        subscriptionAgreements: localData.subscriptionAgreements.map((agreement) => ({
            ...agreement,
            subscriberName: normalizeText(agreement.subscriberName),
            shareClass: agreement.shareClass || undefined,
            subscriberAddress: normalizeText(agreement.subscriberAddress) || undefined,
        })),
        certificateType: localData.certificateType || undefined,
        securitiesRegisterComplete: localData.securitiesRegisterComplete,
        considerationCollected: localData.considerationCollected,
        s85DocumentsComplete: requiresS85.value ? localData.s85DocumentsComplete : false,
    }
});

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

const sharesExceedClassMax = (agreement: SubscriptionAgreementRow) => {
    const classes = store.incorpData.structureOwnership?.shareClasses || [];
    const totals = buildClassTotals(classes, localData.subscriptionAgreements);
    const key = agreement.shareClassId || agreement.shareClass;
    const match = totals.find((entry) => entry.key === key);
    return !!(match?.shareClass.maxShares && match.totalIssued > match.shareClass.maxShares);
};

const formatConsideration = (type?: string) => {
    const map: Record<string, string> = {
        cash: 'Cash',
        property: 'Property',
        past_services: 'Past Services',
    };
    return type ? (map[type] || type) : '';
};

const validateLocal = () => {
    return validateIncorpSection('shareIssuance', {
        ...store.incorpData,
        ...buildStepData(),
    } as any);
};

onMounted(() => {
    const issuance = store.incorpData.shareIssuance;
    if (issuance) {
        localData.certificateType = issuance.certificateType || '';
        localData.securitiesRegisterComplete = issuance.securitiesRegisterComplete || false;
        localData.considerationCollected = issuance.considerationCollected || false;
        localData.s85DocumentsComplete = issuance.s85DocumentsComplete || false;
        localData.subscriptionAgreements = (issuance.subscriptionAgreements || []).map((agreement: any) => ({
            ...JSON.parse(JSON.stringify(agreement)),
            subscriberAddress: agreement.subscriberAddress || '',
        }));
    }

    syncSubscriptionAgreements();

    isLoading.value = false;
    markInitialized();
});

watch(currentShareholders, () => {
    syncSubscriptionAgreements();
}, { deep: true });

watch(requiresS85, (value) => {
    if (!value) {
        localData.s85DocumentsComplete = false;
    }
});

watch(() => JSON.stringify(localData), () => scheduleSave());

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
