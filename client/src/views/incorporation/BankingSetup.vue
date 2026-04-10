<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="4" :rows="2" />
  <div v-else role="region" aria-label="Banking &amp; Compliance">
  <div>
    <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Banking &amp; Compliance</h2>
    <p class="text-gray-400 mb-8">Complete the banking setup, corporate seal, and ongoing compliance obligations.</p>

    <div class="space-y-6">
      <!-- Banking -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Corporate Banking</h3>
        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.bankAccountOpened" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Corporate bank account opened</span>
          </label>
          <FieldHelper v-bind="h.bankAccount" class="ml-7 mt-1 mb-2" />
          <div v-if="localData.bankAccountOpened">
            <label class="block text-xs text-gray-500 mb-1">Bank Name</label>
            <FieldHelper v-bind="h.bankName" class="mb-1" />
            <!-- Gap 5: Structured dropdown instead of free-text -->
            <select v-model="localData.bankName" class="input-modern w-full appearance-none">
              <option value="">Select bank...</option>
              <option>RBC Royal Bank</option>
              <option>TD Canada Trust</option>
              <option>BMO Bank of Montreal</option>
              <option>Scotiabank</option>
              <option>CIBC</option>
              <option>National Bank</option>
              <option>Desjardins</option>
              <option>HSBC Canada</option>
              <option>EQ Bank</option>
              <option>Other</option>
            </select>
            <div v-if="localData.bankName === 'Other'" class="mt-2">
              <FieldHelper v-bind="h.bankNameOther" class="mb-1" />
              <input v-model="localData.bankNameOther" class="input-modern w-full" placeholder="Enter bank name..." />
            </div>
          </div>
        </div>
      </section>

      <!-- Corporate Setup -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Corporate Setup</h3>
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.corporateSealObtained" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Corporate seal obtained (optional but recommended)</span>
          </label>
          <FieldHelper v-bind="h.corporateSeal" class="ml-7 mt-1 mb-2" />
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.shareCertificatesOrdered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Share certificates ordered / issued</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.minuteBookSetup" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Minute book set up and organized</span>
          </label>
        </div>
      </section>

      <!-- Professional Advisors -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Professional Advisors</h3>
        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.accountantEngaged" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Accountant / bookkeeper engaged</span>
          </label>
          <div v-if="localData.accountantEngaged">
            <label class="block text-xs text-gray-500 mb-1">Accountant Name / Firm</label>
            <input v-model="localData.accountantName" class="input-modern w-full" placeholder="e.g., John Smith CPA" />
          </div>
        </div>
      </section>

      <!-- Insurance & Risk -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Insurance &amp; Risk Management</h3>
        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.insuranceObtained" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Business insurance obtained</span>
          </label>
          <FieldHelper v-bind="h.insurance" class="ml-7 mt-1 mb-2" />
          <div v-if="localData.insuranceObtained">
            <label class="block text-xs text-gray-500 mb-2">Insurance Types</label>
            <FieldHelper v-bind="h.insuranceTypes" class="mb-2" />
            <div class="grid grid-cols-2 gap-2 text-sm">
              <label v-for="ins in insuranceTypes" :key="ins" class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :value="ins" v-model="localData.insuranceTypes" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">{{ ins }}</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- Intellectual Property -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Intellectual Property &amp; Agreements</h3>
        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.trademarksRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Trademarks / IP registered or in process</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.agreementsDrafted" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Key commercial agreements drafted</span>
          </label>
          <FieldHelper v-bind="h.agreements" class="ml-7 mt-1 mb-2" />
          <div v-if="localData.agreementsDrafted">
            <label class="block text-xs text-gray-500 mb-2">Agreement Types</label>
            <FieldHelper v-bind="h.agreementTypes" class="mb-2" />
            <div class="grid grid-cols-2 gap-2 text-sm">
              <label v-for="ag in agreementTypes" :key="ag" class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :value="ag" v-model="localData.agreementTypes" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">{{ ag }}</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, ref, computed } from 'vue';
import { useIncorpIntakeStore } from '../../stores/incorpIntake';
import { useIncorpStepSave } from '../../composables/useIncorpStepSave';
import IncorpStepSkeleton from '../../components/incorporation/IncorpStepSkeleton.vue';
import FieldHelper from '../../components/incorporation/FieldHelper.vue';
import { incorpHelpers } from '../../utils/incorpFieldHelpers';

const h = incorpHelpers.bankingSetup;
import { normalizeText, validateIncorpSection } from '../../utils/incorpRules';

const store = useIncorpIntakeStore();
const isLoading = ref(true); // X4

const insuranceTypes = ['General Liability', 'Professional Liability (E&O)', 'Cyber Liability', "Directors' & Officers' (D&O)", 'Commercial Property', 'Business Interruption'];
const agreementTypes = ['Shareholder Agreement', 'Employment Agreements', 'NDAs', 'Customer/Client Agreements', 'Supplier Agreements', 'IP Assignment'];
const bankOptions = ['RBC Royal Bank', 'TD Canada Trust', 'BMO Bank of Montreal', 'Scotiabank', 'CIBC', 'National Bank', 'Desjardins', 'HSBC Canada', 'EQ Bank'] as const;

const localData = reactive({
    bankAccountOpened: false,
    bankName: '',
    bankNameOther: '',
    corporateSealObtained: false,
    shareCertificatesOrdered: false,
    minuteBookSetup: false,
    accountantEngaged: false,
    accountantName: '',
    insuranceObtained: false,
    insuranceTypes: [] as string[],
    trademarksRegistered: false,
    agreementsDrafted: false,
    agreementTypes: [] as string[],
});

const certificateType = computed(() => store.incorpData.shareIssuance?.certificateType || '');
const minuteBookReady = computed(() => store.incorpData.corporateRecords?.recordsLocationConfirmed || false);

const buildStepData = () => ({
    bankingSetup: {
        bankAccountOpened: localData.bankAccountOpened,
        bankName: localData.bankAccountOpened
            ? (localData.bankName === 'Other'
                ? normalizeText(localData.bankNameOther)
                : normalizeText(localData.bankName)) || undefined
            : undefined,
        corporateSealObtained: localData.corporateSealObtained,
        shareCertificatesOrdered: certificateType.value === 'certificated' ? localData.shareCertificatesOrdered : false,
        minuteBookSetup: localData.minuteBookSetup || minuteBookReady.value,
        accountantEngaged: localData.accountantEngaged,
        accountantName: localData.accountantEngaged ? normalizeText(localData.accountantName) || undefined : undefined,
        insuranceObtained: localData.insuranceObtained,
        insuranceTypes: localData.insuranceObtained && localData.insuranceTypes.length ? [...localData.insuranceTypes] : undefined,
        trademarksRegistered: localData.trademarksRegistered,
        agreementsDrafted: localData.agreementsDrafted,
        agreementTypes: localData.agreementsDrafted && localData.agreementTypes.length ? [...localData.agreementTypes] : undefined,
    }
});

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

const validateLocal = () => {
    return validateIncorpSection('bankingSetup', {
        ...store.incorpData,
        ...buildStepData(),
    } as any);
};

onMounted(() => {
    const bs = store.incorpData.bankingSetup;
    if (bs) {
        localData.bankAccountOpened = bs.bankAccountOpened || false;
        const savedBankName = normalizeText(bs.bankName || '');
        if (savedBankName === 'Other') {
            localData.bankName = 'Other';
            localData.bankNameOther = '';
        } else if (savedBankName && !(bankOptions as readonly string[]).includes(savedBankName)) {
            localData.bankName = 'Other';
            localData.bankNameOther = savedBankName;
        } else {
            localData.bankName = savedBankName;
            localData.bankNameOther = '';
        }
        localData.corporateSealObtained = bs.corporateSealObtained || false;
        localData.shareCertificatesOrdered = bs.shareCertificatesOrdered || false;
        localData.minuteBookSetup = bs.minuteBookSetup || false;
        localData.accountantEngaged = bs.accountantEngaged || false;
        localData.accountantName = bs.accountantName || '';
        localData.insuranceObtained = bs.insuranceObtained || false;
        localData.insuranceTypes = [...(bs.insuranceTypes || [])];
        localData.trademarksRegistered = bs.trademarksRegistered || false;
        localData.agreementsDrafted = bs.agreementsDrafted || false;
        localData.agreementTypes = [...(bs.agreementTypes || [])];
    }
    if (certificateType.value === 'uncertificated') {
        localData.shareCertificatesOrdered = false;
    }
    if (!localData.minuteBookSetup && minuteBookReady.value) {
        localData.minuteBookSetup = true;
    }
    isLoading.value = false; // X4
    markInitialized(); // X1
});

watch(() => JSON.stringify(localData), () => scheduleSave());

watch(() => localData.bankAccountOpened, (value) => {
    if (!value) {
        localData.bankName = '';
        localData.bankNameOther = '';
    }
});

watch(() => localData.bankName, (value) => {
    if (value !== 'Other') {
        localData.bankNameOther = '';
    }
});

watch(() => localData.accountantEngaged, (value) => {
    if (!value) {
        localData.accountantName = '';
    }
});

watch(() => localData.insuranceObtained, (value) => {
    if (!value) {
        localData.insuranceTypes = [];
    }
});

watch(() => localData.agreementsDrafted, (value) => {
    if (!value) {
        localData.agreementTypes = [];
    }
});

watch(certificateType, (value) => {
    if (value === 'uncertificated') {
        localData.shareCertificatesOrdered = false;
    }
});

watch(minuteBookReady, (value) => {
    if (value) {
        localData.minuteBookSetup = true;
    }
});

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
