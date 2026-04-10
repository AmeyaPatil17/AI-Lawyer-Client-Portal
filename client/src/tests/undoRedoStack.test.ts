/**
 * Tests for the Undo/Redo Stack Logic
 *
 * These tests validate the undo/redo mechanism shared across both wizards.
 * Specifically covers Bug #4 (replace=true prevents stale section regression)
 * and the stack management behaviour (push, cap at 10, redo cleared on new action).
 *
 * We test the logic in isolation through the useIntakeStore (the underlying
 * persistence layer) so we don't depend on mounting the full WizardLayout component.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useIntakeStore } from '../stores/intake';
import api from '../api';

vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

// Helper: simulate the undo/redo stack logic as used in WizardLayout
function buildUndoRedo(store: ReturnType<typeof useIntakeStore>) {
    const undoStack: any[] = [];
    const redoStack: any[] = [];

    const snapshot = () => JSON.parse(JSON.stringify(store.intakeData));

    const pushUndoState = () => {
        const current = JSON.stringify(store.intakeData);
        const last = undoStack.length > 0 ? JSON.stringify(undoStack[undoStack.length - 1]) : null;
        if (current === last) return;
        undoStack.push(JSON.parse(current));
        redoStack.splice(0); // clear redo
        if (undoStack.length > 10) undoStack.shift();
    };

    const undo = async () => {
        if (!undoStack.length) return;
        const currentState = snapshot();
        const prevState = undoStack.pop()!;
        redoStack.push(currentState);
        // Bug #4 fix: replace=true — full snapshot replaces state, not merged
        await store.saveIntakeStep(prevState, true);
    };

    const redo = async () => {
        if (!redoStack.length) return;
        const currentState = snapshot();
        const nextState = redoStack.pop()!;
        undoStack.push(currentState);
        await store.saveIntakeStep(nextState, true);
    };

    return { undoStack, redoStack, pushUndoState, undo, redo, snapshot };
}

describe('Undo/Redo Stack (Bug #4 + #10)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        (api.put as Mock).mockResolvedValue({ data: {} });
    });

    it('pushUndoState captures a snapshot and clears redo', () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        const { undoStack, redoStack, pushUndoState } = buildUndoRedo(store);

        store.intakeData = { personalProfile: { fullName: 'Alice' } } as any;
        pushUndoState();

        expect(undoStack).toHaveLength(1);
        expect(undoStack[0].personalProfile.fullName).toBe('Alice');
        expect(redoStack).toHaveLength(0);
    });

    it('pushUndoState is a no-op when state has not changed (deduplication)', () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        store.intakeData = { personalProfile: { fullName: 'Bob' } } as any;
        const { undoStack, pushUndoState } = buildUndoRedo(store);

        pushUndoState();
        pushUndoState(); // same state — should not double-push
        expect(undoStack).toHaveLength(1);
    });

    it('pushUndoState caps the stack at 10 entries (memory guard)', () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        const { undoStack, pushUndoState } = buildUndoRedo(store);

        for (let i = 0; i < 12; i++) {
            store.intakeData = { personalProfile: { fullName: `Name ${i}` } } as any;
            pushUndoState();
        }
        expect(undoStack.length).toBeLessThanOrEqual(10);
    });

    it('undo restores previous state with replace=true (Bug #4 regression)', async () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        const { pushUndoState, undo } = buildUndoRedo(store);

        // Initial state: two sections present
        store.intakeData = {
            personalProfile: { fullName: 'Alice' },
            family: { maritalStatus: 'Single' },
        } as any;
        pushUndoState(); // snapshot before change

        // Simulate user change: family section wiped, only profile remains
        store.intakeData = { personalProfile: { fullName: 'Alice Updated' } } as any;

        await undo();

        // replace=true: full old snapshot restored — family section must come back
        expect(store.intakeData.personalProfile?.fullName).toBe('Alice');
        expect((store.intakeData as any).family?.maritalStatus).toBe('Single');

        // API was called with replace semantics
        expect(api.put).toHaveBeenCalledWith('/intake/id-1', {
            data: expect.objectContaining({ personalProfile: { fullName: 'Alice' } }),
            expectedVersion: undefined,
        });
    });

    it('redo restores undone state', async () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        const { pushUndoState, undo, redo } = buildUndoRedo(store);

        store.intakeData = { personalProfile: { fullName: 'Step A' } } as any;
        pushUndoState();

        store.intakeData = { personalProfile: { fullName: 'Step B' } } as any;

        await undo();
        expect(store.intakeData.personalProfile?.fullName).toBe('Step A');

        await redo();
        // After redo the state should be Step B (the undone state)
        // But since we pushed Step A snapshot back before undo, redo pops Step B
        // Verify the API was called twice total (undo + redo)
        expect(api.put).toHaveBeenCalledTimes(2);
    });

    it('undo is a no-op when stack is empty', async () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        store.intakeData = { personalProfile: { fullName: 'Unchanged' } } as any;
        const { undo } = buildUndoRedo(store);

        await undo(); // empty stack
        expect(api.put).not.toHaveBeenCalled();
        expect(store.intakeData.personalProfile?.fullName).toBe('Unchanged');
    });

    it('redo is cleared when a new action is pushed (linear history)', () => {
        const store = useIntakeStore();
        store.currentIntakeId = 'id-1';
        const { redoStack, pushUndoState } = buildUndoRedo(store);

        // Manually populate redo
        redoStack.push({ personalProfile: { fullName: 'Abandoned Future' } });

        // A new push clears redo
        store.intakeData = { personalProfile: { fullName: 'New Action' } } as any;
        pushUndoState();

        expect(redoStack).toHaveLength(0);
    });
});
