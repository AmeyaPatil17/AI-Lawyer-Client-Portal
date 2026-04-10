import { setActivePinia, createPinia } from 'pinia';
import { useTriageStore } from '../stores/triage';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock API
vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

describe('useTriageStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('initializes with default state', () => {
        const store = useTriageStore();
        expect(store.triageData).toEqual({
            ontarioResidency: null,
            maritalStatus: '',
            hasMinors: null,
            hasDisabledDependants: null,
            hasBusiness: null,
            hasForeignAssets: null
        });
    });

    it('updates triage data correctly', () => {
        const store = useTriageStore();
        store.setTriageAnswer('ontarioResidency', true);
        expect(store.triageData.ontarioResidency).toBe(true);

        store.setTriageAnswer('maritalStatus', 'single');
        expect(store.triageData.maritalStatus).toBe('single');
    });

});
