import { onUnmounted } from 'vue';
import { useIntakeStore } from '../stores/intake';
import type { IntakeData } from '../types/intake';

export function useWizardStepSave(
    getData: () => Partial<IntakeData>,
    delay = 800
) {
    const store = useIntakeStore();
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let initialized = false;
    let dirty = false;

    const stageStep = () => {
        const data = getData();
        store.stageIntakeStep(data);
        dirty = true;
        return data;
    };

    const scheduleSave = () => {
        if (!initialized) return;

        const data = stageStep();
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveTimeout = null;
            void store.saveIntakeStep(data).then(() => {
                dirty = false;
            }).catch(() => {
                // Toast/error handling lives in the store.
            });
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

        await store.saveIntakeStep(data);
        dirty = false;
    };

    const flushSave = async () => {
        await commitStep(true);
    };

    const hasPendingChanges = () => dirty || !!saveTimeout;

    const markInitialized = () => {
        initialized = true;
        dirty = false;
    };

    onUnmounted(() => {
        if (saveTimeout) clearTimeout(saveTimeout);
    });

    return {
        scheduleSave,
        commitStep,
        flushSave,
        hasPendingChanges,
        markInitialized,
    };
}
