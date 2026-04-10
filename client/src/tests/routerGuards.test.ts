import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('vue-router', async () => {
    const actual = await vi.importActual('vue-router') as any;
    const mockRouter = {
        beforeEach: function(cb: any) { (this as any)._guard = cb; },
        afterEach: vi.fn(), // needed since router/index.ts uses afterEach for document.title
        push: vi.fn()
    };
    return {
        ...actual,
        createRouter: vi.fn(() => mockRouter),
        createWebHistory: vi.fn()
    };
});

import router from '../router/index';

describe('Router global before guard (Issue #8 checks)', () => {
    let toMock: any;
    let fromMock: any;
    let nextMock: any;

    beforeEach(() => {
        localStorage.clear();
        nextMock = vi.fn();
        fromMock = { path: '/' };
    });

    const setAuth = (token: string, role: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ id: '1', role }));
    };

    const runGuard = async (to: any) => {
        const guardOption = (router as any)._guard;
        if (guardOption) {
            await guardOption(to, fromMock, nextMock);
        } else {
            throw new Error('Guard hook not found');
        }
    };

    it('allows access to public routes without auth', async () => {
        toMock = { path: '/', meta: { isPublic: true } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith(); // Called with no args = proceed
    });

    it('redirects unauthenticated users to /login if route requires auth', async () => {
        toMock = { path: '/dashboard', fullPath: '/dashboard', meta: { requiresAuth: true } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith('/login');
        expect(localStorage.getItem('redirectAfterLogin')).toBe('/dashboard');
    });

    it('redirects authenticated /login attempts to /lawyer dashboard if lawyer', async () => {
        setAuth('valid-token', 'lawyer');
        toMock = { path: '/login', meta: { isPublic: true } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith('/lawyer');
    });

    it('redirects authenticated /login attempts to /dashboard if client', async () => {
        setAuth('valid-token', 'client');
        toMock = { path: '/login', meta: { isPublic: true } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith('/dashboard');
    });

    it('blocks clients from accessing lawyer-only routes', async () => {
        setAuth('valid-token', 'client');
        toMock = { path: '/lawyer', meta: { requiresAuth: true, requiresRole: ['lawyer', 'admin'] } };
        await runGuard(toMock);
        // Should redirect to appropriate fallback
        expect(nextMock).toHaveBeenCalledWith('/dashboard');
    });

    it('allows lawyers to access lawyer routes', async () => {
        setAuth('valid-token', 'lawyer');
        toMock = { path: '/lawyer', meta: { requiresAuth: true, requiresRole: ['lawyer', 'admin'] } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith(); // proceed
    });

    // ── Regression: "Remember Me" unchecked stores to sessionStorage ─────────

    const setSessionAuth = (token: string, role: string) => {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify({ id: '1', role }));
    };

    it('redirects sessionStorage-only lawyer from /login to /lawyer', async () => {
        sessionStorage.clear();
        localStorage.clear();
        setSessionAuth('session-token', 'lawyer');
        toMock = { path: '/login', meta: { isPublic: true } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith('/lawyer');
    });

    it('allows sessionStorage-only auth to access protected routes', async () => {
        sessionStorage.clear();
        localStorage.clear();
        setSessionAuth('session-token', 'client');
        toMock = { path: '/dashboard', fullPath: '/dashboard', meta: { requiresAuth: true, requiresRole: ['client'] } };
        await runGuard(toMock);
        expect(nextMock).toHaveBeenCalledWith(); // proceed, not redirect to /login
    });
});
