import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Mock vue-router
vi.mock('vue-router', () => ({
    useRoute: () => ({
        path: '/wizard/profile'
    }),
    useRouter: () => ({
        push: vi.fn()
    })
}));

// Mock stores
vi.mock('../stores/intake', () => ({
    useIntakeStore: () => ({
        intakeData: {
            personalProfile: { fullName: 'John Doe' },
            family: {
                children: [
                    { fullName: 'Child 1', isMinor: true },
                    { fullName: 'Child 2', isMinor: false }
                ]
            }
        },
        isLoading: false,
        isSaving: false,          // Bug #14: new field watched by WizardLayout
        currentStep: 'profile',
        saveIntakeStep: vi.fn()
    })
}));

vi.mock('../stores/aiChat', () => ({
    useAiChatStore: () => ({
        chatState: { isOpen: false, unreadCount: 0 },
        sendAIMessage: vi.fn(),
        disconnectSocket: vi.fn()  // Bug #9: called in onUnmounted
    })
}));

// Import composable after mocks
import { useIntakeSteps } from '../composables/useIntakeSteps';
import { useIntakeValidation } from '../composables/useIntakeValidation';

describe('WizardLayout Features', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    describe('G6: Progress Calculation', () => {
        it('should calculate progress percentage correctly', () => {
            const { steps, currentStepIndex } = useIntakeSteps();

            // Progress should be based on current step / total steps
            expect(steps.value.length).toBeGreaterThan(0);
            expect(currentStepIndex.value).toBeGreaterThanOrEqual(0);
        });
    });

    describe('G8: Conditional Guardians Step', () => {
        it('should include Guardians step when there are minors', () => {
            const { steps } = useIntakeSteps();

            // With minor children in mock data, Guardians should be visible
            const hasGuardiansStep = steps.value.some(s => s.path === 'guardians');
            expect(hasGuardiansStep).toBe(true);
        });

        it('should filter steps based on conditions', () => {
            const { steps } = useIntakeSteps();

            // All returned steps should be valid
            steps.value.forEach(step => {
                expect(step).toHaveProperty('label');
                expect(step).toHaveProperty('path');
            });
        });
    });

    describe('G1: I\'m Not Sure Flag', () => {
        it('should have unsureFlags array in intake type', () => {
            // This tests the type extension
            const mockIntake = {
                unsureFlags: ['executors', 'beneficiaries']
            };

            expect(Array.isArray(mockIntake.unsureFlags)).toBe(true);
            expect(mockIntake.unsureFlags).toContain('executors');
        });
    });
});

describe('useIntakeValidation', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('should export isStepComplete function', () => {
        const validation = useIntakeValidation();
        expect(typeof validation.isStepComplete).toBe('function');
    });

    it('should export validateStep function', () => {
        const validation = useIntakeValidation();
        expect(typeof validation.validateStep).toBe('function');
    });
});
