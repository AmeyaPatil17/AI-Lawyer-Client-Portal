import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import PersonalProfile from '../views/wizard/PersonalProfile.vue';
import Beneficiaries from '../views/wizard/Beneficiaries.vue';
import Guardians from '../views/wizard/Guardians.vue';
import PowerOfAttorney from '../views/wizard/PowerOfAttorney.vue';
import Funeral from '../views/wizard/Funeral.vue';
import PriorWills from '../views/wizard/PriorWills.vue';
import { useIntakeStore } from '../stores/intake';
import { useTriageStore } from '../stores/triage';
import { willsHelpers } from '../utils/willsFieldHelpers';

vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

const showToast = vi.fn();
const validateWithAI = vi.fn();

vi.mock('../composables/useToast', () => ({
    useToast: () => ({ showToast }),
}));

vi.mock('../composables/useIntakeValidation', async () => {
    const actual = await vi.importActual<typeof import('../composables/useIntakeValidation')>('../composables/useIntakeValidation');
    return {
        ...actual,
        useIntakeValidation: () => ({
            ...actual.useIntakeValidation(),
            validateWithAI,
        }),
    };
});

vi.mock('../components/common/SkeletonLoader.vue', () => ({
    default: { template: '<div data-testid="skeleton" />' },
}));

const QuestionHelperStub = {
    props: ['helperKind', 'label', 'inputId', 'example', 'whyItMatters', 'hasLegalWording', 'allowLegalInsert', 'legalContext', 'aiStep', 'currentValue', 'required'],
    template: '<div><slot /></div>',
};

const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
    wrapper.findAll('button').find((button) => button.text().includes(text));

describe('Remaining wizard step coverage', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountWithPinia = (component: any) => mount(component, {
        attachTo: document.body,
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
                fullName: 'Alex Doe',
                dateOfBirth: '1985-01-01',
                maritalStatus: 'single',
            },
            family: {
                maritalStatus: 'single',
                children: [],
            },
            executors: {
                primary: { fullName: 'Pat Executor', relationship: 'Sibling' },
                alternates: [],
                compensation: 'guidelines',
            },
            assets: { list: [] },
            beneficiaries: {
                personalEffects: { spouseAll: false, specificItems: [] },
                legacies: [],
                beneficiaries: [{ fullName: 'Casey Doe', relationship: 'Sibling', share: 100 }],
                contingency: 'perStirpes',
                trustConditions: {
                    type: 'discretionary',
                    ageOfMajority: 21,
                    stagedDistribution: false,
                    stages: [],
                    separateTrustee: false,
                    trusteeName: '',
                    spendthriftClause: false,
                },
                disasterClause: '',
            },
            guardians: {
                primary: { fullName: 'Jordan Guardian', relationship: 'Sibling' },
                alternates: [],
            },
            poa: {
                property: {
                    primaryName: 'Pat Executor',
                    primaryRelationship: 'Sibling',
                    alternateName: '',
                    alternateRelationship: '',
                    decisionMode: 'jointlyAndSeverally',
                },
                personalCare: {
                    primaryName: 'Morgan Care',
                    primaryRelationship: 'Friend',
                    alternateName: '',
                    alternateRelationship: '',
                    hasLivingWill: false,
                    healthInstructions: '',
                },
            },
            funeral: {
                type: 'cremation',
                ashesDetails: 'Scatter at the lake',
                burialDetails: '',
                service: 'formal',
                serviceDetails: 'Play one hymn',
            },
            priorWills: {
                hasPriorWill: 'no',
                priorWillDate: '',
                priorWillLocation: '',
                hasForeignWill: 'no',
                foreignWillDetails: '',
            },
        } as any;

        const triageStore = useTriageStore();
        triageStore.triageData.maritalStatus = 'single';
        triageStore.triageData.hasMinors = false;

        (api.put as Mock).mockResolvedValue({ data: { expectedVersion: 2 } });
        (api.post as Mock).mockResolvedValue({ data: { warning: null } });
        validateWithAI.mockResolvedValue(null);
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('PersonalProfile flushes via commitStep and renders no duplicate page navigation', async () => {
        const wrapper = mountWithPinia(PersonalProfile);

        await wrapper.get('#personal-fullname').setValue('Morgan Client');
        await wrapper.get('#personal-dob').setValue('1980-01-01');
        await wrapper.get('#personal-marital').setValue('single');
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(api.put).toHaveBeenCalled();
        expect(store.intakeData.personalProfile?.fullName).toBe('Morgan Client');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });

    it('Beneficiaries preserves the AI warning flow through afterCommitContinue and renders no duplicate page navigation', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        validateWithAI.mockResolvedValue('Possible spousal omission');

        const wrapper = mountWithPinia(Beneficiaries);
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        const canContinue = await (wrapper.vm as any).afterCommitContinue();
        await flushPromises();

        expect(validateWithAI).toHaveBeenCalledWith('validating_beneficiaries');
        expect(confirmSpy).toHaveBeenCalled();
        expect(canContinue).toBe(false);
    });

    it('Guardians keeps the guardian-executor confirmation in validateLocal and renders no duplicate page navigation', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const store = useIntakeStore();
        store.intakeData.family = {
            maritalStatus: 'single',
            children: [{ fullName: 'Minor Child', dateOfBirth: '2018-01-01' }],
        } as any;
        store.intakeData.guardians = {
            primary: { fullName: 'Pat Executor', relationship: 'Sibling' },
            alternates: [],
        } as any;

        const wrapper = mountWithPinia(Guardians);
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        const warning = (wrapper.vm as any).validateLocal();
        expect(confirmSpy).toHaveBeenCalled();
        expect(warning).toContain('requires review');
    });

    it('PowerOfAttorney validates alternate relationships and exposes a footer flush contract', async () => {
        const store = useIntakeStore();
        store.intakeData.poa = {
            property: {
                primaryName: 'Pat Executor',
                primaryRelationship: 'Sibling',
                alternateName: 'Backup Property',
                alternateRelationship: '',
                decisionMode: 'jointlyAndSeverally',
            },
            personalCare: {
                primaryName: 'Morgan Care',
                primaryRelationship: 'Friend',
                alternateName: '',
                alternateRelationship: '',
                hasLivingWill: false,
                healthInstructions: '',
            },
        } as any;

        const wrapper = mountWithPinia(PowerOfAttorney);
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        let warning = (wrapper.vm as any).validateLocal();
        expect(warning).toContain('Property Alternate Attorney');

        await wrapper.get(`#${willsHelpers.poa.alternateRelProp.inputId}`).setValue('Sibling');
        await flushPromises();

        warning = (wrapper.vm as any).validateLocal();
        expect(warning).toBeNull();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        expect(api.put).toHaveBeenCalled();
        expect(useIntakeStore().intakeData.poa?.property?.alternateRelationship).toBe('Sibling');
    });

    it('Funeral clears stale conditional details and flushes through commitStep without duplicate page navigation', async () => {
        const wrapper = mountWithPinia(Funeral);
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        await wrapper.get('input[value="burial"]').setValue(true);
        await wrapper.get('input[value="none"]').setValue(true);
        await flushPromises();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(store.intakeData.funeral?.ashesDetails).toBe('');
        expect(store.intakeData.funeral?.serviceDetails).toBe('');
        expect(api.put).toHaveBeenCalled();
    });

    it('PriorWills keeps the foreign-will mismatch confirmation in validateLocal and renders no duplicate page navigation', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const store = useIntakeStore();
        store.intakeData.assets = { list: [] } as any;
        store.intakeData.priorWills = {
            hasPriorWill: 'no',
            priorWillDate: '',
            priorWillLocation: '',
            hasForeignWill: 'yes',
            foreignWillDetails: 'United States will dated 2020',
        } as any;

        const wrapper = mountWithPinia(PriorWills);
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        const warning = (wrapper.vm as any).validateLocal();
        expect(confirmSpy).toHaveBeenCalled();
        expect(warning).toContain('Foreign will details should match');
    });
});
