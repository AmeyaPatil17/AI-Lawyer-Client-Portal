import type { Executor, Executors, Family } from '../types/intake';
import { normalizeMaritalStatus, requiresSpouseName } from './family';

export type ExecutorFormRow = {
    uiKey: string;
    fullName: string;
    relationship: string;
};

export type ExecutorsFormData = {
    primary: {
        fullName: string;
        relationship: string;
    };
    alternates: ExecutorFormRow[];
    compensation: 'guidelines' | 'gratis' | 'specific';
    compensationDetails: string;
};

export type ExecutorRowField = 'fullName' | 'relationship';

export type ExecutorFieldErrors = {
    primaryFullName?: string;
    compensationDetails?: string;
    alternates: Record<string, Partial<Record<ExecutorRowField, string>>>;
};

export type ExecutorValidationTarget =
    | { type: 'primaryFullName' }
    | { type: 'compensationDetails' }
    | { type: 'alternate'; uiKey: string; field: ExecutorRowField };

export type ExecutorsValidationResult = {
    isValid: boolean;
    message: string | null;
    errors: ExecutorFieldErrors;
    firstTarget: ExecutorValidationTarget | null;
};

let executorsUiKeyCounter = 0;

const createUiKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    executorsUiKeyCounter += 1;
    return `executor-row-${executorsUiKeyCounter}`;
};

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

const normalizeExecutorRelationship = (value?: unknown): string => {
    if (!value || typeof value !== 'object') {
        return '';
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.relationship === 'string' ? candidate.relationship : '';
};

export const normalizeExecutorRow = (value?: unknown): ExecutorFormRow => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    return {
        uiKey: normalizeText(candidate.uiKey) || normalizeText(candidate.id) || createUiKey(),
        fullName: normalizeExecutorName(candidate.fullName ?? value),
        relationship: normalizeExecutorRelationship(candidate),
    };
};

export const normalizeExecutorsData = (value?: unknown): ExecutorsFormData => {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};

    const primary = candidate.primary && typeof candidate.primary === 'object'
        ? candidate.primary as Record<string, unknown>
        : {};

    const compensation = candidate.compensation === 'gratis' || candidate.compensation === 'specific'
        ? candidate.compensation
        : 'guidelines';

    return {
        primary: {
            fullName: normalizeExecutorName(primary.fullName ?? candidate.primary),
            relationship: normalizeExecutorRelationship(primary),
        },
        alternates: Array.isArray(candidate.alternates)
            ? candidate.alternates.map((alternate) => normalizeExecutorRow(alternate))
            : [],
        compensation,
        compensationDetails: typeof candidate.compensationDetails === 'string'
            ? candidate.compensationDetails
            : '',
    };
};

export const createEmptyExecutorsForm = (): ExecutorsFormData =>
    normalizeExecutorsData(undefined);

export const createEmptyAlternateExecutor = (): ExecutorFormRow =>
    normalizeExecutorRow({});

const serializeExecutor = (row: { fullName?: string; relationship?: string }): Executor | undefined => {
    const fullName = normalizeText(row.fullName);
    const relationship = normalizeText(row.relationship);

    if (!fullName) {
        return undefined;
    }

    return {
        fullName,
        relationship: relationship || undefined,
    };
};

export const serializeExecutorsData = (form: ExecutorsFormData): Executors => {
    const compensation = form.compensation === 'gratis' || form.compensation === 'specific'
        ? form.compensation
        : 'guidelines';

    const alternates = form.alternates
        .map((alternate) => serializeExecutor(alternate))
        .filter((alternate): alternate is Executor => !!alternate);

    return {
        primary: serializeExecutor(form.primary),
        alternates,
        compensation,
        compensationDetails: compensation === 'specific'
            ? normalizeText(form.compensationDetails) || undefined
            : undefined,
    };
};

export const getSpouseExecutorCandidate = (family?: Partial<Family> | null) => {
    const maritalStatus = normalizeMaritalStatus(family?.maritalStatus);
    const spouseName = normalizeText(normalizeExecutorName(family?.spouseName));

    if (!requiresSpouseName(maritalStatus) || !spouseName) {
        return null;
    }

    return spouseName;
};

export const getExecutorsValidationResult = (
    value: unknown,
    options: { clientFullName?: string | null } = {},
): ExecutorsValidationResult => {
    const form = normalizeExecutorsData(value);
    const errors: ExecutorFieldErrors = { alternates: {} };
    const clientName = normalizeComparableName(options.clientFullName);
    const primaryName = normalizeComparableName(form.primary.fullName);
    const compensation = form.compensation === 'gratis' || form.compensation === 'specific'
        ? form.compensation
        : 'guidelines';
    const seenNames = new Map<string, string>();
    let message: string | null = null;
    let firstTarget: ExecutorValidationTarget | null = null;

    const registerError = (nextMessage: string, target: ExecutorValidationTarget) => {
        if (!message) {
            message = nextMessage;
            firstTarget = target;
        }
    };

    if (!primaryName) {
        errors.primaryFullName = 'Primary Executor is required.';
        registerError(errors.primaryFullName, { type: 'primaryFullName' });
    } else if (clientName && primaryName === clientName) {
        errors.primaryFullName = 'You cannot appoint yourself as Executor — the executor acts after your passing.';
        registerError(errors.primaryFullName, { type: 'primaryFullName' });
    } else {
        seenNames.set(primaryName, 'primary');
    }

    for (const alternate of form.alternates) {
        const rowErrors: Partial<Record<ExecutorRowField, string>> = {};
        const alternateName = normalizeComparableName(alternate.fullName);
        const alternateRelationship = normalizeText(alternate.relationship);

        if (!alternateName) {
            rowErrors.fullName = 'Alternate executor name is required.';
            registerError(rowErrors.fullName, { type: 'alternate', uiKey: alternate.uiKey, field: 'fullName' });
        } else if (clientName && alternateName === clientName) {
            rowErrors.fullName = 'You cannot appoint yourself as an alternate executor.';
            registerError(rowErrors.fullName, { type: 'alternate', uiKey: alternate.uiKey, field: 'fullName' });
        } else if (seenNames.has(alternateName)) {
            rowErrors.fullName = 'Each executor must be a different person.';
            registerError(rowErrors.fullName, { type: 'alternate', uiKey: alternate.uiKey, field: 'fullName' });
        } else {
            seenNames.set(alternateName, alternate.uiKey);
        }

        if (!alternateRelationship) {
            rowErrors.relationship = 'Relationship is required for each alternate executor.';
            registerError(rowErrors.relationship, { type: 'alternate', uiKey: alternate.uiKey, field: 'relationship' });
        }

        if (rowErrors.fullName || rowErrors.relationship) {
            errors.alternates[alternate.uiKey] = rowErrors;
        }
    }

    if (compensation === 'specific' && !normalizeText(form.compensationDetails)) {
        errors.compensationDetails = 'Specific compensation terms are required when you choose a specific amount.';
        registerError(errors.compensationDetails, { type: 'compensationDetails' });
    }

    return {
        isValid: !message,
        message,
        errors,
        firstTarget,
    };
};

export const getExecutorsValidationError = (
    value: unknown,
    options: { clientFullName?: string | null } = {},
) => getExecutorsValidationResult(value, options).message;

export const isExecutorsStepComplete = (
    value: unknown,
    options: { clientFullName?: string | null } = {},
) => getExecutorsValidationResult(value, options).isValid;
