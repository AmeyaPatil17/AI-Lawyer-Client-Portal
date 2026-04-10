import { generateIncorpFlags, validateIncorpLogic } from '../services/incorporationRulesEngine';
import type { IncorporationData } from '../schemas/incorporationSchema';

describe('incorporationRulesEngine', () => {
    describe('generateIncorpFlags', () => {
        it('should flag CBCA director residency violation (< 4 directors, no residents)', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'cbca' },
                structureOwnership: {
                    directors: [
                        { fullName: 'John', isCanadianResident: false },
                        { fullName: 'Jane', isCanadianResident: false },
                    ]
                }
            };
            const flags = generateIncorpFlags(data);
            const residencyFlag = flags.find(f => f.code === 'CBCA_DIRECTOR_RESIDENCY');
            expect(residencyFlag).toBeDefined();
            expect(residencyFlag?.type).toBe('hard');
        });

        it('should flag general residency violation (< 25%)', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'cbca' },
                structureOwnership: {
                    directors: [
                        { fullName: 'A', isCanadianResident: false },
                        { fullName: 'B', isCanadianResident: false },
                        { fullName: 'C', isCanadianResident: false },
                        { fullName: 'D', isCanadianResident: false },
                        { fullName: 'E', isCanadianResident: false },
                    ]
                }
            };
            const flags = generateIncorpFlags(data);
            const residencyFlag = flags.find(f => f.code === 'DIRECTOR_RESIDENCY_FAIL');
            expect(residencyFlag).toBeDefined();
            expect(residencyFlag?.type).toBe('hard');
        });

        it('should not apply the 25 percent residency flag to OBCA matters', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca' },
                structureOwnership: {
                    directors: [
                        { fullName: 'A', isCanadianResident: false },
                        { fullName: 'B', isCanadianResident: false },
                        { fullName: 'C', isCanadianResident: false },
                        { fullName: 'D', isCanadianResident: false },
                        { fullName: 'E', isCanadianResident: false },
                    ]
                }
            };

            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'DIRECTOR_RESIDENCY_FAIL')).toBeUndefined();
            expect(flags.find(f => f.code === 'CBCA_DIRECTOR_RESIDENCY')).toBeUndefined();
        });

        it('should NOT flag residency when 25%+ are resident', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'cbca' },
                structureOwnership: {
                    directors: [
                        { fullName: 'A', isCanadianResident: true },
                        { fullName: 'B', isCanadianResident: false },
                        { fullName: 'C', isCanadianResident: false },
                        { fullName: 'D', isCanadianResident: false },
                    ]
                }
            };
            const flags = generateIncorpFlags(data);
            const residencyFlags = flags.filter(f => f.code.includes('RESIDENCY'));
            expect(residencyFlags).toHaveLength(0);
        });

        it('should flag missing NUANS for named company', () => {
            const data: IncorporationData = {
                preIncorporation: { nameType: 'named', proposedName: 'Acme Corp' },
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'NUANS_MISSING')).toBeDefined();
        });

        it('should flag expired NUANS report (> 90 days)', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 100);
            const data: IncorporationData = {
                preIncorporation: {
                    nameType: 'named',
                    nuansReport: { reportDate: oldDate.toISOString() }
                },
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'NUANS_EXPIRED')).toBeDefined();
        });

        it('should NOT flag NUANS for numbered company', () => {
            const data: IncorporationData = {
                preIncorporation: { nameType: 'numbered' },
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'NUANS_MISSING')).toBeUndefined();
        });

        it('should flag missing legal ending for named company', () => {
            const data: IncorporationData = {
                preIncorporation: { nameType: 'named', proposedName: 'Acme' },
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'LEGAL_ENDING_MISSING')).toBeDefined();
        });

        it('should flag OBCA registered office not in Ontario', () => {
            const data: IncorporationData = {
                preIncorporation: { jurisdiction: 'obca' },
                structureOwnership: { registeredOfficeProvince: 'British Columbia' },
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'OBCA_OFFICE_NOT_ONTARIO')).toBeDefined();
        });

        it('should produce soft flag for USA not considered', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    initialShareholders: [
                        { fullName: 'A' },
                        { fullName: 'B' },
                    ],
                    requiresUSA: false,
                }
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'USA_NOT_CONSIDERED')).toBeDefined();
        });

        it('should produce soft flag for s.85 not assessed on property consideration', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    initialShareholders: [
                        { fullName: 'A', considerationType: 'property' },
                    ],
                    requiresS85Rollover: false,
                }
            };
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'S85_NOT_ASSESSED')).toBeDefined();
        });

        it('should produce soft flag for missing ISC register', () => {
            const data: IncorporationData = {};
            const flags = generateIncorpFlags(data);
            expect(flags.find(f => f.code === 'ISC_REGISTER_MISSING')).toBeDefined();
        });
    });

    describe('validateIncorpLogic', () => {
        it('should warn if shareholder references undefined share class', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common' }],
                    initialShareholders: [{ fullName: 'John', shareClass: 'Preferred' }],
                }
            };
            const warnings = validateIncorpLogic(data);
            expect(warnings.find(w => w.code === 'SHARE_CLASS_MISMATCH')).toBeDefined();
        });

        it('should warn on director count mismatch (fixed)', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    directors: [{ fullName: 'A' }],
                },
                articles: { directorCountType: 'fixed', directorCountFixed: 3 },
            };
            const warnings = validateIncorpLogic(data);
            expect(warnings.find(w => w.code === 'DIRECTOR_COUNT_MISMATCH')).toBeDefined();
        });

        it('should warn on director count out of range', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    directors: [{ fullName: 'A' }],
                },
                articles: { directorCountType: 'range', directorCountMin: 2, directorCountMax: 5 },
            };
            const warnings = validateIncorpLogic(data);
            expect(warnings.find(w => w.code === 'DIRECTOR_COUNT_OUT_OF_RANGE')).toBeDefined();
        });

        it('should return no warnings for clean data', () => {
            const data: IncorporationData = {
                structureOwnership: {
                    shareClasses: [{ className: 'Common' }],
                    initialShareholders: [{ fullName: 'A', shareClass: 'Common' }],
                    directors: [{ fullName: 'A' }, { fullName: 'B' }],
                },
                articles: { directorCountType: 'fixed', directorCountFixed: 2 },
            };
            const warnings = validateIncorpLogic(data);
            const criticalWarnings = warnings.filter(w => w.severity === 'warning');
            expect(criticalWarnings).toHaveLength(0);
        });
    });
});
