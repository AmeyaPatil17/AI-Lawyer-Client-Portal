<template>
  <IncorpStepSkeleton v-if="isLoading" :sections="3" :rows="4" />
  <div v-else role="region" aria-label="Corporate Records &amp; Registers">
  <div>
    <h2 class="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-300">Corporate Records &amp; Registers</h2>
    <p class="text-gray-400 mb-8">Confirm all required minute book contents and statutory registers are in place.</p>

    <!-- C4: Progress indicator -->
    <div class="mb-6 bg-gray-800/50 rounded-xl p-4 flex items-center gap-4">
      <div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: completionPercent + '%' }"></div>
      </div>
      <span class="text-sm text-gray-400 shrink-0">{{ checkedCount }} / {{ totalItems }} complete</span>
    </div>

    <div class="space-y-6">
      <section class="card-glass p-6 rounded-xl">
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-lg font-semibold text-gray-100">Minute Book Contents</h3>
          <!-- Gap 17: Select All / Unselect All -->
          <button type="button" @click="toggleMinuteBook" class="text-xs text-emerald-400 hover:text-emerald-300">
            {{ allMinuteBook ? 'Unselect All' : 'Select All' }}
          </button>
        </div>
        <FieldHelper v-bind="h.minuteBookChecklist" class="mb-4" />
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasArticlesAndCertificate" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Articles of Incorporation and Certificate (original or certified copy)</span></label>
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasByLaws" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">By-laws and all amendments</span></label>
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasDirectorMinutes" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Minutes of all directors' meetings</span></label>
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasShareholderMinutes" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Minutes of all shareholders' meetings</span></label>
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasWrittenResolutions" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Copies of all written resolutions (directors &amp; shareholders)</span></label>
        </div>
      </section>

      <section class="card-glass p-6 rounded-xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-100">Statutory Registers</h3>
          <!-- Gap 17: Select All / Unselect All -->
          <button type="button" @click="toggleRegisters" class="text-xs text-emerald-400 hover:text-emerald-300">
            {{ allRegisters ? 'Unselect All' : 'Select All' }}
          </button>
        </div>
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasSecuritiesRegister" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Securities register (shares issued, transferred, cancelled)</span></label>
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasDirectorRegister" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Register of directors (name, address, dates)</span></label>
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" v-model="localData.hasOfficerRegister" class="rounded border-gray-600 bg-gray-800 text-emerald-500" /><span class="text-gray-300">Register of officers</span></label>
          <!-- C13: Only show ISC register for non-reporting issuers -->
          <div v-if="!isReportingIssuer">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="localData.hasISCRegister" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
              <span class="text-gray-300">Register of Individuals with Significant Control (ISC)</span>
            </label>
            <FieldHelper v-bind="h.iscRegister" class="ml-7 mt-1" />
            <p class="text-xs text-cyan-400 ml-7 mt-2">{{ iscNote }}</p>
          </div>
          <!-- C1: Only show USA copy if requiresUSA from Step 2 -->
          <label v-if="requiresUSA" class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="localData.hasUSACopy" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
            <span class="text-gray-300">Copy of Unanimous Shareholders' Agreement</span>
          </label>
        </div>
      </section>

      <!-- C16: Warn if minute book items checked but no certificate received -->
      <div v-if="minuteBookChecked && !certificateReceived" class="bg-amber-500/10 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
        <span class="text-amber-400">⚠️</span>
        <p class="text-amber-300 text-sm">Minute book items are checked, but no Certificate of Incorporation has been received (see Articles step). Ensure the certificate is confirmed before completing records.</p>
      </div>

      <section class="card-glass p-6 rounded-xl">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" v-model="localData.recordsLocationConfirmed" class="rounded border-gray-600 bg-gray-800 text-emerald-500" />
          <span class="text-gray-300 font-medium">Records maintained at registered/records office as required by statute</span>
        </label>
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
import { validateIncorpSection } from '../../utils/incorpRules';

const h = incorpHelpers.corporateRecords;

const isLoading = ref(true); // X4
const store = useIncorpIntakeStore();
const isCBCA = computed(() => store.incorpData.preIncorporation?.jurisdiction === 'cbca');
// C1: cross-step flag
const requiresUSA = computed(() => store.incorpData.structureOwnership?.requiresUSA || false);
// C13: cross-step flag
const isReportingIssuer = computed(() => store.incorpData.structureOwnership?.isReportingIssuer || false);
// C16: Articles certificate check
const certificateReceived = computed(() => store.incorpData.articles?.certificateReceived || false);
const byLawsDrafted = computed(() => store.incorpData.postIncorpOrg?.generalByLawDrafted || false);
const securitiesRegisterReady = computed(() => store.incorpData.shareIssuance?.securitiesRegisterComplete || false);

const iscNote = computed(() => isCBCA.value
    ? 'CBCA s. 21.1 — Mandatory for all private CBCA corporations.'
    : 'Ontario requirement in force as of January 1, 2023 (O. Reg. 215/21).'
);

const localData = reactive({
    hasArticlesAndCertificate: false,
    hasByLaws: false,
    hasDirectorMinutes: false,
    hasShareholderMinutes: false,
    hasWrittenResolutions: false,
    hasSecuritiesRegister: false,
    hasDirectorRegister: false,
    hasOfficerRegister: false,
    hasISCRegister: false,
    hasUSACopy: false,
    recordsLocationConfirmed: false,
});

const buildStepData = () => ({
    corporateRecords: {
        hasArticlesAndCertificate: localData.hasArticlesAndCertificate || certificateReceived.value,
        hasByLaws: localData.hasByLaws || byLawsDrafted.value,
        hasDirectorMinutes: localData.hasDirectorMinutes,
        hasShareholderMinutes: localData.hasShareholderMinutes,
        hasWrittenResolutions: localData.hasWrittenResolutions,
        hasSecuritiesRegister: localData.hasSecuritiesRegister || securitiesRegisterReady.value,
        hasDirectorRegister: localData.hasDirectorRegister,
        hasOfficerRegister: localData.hasOfficerRegister,
        hasISCRegister: !isReportingIssuer.value ? localData.hasISCRegister : false,
        hasUSACopy: requiresUSA.value ? localData.hasUSACopy : false,
        recordsLocationConfirmed: localData.recordsLocationConfirmed,
    }
});

const { scheduleSave, markInitialized, flushSave } = useIncorpStepSave(buildStepData);

// C4: progress tracking — count only applicable checkboxes
const allFields = computed(() => {
    const base = ['hasArticlesAndCertificate', 'hasByLaws', 'hasDirectorMinutes', 'hasShareholderMinutes', 'hasWrittenResolutions', 'hasSecuritiesRegister', 'hasDirectorRegister', 'hasOfficerRegister'];
    if (!isReportingIssuer.value) base.push('hasISCRegister');
    if (requiresUSA.value) base.push('hasUSACopy');
    base.push('recordsLocationConfirmed');
    return base;
});
const totalItems = computed(() => allFields.value.length);
const checkedCount = computed(() => allFields.value.filter(f => (localData as any)[f]).length);
const completionPercent = computed(() => totalItems.value ? Math.round((checkedCount.value / totalItems.value) * 100) : 0);
const allMinuteBook = computed(() =>
    localData.hasArticlesAndCertificate &&
    localData.hasByLaws &&
    localData.hasDirectorMinutes &&
    localData.hasShareholderMinutes &&
    localData.hasWrittenResolutions
);

const allRegisters = computed(() =>
    localData.hasSecuritiesRegister &&
    localData.hasDirectorRegister &&
    localData.hasOfficerRegister &&
    (!isReportingIssuer.value ? localData.hasISCRegister : true) &&
    (!requiresUSA.value ? true : localData.hasUSACopy)
);

const toggleMinuteBook = () => {
    const target = !allMinuteBook.value;
    localData.hasArticlesAndCertificate = target;
    localData.hasByLaws = target;
    localData.hasDirectorMinutes = target;
    localData.hasShareholderMinutes = target;
    localData.hasWrittenResolutions = target;
};

const toggleRegisters = () => {
    const target = !allRegisters.value;
    localData.hasSecuritiesRegister = target;
    localData.hasDirectorRegister = target;
    localData.hasOfficerRegister = target;
    if (!isReportingIssuer.value) localData.hasISCRegister = target;
    if (requiresUSA.value) localData.hasUSACopy = target;
};

// C16: detect minute book items checked without certificate
const minuteBookChecked = computed(() =>
    localData.hasDirectorMinutes || localData.hasShareholderMinutes || localData.hasWrittenResolutions
);

const validateLocal = () => {
    return validateIncorpSection('corporateRecords', {
        ...store.incorpData,
        ...buildStepData(),
    } as any);
};

onMounted(() => {
    const cr = store.incorpData.corporateRecords;
    // C3: explicit field hydration
    if (cr) {
        localData.hasArticlesAndCertificate = cr.hasArticlesAndCertificate || false;
        localData.hasByLaws = cr.hasByLaws || false;
        localData.hasDirectorMinutes = cr.hasDirectorMinutes || false;
        localData.hasShareholderMinutes = cr.hasShareholderMinutes || false;
        localData.hasWrittenResolutions = cr.hasWrittenResolutions || false;
        localData.hasSecuritiesRegister = cr.hasSecuritiesRegister || false;
        localData.hasDirectorRegister = cr.hasDirectorRegister || false;
        localData.hasOfficerRegister = cr.hasOfficerRegister || false;
        localData.hasISCRegister = cr.hasISCRegister || false;
        localData.hasUSACopy = cr.hasUSACopy || false;
        localData.recordsLocationConfirmed = cr.recordsLocationConfirmed || false;
    }
    // C18: Auto-check articles if certificate confirmed in Articles step
    if (!localData.hasArticlesAndCertificate && certificateReceived.value) {
        localData.hasArticlesAndCertificate = true;
    }
    if (!localData.hasByLaws && byLawsDrafted.value) {
        localData.hasByLaws = true;
    }
    if (!localData.hasSecuritiesRegister && securitiesRegisterReady.value) {
        localData.hasSecuritiesRegister = true;
    }
    isLoading.value = false; // X4
    markInitialized(); // X1
});

watch(() => JSON.stringify(localData), () => scheduleSave());

watch(certificateReceived, (value) => {
    if (value) {
        localData.hasArticlesAndCertificate = true;
    }
});

watch(byLawsDrafted, (value) => {
    if (value) {
        localData.hasByLaws = true;
    }
});

watch(securitiesRegisterReady, (value) => {
    if (value) {
        localData.hasSecuritiesRegister = true;
    }
});

watch(isReportingIssuer, (value) => {
    if (value) {
        localData.hasISCRegister = false;
    }
});

watch(requiresUSA, (value) => {
    if (!value) {
        localData.hasUSACopy = false;
    }
});

defineExpose({
    commitStep: flushSave,
    validateLocal,
});
</script>
