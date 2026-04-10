import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import api from '../api';

vi.mock('../api', () => ({
    default: {
        post: vi.fn()
    }
}));

describe('useAuthStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('initializes with default state from empty localStorage', () => {
        const store = useAuthStore();
        expect(store.isAuthenticated).toBe(false);
        expect(store.user).toBeNull();
        expect(store.token).toBeNull();
        expect(store.isLawyer).toBe(false);
        expect(store.userRole).toBeNull();
    });

    it('initializes correctly if localStorage has data', () => {
        localStorage.setItem('token', 'saved-token');
        localStorage.setItem('user', JSON.stringify({ role: 'lawyer', email: 'test@law.com' }));
        
        const store = useAuthStore();
        expect(store.isAuthenticated).toBe(true);
        expect(store.token).toBe('saved-token');
        expect(store.userRole).toBe('lawyer');
        expect(store.isLawyer).toBe(true);
    });

    it('login sets session on success (persistent=true → localStorage)', async () => {
        const store = useAuthStore();
        (api.post as unknown as any).mockResolvedValue({
            data: { token: 'new-token', user: { role: 'client', id: '1' } }
        });

        const success = await store.login({ email: 'a@a', password: 'pwd' }, true);

        expect(success).toBe(true);
        expect(store.isAuthenticated).toBe(true);
        expect(store.token).toBe('new-token');
        expect(localStorage.getItem('token')).toBe('new-token');
        expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ role: 'client', id: '1' });
        // Session-only storage should NOT have the token
        expect(sessionStorage.getItem('token')).toBeNull();
    });

    it('login stores to sessionStorage when persistent=false (Remember Me off)', async () => {
        const store = useAuthStore();
        (api.post as unknown as any).mockResolvedValue({
            data: { token: 'session-token', user: { role: 'client', id: '2' } }
        });

        await store.login({ email: 'b@b', password: 'pwd' }, false);

        expect(store.isAuthenticated).toBe(true);
        expect(store.token).toBe('session-token');
        // Should be in sessionStorage, NOT localStorage
        expect(sessionStorage.getItem('token')).toBe('session-token');
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('hydrates from sessionStorage when it contains a token (session-only login)', () => {
        sessionStorage.setItem('token', 'session-only-token');
        sessionStorage.setItem('user', JSON.stringify({ role: 'client', id: '3' }));

        setActivePinia(createPinia());
        const store = useAuthStore();

        expect(store.isAuthenticated).toBe(true);
        expect(store.token).toBe('session-only-token');
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('login propagates error on failure', async () => {
        const store = useAuthStore();
        (api.post as unknown as any).mockRejectedValue(new Error('Network error'));

        await expect(store.login({ email: 'a', password: 'b' })).rejects.toThrow('Network error');
        expect(store.isAuthenticated).toBe(false);
    });

    it('logout clears state and both localStorage and sessionStorage', () => {
        const store = useAuthStore();
        store.setSession('token', '', { role: 'client' });
        sessionStorage.setItem('token', 'session-token');
        sessionStorage.setItem('user', JSON.stringify({ role: 'client' }));
        localStorage.setItem('intakeId', '123');

        expect(store.isAuthenticated).toBe(true);

        store.logout();

        expect(store.isAuthenticated).toBe(false);
        expect(store.token).toBeNull();
        expect(store.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(localStorage.getItem('intakeId')).toBeNull();
        expect(sessionStorage.getItem('token')).toBeNull();
        expect(sessionStorage.getItem('user')).toBeNull();
    });
});

