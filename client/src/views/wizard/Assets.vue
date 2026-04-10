<template>
  <div class="animate-fade-in-up">
    <div class="flex justify-between items-end mb-8">
      <div>
        <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-200">Assets Overview</h2>
        <p class="text-gray-400 mt-2 max-w-2xl">Select the asset categories you own. Detailed information ensures your estate is distributed exactly as you intend.</p>
      </div>
      <button
        type="button"
        @click="showSmartImport = true"
        class="group relative overflow-hidden bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/50 text-purple-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span class="relative flex items-center">
          <span class="mr-2 text-lg">AI</span>
          Smart Import
        </span>
      </button>
    </div>

    <SkeletonLoader v-if="store.isLoading" variant="form" :lines="6" />
    <div v-else class="grid gap-6">
      <div class="grid gap-4 lg:grid-cols-4">
        <div class="bg-gray-900/40 border border-gray-700/60 rounded-2xl p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Assets</div>
          <div class="mt-2 text-2xl font-bold text-white">{{ assetsSummary.assetCount }}</div>
          <div class="text-sm text-gray-400">${{ assetsSummary.totalAssetValue.toLocaleString() }}</div>
        </div>
        <div class="bg-gray-900/40 border border-gray-700/60 rounded-2xl p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Liabilities</div>
          <div class="mt-2 text-2xl font-bold text-white">{{ assetsSummary.liabilityCount }}</div>
          <div class="text-sm text-gray-400">${{ assetsSummary.totalLiabilityValue.toLocaleString() }}</div>
        </div>
        <div class="bg-gray-900/40 border border-gray-700/60 rounded-2xl p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Estimated Net</div>
          <div class="mt-2 text-2xl font-bold text-white">${{ assetsSummary.netEstateValue.toLocaleString() }}</div>
          <div class="text-sm text-gray-400">Assets minus debts</div>
        </div>
        <div class="bg-gray-900/40 border border-gray-700/60 rounded-2xl p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Registered Accounts</div>
          <div class="mt-2 text-2xl font-bold text-white">{{ assetsSummary.hasRegisteredAssets ? 'Yes' : 'No' }}</div>
          <div class="text-sm text-gray-400">RRSP, RRIF, TFSA, RESP</div>
        </div>
      </div>

      <div
        v-for="[key, category] in categoryEntries"
        :key="key"
        class="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-600 hover:bg-gray-800/60 hover:shadow-xl"
        :class="{ 'ring-2 ring-blue-500/30 border-blue-500/50 bg-gray-800/80': form.categories[key].selected }"
      >
        <button
          type="button"
          class="w-full p-5 flex items-center text-left cursor-pointer group select-none"
          :aria-expanded="form.categories[key].selected ? 'true' : 'false'"
          @click="toggleCategory(key)"
        >
          <div
            class="w-6 h-6 rounded-md border-2 mr-4 flex items-center justify-center transition-all duration-300"
            :class="form.categories[key].selected ? 'bg-blue-600 border-blue-600 scale-110' : 'border-gray-500 group-hover:border-blue-400 bg-transparent'"
          >
            <svg v-if="form.categories[key].selected" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
          </div>

          <div class="flex-1">
            <h3 class="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">{{ category.label }}</h3>
            <p class="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{{ category.description }}</p>
          </div>

          <div class="text-gray-500 transition-transform duration-300" :class="{ 'rotate-180 text-blue-400': form.categories[key].selected }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>

        <transition name="expand">
          <div v-show="form.categories[key].selected" class="bg-gray-900/30 border-t border-gray-700/50">
            <div class="p-5">
              <div v-if="key === 'business'" class="mb-4 bg-yellow-900/10 border border-yellow-700/20 rounded-lg p-3 flex items-start">
                <QuestionHelper v-bind="h.shareholderAgm">
                  <input
                    :id="h.shareholderAgm.inputId"
                    v-model="form.hasShareholderAgreement"
                    type="checkbox"
                    class="mt-1 form-checkbox text-yellow-500 bg-gray-800 border-gray-600 rounded mr-3"
                  >
                  <div>
                    <span class="text-sm font-medium text-yellow-200 block">Shareholder's Agreement</span>
                    <span class="text-xs text-yellow-200/70">Does a shareholder's agreement exist that might restrict how you deal with these shares?</span>
                  </div>
                </QuestionHelper>
              </div>

              <div v-if="form.categories[key].items.length === 0" class="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/20">
                <div class="w-10 h-10 mb-2 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
                <p class="text-sm text-gray-400 mb-2">No items added yet</p>
                <button type="button" @click="addItem(key)" class="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  + Add your first {{ category.singularLabel }}
                </button>
              </div>

              <transition-group name="list" tag="div" class="space-y-3">
                <div
                  v-for="(item, idx) in form.categories[key].items"
                  :key="item.uiKey"
                  class="group relative grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-gray-800 p-3 rounded-xl border border-gray-700 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
                >
                  <div class="md:col-span-1 flex justify-center text-gray-500 font-mono text-xs pt-3">
                    #{{ Number(idx) + 1 }}
                  </div>
                  <div class="md:col-span-5">
                    <QuestionHelper v-bind="getAssetHelpers(key).description">
                      <input
                        :id="`${getAssetHelpers(key).description.inputId}-${key}-${idx}`"
                        v-model="item.description"
                        type="text"
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-600"
                        :placeholder="category.placeholder"
                      >
                    </QuestionHelper>
                  </div>
                  <div class="md:col-span-2">
                    <QuestionHelper v-bind="getAssetHelpers(key).ownership">
                      <select
                        :id="`${getAssetHelpers(key).ownership.inputId}-${key}-${idx}`"
                        v-model="item.ownership"
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        @change="handleOwnershipChange(item)"
                      >
                        <option value="">Select ownership</option>
                        <option value="sole">Sole Owner</option>
                        <option value="joint">Joint with Spouse</option>
                        <option value="joint_other">Joint with Other</option>
                        <option value="tic">Tenants in Common</option>
                      </select>
                    </QuestionHelper>
                  </div>
                  <div v-if="item.ownership === 'joint_other'" class="md:col-span-2">
                    <label class="block text-xs font-medium text-gray-400 mb-1" :for="jointOwnerId(key, idx)">Co-owner</label>
                    <input
                      :id="jointOwnerId(key, idx)"
                      v-model="item.jointOwner"
                      type="text"
                      class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-600"
                      placeholder="Co-owner name"
                    >
                  </div>
                  <div :class="item.ownership === 'joint_other' ? 'md:col-span-2' : 'md:col-span-4'" class="relative">
                    <QuestionHelper v-bind="getAssetHelpers(key).value">
                      <span class="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                      <input
                        :id="`${getAssetHelpers(key).value.inputId}-${key}-${idx}`"
                        :value="item.value"
                        type="number"
                        min="0"
                        step="1"
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-6 pr-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-600"
                        placeholder="Value"
                        @input="updateAssetValue(item, $event)"
                      >
                    </QuestionHelper>
                  </div>

                  <button
                    type="button"
                    @click="removeItem(key, item.uiKey)"
                    class="absolute -top-2 -right-2 bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-900/20 border border-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </transition-group>

              <button
                v-if="form.categories[key].items.length > 0"
                type="button"
                @click="addItem(key)"
                class="mt-4 w-full py-2 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 text-sm font-medium hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-900/10 transition-all flex items-center justify-center"
              >
                <span class="mr-2 text-lg leading-none">+</span> Add Another Item
              </button>
            </div>
          </div>
        </transition>
      </div>

      <div class="bg-gray-900/30 border border-gray-700/50 rounded-2xl p-5">
        <label for="assets-none" class="flex items-start gap-3 cursor-pointer">
          <input
            id="assets-none"
            v-model="form.confirmedNoSignificantAssets"
            type="checkbox"
            class="mt-1 form-checkbox text-blue-500 bg-gray-800 border-gray-600 rounded"
            @change="toggleNoSignificantAssets"
          >
          <div>
            <div class="text-sm font-medium text-gray-200">I do not have significant assets or liabilities to list right now.</div>
            <div class="text-xs text-gray-400 mt-1">Use this only when you intentionally want to leave the section empty. Checking this clears any listed asset rows.</div>
          </div>
        </label>
      </div>

      <div class="mt-2 pt-8 border-t border-gray-800">
        <div class="flex items-center mb-6">
          <div class="w-10 h-10 rounded-xl bg-red-900/20 flex items-center justify-center text-red-400 mr-4 border border-red-900/30">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-200">Liabilities & Debts</h3>
            <p class="text-sm text-gray-400">Mortgages, loans, and other debts the estate must settle.</p>
          </div>
        </div>

        <div class="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6">
          <transition-group name="list" tag="div" class="space-y-3">
            <div
              v-for="(debt, idx) in form.liabilities"
              :key="debt.uiKey"
              class="group relative grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-gray-800 p-3 rounded-xl border border-gray-700 shadow-sm hover:border-red-500/30 transition-colors"
            >
              <div class="md:col-span-4">
                <QuestionHelper v-bind="h.liabilityDesc">
                  <input
                    :id="`${h.liabilityDesc.inputId}-${idx}`"
                    v-model="debt.description"
                    type="text"
                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="Creditor / Description"
                  >
                </QuestionHelper>
              </div>
              <div class="md:col-span-2 relative">
                <QuestionHelper v-bind="h.liabilityAmt">
                  <span class="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                  <input
                    :id="`${h.liabilityAmt.inputId}-${idx}`"
                    :value="debt.amount"
                    type="number"
                    min="0"
                    step="1"
                    class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-6 pr-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="Amount"
                    @input="updateLiabilityAmount(debt, $event)"
                  >
                </QuestionHelper>
              </div>
              <button
                type="button"
                @click="removeLiability(debt.uiKey)"
                class="absolute -top-2 -right-2 bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-900/20 border border-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </transition-group>

          <button
            type="button"
            @click="addLiability"
            class="mt-4 w-full py-2 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 text-sm font-medium hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/10 transition-all flex items-center justify-center"
          >
            <span class="mr-2 text-lg leading-none">+</span> Add Liability
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showSmartImport" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="showSmartImport = false"></div>

        <div class="relative bg-gray-900 rounded-2xl max-w-2xl w-full border border-gray-700 shadow-2xl p-0 overflow-hidden transform transition-all scale-100">
          <div class="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 p-6 border-b border-white/10">
            <h3 class="text-2xl font-bold flex items-center text-white">
              <span class="mr-3 text-3xl">AI</span> Smart Asset Import
            </h3>
            <p class="text-blue-200/80 mt-1 ml-11">Paste any list of assets below. Our AI will categorize and parse them instantly.</p>
          </div>

          <div class="p-6">
            <textarea
              v-model="smartImportText"
              class="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 h-48 text-sm leading-relaxed font-mono resize-none transition-colors"
              placeholder="Example: I own a house at 123 Maple Dr ($800k), a joint bank account at RBC with my wife ($15k), and a 2018 Tesla Model 3."
            ></textarea>

            <div class="mt-4 border-t border-gray-700/50 pt-4">
              <label class="block text-sm font-medium text-gray-400 mb-2">Or upload a document (PDF, Image)</label>
              <div class="flex items-center justify-center w-full">
                <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                  <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg v-if="!selectedFile" class="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <svg v-else class="w-8 h-8 mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p v-if="!selectedFile" class="mb-2 text-sm text-gray-400"><span class="font-semibold">Click to upload</span> or drag and drop</p>
                    <p v-else class="text-sm text-green-400 font-medium">{{ selectedFile.name }}</p>
                    <p v-if="!selectedFile" class="text-xs text-gray-500">PNG, JPG or PDF</p>
                  </div>
                  <input id="dropzone-file" type="file" class="hidden" @change="handleFileSelect" accept="image/*,.pdf">
                </label>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button type="button" @click="showSmartImport = false" class="px-5 py-2.5 text-gray-400 hover:text-white transition-colors font-medium">Cancel</button>
              <button
                type="button"
                @click="handleSmartImport"
                :disabled="isImporting || (!smartImportText.trim() && !selectedFile)"
                class="px-6 py-2.5 bg-white text-purple-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center transition-all shadow-lg"
              >
                <span v-if="isImporting" class="mr-2 animate-spin">...</span>
                {{ isImporting ? 'Analyzing...' : 'Parse & Import Assets' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import api from '../../api';
import QuestionHelper from '../../components/QuestionHelper.vue';
import SkeletonLoader from '../../components/common/SkeletonLoader.vue';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import { useIntakeStore } from '../../stores/intake';
import {
  ASSET_CATEGORIES,
  createEmptyAssetEditorRow,
  createEmptyAssetsEditorState,
  createEmptyLiabilityEditorRow,
  getAssetsSummary,
  getAssetsValidationError,
  normalizeAssetsEditorState,
  serializeAssetsEditorState,
  type AssetCategoryKey,
  type AssetEditorRow,
  type AssetsEditorState,
  type LiabilityEditorRow,
} from '../../utils/assetList';
import { willsAssetCategoryHelpers, willsHelpers } from '../../utils/willsFieldHelpers';

const h = willsHelpers.assets;
const getAssetHelpers = (key: AssetCategoryKey) => ({
  description: willsAssetCategoryHelpers[key].description,
  ownership: h.ownership,
  value: willsAssetCategoryHelpers[key].value,
});
const store = useIntakeStore();
const { showToast } = useToast();

const categoryMeta = {
  realEstate: {
    ...ASSET_CATEGORIES.realEstate,
    description: 'Homes, condos, cottages, or land owned solely or jointly.',
    singularLabel: 'real estate asset',
    placeholder: 'Property address or description',
  },
  bankAccounts: {
    ...ASSET_CATEGORIES.bankAccounts,
    description: 'Chequing, savings, GICs.',
    singularLabel: 'bank account',
    placeholder: 'Institution and account type',
  },
  investments: {
    ...ASSET_CATEGORIES.investments,
    description: 'Stocks, bonds, mutual funds, TFSA, RRSP, RRIF.',
    singularLabel: 'investment',
    placeholder: 'Account, holding, or plan name',
  },
  business: {
    ...ASSET_CATEGORIES.business,
    description: 'Shares in a private corporation or partnership interest.',
    singularLabel: 'business interest',
    placeholder: 'Company name or partnership interest',
  },
  foreignAssets: {
    ...ASSET_CATEGORIES.foreignAssets,
    description: 'Property or accounts located outside Canada.',
    singularLabel: 'foreign asset',
    placeholder: 'Country and asset description',
  },
  vehicles: {
    ...ASSET_CATEGORIES.vehicles,
    description: 'Cars, boats, RVs.',
    singularLabel: 'vehicle',
    placeholder: 'Year, make, and model',
  },
  digital: {
    ...ASSET_CATEGORIES.digital,
    description: 'Cryptocurrency, domain names, social media accounts.',
    singularLabel: 'digital asset',
    placeholder: 'Wallet, account, or domain',
  },
  other: {
    ...ASSET_CATEGORIES.other,
    description: 'Jewelry, art, collectibles, loans owed to you.',
    singularLabel: 'other asset',
    placeholder: 'Description',
  },
} satisfies Record<AssetCategoryKey, { label: string; type: string; description: string; singularLabel: string; placeholder: string }>;

const categoryEntries = computed(() =>
  Object.entries(categoryMeta) as Array<[AssetCategoryKey, typeof categoryMeta[AssetCategoryKey]]>
);

const form = ref<AssetsEditorState>(createEmptyAssetsEditorState());
const showSmartImport = ref(false);
const smartImportText = ref('');
const selectedFile = ref<File | null>(null);
const isImporting = ref(false);

const assetsPayload = computed(() => ({
  assets: serializeAssetsEditorState(form.value),
}));

const assetsSummary = computed(() => getAssetsSummary(assetsPayload.value.assets));
const isSaving = computed(() => store.isSaving || isImporting.value);
const hasBusinessAssets = computed(() =>
  form.value.categories.business.selected && form.value.categories.business.items.length > 0
);
const hasAnyListedData = computed(() =>
  assetsSummary.value.assetCount > 0 || assetsSummary.value.liabilityCount > 0
);
let skipNextScheduledSave = false;

const { scheduleSave, commitStep, markInitialized, hasPendingChanges } = useWizardStepSave(() => assetsPayload.value);

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null;
  }
};

const updateAssetValue = (item: AssetEditorRow, event: Event) => {
  const target = event.target as HTMLInputElement;
  item.value = target.value === '' ? '' : Number(target.value);
};

const updateLiabilityAmount = (item: LiabilityEditorRow, event: Event) => {
  const target = event.target as HTMLInputElement;
  item.amount = target.value === '' ? '' : Number(target.value);
};

const clearAllListedData = () => {
  for (const key of Object.keys(form.value.categories) as AssetCategoryKey[]) {
    form.value.categories[key].selected = false;
    form.value.categories[key].items = [];
  }

  form.value.liabilities = [];
  form.value.hasShareholderAgreement = false;
};

const toggleCategory = (key: AssetCategoryKey) => {
  const state = form.value.categories[key];

  if (state.selected) {
    if (state.items.length > 0) {
      const confirmed = window.confirm(`Remove all ${categoryMeta[key].label.toLowerCase()} rows from this section?`);
      if (!confirmed) {
        return;
      }
    }

    state.selected = false;
    state.items = [];
    if (key === 'business') {
      form.value.hasShareholderAgreement = false;
    }
    return;
  }

  form.value.confirmedNoSignificantAssets = false;
  state.selected = true;
};

const addItem = (key: AssetCategoryKey) => {
  form.value.confirmedNoSignificantAssets = false;
  form.value.categories[key].selected = true;
  form.value.categories[key].items.push(createEmptyAssetEditorRow(key));
};

const removeItem = (key: AssetCategoryKey, uiKey: string) => {
  const items = form.value.categories[key].items;
  const nextItems = items.filter((item) => item.uiKey !== uiKey);
  form.value.categories[key].items = nextItems;

  if (nextItems.length === 0) {
    form.value.categories[key].selected = false;
    if (key === 'business') {
      form.value.hasShareholderAgreement = false;
    }
  }
};

const handleOwnershipChange = (item: AssetEditorRow) => {
  if (item.ownership !== 'joint_other') {
    item.jointOwner = '';
  }
};

const addLiability = () => {
  form.value.confirmedNoSignificantAssets = false;
  form.value.liabilities.push(createEmptyLiabilityEditorRow());
};

const removeLiability = (uiKey: string) => {
  form.value.liabilities = form.value.liabilities.filter((item) => item.uiKey !== uiKey);
};

const toggleNoSignificantAssets = () => {
  if (!form.value.confirmedNoSignificantAssets) {
    return;
  }

  if (hasAnyListedData.value) {
    const confirmed = window.confirm('Checking this will clear the listed assets and liabilities. Continue?');
    if (!confirmed) {
      form.value.confirmedNoSignificantAssets = false;
      return;
    }
  }

  clearAllListedData();
};

const jointOwnerId = (key: AssetCategoryKey, index: number) => `asset-joint-owner-${key}-${index}`;

const validateLocal = () => {
  const warning = getAssetsValidationError(assetsPayload.value.assets);
  if (warning) {
    showToast(warning, 'warning');
    return warning;
  }

  return null;
};

watch(form, () => {
  if (skipNextScheduledSave) {
    skipNextScheduledSave = false;
    return;
  }
  scheduleSave();
}, { deep: true });

watch(hasBusinessAssets, (hasBusiness) => {
  if (!hasBusiness) {
    form.value.hasShareholderAgreement = false;
  }
});

onMounted(async () => {
  if (!store.isInitialized) {
    await store.fetchIntake();
  }

  skipNextScheduledSave = true;
  form.value = normalizeAssetsEditorState(store.intakeData.assets);
  store.stageIntakeStep(assetsPayload.value);
  markInitialized();
});

const handleSmartImport = async () => {
  if (!smartImportText.value.trim() && !selectedFile.value) return;
  if (!store.currentIntakeId) {
    showToast('No active intake was found for this draft.', 'error');
    return;
  }

  isImporting.value = true;
  try {
    const formData = new FormData();
    if (smartImportText.value.trim()) {
      formData.append('text', smartImportText.value);
    }
    if (selectedFile.value) {
      formData.append('file', selectedFile.value);
    }

    const response = await api.post(`/intake/${store.currentIntakeId}/assets/import`, formData);
    store.applyServerIntakeResponse(response.data);
    skipNextScheduledSave = true;
    form.value = normalizeAssetsEditorState(store.intakeData.assets);

    showSmartImport.value = false;
    smartImportText.value = '';
    selectedFile.value = null;
    showToast('Assets imported successfully.', 'success');
  } catch (error) {
    console.error('Import failed', error);
    showToast('Failed to parse assets. Please try again.', 'error');
  } finally {
    isImporting.value = false;
  }
};

defineExpose({
  commitStep,
  hasPendingChanges,
  validateLocal,
});
</script>
