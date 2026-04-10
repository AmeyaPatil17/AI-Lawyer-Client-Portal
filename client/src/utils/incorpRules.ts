import type {
    IncorporationData,
    PreIncorporation,
    StructureOwnership,
} from '../stores/incorpTypes';

export const normalizeText = (value?: string | null) =>
    (value || '').replace(/\s+/g, ' ').trim();

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FISCAL_YEAR_END_DAY_COUNTS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const normalizeLegacyKey = (value?: string | null) =>
    normalizeText(value).toLowerCase();

const parseDate = (value?: string) => {
    const match = ISO_DATE_PATTERN.exec(normalizeText(value));
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (
        Number.isNaN(parsed.getTime())
        || parsed.getFullYear() !== year
        || parsed.getMonth() !== month - 1
        || parsed.getDate() !== day
    ) {
        return null;
    }

    return parsed;
};

const isPositiveInteger = (value?: number | null) =>
    Number.isInteger(value) && Number(value) > 0;

const isNonNegativeInteger = (value?: number | null) =>
    Number.isInteger(value) && Number(value) >= 0;

export const isValidIsoDate = (value?: string) => !!parseDate(value);

export const daysSinceDate = (value?: string, now = new Date()) => {
    const parsed = parseDate(value);
    if (!parsed) return null;
    return Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
};

export const isFutureDate = (value?: string, now = new Date()) => {
    const parsed = parseDate(value);
    if (!parsed) return false;
    return parsed.getTime() > now.getTime();
};

export const isNuansExpired = (value?: string, now = new Date()) => {
    const diff = daysSinceDate(value, now);
    return diff !== null && diff > 90;
};

export const isPoBoxAddress = (value?: string) =>
    /\bp(?:ost)?[\.\s]*o(?:ffice)?[\.\s]*box\b/i.test(value || '');

export const isValidEmail = (value?: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));

export const isValidFiscalYearEnd = (value?: string) => {
    if (!value) return false;
    const match = /^(\d{2})-(\d{2})$/.exec(normalizeText(value));
    if (!match) return false;

    const month = Number(match[1]);
    const day = Number(match[2]);
    if (month < 1 || month > 12) return false;

    return day >= 1 && day <= FISCAL_YEAR_END_DAY_COUNTS[month - 1];
};

const normalizeProgramAccount = (value?: string) =>
    (value || '').replace(/[\s-]+/g, '').toUpperCase();

export const isValidBusinessNumber = (value?: string) =>
    /^\d{9}$/.test(normalizeProgramAccount(value));

export const isValidProgramAccount = (value: string | undefined, program: 'RT' | 'RP') =>
    new RegExp(`^\\d{9}${program}\\d{4}$`).test(normalizeProgramAccount(value));

export const buildCorporateName = (pre?: PreIncorporation) => {
    if (!pre || pre.nameType === 'numbered') return '';
    const name = normalizeText(pre.proposedName);
    if (!name) return '';
    return normalizeText([name, pre.legalEnding].filter(Boolean).join(' '));
};

const shareClassKey = (value: { id?: string; className?: string }) => {
    const explicitId = normalizeText(value.id);
    if (explicitId) return explicitId;
    return normalizeLegacyKey(value.className);
};

const shareholderShareClassKey = (value: { shareClassId?: string; shareClass?: string }) => {
    const explicitId = normalizeText(value.shareClassId);
    if (explicitId) return explicitId;
    return normalizeLegacyKey(value.shareClass);
};

const directorKey = (value: { id?: string; fullName?: string; directorId?: string; directorName?: string }) => {
    const explicitId = normalizeText(value.directorId || value.id);
    if (explicitId) return explicitId;
    return normalizeLegacyKey(value.fullName || value.directorName);
};

const shareholderKey = (value: { id?: string; fullName?: string; subscriberName?: string; shareholderId?: string; shareClassId?: string; shareClass?: string }) => {
    const explicitId = normalizeText(value.shareholderId || value.id);
    if (explicitId) return explicitId;
    return [
        normalizeLegacyKey(value.fullName || value.subscriberName),
        shareholderShareClassKey(value),
    ].filter(Boolean).join('::');
};

const getCurrentDirectorCount = (data: IncorporationData) =>
    (data.structureOwnership?.directors || []).filter((director) => !!normalizeText(director.fullName)).length;

const getEffectiveCorporateRecords = (data: IncorporationData) => {
    const records = data.corporateRecords || {};

    return {
        hasArticlesAndCertificate: !!(records.hasArticlesAndCertificate || data.articles?.certificateReceived),
        hasByLaws: !!(records.hasByLaws || data.postIncorpOrg?.generalByLawDrafted),
        hasDirectorMinutes: !!records.hasDirectorMinutes,
        hasShareholderMinutes: !!records.hasShareholderMinutes,
        hasWrittenResolutions: !!records.hasWrittenResolutions,
        hasSecuritiesRegister: !!(records.hasSecuritiesRegister || data.shareIssuance?.securitiesRegisterComplete),
        hasDirectorRegister: !!records.hasDirectorRegister,
        hasOfficerRegister: !!records.hasOfficerRegister,
        hasISCRegister: data.structureOwnership?.isReportingIssuer ? true : !!records.hasISCRegister,
        hasUSACopy: data.structureOwnership?.requiresUSA ? !!records.hasUSACopy : true,
        recordsLocationConfirmed: !!records.recordsLocationConfirmed,
    };
};

const getEffectiveRegistrations = (data: IncorporationData) => {
    const registrations = data.registrations || {};
    const isCBCA = data.preIncorporation?.jurisdiction === 'cbca';

    return {
        craRegistered: !!registrations.craRegistered,
        craBusinessNumber: registrations.craBusinessNumber,
        hstGstRegistered: !!registrations.hstGstRegistered,
        hstGstNumber: registrations.hstGstNumber,
        payrollAccountRegistered: !!registrations.payrollAccountRegistered,
        payrollAccountNumber: registrations.payrollAccountNumber,
        importExportRegistered: !!registrations.importExportRegistered,
        businessNameRegistered: !!registrations.businessNameRegistered,
        extraProvincialRegistered: isCBCA ? !!registrations.extraProvincialRegistered : false,
        extraProvincialProvinces: isCBCA && registrations.extraProvincialRegistered
            ? registrations.extraProvincialProvinces || []
            : [],
        wsibRegistered: !!registrations.wsibRegistered,
        wsibAccountNumber: registrations.wsibAccountNumber,
        ehtRegistered: !!registrations.ehtRegistered,
        municipalLicences: registrations.municipalLicences || [],
    };
};

const getEffectiveBankingSetup = (data: IncorporationData) => {
    const banking = data.bankingSetup || {};

    return {
        bankAccountOpened: !!banking.bankAccountOpened,
        bankName: banking.bankName,
        corporateSealObtained: !!banking.corporateSealObtained,
        shareCertificatesOrdered: !!banking.shareCertificatesOrdered,
        minuteBookSetup: !!(banking.minuteBookSetup || data.corporateRecords?.recordsLocationConfirmed),
        accountantEngaged: !!banking.accountantEngaged,
        accountantName: banking.accountantName,
        insuranceObtained: !!banking.insuranceObtained,
        insuranceTypes: banking.insuranceTypes || [],
        trademarksRegistered: !!banking.trademarksRegistered,
        agreementsDrafted: !!banking.agreementsDrafted,
        agreementTypes: banking.agreementTypes || [],
    };
};

export const buildClassTotals = (
    shareClasses: StructureOwnership['shareClasses'] = [],
    holders: Array<{ shareClassId?: string; shareClass?: string; numberOfShares?: number }> = []
) => {
    const totals = new Map<string, number>();
    holders.forEach((holder) => {
        const key = shareholderShareClassKey(holder);
        if (!key) return;
        totals.set(key, (totals.get(key) || 0) + (holder.numberOfShares || 0));
    });

    return shareClasses.map((shareClass) => {
        const key = shareClassKey(shareClass);
        return {
            key,
            shareClass,
            totalIssued: totals.get(key) || 0,
        };
    });
};

const validatePreIncorporation = (data: IncorporationData) => {
    const pre = data.preIncorporation;
    if (!pre?.jurisdiction) return 'Please select whether you are incorporating under OBCA (Ontario) or CBCA (Federal).';
    if (!pre.nameType) return 'Please indicate whether you want a named or numbered company.';
    if (!pre.nameConfirmed) {
        return pre.nameType === 'numbered'
            ? 'Please confirm that this will be a numbered company.'
            : 'Please confirm that the corporate name is finalized.';
    }

    if (pre.nameType === 'named') {
        if (!normalizeText(pre.proposedName)) return 'Please enter the proposed corporate name.';
        if (!pre.legalEnding) return 'Please select a legal ending (Inc., Ltd., Corp., etc.) for the corporation name.';
        if (!pre.nuansReport?.reportDate) return 'A NUANS report date is required for named corporations.';
        if (!isValidIsoDate(pre.nuansReport.reportDate)) return 'Enter a valid NUANS report date.';
        if (isFutureDate(pre.nuansReport.reportDate)) return 'The NUANS report date cannot be in the future.';
        if (isNuansExpired(pre.nuansReport.reportDate)) {
            return 'The NUANS report is older than 90 days and is no longer valid. Please obtain a current NUANS report before proceeding.';
        }
        if (!pre.nuansReviewed) return 'Please confirm that the NUANS results were reviewed.';
        if (pre.nuansReport.hasConflicts && !normalizeText(pre.nuansReport.conflictDetails)) {
            return 'Please describe the NUANS conflict details or clear the conflict flag.';
        }
    }

    return null;
};

const validateStructureOwnership = (data: IncorporationData) => {
    const structure = data.structureOwnership;
    if (!structure?.shareClasses?.length) return 'At least one share class must be defined.';

    const shareClassNames = new Set<string>();
    const shareClassIds = new Set<string>();
    const validShareClassKeys = new Set<string>();
    let hasCoreRightsClass = false;

    for (const shareClass of structure.shareClasses) {
        const name = normalizeText(shareClass.className);
        const normalizedName = name.toLowerCase();
        const explicitId = normalizeText(shareClass.id);

        if (!name) return 'All share classes must have a name.';
        if (shareClassNames.has(normalizedName)) return `Share class "${name}" is duplicated.`;
        shareClassNames.add(normalizedName);

        if (explicitId) {
            if (shareClassIds.has(explicitId)) return `Share class "${name}" has a duplicate identifier.`;
            shareClassIds.add(explicitId);
        }

        if (shareClass.maxShares !== undefined && !isNonNegativeInteger(shareClass.maxShares)) {
            return `Share class "${name}" must use a whole-number maximum share count (0 for unlimited).`;
        }

        if (
            (shareClass.votingRights ?? true)
            && (shareClass.dividendRights ?? true)
            && (shareClass.liquidationRights ?? true)
        ) {
            hasCoreRightsClass = true;
        }

        validShareClassKeys.add(shareClassKey(shareClass));
    }

    if (!hasCoreRightsClass) {
        return 'At least one share class must include voting, dividend, and liquidation rights.';
    }

    if (!structure.initialShareholders?.length) {
        return 'At least one initial shareholder must be defined.';
    }

    const shareholderKeys = new Set<string>();
    for (const shareholder of structure.initialShareholders || []) {
        const name = normalizeText(shareholder.fullName);
        const classKey = shareholderShareClassKey(shareholder);
        const key = shareholderKey(shareholder);

        if (!name) return 'Each shareholder must have a full name.';
        if (normalizeText(shareholder.email) && !isValidEmail(shareholder.email)) {
            return `Enter a valid email address for ${name}.`;
        }
        if (!classKey) return `Select a share class for ${name}.`;
        if (!validShareClassKeys.has(classKey)) return `Select an existing share class for ${name}.`;
        if (!isPositiveInteger(shareholder.numberOfShares)) {
            return `Enter a whole-number share count of at least 1 for ${name}.`;
        }
        if ((shareholder.considerationAmount || 0) < 0) {
            return `Consideration amount cannot be negative for ${name}.`;
        }
        if (key && shareholderKeys.has(key)) return `Duplicate shareholder entry detected for ${name}.`;
        if (key) shareholderKeys.add(key);
    }

    const totals = buildClassTotals(structure.shareClasses, structure.initialShareholders);
    for (const total of totals) {
        if (total.shareClass.maxShares && total.totalIssued > total.shareClass.maxShares) {
            return `Issued shares exceed the maximum authorized for ${normalizeText(total.shareClass.className)}.`;
        }
    }

    if (!structure.directors?.length) return 'At least one director must be appointed.';

    const directorKeys = new Set<string>();
    for (const director of structure.directors) {
        const name = normalizeText(director.fullName);
        const key = directorKey(director);

        if (!name) return 'Each director must have a full name.';
        if (!normalizeText(director.address)) return `Enter an address for ${name}.`;
        if (key && directorKeys.has(key)) return `Duplicate director entry detected for ${name}.`;
        if (key) directorKeys.add(key);
    }

    if (data.preIncorporation?.jurisdiction === 'cbca') {
        const residentCount = structure.directors.filter((director) => director.isCanadianResident).length;
        if (structure.directors.length < 4 && residentCount < 1) {
            return 'CBCA requires at least 1 director to be a resident Canadian when there are fewer than 4 directors.';
        }
        if (structure.directors.length >= 4 && residentCount / structure.directors.length < 0.25) {
            return `CBCA requires at least 25% of directors to be resident Canadians. Currently ${residentCount} of ${structure.directors.length}.`;
        }
    }

    if (!normalizeText(structure.registeredOfficeAddress)) return 'A registered office address is required.';
    if (isPoBoxAddress(structure.registeredOfficeAddress)) return 'The registered office must be a physical street address.';
    if (!structure.registeredOfficeProvince) return 'Please select the registered office province.';
    if (data.preIncorporation?.jurisdiction === 'obca' && structure.registeredOfficeProvince !== 'ON') {
        return 'OBCA corporations must have an Ontario registered office.';
    }
    if (data.preIncorporation?.jurisdiction === 'cbca' && !normalizeText(structure.recordsOfficeAddress)) {
        return 'Please enter the records office address for this CBCA corporation.';
    }
    if (structure.fiscalYearEnd && !isValidFiscalYearEnd(structure.fiscalYearEnd)) {
        return 'Fiscal year-end must be a valid recurring MM-DD date.';
    }

    return null;
};

const validateArticles = (data: IncorporationData) => {
    const articles = data.articles;
    if (data.preIncorporation?.nameType !== 'numbered' && !normalizeText(articles?.corporateName)) {
        return 'Corporate name is required for named corporations.';
    }
    if (!normalizeText(articles?.registeredAddress)) {
        return 'The full registered office address is required in the Articles.';
    }
    if (isPoBoxAddress(articles?.registeredAddress)) {
        return 'P.O. Box addresses are not acceptable for the registered office.';
    }
    if (!articles?.directorCountType) {
        return 'Please specify how the number of directors is determined (fixed or range).';
    }

    const currentDirectorCount = getCurrentDirectorCount(data);

    if (articles.directorCountType === 'fixed') {
        if (!isPositiveInteger(articles.directorCountFixed)) {
            return 'Enter a valid fixed number of directors.';
        }
        if (currentDirectorCount > 0 && articles.directorCountFixed !== currentDirectorCount) {
            return `Articles director count must match the ${currentDirectorCount} director(s) listed in Structure & Ownership.`;
        }
    }

    if (articles.directorCountType === 'range') {
        if (!isPositiveInteger(articles.directorCountMin) || !isPositiveInteger(articles.directorCountMax)) {
            return 'Enter both a minimum and maximum director count.';
        }
        const rangeMin = Number(articles.directorCountMin);
        const rangeMax = Number(articles.directorCountMax);
        if (rangeMax < rangeMin) {
            return 'Director count maximum must be greater than or equal to minimum.';
        }
        if (
            currentDirectorCount > 0
            && (currentDirectorCount < rangeMin || currentDirectorCount > rangeMax)
        ) {
            return `Articles director range must include the ${currentDirectorCount} director(s) listed in Structure & Ownership.`;
        }
    }

    if (!normalizeText(articles?.shareCapitalDescription)) {
        return 'Authorized share capital description is required for Articles of Incorporation.';
    }
    if (!articles?.filingMethod) {
        return 'Please confirm the filing method for the incorporation.';
    }
    if (data.preIncorporation?.jurisdiction === 'obca' && articles.filingMethod !== 'obr') {
        return 'Ontario incorporations must use Ontario Business Registry filing.';
    }
    if (data.preIncorporation?.jurisdiction === 'cbca' && articles.filingMethod !== 'corporations_canada') {
        return 'Federal incorporations must use Corporations Canada filing.';
    }
    if (articles.certificateReceived) {
        if (!normalizeText(articles.corporationNumber)) return 'Corporation number is required once the certificate is received.';
        if (!articles.certificateDate) return 'Certificate date is required once the certificate is received.';
        if (!isValidIsoDate(articles.certificateDate)) return 'Certificate date must be a valid YYYY-MM-DD date.';
        if (isFutureDate(articles.certificateDate)) return 'Certificate date cannot be in the future.';
    }

    return null;
};

/**
 * Hard data-integrity errors that block navigation (used by validateStep / validateIncorpSection).
 * Checklist prerequisites (by-laws, resolutions) are NOT included here — they
 * are captured by isIncorpSectionComplete via postIncorpOrgComplete below.
 */
const validatePostIncorpOrg = (data: IncorporationData) => {
    const post = data.postIncorpOrg;

    // Banking by-law is a logical inconsistency — block immediately
    if (post?.bankingByLawSeparate && !post.bankingByLawDrafted) {
        return 'Draft the separate banking by-law or turn off the separate banking by-law option.';
    }

    const directors = data.structureOwnership?.directors || [];
    const consents = post?.directorConsents || [];
    const directorKeys = directors.map((director) => directorKey(director)).filter(Boolean);
    const consentKeys = consents.map((consent) => directorKey(consent)).filter(Boolean);

    if (directors.length && consents.length !== directors.length) {
        return 'Director consents must match the current director list.';
    }
    if (new Set(consentKeys).size !== consentKeys.length) {
        return 'Each director should have only one consent entry.';
    }
    if (directorKeys.some((key) => !consentKeys.includes(key)) || consentKeys.some((key) => !directorKeys.includes(key))) {
        return 'Director consents must match the current director list.';
    }

    for (const consent of consents) {
        const name = normalizeText(consent.directorName);
        if (!name) return 'Each director consent must identify the director.';
        if (consent.consentSigned && !consent.consentDate) return `Enter a consent date for ${name}.`;
        if (consent.consentDate && !consent.consentSigned) return `Mark ${name} as signed or clear the consent date.`;
        if (consent.consentDate && !isValidIsoDate(consent.consentDate)) return `Consent date must be valid for ${name}.`;
        if (consent.consentDate && isFutureDate(consent.consentDate)) return `Consent date cannot be in the future for ${name}.`;
    }

    return null;
};

/**
 * Full completeness check for Step 4 — includes checklist prerequisites.
 * Used only by isIncorpSectionComplete (shown in sidebar status / progress)
 * NOT used as the navigation blocker so 'Proceed Anyway' works correctly.
 */
const isPostIncorpOrgComplete = (data: IncorporationData) => {
    const post = data.postIncorpOrg;
    if (!post?.generalByLawDrafted) return false;
    if (post.bankingByLawSeparate && !post.bankingByLawDrafted) return false;
    if (!post.orgResolutionsPrepared) return false;
    if (!post.officeResolutionPassed) return false;
    // Director consents: all active consents must be signed with a date
    const directors = data.structureOwnership?.directors || [];
    const consents = post.directorConsents || [];
    if (directors.length && consents.length !== directors.length) return false;
    const allConsentsSigned = consents.every((c) => c.consentSigned && !!c.consentDate);
    if (!allConsentsSigned) return false;
    // No blocking data errors
    return validatePostIncorpOrg(data) === null;
};

const validateShareIssuance = (data: IncorporationData) => {
    const issuance = data.shareIssuance;
    const shareClasses = data.structureOwnership?.shareClasses || [];
    const shareholders = data.structureOwnership?.initialShareholders || [];

    if (!shareholders.length) {
        return 'Add at least one initial shareholder in Structure & Ownership before completing share issuance.';
    }
    if (!issuance?.subscriptionAgreements?.length) {
        return 'At least one share subscription agreement should be prepared.';
    }

    const validShareClassKeys = new Set(shareClasses.map((shareClass) => shareClassKey(shareClass)).filter(Boolean));
    const agreements = issuance.subscriptionAgreements;
    const shareholderMap = new Map<string, typeof shareholders[number]>();
    const agreementKeys = agreements.map((agreement) => shareholderKey(agreement)).filter(Boolean);

    shareholders.forEach((shareholder) => {
        const key = shareholderKey(shareholder);
        if (key) shareholderMap.set(key, shareholder);
    });

    if (agreements.length !== shareholders.length) {
        return 'Subscription agreements must match the current shareholder list.';
    }
    if (new Set(agreementKeys).size !== agreementKeys.length) {
        return 'Each shareholder should have only one subscription agreement.';
    }
    if (
        [...shareholderMap.keys()].some((key) => !agreementKeys.includes(key))
        || agreementKeys.some((key) => !shareholderMap.has(key))
    ) {
        return 'Subscription agreements must match the current shareholder list.';
    }
    if (!issuance.certificateType) return 'Please select the certificate type (certificated or uncertificated).';

    for (const agreement of agreements) {
        const name = normalizeText(agreement.subscriberName);
        const agreementKey = shareholderKey(agreement);
        const classKey = shareholderShareClassKey(agreement);
        const linkedShareholder = agreementKey ? shareholderMap.get(agreementKey) : undefined;

        if (!name) return 'Each subscription agreement must identify the subscriber.';
        if (!classKey || !validShareClassKeys.has(classKey)) {
            return `Subscription agreement for ${name} must reference an existing share class.`;
        }
        if (!linkedShareholder) return `Subscription agreement for ${name} no longer matches Structure & Ownership. Sync shareholders to continue.`;
        if (linkedShareholder.id && normalizeText(agreement.shareholderId) !== normalizeText(linkedShareholder.id)) {
            return `Link ${name} to the originating shareholder.`;
        }
        if (!normalizeText(agreement.subscriberAddress)) return `Subscriber address is required for ${name}.`;
        if (!isPositiveInteger(agreement.numberOfShares)) return `Enter a whole-number share count of at least 1 for ${name}.`;
        if ((agreement.considerationAmount || 0) < 0) return `Consideration amount cannot be negative for ${name}.`;
        if (
            normalizeText(linkedShareholder.fullName) !== name
            || shareholderShareClassKey(linkedShareholder) !== classKey
            || linkedShareholder.numberOfShares !== agreement.numberOfShares
        ) {
            return `Subscription agreement for ${name} no longer matches Structure & Ownership. Sync shareholders to continue.`;
        }
    }

    const totals = buildClassTotals(shareClasses, agreements);
    for (const total of totals) {
        if (total.shareClass.maxShares && total.totalIssued > total.shareClass.maxShares) {
            return `Issued shares exceed the maximum authorized for ${normalizeText(total.shareClass.className)}.`;
        }
    }

    if (!issuance.securitiesRegisterComplete) return 'Please confirm that the securities register is complete.';
    if (!issuance.considerationCollected) return 'Please confirm that consideration has been collected from all shareholders.';
    if (data.structureOwnership?.requiresS85Rollover && !issuance.s85DocumentsComplete) {
        return 's.85 rollover documents must be completed before this step is complete.';
    }

    return null;
};

const validateCorporateRecords = (data: IncorporationData) => {
    const records = getEffectiveCorporateRecords(data);

    const requirements: Array<[boolean | undefined, string]> = [
        [records.hasArticlesAndCertificate, 'Confirm that the Articles and Certificate are in the minute book.'],
        [records.hasByLaws, 'Confirm that the by-laws are in the minute book.'],
        [records.hasDirectorMinutes, 'Confirm that directors minutes are in the minute book.'],
        [records.hasShareholderMinutes, 'Confirm that shareholder minutes are in the minute book.'],
        [records.hasWrittenResolutions, 'Confirm that written resolutions are in the minute book.'],
        [records.hasSecuritiesRegister, 'Confirm that the securities register is in place.'],
        [records.hasDirectorRegister, 'Confirm that the director register is in place.'],
        [records.hasOfficerRegister, 'Confirm that the officer register is in place.'],
        [records.recordsLocationConfirmed, 'Confirm where the records are maintained.'],
    ];

    for (const [value, message] of requirements) {
        if (!value) return message;
    }

    if (!records.hasISCRegister) return 'Confirm that the ISC register is in place.';
    if (!records.hasUSACopy) return 'Attach a copy of the unanimous shareholders agreement.';

    return null;
};

const validateRegistrations = (data: IncorporationData) => {
    const registrations = getEffectiveRegistrations(data);

    if (!registrations.craRegistered) return 'CRA Business Number registration is required.';
    if (!isValidBusinessNumber(registrations.craBusinessNumber)) return 'Enter a valid 9-digit CRA Business Number.';
    if (registrations.hstGstRegistered && !isValidProgramAccount(registrations.hstGstNumber, 'RT')) {
        return 'Enter a valid HST/GST program account number.';
    }
    if (registrations.payrollAccountRegistered && !isValidProgramAccount(registrations.payrollAccountNumber, 'RP')) {
        return 'Enter a valid payroll program account number.';
    }
    if (registrations.extraProvincialRegistered && !registrations.extraProvincialProvinces.length) {
        return 'Select at least one province for extra-provincial registration.';
    }
    if (registrations.wsibRegistered && !normalizeText(registrations.wsibAccountNumber)) {
        return 'Enter the WSIB account number or clear the WSIB toggle.';
    }
    for (const licence of registrations.municipalLicences || []) {
        if (!normalizeText(licence.municipality)) return 'Each municipal licence must include a municipality.';
        if (!normalizeText(licence.licenceType)) return 'Each municipal licence must include a licence type.';
    }

    return null;
};

const validateBankingSetup = (data: IncorporationData) => {
    const banking = getEffectiveBankingSetup(data);

    if (!banking.bankAccountOpened) return 'Please confirm that the corporate bank account has been opened.';
    if (!normalizeText(banking.bankName)) return 'Please enter the corporate bank name.';
    if (normalizeText(banking.bankName) === 'Other') {
        return 'Please enter the custom bank name instead of the placeholder "Other".';
    }
    if (!banking.minuteBookSetup) return 'Please confirm that the minute book is set up and organized.';
    if (banking.accountantEngaged && !normalizeText(banking.accountantName)) return 'Please enter the accountant or firm name.';
    if (banking.insuranceObtained && !banking.insuranceTypes.length) return 'Select at least one insurance type or clear the insurance toggle.';
    if (banking.agreementsDrafted && !banking.agreementTypes.length) return 'Select at least one agreement type or clear the agreements toggle.';
    if (data.shareIssuance?.certificateType === 'uncertificated' && banking.shareCertificatesOrdered) {
        return 'Share certificates cannot be ordered when the corporation is set up as uncertificated.';
    }

    return null;
};

const validators = {
    preIncorporation: validatePreIncorporation,
    structureOwnership: validateStructureOwnership,
    articles: validateArticles,
    postIncorpOrg: validatePostIncorpOrg,
    shareIssuance: validateShareIssuance,
    corporateRecords: validateCorporateRecords,
    registrations: validateRegistrations,
    bankingSetup: validateBankingSetup,
} as const;

export type IncorpValidationContext = keyof typeof validators;

export const validateIncorpSection = (
    context: IncorpValidationContext,
    data: IncorporationData
) => validators[context](data);

/**
 * Section completeness — used for sidebar status and progress bar.
 * postIncorpOrg uses the full checklist check (by-laws + resolutions + consents),
 * all other sections use absence of a blocking error as their completeness signal.
 */
export const isIncorpSectionComplete = (
    context: IncorpValidationContext,
    data: IncorporationData
) => {
    if (context === 'postIncorpOrg') {
        return isPostIncorpOrgComplete(data);
    }
    return !validators[context](data);
};

export const getBlockingIncorpIssues = (data: IncorporationData) =>
    (Object.keys(validators) as Array<IncorpValidationContext>)
        .map((context) => ({
            context,
            message: validators[context](data),
        }))
        .filter((issue): issue is { context: IncorpValidationContext; message: string } => !!issue.message);

