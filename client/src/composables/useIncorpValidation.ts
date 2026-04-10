import type { IncorporationData } from '../stores/incorpTypes';
import { createValidationComposable, type ValidationStrategy } from './createValidationComposable';
import {
    getBlockingIncorpIssues,
    isIncorpSectionComplete,
    validateIncorpSection,
} from '../utils/incorpRules';

const contexts = [
    'preIncorporation',
    'structureOwnership',
    'articles',
    'postIncorpOrg',
    'shareIssuance',
    'corporateRecords',
    'registrations',
    'bankingSetup',
] as const;

const strategies: Record<string, ValidationStrategy<IncorporationData>> = contexts.reduce(
    (acc, context) => {
        acc[context] = {
            validate: (data) => validateIncorpSection(context, data),
            isComplete: (data) => isIncorpSectionComplete(context, data),
        };
        return acc;
    },
    {} as Record<string, ValidationStrategy<IncorporationData>>
);

strategies.review = {
    validate: () => null,
    isComplete: () => false,
};

export function useIncorpValidation() {
    const validation = createValidationComposable<IncorporationData>(strategies);

    return {
        ...validation,
        getBlockingIssues: (data: IncorporationData) => getBlockingIncorpIssues(data),
    };
}
