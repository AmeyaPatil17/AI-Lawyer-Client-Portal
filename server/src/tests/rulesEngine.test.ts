import { generateFlags, validateLogic } from '../services/rulesEngine';

describe('Rules Engine', () => {
    describe('generateFlags', () => {
        it('should flag non-residents with a hard flag', () => {
            const data = {
                triage: { ontarioResidency: false }
            };
            const flags = generateFlags(data);
            const residencyFlag = flags.find(f => f.code === 'RESIDENCY_FAIL');

            expect(residencyFlag).toBeDefined();
            expect(residencyFlag?.type).toBe('hard');
        });

        it('should hard flag minors without guardians', () => {
            // Mock data where a child is < 18 (e.g., born last year)
            const lastYear = new Date().getFullYear() - 1;
            const data = {
                family: {
                    children: [{ fullName: 'Baby Doe', dateOfBirth: `${lastYear}-01-01` }]
                },
                guardians: { primary: null } // Explicitly missing
            };

            const flags = generateFlags(data);
            const guardianFlag = flags.find(f => f.code === 'MISSING_GUARDIAN');

            expect(guardianFlag).toBeDefined();
            expect(guardianFlag?.type).toBe('hard');
        });

        it('should soft flag spouse omission', () => {
            const data = {
                family: { maritalStatus: 'married', spouseName: 'Jane Doe' },
                beneficiaries: { beneficiaries: [] }
            };
            const flags = generateFlags(data);
            const spouseFlag = flags.find(f => f.code === 'SPOUSAL_OMISSION');

            expect(spouseFlag).toBeDefined();
            expect(spouseFlag?.type).toBe('soft');
        });
    });

    describe('validateLogic', () => {
        it('should warn if children are not beneficiaries', () => {
            const data = {
                family: {
                    children: [{ fullName: 'Forgotten Child' }]
                },
                beneficiaries: {
                    beneficiaries: [{ fullName: 'Favorite Child' }]
                }
            };

            const warnings = validateLogic(data);
            const disinheritanceWarning = warnings.find(w => w.code === 'POSSIBLE_DISINHERITANCE');

            expect(disinheritanceWarning).toBeDefined();
            expect(disinheritanceWarning?.severity).toBe('warning');
            expect(disinheritanceWarning?.message).toContain('Forgotten Child');
        });

        it('should warn about executor capability with business assets', () => {
            const data = {
                assets: { business: true },
                executors: {
                    primary: { relationship: 'Spouse' }
                }
            };

            const warnings = validateLogic(data);
            const executorWarning = warnings.find(w => w.code === 'EXECUTOR_CAPABILITY');

            expect(executorWarning).toBeDefined();
            expect(executorWarning?.severity).toBe('info');
        });
    });

    describe('generateFlags (Additional)', () => {
        it('should soft flag foreign assets', () => {
            const data = { assets: { foreignAssets: true } };
            const flags = generateFlags(data);
            expect(flags.some(f => f.code === 'FOREIGN_ASSETS')).toBe(true);
        });

        it('should soft flag foreign assets from the canonical asset list', () => {
            const data = {
                assets: {
                    list: [{ type: 'Other', category: 'foreignAssets', description: 'Florida condo' }]
                }
            };
            const flags = generateFlags(data);
            expect(flags.some(f => f.code === 'FOREIGN_ASSETS')).toBe(true);
        });

        it('should soft flag business assets', () => {
            const data = { assets: { business: true } };
            const flags = generateFlags(data);
            expect(flags.some(f => f.code === 'BUSINESS_ASSETS')).toBe(true);
        });

        it('should soft flag business assets from the canonical asset list', () => {
            const data = {
                assets: {
                    list: [{ type: 'Business', category: 'business', description: 'Holdco shares' }]
                }
            };
            const flags = generateFlags(data);
            expect(flags.some(f => f.code === 'BUSINESS_ASSETS')).toBe(true);
        });
    });
});
