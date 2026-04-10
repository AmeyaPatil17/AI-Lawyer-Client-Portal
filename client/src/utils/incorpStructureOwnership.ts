import type {
    Director,
    PostIncorpOrg,
    ShareClass,
    Shareholder,
    ShareIssuance,
    StructureOwnership,
} from '../stores/incorpTypes';
import { normalizeText } from './incorpRules';

type DirectorConsent = NonNullable<PostIncorpOrg['directorConsents']>[number];
type SubscriptionAgreement = NonNullable<ShareIssuance['subscriptionAgreements']>[number];

export type DirectorConsentSyncState = 'active' | 'orphaned';
export type DirectorConsentSyncIssue = 'removed' | 'ambiguous';

export type DirectorConsentSyncEntry = {
    consent: DirectorConsent;
    state: DirectorConsentSyncState;
    issue?: DirectorConsentSyncIssue;
};

export type DirectorConsentSyncResult = {
    entries: DirectorConsentSyncEntry[];
    eligibleDirectors: Director[];
    orphanedEntries: DirectorConsentSyncEntry[];
    ambiguousLegacyKeys: string[];
    hasSyncIssues: boolean;
};

export type DraftNumber = number | '';

export type ShareClassDraft = {
    id: string;
    className: string;
    votingRights: boolean;
    dividendRights: boolean;
    liquidationRights: boolean;
    redeemable: boolean;
    retractable: boolean;
    maxShares: DraftNumber;
    parValue?: number;
    description?: string;
};

export type ShareholderDraft = {
    id: string;
    fullName: string;
    email: string;
    shareClassId: string;
    shareClass: string;
    numberOfShares: DraftNumber;
    considerationType: 'cash' | 'property' | 'past_services';
    considerationAmount: DraftNumber;
};

export type DirectorDraft = {
    id: string;
    fullName: string;
    address: string;
    isCanadianResident: boolean;
};

export type StructureOwnershipDraft = {
    shareClasses: ShareClassDraft[];
    initialShareholders: ShareholderDraft[];
    directors: DirectorDraft[];
    registeredOfficeAddress: string;
    registeredOfficeProvince: string;
    recordsOfficeAddress: string;
    fiscalYearEnd: string;
    requiresUSA: boolean;
    requiresS85Rollover: boolean;
    isReportingIssuer: boolean;
};

const nextId = (prefix: string) =>
    `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const toDraftNumber = (value?: number | null): DraftNumber =>
    typeof value === 'number' && Number.isFinite(value) ? value : '';

const toSerializedNumber = (value: DraftNumber | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizeShareClassDraft = (shareClass: ShareClass): ShareClassDraft => ({
    id: shareClass.id || nextId('share_class'),
    className: shareClass.className || '',
    votingRights: shareClass.votingRights ?? true,
    dividendRights: shareClass.dividendRights ?? true,
    liquidationRights: shareClass.liquidationRights ?? true,
    redeemable: shareClass.redeemable ?? false,
    retractable: shareClass.retractable ?? false,
    maxShares: toDraftNumber(shareClass.maxShares),
    parValue: shareClass.parValue,
    description: shareClass.description,
});

const normalizeShareholderDraft = (shareholder: Shareholder): ShareholderDraft => ({
    id: shareholder.id || nextId('shareholder'),
    fullName: shareholder.fullName || '',
    email: shareholder.email || '',
    shareClassId: shareholder.shareClassId || '',
    shareClass: shareholder.shareClass || '',
    numberOfShares: toDraftNumber(shareholder.numberOfShares),
    considerationType: shareholder.considerationType || 'cash',
    considerationAmount: toDraftNumber(shareholder.considerationAmount),
});

const normalizeDirectorDraft = (director: Director): DirectorDraft => ({
    id: director.id || nextId('director'),
    fullName: director.fullName || '',
    address: director.address || '',
    isCanadianResident: director.isCanadianResident ?? true,
});

const shareClassDisplayName = (
    shareholder: Pick<ShareholderDraft, 'shareClassId' | 'shareClass'>,
    shareClasses: ShareClassDraft[]
) => shareClasses.find((shareClass) => shareClass.id === shareholder.shareClassId)?.className
    || shareholder.shareClass;

const shareClassKey = (value: { shareClassId?: string; shareClass?: string }) =>
    normalizeText(value.shareClassId) || normalizeText(value.shareClass).toLowerCase();

const shareholderLegacyKey = (value: { fullName?: string; shareClassId?: string; shareClass?: string }) =>
    [
        normalizeText(value.fullName).toLowerCase(),
        shareClassKey(value),
    ].filter(Boolean).join('::');

const directorLegacyKey = (value: { fullName?: string; directorName?: string }) =>
    normalizeText(value.fullName || value.directorName).toLowerCase();

const consentStableId = (
    consent: Partial<DirectorConsent> | undefined,
    director?: Pick<Director, 'id' | 'fullName'>
) => {
    const explicitId = normalizeText(consent?.id);
    if (explicitId) return explicitId;

    const explicitDirectorId = normalizeText(consent?.directorId || director?.id);
    if (explicitDirectorId) return `director_consent_${explicitDirectorId}`;

    const normalizedName = normalizeText(consent?.directorName || director?.fullName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (normalizedName) return `director_consent_${normalizedName}`;

    return nextId('director_consent');
};

const hasShareholderIdentity = (shareholder: {
    fullName?: string;
    shareClassId?: string;
    shareClass?: string;
}) =>
    !!normalizeText(shareholder.fullName)
    && !!shareClassKey(shareholder);

const hasReadyShareCount = (shareholder: { numberOfShares?: number }) =>
    Number.isInteger(shareholder.numberOfShares)
    && Number(shareholder.numberOfShares) > 0;

export const isShareholderReadyForAgreement = (shareholder: Shareholder | ShareholderDraft) =>
    hasShareholderIdentity(shareholder)
    && hasReadyShareCount(shareholder);

export const isDirectorReadyForConsent = (director: Director | DirectorDraft) =>
    !!normalizeText(director.fullName);

export const eligibleDirectorsForConsents = (directors: Array<Director | DirectorDraft>) =>
    directors.filter((director): director is Director => isDirectorReadyForConsent(director));

export const normalizeDisplayDraft = (
    structureOwnership: StructureOwnership | undefined,
    jurisdiction: 'obca' | 'cbca' | undefined
): StructureOwnershipDraft => ({
    shareClasses: (structureOwnership?.shareClasses || []).map(normalizeShareClassDraft),
    initialShareholders: (structureOwnership?.initialShareholders || []).map(normalizeShareholderDraft),
    directors: (structureOwnership?.directors || []).map(normalizeDirectorDraft),
    registeredOfficeAddress: structureOwnership?.registeredOfficeAddress || '',
    registeredOfficeProvince: structureOwnership?.registeredOfficeProvince
        || (jurisdiction === 'obca' ? 'ON' : ''),
    recordsOfficeAddress: structureOwnership?.recordsOfficeAddress || '',
    fiscalYearEnd: structureOwnership?.fiscalYearEnd || '',
    requiresUSA: !!structureOwnership?.requiresUSA,
    requiresS85Rollover: !!structureOwnership?.requiresS85Rollover,
    isReportingIssuer: !!structureOwnership?.isReportingIssuer,
});

export const serializeStructureOwnershipDraft = (
    draft: StructureOwnershipDraft,
    jurisdiction: 'obca' | 'cbca' | undefined
): StructureOwnership => {
    const shareClasses = draft.shareClasses.map((shareClass) => ({
        id: shareClass.id,
        className: normalizeText(shareClass.className),
        votingRights: !!shareClass.votingRights,
        dividendRights: !!shareClass.dividendRights,
        liquidationRights: !!shareClass.liquidationRights,
        redeemable: !!shareClass.redeemable,
        retractable: !!shareClass.retractable,
        maxShares: toSerializedNumber(shareClass.maxShares),
        parValue: shareClass.parValue,
        description: normalizeText(shareClass.description) || undefined,
    }));

    const initialShareholders = draft.initialShareholders.map((shareholder) => {
        const resolvedShareClass = shareClassDisplayName(shareholder, draft.shareClasses);

        return {
            id: shareholder.id,
            fullName: normalizeText(shareholder.fullName),
            email: normalizeText(shareholder.email) || undefined,
            shareClassId: normalizeText(shareholder.shareClassId) || undefined,
            shareClass: normalizeText(resolvedShareClass) || undefined,
            numberOfShares: toSerializedNumber(shareholder.numberOfShares),
            considerationType: shareholder.considerationType,
            considerationAmount: toSerializedNumber(shareholder.considerationAmount),
        };
    });

    return {
        shareClasses,
        initialShareholders,
        directors: draft.directors.map((director) => ({
            id: director.id,
            fullName: normalizeText(director.fullName),
            address: normalizeText(director.address) || undefined,
            isCanadianResident: !!director.isCanadianResident,
        })),
        registeredOfficeAddress: normalizeText(draft.registeredOfficeAddress) || undefined,
        registeredOfficeProvince: normalizeText(draft.registeredOfficeProvince) || undefined,
        recordsOfficeAddress: jurisdiction === 'cbca'
            ? (normalizeText(draft.recordsOfficeAddress) || undefined)
            : undefined,
        fiscalYearEnd: normalizeText(draft.fiscalYearEnd) || undefined,
        requiresUSA: !!draft.requiresUSA,
        requiresS85Rollover: !!draft.requiresS85Rollover,
        isReportingIssuer: !!draft.isReportingIssuer,
    };
};

export const syncShareholderClassSelection = (
    shareholder: ShareholderDraft,
    shareClasses: ShareClassDraft[]
) => {
    shareholder.shareClass = shareClassDisplayName(shareholder, shareClasses);
};

export const reconcileSubscriptionAgreements = (
    shareholders: Shareholder[],
    existingAgreements: SubscriptionAgreement[] | undefined
): SubscriptionAgreement[] => {
    const eligibleShareholders = shareholders.filter(isShareholderReadyForAgreement);
    const byShareholderId = new Map<string, SubscriptionAgreement>();
    const byLegacyKey = new Map<string, SubscriptionAgreement>();

    (existingAgreements || []).forEach((agreement) => {
        const shareholderId = normalizeText(agreement.shareholderId);
        if (shareholderId) {
            byShareholderId.set(shareholderId, agreement);
        }

        const legacyKey = shareholderLegacyKey({
            fullName: agreement.subscriberName,
            shareClassId: agreement.shareClassId,
            shareClass: agreement.shareClass,
        });
        if (legacyKey && !byLegacyKey.has(legacyKey)) {
            byLegacyKey.set(legacyKey, agreement);
        }
    });

    return eligibleShareholders.map((shareholder) => {
        const shareholderId = normalizeText(shareholder.id);
        const legacyKey = shareholderLegacyKey(shareholder);
        const existing = (shareholderId && byShareholderId.get(shareholderId))
            || byLegacyKey.get(legacyKey)
            || null;

        return {
            id: existing?.id || nextId('subscription'),
            shareholderId: shareholder.id,
            subscriberName: normalizeText(shareholder.fullName),
            shareClassId: normalizeText(shareholder.shareClassId) || undefined,
            shareClass: normalizeText(shareholder.shareClass) || undefined,
            numberOfShares: shareholder.numberOfShares,
            considerationType: shareholder.considerationType || 'cash',
            considerationAmount: existing?.considerationAmount ?? shareholder.considerationAmount,
            agreementExecuted: existing?.agreementExecuted ?? false,
            subscriberAddress: existing?.subscriberAddress || '',
        };
    });
};

export const reconcileDirectorConsentsDetailed = (
    directors: Director[],
    existingConsents: DirectorConsent[] | undefined
): DirectorConsentSyncResult => {
    const eligibleDirectors = eligibleDirectorsForConsents(directors);
    const byDirectorId = new Map<string, DirectorConsent>();
    const byLegacyKey = new Map<string, DirectorConsent[]>();
    const directorLegacyCounts = new Map<string, number>();
    const consumedConsents = new Set<DirectorConsent>();
    const ambiguousLegacyKeys = new Set<string>();

    (existingConsents || []).forEach((consent) => {
        const directorId = normalizeText(consent.directorId);
        if (directorId) {
            byDirectorId.set(directorId, consent);
        }

        const legacyKey = directorLegacyKey(consent);
        if (legacyKey) {
            byLegacyKey.set(legacyKey, [...(byLegacyKey.get(legacyKey) || []), consent]);
        }
    });

    eligibleDirectors.forEach((director) => {
        const legacyKey = directorLegacyKey(director);
        if (!legacyKey) return;
        directorLegacyCounts.set(legacyKey, (directorLegacyCounts.get(legacyKey) || 0) + 1);
    });

    const entries = eligibleDirectors.map<DirectorConsentSyncEntry>((director) => {
        const directorId = normalizeText(director.id);
        const legacyKey = directorLegacyKey(director);
        let existing: DirectorConsent | null = null;
        let issue: DirectorConsentSyncIssue | undefined;

        if (directorId) {
            existing = byDirectorId.get(directorId) || null;
        }

        if (!existing && legacyKey) {
            const legacyMatches = (byLegacyKey.get(legacyKey) || []).filter((consent) => !consumedConsents.has(consent));
            const directorCount = directorLegacyCounts.get(legacyKey) || 0;

            if (legacyMatches.length === 1 && directorCount === 1) {
                existing = legacyMatches[0];
            } else if (legacyMatches.length > 0 || directorCount > 1) {
                issue = 'ambiguous';
                ambiguousLegacyKeys.add(legacyKey);
            }
        }

        if (existing) {
            consumedConsents.add(existing);
        }

        return {
            consent: {
                id: consentStableId(existing || undefined, director),
                directorId: normalizeText(director.id) || undefined,
                directorName: normalizeText(director.fullName),
                consentSigned: existing?.consentSigned ?? false,
                consentDate: existing?.consentDate || '',
            },
            state: 'active',
            issue,
        };
    });

    const orphanedEntries = (existingConsents || [])
        .filter((consent) => !consumedConsents.has(consent))
        .map<DirectorConsentSyncEntry>((consent) => {
            const legacyKey = directorLegacyKey(consent);
            const isAmbiguous = !!legacyKey && ambiguousLegacyKeys.has(legacyKey);

            return {
                consent: {
                    id: consentStableId(consent),
                    directorId: normalizeText(consent.directorId) || undefined,
                    directorName: normalizeText(consent.directorName),
                    consentSigned: !!consent.consentSigned,
                    consentDate: consent.consentDate || '',
                },
                state: 'orphaned',
                issue: isAmbiguous ? 'ambiguous' : 'removed',
            };
        });

    return {
        entries: [...entries, ...orphanedEntries],
        eligibleDirectors,
        orphanedEntries,
        ambiguousLegacyKeys: [...ambiguousLegacyKeys],
        hasSyncIssues: orphanedEntries.length > 0 || ambiguousLegacyKeys.size > 0,
    };
};

export const reconcileDirectorConsents = (
    directors: Director[],
    existingConsents: DirectorConsent[] | undefined
): DirectorConsent[] =>
    reconcileDirectorConsentsDetailed(directors, existingConsents)
        .entries
        .filter((entry) => entry.state === 'active')
        .map((entry) => entry.consent);

export const hasClassWithCoreRights = (shareClasses: Array<Pick<ShareClassDraft, 'votingRights' | 'dividendRights' | 'liquidationRights'>>) =>
    shareClasses.some((shareClass) =>
        !!shareClass.votingRights
        && !!shareClass.dividendRights
        && !!shareClass.liquidationRights
    );
