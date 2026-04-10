import {
    PreIncorporationSchema,
    StructureOwnershipSchema,
    ArticlesSchema,
    ShareIssuanceSchema,
    IncorporationDataSchema,
} from '../schemas/incorporationSchema';

describe('Incorporation Zod Schemas', () => {
    describe('PreIncorporationSchema', () => {
        it('should accept valid OBCA pre-inc data', () => {
            const result = PreIncorporationSchema.safeParse({
                jurisdiction: 'obca',
                nameType: 'named',
                proposedName: 'Test Corp',
                legalEnding: 'Inc.',
            });
            expect(result.success).toBe(true);
        });

        it('should accept CBCA with bilingual name', () => {
            const result = PreIncorporationSchema.safeParse({
                jurisdiction: 'cbca',
                nameType: 'named',
                proposedName: 'Test Corp',
                bilingualName: 'Corp de Test',
            });
            expect(result.success).toBe(true);
        });

        it('should accept numbered company', () => {
            const result = PreIncorporationSchema.safeParse({
                jurisdiction: 'obca',
                nameType: 'numbered',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid jurisdiction', () => {
            const result = PreIncorporationSchema.safeParse({
                jurisdiction: 'invalid',
            });
            expect(result.success).toBe(false);
        });

        it('should accept empty object (all optional)', () => {
            const result = PreIncorporationSchema.safeParse({});
            expect(result.success).toBe(true);
        });
    });

    describe('StructureOwnershipSchema', () => {
        it('should accept valid share classes', () => {
            const result = StructureOwnershipSchema.safeParse({
                shareClasses: [{
                    className: 'Common',
                    votingRights: true,
                    dividendRights: true,
                    maxShares: 0,
                }],
            });
            expect(result.success).toBe(true);
        });

        it('accepts draft placeholder rows for added classes, shareholders, and directors', () => {
            const result = StructureOwnershipSchema.safeParse({
                shareClasses: [{
                    id: 'share_class_1',
                    className: '',
                    votingRights: true,
                    dividendRights: true,
                    liquidationRights: true,
                    maxShares: 0,
                }],
                initialShareholders: [{
                    id: 'shareholder_1',
                    fullName: '',
                    numberOfShares: 1,
                    considerationType: 'cash',
                    considerationAmount: 0,
                }],
                directors: [{
                    id: 'director_1',
                    fullName: '',
                    address: '',
                    isCanadianResident: true,
                }],
            });

            expect(result.success).toBe(true);
        });

        it('should reject share class without className', () => {
            const result = StructureOwnershipSchema.safeParse({
                shareClasses: [{ votingRights: true }],
            });
            expect(result.success).toBe(false);
        });

        it('should accept directors with residency', () => {
            const result = StructureOwnershipSchema.safeParse({
                directors: [
                    { fullName: 'Jane Doe', isCanadianResident: true, address: '123 Main St' },
                ],
            });
            expect(result.success).toBe(true);
        });

        it('should reject directors without fullName', () => {
            const result = StructureOwnershipSchema.safeParse({
                directors: [{ isCanadianResident: true }],
            });
            expect(result.success).toBe(false);
        });
    });

    describe('ArticlesSchema', () => {
        it('should accept valid articles data', () => {
            const result = ArticlesSchema.safeParse({
                corporateName: 'Test Inc.',
                directorCountType: 'fixed',
                directorCountFixed: 3,
            });
            expect(result.success).toBe(true);
        });

        it('should accept range director count', () => {
            const result = ArticlesSchema.safeParse({
                directorCountType: 'range',
                directorCountMin: 1,
                directorCountMax: 5,
            });
            expect(result.success).toBe(true);
        });
    });

    describe('ShareIssuanceSchema', () => {
        it('should accept valid subscription agreements', () => {
            const result = ShareIssuanceSchema.safeParse({
                subscriptionAgreements: [{
                    subscriberName: 'Jane Doe',
                    shareClass: 'Common',
                    numberOfShares: 100,
                    considerationType: 'cash',
                }],
                certificateType: 'certificated',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid consideration type', () => {
            const result = ShareIssuanceSchema.safeParse({
                subscriptionAgreements: [{
                    subscriberName: 'Jane',
                    considerationType: 'future_services',
                }],
            });
            expect(result.success).toBe(false);
        });
    });

    describe('IncorporationDataSchema (composite)', () => {
        it('should accept complete valid data', () => {
            const result = IncorporationDataSchema.safeParse({
                preIncorporation: { jurisdiction: 'obca', nameType: 'named', proposedName: 'Acme Inc.', legalEnding: 'Inc.' },
                structureOwnership: {
                    shareClasses: [{ className: 'Common' }],
                    directors: [{ fullName: 'John Doe', isCanadianResident: true }],
                    registeredOfficeAddress: '123 Main St',
                },
                articles: { directorCountType: 'fixed', directorCountFixed: 1 },
                submitted: false,
            });
            expect(result.success).toBe(true);
        });

        it('should accept empty data (all sections optional)', () => {
            const result = IncorporationDataSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should passthrough unknown fields', () => {
            const result = IncorporationDataSchema.safeParse({ customField: 'test' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect((result.data as any).customField).toBe('test');
            }
        });

        it('accepts draft municipal licence placeholders inside composite payloads', () => {
            const result = IncorporationDataSchema.safeParse({
                registrations: {
                    craRegistered: true,
                    craBusinessNumber: '123456789',
                    municipalLicences: [{
                        id: 'municipal_1',
                        municipality: '',
                        licenceType: '',
                        obtained: false,
                    }],
                },
            });

            expect(result.success).toBe(true);
        });
    });
});
