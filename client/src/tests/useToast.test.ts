import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast } from '../composables/useToast';

describe('useToast composable (Issue #9)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        const { toasts } = useToast();
        toasts.value = [];
    });

    it('should add a toast to the reactive array when showToast is called', () => {
        const { toasts, showToast } = useToast();
        showToast('Test message', 'success');
        expect(toasts.value.length).toBe(1);
        expect(toasts.value[0].message).toBe('Test message');
        expect(toasts.value[0].type).toBe('success');
    });

    it('should support different toast types', () => {
        const { toasts, showToast } = useToast();
        showToast('Warning message', 'warning');
        expect(toasts.value[0].type).toBe('warning');

        showToast('Error message', 'error');
        expect(toasts.value[1].type).toBe('error');

        showToast('Info message', 'info');
        expect(toasts.value[2].type).toBe('info');
    });

    it('should auto-remove toast after timeout', () => {
        const { toasts, showToast } = useToast();
        showToast('Auto-dismiss', 'success', 3000);
        expect(toasts.value.length).toBe(1);

        // Advance timer past the duration
        vi.advanceTimersByTime(3500);
        expect(toasts.value.length).toBe(0);
    });

    it('should allow manual removal via removeToast', () => {
        const { toasts, showToast, removeToast } = useToast();
        showToast('Manual remove', 'info');
        const id = toasts.value[0].id;
        expect(toasts.value.length).toBe(1);

        removeToast(id);
        expect(toasts.value.length).toBe(0);
    });
});
