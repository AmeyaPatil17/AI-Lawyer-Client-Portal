<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="3" :rows="4" />
  <div v-else role="region" aria-label="Registrations &amp; Filings">
  <div>
    <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Registrations &amp; Filings</h2>
    <p class="text-gray-400 mb-8">Track government registrations and post-incorporation filings.</p>
    <div class="space-y-6">

      <!-- CRA Business Registration -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">CRA Business Registration</h3>
        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.craRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">CRA Business Number obtained</span>
          </label>
          <FieldHelper v-bind="h.craBusinessNumber" class="ml-7 mt-1" />
          <div v-if="localData.craRegistered" class="ml-7 space-y-3">
            <div>
              <label for="craBusinessNumber" class="block text-xs text-gray-500 mb-1">Business Number (BN)</label>
              <!-- Gap 13: Added id attribute; R1: BN format validation -->
              <input id="craBusinessNumber" v-model="localData.craBusinessNumber" class="input-modern w-full" placeholder="123456789"
                :class="localData.craBusinessNumber && !isValidBN(localData.craBusinessNumber) ? 'border-red-500/60' : ''" />
              <p v-if="localData.craBusinessNumber && !isValidBN(localData.craBusinessNumber)" class="text-red-400 text-xs mt-1">
                Invalid BN format. Expected format: 123456789.
              </p>
            </div>
          </div>

          <label class="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" v-model="localData.hstGstRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">HST/GST registered</span>
          </label>
          <FieldHelper v-bind="h.hstGstRegistered" class="ml-7 mt-1 mb-2" />
          <!-- Gap 4: Inline HST/GST format validation -->
          <div v-if="localData.hstGstRegistered" class="ml-7">
            <label class="block text-xs text-gray-500 mb-1">HST/GST Account Number</label>
            <input v-model="localData.hstGstNumber" class="input-modern w-full" placeholder="123456789RT0001"
              :class="localData.hstGstNumber && !isValidRT(localData.hstGstNumber) ? 'border-red-500/60' : ''" />
            <p v-if="localData.hstGstNumber && !isValidRT(localData.hstGstNumber)" class="text-red-400 text-xs mt-1">
              Invalid format. Expected: 123456789RT0001
            </p>
            <p class="text-xs text-gray-500 mt-1">ℹ️ HST/GST registration is generally required when annual taxable supplies exceed $30,000.</p>
          </div>

          <label class="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" v-model="localData.payrollAccountRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Payroll deductions (RP) registered</span>
          </label>
          <FieldHelper v-bind="h.payroll" class="ml-7 mt-1 mb-2" />
          <!-- Gap 4: Inline payroll format validation -->
          <div v-if="localData.payrollAccountRegistered" class="ml-7">
            <label class="block text-xs text-gray-500 mb-1">Payroll Account Number (RP)</label>
            <input v-model="localData.payrollAccountNumber" class="input-modern w-full" placeholder="123456789RP0001"
              :class="localData.payrollAccountNumber && !isValidRP(localData.payrollAccountNumber) ? 'border-red-500/60' : ''" />
            <p v-if="localData.payrollAccountNumber && !isValidRP(localData.payrollAccountNumber)" class="text-red-400 text-xs mt-1">
              Invalid format. Expected: 123456789RP0001
            </p>
          </div>

          <label class="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" v-model="localData.importExportRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Import/export account (if applicable)</span>
          </label>
          <FieldHelper v-bind="h.importExport" class="ml-7 mt-1 mb-2" />
        </div>
      </section>

      <!-- Provincial & Municipal -->
      <section class="card-glass p-6 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Provincial &amp; Municipal</h3>
        <div class="space-y-3">
          <!-- R2: BNA registration applies to OBCA corps AND CBCA corps operating in Ontario under a trade name -->
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.businessNameRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Business Names Act registration (trade name)
              <span class="text-xs text-gray-500">{{ isCBCA ? '— required if operating in Ontario under a trade name' : '— required for any name other than your exact corporate name' }}</span>
            </span>
          </label>
          <FieldHelper v-bind="h.bnaRegistration" class="ml-7 mt-1" />
          <!-- Gap 16: BNA 5-year renewal reminder -->
          <p v-if="localData.businessNameRegistered" class="text-xs text-cyan-400/80 ml-7 mt-1">
            ℹ️ Business name registrations expire after 5 years and must be renewed to stay active.
          </p>
          <label v-if="isCBCA" class="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" v-model="localData.extraProvincialRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Extra-provincial registration (for provinces where business is conducted)</span>
          </label>
          <FieldHelper v-if="isCBCA" v-bind="h.extraProvincial" class="ml-7 mt-1 mb-2" />
          <!-- R7: Multi-province extra-provincial registration -->
          <div v-if="isCBCA && localData.extraProvincialRegistered" class="ml-7">
            <label class="block text-xs text-gray-500 mb-2">Provinces Registered In</label>
            <FieldHelper v-bind="h.extraProvincialProvinces" class="mb-2" />
            <div class="grid grid-cols-2 gap-2 text-sm">
              <label v-for="prov in canadianProvinces" :key="prov.code" class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :value="prov.code" v-model="localData.extraProvincialProvinces" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
                <span class="text-gray-300">{{ prov.name }}</span>
              </label>
            </div>
          </div>

          <label class="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" v-model="localData.wsibRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">WSIB account</span>
          </label>
          <FieldHelper v-bind="h.wsib" class="ml-7 mt-1 mb-2" />
          <!-- R6: WSIB account number -->
          <div v-if="localData.wsibRegistered" class="ml-7">
            <label class="block text-xs text-gray-500 mb-1">WSIB Account Number</label>
            <FieldHelper v-bind="h.wsibAccountNumber" class="mb-1" />
            <input v-model="localData.wsibAccountNumber" class="input-modern w-full" placeholder="WSIB account number" />
          </div>

          <label class="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" v-model="localData.ehtRegistered" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Employer Health Tax (EHT)</span>
          </label>
          <FieldHelper v-bind="h.eht" class="ml-7 mt-1 mb-2" />
          <!-- Use isOBCA to qualify EHT guidance -->
          <p v-if="isOBCA || isCBCA" class="text-xs text-gray-500 ml-7">ℹ️ Ontario EHT applies when total Ontario payroll exceeds $1,000,000 annually.</p>
        </div>
      </section>

      <!-- R8: Municipal Licences -->
      <section class="card-glass p-6 rounded-xl">
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-lg font-semibold text-gray-100">Municipal Licences</h3>
          <button @click="addMunicipalLicence" class="text-sm text-emerald-400 hover:text-emerald-300">+ Add Licence</button>
        </div>
        <FieldHelper v-bind="h.municipalLicences" class="mb-3" />
        <p class="text-xs text-gray-500 mb-3">Some businesses require municipal or regional licences in addition to provincial/federal registrations.</p>
        <div v-for="(lic, i) in localData.municipalLicences" :key="lic.id" class="bg-gray-800/50 rounded-lg p-4 mb-3">
          <div class="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Municipality</label>
              <input v-model="lic.municipality" class="input-modern w-full" placeholder="e.g., City of Toronto" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Licence Type</label>
              <input v-model="lic.licenceType" class="input-modern w-full" placeholder="e.g., Business Licence" />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" v-model="lic.obtained" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /> Obtained
            </label>
            <button @click="localData.municipalLicences.splice(i, 1)" class="text-red-400 hover:text-red-300 text-xs">✕ Remove</button>
          </div>
        </div>
        <p v-if="!localData.municipalLicences.length" class="text-xs text-gray-500 italic">No municipal licences added.</p>
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

const h = incorpHelpers.registrations;
import { isValidBusinessNumber, isValidProgramAccount, normalizeText, validateIncorpSection } from '../../utils/incorpRules';

const store = useIncorpIntakeStore();
const isLoading = ref(true); // X4
const isOBCA = computed(() => store.incorpData.preIncorporation?.jurisdiction === 'obca');
const isCBCA = computed(() => store.incorpData.preIncorporation?.jurisdiction === 'cbca');

// R1: BN format validation
const isValidBN = (bn: string) => isValidBusinessNumber(bn);
// Gap 4: Program account format validation
const isValidRT = (val: string) => isValidProgramAccount(val, 'RT');
const isValidRP = (val: string) => isValidProgramAccount(val, 'RP');

const canadianProvinces = [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'YT', name: 'Yukon' },
];

const localData = reactive({
    craBusinessNumber: '',
    craRegistered: false,
    hstGstRegistered: false,
    hstGstNumber: '',
    payrollAccountRegistered: false,
    payrollAccountNumber: '',
    importExportRegistered: false,
    businessNameRegistered: false,
    extraProvincialRegistered: false,
    extraProvincialProvinces: [] as string[],
    wsibRegistered: false,
    wsibAccountNumber: '',
    ehtRegistered: false,
    municipalLicences: [] as Array<{ id: string; municipality: string; licenceType: string; obtained: boolean }>,
});

const buildStepData = () => ({
    registrations: {
        craRegistered: localData.craRegistered,
        craBusinessNumber: localData.craRegistered ? normalizeText(localData.craBusinessNumber) || undefined : undefined,
        hstGstRegistered: localData.hstGstRegistered,
        hstGstNumber: localData.hstGstRegistered ? normalizeText(localData.hstGstNumber) || undefined : undefined,
        payrollAccountRegistered: localData.payrollAccountRegistered,
        payrollAccountNumber: localData.payrollAccountRegistered ? normalizeText(localData.payrollAccountNumber) || undefined : undefined,
        importExportRegistered: localData.importExportRegistered,
        businessNameRegistered: localData.businessNameRegistered,
        extraProvincialRegistered: isCBCA.value ? localData.extraProvincialRegistered : false,
        extraProvincialProvinces: isCBCA.value && localData.extraProvincialRegistered && localData.extraProvincialProvinces.length
            ? [...localData.extraProvincialProvinces]
            : undefined,
        wsibRegistered: localData.wsibRegistered,
        wsibAccountNumber: localData.wsibRegistered ? normalizeText(localData.wsibAccountNumber) || undefined : undefined,
        ehtRegistered: localData.ehtRegistered,
        municipalLicences: localData.municipalLicences.length
            ? localData.municipalLicences.map((licence) => ({
                id: licence.id,
                municipality: normalizeText(licence.municipality),
                licenceType: normalizeText(licence.licenceType) || undefined,
                obtained: licence.obtained,
            }))
            : undefined,
    }
});

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

// R8: add municipal licence
const addMunicipalLicence = () => {
    localData.municipalLicences.push({
        id: `municipal_licence_${Math.random().toString(36).slice(2, 10)}`,
        municipality: '',
        licenceType: '',
        obtained: false,
    });
};

const validateLocal = () => {
    return validateIncorpSection('registrations', {
        ...store.incorpData,
        ...buildStepData(),
    } as any);
};

// R10: Expanded onMounted (was a one-liner)
onMounted(() => {
    const r = store.incorpData.registrations;
    // R3: explicit field hydration
    if (r) {
        localData.craBusinessNumber = r.craBusinessNumber || '';
        localData.craRegistered = r.craRegistered || false;
        localData.hstGstRegistered = r.hstGstRegistered || false;
        localData.hstGstNumber = r.hstGstNumber || '';
        localData.payrollAccountRegistered = r.payrollAccountRegistered || false;
        localData.payrollAccountNumber = r.payrollAccountNumber || '';
        localData.importExportRegistered = r.importExportRegistered || false;
        localData.businessNameRegistered = r.businessNameRegistered || false;
        localData.extraProvincialRegistered = r.extraProvincialRegistered || false;
        localData.extraProvincialProvinces = [...(r.extraProvincialProvinces || [])];
        localData.wsibRegistered = r.wsibRegistered || false;
        localData.wsibAccountNumber = r.wsibAccountNumber || '';
        localData.ehtRegistered = r.ehtRegistered || false;
        // R8: hydrate municipal licences
        localData.municipalLicences = (r.municipalLicences || []).map((l: any) => ({
            id: l.id || `municipal_licence_${Math.random().toString(36).slice(2, 10)}`,
            municipality: l.municipality || '',
            licenceType: l.licenceType || '',
            obtained: l.obtained || false,
        }));
    }
    isLoading.value = false; // X4
    markInitialized(); // X1
});

watch(() => JSON.stringify(localData), () => scheduleSave());

watch(() => localData.craRegistered, (value) => {
    if (!value) {
        localData.craBusinessNumber = '';
    }
});

watch(() => localData.hstGstRegistered, (value) => {
    if (!value) {
        localData.hstGstNumber = '';
    }
});

watch(() => localData.payrollAccountRegistered, (value) => {
    if (!value) {
        localData.payrollAccountNumber = '';
    }
});

watch(() => localData.wsibRegistered, (value) => {
    if (!value) {
        localData.wsibAccountNumber = '';
    }
});

watch(() => localData.extraProvincialRegistered, (value) => {
    if (!value) {
        localData.extraProvincialProvinces = [];
    }
});

watch(isCBCA, (value) => {
    if (!value) {
        localData.extraProvincialRegistered = false;
        localData.extraProvincialProvinces = [];
    }
});

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
