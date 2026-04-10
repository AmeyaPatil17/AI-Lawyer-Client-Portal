import type { Asset, Assets } from '../types/intake';

export type AssetCategoryKey =
    | 'realEstate'
    | 'bankAccounts'
    | 'investments'
    | 'business'
    | 'foreignAssets'
    | 'vehicles'
    | 'digital'
    | 'other';

export type AssetOwnershipInput = NonNullable<Asset['ownership']> | '';

export interface AssetEditorRow {
    uiKey: string;
    description: string;
    value: number | '';
    ownership: AssetOwnershipInput;
    jointOwner: string;
    hasBeneficiaryDesignation?: boolean;
}

export interface LiabilityEditorRow {
    uiKey: string;
    description: string;
    amount: number | '';
}

export interface AssetCategoryEditorState {
    selected: boolean;
    items: AssetEditorRow[];
}

export interface AssetsEditorState {
    categories: Record<AssetCategoryKey, AssetCategoryEditorState>;
    liabilities: LiabilityEditorRow[];
    confirmedNoSignificantAssets: boolean;
    hasShareholderAgreement: boolean;
}

export interface AssetsSummary {
    assetCount: number;
    liabilityCount: number;
    totalAssetValue: number;
    totalLiabilityValue: number;
    netEstateValue: number;
    hasRegisteredAssets: boolean;
}

type LooseAsset = Partial<Asset> & {
    value?: number | string | null;
    ownership?: string;
    category?: string;
};

type LooseLiability = {
    description?: string | null;
    amount?: number | string | null;
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

let uiKeyCounter = 0;

const nextUiKey = (prefix: string) => `${prefix}-${++uiKeyCounter}`;

const normalizeText = (value?: string | null) => (value || '').trim();
const normalizeComparableText = (value?: string | null) => normalizeText(value).toLowerCase();

export const ASSET_CATEGORIES: Record<AssetCategoryKey, { label: string; type: Asset['type'] }> = {
    realEstate: { label: 'Real Estate', type: 'RealEstate' },
    bankAccounts: { label: 'Bank Accounts', type: 'Bank' },
    investments: { label: 'Investments', type: 'Investment' },
    business: { label: 'Business Interests', type: 'Business' },
    foreignAssets: { label: 'Foreign Assets', type: 'Other' },
    vehicles: { label: 'Vehicles', type: 'Other' },
    digital: { label: 'Digital Assets', type: 'Digital' },
    other: { label: 'Other Assets', type: 'Other' },
};

export const isAssetCategory = (value: unknown): value is AssetCategoryKey =>
    typeof value === 'string' && value in ASSET_CATEGORIES;

export const parseCurrencyNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number.parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

export const inferAssetCategory = (asset: Partial<Asset>): AssetCategoryKey => {
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

export const normalizeOwnership = (asset: Partial<Asset>): Asset['ownership'] | undefined => {
    if (asset.ownership === 'sole' || asset.ownership === 'joint' || asset.ownership === 'joint_other' || asset.ownership === 'tic') {
        return asset.ownership;
    }

    if (typeof asset.jointOwner === 'string' && asset.jointOwner.trim()) {
        return asset.jointOwner.toLowerCase() === 'spouse' ? 'joint' : 'joint_other';
    }

    return undefined;
};

export const formatAssetOwnershipLabel = (asset: Partial<Asset>): string => {
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
    ownership: AssetOwnershipInput | Asset['ownership'] | undefined,
    jointOwnerInput?: string | null,
): string | undefined => {
    if (ownership === 'joint') return 'Spouse';
    if (ownership === 'joint_other') return normalizeText(jointOwnerInput) || undefined;
    return undefined;
};

export const normalizeAssetItem = (asset: LooseAsset, fallbackCategory?: AssetCategoryKey): Asset => {
    const category = fallbackCategory ?? inferAssetCategory(asset);
    const ownership = normalizeOwnership(asset);

    return {
        type: ASSET_CATEGORIES[category].type,
        category,
        description: String(asset.description || '').trim(),
        value: parseCurrencyNumber(asset.value),
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
        const amount = parseCurrencyNumber(liability.amount);
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
        const items = assets?.[bucket];
        if (!Array.isArray(items)) continue;

        items.forEach((item: LooseAsset) => {
            normalized.push(normalizeAssetItem(item, category));
        });
    }

    return normalized;
};

export const getAssetsSummary = (assets: any): AssetsSummary => {
    const normalized = normalizeAssets(assets);
    const totalAssetValue = normalized.list.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const totalLiabilityValue = (normalized.liabilities || []).reduce((sum, liability) => sum + (liability.amount || 0), 0);

    return {
        assetCount: normalized.list.length,
        liabilityCount: normalized.liabilities?.length || 0,
        totalAssetValue,
        totalLiabilityValue,
        netEstateValue: totalAssetValue - totalLiabilityValue,
        hasRegisteredAssets: normalized.list.some((asset) =>
            inferAssetCategory(asset) === 'investments'
            && /RRSP|RRIF|TFSA|RESP/i.test(asset.description || '')
        ),
    };
};

export const normalizeAssets = (assets: any): Assets => {
    const list = getCanonicalAssetList(assets);
    const summary = getAssetsSummaryFromList(list, assets?.liabilities);
    const normalized: Assets = {
        list,
        totalEstimatedValue: summary.totalAssetValue,
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

const getAssetsSummaryFromList = (list: Asset[], liabilities?: LooseLiability[]) => {
    const totalAssetValue = list.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const totalLiabilityValue = (Array.isArray(liabilities) ? liabilities : [])
        .map((liability) => normalizeLiabilityItem(liability))
        .reduce((sum, liability) => sum + (liability.amount || 0), 0);

    return {
        totalAssetValue,
        totalLiabilityValue,
        netEstateValue: totalAssetValue - totalLiabilityValue,
    };
};

export const createEmptyAssetEditorRow = (category: AssetCategoryKey, overrides: Partial<AssetEditorRow> = {}): AssetEditorRow => ({
    uiKey: overrides.uiKey || nextUiKey(category),
    description: overrides.description ?? '',
    value: overrides.value ?? '',
    ownership: overrides.ownership ?? 'sole',
    jointOwner: overrides.jointOwner ?? '',
    hasBeneficiaryDesignation: overrides.hasBeneficiaryDesignation,
});

export const createEmptyLiabilityEditorRow = (overrides: Partial<LiabilityEditorRow> = {}): LiabilityEditorRow => ({
    uiKey: overrides.uiKey || nextUiKey('liability'),
    description: overrides.description ?? '',
    amount: overrides.amount ?? '',
});

export const createEmptyAssetsEditorState = (): AssetsEditorState => ({
    categories: Object.keys(ASSET_CATEGORIES).reduce((acc, key) => {
        acc[key as AssetCategoryKey] = { selected: false, items: [] };
        return acc;
    }, {} as Record<AssetCategoryKey, AssetCategoryEditorState>),
    liabilities: [],
    confirmedNoSignificantAssets: false,
    hasShareholderAgreement: false,
});

export const normalizeAssetsEditorState = (assets: any): AssetsEditorState => {
    const normalized = normalizeAssets(assets);
    const editorState = createEmptyAssetsEditorState();

    normalized.list.forEach((asset) => {
        const category = inferAssetCategory(asset);
        editorState.categories[category].selected = true;
        editorState.categories[category].items.push(createEmptyAssetEditorRow(category, {
            description: asset.description,
            value: asset.value ?? '',
            ownership: normalizeOwnership(asset) || '',
            jointOwner: normalizeOwnership(asset) === 'joint_other'
                ? normalizeText(asset.jointOwner)
                : '',
            hasBeneficiaryDesignation: asset.hasBeneficiaryDesignation,
        }));
    });

    editorState.liabilities = (normalized.liabilities || []).map((liability) => createEmptyLiabilityEditorRow({
        description: liability.description,
        amount: liability.amount ?? '',
    }));
    editorState.confirmedNoSignificantAssets = !!normalized.confirmedNoSignificantAssets;
    editorState.hasShareholderAgreement = !!normalized.hasShareholderAgreement;

    return editorState;
};

export const serializeAssetsEditorState = (editorState: AssetsEditorState): Assets => {
    const list = (Object.entries(editorState.categories) as Array<[AssetCategoryKey, AssetCategoryEditorState]>)
        .flatMap(([category, state]) => {
            if (!state.selected) return [];

            return state.items.map((item) => normalizeAssetItem({
                type: ASSET_CATEGORIES[category].type,
                category,
                description: item.description,
                value: item.value,
                ownership: item.ownership || undefined,
                jointOwner: deriveJointOwner(item.ownership, item.jointOwner),
                hasBeneficiaryDesignation: item.hasBeneficiaryDesignation,
            }, category));
        });

    const liabilities = editorState.liabilities.map((liability) => ({
        description: liability.description,
        amount: (() => {
            const amount = parseCurrencyNumber(liability.amount);
            return amount !== undefined && amount >= 0 ? amount : undefined;
        })(),
    }));
    const summary = getAssetsSummaryFromList(list, liabilities);

    return {
        list,
        liabilities,
        confirmedNoSignificantAssets: editorState.confirmedNoSignificantAssets || undefined,
        hasShareholderAgreement: editorState.categories.business.selected && editorState.hasShareholderAgreement
            ? true
            : undefined,
        totalEstimatedValue: summary.totalAssetValue,
    };
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
