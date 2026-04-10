import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Family from '../views/wizard/Family.vue';
import { useIntakeStore } from '../stores/intake';
import { useTriageStore } from '../stores/triage';
import api from '../api';
import { willsHelpers } from '../utils/willsFieldHelpers';

vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

const showToast = vi.fn();
vi.mock('../composables/useToast', () => ({
    useToast: () => ({ showToast }),
}));

vi.mock('vue-router', () => ({
    useRoute: vi.fn(() => ({ path: '/wizard/family' })),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), currentRoute: { value: { path: '/wizard/family' } } })),
}));

vi.mock('../components/common/SkeletonLoader.vue', () => ({
    default: { template: '<div data-testid="skeleton" />' },
}));

const QuestionHelperStub = {
    props: ['helperKind', 'label', 'inputId', 'example', 'whyItMatters', 'hasLegalWording', 'allowLegalInsert', 'legalContext', 'aiStep', 'currentValue', 'required'],
    template: '<div><slot /></div>',
};

describe('Family.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountFamily = () => mount(Family, {
        global: {
            plugins: [pinia],
            stubs: {
                QuestionHelper: QuestionHelperStub,
            },
        },
    });

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.clearAllMocks();

        const store = useIntakeStore();
        store.currentIntakeId = 'intake-123';
        store.isInitialized = true;
        store.intakeData = {
            personalProfile: {
                fullName: 'Alex Doe',
                dateOfBirth: '1985-01-01',
                maritalStatus: 'married',
            },
            family: {
                maritalStatus: 'married',
                spouseName: 'Jamie Doe',
                children: [],
            },
        } as any;

        const triageStore = useTriageStore();
        triageStore.triageData.hasMinors = false;
        triageStore.triageData.maritalStatus = 'married';

        (api.put as Mock).mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('clears spouse data immediately when marital status changes to a non-partner value', async () => {
        const wrapper = mountFamily();

        await wrapper.get(`#${willsHelpers.family.maritalStatus.inputId}`).setValue('single');
        await flushPromises();

        const store = useIntakeStore();
        expect(store.intakeData.family?.spouseName).toBeUndefined();
        expect(wrapper.find('#spouse-name').exists()).toBe(false);
    });

    it('flushes current edits through commitStep and does not render duplicate page-level navigation', async () => {
        const wrapper = mountFamily();

        await wrapper.get('#spouse-name').setValue('Pat Doe');
        await flushPromises();

        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Back')).toBe(false);
        expect(wrapper.findAll('button').some((button) => button.text().includes('Next'))).toBe(false);

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(api.put).toHaveBeenCalled();
        expect(store.intakeData.family?.spouseName).toBe('Pat Doe');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });

    it('requires an actual minor child when triage says minors', async () => {
        const triageStore = useTriageStore();
        triageStore.triageData.hasMinors = true;

        const wrapper = mountFamily();
        const addCurrent = wrapper.findAll('button').find((button) => button.text().includes('Current'));
        expect(addCurrent).toBeTruthy();

        await addCurrent!.trigger('click');
        await wrapper.get(`#${willsHelpers.family.childName.inputId}-0`).setValue('Adult Child');
        await wrapper.get(`#${willsHelpers.family.childDob.inputId}-0`).setValue('1990-01-01');
        await flushPromises();

        const warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('at least one child under 18');
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('at least one child under 18'),
            'warning'
        );
    });

    it('keeps remaining child input state stable after removing an earlier row', async () => {
        const wrapper = mountFamily();
        const addCurrent = wrapper.findAll('button').find((button) => button.text().includes('Current'));
        expect(addCurrent).toBeTruthy();

        await addCurrent!.trigger('click');
        await addCurrent!.trigger('click');
        await wrapper.get(`#${willsHelpers.family.childName.inputId}-1`).setValue('Second Child');
        await flushPromises();

        const removeButtons = wrapper.findAll('button.absolute');
        expect(removeButtons).toHaveLength(2);

        await removeButtons[0].trigger('click');
        await flushPromises();

        expect((wrapper.get(`#${willsHelpers.family.childName.inputId}-0`).element as HTMLInputElement).value).toBe('Second Child');
    });

    it('wires spouse validation errors to the actual input element', async () => {
        const store = useIntakeStore();
        store.intakeData.family = {
            maritalStatus: 'married',
            spouseName: '',
            children: [],
        } as any;

        const wrapper = mountFamily();
        const warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('Spouse Name is required');
        const spouseInput = wrapper.get('#spouse-name');
        expect(spouseInput.attributes('aria-describedby')).toBe('family-spouse-error');
        expect(wrapper.get('#family-spouse-error').text()).toContain('Spouse Name is required');
    });
});
