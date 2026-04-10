
import { inferAssetCategory } from '../utils/assetList';

export interface Flag {
    code: string;
    label: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
}

export const detectFlags = (data: any): Flag[] => {
    const flags: Flag[] = [];

    if (!data) return flags;

    const hasBusinessAssets = Array.isArray(data.assets?.list)
        ? data.assets.list.some((asset: any) => inferAssetCategory(asset) === 'business')
        : Array.isArray(data.assets?.business_items) && data.assets.business_items.length > 0;

    // 1. Blended Family
    // If married/commonLaw and children exist with 'previous' parentage OR if specific check logic
    if (data.family) {
        if (['married', 'commonLaw'].includes(data.family.maritalStatus)) {
            const children = data.family.children || [];
            const hasKidsFromPrevious = children.some((c: any) => c.parentage === 'previous');
            if (hasKidsFromPrevious) {
                flags.push({
                    code: 'BLENDED_FAMILY',
                    label: 'Blended Family',
                    severity: 'high',
                    description: 'Client has children from a previous relationship. Risk of spousal claims vs child inheritance.'
                });
            }
        }
    }

    // 2. Foreign Assets
    if (data.assets) {
        // Check if categorical "foreign" was selected (if data model supports it)
        // OR check priorWills
    }
    if (data.priorWills?.hasForeignWill === 'yes') {
        flags.push({
            code: 'FOREIGN_WILL',
            label: 'Foreign Will Exists',
            severity: 'high',
            description: 'Client has an existing foreign will. Drafting must avoid accidental revocation.'
        });
    }

    // 3. Business Interests
    // Need to check assets structure. Assuming keys/categories logic based on Assets.vue
    // Assets.vue uses form[key + '_items'].
    if (hasBusinessAssets) {
        flags.push({
            code: 'BUSINESS_INTERESTS',
            label: 'Business Owner',
            severity: 'medium',
            description: 'Client owns business assets (shares/partnership). Review for secondary will need.'
        });
    }

    // 4. Henson Trust / Disability
    if (data.family?.children?.some((c: any) => c.isDisabled)) {
        flags.push({
            code: 'DISABLED_DEPENDANT',
            label: 'Disabled Beneficiary',
            severity: 'high',
            description: 'Beneficiary marked as disabled. Henson Trust likely required.'
        });
    }

    // 5. Executor Complexity (Non-resident)
    // Needs detailed check if we had addresses.
    // For now, check if "Professional" is selected
    if (data.executors?.primary?.relationship === 'Professional') {
        flags.push({
            code: 'PROFESSIONAL_EXECUTOR',
            label: 'Professional Executor',
            severity: 'low',
            description: 'Client named a professional/trust company. Confirm fee agreement.'
        });
    }

    return flags;
};
