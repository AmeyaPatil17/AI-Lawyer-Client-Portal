import { ref } from 'vue';

export type ValidationRule = (value: any) => string | true;
export type Rules = Record<string, ValidationRule[]>;

// Common Rules
export const isRequired = (message = 'This field is required') => (val: any) => {
    if (val === null || val === undefined || val === '') return message;
    if (typeof val === 'string' && val.trim() === '') return message;
    if (Array.isArray(val) && val.length === 0) return message;
    return true;
};

/** Validates that a date string is not in the future */
export const isNotFutureDate = (message = 'Date cannot be in the future') => (val: any) => {
    if (!val) return true; // empty handled by isRequired
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'Invalid date format';
    const today = new Date();
    today.setHours(23, 59, 59, 999); // end of today
    if (d > today) return message;
    return true;
};

/** Validates that a DOB results in a reasonable adult age (18–120) for the will creator */
export const isReasonableAge = (message = 'Please enter a valid date of birth') => (val: any) => {
    if (!val) return true;
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'Invalid date format';
    const ageMs = Date.now() - d.getTime();
    const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) return 'You must be at least 18 years old to create a will in Ontario';
    if (age > 120) return message;
    return true;
};

/**
 * Cross-field rule: validates that this date comes AFTER another date.
 * @param getOtherDate – a getter that returns the comparison date string
 * @param message      – error to display when validation fails
 */
export const isAfterDate = (getOtherDate: () => string, message: string) => (val: any) => {
    if (!val) return true;
    const other = getOtherDate();
    if (!other) return true;
    const dThis = new Date(val);
    const dOther = new Date(other);
    if (isNaN(dThis.getTime()) || isNaN(dOther.getTime())) return true;
    if (dThis <= dOther) return message;
    return true;
};

export const isEmail = (message = 'Invalid email address') => (val: any) => {
    if (!val) return true; // Empty is valid (use isRequired if needed)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(val)) || message;
};

export function useStepValidation<T extends Record<string, any>>(
    formState: any,
    rules: Rules,
    fieldTargets: Record<string, string> = {}
) {
    // Errors state
    const errors = ref<Record<string, string>>({});

    // Track touched fields to avoid showing errors before interaction
    const touched = ref<Record<string, boolean>>({});

    // Validate a single field
    const validateField = (field: string) => {
        const fieldRules = rules[field];
        if (!fieldRules) return true;

        const value = formState.value[field]; // Access ref value

        for (const rule of fieldRules) {
            const result = rule(value);
            if (result !== true) {
                errors.value[field] = result;
                return false;
            }
        }

        // If we get here, valid
        if (errors.value[field]) {
            delete errors.value[field];
        }
        return true;
    };

    // Handler for blur events
    const handleBlur = (field: string) => {
        touched.value[field] = true;
        validateField(field);
    };

    // Validate all fields (e.g. on submit)
    const validateAll = (): boolean => {
        let isValid = true;

        for (const field of Object.keys(rules)) {
            touched.value[field] = true;
            if (!validateField(field)) {
                isValid = false;
            }
        }

        // Scroll to first error?
        if (!isValid) {
            const firstErrorField = Object.keys(errors.value)[0];
            const targetId = fieldTargets[firstErrorField] || firstErrorField;
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return isValid;
    };

    // Clear specific error
    const clearError = (field: string) => {
        if (errors.value[field]) {
            delete errors.value[field];
        }
    };

    // Check if a field has an error to display
    const hasError = (field: string) => {
        return touched.value[field] && !!errors.value[field];
    };

    return {
        errors,
        touched,
        validateField,
        validateAll,
        handleBlur,
        hasError,
        clearError
    };
}
