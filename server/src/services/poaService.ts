import { PowerOfAttorney } from '../types/intake';

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

type PoaBranch = {
    primaryName?: string;
    primaryRelationship?: string;
    alternateName?: string;
    alternateRelationship?: string;
    decisionMode?: string;
};

type PersonalCareBranch = PoaBranch & {
    hasLivingWill?: boolean;
    healthInstructions?: string;
};

const normalizeBranch = (
    value?: unknown,
    options: { includePersonalCareFields?: boolean } = {},
): PoaBranch | PersonalCareBranch => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    const base: PoaBranch = {
        primaryName: normalizePoaText(normalizePoaName(candidate.primaryName)) || undefined,
        primaryRelationship: normalizeRelationship(candidate.primaryRelationship) || undefined,
        alternateName: normalizePoaText(normalizePoaName(candidate.alternateName)) || undefined,
        alternateRelationship: normalizeRelationship(candidate.alternateRelationship) || undefined,
        decisionMode: normalizePoaText(candidate.decisionMode) || LEGACY_DECISION_MODE,
    };

    if (!options.includePersonalCareFields) {
        return base;
    }

    return {
        ...base,
        hasLivingWill: candidate.hasLivingWill === true,
        healthInstructions: normalizePoaText(candidate.healthInstructions) || undefined,
    };
};

export const normalizePoaData = (value?: unknown): PowerOfAttorney => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    return {
        property: normalizeBranch(candidate.property),
        personalCare: normalizeBranch(candidate.personalCare, { includePersonalCareFields: true }),
    };
};

export const serializePoaData = (value?: unknown): PowerOfAttorney => {
    const poa = normalizePoaData(value);

    return {
        property: {
            primaryName: poa.property?.primaryName,
            primaryRelationship: poa.property?.primaryRelationship,
            alternateName: poa.property?.alternateName,
            alternateRelationship: poa.property?.alternateRelationship,
        },
        personalCare: {
            primaryName: poa.personalCare?.primaryName,
            primaryRelationship: poa.personalCare?.primaryRelationship,
            alternateName: poa.personalCare?.alternateName,
            alternateRelationship: poa.personalCare?.alternateRelationship,
            hasLivingWill: poa.personalCare?.hasLivingWill === true,
            healthInstructions: poa.personalCare?.healthInstructions,
        },
    };
};

const getBranchLabel = (branch: 'property' | 'personalCare') =>
    branch === 'property' ? 'Property' : 'Personal Care';

const validateBranch = (
    label: 'property' | 'personalCare',
    branch: PoaBranch | PersonalCareBranch | undefined,
    options: { clientFullName?: string | null } = {},
) => {
    const clientName = normalizePoaComparableName(options.clientFullName);
    const primaryName = normalizePoaComparableName(branch?.primaryName);
    const alternateName = normalizePoaComparableName(branch?.alternateName);
    const primaryRelationship = normalizePoaText(branch?.primaryRelationship);
    const alternateRelationship = normalizePoaText(branch?.alternateRelationship);
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
    options: { clientFullName?: string | null } = {},
) => {
    const poa = normalizePoaData(value);

    const propertyError = validateBranch('property', poa.property, options);
    if (propertyError) {
        return propertyError;
    }

    const personalCareError = validateBranch('personalCare', poa.personalCare, options);
    if (personalCareError) {
        return personalCareError;
    }

    if (poa.personalCare?.hasLivingWill && !normalizePoaText(poa.personalCare?.healthInstructions)) {
        return 'Please include your health instructions when you choose to add a Living Will clause.';
    }

    return null;
};

export const isPoaStepComplete = (
    value?: unknown,
    options: { clientFullName?: string | null } = {},
) => getPoaValidationError(value, options) === null;
