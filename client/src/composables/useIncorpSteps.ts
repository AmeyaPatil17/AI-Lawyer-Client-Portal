import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import {
    INCORP_WIZARD_STEPS,
    type IncorpStepContext,
    type IncorpStepPath,
} from '../utils/incorpWizardSteps';

export interface IncorpWizardStep {
    label: string;
    path: IncorpStepPath;
    context: IncorpStepContext;
    condition?: (data: any) => boolean;
}

const BASE_STEPS: IncorpWizardStep[] = [...INCORP_WIZARD_STEPS];

export function useIncorpSteps() {
    const route = useRoute();
    const incorpStore = useIncorpIntakeStore();

    const steps = computed(() => {
        return BASE_STEPS.filter(step => {
            if (!step.condition) return true;
            return step.condition(incorpStore.incorpData);
        });
    });

    const currentStepIndex = computed(() => {
        const found = steps.value.findIndex(s => route.path.endsWith('/' + s.path));
        return found;
    });

    const isFirstStep = computed(() => currentStepIndex.value === 0);
    const isLastStep = computed(() =>
        currentStepIndex.value !== -1 && currentStepIndex.value >= steps.value.length - 1
    );
    const currentStep = computed<IncorpWizardStep | null>(() =>
        currentStepIndex.value === -1 ? null : (steps.value[currentStepIndex.value] || null)
    );

    const getNextStep = (): IncorpWizardStep | null => {
        if (currentStepIndex.value === -1 || isLastStep.value) return null;
        return steps.value[currentStepIndex.value + 1] || null;
    };

    const getPrevStep = (): IncorpWizardStep | null => {
        if (currentStepIndex.value === -1 || isFirstStep.value) return null;
        return steps.value[currentStepIndex.value - 1] || null;
    };

    return {
        steps,
        currentStepIndex,
        currentStep,
        isFirstStep,
        isLastStep,
        getNextStep,
        getPrevStep
    };
}
