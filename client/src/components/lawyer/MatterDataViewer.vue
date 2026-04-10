<script setup lang="ts">
import { computed, ref } from 'vue';
import PeoplePicker from '../PeoplePicker.vue';
import api from '../../api';
import { useToast } from '../../composables/useToast';
import type { Asset } from '../../types/intake';
import { ASSET_CATEGORIES, formatAssetOwnershipLabel, getAssetsSummary, inferAssetCategory, type AssetCategoryKey } from '../../utils/assetList';

const props = defineProps<{
    intake: any;
    isEditing: boolean;
}>();

const emit = defineEmits(['update:intake']);
const { showToast } = useToast();

const displayName = (val: any) => {
    if (typeof val === 'string') return val;
    return val?.name || '';
};

const formatCurrency = (val: string | number) => {
    if (val === '' || val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(val));
};

const assetCategories: Record<AssetCategoryKey, string> = {
    realEstate: 'Real Estate',
    bankAccounts: 'Bank Accounts',
    investments: 'Investments',
    business: 'Business Interests',
    foreignAssets: 'Foreign Assets',
    vehicles: 'Vehicles',
    digital: 'Digital Assets',
    other: 'Other Assets'
};

const ensureAssetList = (): Asset[] => {
    if (!props.intake.data) {
        props.intake.data = {};
    }
    if (!props.intake.data.assets) {
        props.intake.data.assets = { list: [] };
    }
    if (!Array.isArray(props.intake.data.assets.list)) {
        props.intake.data.assets.list = [];
    }
    return props.intake.data.assets.list as Asset[];
};

const toAssetCategory = (key: string): AssetCategoryKey => key as AssetCategoryKey;

const getAssetItems = (key: string): Asset[] =>
    ensureAssetList().filter((asset) => inferAssetCategory(asset) === toAssetCategory(key));

const showAssetCategory = (key: string) =>
    props.isEditing || getAssetItems(key).length > 0;

const assetSummary = computed(() => getAssetsSummary(props.intake.data?.assets));
const hasAnyAssets = computed(() => assetSummary.value.assetCount > 0 || assetSummary.value.liabilityCount > 0);
const hasExplicitEmptyAssets = computed(() => !!props.intake.data?.assets?.confirmedNoSignificantAssets);
const hasShareholderAgreement = computed(() => !!props.intake.data?.assets?.hasShareholderAgreement);

const formatOwnership = (asset: Asset) => formatAssetOwnershipLabel(asset);

const addAssetItem = (key: string) => {
    const category = toAssetCategory(key);
    ensureAssetList().push({
        type: ASSET_CATEGORIES[category].type,
        category,
        description: '',
        ownership: 'sole',
    });
};

const removeAssetItem = (key: string, idx: number) => {
    const list = ensureAssetList();
    const target = getAssetItems(key)[idx];
    const absoluteIndex = list.indexOf(target);
    if (absoluteIndex !== -1) {
        list.splice(absoluteIndex, 1);
    }
};

const handleAssetOwnershipChange = (item: Asset) => {
    if (item.ownership === 'joint') {
        item.jointOwner = 'Spouse';
        return;
    }

    if (item.ownership === 'joint_other') {
        if (!item.jointOwner || item.jointOwner === 'Spouse') {
            item.jointOwner = '';
        }
        return;
    }

    item.jointOwner = undefined;
};

// Smart Import State
const showImportModal = ref(false);
const importText = ref('');
const isImporting = ref(false);

const runSmartImport = async () => {
    isImporting.value = true;
    try {
        const response = await api.post(`/intake/${props.intake._id}/assets/import`, {
            text: importText.value
        });
        
        // Update intake with new data
        emit('update:intake', response.data);
        showImportModal.value = false;
        importText.value = '';
        
        showToast('Assets extracted and added successfully!', 'success');
        
    } catch (error) {
        console.error('Import failed', error);
        showToast('Failed to analyze text.', 'error');
    } finally {
        isImporting.value = false;
    }
};
</script>

<template>
<div class="glass-panel p-8 rounded-2xl">
    <h2 class="text-xl font-bold mb-6 text-blue-400 flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        {{ intake.type === 'incorporation' ? 'Incorporation Data' : 'Intake Data' }}
    </h2>
    
    <!-- ==================== INCORPORATION LAYOUT ==================== -->
    <div v-if="intake.type === 'incorporation'" class="space-y-8">

        <!-- Jurisdiction & Name -->
        <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Jurisdiction & Name</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Jurisdiction</span>
                    <div class="font-medium text-white uppercase">{{ intake.data?.preIncorporation?.jurisdiction || 'N/A' }}</div>
                </div>
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Name Type</span>
                    <div class="font-medium text-white capitalize">{{ intake.data?.preIncorporation?.nameType || 'N/A' }}</div>
                </div>
                <div v-if="intake.data?.preIncorporation?.nameType === 'named'" class="bg-gray-900/50 p-3 rounded border border-gray-700/50 md:col-span-2">
                    <span class="block text-xs text-gray-500 mb-1">Proposed Name</span>
                    <div class="font-medium text-white">{{ intake.data?.preIncorporation?.proposedName || 'N/A' }} {{ intake.data?.preIncorporation?.legalEnding || '' }}</div>
                </div>
                <div v-if="intake.data?.preIncorporation?.nuansReport?.reportDate" class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">NUANS Report Date</span>
                    <div class="font-medium text-white">{{ intake.data?.preIncorporation?.nuansReport?.reportDate }}</div>
                </div>
            </div>
        </section>

        <!-- Registered Office -->
        <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Registered Office</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50 md:col-span-2">
                    <span class="block text-xs text-gray-500 mb-1">Address</span>
                    <div class="font-medium text-white">{{ intake.data?.structureOwnership?.registeredOfficeAddress || 'N/A' }}</div>
                </div>
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Province</span>
                    <div class="font-medium text-white">{{ intake.data?.structureOwnership?.registeredOfficeProvince || 'N/A' }}</div>
                </div>
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Fiscal Year End</span>
                    <div class="font-medium text-white">{{ intake.data?.structureOwnership?.fiscalYearEnd || 'Not set' }}</div>
                </div>
            </div>
        </section>

        <!-- Directors -->
        <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Directors ({{ (intake.data?.structureOwnership?.directors || []).length }})</h3>
            <div class="space-y-2">
                <div v-for="(director, idx) in (intake.data?.structureOwnership?.directors || [])" :key="idx" class="bg-gray-900/50 p-3 rounded border border-gray-700/50 flex justify-between items-center text-sm">
                    <div>
                        <div class="font-medium text-white">{{ director.fullName }}</div>
                        <div class="text-xs text-gray-400">{{ director.address }}</div>
                    </div>
                    <span v-if="director.isCanadianResident" class="text-xs bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 px-1.5 py-0.5 rounded">CA Resident</span>
                </div>
                <div v-if="!(intake.data?.structureOwnership?.directors || []).length" class="text-gray-500 italic text-sm">No directors defined.</div>
            </div>
        </section>

        <!-- Share Classes -->
        <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Share Classes ({{ (intake.data?.structureOwnership?.shareClasses || []).length }})</h3>
            <div class="space-y-2">
                <div v-for="(sc, idx) in (intake.data?.structureOwnership?.shareClasses || [])" :key="idx" class="bg-gray-900/50 p-3 rounded border border-gray-700/50 flex justify-between items-center text-sm">
                    <div>
                        <div class="font-medium text-white">{{ sc.className }}</div>
                        <div class="text-xs text-gray-400">{{ sc.votingRights ? 'Voting' : 'Non-voting' }} · {{ sc.maxShares ? `Max: ${sc.maxShares}` : 'Unlimited' }}</div>
                    </div>
                </div>
                <div v-if="!(intake.data?.structureOwnership?.shareClasses || []).length" class="text-gray-500 italic text-sm">No share classes defined.</div>
            </div>
        </section>

        <!-- Shareholders -->
        <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Shareholders ({{ (intake.data?.structureOwnership?.initialShareholders || []).length }})</h3>
            <div class="space-y-2">
                <div v-for="(sh, idx) in (intake.data?.structureOwnership?.initialShareholders || [])" :key="idx" class="bg-gray-900/50 p-3 rounded border border-gray-700/50 flex justify-between items-center text-sm">
                    <div>
                        <div class="font-medium text-white">{{ sh.fullName || sh.subscriberName }}</div>
                        <div class="text-xs text-gray-400">{{ sh.numberOfShares || 0 }} {{ sh.shareClass || 'unassigned' }} shares</div>
                    </div>
                    <span v-if="sh.considerationType" class="text-xs text-gray-400">({{ sh.considerationType }})</span>
                </div>
                <div v-if="!(intake.data?.structureOwnership?.initialShareholders || []).length" class="text-gray-500 italic text-sm">No shareholders defined.</div>
            </div>
        </section>

        <!-- Registrations -->
        <section v-if="intake.data?.registrations?.craBusinessNumber" class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Registrations</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">CRA Business Number</span>
                    <div class="font-medium text-white">{{ intake.data.registrations.craBusinessNumber }}</div>
                </div>
                <div v-if="intake.data.registrations.hstGstNumber" class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">HST/GST Number</span>
                    <div class="font-medium text-white">{{ intake.data.registrations.hstGstNumber }}</div>
                </div>
            </div>
        </section>

        <!-- Banking -->
        <section v-if="intake.data?.bankingSetup?.bankName">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Banking & Compliance</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Bank</span>
                    <div class="font-medium text-white">{{ intake.data.bankingSetup.bankName }}</div>
                </div>
                <div v-if="intake.data.bankingSetup.accountantName" class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Accountant</span>
                    <div class="font-medium text-white">{{ intake.data.bankingSetup.accountantName }}</div>
                </div>
            </div>
        </section>

    </div>

    <!-- ==================== WILLS LAYOUT (existing) ==================== -->
    <div v-else class="space-y-8">
        <!-- Section: Personal -->
        <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Personal Profile</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Full Name</span>
                    <div v-if="!isEditing" class="font-medium text-white">{{ displayName(intake.data?.personalProfile?.fullName) || 'N/A' }}</div>
                    <PeoplePicker v-else v-model="intake.data.personalProfile.fullName" inputClass="!p-2 !text-sm border-gray-600" />
                 </div>
                 <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Date of Birth</span>
                    <div v-if="!isEditing" class="font-medium text-white">{{ intake.data?.personalProfile?.dateOfBirth || 'N/A' }}</div>
                    <input v-else v-model="intake.data.personalProfile.dateOfBirth" type="date" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none" />
                 </div>
                 <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50 md:col-span-2">
                    <span class="block text-xs text-gray-500 mb-1">Address</span>
                    <div v-if="!isEditing" class="font-medium text-white">{{ intake.data?.personalProfile?.address || 'N/A' }}</div>
                    <input v-else v-model="intake.data.personalProfile.address" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none" />
                 </div>
            </div>
        </section>

        <!-- Section: Family -->
         <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Family & Guardians</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                 <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                    <span class="block text-xs text-gray-500 mb-1">Marital Status</span>
                    <div v-if="!isEditing" class="font-medium text-white capitalize">{{ intake.data?.family?.maritalStatus || 'N/A' }}</div>
                    <select v-else v-model="intake.data.family.maritalStatus" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none">
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Common Law">Common Law</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                    </select>
                 </div>
                 <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50" v-if="intake.data?.family?.spouseName || isEditing">
                    <span class="block text-xs text-gray-500 mb-1">Spouse Name</span>
                    <div v-if="!isEditing" class="font-medium text-white">{{ displayName(intake.data?.family?.spouseName) || 'N/A' }}</div>
                    <PeoplePicker v-else v-model="intake.data.family.spouseName" inputClass="!p-2 !text-sm border-gray-600" placeholder="Spouse Name" />
                 </div>
            </div>

            <!-- Children -->
            <div v-if="intake.data?.family?.children?.length" class="mb-4">
                <span class="block text-xs text-gray-500 mb-2">Children</span>
                <div class="space-y-2">
                     <div v-for="(child, idx) in intake.data.family.children" :key="idx" class="bg-gray-800/50 p-3 rounded flex justify-between items-center text-sm">
                        <span>{{ displayName(child.fullName) }}</span>
                        <span class="text-gray-400 text-xs">DOB: {{ child.dateOfBirth }}</span>
                    </div>
                </div>
            </div>

            <!-- Guardians -->
            <div v-if="intake.data?.guardians?.primary?.fullName" class="mt-4">
                <span class="block text-xs text-gray-500 mb-2">Appointed Guardians (for minors)</span>
                <div class="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded">
                    <span class="text-xs text-indigo-300 block mb-1">Primary Guardian</span>
                    <div class="font-medium text-white">{{ displayName(intake.data.guardians?.primary?.fullName) }}</div>
                </div>
            </div>
        </section>

        <!-- Section: Executors -->
         <section class="border-b border-gray-700/50 pb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Executors</h3>
             <div class="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 mb-3">
                <span class="text-xs text-blue-400 block mb-1 font-bold uppercase">Primary Executor</span>
                 <div v-if="!isEditing">
                     <div class="text-lg font-medium text-white">{{ displayName(intake.data?.executors?.primary?.fullName) || 'N/A' }}</div>
                     <div class="text-sm text-gray-400">{{ intake.data?.executors?.primary?.relationship }}</div>
                 </div>
                 <div v-else class="space-y-2">
                     <PeoplePicker v-model="intake.data.executors.primary.fullName" inputClass="!p-2 !text-sm border-gray-600" placeholder="Full Name" />
                     <input v-model="intake.data.executors.primary.relationship" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-300 focus:border-blue-500 outline-none" placeholder="Relationship" />
                 </div>
            </div>
            <div v-if="intake.data?.executors?.alternates?.length" class="space-y-2">
                <span class="block text-xs text-gray-500">Alternates</span>
                 <div v-for="(alt, idx) in intake.data.executors.alternates" :key="idx" class="bg-gray-800 p-3 rounded flex justify-between items-center text-sm">
                     <div v-if="!isEditing" class="flex-1">
                        <span>{{ displayName(alt.fullName) }}</span>
                        <span class="text-gray-400 text-xs ml-2">{{ alt.relationship }}</span>
                    </div>
                    <div v-else class="flex-1 grid grid-cols-2 gap-2">
                        <PeoplePicker v-model="alt.fullName" inputClass="!p-2 !text-xs border-gray-600" />
                        <input v-model="alt.relationship" class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none" />
                    </div>
                </div>
            </div>
        </section>

        <!-- Section: Beneficiaries & Assets -->
         <section>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Left: Beneficiaries -->
                <div>
                    <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Beneficiaries</h3>
                    <div class="space-y-3">
                        <div v-for="(ben, idx) in (intake.data?.beneficiaries?.beneficiaries || [])" :key="idx" class="bg-gray-900/50 p-3 rounded border border-gray-700/50 relative overflow-hidden">
                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                            <div class="pl-2">
                                 <div v-if="!isEditing" class="flex justify-between items-start">
                                    <div>
                                        <div class="font-medium text-white">{{ displayName(ben.fullName) }}</div>
                                        <div class="text-xs text-gray-400">{{ ben.relationship }}</div>
                                    </div>
                                    <div class="text-green-400 font-bold text-lg">{{ ben.share }}%</div>
                                </div>
                                <div v-else class="space-y-2">
                                    <PeoplePicker v-model="ben.fullName" inputClass="!p-2 !text-sm border-gray-600" placeholder="Name" />
                                    <div class="flex gap-2">
                                        <input v-model="ben.relationship" class="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none" placeholder="Relationship" />
                                        <div class="flex items-center w-20">
                                            <input v-model.number="ben.share" type="number" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-green-400 font-bold focus:border-green-500 outline-none text-right" />
                                            <span class="text-xs text-gray-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="!intake.data?.beneficiaries?.beneficiaries?.length" class="text-gray-500 italic text-sm">No beneficiaries listed.</div>
                    </div>
                </div>

                 <!-- Right: Assets -->
                <div>
                    <h3 class="text-sm font-bold text-gray-400 uppercase mb-4 flex justify-between items-center">
                        Assets Inventory
                        <button v-if="isEditing" @click="showImportModal = true" class="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center transition-colors">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            Smart Import (AI)
                        </button>
                    </h3>
                    
                    <!-- Import Modal -->
                    <div v-if="showImportModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div class="bg-gray-800 border border-gray-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
                            <h3 class="text-xl font-bold text-white mb-2 flex items-center">
                                <svg class="w-6 h-6 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                Smart Asset Import
                            </h3>
                            <p class="text-gray-400 text-sm mb-4">Paste client emails or notes below. AI will extract assets and append them to your list.</p>
                            
                            <textarea 
                                v-model="importText"
                                rows="6"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none mb-4"
                                placeholder="e.g. 'Client owns a cottage at 123 Lake St worth $500k and has a TD Bank account with $50k...'"
                            ></textarea>
                            
                            <div class="flex justify-end gap-3">
                                <button @click="showImportModal = false" class="text-gray-400 hover:text-white px-4 py-2 text-sm">Cancel</button>
                                <button 
                                    @click="runSmartImport" 
                                    :disabled="!importText || isImporting"
                                    class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span v-if="isImporting" class="animate-spin mr-2">⟳</span>
                                    {{ isImporting ? 'Analyzing...' : 'Extract & Import' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                       <div v-if="hasExplicitEmptyAssets && !hasAnyAssets && !isEditing" class="text-gray-400 text-sm bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                           Client confirmed there are no significant assets or liabilities listed for this matter.
                       </div>
                       <div v-else-if="!hasAnyAssets && !isEditing" class="text-gray-500 italic text-sm bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                           No assets selected.
                       </div>

                       <div v-if="!isEditing && hasAnyAssets" class="grid grid-cols-1 md:grid-cols-3 gap-3">
                           <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                                <span class="block text-xs text-gray-500 mb-1">Assets</span>
                                <div class="font-medium text-white">{{ assetSummary.assetCount }}</div>
                                <div class="text-xs text-gray-400">{{ formatCurrency(assetSummary.totalAssetValue) }}</div>
                           </div>
                           <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                                <span class="block text-xs text-gray-500 mb-1">Liabilities</span>
                                <div class="font-medium text-white">{{ assetSummary.liabilityCount }}</div>
                                <div class="text-xs text-gray-400">{{ formatCurrency(assetSummary.totalLiabilityValue) }}</div>
                           </div>
                           <div class="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                                <span class="block text-xs text-gray-500 mb-1">Net Estate</span>
                                <div class="font-medium text-white">{{ formatCurrency(assetSummary.netEstateValue) }}</div>
                                <div class="text-xs text-gray-400">Assets minus debts</div>
                           </div>
                       </div>

                       <div v-if="!isEditing && hasShareholderAgreement" class="bg-yellow-900/20 border border-yellow-700/40 text-yellow-200 text-xs rounded-lg p-3">
                           Shareholder agreement noted for the listed business interests.
                       </div>

                       <!-- Asset Categories -->
                       <div v-for="(label, key) in assetCategories" :key="key">
                           <div v-if="showAssetCategory(key)" class="bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
                                <div class="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50 flex justify-between items-center">
                                    <span class="font-bold text-sm text-gray-300">{{ label }}</span>
                                    <button v-if="isEditing" @click="addAssetItem(key)" class="text-xs text-blue-400 hover:text-white">+ Add</button>
                                </div>
                                
                                <div v-if="getAssetItems(key).length > 0" class="divide-y divide-gray-700/50">
                                    <div v-for="(item, idx) in getAssetItems(key)" :key="idx" class="p-3 text-sm">
                                        <div v-if="!isEditing" class="flex justify-between items-start">
                                            <div>
                                                <div class="text-white">{{ item.description || 'Unspecified Item' }}</div>
                                                <div class="text-xs text-gray-500 capitalize">{{ formatOwnership(item) }}</div>
                                                <div v-if="item.hasBeneficiaryDesignation" class="text-xs text-emerald-400 mt-1">Beneficiary designation on file</div>
                                            </div>
                                            <div class="font-mono text-gray-400">{{ formatCurrency(item.value) }}</div>
                                        </div>
                                        <div v-else class="space-y-2">
                                            <input v-model="item.description" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none" placeholder="Description/Address" />
                                            <div class="flex gap-2 flex-wrap">
                                                <select
                                                    v-model="item.ownership"
                                                    @change="handleAssetOwnershipChange(item)"
                                                    class="w-full md:w-1/3 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sole">Sole Owner</option>
                                                    <option value="joint">Joint (Spouse)</option>
                                                    <option value="joint_other">Joint (Other)</option>
                                                    <option value="tic">Tenants in Common</option>
                                                </select>
                                                <input
                                                    v-if="item.ownership === 'joint_other'"
                                                    v-model="item.jointOwner"
                                                    class="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                                                    placeholder="Co-owner name"
                                                />
                                                <input v-model.number="item.value" class="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none" placeholder="Value" />
                                                <button @click="removeAssetItem(key, idx)" class="text-red-400 hover:text-red-300 px-1">✕</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="p-4 text-xs text-gray-500 italic">No specific items listed.</div>
                           </div>
                       </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
</template>
