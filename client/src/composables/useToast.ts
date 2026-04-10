import { ref } from 'vue';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
    duration: number;
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useToast() {
    const showToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
        const id = nextId++;
        toasts.value.push({ id, message, type, duration });

        // Auto-remove after duration
        setTimeout(() => {
            removeToast(id);
        }, duration);
    };

    const removeToast = (id: number) => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    };

    return {
        toasts,
        showToast,
        removeToast,
    };
}
