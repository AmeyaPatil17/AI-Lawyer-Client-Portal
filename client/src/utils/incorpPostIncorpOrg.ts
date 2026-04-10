import type {
    Director,
    PostIncorpOrg,
} from '../stores/incorpTypes';
import {
    isFutureDate,
    isValidIsoDate,
    normalizeText,
} from './incorpRules';
import {
    eligibleDirectorsForConsents,
    reconcileDirectorConsentsDetailed,
    type DirectorConsentSyncIssue,
    type DirectorConsentSyncState,
    type DirectorConsentSyncResult,
} from './incorpStructureOwnership';

type DirectorConsent = NonNullable<PostIncorpOrg['directorConsents']>[number];

export type DirectorConsentDraft = {
    id: string;
    directorId?: string;
    directorName: string;
    consentSigned: boolean;
    consentDate: string;
    syncState: DirectorConsentSyncState;
    syncIssue?: DirectorConsentSyncIssue;
};

export type PostIncorpOrgDraft = {
    generalByLawDrafted: boolean;
    bankingByLawDrafted: boolean;
    bankingByLawSeparate: boolean;
    orgResolutionsPrepared: boolean;
    shareholderResolutionPrepared: boolean;
    auditWaiverResolution: boolean;
    officeResolutionPassed: boolean;
    directorConsents: DirectorConsentDraft[];
};

const cloneConsentDraft = (
    consent: Partial<DirectorConsentDraft | DirectorConsent> | undefined,
    defaults?: Partial<DirectorConsentDraft>
): DirectorConsentDraft | null => {
    if (!consent) return null;

    const directorName = normalizeText(consent.directorName);
    const fallbackId = normalizeText(consent.id)
        || (normalizeText(consent.directorId) ? `director_consent_${normalizeText(consent.directorId)}` : '');

    return {
        id: fallbackId || `director_consent_${Math.random().toString(36).slice(2, 10)}`,
        directorId: normalizeText(consent.directorId) || undefined,
        directorName,
        consentSigned: !!consent.consentSigned,
        consentDate: consent.consentDate || '',
        syncState: defaults?.syncState || 'active',
        syncIssue: defaults?.syncIssue,
    };
};

export const createEmptyPostIncorpOrgDraft = (): PostIncorpOrgDraft => ({
    generalByLawDrafted: false,
    bankingByLawDrafted: false,
    bankingByLawSeparate: false,
    orgResolutionsPrepared: false,
    shareholderResolutionPrepared: false,
    auditWaiverResolution: false,
    officeResolutionPassed: false,
    directorConsents: [],
});

export const hydratePostIncorpOrgDraft = (
    postIncorpOrg: PostIncorpOrg | undefined
): PostIncorpOrgDraft => ({
    generalByLawDrafted: !!postIncorpOrg?.generalByLawDrafted,
    bankingByLawDrafted: !!postIncorpOrg?.bankingByLawDrafted,
    bankingByLawSeparate: !!postIncorpOrg?.bankingByLawSeparate,
    orgResolutionsPrepared: !!postIncorpOrg?.orgResolutionsPrepared,
    shareholderResolutionPrepared: !!postIncorpOrg?.shareholderResolutionPrepared,
    auditWaiverResolution: !!postIncorpOrg?.auditWaiverResolution,
    officeResolutionPassed: !!postIncorpOrg?.officeResolutionPassed,
    directorConsents: (postIncorpOrg?.directorConsents || [])
        .map((consent) => cloneConsentDraft(consent))
        .filter((consent): consent is DirectorConsentDraft => !!consent),
});

export const serializePostIncorpOrgDraft = (draft: PostIncorpOrgDraft): PostIncorpOrg => ({
    generalByLawDrafted: !!draft.generalByLawDrafted,
    bankingByLawSeparate: !!draft.bankingByLawSeparate,
    bankingByLawDrafted: draft.bankingByLawSeparate
        ? !!draft.bankingByLawDrafted
        : undefined,
    orgResolutionsPrepared: !!draft.orgResolutionsPrepared,
    shareholderResolutionPrepared: !!draft.shareholderResolutionPrepared,
    auditWaiverResolution: !!draft.auditWaiverResolution,
    officeResolutionPassed: !!draft.officeResolutionPassed,
    directorConsents: draft.directorConsents.map((consent) => ({
        id: normalizeText(consent.id) || undefined,
        directorId: normalizeText(consent.directorId) || undefined,
        directorName: normalizeText(consent.directorName),
        consentSigned: !!consent.consentSigned,
        consentDate: consent.consentDate || '',
    })),
});

export const getLocalTodayISO = (now = new Date()) => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export const syncDirectorConsentDrafts = (
    currentConsents: DirectorConsentDraft[],
    directors: Director[]
) => {
    const reconciliation = reconcileDirectorConsentsDetailed(
        directors,
        currentConsents.map((consent) => ({
            id: consent.id,
            directorId: consent.directorId,
            directorName: consent.directorName,
            consentSigned: consent.consentSigned,
            consentDate: consent.consentDate,
        }))
    );

    return {
        ...reconciliation,
        directorConsents: reconciliation.entries
            .map((entry) => cloneConsentDraft(entry.consent, {
                syncState: entry.state,
                syncIssue: entry.issue,
            }))
            .filter((consent): consent is DirectorConsentDraft => !!consent),
    };
};

export const getEligibleDirectorCount = (directors: Director[]) =>
    eligibleDirectorsForConsents(directors).length;

export const getDirectorConsentRowErrors = (
    consent: DirectorConsentDraft,
    now = new Date()
) => {
    const errors: string[] = [];

    if (consent.syncState === 'orphaned') {
        errors.push(
            consent.syncIssue === 'ambiguous'
                ? `${consent.directorName || 'This consent'} could not be matched safely to the current director list.`
                : `${consent.directorName || 'This consent'} no longer matches a current Step 2 director.`
        );
        return errors;
    }

    const name = normalizeText(consent.directorName) || 'This consent';
    if (consent.consentSigned && !consent.consentDate) {
        errors.push(`Enter a consent date for ${name}.`);
    }
    if (consent.consentDate && !consent.consentSigned) {
        errors.push(`Mark ${name} as signed or clear the consent date.`);
    }
    if (consent.consentDate && !isValidIsoDate(consent.consentDate)) {
        errors.push(`Consent date must be valid for ${name}.`);
    }
    if (consent.consentDate && isFutureDate(consent.consentDate, now)) {
        errors.push(`Consent date cannot be in the future for ${name}.`);
    }

    return errors;
};

export const isDirectorConsentComplete = (
    consent: DirectorConsentDraft,
    now = new Date()
) => consent.syncState === 'active'
    && consent.consentSigned
    && !!consent.consentDate
    && isValidIsoDate(consent.consentDate)
    && !isFutureDate(consent.consentDate, now);

export const getDirectorConsentSyncSummary = (reconciliation: Pick<DirectorConsentSyncResult, 'orphanedEntries' | 'ambiguousLegacyKeys' | 'hasSyncIssues'>) => {
    if (!reconciliation.hasSyncIssues) return '';

    const orphanedCount = reconciliation.orphanedEntries.length;
    const parts: string[] = [];
    if (orphanedCount) {
        parts.push(`${orphanedCount} outdated consent${orphanedCount === 1 ? '' : 's'} retained`);
    }
    if (reconciliation.ambiguousLegacyKeys.length) {
        parts.push(`${reconciliation.ambiguousLegacyKeys.length} ambiguous director match${reconciliation.ambiguousLegacyKeys.length === 1 ? '' : 'es'}`);
    }

    return `${parts.join(' and ')}. Review the director list, then sync before finalizing this step.`;
};
