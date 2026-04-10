import { useIncorpValidation } from '../composables/useIncorpValidation';
import type { IncorporationData } from '../stores/incorpTypes';

describe('useIncorpValidation', () => {
    const { validateStep, isStepComplete, getStepStatus } = useIncorpValidation();

    describe('preIncorporation validation', () => {
        it('should return error when jurisdiction is missing', () => {
            const data: IncorporationData = {};
            const result = validateStep('preIncorporation', data);
            expect(result).toBeTruthy();
            expect(result).toContain('OBCA');
        });

        it('should return error when nameType is missing', () => {
            const data: IncorporationData = { preIncorporation: { jurisdiction: 'obca' } };
            const result = validateStep('preIncorporation', data);
            expect(result).toContain('named or numbered');
        });

        it('should return error for named company without proposed name', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca', nameType: 'named', nameConfirmed: true }
            };
            const result = validateStep('preIncorporation', data);
            expect(result).toContain('corporate name');
        });

        it('should return null for complete pre-inc data', () => {
            const data: IncorporationData = {
                preIncorporation: {
                    jurisdiction: 'cbca',
                    nameType: 'named',
                    proposedName: 'Acme',
                    legalEnding: 'Inc.',
                    nuansReport: { reportDate: '2026-03-01' },
                    nuansReviewed: true,
                    nameConfirmed: true,
                }
            };
            expect(validateStep('preIncorporation', data)).toBeNull();
        });

        it('should mark complete for numbered company', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true }
            };
            expect(isStepComplete('preIncorporation', data)).toBe(true);
        });

        it('should not mark complete if missing jurisdiction', () => {
            const data: IncorporationData = { preIncorporation: { nameType: 'numbered' } };
            expect(isStepComplete('preIncorporation', data)).toBe(false);
        });

        it('should require a current NUANS report for named corporations', () => {
            const data: IncorporationData = {
                preIncorporation: {
                    jurisdiction: 'obca',
                    nameType: 'named',
                    proposedName: 'Acme',
                    legalEnding: 'Inc.',
                    nuansReport: { reportDate: '2025-01-01' },
                    nuansReviewed: true,
                    nameConfirmed: true,
                }
            };
            expect(validateStep('preIncorporation', data)).toContain('NUANS');
        });
    });

    describe('structureOwnership validation', () => {
        it('should require share classes', () => {
            const data: IncorporationData = { structureOwnership: {} };
            expect(validateStep('structureOwnership', data)).toContain('share class');
        });

        it('should require directors', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                }
            };
            expect(validateStep('structureOwnership', data)).toContain('director');
        });

        it('should require registered office address', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [{ fullName: 'John', address: '123 Main St', isCanadianResident: true }],
                }
            };
            expect(validateStep('structureOwnership', data)).toContain('registered office');
        });

        it('should pass with complete structure data', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [{ fullName: 'John', address: '123 Main St', isCanadianResident: true }],
                    registeredOfficeAddress: '123 Main St',
                    registeredOfficeProvince: 'ON',
                }
            };
            expect(validateStep('structureOwnership', data)).toBeNull();
            expect(isStepComplete('structureOwnership', data)).toBe(true);
        });

        it('blocks invalid optional shareholder email addresses', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', email: 'invalid-email', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [{ fullName: 'John', address: '123 Main St', isCanadianResident: true }],
                    registeredOfficeAddress: '123 Main St',
                    registeredOfficeProvince: 'ON',
                }
            };

            expect(validateStep('structureOwnership', data)).toContain('valid email address');
        });

        it('blocks CBCA residency failures but not OBCA director mixes', () => {
            const cbcaData: IncorporationData = {
                preIncorporation: { jurisdiction: 'cbca' },
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [
                        { fullName: 'John', address: '123 Main St', isCanadianResident: false },
                        { fullName: 'Jane', address: '456 Main St', isCanadianResident: false },
                    ],
                    registeredOfficeAddress: '123 Main St',
                    registeredOfficeProvince: 'ON',
                    recordsOfficeAddress: '123 Main St',
                }
            };

            const obcaData: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca' },
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [
                        { fullName: 'John', address: '123 Main St', isCanadianResident: false },
                        { fullName: 'Jane', address: '456 Main St', isCanadianResident: false },
                    ],
                    registeredOfficeAddress: '123 Main St',
                    registeredOfficeProvince: 'ON',
                }
            };

            expect(validateStep('structureOwnership', cbcaData)).toContain('resident Canadian');
            expect(validateStep('structureOwnership', obcaData)).toBeNull();
        });

        it('requires at least one class with voting, dividend, and liquidation rights', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common', votingRights: true, dividendRights: false, liquidationRights: true }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [{ fullName: 'John', address: '123 Main St', isCanadianResident: true }],
                    registeredOfficeAddress: '123 Main St',
                    registeredOfficeProvince: 'ON',
                }
            };

            expect(validateStep('structureOwnership', data)).toContain('voting, dividend, and liquidation');
        });

        it('keeps placeholder share-class rows incomplete even when the array exists', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: '', votingRights: true, dividendRights: true, liquidationRights: true, maxShares: 0 }],
                    initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                    directors: [{ fullName: 'John', address: '123 Main St', isCanadianResident: true }],
                    registeredOfficeAddress: '123 Main St',
                    registeredOfficeProvince: 'ON',
                }
            };

            expect(validateStep('structureOwnership', data)).toContain('share classes must have a name');
            expect(isStepComplete('structureOwnership', data)).toBe(false);
        });
    });

    describe('articles validation', () => {
        it('should require corporate name for named company', () => {
            const data: IncorporationData = {
                preIncorporation: { nameType: 'named' },
                articles: {}
            };
            expect(validateStep('articles', data)).toContain('Corporate name');
        });

        it('should require director count type', () => {
            const data: IncorporationData = {
                preIncorporation: { nameType: 'numbered' },
                articles: { registeredAddress: '123 Main St' }
            };
            expect(validateStep('articles', data)).toContain('number of directors');
        });

        it('should pass with complete articles', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca', nameType: 'numbered' },
                articles: {
                    registeredAddress: '123 Main St',
                    directorCountType: 'fixed',
                    directorCountFixed: 1,
                    shareCapitalDescription: 'Unlimited Common Shares',
                    filingMethod: 'obr',
                }
            };
            expect(validateStep('articles', data)).toBeNull();
        });

        it('should require the filing method to match the incorporation jurisdiction', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'cbca', nameType: 'numbered' },
                structureOwnership: {
                    directors: [{ fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true }],
                },
                articles: {
                    registeredAddress: '123 Main St',
                    directorCountType: 'fixed',
                    directorCountFixed: 1,
                    shareCapitalDescription: 'Unlimited Common Shares',
                    filingMethod: 'obr',
                }
            };

            expect(validateStep('articles', data)).toContain('Corporations Canada');
        });

        it('should reject future certificate dates in articles', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca', nameType: 'numbered' },
                structureOwnership: {
                    directors: [{ fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true }],
                },
                articles: {
                    registeredAddress: '123 Main St',
                    directorCountType: 'fixed',
                    directorCountFixed: 1,
                    shareCapitalDescription: 'Unlimited Common Shares',
                    filingMethod: 'obr',
                    certificateReceived: true,
                    corporationNumber: 'ONT-123',
                    certificateDate: '2099-01-01',
                }
            };

            expect(validateStep('articles', data)).toContain('future');
        });
    });

    describe('postIncorpOrg validation', () => {
        it('should not hard-block on general by-law, but should mark incomplete', () => {
            const data: IncorporationData = {};
            expect(validateStep('postIncorpOrg', data)).toBeNull();
            expect(isStepComplete('postIncorpOrg', data)).toBe(false);
        });

        it('should pass and mark complete when everything is drafted', () => {
            const data: IncorporationData = { postIncorpOrg: { generalByLawDrafted: true, orgResolutionsPrepared: true, officeResolutionPassed: true } };
            expect(validateStep('postIncorpOrg', data)).toBeNull();
            expect(isStepComplete('postIncorpOrg', data)).toBe(true);
        });

        it('should accept director consents linked by director id', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    directors: [{ id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true }],
                },
                postIncorpOrg: {
                    generalByLawDrafted: true,
                    orgResolutionsPrepared: true,
                    officeResolutionPassed: true,
                    directorConsents: [{ id: 'consent_1', directorId: 'dir_1', directorName: 'Jane Director', consentSigned: true, consentDate: '2026-03-01' }],
                }
            };
            expect(validateStep('postIncorpOrg', data)).toBeNull();
        });

        it('should require director consents to match the current directors by id', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    directors: [{ id: 'dir_1', fullName: 'Jane Director' }],
                },
                postIncorpOrg: {
                    generalByLawDrafted: true,
                    orgResolutionsPrepared: true,
                    officeResolutionPassed: true,
                    directorConsents: [{ id: 'consent_1', directorId: 'dir_2', directorName: 'Someone Else', consentSigned: true, consentDate: '2026-03-01' }],
                }
            };
            expect(validateStep('postIncorpOrg', data)).toContain('director list');
        });
    });

    describe('shareIssuance validation', () => {
        it('should require subscription agreements', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ id: 'class_1', className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ id: 'holder_1', fullName: 'Alice', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 10 }],
                },
            };
            expect(validateStep('shareIssuance', data)).toContain('subscription agreement');
        });

        it('should require subscription agreements to match shareholder ids', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    initialShareholders: [{ id: 'holder_1', fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                },
                shareIssuance: {
                    subscriptionAgreements: [{
                        id: 'agreement_1',
                        shareholderId: 'holder_2',
                        subscriberName: 'Alice',
                        shareClass: 'Common',
                        numberOfShares: 10,
                        subscriberAddress: '123 Main St',
                    }],
                    certificateType: 'certificated',
                    securitiesRegisterComplete: true,
                    considerationCollected: true,
                }
            };
            expect(validateStep('shareIssuance', data)).toContain('shareholder list');
        });

        it('should accept subscription agreements linked by shareholder id', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ id: 'class_1', className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ id: 'holder_1', fullName: 'Alice', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 10 }],
                },
                shareIssuance: {
                    subscriptionAgreements: [{
                        id: 'agreement_1',
                        shareholderId: 'holder_1',
                        subscriberName: 'Alice',
                        shareClassId: 'class_1',
                        shareClass: 'Common',
                        numberOfShares: 10,
                        subscriberAddress: '123 Main St',
                    }],
                    certificateType: 'certificated',
                    securitiesRegisterComplete: true,
                    considerationCollected: true,
                }
            };
            expect(validateStep('shareIssuance', data)).toBeNull();
        });

        it('should require subscriber addresses for the securities register', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ id: 'class_1', className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                    initialShareholders: [{ id: 'holder_1', fullName: 'Alice', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 10 }],
                },
                shareIssuance: {
                    subscriptionAgreements: [{
                        id: 'agreement_1',
                        shareholderId: 'holder_1',
                        subscriberName: 'Alice',
                        shareClassId: 'class_1',
                        shareClass: 'Common',
                        numberOfShares: 10,
                    }],
                    certificateType: 'certificated',
                    securitiesRegisterComplete: true,
                    considerationCollected: true,
                }
            };
            expect(validateStep('shareIssuance', data)).toContain('address');
        });
    });

    describe('registrations validation', () => {
        it('should require CRA registration', () => {
            const data: IncorporationData = {};
            expect(validateStep('registrations', data)).toContain('CRA');
        });

        it('should pass when CRA is registered', () => {
            const data: IncorporationData = { registrations: { craRegistered: true, craBusinessNumber: '123456789' } };
            expect(validateStep('registrations', data)).toBeNull();
        });

        it('keeps placeholder municipal licence rows incomplete', () => {
            const data: IncorporationData = {
                registrations: {
                    craRegistered: true,
                    craBusinessNumber: '123456789',
                    municipalLicences: [{
                        municipality: '',
                        licenceType: '',
                        obtained: false,
                    }],
                },
            };

            expect(validateStep('registrations', data)).toContain('municipality');
            expect(isStepComplete('registrations', data)).toBe(false);
        });
    });

    describe('bankingSetup validation', () => {
        it('should block share certificates when issuance is uncertificated', () => {
            const data: IncorporationData = {
                shareIssuance: { certificateType: 'uncertificated' },
                bankingSetup: {
                    bankAccountOpened: true,
                    bankName: 'RBC',
                    minuteBookSetup: true,
                    shareCertificatesOrdered: true,
                }
            };
            expect(validateStep('bankingSetup', data)).toContain('uncertificated');
        });
    });

    describe('getStepStatus', () => {
        it('should return complete for completed step', () => {
            const data: IncorporationData = { postIncorpOrg: { generalByLawDrafted: true, orgResolutionsPrepared: true, officeResolutionPassed: true } };
            expect(getStepStatus('postIncorpOrg', data)).toBe('complete');
        });

        it('should return warning for step with validation error', () => {
            const data: IncorporationData = { preIncorporation: { jurisdiction: 'obca' } };
            expect(getStepStatus('preIncorporation', data)).toBe('warning');
        });

        it('should return pending for review step', () => {
            const data: IncorporationData = {};
            expect(getStepStatus('review', data)).toBe('pending');
        });

        it('should return false for unknown strategy', () => {
            const data: IncorporationData = {};
            expect(isStepComplete('nonexistent', data)).toBe(false);
            expect(validateStep('nonexistent', data)).toBeNull();
        });
    });
});
