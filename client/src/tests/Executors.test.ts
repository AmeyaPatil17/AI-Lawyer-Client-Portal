import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Executors from '../views/wizard/Executors.vue';
import { useIntakeStore } from '../stores/intake';
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
    useRoute: vi.fn(() => ({ path: '/wizard/executors' })),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), currentRoute: { value: { path: '/wizard/executors' } } })),
}));

vi.mock('../components/common/SkeletonLoader.vue', () => ({
    default: { template: '<div data-testid="skeleton" />' },
}));

const QuestionHelperStub = {
    props: ['helperKind', 'label', 'inputId', 'example', 'whyItMatters', 'hasLegalWording', 'allowLegalInsert', 'legalContext', 'aiStep', 'currentValue', 'required'],
    template: '<div><slot /></div>',
};

describe('Executors.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountExecutors = () => mount(Executors, {
        attachTo: document.body,
        global: {
            plugins: [pinia],
            stubs: {
                QuestionHelper: QuestionHelperStub,
            },
        },
    });

    const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
        wrapper.findAll('button').find((button) => button.text().includes(text));

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.clearAllMocks();
        vi.useFakeTimers();

        const store = useIntakeStore();
        store.currentIntakeId = 'intake-123';
        store.isInitialized = true;
        store.intakeData = {
            personalProfile: {
                fullName: 'Alex Doe',
            },
            family: {
                maritalStatus: 'married',
                spouseName: 'Jamie Doe',
                children: [
                    { fullName: 'Taylor Doe' },
                ],
            },
            executors: {
                primary: { fullName: '', relationship: '' },
                alternates: [],
                compensation: 'guidelines',
            },
        } as any;

        (api.put as Mock).mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('flushes current edits through commitStep and does not render duplicate page-level navigation', async () => {
        const wrapper = mountExecutors();

        await wrapper.get('#primary-executor-name').setValue('Pat Doe');
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(api.put).toHaveBeenCalled();
        expect(store.intakeData.executors?.primary?.fullName).toBe('Pat Doe');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });

    it('normalizes legacy object-shaped executor data on load', async () => {
        const store = useIntakeStore();
        store.intakeData.executors = {
            primary: { fullName: { name: 'Legacy Primary' }, relationship: 'Sibling' },
            alternates: [
                { id: 'alt-1', fullName: { name: 'Legacy Alternate' }, relationship: 'Friend' },
            ],
            compensation: 'specific',
            compensationDetails: 'Flat fee',
        } as any;

        const wrapper = mountExecutors();
        await flushPromises();

        expect((wrapper.get('#primary-executor-name').element as HTMLInputElement).value).toBe('Legacy Primary');
        expect((wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-0`).element as HTMLInputElement).value).toBe('Legacy Alternate');
        expect((wrapper.get(`#${willsHelpers.executors.compensation.inputId}`).element as HTMLSelectElement).value).toBe('specific');
    });

    it('loads sparse executor data with safe defaults', async () => {
        const store = useIntakeStore();
        store.intakeData.executors = {} as any;

        const wrapper = mountExecutors();
        await flushPromises();

        expect((wrapper.get('#primary-executor-name').element as HTMLInputElement).value).toBe('');
        expect((wrapper.get(`#${willsHelpers.executors.primaryRelationship.inputId}`).element as HTMLSelectElement).selectedIndex).toBe(0);
        expect((wrapper.get(`#${willsHelpers.executors.compensation.inputId}`).element as HTMLSelectElement).value).toBe('guidelines');
        expect(wrapper.text()).toContain('No alternates added yet');
    });

    it('confirms before replacing an existing primary executor with the spouse quick fill', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm')
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);

        const wrapper = mountExecutors();
        await wrapper.get('#primary-executor-name').setValue('Existing Executor');
        await flushPromises();

        await findButton(wrapper, 'Fill Spouse')!.trigger('click');
        await flushPromises();
        expect((wrapper.get('#primary-executor-name').element as HTMLInputElement).value).toBe('Existing Executor');

        await findButton(wrapper, 'Fill Spouse')!.trigger('click');
        await flushPromises();
        expect(confirmSpy).toHaveBeenCalled();
        expect((wrapper.get('#primary-executor-name').element as HTMLInputElement).value).toBe('Jamie Doe');
        expect((wrapper.get(`#${willsHelpers.executors.primaryRelationship.inputId}`).element as HTMLSelectElement).value).toBe('Spouse');
    });

    it('rejects self-appointment with inline validation targeting the primary field', async () => {
        const scrollIntoView = vi.fn();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoView,
        });
        const wrapper = mountExecutors();

        await wrapper.get('#primary-executor-name').setValue(' Alex Doe ');
        await flushPromises();

        const warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('cannot appoint yourself');
        const primaryInput = wrapper.get('#primary-executor-name');
        expect(primaryInput.attributes('aria-describedby')).toBe('executors-primary-name-error');
        expect(scrollIntoView).toHaveBeenCalled();
        expect(wrapper.get('#executors-primary-name-error').text()).toContain('cannot appoint yourself');
    });

    it('rejects whitespace-only primary executor names', async () => {
        const wrapper = mountExecutors();

        await wrapper.get('#primary-executor-name').setValue('   ');
        await flushPromises();

        const warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('Primary Executor is required');
        expect(wrapper.get('#executors-primary-name-error').text()).toContain('Primary Executor is required');
    });

    it('requires unique alternate executors and relationships before continuing', async () => {
        const wrapper = mountExecutors();

        await wrapper.get('#primary-executor-name').setValue('Jamie Doe');
        await findButton(wrapper, 'Add Alternate')!.trigger('click');
        await wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-0`).setValue('Jamie Doe');
        await flushPromises();

        let warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('different person');
        expect(wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-0`).attributes('aria-describedby')).toContain('alternate-name-error');
        expect(wrapper.text()).toContain('Each executor must be a different person.');

        await wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-0`).setValue('Morgan Doe');
        await flushPromises();
        warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('Relationship is required');
        expect(wrapper.text()).toContain('Relationship is required for each alternate executor.');
    });

    it('requires specific compensation details and clears them when switching away', async () => {
        const wrapper = mountExecutors();

        await wrapper.get('#primary-executor-name').setValue('Jamie Doe');
        await wrapper.get(`#${willsHelpers.executors.compensation.inputId}`).setValue('specific');
        await flushPromises();

        const warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('Specific compensation terms');
        expect(wrapper.get(`#${willsHelpers.executors.compensationDetails.inputId}`).attributes('aria-describedby'))
            .toBe('executors-compensation-details-error');

        await wrapper.get(`#${willsHelpers.executors.compensationDetails.inputId}`).setValue('$5,000 flat fee');
        await wrapper.get(`#${willsHelpers.executors.compensation.inputId}`).setValue('gratis');
        await flushPromises();

        expect(wrapper.find(`#${willsHelpers.executors.compensationDetails.inputId}`).exists()).toBe(false);
        const store = useIntakeStore();
        expect(store.intakeData.executors?.compensationDetails).toBeUndefined();
    });

    it('keeps the remaining alternate row stable after removing an earlier row', async () => {
        const wrapper = mountExecutors();

        await findButton(wrapper, 'Add Alternate')!.trigger('click');
        await findButton(wrapper, 'Add Alternate')!.trigger('click');
        await wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-1`).setValue('Second Alternate');
        await flushPromises();

        const removeButtons = wrapper.findAll('button.absolute');
        await removeButtons[0].trigger('click');
        await flushPromises();

        expect((wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-0`).element as HTMLInputElement).value).toBe('Second Alternate');
    });

    it('excludes the client and already-used alternates from primary autocomplete suggestions', async () => {
        const wrapper = mountExecutors();

        await findButton(wrapper, 'Add Alternate')!.trigger('click');
        await wrapper.get(`#${willsHelpers.executors.alternateName.inputId}-0`).setValue('Morgan Doe');
        await wrapper.get(`#${willsHelpers.executors.alternateRelationship.inputId}-0`).setValue('Sibling');
        await flushPromises();

        await wrapper.get('#primary-executor-name').trigger('focus');
        await flushPromises();

        const suggestionsText = wrapper.text();
        expect(suggestionsText).not.toContain('Alex Doe');
        expect(suggestionsText).not.toContain('Morgan Doe');
        expect(suggestionsText).toContain('Jamie Doe');
    });

    it('exposes a flushable commitStep contract for WizardLayout', async () => {
        const wrapper = mountExecutors();

        await wrapper.get('#primary-executor-name').setValue('Committed Executor');
        await flushPromises();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(api.put).toHaveBeenCalled();
        expect(store.intakeData.executors?.primary?.fullName).toBe('Committed Executor');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });
});
