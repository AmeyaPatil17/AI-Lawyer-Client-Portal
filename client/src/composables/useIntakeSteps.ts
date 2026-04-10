
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useIntakeStore } from '../stores/intake';
import { hasMinorChildrenInFamily } from '../utils/family';

export interface WizardStep {
    label: string;
    path: string;
    context?: string; // Should match validation/rule contexts
    condition?: (data: any) => boolean; // Optional condition for visibility
}

// Base step definitions with conditions
const BASE_STEPS: WizardStep[] = [
    { label: 'Personal Profile', path: 'profile', context: 'personalProfile' },
    { label: 'Family & Dependants', path: 'family', context: 'family' },
    { label: 'Executors', path: 'executors', context: 'executors' },
    { label: 'Beneficiaries', path: 'beneficiaries', context: 'beneficiaries' },
    {
        label: 'Guardians',
        path: 'guardians',
        context: 'guardians',
        // WL1: Condition uses store data reactively — when Family is saved, the sidebar step
        // appears/disappears immediately without requiring a router-push from Family.vue
        condition: (data) => {
            return hasMinorChildrenInFamily(data?.family);
        }
    },
    { label: 'Assets', path: 'assets', context: 'assets' },
    { label: 'Power of Attorney', path: 'poa', context: 'poa' },
    { label: 'Funeral', path: 'funeral', context: 'funeral' },
    { label: 'Prior Wills', path: 'prior-wills', context: 'prior-wills' },
    { label: 'Review', path: 'review', context: 'review' }
];

export function useIntakeSteps() {
    const route = useRoute();
    const intakeStore = useIntakeStore();

    // Dynamic steps filtered by conditions — reactive because intakeStore.intakeData is reactive
    const steps = computed(() => {
        return BASE_STEPS.filter(step => {
            if (!step.condition) return true;
            return step.condition(intakeStore.intakeData);
        });
    });

    const currentStepIndex = computed(() => {
        const found = steps.value.findIndex(s => route.path.endsWith('/' + s.path));
        return found !== -1 ? found : 0;
    });

    const isFirstStep = computed(() => currentStepIndex.value <= 0);
    const isLastStep = computed(() => currentStepIndex.value >= steps.value.length - 1);
    const currentStep = computed(() => steps.value[currentStepIndex.value] || steps.value[0]);

    // Navigation Helpers
    const getNextStep = (): WizardStep | null => {
        if (isLastStep.value) return null;
        return steps.value[currentStepIndex.value + 1] || null;
    };

    const getPrevStep = (): WizardStep | null => {
        if (isFirstStep.value) return null;
        return steps.value[currentStepIndex.value - 1] || null;
    };

    // WL2: Dynamic "Next: X" label — child step buttons import this so they never hard-code step names
    const nextStepLabel = computed(() => {
        const next = getNextStep();
        if (!next) return 'Review & Submit';
        return `Next: ${next.label}`;
    });

    return {
        steps,
        currentStepIndex,
        currentStep,
        isFirstStep,
        isLastStep,
        getNextStep,
        getPrevStep,
        nextStepLabel,
    };
}
