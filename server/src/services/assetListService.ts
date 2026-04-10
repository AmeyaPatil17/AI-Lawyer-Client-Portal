import type { Asset, Assets, IntakeData } from '../types/intake';
import { normalizeExecutors } from './executorsService';
import { serializePoaData } from './poaService';

export type AssetCategoryKey =
    | 'realEstate'
    | 'bankAccounts'
    | 'investments'
    | 'business'
    | 'foreignAssets'
    | 'vehicles'
    | 'digital'
    | 'other';

type LooseAsset = Partial<Asset> & {
    value?: number | string | null;
    ownership?: string;
    category?: string;
};

type LooseLiability = {
    description?: string | null;
    amount?: number | string | null;
};

const CATEGORY_META: Record<AssetCategoryKey, { type: Asset['type']; label: string }> = {
    realEstate: { type: 'RealEstate', label: 'Real Estate' },
    bankAccounts: { type: 'Bank', label: 'Bank Accounts' },
    investments: { type: 'Investment', label: 'Investments' },
    business: { type: 'Business', label: 'Business Interests' },
    foreignAssets: { type: 'Other', label: 'Foreign Assets' },
    vehicles: { type: 'Other', label: 'Vehicles' },
    digital: { type: 'Digital', label: 'Digital Assets' },
    other: { type: 'Other', label: 'Other Assets' },
};

const LEGACY_BUCKETS: Record<string, AssetCategoryKey> = {
    realEstate_items: 'realEstate',
    bankAccounts_items: 'bankAccounts',
    investments_items: 'investments',
    business_items: 'business',
    foreignAssets_items: 'foreignAssets',
    vehicles_items: 'vehicles',
    digital_items: 'digital',
    other_items: 'other',
};

const normalizeText = (value?: string | null) => (value || '').trim();
const normalizeComparableText = (value?: string | null) => normalizeText(value).toLowerCase();

const isAssetCategory = (value: unknown): value is AssetCategoryKey =>
    typeof value === 'string' && value in CATEGORY_META;

export const parseAssetValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number.parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

export const normalizeOwnership = (asset: LooseAsset): Asset['ownership'] | undefined => {
    if (asset.ownership === 'sole' || asset.ownership === 'joint' || asset.ownership === 'joint_other' || asset.ownership === 'tic') {
        return asset.ownership;
    }

    if (typeof asset.jointOwner === 'string' && asset.jointOwner.trim()) {
        return asset.jointOwner.toLowerCase() === 'spouse' ? 'joint' : 'joint_other';
    }

    return undefined;
};

export const formatAssetOwnershipLabel = (asset: LooseAsset): string => {
    const ownership = normalizeOwnership(asset);

    if (ownership === 'joint') return 'Joint with Spouse';
    if (ownership === 'joint_other') {
        const jointOwner = normalizeText(asset.jointOwner);
        return jointOwner ? `Joint with ${jointOwner}` : 'Joint with Other';
    }
    if (ownership === 'tic') return 'Tenants in Common';
    if (ownership === 'sole') return 'Sole Owner';
    return 'Ownership Unspecified';
};

export const deriveJointOwner = (
    ownership: Asset['ownership'] | undefined,
    jointOwnerInput?: string | null,
): string | undefined => {
    if (ownership === 'joint') return 'Spouse';
    if (ownership === 'joint_other') return normalizeText(jointOwnerInput) || undefined;
    return undefined;
};

export const inferAssetCategory = (asset: LooseAsset): AssetCategoryKey => {
    if (isAssetCategory(asset.category)) {
        return asset.category;
    }

    switch (asset.type) {
        case 'RealEstate':
            return 'realEstate';
        case 'Bank':
            return 'bankAccounts';
        case 'Investment':
            return 'investments';
        case 'Business':
            return 'business';
        case 'Digital':
            return 'digital';
        default:
            return 'other';
    }
};

export const normalizeAssetItem = (asset: LooseAsset, fallbackCategory?: AssetCategoryKey): Asset => {
    const category = fallbackCategory ?? inferAssetCategory(asset);
    const ownership = normalizeOwnership(asset);

    return {
        type: CATEGORY_META[category].type,
        category,
        description: String(asset.description || '').trim(),
        value: parseAssetValue(asset.value),
        ownership,
        jointOwner: deriveJointOwner(ownership, asset.jointOwner),
        hasBeneficiaryDesignation: typeof asset.hasBeneficiaryDesignation === 'boolean'
            ? asset.hasBeneficiaryDesignation
            : undefined,
    };
};

export const normalizeLiabilityItem = (liability: LooseLiability) => ({
    description: String(liability.description || ''),
    amount: (() => {
        const amount = parseAssetValue(liability.amount);
        return amount !== undefined && amount >= 0 ? amount : undefined;
    })(),
});

export const getCanonicalAssetList = (assets: any): Asset[] => {
    if (!assets) {
        return [];
    }

    if (Array.isArray(assets.list)) {
        return assets.list.map((asset: LooseAsset) => normalizeAssetItem(asset));
    }

    const normalized: Asset[] = [];

    for (const [bucket, category] of Object.entries(LEGACY_BUCKETS)) {
        const items = assets[bucket];
        if (!Array.isArray(items)) {
            continue;
        }

        items.forEach((item: LooseAsset) => {
            normalized.push(normalizeAssetItem(item, category));
        });
    }

    return normalized;
};

const getTotals = (list: Asset[], liabilities?: LooseLiability[]) => {
    const totalAssetValue = list.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const totalLiabilityValue = (Array.isArray(liabilities) ? liabilities : [])
        .map((liability) => normalizeLiabilityItem(liability))
        .reduce((sum, liability) => sum + (liability.amount || 0), 0);

    return {
        totalAssetValue,
        totalLiabilityValue,
    };
};

export const normalizeAssets = (assets: any): Assets => {
    const list = getCanonicalAssetList(assets);
    const totals = getTotals(list, assets?.liabilities);
    const normalized: Assets = {
        list,
        totalEstimatedValue: totals.totalAssetValue,
    };

    if (Array.isArray(assets?.liabilities)) {
        normalized.liabilities = assets.liabilities.map((liability: LooseLiability) => normalizeLiabilityItem(liability));
    }

    if (typeof assets?.confirmedNoSignificantAssets === 'boolean') {
        normalized.confirmedNoSignificantAssets = assets.confirmedNoSignificantAssets;
    }

    if (typeof assets?.hasShareholderAgreement === 'boolean') {
        normalized.hasShareholderAgreement = assets.hasShareholderAgreement;
    }

    return normalized;
};

export const getAssetsValidationError = (assets: any): string | null => {
    const normalized = normalizeAssets(assets);
    const hasAssets = normalized.list.length > 0;
    const hasLiabilities = (normalized.liabilities?.length || 0) > 0;

    if (!hasAssets && !hasLiabilities && !normalized.confirmedNoSignificantAssets) {
        return 'Please list at least one asset or liability, or confirm that you do not have significant assets.';
    }

    for (const asset of normalized.list) {
        if (!normalizeText(asset.description)) {
            return 'Please provide a description for all listed assets.';
        }

        if (asset.value !== undefined && (!Number.isFinite(asset.value) || asset.value < 0)) {
            return 'Asset values must be valid non-negative numbers.';
        }

        if (normalizeOwnership(asset) === 'joint_other' && !normalizeText(asset.jointOwner)) {
            return 'Please provide the co-owner name for every asset marked "Joint with Other".';
        }
    }

    for (const liability of normalized.liabilities || []) {
        if (!normalizeText(liability.description)) {
            return 'Please provide a description for all liabilities.';
        }

        if (liability.amount === undefined || !Number.isFinite(liability.amount) || liability.amount < 0) {
            return 'Please provide a valid non-negative amount for all liabilities.';
        }
    }

    return null;
};

export const isAssetsStepComplete = (assets: any): boolean =>
    getAssetsValidationError(assets) === null;

export const normalizeWillIntakeData = (data: Partial<IntakeData> | undefined | null): Partial<IntakeData> => {
    if (!data) {
        return {};
    }

    const normalized: Partial<IntakeData> = { ...data };

    if (normalized.assets) {
        normalized.assets = normalizeAssets(normalized.assets);
    }

    if (normalized.executors) {
        normalized.executors = normalizeExecutors(normalized.executors);
    }

    if (normalized.poa) {
        normalized.poa = serializePoaData(normalized.poa);
    }

    if (typeof normalized.clientNotes === 'string') {
        const trimmed = normalized.clientNotes.trim();
        normalized.clientNotes = trimmed || undefined;
    }

    return normalized;
};

export const getAssetSignature = (asset: Partial<Asset>): string => {
    const normalized = normalizeAssetItem(asset);

    return [
        inferAssetCategory(normalized),
        normalizeComparableText(normalized.description),
        normalized.value ?? '',
        normalized.ownership || '',
        normalizeComparableText(normalized.jointOwner),
        normalized.hasBeneficiaryDesignation ? '1' : '0',
    ].join('|');
};

export const hasAssetCategory = (assets: any, category: AssetCategoryKey): boolean => {
    if (getCanonicalAssetList(assets).some((asset) => inferAssetCategory(asset) === category)) {
        return true;
    }

    if (category === 'business' && assets?.business === true) {
        return true;
    }

    if (category === 'foreignAssets' && assets?.foreignAssets === true) {
        return true;
    }

    return false;
};

export const getAssetsByCategory = (assets: any, category: AssetCategoryKey): Asset[] =>
    getCanonicalAssetList(assets).filter((asset) => inferAssetCategory(asset) === category);

export const getAssetCategoryLabel = (category: AssetCategoryKey): string => CATEGORY_META[category].label;
