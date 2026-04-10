import { generateFlags } from '../services/rulesEngine';

describe('Rules Engine - Age Calculation Bug', () => {
    beforeEach(() => {
        // Set "Now" to Jan 2nd, 2026 to avoid timezone shifting back to 2025 (EST is -5)
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should correctly identify a 17-year-old born on Dec 31st as a minor', () => {
        // Born Dec 31, 2008. 
        // On Jan 1, 2026, they are 17 years and 1 day old. 
        // Year diff: 2026 - 2008 = 18.
        const dateOfBirth = '2008-12-31';

        const data = {
            family: {
                children: [{ fullName: 'Minor Child', dateOfBirth }]
            },
            guardians: { primary: null } // Missing guardian triggers the flag if minor detected
        };

        const flags = generateFlags(data);
        const guardianFlag = flags.find(f => f.code === 'MISSING_GUARDIAN');

        // This failing test proves the bug:
        // Current logic says (2026 - 2008) = 18, so < 18 is FALSE.
        // We EXPECT it to be TRUE because they haven't had their 18th birthday yet.
        expect(guardianFlag).toBeDefined();
        expect(guardianFlag?.message).toContain('Minor children detected');
    });
});
