import type { PowerOfAttorney } from '../types/intake';

export const POA_RELATIONSHIP_OPTIONS = [
    'Spouse',
    'Child',
    'Parent',
    'Sibling',
    'Relative',
    'Friend',
    'Professional',
] as const;

export type PoaRelationshipOption = typeof POA_RELATIONSHIP_OPTIONS[number];

export type PoaBranchFormData = {
    primaryName: string;
    primaryRelationship: string;
    alternateName: string;
    alternateRelationship: string;
    decisionMode?: string;
};

export type PersonalCarePoaFormData = PoaBranchFormData & {
    hasLivingWill: boolean;
    healthInstructions: string;
};

export type PoaFormData = {
    property: PoaBranchFormData;
    personalCare: PersonalCarePoaFormData;
};

const LEGACY_DECISION_MODE = 'jointlyAndSeverally';

export const normalizePoaText = (value?: unknown) =>
    typeof value === 'string' ? value.trim() : '';

export const normalizePoaComparableName = (value?: unknown) =>
    normalizePoaText(value).toLowerCase();

export const normalizePoaName = (value?: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (!value || typeof value !== 'object') {
        return '';
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.fullName === 'string') {
        return candidate.fullName;
    }
    if (typeof candidate.name === 'string') {
        return candidate.name;
    }

    return '';
};

const normalizeRelationship = (value?: unknown): string => {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (!value || typeof value !== 'object') {
        return '';
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.relationship === 'string' ? candidate.relationship.trim() : '';
};

const normalizeBranch = (
    value?: unknown,
    options: { includePersonalCareFields?: boolean } = {},
): PoaBranchFormData | PersonalCarePoaFormData => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    const base: PoaBranchFormData = {
        primaryName: normalizePoaName(candidate.primaryName),
        primaryRelationship: normalizeRelationship(candidate.primaryRelationship),
        alternateName: normalizePoaName(candidate.alternateName),
        alternateRelationship: normalizeRelationship(candidate.alternateRelationship),
        decisionMode: normalizePoaText(candidate.decisionMode) || LEGACY_DECISION_MODE,
    };

    if (!options.includePersonalCareFields) {
        return base;
    }

    return {
        ...base,
        hasLivingWill: candidate.hasLivingWill === true,
        healthInstructions: normalizePoaText(candidate.healthInstructions),
    };
};

export const normalizePoaData = (value?: unknown): PoaFormData => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    return {
        property: normalizeBranch(candidate.property) as PoaBranchFormData,
        personalCare: normalizeBranch(candidate.personalCare, { includePersonalCareFields: true }) as PersonalCarePoaFormData,
    };
};

const serializeBranch = (value: PoaBranchFormData) => ({
    primaryName: normalizePoaText(value.primaryName) || undefined,
    primaryRelationship: normalizePoaText(value.primaryRelationship) || undefined,
    alternateName: normalizePoaText(value.alternateName) || undefined,
    alternateRelationship: normalizePoaText(value.alternateRelationship) || undefined,
});

export const serializePoaData = (value?: unknown): PowerOfAttorney => {
    const poa = normalizePoaData(value);

    return {
        property: serializeBranch(poa.property),
        personalCare: {
            ...serializeBranch(poa.personalCare),
            hasLivingWill: poa.personalCare.hasLivingWill,
            healthInstructions: poa.personalCare.hasLivingWill
                ? normalizePoaText(poa.personalCare.healthInstructions) || undefined
                : normalizePoaText(poa.personalCare.healthInstructions) || undefined,
        },
    };
};

export const isKnownPoaRelationship = (value?: unknown): value is PoaRelationshipOption =>
    POA_RELATIONSHIP_OPTIONS.includes(normalizePoaText(value) as PoaRelationshipOption);

type PoaValidationOptions = {
    clientFullName?: string | null;
};

const getBranchLabel = (branch: 'property' | 'personalCare') =>
    branch === 'property' ? 'Property' : 'Personal Care';

const validateBranch = (
    label: 'property' | 'personalCare',
    branch: PoaBranchFormData | PersonalCarePoaFormData,
    options: PoaValidationOptions,
): string | null => {
    const clientName = normalizePoaComparableName(options.clientFullName);
    const primaryName = normalizePoaComparableName(branch.primaryName);
    const alternateName = normalizePoaComparableName(branch.alternateName);
    const primaryRelationship = normalizePoaText(branch.primaryRelationship);
    const alternateRelationship = normalizePoaText(branch.alternateRelationship);
    const branchLabel = getBranchLabel(label);

    if (!primaryName) {
        return `Primary Attorney for ${branchLabel} is required.`;
    }

    if (!primaryRelationship) {
        return `Please select the relationship for your ${branchLabel} Attorney.`;
    }

    if (clientName && primaryName === clientName) {
        return `You cannot appoint yourself as your ${branchLabel} Attorney.`;
    }

    if (!!alternateName !== !!alternateRelationship) {
        return alternateName
            ? `Please select the relationship for your ${branchLabel} Alternate Attorney.`
            : `Please provide the name of your ${branchLabel} Alternate Attorney.`;
    }

    if (alternateName) {
        if (clientName && alternateName === clientName) {
            return `You cannot appoint yourself as your ${branchLabel} Alternate Attorney.`;
        }

        if (alternateName === primaryName) {
            return `Your ${branchLabel} primary and alternate attorneys must be different people.`;
        }
    }

    return null;
};

export const getPoaValidationError = (
    value?: unknown,
    options: PoaValidationOptions = {},
): string | null => {
    const poa = normalizePoaData(value);

    const propertyError = validateBranch('property', poa.property, options);
    if (propertyError) {
        return propertyError;
    }

    const personalCareError = validateBranch('personalCare', poa.personalCare, options);
    if (personalCareError) {
        return personalCareError;
    }

    if (poa.personalCare.hasLivingWill && !normalizePoaText(poa.personalCare.healthInstructions)) {
        return 'Please include your health instructions when you choose to add a Living Will clause.';
    }

    return null;
};

export const isPoaStepComplete = (
    value?: unknown,
    options: PoaValidationOptions = {},
) => getPoaValidationError(value, options) === null;

export const getPoaRelationshipModel = (value?: unknown) => {
    const relationship = normalizePoaText(value);
    if (!relationship) {
        return { selectValue: '', otherValue: '' };
    }

    if (isKnownPoaRelationship(relationship)) {
        return { selectValue: relationship, otherValue: '' };
    }

    return { selectValue: 'Other', otherValue: relationship };
};
