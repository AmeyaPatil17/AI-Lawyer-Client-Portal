export interface ValidationStrategy<T> {
    validate: (data: T) => string | null;
    isComplete: (data: T) => boolean;
}

export type StepStatus = 'complete' | 'warning' | 'pending';

export function createValidationComposable<T>(strategies: Record<string, ValidationStrategy<T>>) {
    
    const validateStep = (context: string, data: T): string | null => {
        const strategy = strategies[context];
        if (strategy) {
            return strategy.validate(data);
        }
        return null;
    };

    const isStepComplete = (context: string, data: T): boolean => {
        const strategy = strategies[context];
        if (strategy) {
            return strategy.isComplete(data);
        }
        // Fallback for unknown steps: if data object has the context key, assume true
        return !!(data as any)[context];
    };

    const getStepStatus = (context: string, data: T): StepStatus => {
        if (!context || context === 'review') return 'pending';
        
        // 1. Check Completeness
        if (isStepComplete(context, data)) {
            // Even if complete, is there a validation warning? 
            const error = validateStep(context, data);
            if (error) return 'warning';
            return 'complete';
        }

        // 2. Check if Started (Data exists but incomplete)
        if ((data as any)[context]) {
            const error = validateStep(context, data);
            if (error) return 'warning'; 
            return 'pending'; 
        }

        return 'pending';
    };

    return {
        validateStep,
        isStepComplete,
        getStepStatus
    };
}
