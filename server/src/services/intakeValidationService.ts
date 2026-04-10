import { IntakeData, StepStatus } from '../types/intake';
import { getExecutorsValidationError, isExecutorsStepComplete } from './executorsService';
import { getAssetsValidationError, isAssetsStepComplete } from './assetListService';
import { getPoaValidationError, isPoaStepComplete } from './poaService';

const normalizeStatus = (value?: string | null) =>
    (value || '').replace(/[\s-]+/g, '').trim().toLowerCase();

const requiresSpouseName = (value?: string | null) => {
    const normalized = normalizeStatus(value);
    return normalized === 'married' || normalized === 'commonlaw';
};

const parseDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isMinorChild = (value: any, now = new Date()) => {
    const dob = parseDate(value?.dateOfBirth);
    if (!dob) return false;

    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
    }

    return age < 18;
};

const hasMinorChildren = (data: IntakeData) =>
    (data.family?.children || []).some((child) => isMinorChild(child));

const getBeneficiariesValidationError = (data: IntakeData) => {
    const beneficiaries = data.beneficiaries?.beneficiaries || [];
    if (beneficiaries.length === 0) {
        return "You haven't listed any beneficiaries. Who should receive your assets?";
    }

    const total = beneficiaries.reduce((sum, beneficiary) => sum + (Number(beneficiary.share) || 0), 0);
    if (Math.abs(total - 100) > 0.1) {
        return `Total beneficiary shares must equal 100%. Current total: ${total}%.`;
    }

    return null;
};

const getPowerOfAttorneyValidationError = (data: IntakeData) =>
    getPoaValidationError(data.poa, {
        clientFullName: data.personalProfile?.fullName,
    });

const getFuneralValidationError = (data: IntakeData) => {
    if (!(data.funeral as any)?.type) {
        return 'Please select your funeral preference.';
    }
    return null;
};

const getPriorWillsValidationError = (data: IntakeData) => {
    if (!data.priorWills?.hasPriorWill) {
        return 'Please indicate if you have a prior will.';
    }
    return null;
};

export class IntakeValidationService {

    /**
     * returns error message or null if valid
     */
    static validateStep(stepContext: string, data: IntakeData): string | null {
        // 1. Profile
        if (stepContext === 'personalProfile') {
            if (!data.personalProfile?.fullName) {
                return "Your Full Name is required for the Will.";
            }
            if (!data.personalProfile?.dateOfBirth) {
                return 'Your Date of Birth is required.';
            }
            if (!data.personalProfile?.maritalStatus) {
                return 'Your Marital Status is required.';
            }
        }

        // 2. Family
        if (stepContext === 'family') {
            if (!data.family?.maritalStatus) {
                return 'Your Marital Status is required.';
            }
            if (requiresSpouseName(data.family?.maritalStatus) && !data.family?.spouseName) {
                return "You selected a partner status but haven't listed a Spouse / Partner name.";
            }
        }

        // 3. Executors
        if (stepContext === 'executors') {
            return getExecutorsValidationError(data.executors, {
                clientFullName: data.personalProfile?.fullName,
            });
        }

        // 4. Beneficiaries
        if (stepContext === 'beneficiaries') {
            return getBeneficiariesValidationError(data);
        }

        if (stepContext === 'guardians') {
            if (hasMinorChildren(data) && !data.guardians?.primary?.fullName) {
                return 'You have minor children, so a guardian is required.';
            }
        }

        if (stepContext === 'assets') {
            return getAssetsValidationError(data.assets);
        }

        if (stepContext === 'poa') {
            return getPowerOfAttorneyValidationError(data);
        }

        if (stepContext === 'funeral') {
            return getFuneralValidationError(data);
        }

        if (stepContext === 'prior-wills') {
            return getPriorWillsValidationError(data);
        }

        return null; // Valid
    }

    static getStepStatus(stepContext: string, data: IntakeData): StepStatus {
        // 1. Profile
        if (stepContext === 'personalProfile') {
            if (!this.validateStep('personalProfile', data)) return 'complete';
            if (data.personalProfile) return 'warning';
            return 'pending';
        }

        // 2. Family
        if (stepContext === 'family') {
            if (this.validateStep('family', data)) return data.family ? 'warning' : 'pending';
            if (data.family?.maritalStatus) return 'complete';
            return 'pending';
        }

        // 3. Executors
        if (stepContext === 'executors') {
            if (isExecutorsStepComplete(data.executors, {
                clientFullName: data.personalProfile?.fullName,
            })) return 'complete';
            if (data.executors) return 'warning';
            return 'pending';
        }

        // 4. Beneficiaries
        if (stepContext === 'beneficiaries') {
            if (!getBeneficiariesValidationError(data)) return 'complete';
            return 'pending';
        }

        if (stepContext === 'guardians') {
            if (!hasMinorChildren(data)) return 'complete';
            if (!this.validateStep('guardians', data)) return 'complete';
            return data.guardians ? 'warning' : 'pending';
        }

        if (stepContext === 'assets') {
            if (isAssetsStepComplete(data.assets)) return 'complete';
            return data.assets ? 'warning' : 'pending';
        }

        if (stepContext === 'poa') {
            if (isPoaStepComplete(data.poa, {
                clientFullName: data.personalProfile?.fullName,
            })) return 'complete';
            return data.poa ? 'warning' : 'pending';
        }

        if (stepContext === 'funeral') {
            if (!getFuneralValidationError(data)) return 'complete';
            return data.funeral ? 'warning' : 'pending';
        }

        if (stepContext === 'prior-wills') {
            if (!getPriorWillsValidationError(data)) return 'complete';
            return data.priorWills ? 'warning' : 'pending';
        }

        // Default Generic Check
        if (data[stepContext as keyof IntakeData]) return 'complete';

        return 'pending';
    }

    static isStepComplete(stepContext: string, data: IntakeData): boolean {
        return this.getStepStatus(stepContext, data) === 'complete';
    }

    static getNextMissingStep(data: IntakeData): string | null {
        if (!this.isStepComplete('personalProfile', data)) return 'personalProfile';
        if (!this.isStepComplete('family', data)) return 'family';
        if (hasMinorChildren(data) && !this.isStepComplete('guardians', data)) return 'guardians';
        if (!this.isStepComplete('executors', data)) return 'executors';
        if (!this.isStepComplete('beneficiaries', data)) return 'beneficiaries';
        if (!this.isStepComplete('assets', data)) return 'assets';
        if (!this.isStepComplete('poa', data)) return 'poa';
        if (!this.isStepComplete('funeral', data)) return 'funeral';
        if (!this.isStepComplete('prior-wills', data)) return 'prior-wills';

        return null;
    }

    static getWillSubmissionBlockingSections(data: IntakeData): Array<{ context: string; message: string }> {
        const contexts = [
            'personalProfile',
            'family',
            'executors',
            'beneficiaries',
            'guardians',
            'assets',
            'poa',
            'funeral',
            'prior-wills',
        ] as const;

        const issues = contexts.map((context) => ({
            context,
            message: this.validateStep(context, data),
        }));

        return issues.filter((issue): issue is typeof issues[number] & { message: string } => !!issue.message);
    }
}
