import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';
import type { IncorporationData } from './incorpTypes';
import { useToast } from '../composables/useToast';
import {
    cloneIncorpData,
    mergeIncorpData,
    normalizeIncorpData,
} from '../utils/incorpData';
import {
    isIncorpSectionComplete,
    type IncorpValidationContext,
} from '../utils/incorpRules';
import {
    DEFAULT_INCORP_STEP,
    INCORP_FLOW_STEPS,
    getIncorpStepIndex,
    isValidIncorpStepPath,
    type IncorpStepPath,
} from '../utils/incorpWizardSteps';

type IntakeFlag = {
    type?: 'hard' | 'soft';
    message: string;
    code: string;
};

type LogicWarning = {
    code: string;
    message: string;
    severity?: 'warning' | 'info';
};

type IncorpStatus = 'started' | 'submitted' | 'reviewing' | 'completed' | null;
type MatterSelection = 'current' | 'explicit';
type SaveRequestMode = 'background' | 'explicit';
type StoreErrorKind = 'validation' | 'conflict' | 'network' | 'server' | 'unknown';

type StoreErrorState = {
    kind: StoreErrorKind;
    status: number;
    message: string;
};

type SaveErrorState = StoreErrorState & {
    mode: SaveRequestMode;
};

type CreateIncorpIntakeResult = {
    intake: any;
    wasResumed: boolean;
};

type SetIncorpIdOptions = {
    selection?: MatterSelection;
};

type SaveIncorpStepOptions = {
    mode?: SaveRequestMode;
};

const STEP_CONTEXT_TO_ROUTE: Array<{
    context: IncorpValidationContext;
    route: IncorpStepPath;
}> = INCORP_FLOW_STEPS.map((step) => ({
    context: step.context,
    route: step.path,
}));

const getErrorStatus = (error: unknown) =>
    Number((error as any)?.response?.status ?? 0);

const getErrorMessage = (error: unknown, fallback: string) =>
    String((error as any)?.response?.data?.message || fallback);

const classifyStoreError = (error: unknown, fallback: string): StoreErrorState => {
    const status = getErrorStatus(error);

    if (status === 400) {
        return {
            kind: 'validation',
            status,
            message: getErrorMessage(error, fallback),
        };
    }

    if (status === 409) {
        return {
            kind: 'conflict',
            status,
            message: getErrorMessage(error, fallback),
        };
    }

    if (status >= 500) {
        return {
            kind: 'server',
            status,
            message: getErrorMessage(error, fallback),
        };
    }

    if (status > 0) {
        return {
            kind: 'unknown',
            status,
            message: getErrorMessage(error, fallback),
        };
    }

    return {
        kind: 'network',
        status: 0,
        message: fallback,
    };
};

const getUserScope = () => {
    const rawUser = sessionStorage.getItem('user') ?? localStorage.getItem('user');
    if (!rawUser) return 'anonymous';

    try {
        const parsed = JSON.parse(rawUser);
        return String(parsed?.id ?? parsed?._id ?? parsed?.email ?? 'anonymous');
    } catch {
        return 'anonymous';
    }
};

const getCurrentMatterKey = () => `incorpCurrentMatterId:${getUserScope()}`;
const getExplicitMatterKey = () => `incorpExplicitMatterId:${getUserScope()}`;
const getStepKey = (matterId: string) => `incorpWizardStep:${getUserScope()}:${matterId}`;
const LEGACY_CURRENT_ID_KEY = 'incorpIntakeId';
const LEGACY_STEP_KEY = 'incorpWizardStep';

const readPersistedCurrentMatterId = () => localStorage.getItem(getCurrentMatterKey());
const readPersistedExplicitMatterId = () => sessionStorage.getItem(getExplicitMatterKey());
const readPersistedStep = (matterId: string | null) =>
    matterId ? localStorage.getItem(getStepKey(matterId)) : null;

const getFirstIncompleteRoute = (data: IncorporationData): IncorpStepPath =>
    STEP_CONTEXT_TO_ROUTE.find(({ context }) => !isIncorpSectionComplete(context, data))?.route || 'review';

export const useIncorpIntakeStore = defineStore('incorpIntake', () => {
    const incorpData = ref<IncorporationData>(normalizeIncorpData({}));
    const currentIncorpId = ref<string | null>(
        readPersistedExplicitMatterId() || readPersistedCurrentMatterId()
    );
    const currentStatus = ref<IncorpStatus>(null);
    const currentVersion = ref<number | undefined>(undefined);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const hasLoaded = ref(false);
    const intakeFlags = ref<IntakeFlag[]>([]);
    const logicWarnings = ref<LogicWarning[]>([]);
    const lastLoadError = ref<StoreErrorState | null>(null);
    const lastSaveError = ref<SaveErrorState | null>(null);

    let loadPromise: Promise<any> | null = null;
    let saveChain: Promise<void> = Promise.resolve();
    let activeDraftVersion = 0;

    const currentStep = ref<IncorpStepPath>(
        (readPersistedStep(currentIncorpId.value) as IncorpStepPath | null) || DEFAULT_INCORP_STEP
    );

    const persistCurrentMatterId = (id: string) => {
        localStorage.setItem(getCurrentMatterKey(), id);
        localStorage.setItem(LEGACY_CURRENT_ID_KEY, id);
        sessionStorage.removeItem(getExplicitMatterKey());
    };

    const persistExplicitMatterId = (id: string) => {
        sessionStorage.setItem(getExplicitMatterKey(), id);
        localStorage.setItem(LEGACY_CURRENT_ID_KEY, id);
    };

    const clearPersistedMatterIds = () => {
        localStorage.removeItem(getCurrentMatterKey());
        localStorage.removeItem(LEGACY_CURRENT_ID_KEY);
        sessionStorage.removeItem(getExplicitMatterKey());
    };

    const syncCurrentStepForMatter = (matterId: string | null) => {
        const storedStep = readPersistedStep(matterId);
        currentStep.value = storedStep && isValidIncorpStepPath(storedStep)
            ? storedStep
            : DEFAULT_INCORP_STEP;
        localStorage.setItem(LEGACY_STEP_KEY, currentStep.value);
    };

    const setCurrentStep = (step: string) => {
        currentStep.value = isValidIncorpStepPath(step) ? step : DEFAULT_INCORP_STEP;
        localStorage.setItem(LEGACY_STEP_KEY, currentStep.value);
        if (currentIncorpId.value) {
            localStorage.setItem(getStepKey(currentIncorpId.value), currentStep.value);
        }
    };

    const setIncorpId = (id: string, options: SetIncorpIdOptions = {}) => {
        const previousId = currentIncorpId.value;
        currentIncorpId.value = id;

        if (options.selection === 'current') {
            persistCurrentMatterId(id);
        } else {
            persistExplicitMatterId(id);
        }

        if (previousId !== id) {
            syncCurrentStepForMatter(id);
        }
    };

    const clearIncorpSelection = () => {
        currentIncorpId.value = null;
        clearPersistedMatterIds();
        currentStep.value = DEFAULT_INCORP_STEP;
        localStorage.removeItem(LEGACY_STEP_KEY);
    };

    const syncMetadata = (payload: any, options: { clearOnMissing?: boolean } = {}) => {
        if (Array.isArray(payload?.flags)) {
            intakeFlags.value = payload.flags;
        } else if (options.clearOnMissing) {
            intakeFlags.value = [];
        }

        if (Array.isArray(payload?.logicWarnings)) {
            logicWarnings.value = payload.logicWarnings;
        } else if (options.clearOnMissing) {
            logicWarnings.value = [];
        }
    };

    const syncVersion = (payload: any) => {
        const version = payload?.expectedVersion ?? payload?.__v;
        if (version !== undefined) {
            currentVersion.value = Number(version);
        }
    };

    const syncMatterPayload = (
        payload: any,
        options: { selection?: MatterSelection } = {}
    ) => {
        currentStatus.value = payload?.status || null;
        incorpData.value = normalizeIncorpData(payload?.data || {});
        syncVersion(payload);
        syncMetadata(payload, { clearOnMissing: true });

        if (payload?._id) {
            setIncorpId(payload._id, { selection: options.selection ?? 'current' });
        } else {
            clearIncorpSelection();
        }

        lastLoadError.value = null;
        hasLoaded.value = true;
    };

    const clearLoadedMatter = () => {
        incorpData.value = normalizeIncorpData({});
        currentStatus.value = null;
        currentVersion.value = undefined;
        intakeFlags.value = [];
        logicWarnings.value = [];
        clearIncorpSelection();
    };

    const resetDraftState = () => {
        clearLoadedMatter();
        isLoading.value = false;
        isSaving.value = false;
        hasLoaded.value = false;
        lastLoadError.value = null;
        lastSaveError.value = null;
        loadPromise = null;
        saveChain = Promise.resolve();
        activeDraftVersion = 0;
    };

    const stageIncorpStep = (stepData: Partial<IncorporationData>, replace = false) => {
        activeDraftVersion += 1;
        incorpData.value = replace
            ? cloneIncorpData(stepData)
            : mergeIncorpData(incorpData.value, stepData);
    };

    const getCurrentMatter = async () => {
        const response = await api.get('/incorporation/current');
        return response.data;
    };

    const getMatterById = async (id: string) => {
        const response = await api.get(`/incorporation/${id}`);
        return response.data;
    };

    const loadCurrentIncorpMatter = async (force = false) => {
        if (loadPromise && !force) {
            return loadPromise;
        }

        if (loadPromise && force) {
            await loadPromise.catch(() => undefined);
        }

        loadPromise = (async () => {
            isLoading.value = true;
            lastLoadError.value = null;

            try {
                const explicitMatterId = readPersistedExplicitMatterId();

                if (explicitMatterId) {
                    try {
                        const explicitPayload = await getMatterById(explicitMatterId);
                        syncMatterPayload(explicitPayload, { selection: 'explicit' });
                        return explicitPayload;
                    } catch (error) {
                        const status = getErrorStatus(error);
                        if (status !== 404) {
                            throw error;
                        }
                        sessionStorage.removeItem(getExplicitMatterKey());
                    }
                }

                const currentPayload = await getCurrentMatter();
                if (currentPayload) {
                    syncMatterPayload(currentPayload, { selection: 'current' });
                    return currentPayload;
                }

                clearLoadedMatter();
                hasLoaded.value = true;
                lastLoadError.value = null;
                return null;
            } catch (error) {
                if (getErrorStatus(error) === 404) {
                    clearLoadedMatter();
                    hasLoaded.value = true;
                    lastLoadError.value = null;
                    return null;
                }

                clearLoadedMatter();
                hasLoaded.value = false;
                lastLoadError.value = classifyStoreError(
                    error,
                    'Unable to load your incorporation matter.'
                );
                throw error;
            } finally {
                isLoading.value = false;
                loadPromise = null;
            }
        })();

        return loadPromise;
    };

    const fetchIncorpIntake = async (force = false) => loadCurrentIncorpMatter(force);

    const ensureLoaded = async (force = false) => {
        if (hasLoaded.value && !force) {
            return;
        }

        await loadCurrentIncorpMatter(force);
    };

    const createIncorpIntake = async (
        initialData: Partial<IncorporationData> = {}
    ): Promise<CreateIncorpIntakeResult> => {
        isLoading.value = true;
        lastLoadError.value = null;

        try {
            const response = await api.post('/incorporation', {
                data: normalizeIncorpData(initialData),
            });

            if (response.data?._id) {
                syncMatterPayload(response.data, { selection: 'current' });
            }

            return {
                intake: response.data,
                wasResumed: response.status === 200,
            };
        } catch (error) {
            lastLoadError.value = classifyStoreError(
                error,
                'Unable to start the incorporation wizard.'
            );
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    const showSaveToast = (errorState: SaveErrorState) => {
        if (errorState.mode !== 'explicit') {
            return;
        }

        const { showToast } = useToast();

        if (errorState.kind === 'validation') {
            showToast(
                'Draft changes could not be saved yet. Please complete the required fields.',
                'error'
            );
            return;
        }

        if (errorState.kind === 'conflict') {
            showToast(
                'This incorporation was updated in another tab or device. Reload before continuing.',
                'error'
            );
            return;
        }

        if (errorState.kind === 'network') {
            showToast('Unable to reach the server. Your changes are still local.', 'error');
            return;
        }

        showToast('Failed to save changes right now. Please try again.', 'error');
    };

    const saveIncorpStep = async (
        stepData: Partial<IncorporationData>,
        replace = false,
        options: SaveIncorpStepOptions = {}
    ) => {
        if (!currentIncorpId.value) {
            throw new Error('No incorporation matter is currently selected.');
        }

        const requestMode = options.mode ?? 'explicit';
        const normalizedStepData = normalizeIncorpData(stepData);

        stageIncorpStep(normalizedStepData, replace);
        const draftVersionAtSave = activeDraftVersion;
        lastSaveError.value = null;

        const runSave = async () => {
            isSaving.value = true;

            try {
                const response = await api.put(`/incorporation/${currentIncorpId.value}`, {
                    data: normalizedStepData,
                    expectedVersion: currentVersion.value,
                });

                syncVersion(response.data);

                if (draftVersionAtSave === activeDraftVersion) {
                    incorpData.value = normalizeIncorpData(response.data?.data || incorpData.value);
                    syncMetadata(response.data, { clearOnMissing: false });
                }

                if (response.data?.status) {
                    currentStatus.value = response.data.status;
                }

                lastSaveError.value = null;
                hasLoaded.value = true;
                return response.data;
            } catch (error) {
                const errorState: SaveErrorState = {
                    ...classifyStoreError(error, 'Unable to save incorporation changes.'),
                    mode: requestMode,
                };

                lastSaveError.value = errorState;
                showSaveToast(errorState);
                throw error;
            } finally {
                isSaving.value = false;
            }
        };

        const queuedSave = saveChain.then(runSave, runSave);
        saveChain = queuedSave.then(() => undefined, () => undefined);
        return queuedSave;
    };

    const nextStep = computed(() => {
        const data = incorpData.value;
        if (!data) return '/incorporation/jurisdiction-name';

        if (!currentStatus.value || currentStatus.value === 'started') {
            return `/incorporation/${getFirstIncompleteRoute(data)}`;
        }

        return '/incorporation/review';
    });

    const resolveResumePath = () => {
        if (currentStatus.value !== 'started') {
            return '/incorporation/review';
        }

        const firstIncompleteRoute = getFirstIncompleteRoute(incorpData.value);
        const earliestBlockingIndex = getIncorpStepIndex(firstIncompleteRoute);
        const savedStep = currentStep.value;

        if (!isValidIncorpStepPath(savedStep)) {
            return `/incorporation/${firstIncompleteRoute}`;
        }

        const savedStepIndex = getIncorpStepIndex(savedStep);
        if (savedStepIndex === -1) {
            return `/incorporation/${firstIncompleteRoute}`;
        }

        if (savedStepIndex <= earliestBlockingIndex) {
            return `/incorporation/${savedStep}`;
        }

        return `/incorporation/${firstIncompleteRoute}`;
    };

    return {
        incorpData,
        isLoading,
        isSaving,
        hasLoaded,
        currentStatus,
        currentVersion,
        intakeFlags,
        logicWarnings,
        currentIncorpId,
        currentStep,
        lastLoadError,
        lastSaveError,
        nextStep,
        resolveResumePath,
        setIncorpId,
        clearIncorpSelection,
        setCurrentStep,
        resetDraftState,
        stageIncorpStep,
        loadCurrentIncorpMatter,
        fetchIncorpIntake,
        ensureLoaded,
        createIncorpIntake,
        saveIncorpStep,
    };
});
