import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, reactive } from 'vue';

let storeMock: any;
let aiStoreMock: any;
let validationMock: any;
let toastMock: ReturnType<typeof vi.fn>;

vi.mock('../stores/incorpIntake', () => ({
    useIncorpIntakeStore: () => storeMock,
}));

vi.mock('../stores/aiChat', () => ({
    useAiChatStore: () => aiStoreMock,
}));

vi.mock('../composables/useToast', () => ({
    useToast: () => ({ showToast: toastMock }),
}));

vi.mock('../composables/useIncorpValidation', () => ({
    useIncorpValidation: () => validationMock,
}));

vi.mock('../components/AIGuide.vue', () => ({
    default: {
        name: 'AIGuideStub',
        props: ['embedded', 'instanceRole'],
        template: '<div data-testid="ai-guide">AI Guide</div>',
    },
}));

vi.mock('../components/common/ErrorBoundary.vue', () => ({
    default: {
        name: 'ErrorBoundaryStub',
        props: ['fallbackMessage'],
        template: '<div data-testid="error-boundary"><slot /></div>',
    },
}));

import IncorpWizardLayout from '../views/IncorpWizardLayout.vue';

const makeStepComponent = (exposed: Record<string, unknown> = {}, label = 'Step stub') =>
    defineComponent({
        name: 'WizardStepStub',
        setup(_, { expose }) {
            expose(exposed);
            return () => h('div', { 'data-testid': 'step-component' }, label);
        },
    });

const createStoreMock = () => reactive({
    incorpData: {
        preIncorporation: { jurisdiction: 'ontario', nameType: 'numbered' },
        unsureFlags: [],
    },
    isLoading: false,
    isSaving: false,
    currentIncorpId: 'inc-001',
    currentVersion: 0,
    currentStep: 'jurisdiction-name',
    intakeFlags: [],
    logicWarnings: [],
    lastSaveError: null,
    lastLoadError: null,
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
    setCurrentStep: vi.fn((step: string) => {
        storeMock.currentStep = step;
    }),
    clearIncorpSelection: vi.fn(() => {
        storeMock.currentIncorpId = null;
    }),
    stageIncorpStep: vi.fn(),
    saveIncorpStep: vi.fn().mockResolvedValue(undefined),
    fetchIncorpIntake: vi.fn().mockResolvedValue(undefined),
});

const createAiStoreMock = () => reactive({
    chatState: reactive({
        isOpen: false,
        unreadCount: 0,
    }),
    sendAIMessage: vi.fn().mockResolvedValue(undefined),
});

const createValidationMock = () => ({
    getBlockingIssues: vi.fn(() => []),
    getStepStatus: vi.fn(() => 'pending'),
    validateStep: vi.fn(() => null),
    isStepComplete: vi.fn(() => false),
});

const makeRouter = (
    startPath = '/incorporation/jurisdiction-name',
    components: {
        jurisdictionName?: any;
        structureOwnership?: any;
        articles?: any;
        review?: any;
        fallback?: any;
    } = {}
) => {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
            { path: '/incorporation/jurisdiction-name', component: components.jurisdictionName ?? makeStepComponent() },
            { path: '/incorporation/structure-ownership', component: components.structureOwnership ?? makeStepComponent({}, 'Structure') },
            { path: '/incorporation/articles', component: components.articles ?? makeStepComponent({}, 'Articles') },
            { path: '/incorporation/review', component: components.review ?? makeStepComponent({}, 'Review') },
            { path: '/incorporation/:pathMatch(.*)*', component: components.fallback ?? makeStepComponent({}, 'Fallback') },
        ],
    });
    return router;
};

const mountLayout = async (
    startPath = '/incorporation/jurisdiction-name',
    components: Parameters<typeof makeRouter>[1] = {}
) => {
    const router = makeRouter(startPath, components);
    await router.push(startPath);
    await router.isReady();
    const wrapper = mount(IncorpWizardLayout, {
        global: {
            plugins: [createPinia(), router],
            stubs: { teleport: true },
        },
    });
    await flushPromises();
    return { wrapper, router };
};

describe('IncorpWizardLayout', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.useFakeTimers();

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        toastMock = vi.fn();
        storeMock = createStoreMock();
        aiStoreMock = createAiStoreMock();
        validationMock = createValidationMock();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('shows the validation dialog for local validateLocal warnings', async () => {
        const { wrapper, router } = await mountLayout('/incorporation/jurisdiction-name', {
            jurisdictionName: makeStepComponent({
                validateLocal: () => 'Local warning from step',
            }),
        });

        const continueButton = wrapper.find('button.bg-emerald-600');
        await continueButton.trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Review Required');
        expect(wrapper.text()).toContain('Local warning from step');
        expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
    });

    it('ignores global keyboard navigation when the event target is a button', async () => {
        const { wrapper, router } = await mountLayout('/incorporation/jurisdiction-name');

        const continueButton = wrapper.find('button.bg-emerald-600');
        await continueButton.trigger('keydown', { key: 'Enter' });
        await flushPromises();

        expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
    });

    it('disables interactions while bootstrapping', async () => {
        let resolveLoad!: () => void;
        storeMock.ensureLoaded = vi.fn(() => new Promise<void>((resolve) => {
            resolveLoad = resolve;
        }));

        const { wrapper } = await mountLayout('/incorporation/jurisdiction-name');
        await wrapper.vm.$nextTick();

        expect(wrapper.find('button.bg-emerald-600').attributes('disabled')).toBeDefined();

        const navItems = wrapper.findAll('nav[role="list"] > [role="listitem"]');
        expect(navItems[0].attributes('aria-disabled')).toBe('true');

        resolveLoad();
        await flushPromises();
    });

    it('treats the current-step sidebar click as a no-op', async () => {
        const { wrapper, router } = await mountLayout('/incorporation/jurisdiction-name');
        const navItems = wrapper.findAll('nav[role="list"] > [role="listitem"]');

        await navItems[0].trigger('click');
        await flushPromises();

        expect(storeMock.saveIncorpStep).not.toHaveBeenCalled();
        expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
    });

    it('blocks forward sidebar skipping beyond the immediate next step', async () => {
        const { wrapper, router } = await mountLayout('/incorporation/jurisdiction-name');
        const navItems = wrapper.findAll('nav[role="list"] > [role="listitem"]');

        expect(navItems[2].attributes('aria-disabled')).toBe('true');
        await navItems[2].trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
    });

    it('flushes the active step before Save & Exit', async () => {
        const commitStep = vi.fn().mockResolvedValue(undefined);
        const { wrapper, router } = await mountLayout('/incorporation/jurisdiction-name', {
            jurisdictionName: makeStepComponent({
                commitStep,
                hasPendingChanges: () => true,
            }),
        });

        vi.advanceTimersByTime(780_001);
        await flushPromises();

        const saveAndExit = wrapper.findAll('button').find((button) => button.text() === 'Save & Exit');
        expect(saveAndExit).toBeTruthy();

        await saveAndExit!.trigger('click');
        await flushPromises();

        expect(commitStep).toHaveBeenCalledWith(true);
        expect(router.currentRoute.value.fullPath).toBe('/dashboard');
    });

    it('opens the mobile AI sheet from validation help and does not mount the hidden desktop assistant', async () => {
        const { wrapper } = await mountLayout('/incorporation/jurisdiction-name', {
            jurisdictionName: makeStepComponent({
                validateLocal: () => 'Need AI help',
            }),
        });

        await wrapper.find('button.bg-emerald-600').trigger('click');
        await flushPromises();
        await wrapper.find('button.bg-emerald-600.w-full').trigger('click');
        await flushPromises();

        expect(aiStoreMock.sendAIMessage).toHaveBeenCalledTimes(1);
        expect(wrapper.find('[role="dialog"][aria-label="AI legal assistant"]').exists()).toBe(true);
        expect(wrapper.findAll('[data-testid="ai-guide"]')).toHaveLength(1);
    });

    it('shows the review step as warning when blocking issues exist', async () => {
        validationMock.getBlockingIssues = vi.fn(() => [{ context: 'registrations', message: 'Missing filings' }]);

        const { wrapper } = await mountLayout('/incorporation/review', {
            review: makeStepComponent({
                getPrimaryActionState: () => ({ disabled: true, label: 'Submit' }),
            }),
        });

        const navItems = wrapper.findAll('nav[role="list"] > [role="listitem"]');
        const reviewItem = navItems[navItems.length - 1];
        expect(reviewItem.find('svg.text-yellow-500').exists()).toBe(true);
    });

    it('redirects unmatched incorporation routes to the fallback saved step', async () => {
        storeMock.currentStep = 'jurisdiction-name';

        const { router } = await mountLayout('/incorporation/not-real');

        expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
    });

    it('shows retry UI when bootstrap loading fails and recovers on retry', async () => {
        storeMock.ensureLoaded = vi.fn()
            .mockRejectedValueOnce({ response: { status: 500, data: { message: 'Server offline' } } })
            .mockResolvedValueOnce(undefined);

        const { wrapper } = await mountLayout('/incorporation/jurisdiction-name');

        expect(wrapper.text()).toContain('We could not load your incorporation matter.');
        expect(wrapper.get('#incorp-wizard-retry').exists()).toBe(true);

        await wrapper.get('#incorp-wizard-retry').trigger('click');
        await flushPromises();

        expect(wrapper.text()).not.toContain('We could not load your incorporation matter.');
        expect(storeMock.ensureLoaded).toHaveBeenCalledTimes(2);
    });
});
