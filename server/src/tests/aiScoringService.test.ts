import { calculatePriorityScore, generateAutoNote } from '../services/aiScoringService';

describe('aiScoringService', () => {
    describe('calculatePriorityScore', () => {
        it('should return 0 for empty intake data', () => {
            expect(calculatePriorityScore({})).toBe(0);
        });

        it('should add 30 for business assets', () => {
            const data = { assets: { list: [{ category: 'business' }] } };
            expect(calculatePriorityScore(data)).toBe(30);
        });

        it('should add 20 per real estate property (if > 1)', () => {
            const data = { assets: { list: [{ category: 'realEstate' }, { category: 'realEstate' }] } };
            // 2 properties = 2 * 20 = 40
            expect(calculatePriorityScore(data)).toBe(40);
        });

        it('should add 10 for investments', () => {
            const data = { assets: { investments: true } };
            expect(calculatePriorityScore(data)).toBe(10);
        });

        it('should add 15 for separated or divorced marital status', () => {
            const separatedData = { family: { maritalStatus: 'Separated' } };
            const divorcedData = { family: { maritalStatus: 'Divorced' } };
            expect(calculatePriorityScore(separatedData)).toBe(15);
            expect(calculatePriorityScore(divorcedData)).toBe(15);
        });

        it('should add 25 for blended families', () => {
            const data = { family: { children: [{ parentage: 'previous' }, { parentage: 'joint' }] } };
            expect(calculatePriorityScore(data)).toBe(25);
        });

        it('should add 40 for having a foreign will', () => {
            const data = { priorWills: { hasForeignWill: 'yes' } };
            expect(calculatePriorityScore(data)).toBe(40);
        });

        it('should sum all complexities and cap at 100', () => {
             const data = { 
                 assets: { 
                    list: [
                        { category: 'business' }, // +30
                        { category: 'realEstate' }, // +20
                        { category: 'realEstate' }, // +20
                        { category: 'realEstate' }  // +20
                    ],
                    investments: true // +10
                 },
                 priorWills: { hasForeignWill: 'yes' } // +40
             };
             // 30 + 60 + 10 + 40 = 140
             expect(calculatePriorityScore(data)).toBe(100);
        });
    });

    describe('generateAutoNote', () => {
        it('should return null if no changes', () => {
            expect(generateAutoNote({}, {})).toBeNull();
        });

        it('should generate note for beneficiary removal', () => {
            const oldData = { beneficiaries: { beneficiaries: [{}, {}] } };
            const newData = { beneficiaries: { beneficiaries: [{}] } };
            expect(generateAutoNote(oldData, newData)).toContain('removed a beneficiary');
        });

        it('should return null if beneficiary count stays same or increases', () => {
            const oldData = { beneficiaries: { beneficiaries: [{}] } };
            const newData = { beneficiaries: { beneficiaries: [{}, {}] } };
            expect(generateAutoNote(oldData, newData)).toBeNull();
        });

        it('should generate note for significant share changes in beneficiaries', () => {
            const oldData = { beneficiaries: { beneficiaries: [{ fullName: 'John Doe', share: 50 }] } };
            const newData = { beneficiaries: { beneficiaries: [{ fullName: 'John Doe', share: 20 }] } };
            expect(generateAutoNote(oldData, newData)).toContain('Significant changes to beneficiary shares');
        });

        it('should not generate note for minor share changes', () => {
            const oldData = { beneficiaries: { beneficiaries: [{ fullName: 'John Doe', share: 50 }] } };
            const newData = { beneficiaries: { beneficiaries: [{ fullName: 'John Doe', share: 40 }] } }; // 10% change
            expect(generateAutoNote(oldData, newData)).toBeNull();
        });

        it('should generate note for primary executor change', () => {
            const oldData = { executors: { primary: { fullName: 'John Doe' } } };
            const newData = { executors: { primary: { fullName: 'Jane Doe' } } };
            expect(generateAutoNote(oldData, newData)).toContain('Primary Executor changed from John Doe to Jane Doe');
        });

        it('should ignore executor change if one is empty', () => {
            const oldData = { executors: { primary: { fullName: 'John Doe' } } };
            const newData = { executors: { } };
            expect(generateAutoNote(oldData, newData)).toBeNull();
        });
    });
});
