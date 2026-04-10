import type { IncorporationData } from '../schemas/incorporationSchema';

interface IncorpFlag {
    type: 'hard' | 'soft';
    message: string;
    code: string;
}

/**
 * Deterministic flag generation for incorporation intakes.
 * No AI calls — purely rule-based.
 */
export function generateIncorpFlags(data: IncorporationData): IncorpFlag[] {
    const flags: IncorpFlag[] = [];
    const jurisdiction = data.preIncorporation?.jurisdiction;
    const directors = data.structureOwnership?.directors || [];

    // -----------------------------------------------
    // Hard Flags (block or escalate)
    // -----------------------------------------------

    // 1. Director residency requirement
    if (directors.length > 0) {
        const canadianResidents = directors.filter(d => d.isCanadianResident === true).length;
        const requiredPct = 0.25;

        if (jurisdiction === 'cbca' && directors.length < 4 && canadianResidents < 1) {
            flags.push({
                type: 'hard',
                message: 'CBCA requires at least 1 director to be a resident Canadian when there are fewer than 4 directors.',
                code: 'CBCA_DIRECTOR_RESIDENCY'
            });
        } else if (jurisdiction === 'cbca' && canadianResidents / directors.length < requiredPct) {
            flags.push({
                type: 'hard',
                message: `At least 25% of directors must be resident Canadians. Currently ${canadianResidents} of ${directors.length}.`,
                code: 'DIRECTOR_RESIDENCY_FAIL'
            });
        }
    }

    // 2. Named company without NUANS
    if (data.preIncorporation?.nameType === 'named' && !data.preIncorporation?.nuansReport?.reportDate) {
        flags.push({
            type: 'hard',
            message: 'A NUANS report is required for named corporations. The report must be dated within 90 days of filing.',
            code: 'NUANS_MISSING'
        });
    }

    // 3. NUANS expiry check (90 days)
    if (data.preIncorporation?.nuansReport?.reportDate) {
        const reportDate = new Date(data.preIncorporation.nuansReport.reportDate);
        const daysSince = Math.floor((Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 90) {
            flags.push({
                type: 'hard',
                message: `NUANS report is expired (${daysSince} days old). Must be within 90 days of filing.`,
                code: 'NUANS_EXPIRED'
            });
        }
    }

    // 4. Future services as consideration
    const shareholders = data.structureOwnership?.initialShareholders || [];
    // Note: 'future_services' is not valid — only check for completeness since schema allows cash/property/past_services
    // No future_services enum value, so this is implicitly compliant.

    // 5. Registered office location
    if (jurisdiction === 'obca' && data.structureOwnership?.registeredOfficeProvince &&
        !['ontario', 'on'].includes(data.structureOwnership.registeredOfficeProvince.toLowerCase())) {
        flags.push({
            type: 'hard',
            message: 'OBCA corporations must have their registered office in Ontario.',
            code: 'OBCA_OFFICE_NOT_ONTARIO'
        });
    }

    // 6. Named company without legal ending
    if (data.preIncorporation?.nameType === 'named' &&
        data.preIncorporation?.proposedName &&
        !data.preIncorporation?.legalEnding) {
        flags.push({
            type: 'hard',
            message: 'Named corporations must include a legal ending (Ltd., Inc., Corp., Limited, Incorporated, or Corporation).',
            code: 'LEGAL_ENDING_MISSING'
        });
    }

    // -----------------------------------------------
    // Soft Flags (advisory / informational)
    // -----------------------------------------------

    // 1. No USA considered for multi-shareholder corporations
    if (shareholders.length > 1 && data.structureOwnership?.requiresUSA !== true) {
        flags.push({
            type: 'soft',
            message: 'Consider a Unanimous Shareholders\' Agreement (USA) for corporations with multiple shareholders.',
            code: 'USA_NOT_CONSIDERED'
        });
    }

    // 2. No s.85 rollover assessment
    if (shareholders.some(s => s.considerationType === 'property') &&
        data.structureOwnership?.requiresS85Rollover !== true) {
        flags.push({
            type: 'soft',
            message: 'Property is being transferred as consideration. Consider whether an s.85 ITA rollover is needed.',
            code: 'S85_NOT_ASSESSED'
        });
    }

    // 3. ISC register reminder
    if (!data.corporateRecords?.hasISCRegister) {
        const iscLabel = jurisdiction === 'cbca'
            ? 'CBCA s. 21.1 requires a Register of Individuals with Significant Control for all private corporations.'
            : 'Ontario requires a Register of Individuals with Significant Control (O. Reg. 215/21, effective Jan 1, 2023).';
        flags.push({
            type: 'soft',
            message: iscLabel,
            code: 'ISC_REGISTER_MISSING'
        });
    }

    // 4. CBCA extra-provincial registration reminder
    if (jurisdiction === 'cbca' && !data.registrations?.extraProvincialRegistered) {
        flags.push({
            type: 'soft',
            message: 'CBCA corporations must register as extra-provincial in each province where they carry on business.',
            code: 'EXTRA_PROVINCIAL_REMINDER'
        });
    }

    // 5. No fiscal year-end set
    if (!data.structureOwnership?.fiscalYearEnd) {
        flags.push({
            type: 'soft',
            message: 'Fiscal year-end has not been determined. This affects T2 filing deadlines and tax instalment calculations.',
            code: 'FISCAL_YEAR_NOT_SET'
        });
    }

    return flags;
}

/**
 * Validate cross-section logic consistency for incorporation intakes.
 */
export function validateIncorpLogic(data: IncorporationData): Array<{ code: string; message: string; severity: 'warning' | 'info' }> {
    const warnings: Array<{ code: string; message: string; severity: 'warning' | 'info' }> = [];

    // Share class referenced by shareholder must exist
    const shareClassNames = (data.structureOwnership?.shareClasses || []).map(c => c.className);
    const shareholders = data.structureOwnership?.initialShareholders || [];

    shareholders.forEach(sh => {
        if (sh.shareClass && !shareClassNames.includes(sh.shareClass)) {
            warnings.push({
                code: 'SHARE_CLASS_MISMATCH',
                message: `Shareholder "${sh.fullName}" references share class "${sh.shareClass}" which is not defined.`,
                severity: 'warning'
            });
        }
    });

    // Director count vs articles
    const directors = data.structureOwnership?.directors || [];
    if (data.articles?.directorCountType === 'fixed' && data.articles.directorCountFixed) {
        if (directors.length !== data.articles.directorCountFixed) {
            warnings.push({
                code: 'DIRECTOR_COUNT_MISMATCH',
                message: `Articles specify ${data.articles.directorCountFixed} directors but ${directors.length} are listed.`,
                severity: 'warning'
            });
        }
    }
    if (data.articles?.directorCountType === 'range') {
        const min = data.articles.directorCountMin || 0;
        const max = data.articles.directorCountMax || Infinity;
        if (directors.length < min || directors.length > max) {
            warnings.push({
                code: 'DIRECTOR_COUNT_OUT_OF_RANGE',
                message: `Articles specify ${min}–${max} directors but ${directors.length} are listed.`,
                severity: 'warning'
            });
        }
    }

    // Subscription agreements should match shareholders
    const subs = data.shareIssuance?.subscriptionAgreements || [];
    if (subs.length > 0 && subs.length !== shareholders.length) {
        warnings.push({
            code: 'SUBSCRIPTION_SHAREHOLDER_MISMATCH',
            message: `${subs.length} subscription agreements vs ${shareholders.length} shareholders — these should match.`,
            severity: 'info'
        });
    }

    return warnings;
}
