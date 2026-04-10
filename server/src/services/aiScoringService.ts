import { getAssetsByCategory, hasAssetCategory } from './assetListService';

export const calculatePriorityScore = (intakeData: any): number => {
    let score = 0;
    const d = intakeData;

    // 1. Asset Complexity (Base 20)
    const hasBusiness = hasAssetCategory(d.assets, 'business');
    const propertCount = getAssetsByCategory(d.assets, 'realEstate').length;

    if (hasBusiness) score += 30; // Business is complex
    if (propertCount > 1) score += 20 * propertCount; // More properties = more work
    if (d.assets?.investments) score += 10;

    // 2. Family Complexity
    if (d.family?.maritalStatus === 'Separated' || d.family?.maritalStatus === 'Divorced') score += 15;
    if (d.family?.children?.some((c: any) => c.parentage === 'previous')) score += 25; // Blended family

    // 3. Risk Flags
    if (d.priorWills?.hasForeignWill === 'yes') score += 40; // High complexity

    // Cap at 100
    return Math.min(score, 100);
};

export const generateAutoNote = (oldData: any, newData: any): string | null => {
    // 1. Beneficiary Changes
    const oldBenCount = oldData?.beneficiaries?.beneficiaries?.length || 0;
    const newBenCount = newData?.beneficiaries?.beneficiaries?.length || 0;

    if (newBenCount < oldBenCount) {
        return "I noticed you removed a beneficiary. Would you like to add a note explaining the reason for this removal?";
    }

    if (newData?.beneficiaries?.beneficiaries && oldData?.beneficiaries?.beneficiaries) {
        // Check for share changes > 20%
        // Simple check: finding a matching name with diff share
        const shareChanged = newData.beneficiaries.beneficiaries.some((nb: any) => {
            const ob = oldData.beneficiaries.beneficiaries.find((b: any) => b.fullName === nb.fullName);
            return ob && Math.abs((nb.share || 0) - (ob.share || 0)) >= 20;
        });

        if (shareChanged) {
            return "Significant changes to beneficiary shares detected. Would you like to document the client's instruction?";
        }
    }

    // 2. Executor Changes
    const oldPrimary = oldData?.executors?.primary?.fullName;
    const newPrimary = newData?.executors?.primary?.fullName;

    if (oldPrimary && newPrimary && oldPrimary !== newPrimary) {
        return `Primary Executor changed from ${oldPrimary} to ${newPrimary}. Add a note about why this change was made?`;
    }

    return null;
};
