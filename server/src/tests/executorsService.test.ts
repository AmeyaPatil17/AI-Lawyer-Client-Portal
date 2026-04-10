import {
    getExecutorsValidationError,
    getSpouseExecutorCandidate,
    isExecutorsStepComplete,
    normalizeExecutors,
} from '../services/executorsService';

describe('executorsService', () => {
    it('normalizes legacy object references and strips client-only row keys', () => {
        const normalized = normalizeExecutors({
            primary: { fullName: { name: 'Legacy Primary' }, relationship: 'Spouse', uiKey: 'primary-ui' },
            alternates: [
                { id: 'alt-1', uiKey: 'alt-ui', fullName: { name: 'Legacy Alternate' }, relationship: 'Sibling' },
            ],
            decisionMode: 'majority',
            compensation: 'specific',
            compensationDetails: 'Flat fee',
        });

        expect(normalized).toEqual({
            primary: { fullName: 'Legacy Primary', relationship: 'Spouse' },
            alternates: [{ fullName: 'Legacy Alternate', relationship: 'Sibling' }],
            compensation: 'specific',
            compensationDetails: 'Flat fee',
        });
    });

    it('requires named alternates to include a relationship', () => {
        const data = {
            primary: { fullName: 'Executor One' },
            alternates: [{ fullName: 'Executor Two' }],
        };

        expect(getExecutorsValidationError(data)).toContain('relationship');
        expect(isExecutorsStepComplete(data)).toBe(false);
    });

    it('only exposes a spouse quick-fill candidate for partner statuses', () => {
        expect(getSpouseExecutorCandidate({
            maritalStatus: 'married',
            spouseName: { name: 'Jamie Doe' } as any,
        })).toBe('Jamie Doe');

        expect(getSpouseExecutorCandidate({
            maritalStatus: 'single',
            spouseName: 'Jamie Doe',
        })).toBeNull();
    });
});
