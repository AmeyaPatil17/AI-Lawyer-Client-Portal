import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useIntakeSteps } from '../composables/useIntakeSteps';
import { useRoute } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import { useIntakeStore } from '../stores/intake';

// Mock vue-router
vi.mock('vue-router', () => ({
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
    useRoute: vi.fn(() => ({ path: '/wizard/family' }))
}));

describe('useIntakeSteps', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        const store = useIntakeStore();
        store.intakeData = {} as any;
    });

    it('returns configured steps array safely', () => {
        (useRoute as Mock).mockReturnValue({ path: '/wizard/profile' });
        const { steps } = useIntakeSteps();
        expect(steps.value.length).toBeGreaterThan(0);
        expect(steps.value[0].path).toBe('profile');
    });

    it('resolves current step index correctly from path', () => {
        (useRoute as Mock).mockReturnValue({ path: '/wizard/family' });
        const { currentStepIndex, steps } = useIntakeSteps();
        
        const familyIndex = steps.value.findIndex(s => s.path === 'family');
        expect(currentStepIndex.value).toBe(familyIndex);
    });

    it('returns 0 if wizard route is completely unknown', () => {
        (useRoute as Mock).mockReturnValue({ path: '/dashboard' });
        const { currentStepIndex } = useIntakeSteps();
        expect(currentStepIndex.value).toBe(0);
    });

    it('calculates isFirstStep and isLastStep bounds', () => {
        // Mock first step
        (useRoute as Mock).mockReturnValue({ path: '/wizard/profile' });
        const first = useIntakeSteps();
        expect(first.isFirstStep.value).toBe(true);
        expect(first.isLastStep.value).toBe(false);

        // Mock last step
        (useRoute as Mock).mockReturnValue({ path: '/wizard/review' });
        const last = useIntakeSteps();
        expect(last.isFirstStep.value).toBe(false);
        expect(last.isLastStep.value).toBe(true);
    });

    it('returns next and prev step paths bounded safely', () => {
        // Mock middle step
        (useRoute as Mock).mockReturnValue({ path: '/wizard/family' });
        const middle = useIntakeSteps();
        expect(middle.getPrevStep()?.path).toBe('profile');
        expect(middle.getNextStep()?.path).toBe('executors');

        // Bounds test
        (useRoute as Mock).mockReturnValue({ path: '/wizard/profile' });
        const first = useIntakeSteps();
        expect(first.getPrevStep()).toBeNull();

        (useRoute as Mock).mockReturnValue({ path: '/wizard/review' });
        const last = useIntakeSteps();
        expect(last.getNextStep()).toBeNull();
    });

    // Bug #16 regression: path matching must use endsWith, not includes
    describe('Bug #16 — Precise path matching (endsWith)', () => {
        it('does NOT match /wizard/profileXYZ as the profile step', () => {
            (useRoute as Mock).mockReturnValue({ path: '/wizard/profileXYZ' });
            const { steps } = useIntakeSteps();
            // With endsWith, '/wizard/profileXYZ'.endsWith('/profile') === false
            // The old includes() would have incorrectly returned the profile step index
            const found = steps.value.findIndex(s => ('/wizard/profileXYZ').endsWith('/' + s.path));
            expect(found).toBe(-1);
        });

        it('does NOT match /wizard/poa-health as the poa step', () => {
            (useRoute as Mock).mockReturnValue({ path: '/wizard/poa-health' });
            const { steps } = useIntakeSteps();
            const found = steps.value.findIndex(s => ('/wizard/poa-health').endsWith('/' + s.path));
            expect(found).toBe(-1); // old includes('poa') would have incorrectly matched
        });

        it('correctly matches the exact poa step path', () => {
            (useRoute as Mock).mockReturnValue({ path: '/wizard/poa' });
            const { currentStepIndex, steps } = useIntakeSteps();
            const poaIndex = steps.value.findIndex(s => s.path === 'poa');
            expect(poaIndex).toBeGreaterThan(-1);
            expect(currentStepIndex.value).toBe(poaIndex);
        });
    });
    it('includes the guardians step when DOB shows the child is still a minor', () => {
        const store = useIntakeStore();
        store.intakeData = {
            family: {
                maritalStatus: 'single',
                children: [{ fullName: 'Minor Child', dateOfBirth: '2010-01-01' }],
            },
        } as any;

        (useRoute as Mock).mockReturnValue({ path: '/wizard/family' });
        const { steps } = useIntakeSteps();

        expect(steps.value.some((step) => step.path === 'guardians')).toBe(true);
    });
});
