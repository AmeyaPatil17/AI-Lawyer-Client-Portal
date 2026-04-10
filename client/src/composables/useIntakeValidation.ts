import type { IntakeData } from '../types/intake';
import api from '../api';
import { useIntakeStore } from '../stores/intake';
import { getAssetsValidationError, isAssetsStepComplete } from '../utils/assetList';
import { getExecutorsValidationError, isExecutorsStepComplete } from '../utils/executors';
import { hasMinorChildrenInFamily, requiresSpouseName } from '../utils/family';
import { getPoaValidationError, isPoaStepComplete } from '../utils/poa';

import { createValidationComposable, type ValidationStrategy } from './createValidationComposable';

// --- Strategies ---

const profileStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        if (!data.personalProfile?.fullName) return "Your Full Name is required.";
        if (!data.personalProfile?.dateOfBirth) return "Your Date of Birth is required.";
        if (!data.personalProfile?.maritalStatus) return "Your Marital Status is required.";
        return null;
    },
    isComplete: (data) =>
        !!data.personalProfile?.fullName &&
        !!data.personalProfile?.dateOfBirth &&
        !!data.personalProfile?.maritalStatus
};

const familyStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        if (!data.family?.maritalStatus) {
            return "Your Marital Status is required.";
        }
        if (requiresSpouseName(data.family?.maritalStatus) && !data.family?.spouseName) {
            return "You selected a partner status but haven't listed a Spouse / Partner name.";
        }
        if ((data as any).triage?.hasMinors && !hasMinorChildrenInFamily(data.family)) {
            return 'You indicated you have children under 18, but no minor child has been added yet.';
        }
        return null;
    },
    isComplete: (data) => {
        return !!data.family?.maritalStatus
            && (!requiresSpouseName(data.family.maritalStatus) || !!data.family?.spouseName)
            && (!(data as any).triage?.hasMinors || hasMinorChildrenInFamily(data.family));
    }
};

const executorsStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        const executorsData = (data as any)._draftExecutors ?? data.executors;
        return getExecutorsValidationError(executorsData, {
            clientFullName: data.personalProfile?.fullName,
        });
    },
    isComplete: (data) => isExecutorsStepComplete((data as any)._draftExecutors ?? data.executors, {
        clientFullName: data.personalProfile?.fullName,
    })
};

const beneficiariesStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        const bens = data.beneficiaries?.beneficiaries || [];
        if (bens.length === 0) return "You must list at least one beneficiary.";

        const total = bens.reduce((sum, b) => sum + (b.share || 0), 0);
        // Allow some floating point tolerance or strict 100 check?
        // Let's keep it simple. User might input integers.
        if (Math.abs(total - 100) > 0.1 && total !== 0) { // allow 0 checking loop? No, default is 0.
            // If they entered shares, they must sum to 100.
            // If all are 0/undefined, total is 0. 
        }
        // Actually, let's enforce 100% if there are beneficiaries
        if (total !== 100) return `Total shares must equal 100%. Current: ${total}%`;

        return null;
    },
    isComplete: (data) => {
        const bens = data.beneficiaries?.beneficiaries || [];
        if (bens.length === 0) return false;
        const total = bens.reduce((sum, b) => sum + (b.share || 0), 0);
        return Math.abs(total - 100) <= 0.1;
    }
};

const assetsStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        return getAssetsValidationError(data.assets);
    },
    isComplete: (data) => isAssetsStepComplete(data.assets)
};

const guardiansStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        const hasMinors = hasMinorChildrenInFamily(data.family);
        if (hasMinors && !data.guardians?.primary?.fullName) {
            return "You have minor children, so a Guardian is required.";
        }
        return null;
    },
    isComplete: (data) => {
        const hasMinors = hasMinorChildrenInFamily(data.family);
        if (hasMinors) return !!data.guardians?.primary?.fullName;
        return true; 
    }
};

const poaStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => getPoaValidationError(data.poa, {
        clientFullName: data.personalProfile?.fullName,
    }),
    isComplete: (data) => isPoaStepComplete(data.poa, {
        clientFullName: data.personalProfile?.fullName,
    })
};

const funeralStrategy: ValidationStrategy<IntakeData> = {
    validate: (_data) => {
        // Funeral is optional essentially, checking if they made a selection if the object acts 'initiated'
        return null;
    },
    isComplete: (data) => !!data.funeral?.type // Match funeral wizard logic
};

const priorWillsStrategy: ValidationStrategy<IntakeData> = {
    validate: (data) => {
        if (!data.priorWills?.hasPriorWill) return "Please indicate if you have a prior will.";
        return null;
    },
    isComplete: (data) => !!data.priorWills?.hasPriorWill
};


const strategies: Record<string, ValidationStrategy<IntakeData>> = {
    personalProfile: profileStrategy,
    family: familyStrategy,
    executors: executorsStrategy,
    beneficiaries: beneficiariesStrategy,
    assets: assetsStrategy,
    guardians: guardiansStrategy,
    poa: poaStrategy,
    funeral: funeralStrategy,
    'prior-wills': priorWillsStrategy
};

export function useIntakeValidation() {
    const base = createValidationComposable<IntakeData>(strategies);

    const validateWithAI = async (stepContext: string): Promise<string | null> => {
        const store = useIntakeStore();
        if (!store.currentIntakeId) return null;

        try {
            const response = await api.post(`/intake/${store.currentIntakeId}/validate-logic`, { context: stepContext });
            return response.data.warning;
        } catch (error) {
            console.error('AI Validation failed', error);
            return null;
        }
    };

    return {
        ...base,
        validateWithAI
    };
}
