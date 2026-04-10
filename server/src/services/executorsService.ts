import { Executors, Family } from '../types/intake';

type ExecutorLike = {
    fullName?: unknown;
    relationship?: unknown;
    id?: unknown;
    uiKey?: unknown;
    name?: unknown;
};

const PARTNER_STATUSES = new Set(['married', 'commonlaw', 'common law', 'common-law']);

export const normalizeText = (value?: unknown) =>
    typeof value === 'string' ? value.trim() : '';

export const normalizeComparableName = (value?: unknown) =>
    normalizeText(value).toLowerCase();

export const normalizeExecutorName = (value?: unknown): string => {
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
    if (!value || typeof value !== 'object') {
        return '';
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.relationship === 'string' ? candidate.relationship : '';
};

export const normalizeExecutors = (value?: unknown): Executors => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    const primary = candidate.primary && typeof candidate.primary === 'object'
        ? candidate.primary as ExecutorLike
        : {};
    const alternates = Array.isArray(candidate.alternates)
        ? candidate.alternates
            .map((alternate) => {
                const alt = alternate && typeof alternate === 'object'
                    ? alternate as ExecutorLike
                    : {};
                const fullName = normalizeText(normalizeExecutorName(alt.fullName ?? alternate));
                if (!fullName) {
                    return null;
                }

                const relationship = normalizeText(normalizeRelationship(alt));
                return {
                    fullName,
                    relationship: relationship || undefined,
                };
            })
            .filter((alternate): alternate is NonNullable<typeof alternate> => !!alternate)
        : [];

    const primaryName = normalizeText(normalizeExecutorName(primary.fullName ?? candidate.primary));
    const primaryRelationship = normalizeText(normalizeRelationship(primary));
    const compensation = candidate.compensation === 'gratis' || candidate.compensation === 'specific'
        ? candidate.compensation
        : 'guidelines';

    return {
        primary: primaryName
            ? {
                fullName: primaryName,
                relationship: primaryRelationship || undefined,
            }
            : undefined,
        alternates,
        compensation,
        compensationDetails: compensation === 'specific'
            ? normalizeText(candidate.compensationDetails) || undefined
            : undefined,
    };
};

export const getSpouseExecutorCandidate = (family?: Partial<Family> | null) => {
    const maritalStatus = normalizeComparableName(family?.maritalStatus);
    const spouseName = normalizeText(normalizeExecutorName(family?.spouseName));

    if (!PARTNER_STATUSES.has(maritalStatus) || !spouseName) {
        return null;
    }

    return spouseName;
};

export const getExecutorsValidationError = (
    value: unknown,
    options: { clientFullName?: string | null } = {},
) => {
    const executors = normalizeExecutors(value);
    const clientName = normalizeComparableName(options.clientFullName);
    const primaryName = normalizeComparableName(executors.primary?.fullName);
    const seenNames = new Set<string>();

    if (!primaryName) {
        return "You haven't appointed a Primary Executor. Who will manage your estate?";
    }

    if (clientName && primaryName === clientName) {
        return 'You cannot appoint yourself as Executor — the executor acts after your passing.';
    }

    seenNames.add(primaryName);

    for (const alternate of executors.alternates || []) {
        const alternateName = normalizeComparableName(alternate.fullName);
        if (!alternateName) {
            return 'Please provide a name for every alternate executor.';
        }
        if (clientName && alternateName === clientName) {
            return 'You cannot appoint yourself as an alternate executor.';
        }
        if (seenNames.has(alternateName)) {
            return 'Each executor must be a different person.';
        }
        if (!normalizeText(alternate.relationship)) {
            return 'Please provide a relationship for every alternate executor.';
        }

        seenNames.add(alternateName);
    }

    if (executors.compensation === 'specific' && !normalizeText(executors.compensationDetails)) {
        return 'Specific compensation terms are required when you choose a specific amount.';
    }

    return null;
};

export const isExecutorsStepComplete = (
    value: unknown,
    options: { clientFullName?: string | null } = {},
) => getExecutorsValidationError(value, options) === null;
