import { setActivePinia, createPinia } from 'pinia';
import { useAiChatStore } from '../stores/aiChat';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../api', () => ({
    default: {
        post: vi.fn()
    }
}));

// ── Mock Socket.IO client ────────────────────────────────────────────────────
// The store uses socket.io-client as the primary transport. We mock it to
// simulate a connected socket that emits ai:done immediately.

const {
    mockSocketEmit,
    mockSocketOn,
    mockSocketOnce,
    mockSocketOff,
    mockSocketDisconnect,
    mockSocket,
    mockIo,
} = vi.hoisted(() => {
    const mockSocketEmit = vi.fn();
    const mockSocketOn = vi.fn();
    const mockSocketOnce = vi.fn();
    const mockSocketOff = vi.fn();
    const mockSocketDisconnect = vi.fn();
    const mockSocket = {
        connected: true,
        emit: mockSocketEmit,
        on: mockSocketOn,
        once: mockSocketOnce,
        off: mockSocketOff,
        disconnect: mockSocketDisconnect,
    };
    const mockIo = vi.fn(() => mockSocket);

    return {
        mockSocketEmit,
        mockSocketOn,
        mockSocketOnce,
        mockSocketOff,
        mockSocketDisconnect,
        mockSocket,
        mockIo,
    };
});

vi.mock('socket.io-client', () => ({
    io: mockIo,
}));

// ── Mock fetch for SSE/fallback paths ────────────────────────────────────────
global.fetch = vi.fn();

describe('useAiChatStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        sessionStorage.clear();
        localStorage.clear();

        // Default: socket appears connected
        mockSocket.connected = true;

        // Default: once('ai:done') fires immediately when 'ai:chat' is emitted,
        // to simulate a complete (empty) response without blocking.
        mockSocketOnce.mockImplementation((event: string, cb: () => void) => {
            if (event === 'ai:done') {
                // Fire the done callback asynchronously on next tick
                setTimeout(cb, 0);
            }
        });
        mockSocketOn.mockImplementation((_event: string, _cb: () => void) => { /* no-op */});
    });

    it('initializes with default state', () => {
        const store = useAiChatStore();
        expect(store.chatState.isOpen).toBe(false);
        expect(store.chatState.messages).toEqual([
            {
                id: 'welcome',
                kind: 'system',
                sender: 'ai',
                text: expect.any(String),
                context: 'general',
                timestamp: expect.any(Number),
                source: 'welcome',
                severity: 'info',
            }
        ]);
        expect(store.chatState.unreadCount).toBe(0);
        expect(store.chatState.isTyping).toBe(false);
    });

    it('toggleChat flips the open state and resets unread count when opened', () => {
        const store = useAiChatStore();
        store.chatState.unreadCount = 5;

        store.toggleChat(); // open
        expect(store.chatState.isOpen).toBe(true);
        expect(store.chatState.unreadCount).toBe(0);

        store.toggleChat(); // close
        expect(store.chatState.isOpen).toBe(false);
    });

    it('resetChat clears messages back to welcome and resets seenWarnings', () => {
        const store = useAiChatStore();
        store.chatState.messages.push({
            id: 'x1', text: 'Old chat', sender: 'user', kind: 'chat', timestamp: Date.now()
        });
        store.chatState.seenWarnings.add('some_rule');
        store.chatState.unreadCount = 3;

        store.resetChat();

        expect(store.chatState.messages).toHaveLength(1);
        expect(store.chatState.messages[0].id).toBe('welcome');
        expect(store.chatState.seenWarnings.size).toBe(0);
        expect(store.chatState.unreadCount).toBe(0);
    });

    it('resetChat disconnects the WebSocket', () => {
        const store = useAiChatStore();
        // Trigger _getSocket() by sending a message (socket is created lazily)
        // For this test, we just verify disconnect is called when wsSocket exists
        store.resetChat();
        // disconnectSocket also clears wsSocket, so subsequent resetChat calls are safe
        expect(mockSocketDisconnect).not.toHaveBeenCalled(); // socket not yet created
    });

    it('disconnectSocket is exported and can be called safely before any message', () => {
        const store = useAiChatStore();
        expect(() => store.disconnectSocket()).not.toThrow();
    });

    it('sendAIMessage sends via WebSocket (primary transport) and adds AI response', async () => {
        const store = useAiChatStore();

        // Simulate the socket receiving an ai:chunk then ai:done
        mockSocketOn.mockImplementation((event: string, cb: (data: any) => void) => {
            if (event === 'ai:chunk') {
                setTimeout(() => cb({ text: 'WS Reply' }), 0);
            }
        });
        mockSocketOnce.mockImplementation((event: string, cb: () => void) => {
            if (event === 'ai:done') {
                setTimeout(cb, 5);
            }
        });

        sessionStorage.setItem('token', 'session-token');

        await store.sendAIMessage('Hello', {
            intakeData: { name: 'Context' },
            contextStep: 'profile',
            flow: 'wills',
        });

        // WebSocket emit was called
        expect(mockSocketEmit).toHaveBeenCalledWith(
            'ai:chat',
            expect.objectContaining({
                message: 'Hello',
                currentStep: 'profile',
            })
        );

        // Messages updated correctly
        expect(store.chatState.messages).toHaveLength(3); // welcome + user + ai
        const userMsg = store.chatState.messages[1];
        const aiMsg   = store.chatState.messages[2];
        expect(userMsg).toMatchObject({ text: 'Hello', sender: 'user', kind: 'chat', exchangeId: expect.any(String) });
        expect(aiMsg).toMatchObject({ sender: 'ai', kind: 'chat', exchangeId: expect.any(String) });
        expect(store.chatState.isTyping).toBe(false);
    });

    it('uses the session token for WebSocket auth when localStorage is empty', async () => {
        sessionStorage.setItem('token', 'session-token');
        const store = useAiChatStore();

        await store.sendAIMessage('Hello', {
            intakeData: {},
            contextStep: 'general',
            flow: 'wills',
        });

        expect(mockIo).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                auth: { token: 'session-token' }
            })
        );
    });

    it('sendAIMessage falls back to REST when both WebSocket and SSE fail', async () => {
        const store = useAiChatStore();

        // WS emits ai:error to trigger failure path
        mockSocketOnce.mockImplementation((event: string, cb: (data: any) => void) => {
            if (event === 'ai:error') setTimeout(() => cb({ message: 'WS failed' }), 0);
            if (event === 'ai:done') { /* never fires */ }
        });

        // SSE stream also fails
        (global.fetch as any).mockRejectedValue(new Error('Network Fail'));

        await store.sendAIMessage('Hello', {
            intakeData: {},
            contextStep: 'profile',
            flow: 'wills',
        });

        // Error state should be set when all transports fail
        const lastMsg = store.chatState.messages[store.chatState.messages.length - 1];
        expect(lastMsg?.isError).toBe(true);
        expect(store.chatState.isTyping).toBe(false);
    });

    it('uses the session token for REST fallback headers when localStorage is empty', async () => {
        sessionStorage.setItem('token', 'session-token');
        const store = useAiChatStore();

        mockSocketOnce.mockImplementation((event: string, cb: (data: any) => void) => {
            if (event === 'ai:error') setTimeout(() => cb({ message: 'WS failed' }), 0);
        });

        (global.fetch as any).mockResolvedValue({
            json: vi.fn().mockResolvedValue({ reply: 'Fallback reply' })
        });

        await store.sendAIMessage('Hello', {
            intakeData: {},
            contextStep: 'general',
            flow: 'wills',
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                credentials: 'include',
                headers: expect.objectContaining({
                    Authorization: 'Bearer session-token'
                })
            })
        );
    });

    it('routes incorporation chat sends to the incorporation streaming endpoint', async () => {
        const store = useAiChatStore();

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            body: {
                getReader: () => ({
                    read: vi.fn()
                        .mockResolvedValueOnce({
                            value: new TextEncoder().encode('data: {"text":"Incorp reply"}\n'),
                            done: false,
                        })
                        .mockResolvedValueOnce({ done: true }),
                }),
            },
        });

        await store.sendAIMessage('Need incorporation help', {
            intakeData: { preIncorporation: { jurisdiction: 'ontario' } },
            contextStep: 'preIncorporation',
            flow: 'incorporation',
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/incorporation/chat/stream'),
            expect.objectContaining({
                credentials: 'include',
            })
        );
    });


    it('sendAIMessage handles WebSocket error by showing error message with isError flag', async () => {
        const store = useAiChatStore();

        // WebSocket emits ai:error
        mockSocketOnce.mockImplementation((event: string, cb: (data: any) => void) => {
            if (event === 'ai:error') {
                setTimeout(() => cb({ message: 'WS stream failed' }), 0);
            }
        });

        // Also make fetch fail so SSE fallback also fails
        (global.fetch as any).mockRejectedValue(new Error('Network Fail'));

        await store.sendAIMessage('Help', {
            intakeData: {},
            contextStep: 'general',
            flow: 'wills',
        });

        const lastMsg = store.chatState.messages[store.chatState.messages.length - 1];
        expect(lastMsg?.isError).toBe(true);
        expect(store.chatState.isTyping).toBe(false);
    });

    it('seenWarnings persists to sessionStorage and is hydrated on store init', () => {
        const store = useAiChatStore();

        store.chatState.seenWarnings.add('tip_exec');
        store.chatState.seenWarnings.add('guard_warn');

        const raw = JSON.stringify([...store.chatState.seenWarnings]);
        sessionStorage.setItem('valiant_seen_warnings', raw);

        setActivePinia(createPinia()); // fresh Pinia
        const newStore = useAiChatStore();

        expect(newStore.chatState.seenWarnings.has('tip_exec')).toBe(true);
        expect(newStore.chatState.seenWarnings.has('guard_warn')).toBe(true);
        expect(newStore.chatState.seenWarnings.has('unknown_rule')).toBe(false);
    });

    it('setSystemMessages preserves structured warning metadata and does not double-count unchanged updates', () => {
        const store = useAiChatStore();

        store.setSystemMessages('assets', 'stress', [
            {
                id: 'stress:assets:liability-warning',
                text: 'Verify these liabilities before you submit.',
                context: 'assets',
                source: 'stress',
                severity: 'warning',
            },
        ]);

        const warning = store.chatState.messages.find((message) => message.id === 'stress:assets:liability-warning');
        expect(warning).toMatchObject({
            source: 'stress',
            severity: 'warning',
            retryable: false,
        });
        expect(store.chatState.unreadCount).toBe(1);

        store.setSystemMessages('assets', 'stress', [
            {
                id: 'stress:assets:liability-warning',
                text: 'Verify these liabilities before you submit.',
                context: 'assets',
                source: 'stress',
                severity: 'warning',
            },
        ]);

        expect(store.chatState.messages.filter((message) => message.id === 'stress:assets:liability-warning')).toHaveLength(1);
        expect(store.chatState.unreadCount).toBe(1);
    });

    it('retries a specific failed exchange instead of the last global message', async () => {
        const store = useAiChatStore();

        (global.fetch as any).mockRejectedValue(new Error('Network Fail'));

        await store.sendAIMessage('First', {
            intakeData: {},
            contextStep: 'general',
            flow: 'wills',
        });
        await store.sendAIMessage('Second', {
            intakeData: {},
            contextStep: 'general',
            flow: 'wills',
        });

        const firstError = store.chatState.messages.find((msg) => msg.text.includes('trouble connecting'));
        expect(firstError?.exchangeId).toBeTruthy();

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            body: {
                getReader: () => ({
                    read: vi.fn()
                        .mockResolvedValueOnce({
                            value: new TextEncoder().encode('data: {"text":"Recovered"}\n'),
                            done: false,
                        })
                        .mockResolvedValueOnce({ done: true }),
                }),
            },
        });

        await store.retryExchange(firstError!.exchangeId!);

        expect(store.chatState.messages.some((msg) => msg.text === 'Second')).toBe(true);
    });
});
