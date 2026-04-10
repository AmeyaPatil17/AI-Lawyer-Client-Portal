import { describe, expect, it } from 'vitest';
import type { IncorporationData } from '../stores/incorpTypes';
import {
    buildCorporateName,
    getBlockingIncorpIssues,
    isValidFiscalYearEnd,
    isValidIsoDate,
    validateIncorpSection,
} from '../utils/incorpRules';

const makeCompleteData = (): IncorporationData => ({
    preIncorporation: {
        jurisdiction: 'obca',
        nameType: 'named',
        proposedName: 'Acme',
        legalEnding: 'Inc.',
        nuansReport: { reportDate: '2026-03-01' },
        nuansReviewed: true,
        nameConfirmed: true,
    },
    structureOwnership: {
        shareClasses: [{
            id: 'class_1',
            className: 'Common',
            maxShares: 1000,
            votingRights: true,
            dividendRights: true,
            liquidationRights: true,
        }],
        initialShareholders: [{
            id: 'holder_1',
            fullName: 'Alice Shareholder',
            shareClassId: 'class_1',
            shareClass: 'Common',
            numberOfShares: 100,
        }],
        directors: [{ id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true }],
        registeredOfficeAddress: '123 Main St',
        registeredOfficeProvince: 'ON',
        fiscalYearEnd: '12-31',
    },
    articles: {
        corporateName: 'Acme Inc.',
        registeredAddress: '123 Main St',
        directorCountType: 'fixed',
        directorCountFixed: 1,
        shareCapitalDescription: 'Unlimited common shares',
        filingMethod: 'obr',
        certificateReceived: true,
        corporationNumber: 'ONT-123',
        certificateDate: '2026-03-15',
    },
    postIncorpOrg: {
        generalByLawDrafted: true,
        orgResolutionsPrepared: true,
        officeResolutionPassed: true,
        directorConsents: [{
            id: 'consent_1',
            directorId: 'dir_1',
            directorName: 'Jane Director',
            consentSigned: true,
            consentDate: '2026-03-15',
        }],
    },
    shareIssuance: {
        subscriptionAgreements: [{
            id: 'agreement_1',
            shareholderId: 'holder_1',
            subscriberName: 'Alice Shareholder',
            shareClassId: 'class_1',
            shareClass: 'Common',
            numberOfShares: 100,
            subscriberAddress: '123 Main St',
            considerationAmount: 100,
        }],
        certificateType: 'certificated',
        securitiesRegisterComplete: true,
        considerationCollected: true,
    },
    corporateRecords: {
        hasDirectorMinutes: true,
        hasShareholderMinutes: true,
        hasWrittenResolutions: true,
        hasDirectorRegister: true,
        hasOfficerRegister: true,
        recordsLocationConfirmed: true,
    },
    registrations: {
        craRegistered: true,
        craBusinessNumber: '123456789',
    },
    bankingSetup: {
        bankAccountOpened: true,
        bankName: 'RBC Royal Bank',
        minuteBookSetup: true,
    },
});

describe('incorpRules', () => {
    it('rejects rollover ISO dates', () => {
        expect(isValidIsoDate('2026-02-31')).toBe(false);
        expect(isValidIsoDate('2026-02-28')).toBe(true);
    });

    it('validates fiscal year end as a recurring MM-DD value', () => {
        expect(isValidFiscalYearEnd('02-29')).toBe(false);
        expect(isValidFiscalYearEnd('12-31')).toBe(true);
    });

    it('does not build a name from only the legal ending', () => {
        expect(buildCorporateName({ nameType: 'named', legalEnding: 'Inc.' })).toBe('');
    });

    it('requires nuansReviewed for named corporations', () => {
        const data = makeCompleteData();
        data.preIncorporation!.nuansReviewed = false;

        expect(validateIncorpSection('preIncorporation', data)).toContain('NUANS results were reviewed');
    });

    it('treats a named-corporation conflict as resolvable when details are provided', () => {
        const data = makeCompleteData();
        data.preIncorporation!.nuansReport = {
            reportDate: '2026-03-01',
            hasConflicts: true,
            conflictDetails: 'Existing name has a different industry and location.',
        };

        expect(validateIncorpSection('preIncorporation', data)).toBeNull();
    });

    it('requires at least one shareholder in structure ownership', () => {
        const data = makeCompleteData();
        data.structureOwnership!.initialShareholders = [];

        expect(validateIncorpSection('structureOwnership', data)).toContain('initial shareholder');
    });

    it('keeps blank placeholder rows incomplete in structure ownership and registrations', () => {
        const structureData = makeCompleteData();
        structureData.structureOwnership!.shareClasses = [{
            id: 'class_1',
            className: '',
            votingRights: true,
            dividendRights: true,
            liquidationRights: true,
            maxShares: 0,
        }];

        const registrationsData = makeCompleteData();
        registrationsData.registrations = {
            craRegistered: true,
            craBusinessNumber: '123456789',
            municipalLicences: [{
                id: 'municipal_1',
                municipality: '',
                licenceType: '',
                obtained: false,
            }],
        };

        expect(validateIncorpSection('structureOwnership', structureData)).toContain('share classes must have a name');
        expect(validateIncorpSection('registrations', registrationsData)).toContain('municipality');
    });

    it('rejects stale shareholder share-class references', () => {
        const data = makeCompleteData();
        data.structureOwnership!.initialShareholders = [{
            fullName: 'Alice Shareholder',
            shareClassId: 'missing_class',
            numberOfShares: 100,
        }];

        expect(validateIncorpSection('structureOwnership', data)).toContain('existing share class');
    });

    it('rejects duplicate share-class ids and fractional share counts', () => {
        const duplicateIds = makeCompleteData();
        duplicateIds.structureOwnership!.shareClasses = [
            { id: 'dup', className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true },
            { id: 'dup', className: 'Preferred', votingRights: true, dividendRights: true, liquidationRights: true },
        ];

        const fractionalShares = makeCompleteData();
        fractionalShares.structureOwnership!.initialShareholders = [{
            fullName: 'Alice Shareholder',
            shareClassId: 'class_1',
            shareClass: 'Common',
            numberOfShares: 1.5,
        }];

        expect(validateIncorpSection('structureOwnership', duplicateIds)).toContain('duplicate identifier');
        expect(validateIncorpSection('structureOwnership', fractionalShares)).toContain('whole-number share count');
    });

    it('rejects invalid optional shareholder emails', () => {
        const data = makeCompleteData();
        data.structureOwnership!.initialShareholders = [{
            id: 'holder_1',
            fullName: 'Alice Shareholder',
            email: 'invalid-email',
            shareClassId: 'class_1',
            shareClass: 'Common',
            numberOfShares: 100,
        }];

        expect(validateIncorpSection('structureOwnership', data)).toContain('valid email address');
    });

    it('blocks CBCA residency failures but not the same OBCA director mix', () => {
        const cbcaData = makeCompleteData();
        cbcaData.preIncorporation!.jurisdiction = 'cbca';
        cbcaData.structureOwnership!.directors = [
            { id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: false },
            { id: 'dir_2', fullName: 'John Director', address: '456 Queen St', isCanadianResident: false },
        ];

        const obcaData = makeCompleteData();
        obcaData.preIncorporation!.jurisdiction = 'obca';
        obcaData.structureOwnership!.directors = [
            { id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: false },
            { id: 'dir_2', fullName: 'John Director', address: '456 Queen St', isCanadianResident: false },
        ];

        expect(validateIncorpSection('structureOwnership', cbcaData)).toContain('resident Canadian');
        expect(validateIncorpSection('structureOwnership', obcaData)).toBeNull();
    });

    it('requires at least one share class with the core shareholder rights', () => {
        const data = makeCompleteData();
        data.structureOwnership!.shareClasses = [{
            id: 'class_1',
            className: 'Common',
            votingRights: true,
            dividendRights: false,
            liquidationRights: true,
            maxShares: 1000,
        }];

        expect(validateIncorpSection('structureOwnership', data)).toContain('voting, dividend, and liquidation');
    });

    it('requires articles director counts to match the live director list', () => {
        const data = makeCompleteData();
        data.articles!.directorCountFixed = 2;

        expect(validateIncorpSection('articles', data)).toContain('must match the 1 director');
    });

    it('rejects P.O. Box registered offices in articles', () => {
        const data = makeCompleteData();
        data.articles!.registeredAddress = 'PO Box 100';

        expect(validateIncorpSection('articles', data)).toContain('P.O. Box');
    });

    it('requires the filing method to match the incorporation jurisdiction', () => {
        const data = makeCompleteData();
        data.preIncorporation!.jurisdiction = 'cbca';
        data.articles!.filingMethod = 'obr';

        expect(validateIncorpSection('articles', data)).toContain('Corporations Canada');
    });

    it('rejects future certificate dates in articles', () => {
        const data = makeCompleteData();
        data.articles!.certificateDate = '2099-01-01';

        expect(validateIncorpSection('articles', data)).toContain('future');
    });

    it('rejects future consent dates', () => {
        const data = makeCompleteData();
        data.postIncorpOrg!.directorConsents = [{
            directorId: 'dir_1',
            directorName: 'Jane Director',
            consentSigned: true,
            consentDate: '2099-01-01',
        }];

        expect(validateIncorpSection('postIncorpOrg', data)).toContain('future');
    });

    it('requires exact shareholder parity in share issuance', () => {
        const data = makeCompleteData();
        data.shareIssuance!.subscriptionAgreements = [{
            shareholderId: 'holder_1',
            subscriberName: 'Alice Shareholder',
            shareClassId: 'class_1',
            shareClass: 'Common',
            numberOfShares: 99,
            subscriberAddress: '123 Main St',
        }];

        expect(validateIncorpSection('shareIssuance', data)).toContain('no longer matches Structure & Ownership');
    });

    it('accepts derived corporate-record readiness from prior sections', () => {
        const data = makeCompleteData();
        data.corporateRecords = {
            hasDirectorMinutes: true,
            hasShareholderMinutes: true,
            hasWrittenResolutions: true,
            hasDirectorRegister: true,
            hasOfficerRegister: true,
            hasISCRegister: true,
            recordsLocationConfirmed: true,
        };

        expect(validateIncorpSection('corporateRecords', data)).toBeNull();
    });

    it('gates extra-provincial registration to CBCA only', () => {
        const data = makeCompleteData();
        data.registrations = {
            craRegistered: true,
            craBusinessNumber: '123456789',
            extraProvincialRegistered: true,
            extraProvincialProvinces: [],
        };

        expect(validateIncorpSection('registrations', data)).toBeNull();
    });

    it('accepts derived minute-book readiness and rejects placeholder bank names', () => {
        const derivedReady = makeCompleteData();
        derivedReady.bankingSetup = {
            bankAccountOpened: true,
            bankName: 'RBC Royal Bank',
            minuteBookSetup: false,
        };
        derivedReady.corporateRecords = {
            hasDirectorMinutes: true,
            hasShareholderMinutes: true,
            hasWrittenResolutions: true,
            hasDirectorRegister: true,
            hasOfficerRegister: true,
            recordsLocationConfirmed: true,
        };

        const placeholderBank = makeCompleteData();
        placeholderBank.bankingSetup = {
            bankAccountOpened: true,
            bankName: 'Other',
            minuteBookSetup: true,
        };

        expect(validateIncorpSection('bankingSetup', derivedReady)).toBeNull();
        expect(validateIncorpSection('bankingSetup', placeholderBank)).toContain('placeholder');
    });

    it('returns blocking issues from the hardened shared validators', () => {
        const issues = getBlockingIncorpIssues({ preIncorporation: { jurisdiction: 'obca' } });
        expect(issues.some((issue) => issue.context === 'preIncorporation')).toBe(true);
        expect(issues.some((issue) => issue.context === 'structureOwnership')).toBe(true);
    });
});
