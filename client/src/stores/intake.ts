import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';
import type { IntakeData } from '../types/intake';
import { useIntakeValidation } from '../composables/useIntakeValidation';
import { useToast } from '../composables/useToast';
import { hasMinorChildrenInFamily } from '../utils/family';

export const useIntakeStore = defineStore('intake', () => {
    // Full Intake Data
    const intakeData = ref<IntakeData>({});
    const currentIntakeId = ref<string | null>(localStorage.getItem('intakeId'));
    const dataVersion = ref<number | undefined>();
    const isLoading = ref(false);
    // Distinct flag for save operations only (isLoading covers both fetch + save).
    // WizardLayout watches isSaving to show the save indicator only on writes, not reads.
    const isSaving = ref(false);
    // S1: Reliable initialisation flag — avoids every step using Object.keys().length === 0
    const isInitialized = ref(false);

    // Wizard Step Persistence
    const currentStep = ref(localStorage.getItem('wizardStep') || 'profile');
    const setCurrentStep = (step: string) => {
        currentStep.value = step;
        localStorage.setItem('wizardStep', step);
    };

    // Validation Composable
    const { isStepComplete } = useIntakeValidation();

    // Intake Actions
    const setIntakeId = (id: string) => {
        currentIntakeId.value = id;
        localStorage.setItem('intakeId', id);
    };

    const resetDraftState = () => {
        intakeData.value = {};
        currentIntakeId.value = null;
        dataVersion.value = undefined;
        isLoading.value = false;
        isSaving.value = false;
        isInitialized.value = false;
        currentStep.value = 'profile';
        localStorage.removeItem('intakeId');
        localStorage.removeItem('wizardStep');
    };

    const fetchIntake = async () => {
        isLoading.value = true;
        try {
            const endpoint = currentIntakeId.value
                ? `/intake/${currentIntakeId.value}`
                : `/intake/current`;

            const response = await api.get(endpoint);

            if (response.data) {
                applyServerIntakeResponse(response.data);
            }
        } catch (error) {
            console.error('Fetch intake failed:', error);
        } finally {
            isLoading.value = false;
            isInitialized.value = true;
        }
    };

    // Safe external mutation (replaces direct store.intakeData = ... assignments)
    const setIntakeData = (data: IntakeData) => {
        intakeData.value = data;
    };

    const setDataVersion = (version?: number) => {
        dataVersion.value = version;
    };

    const applyServerIntakeResponse = (payload: any) => {
        if (!payload || typeof payload !== 'object') return;

        intakeData.value = payload.data || {};

        if (payload._id) {
            setIntakeId(payload._id);
        }

        const version = payload.expectedVersion ?? payload.__v;
        if (version !== undefined) {
            dataVersion.value = version;
        }
    };

    const stageIntakeStep = (stepData: Partial<IntakeData>, replace = false) => {
        intakeData.value = replace
            ? (stepData as IntakeData)
            : { ...intakeData.value, ...stepData };
    };

    /**
     * Persist a step's data to the server.
     *
     * @param stepData  The data to save. Normally a partial section update.
     * @param replace   When true (undo/redo path), `stepData` is the complete
     *                  intake snapshot and is sent as-is without merging into
     *                  the existing state. When false (default), `stepData` is
     *                  shallow-merged so only changed fields are transmitted.
     */
    const saveIntakeStep = async (stepData: Partial<IntakeData>, replace = false) => {
        if (!currentIntakeId.value) return;

        // Snapshot for rollback
        const previousState = JSON.parse(JSON.stringify(intakeData.value));

        isSaving.value = true;
        try {
            // Optimistic update — replace mode sets state wholesale; merge mode patches it
            stageIntakeStep(stepData, replace);

            const response = await api.put(`/intake/${currentIntakeId.value}`, {
                data: stepData,
                expectedVersion: dataVersion.value
            });

            const version = response.data.expectedVersion ?? response.data.__v;
            if (version !== undefined) {
                dataVersion.value = version;
            }
        } catch (error: any) {
            console.error('Save intake failed:', error);
            // Rollback UI to prevent perceived data loss
            intakeData.value = previousState;
            const { showToast } = useToast();
            if (error.response?.status === 409) {
                showToast('Data changed in another tab. Reloading...', 'error');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showToast('Failed to save changes. Connectivity issue?', 'error');
            }
            throw error;
        } finally {
            isSaving.value = false;
        }
    };

    // People Directory Getter
    const allPeople = computed(() => {
        const people: Array<{ id?: string; name: string; role: string; context: string }> = [];
        const data = intakeData.value;

        // 1. Profile (Self)
        if (data.personalProfile?.fullName) {
            people.push({
                id: data.personalProfile.id || 'self',
                name: data.personalProfile.fullName,
                role: 'Self',
                context: 'Profile'
            });
        }

        // 2. Spouse
        const spouseName = data.family?.spouseName;

        if (spouseName) {
            people.push({
                id: undefined,
                name: spouseName,
                role: 'Spouse',
                context: 'Family'
            });
        }

        // 3. Children
        if (data.family?.children && Array.isArray(data.family.children)) {
            data.family.children.forEach((child: any) => {
                if (child.fullName) {
                    people.push({
                        id: child.id,
                        name: child.fullName,
                        role: 'Child',
                        context: 'Family'
                    });
                }
            });
        }

        // 4. Executors
        const primaryExN = data.executors?.primary?.fullName;

        if (primaryExN) {
            people.push({
                id: undefined,
                name: primaryExN,
                role: 'Primary Executor',
                context: 'Executors'
            });
        }

        if (data.executors?.alternates && Array.isArray(data.executors.alternates)) {
            data.executors.alternates.forEach((alt: any) => {
                const name = alt.fullName;
                if (name) {
                    people.push({
                        id: undefined,
                        name: name,
                        role: 'Alternate Executor',
                        context: 'Executors'
                    });
                }
            });
        }

        // 5. Beneficiaries
        if (data.beneficiaries?.beneficiaries && Array.isArray(data.beneficiaries.beneficiaries)) {
            data.beneficiaries.beneficiaries.forEach((ben: any) => {
                const name = ben.fullName;
                if (name) {
                    people.push({
                        id: undefined,
                        name: name,
                        role: 'Beneficiary',
                        context: 'Beneficiaries'
                    });
                }
            });
        }

        // Deduplicate
        const unique = new Map();
        people.forEach(p => {
            const key = p.id || p.name;
            if (!unique.has(key)) {
                unique.set(key, p);
            }
        });

        return Array.from(unique.values());
    });

    // Computed: does the intake have any minor children?
    const hasMinorChildren = computed(() =>
        hasMinorChildrenInFamily(intakeData.value.family)
    );

    // Smart Routing Getter
    const nextStep = computed(() => {
        const d = intakeData.value;
        if (!d) return '/wizard/profile';

        if (!isStepComplete('personalProfile', d)) return '/wizard/profile';
        if (!isStepComplete('family', d)) return '/wizard/family';
        if (!isStepComplete('executors', d)) return '/wizard/executors';
        if (!isStepComplete('beneficiaries', d)) return '/wizard/beneficiaries';

        if (!isStepComplete('assets', d)) return '/wizard/assets';
        if (!isStepComplete('poa', d)) return '/wizard/poa';
        if (!d.funeral) return '/wizard/funeral';
        if (!d.priorWills) return '/wizard/prior-wills';

        return '/wizard/review';
    });

    return {
        intakeData,
        isLoading,
        isSaving,
        isInitialized,
        currentIntakeId,
        currentStep,
        dataVersion,
        allPeople,
        nextStep,
        hasMinorChildren,
        setIntakeId,
        setCurrentStep,
        resetDraftState,
        setIntakeData,
        setDataVersion,
        applyServerIntakeResponse,
        stageIntakeStep,
        fetchIntake,
        saveIntakeStep,
    };
});
