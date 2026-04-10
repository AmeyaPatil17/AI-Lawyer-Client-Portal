import { onUnmounted } from 'vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import type { IncorporationData } from '../stores/incorpTypes';

/**
 * Shared save composable for all incorporation wizard steps.
 *
 * Fixes X1: Prevents redundant save on mount by using an `initialized` guard.
 * Fixes X2: Cleans up saveTimeout on unmount to avoid orphan API calls.
 * Usage: call after hydrating localData in onMounted.
 */
export function useIncorpStepSave(
    getData: () => Partial<IncorporationData>,
    delay = 800
) {
    const store = useIncorpIntakeStore();
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let initialized = false;

    const stageStep = () => {
        const data = getData();
        store.stageIncorpStep(data);
        return data;
    };

    const scheduleSave = () => {
        if (!initialized) return; // X1: skip mount-triggered watch fire
        const data = stageStep();
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveTimeout = null;
            store.saveIncorpStep(data, false, { mode: 'background' }).catch(() => undefined);
        }, delay);
    };

    const commitStep = async (flush = false) => {
        if (!initialized) return;
        const data = stageStep();
        if (!flush) return;

        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }

        await store.saveIncorpStep(data);
    };

    const flushSave = async () => {
        await commitStep(true);
    };

    const markInitialized = () => {
        // Called at end of onMounted hydration — enables the watcher
        initialized = true;
    };

    onUnmounted(() => {
        // X2: Clean up pending save on navigate-away
        if (saveTimeout) clearTimeout(saveTimeout);
    });

    return { scheduleSave, markInitialized, commitStep, flushSave };
}
