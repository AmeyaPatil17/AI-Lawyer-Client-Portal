import { IntakeDataSchema } from '../schemas/intake';

describe('Consolidated Zod Schema (Issue #10)', () => {
    it('should validate a complete intake data object', () => {
        const fullIntake = {
            personalProfile: {
                fullName: 'John Doe',
                dateOfBirth: '1980-01-15',
                address: '123 Main St, Toronto, ON',
                occupation: 'Engineer',
                maritalStatus: 'married',
            },
            family: {
                maritalStatus: 'married',
                spouseName: 'Jane Doe',
                children: [
                    {
                        fullName: 'Child Doe',
                        dateOfBirth: '2010-05-20',
                        placeOfBirth: 'Toronto',
                        parentage: 'current',
                    },
                ],
            },
            executors: {
                primary: { fullName: 'Executor One', relationship: 'Spouse' },
                alternates: [],
                decisionMode: 'majority',
                compensation: 'guidelines',
            },
            beneficiaries: {
                beneficiaries: [
                    { fullName: 'Child Doe', relationship: 'Child', share: 100 },
                ],
            },
            assets: {
                list: [
                    { type: 'RealEstate', category: 'realEstate', description: '123 Main St', ownership: 'sole', value: 500000 },
                ],
            },
            clientNotes: 'Please call in the afternoon',
        };

        const result = IntakeDataSchema.safeParse(fullIntake);
        expect(result.success).toBe(true);
    });

    it('should accept partial intake data (passthrough mode)', () => {
        const partialIntake = {
            personalProfile: {
                fullName: 'Jane Smith',
                dateOfBirth: '1990-03-20',
                address: '456 Oak Ave',
            },
        };

        const result = IntakeDataSchema.safeParse(partialIntake);
        expect(result.success).toBe(true);
    });

    it('should accept empty data (all fields optional)', () => {
        const result = IntakeDataSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('accepts numeric liability amounts and new asset root flags', () => {
        const result = IntakeDataSchema.safeParse({
            assets: {
                list: [],
                liabilities: [{ description: 'Mortgage', amount: 250000 }],
                confirmedNoSignificantAssets: false,
                hasShareholderAgreement: true,
            },
        });

        expect(result.success).toBe(true);
    });

    it('should strip unknown fields', () => {
        const data = {
            personalProfile: { fullName: 'Test', dateOfBirth: '2000-01-01', address: '123 St' },
            customField: 'should be stripped',
        };

        const result = IntakeDataSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
            expect((result.data as any).customField).toBeUndefined();
        }
    });
});
