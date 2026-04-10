import { hasAssetCategory } from './assetListService';

// Helper to handle mixed string/object person data
const getName = (val: any): string => {
    if (typeof val === 'string') return val;
    return val?.name || '';
};

const getId = (val: any): string | undefined => {
    if (typeof val === 'object' && val?.id) return val.id;
    return undefined;
};

const matchPeople = (p1: any, p2: any): boolean => {
    const id1 = getId(p1);
    const id2 = getId(p2);

    // 1. If both have IDs, match strictly by ID
    if (id1 && id2) return id1 === id2;

    // 2. Fallback to name matching (Legacy or newly typed items)
    const n1 = getName(p1).trim().toLowerCase();
    const n2 = getName(p2).trim().toLowerCase();
    if (!n1 || !n2) return false;
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

export const generateFlags = (data: any) => {
    const flags: Array<{ type: 'hard' | 'soft', message: string, code: string }> = [];

    // 1. Residency Check
    if (data.triage?.ontarioResidency === false) {
        flags.push({ type: 'hard', message: 'Client is not an Ontario resident.', code: 'RESIDENCY_FAIL' });
    }

    // 2. Marital Status & Spousal Rights
    if (data.family?.maritalStatus === 'married' || data.family?.maritalStatus === 'commonLaw') {
        const spouseName = data.family?.spouseName;
        // Check if spouse is a beneficiary (heuristic)
        const spouseBeneficiary = data.beneficiaries?.beneficiaries?.find((b: any) =>
            b.relationship === 'Spouse' || matchPeople(spouseName, b.fullName)
        );
        if (!spouseBeneficiary) {
            flags.push({ type: 'soft', message: 'Spouse is not listed as a beneficiary. Potential Family Law Act claim.', code: 'SPOUSAL_OMISSION' });
        }
    }

    // 3. Minors & Guardians
    const hasMinors = data.family?.children?.some((c: any) => {
        // Precise Age Check
        const dobStr = c.dateOfBirth;
        if (!dobStr) return false;

        const dob = new Date(dobStr);
        const today = new Date();

        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        return age < 18;
    });

    if (hasMinors && (!data.guardians?.primary || !getName(data.guardians?.primary?.fullName))) {
        flags.push({ type: 'hard', message: 'Minor children detected but no guardians appointed.', code: 'MISSING_GUARDIAN' });
    }

    // 4. Foreign Assets
    if (hasAssetCategory(data.assets, 'foreignAssets')) {
        flags.push({ type: 'soft', message: 'Foreign assets detected. May require multiple wills or foreign legal advice.', code: 'FOREIGN_ASSETS' });
    }

    // 5. Business Assets
    if (hasAssetCategory(data.assets, 'business')) {
        flags.push({ type: 'soft', message: 'Business assets detected. Consider Secondary Will for probate tax planning.', code: 'BUSINESS_ASSETS' });
    }

    return flags;
};

export const validateLogic = (data: any) => {
    const warnings: Array<{ code: string, message: string, severity: 'warning' | 'info' }> = [];

    // 1. Cross-Check: Child in Family but not Beneficiary
    if (data.family?.children?.length > 0 && data.beneficiaries?.beneficiaries?.length > 0) {
        const excluded = data.family.children.filter((c: any) => {
            return !data.beneficiaries.beneficiaries.some((b: any) => matchPeople(c.fullName, b.fullName));
        });

        if (excluded.length > 0) {
            warnings.push({
                code: 'POSSIBLE_DISINHERITANCE',
                message: `Child(ren) listed in Family but not in Beneficiaries: ${excluded.map((c: any) => getName(c.fullName)).join(', ')}.`,
                severity: 'warning'
            });
        }
    }

    // 2. Cross-Check: Business Asset vs Spousal Executor
    const hasBusiness = hasAssetCategory(data.assets, 'business');
    const primaryExecutorRel = data.executors?.primary?.relationship?.toLowerCase();

    if (hasBusiness && (primaryExecutorRel === 'spouse' || primaryExecutorRel === 'partner')) {
        warnings.push({
            code: 'EXECUTOR_CAPABILITY',
            message: 'Business assets detected, but Primary Executor is Spouse. Consider if a Corporate Executor is needed.',
            severity: 'info'
        });
    }

    return warnings;
};
