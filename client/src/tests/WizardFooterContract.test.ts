import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import WizardLayout from '../views/WizardLayout.vue';
import IncorpWizardLayout from '../views/IncorpWizardLayout.vue';
import { useIntakeStore } from '../stores/intake';
import { useIncorpIntakeStore } from '../stores/incorpIntake';

vi.mock('../stores/aiChat', () => ({
    useAiChatStore: () => ({
        chatState: { isOpen: false, unreadCount: 0 },
        sendAIMessage: vi.fn(),
        disconnectSocket: vi.fn(),
    }),
}));

vi.mock('../components/AIGuide.vue', () => ({
    default: { template: '<div data-testid="ai-guide">AI Guide</div>' },
}));

vi.mock('../components/common/ErrorBoundary.vue', () => ({
    default: {
        props: ['fallbackMessage'],
        template: '<div data-testid="error-boundary"><slot /></div>',
    },
}));

vi.mock('../composables/useToast', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}));

const makeStepComponent = (exposed: Record<string, any>, text: string) =>
    defineComponent({
        name: `Exposed${text.replace(/\s+/g, '')}`,
        setup(_, { expose }) {
            expose(exposed);
            return () => h('div', { 'data-testid': text.toLowerCase().replace(/\s+/g, '-') }, text);
        },
    });

const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
    wrapper.findAll('button').find((button) => button.text().trim() === text);

const installMatchMedia = () => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            matches: false,
            media: '',
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

describe('Wizard footer contract', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        installMatchMedia();
        localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
        localStorage.clear();
    });

    it('uses the exposed step contract for wills Continue without relying on child DOM buttons', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const intakeStore = useIntakeStore();
        intakeStore.isInitialized = true;
        intakeStore.currentIntakeId = 'intake-123';
        intakeStore.intakeData = {
            personalProfile: {
                fullName: 'Alice Client',
                dateOfBirth: '1980-01-01',
                maritalStatus: 'single',
            },
            family: {
                maritalStatus: '',
                children: [],
            },
        } as any;

        const validateLocal = vi.fn(() => null);
        const commitStep = vi.fn(async () => undefined);
        const afterCommitContinue = vi.fn(async () => true);

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/wizard/profile', component: makeStepComponent({ validateLocal, hasPendingChanges: () => true, commitStep, afterCommitContinue }, 'Profile Step') },
                { path: '/wizard/family', component: makeStepComponent({}, 'Family Step') },
                { path: '/wizard/review', component: makeStepComponent({}, 'Review Step') },
            ],
        });

        await router.push('/wizard/profile');
        await router.isReady();

        const wrapper = mount(WizardLayout, {
            global: {
                plugins: [pinia, router],
                stubs: { teleport: true },
            },
        });

        await flushPromises();

        await findButton(wrapper, 'Continue')!.trigger('click');
        await flushPromises();

        expect(validateLocal).toHaveBeenCalledTimes(1);
        expect(commitStep).toHaveBeenCalledWith(true);
        expect(afterCommitContinue).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe('/wizard/family');
    });

    it('uses triggerPrimaryAction for wills review Submit without child buttons', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const intakeStore = useIntakeStore();
        intakeStore.isInitialized = true;
        intakeStore.currentIntakeId = 'intake-123';
        intakeStore.intakeData = {
            personalProfile: {
                fullName: 'Alice Client',
                dateOfBirth: '1980-01-01',
                maritalStatus: 'single',
            },
            family: { maritalStatus: 'single', children: [] },
            executors: { primary: { fullName: 'Pat Executor', relationship: 'Sibling' } },
            beneficiaries: { beneficiaries: [{ fullName: 'Pat Executor', relationship: 'Sibling', share: 100 }] },
        } as any;

        const triggerPrimaryAction = vi.fn();

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/wizard/profile', component: makeStepComponent({}, 'Profile Step') },
                { path: '/wizard/review', component: makeStepComponent({ triggerPrimaryAction, getPrimaryActionState: () => ({ label: 'Submit' }) }, 'Review Step') },
            ],
        });

        await router.push('/wizard/review');
        await router.isReady();

        const wrapper = mount(WizardLayout, {
            global: {
                plugins: [pinia, router],
                stubs: { teleport: true },
            },
        });

        await flushPromises();

        expect(findButton(wrapper, 'Submit')).toBeTruthy();
        await findButton(wrapper, 'Submit')!.trigger('click');
        await flushPromises();

        expect(triggerPrimaryAction).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe('/wizard/review');
    });

    it('skips unnecessary flushes in the incorporation layout when hasPendingChanges returns false', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const incorpStore = useIncorpIntakeStore();
        incorpStore.hasLoaded = true;
        incorpStore.currentIncorpId = 'inc-123';
        incorpStore.incorpData = {
            preIncorporation: {
                jurisdiction: 'obca',
                nameType: 'numbered',
                nameConfirmed: true,
            },
            structureOwnership: {
                shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                directors: [{ fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true }],
                registeredOfficeAddress: '123 Main St',
                registeredOfficeProvince: 'ON',
            },
        } as any;

        const commitStep = vi.fn(async () => undefined);

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/incorporation/jurisdiction-name', component: makeStepComponent({}, 'Jurisdiction Step') },
                { path: '/incorporation/structure-ownership', component: makeStepComponent({ commitStep, hasPendingChanges: () => false }, 'Structure Step') },
                { path: '/incorporation/review', component: makeStepComponent({}, 'Incorp Review Step') },
            ],
        });

        await router.push('/incorporation/structure-ownership');
        await router.isReady();

        const wrapper = mount(IncorpWizardLayout, {
            global: {
                plugins: [pinia, router],
                stubs: { teleport: true },
            },
        });

        await flushPromises();

        await findButton(wrapper, 'Back')!.trigger('click');
        await flushPromises();

        expect(commitStep).not.toHaveBeenCalled();
        expect(router.currentRoute.value.path).toBe('/incorporation/jurisdiction-name');
    });

    it('uses the exposed step contract for incorporation Continue without relying on child DOM buttons', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const incorpStore = useIncorpIntakeStore();
        incorpStore.hasLoaded = true;
        incorpStore.currentIncorpId = 'inc-123';
        incorpStore.incorpData = {
            preIncorporation: {
                jurisdiction: 'obca',
                nameType: 'numbered',
                nameConfirmed: true,
            },
            structureOwnership: {},
        } as any;

        const validateLocal = vi.fn(() => null);
        const commitStep = vi.fn(async () => undefined);
        const afterCommitContinue = vi.fn(async () => true);

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/incorporation/jurisdiction-name', component: makeStepComponent({ validateLocal, hasPendingChanges: () => true, commitStep, afterCommitContinue }, 'Jurisdiction Step') },
                { path: '/incorporation/structure-ownership', component: makeStepComponent({}, 'Structure Step') },
                { path: '/incorporation/review', component: makeStepComponent({}, 'Incorp Review Step') },
            ],
        });

        await router.push('/incorporation/jurisdiction-name');
        await router.isReady();

        const wrapper = mount(IncorpWizardLayout, {
            global: {
                plugins: [pinia, router],
                stubs: { teleport: true },
            },
        });

        await flushPromises();

        await findButton(wrapper, 'Continue')!.trigger('click');
        await flushPromises();

        expect(validateLocal).toHaveBeenCalledTimes(1);
        expect(commitStep).toHaveBeenCalledWith(true);
        expect(afterCommitContinue).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe('/incorporation/structure-ownership');
    });

    it('uses triggerPrimaryAction for incorporation review Submit without child buttons', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const incorpStore = useIncorpIntakeStore();
        incorpStore.hasLoaded = true;
        incorpStore.currentIncorpId = 'inc-123';
        incorpStore.incorpData = {
            preIncorporation: {
                jurisdiction: 'obca',
                nameType: 'numbered',
                nameConfirmed: true,
            },
        } as any;

        const triggerPrimaryAction = vi.fn();

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/incorporation/jurisdiction-name', component: makeStepComponent({}, 'Jurisdiction Step') },
                { path: '/incorporation/review', component: makeStepComponent({ triggerPrimaryAction, getPrimaryActionState: () => ({ label: 'Submit' }) }, 'Incorp Review Step') },
            ],
        });

        await router.push('/incorporation/review');
        await router.isReady();

        const wrapper = mount(IncorpWizardLayout, {
            global: {
                plugins: [pinia, router],
                stubs: { teleport: true },
            },
        });

        await flushPromises();

        expect(findButton(wrapper, 'Submit')).toBeTruthy();
        await findButton(wrapper, 'Submit')!.trigger('click');
        await flushPromises();

        expect(triggerPrimaryAction).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe('/incorporation/review');
    });
});
