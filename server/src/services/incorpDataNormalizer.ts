import type { IncorporationData } from '../schemas/incorporationSchema';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

const nextId = (prefix: string) =>
    `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const ensureIds = <T extends { id?: string }>(items: T[] | undefined, prefix: string): T[] =>
    (items || []).map((item) => ({
        ...item,
        id: item.id || nextId(prefix),
    }));

export const normalizeIncorpData = (input: unknown): IncorporationData => {
    const data = clone(input || {}) as IncorporationData & {
        submittedAt?: string | Date;
        clientNotes?: string;
        submissionDate?: string | Date;
    };

    const submissionDate = data.submissionDate as unknown;
    if (submissionDate instanceof Date) {
        data.submissionDate = submissionDate.toISOString();
    }

    if (data.submittedAt && !data.submissionDate) {
        const submittedAt = data.submittedAt as unknown;
        data.submissionDate = submittedAt instanceof Date
            ? submittedAt.toISOString()
            : data.submittedAt;
    }

    if (data.clientNotes !== undefined) {
        data.incorpNotes = {
            ...(data.incorpNotes || {}),
            clientNotes: data.clientNotes || undefined,
        };
        delete data.clientNotes;
    }

    if (data.structureOwnership) {
        data.structureOwnership.shareClasses = ensureIds(
            data.structureOwnership.shareClasses,
            'share_class'
        );
        data.structureOwnership.initialShareholders = ensureIds(
            data.structureOwnership.initialShareholders,
            'shareholder'
        );
        data.structureOwnership.directors = ensureIds(
            data.structureOwnership.directors,
            'director'
        );
    }

    if (data.postIncorpOrg) {
        data.postIncorpOrg.directorConsents = ensureIds(
            data.postIncorpOrg.directorConsents,
            'director_consent'
        );
    }

    if (data.shareIssuance) {
        data.shareIssuance.subscriptionAgreements = ensureIds(
            data.shareIssuance.subscriptionAgreements,
            'subscription'
        );
    }

    if (data.registrations) {
        data.registrations.municipalLicences = ensureIds(
            data.registrations.municipalLicences,
            'municipal_licence'
        );
    }

    return data;
};
