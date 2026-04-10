import type {
    IncorporationData,
    ShareClass,
    Shareholder,
    Director,
    ShareIssuance,
    PostIncorpOrg,
    Registrations,
} from '../stores/incorpTypes';

type DirectorConsent = NonNullable<PostIncorpOrg['directorConsents']>[number];
type SubscriptionAgreement = NonNullable<ShareIssuance['subscriptionAgreements']>[number];
type MunicipalLicence = NonNullable<Registrations['municipalLicences']>[number];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const nextId = (prefix: string) =>
    `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

type WithId = { id?: string };

const ensureIds = <T extends WithId>(items: T[] | undefined, prefix: string): T[] =>
    (items || []).map((item) => ({
        ...item,
        id: item.id || nextId(prefix),
    }));

export const getClientNotes = (data: Partial<IncorporationData>): string =>
    data.incorpNotes?.clientNotes || (data as any).clientNotes || '';

export const setClientNotes = (
    data: Partial<IncorporationData>,
    clientNotes: string
): Partial<IncorporationData> => {
    const next = clone(data);
    const trimmed = clientNotes.trim();

    next.incorpNotes = {
        ...(next.incorpNotes || {}),
        clientNotes: trimmed || undefined,
    };

    if ('clientNotes' in next) {
        delete (next as any).clientNotes;
    }

    return next;
};

export const normalizeIncorpData = (
    input: Partial<IncorporationData> | undefined
): IncorporationData => {
    const data = clone(input || {}) as IncorporationData;

    if ((data as any).submittedAt && !data.submissionDate) {
        data.submissionDate = (data as any).submittedAt;
    }

    data.incorpNotes = {
        ...(data.incorpNotes || {}),
        clientNotes: getClientNotes(data) || undefined,
    };

    if ('clientNotes' in data) {
        delete (data as any).clientNotes;
    }

    if (data.structureOwnership) {
        data.structureOwnership.shareClasses = ensureIds<ShareClass>(
            data.structureOwnership.shareClasses,
            'share_class'
        );
        data.structureOwnership.initialShareholders = ensureIds<Shareholder>(
            data.structureOwnership.initialShareholders,
            'shareholder'
        );
        data.structureOwnership.directors = ensureIds<Director>(
            data.structureOwnership.directors,
            'director'
        );
    }

    if (data.postIncorpOrg) {
        data.postIncorpOrg.directorConsents = ensureIds<DirectorConsent>(
            data.postIncorpOrg.directorConsents,
            'director_consent'
        );
    }

    if (data.shareIssuance) {
        data.shareIssuance.subscriptionAgreements = ensureIds<SubscriptionAgreement>(
            data.shareIssuance.subscriptionAgreements,
            'subscription'
        );
    }

    if (data.registrations) {
        data.registrations.municipalLicences = ensureIds<MunicipalLicence>(
            data.registrations.municipalLicences,
            'municipal_licence'
        );
    }

    return data;
};

export const cloneIncorpData = (data: Partial<IncorporationData>): IncorporationData =>
    normalizeIncorpData(data);

export const mergeIncorpData = (
    base: Partial<IncorporationData>,
    patch: Partial<IncorporationData>
): IncorporationData => {
    const mergeValue = (left: unknown, right: unknown): unknown => {
        if (right === undefined) {
            return clone(left);
        }

        if (Array.isArray(right)) {
            return clone(right);
        }

        if (isPlainObject(left) && isPlainObject(right)) {
            const merged: Record<string, unknown> = { ...clone(left) };
            for (const [key, value] of Object.entries(right)) {
                if (value === undefined) continue;
                merged[key] = mergeValue((merged as Record<string, unknown>)[key], value);
            }
            return merged;
        }

        if (isPlainObject(right)) {
            return mergeValue({}, right);
        }

        return clone(right);
    };

    return normalizeIncorpData(mergeValue(base, patch) as Partial<IncorporationData>);
};
