import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import PowerOfAttorney from '../views/wizard/PowerOfAttorney.vue';
import { useIntakeStore } from '../stores/intake';
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

const QuestionHelperStub = {
    props: ['helperKind', 'label', 'inputId', 'example', 'whyItMatters', 'hasLegalWording', 'allowLegalInsert', 'legalContext', 'aiStep', 'currentValue', 'required'],
    template: '<div><slot /></div>',
};

describe('PowerOfAttorney.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountPoa = () => mount(PowerOfAttorney, {
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
        vi.useFakeTimers();

        const store = useIntakeStore();
        store.currentIntakeId = 'intake-123';
        store.isInitialized = true;
        store.intakeData = {
            personalProfile: {
                fullName: 'Alex Client',
            },
            poa: {
                property: {
                    primaryName: 'Pat Property',
                    primaryRelationship: 'Sibling',
                    alternateName: '',
                    alternateRelationship: '',
                    decisionMode: 'jointlyAndSeverally',
                },
                personalCare: {
                    primaryName: 'Casey Care',
                    primaryRelationship: 'Friend',
                    alternateName: '',
                    alternateRelationship: '',
                    hasLivingWill: false,
                    healthInstructions: '',
                },
            },
        } as any;

        (api.put as Mock).mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('normalizes sparse and legacy POA drafts without wiping defaults', async () => {
        const store = useIntakeStore();
        store.intakeData.poa = {
            property: {
                primaryName: { name: 'Legacy Property' },
                primaryRelationship: 'Professional',
            },
            personalCare: {
                primaryName: { fullName: 'Legacy Care' },
            },
        } as any;

        const wrapper = mountPoa();
        await flushPromises();

        expect((wrapper.get(`#${willsHelpers.poa.primaryNameProp.inputId}`).element as HTMLInputElement).value).toBe('Legacy Property');
        expect((wrapper.get(`#${willsHelpers.poa.primaryNameCare.inputId}`).element as HTMLInputElement).value).toBe('Legacy Care');
        expect((wrapper.get(`#${willsHelpers.poa.alternateNameProp.inputId}`).element as HTMLInputElement).value).toBe('');
        expect((wrapper.get(`#${willsHelpers.poa.hasLivingWill.inputId}`).element as HTMLInputElement).checked).toBe(false);
    });

    it('rejects whitespace-only names', async () => {
        const wrapper = mountPoa();
        await flushPromises();

        await wrapper.get(`#${willsHelpers.poa.primaryNameProp.inputId}`).setValue('   ');
        await flushPromises();

        expect((wrapper.vm as any).validateLocal()).toContain('Primary Attorney for Property is required');
    });

    it('requires alternates to be both name and relationship', async () => {
        const wrapper = mountPoa();
        await flushPromises();

        await wrapper.get(`#${willsHelpers.poa.alternateNameProp.inputId}`).setValue('Backup Property');
        await flushPromises();
        expect((wrapper.vm as any).validateLocal()).toContain('Property Alternate Attorney');

        await wrapper.get(`#${willsHelpers.poa.alternateNameProp.inputId}`).setValue('');
        await wrapper.get(`#${willsHelpers.poa.alternateRelProp.inputId}`).setValue('Sibling');
        await flushPromises();
        expect((wrapper.vm as any).validateLocal()).toContain('name of your Property Alternate Attorney');
    });

    it('rejects creator self-appointment and duplicate names within each branch', async () => {
        const wrapper = mountPoa();
        await flushPromises();

        await wrapper.get(`#${willsHelpers.poa.primaryNameProp.inputId}`).setValue('Alex Client');
        await flushPromises();
        expect((wrapper.vm as any).validateLocal()).toContain('cannot appoint yourself');

        await wrapper.get(`#${willsHelpers.poa.primaryNameProp.inputId}`).setValue('Pat Property');
        await wrapper.get(`#${willsHelpers.poa.alternateNameProp.inputId}`).setValue('Pat Property');
        await wrapper.get(`#${willsHelpers.poa.alternateRelProp.inputId}`).setValue('Sibling');
        await flushPromises();
        expect((wrapper.vm as any).validateLocal()).toContain('must be different people');

        await wrapper.get(`#${willsHelpers.poa.alternateNameProp.inputId}`).setValue('');
        await wrapper.get(`#${willsHelpers.poa.alternateRelProp.inputId}`).setValue('');
        await wrapper.get(`#${willsHelpers.poa.alternateNameCare.inputId}`).setValue('Casey Care');
        await wrapper.get(`#${willsHelpers.poa.alternateRelCare.inputId}`).setValue('Friend');
        await flushPromises();
        expect((wrapper.vm as any).validateLocal()).toContain('must be different people');
    });

    it('confirms before copying and only copies the property primary appointment', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const wrapper = mountPoa();
        await flushPromises();

        await wrapper.get(`#${willsHelpers.poa.primaryNameProp.inputId}`).setValue('Morgan Property');
        await wrapper.get(`#${willsHelpers.poa.primaryRelProp.inputId}`).setValue('Parent');
        await wrapper.get(`#${willsHelpers.poa.alternateNameProp.inputId}`).setValue('Unused Alternate');
        await wrapper.get(`#${willsHelpers.poa.alternateRelProp.inputId}`).setValue('Sibling');
        await wrapper.get(`#${willsHelpers.poa.alternateNameCare.inputId}`).setValue('Original Care Alternate');
        await wrapper.get(`#${willsHelpers.poa.alternateRelCare.inputId}`).setValue('Friend');
        await flushPromises();

        const copyButton = wrapper.findAll('button').find((button) => button.text().includes('Copy Property Primary'));
        expect(copyButton?.exists()).toBe(true);

        await copyButton!.trigger('click');
        await flushPromises();

        expect(confirmSpy).toHaveBeenCalled();
        expect((wrapper.get(`#${willsHelpers.poa.primaryNameCare.inputId}`).element as HTMLInputElement).value).toBe('Morgan Property');
        expect((wrapper.get(`#${willsHelpers.poa.primaryRelCare.inputId}`).element as HTMLSelectElement).value).toBe('Parent');
        expect((wrapper.get(`#${willsHelpers.poa.alternateNameCare.inputId}`).element as HTMLInputElement).value).toBe('Original Care Alternate');
    });

    it('requires health instructions when including the living will clause', async () => {
        const wrapper = mountPoa();
        await flushPromises();

        await wrapper.get(`#${willsHelpers.poa.hasLivingWill.inputId}`).setValue(true);
        await wrapper.get(`#${willsHelpers.poa.healthInstructions.inputId}`).setValue('   ');
        await flushPromises();

        expect((wrapper.vm as any).validateLocal()).toContain('health instructions');
    });

    it('supports legacy custom relationships through the Other fallback and strips legacy decisionMode on save', async () => {
        const store = useIntakeStore();
        store.intakeData.poa = {
            property: {
                primaryName: 'Legacy Property',
                primaryRelationship: 'Neighbour',
                alternateName: '',
                alternateRelationship: '',
                decisionMode: 'majority',
            },
            personalCare: {
                primaryName: 'Legacy Care',
                primaryRelationship: 'Friend',
                alternateName: '',
                alternateRelationship: '',
                hasLivingWill: false,
                healthInstructions: '',
            },
        } as any;

        const wrapper = mountPoa();
        await flushPromises();

        expect((wrapper.get(`#${willsHelpers.poa.primaryRelProp.inputId}`).element as HTMLSelectElement).value).toBe('Other');
        expect((wrapper.get(`#${willsHelpers.poa.primaryRelProp.inputId}-other`).element as HTMLInputElement).value).toBe('Neighbour');

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const payload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data?.poa;
        expect(payload.property.primaryRelationship).toBe('Neighbour');
        expect(payload.property.decisionMode).toBeUndefined();
    });

    it('removes decisionMode authoring and page-level back/continue buttons', async () => {
        const wrapper = mountPoa();
        await flushPromises();

        expect(wrapper.text()).not.toContain('Decision Mode');
        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Back')).toBe(false);
        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Continue')).toBe(false);
    });
});
