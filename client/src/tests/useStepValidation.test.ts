import { describe, it, expect, vi } from 'vitest';
import { useStepValidation, isRequired, isEmail } from '../composables/useStepValidation';
import { ref } from 'vue';

describe('useStepValidation', () => {
    describe('Rules', () => {
        it('isRequired returns message for empty values', () => {
            const rule = isRequired('Custom Msg');
            expect(rule('')).toBe('Custom Msg');
            expect(rule(null)).toBe('Custom Msg');
            expect(rule(undefined)).toBe('Custom Msg');
            expect(rule([])).toBe('Custom Msg');
            expect(rule('   ')).toBe('Custom Msg');
            expect(rule('valid')).toBe(true);
        });

        it('isEmail validates email structure', () => {
            const rule = isEmail('Bad Email');
            expect(rule('')).toBe(true); // empty is allowed by isEmail
            expect(rule('test')).toBe('Bad Email');
            expect(rule('test@test')).toBe('Bad Email');
            expect(rule('test@test.com')).toBe(true);
        });
    });

    describe('Composable', () => {
        it('validates field on blur and tracks touched state', () => {
            const formState = ref({ name: '' });
            const { touched, errors, validateField, handleBlur, hasError } = useStepValidation(formState, {
                name: [isRequired('Name needed')]
            });

            // Initially untouched, no error visible
            expect(!!hasError('name')).toBe(false);

            handleBlur('name');
            
            // Touched and validation failed
            expect(touched.value.name).toBe(true);
            expect(errors.value.name).toBe('Name needed');
            expect(hasError('name')).toBe(true);

            // Fix field
            formState.value.name = 'John';
            validateField('name');
            expect(errors.value.name).toBeUndefined();
            expect(!!hasError('name')).toBe(false);
        });

        it('validateAll runs all checks and returns boolean', () => {
            const formState = ref({ name: '', email: 'bad' });
            const { touched, errors, validateAll } = useStepValidation(formState, {
                name: [isRequired('Name needed')],
                email: [isEmail('Bad Email')]
            });

            // Mock scrollIntoView
            document.getElementById = vi.fn().mockReturnValue({ scrollIntoView: vi.fn() });

            const isValid = validateAll();

            expect(isValid).toBe(false);
            expect(touched.value.name).toBe(true);
            expect(touched.value.email).toBe(true);
            expect(errors.value.name).toBe('Name needed');
            expect(errors.value.email).toBe('Bad Email');
        });

        it('validateAll scrolls to the configured field target id when provided', () => {
            const formState = ref({ spouseName: '' });
            const scrollIntoView = vi.fn();
            document.getElementById = vi.fn().mockReturnValue({ scrollIntoView });

            const { validateAll } = useStepValidation(
                formState,
                { spouseName: [isRequired('Spouse needed')] },
                { spouseName: 'spouse-name' }
            );

            expect(validateAll()).toBe(false);
            expect(document.getElementById).toHaveBeenCalledWith('spouse-name');
            expect(scrollIntoView).toHaveBeenCalled();
        });

        it('clearError removes specific error', () => {
            const formState = ref({ name: '' });
            const { errors, handleBlur, clearError } = useStepValidation(formState, {
                name: [isRequired()]
            });

            handleBlur('name');
            expect(errors.value.name).toBeDefined();

            clearError('name');
            expect(errors.value.name).toBeUndefined();
        });
    });
});
