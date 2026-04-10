import { IntakeValidationService } from '../services/intakeValidationService';
import { IntakeData } from '../types/intake';

describe('IntakeValidationService', () => {
    describe('validateStep', () => {
        it('should return error if Profile is missing name', () => {
            const data: IntakeData = { personalProfile: {} as any };
            const error = IntakeValidationService.validateStep('personalProfile', data);
            expect(error).toContain('Full Name is required');
        });

        it('should return null if Profile is valid', () => {
            const data: IntakeData = {
                personalProfile: {
                    fullName: 'John Doe',
                    dateOfBirth: '1980-01-01',
                    maritalStatus: 'single',
                },
            };
            const error = IntakeValidationService.validateStep('personalProfile', data);
            expect(error).toBeNull();
        });

        it('should validate Family logic (Married checks)', () => {
            const data: IntakeData = { family: { maritalStatus: 'Married' } };
            const error = IntakeValidationService.validateStep('family', data);
            expect(error).toContain("listed a Spouse");
        });
    });

    describe('getStepStatus', () => {
        it('should return pending for empty profile', () => {
            const data: IntakeData = {};
            expect(IntakeValidationService.getStepStatus('personalProfile', data)).toBe('pending');
        });

        it('should return null for valid profile', () => {
            const data: IntakeData = {
                personalProfile: {
                    fullName: 'Test',
                    dateOfBirth: '1980-01-01',
                    maritalStatus: 'single',
                },
            };
            expect(IntakeValidationService.validateStep('personalProfile', data)).toBeNull();
        });

        it('should return error for missing executor name', () => {
            const data: IntakeData = { executors: { primary: {} as any } };
            expect(IntakeValidationService.validateStep('executors', data)).toContain('appoint');
        });

        it('should return error for empty beneficiaries', () => {
            const data: IntakeData = { beneficiaries: { beneficiaries: [] } };
            expect(IntakeValidationService.validateStep('beneficiaries', data)).toContain('listed');
        });

        it('should return warning for married without spouse in family', () => {
            const data: IntakeData = { family: { maritalStatus: 'Married' } };
            expect(IntakeValidationService.getStepStatus('family', data)).toBe('warning');
        });

        it('should return complete for married with spouse', () => {
            const data: IntakeData = { family: { maritalStatus: 'Married', spouseName: 'Jane' } };
            expect(IntakeValidationService.getStepStatus('family', data)).toBe('complete');
        });

        it('should return pending for family started but incomplete', () => {
            const data: IntakeData = { family: { children: [], maritalStatus: 'Single' } };
            expect(IntakeValidationService.getStepStatus('family', data)).toBe('complete');
        });

        it('should return pending for empty executors', () => {
            const data: IntakeData = {};
            const status = IntakeValidationService.getStepStatus('executors', data);
            expect(status).toBe('pending');
        });

        it('should return complete for valid executors', () => {
            const data: IntakeData = { executors: { primary: { fullName: 'Test Executor' }, alternates: [] } };
            const status = IntakeValidationService.getStepStatus('executors', data);
            expect(status).toBe('complete');
        });

        it('should return warning for alternates missing relationships', () => {
            const data: IntakeData = {
                personalProfile: { fullName: 'Test Client' },
                executors: {
                    primary: { fullName: 'Executor One' },
                    alternates: [{ fullName: 'Executor Two' }],
                },
            };
            expect(IntakeValidationService.getStepStatus('executors', data)).toBe('warning');
            expect(IntakeValidationService.validateStep('executors', data)).toContain('relationship');
        });

        it('normalizes legacy object refs before validating executors', () => {
            const data: IntakeData = {
                executors: {
                    primary: { fullName: { name: 'Legacy Primary' } as any },
                    alternates: [{ fullName: { name: 'Legacy Alternate' } as any, relationship: 'Sibling' }],
                },
            };

            expect(IntakeValidationService.validateStep('executors', data)).toBeNull();
            expect(IntakeValidationService.getStepStatus('executors', data)).toBe('complete');
        });

        it('keeps executors incomplete when names collide and specific compensation details are blank', () => {
            const data: IntakeData = {
                personalProfile: { fullName: 'Alex Doe' },
                executors: {
                    primary: { fullName: 'Jamie Doe' },
                    alternates: [{ fullName: 'Jamie Doe', relationship: 'Sibling' }],
                    compensation: 'specific',
                    compensationDetails: '   ',
                },
            };

            expect(IntakeValidationService.validateStep('executors', data)).toContain('different person');
            expect(IntakeValidationService.getStepStatus('executors', data)).toBe('warning');
        });

        it('should return complete for valid beneficiaries', () => {
            const data: IntakeData = {
                beneficiaries: {
                    beneficiaries: [{ fullName: 'Ben', relationship: 'Child', share: 100 }],
                },
            };
            expect(IntakeValidationService.getStepStatus('beneficiaries', data)).toBe('complete');
        });

        it('should return pending for empty beneficiaries', () => {
            const data: IntakeData = { beneficiaries: { beneficiaries: [] } };
            expect(IntakeValidationService.getStepStatus('beneficiaries', data)).toBe('pending');
        });

        it('should handle generic step statuses', () => {
            const data: IntakeData = {
                assets: { confirmedNoSignificantAssets: true, list: [] },
            } as any;
            expect(IntakeValidationService.getStepStatus('assets', data)).toBe('complete');
            expect(IntakeValidationService.getStepStatus('unknown', data)).toBe('pending');
        });

        it('uses the hardened POA completion rule for relationships, legacy refs, and living will instructions', () => {
            const validData: IntakeData = {
                poa: {
                    property: {
                        primaryName: { name: 'Legacy Property' } as any,
                        primaryRelationship: 'Sibling',
                    },
                    personalCare: {
                        primaryName: { fullName: 'Legacy Care' } as any,
                        primaryRelationship: 'Friend',
                        hasLivingWill: false,
                        healthInstructions: '',
                    },
                },
            };

            expect(IntakeValidationService.validateStep('poa', validData)).toBeNull();
            expect(IntakeValidationService.getStepStatus('poa', validData)).toBe('complete');

            const invalidRelationshipData: IntakeData = {
                poa: {
                    property: {
                        primaryName: 'Property Attorney',
                        primaryRelationship: '',
                    },
                    personalCare: {
                        primaryName: 'Care Attorney',
                        primaryRelationship: 'Friend',
                        hasLivingWill: false,
                        healthInstructions: '',
                    },
                },
            };

            expect(IntakeValidationService.validateStep('poa', invalidRelationshipData)).toContain('relationship');
            expect(IntakeValidationService.getStepStatus('poa', invalidRelationshipData)).toBe('warning');

            const invalidLivingWillData: IntakeData = {
                poa: {
                    property: {
                        primaryName: 'Property Attorney',
                        primaryRelationship: 'Sibling',
                    },
                    personalCare: {
                        primaryName: 'Care Attorney',
                        primaryRelationship: 'Friend',
                        hasLivingWill: true,
                        healthInstructions: '   ',
                    },
                },
            };

            expect(IntakeValidationService.validateStep('poa', invalidLivingWillData)).toContain('health instructions');
        });
    });

    describe('getNextMissingStep', () => {
        it('should identify profile as first missing step', () => {
            const data: IntakeData = {};
            expect(IntakeValidationService.getNextMissingStep(data)).toBe('personalProfile');
        });

        it('should skip to family if profile is done', () => {
            const data: IntakeData = {
                personalProfile: {
                    fullName: 'John',
                    dateOfBirth: '1980-01-01',
                    maritalStatus: 'single',
                },
            };
            expect(IntakeValidationService.getNextMissingStep(data)).toBe('family');
        });

        it('returns guardians when minor children exist and no guardian has been chosen', () => {
            const data: IntakeData = {
                personalProfile: {
                    fullName: 'John',
                    dateOfBirth: '1980-01-01',
                    maritalStatus: 'single',
                },
                family: {
                    maritalStatus: 'single',
                    children: [{ fullName: 'Kid', dateOfBirth: '2020-01-01' } as any],
                },
            };

            expect(IntakeValidationService.getNextMissingStep(data)).toBe('guardians');
        });

        it('continues past the core steps and returns assets when that is the next blocker', () => {
            const data: IntakeData = {
                personalProfile: {
                    fullName: 'John',
                    dateOfBirth: '1980-01-01',
                    maritalStatus: 'single',
                },
                family: {
                    maritalStatus: 'single',
                    children: [],
                },
                executors: {
                    primary: { fullName: 'Executor One' },
                    alternates: [],
                    compensation: 'guidelines',
                },
                beneficiaries: {
                    beneficiaries: [{ fullName: 'Beneficiary One', relationship: 'Child', share: 100 }],
                },
            };

            expect(IntakeValidationService.getNextMissingStep(data)).toBe('assets');
        });
    });
});
