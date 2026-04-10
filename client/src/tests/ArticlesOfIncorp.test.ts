import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import ArticlesOfIncorp from '../views/incorporation/ArticlesOfIncorp.vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { normalizeIncorpData } from '../utils/incorpData';
import { getLocalTodayISO } from '../utils/incorpArticles';

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

const FieldHelperStub = {
    template: '<div><slot /></div>',
};

const IncorpStepSkeletonStub = {
    template: '<div data-testid="skeleton" />',
};

describe('ArticlesOfIncorp.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountStep = () => mount(ArticlesOfIncorp, {
        global: {
            plugins: [pinia],
            stubs: {
                FieldHelper: FieldHelperStub,
                IncorpStepSkeleton: IncorpStepSkeletonStub,
            },
        },
    });

    const baseData = () => normalizeIncorpData({
        preIncorporation: {
            jurisdiction: 'obca',
            nameType: 'named',
            proposedName: 'Acme',
            legalEnding: 'Inc.',
            nameConfirmed: true,
            nuansReviewed: true,
            nuansReport: { reportDate: '2026-04-01' },
        },
        structureOwnership: {
            shareClasses: [{
                id: 'class_1',
                className: 'Common',
                votingRights: true,
                dividendRights: true,
                liquidationRights: true,
                maxShares: 1000,
            }],
            initialShareholders: [{
                id: 'holder_1',
                fullName: 'Alice Shareholder',
                shareClassId: 'class_1',
                shareClass: 'Common',
                numberOfShares: 10,
            }],
            directors: [{
                id: 'dir_1',
                fullName: 'Jane Director',
                address: '123 Main St',
                isCanadianResident: true,
            }],
            registeredOfficeAddress: '123 Main St',
            registeredOfficeProvince: 'ON',
        },
        articles: {
            corporateName: 'Acme Inc.',
            registeredAddress: '123 Main St',
            directorCountType: 'fixed',
            directorCountFixed: 1,
            shareCapitalDescription: 'Unlimited common shares',
            filingFeePaid: true,
            certificateReceived: false,
            filingMethod: 'obr',
        },
    });

    const getTextInputs = (wrapper: ReturnType<typeof mount>) =>
        wrapper.findAll('input[type="text"], input:not([type])');

    const flushAutosave = async () => {
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();
    };

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-09T12:00:00-04:00'));

        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentStatus = 'started';
        store.incorpData = baseData();

        (api.put as Mock).mockImplementation(async () => ({
            data: { data: store.incorpData },
        }));
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('preserves a manual corporate-name draft across named-numbered toggles', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const store = useIncorpIntakeStore();

        const nameInput = wrapper.find('input[placeholder="Full corporate name including legal ending"]');
        await nameInput.setValue('Custom Draft Inc.');
        await flushPromises();

        store.incorpData.preIncorporation = {
            ...store.incorpData.preIncorporation,
            nameType: 'numbered',
        };
        await flushPromises();

        expect((wrapper.findAll('input').at(0)!.element as HTMLInputElement).value).toBe('Custom Draft Inc.');

        store.incorpData.preIncorporation = {
            ...store.incorpData.preIncorporation,
            nameType: 'named',
            proposedName: 'Renamed',
            legalEnding: 'Inc.',
        };
        await flushPromises();

        expect((wrapper.findAll('input').at(0)!.element as HTMLInputElement).value).toBe('Custom Draft Inc.');
    });

    it('preserves certificate fields locally when unchecked and omits them from the saved payload', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const checkboxes = wrapper.findAll('input[type="checkbox"]');
        await checkboxes[1].setValue(true);
        await flushPromises();

        const numberInput = wrapper.find('input[placeholder="Assigned corporation number"]');
        const dateInput = wrapper.find('input[type="date"]');
        await numberInput.setValue('ONT-777');
        await dateInput.setValue('2026-04-08');
        await flushPromises();

        await checkboxes[1].setValue(false);
        await flushPromises();
        await (wrapper.vm as any).commitStep();
        await flushPromises();

        const savedPayload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data?.articles;
        expect(savedPayload.certificateReceived).toBe(false);
        expect(savedPayload.corporationNumber).toBeUndefined();
        expect(savedPayload.certificateDate).toBeUndefined();

        await checkboxes[1].setValue(true);
        await flushPromises();

        expect((wrapper.find('input[placeholder="Assigned corporation number"]').element as HTMLInputElement).value).toBe('ONT-777');
        expect((wrapper.find('input[type="date"]').element as HTMLInputElement).value).toBe('2026-04-08');
    });

    it('preserves fixed and range director values across mode toggles', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const fixedButton = wrapper.findAll('button').find((button) => button.text() === 'Fixed Number')!;
        const rangeButton = wrapper.findAll('button').find((button) => button.text() === 'Min/Max Range')!;
        const fixedInput = wrapper.find('input[type="number"]');

        await fixedInput.setValue('3');
        await flushPromises();

        await rangeButton.trigger('click');
        await flushPromises();

        const rangeInputs = wrapper.findAll('input[type="number"]');
        await rangeInputs[0].setValue('1');
        await rangeInputs[1].setValue('4');
        await flushPromises();

        await fixedButton.trigger('click');
        await flushPromises();
        expect((wrapper.find('input[type="number"]').element as HTMLInputElement).value).toBe('3');

        await rangeButton.trigger('click');
        await flushPromises();

        const restoredRangeInputs = wrapper.findAll('input[type="number"]');
        expect((restoredRangeInputs[0].element as HTMLInputElement).value).toBe('1');
        expect((restoredRangeInputs[1].element as HTMLInputElement).value).toBe('4');
    });

    it('accepting the Step 1 suggestion resets corporate-name override tracking', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const store = useIncorpIntakeStore();

        const nameInput = wrapper.find('input[placeholder="Full corporate name including legal ending"]');
        await nameInput.setValue('Manual Name Inc.');
        await flushPromises();

        store.incorpData.preIncorporation = {
            ...store.incorpData.preIncorporation,
            proposedName: 'Updated',
            legalEnding: 'Inc.',
        };
        await flushPromises();

        const suggestionButton = wrapper.findAll('button').find((button) => button.text() === 'Updated Inc.')!;
        await suggestionButton.trigger('click');
        await flushPromises();

        store.incorpData.preIncorporation = {
            ...store.incorpData.preIncorporation,
            proposedName: 'Latest',
            legalEnding: 'Inc.',
        };
        await flushPromises();

        expect((wrapper.find('input[placeholder="Full corporate name including legal ending"]').element as HTMLInputElement).value).toBe('Latest Inc.');
    });

    it('accepting the Step 2 suggestion resets registered-address override tracking', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const store = useIncorpIntakeStore();

        const addressInput = wrapper.find('input[placeholder="Street address (P.O. Box not acceptable)"]');
        await addressInput.setValue('Suite 800, 123 King St');
        await flushPromises();

        store.incorpData.structureOwnership = {
            ...store.incorpData.structureOwnership,
            registeredOfficeAddress: '456 Queen St',
        };
        await flushPromises();

        const suggestionButton = wrapper.findAll('button').find((button) => button.text() === '456 Queen St')!;
        await suggestionButton.trigger('click');
        await flushPromises();

        store.incorpData.structureOwnership = {
            ...store.incorpData.structureOwnership,
            registeredOfficeAddress: '789 Bay St',
        };
        await flushPromises();

        expect((wrapper.find('input[placeholder="Street address (P.O. Box not acceptable)"]').element as HTMLInputElement).value).toBe('789 Bay St');
    });

    it('does not misclassify saved suggested values as manual overrides on mount', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...store.incorpData,
            articles: {
                ...store.incorpData.articles,
                corporateName: 'Acme Inc.',
                registeredAddress: '123 Main St',
                corporateNameOverridden: false,
                registeredAddressOverridden: false,
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        store.incorpData.preIncorporation = {
            ...store.incorpData.preIncorporation,
            proposedName: 'Refresh',
            legalEnding: 'Inc.',
        };
        store.incorpData.structureOwnership = {
            ...store.incorpData.structureOwnership,
            registeredOfficeAddress: '500 Wellington St',
        };
        await flushPromises();

        expect((wrapper.find('input[placeholder="Full corporate name including legal ending"]').element as HTMLInputElement).value).toBe('Refresh Inc.');
        expect((wrapper.find('input[placeholder="Street address (P.O. Box not acceptable)"]').element as HTMLInputElement).value).toBe('500 Wellington St');
    });

    it('derives filing method from jurisdiction and serializes the jurisdiction-specific value only', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const store = useIncorpIntakeStore();

        expect(wrapper.text()).toContain('Ontario Business Registry');
        expect(wrapper.text()).not.toContain('Corporations Canada');

        await (wrapper.vm as any).commitStep();
        await flushPromises();
        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.articles?.filingMethod).toBe('obr');

        store.incorpData.preIncorporation = {
            ...store.incorpData.preIncorporation,
            jurisdiction: 'cbca',
        };
        await flushPromises();

        expect(wrapper.text()).toContain('Corporations Canada');
        await (wrapper.vm as any).commitStep();
        await flushPromises();
        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.articles?.filingMethod).toBe('corporations_canada');
    });

    it('shows inline fixed-count errors for zero, negative, and fractional values without correcting them', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const fixedInput = wrapper.find('input[type="number"]');

        await fixedInput.setValue('0');
        await flushPromises();
        expect((fixedInput.element as HTMLInputElement).value).toBe('0');
        expect(wrapper.text()).toContain('Enter a valid fixed number of directors.');

        await fixedInput.setValue('-1');
        await flushPromises();
        expect((fixedInput.element as HTMLInputElement).value).toBe('-1');
        expect(wrapper.text()).toContain('Enter a valid fixed number of directors.');

        await fixedInput.setValue('1.5');
        await flushPromises();
        expect((fixedInput.element as HTMLInputElement).value).toBe('1.5');
        expect(wrapper.text()).toContain('Enter a valid fixed number of directors.');
    });

    it('shows inline range completeness and order errors', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const rangeButton = wrapper.findAll('button').find((button) => button.text() === 'Min/Max Range')!;
        await rangeButton.trigger('click');
        await flushPromises();

        const rangeInputs = wrapper.findAll('input[type="number"]');
        await rangeInputs[0].setValue('2');
        await rangeInputs[1].setValue('');
        await flushPromises();
        expect(wrapper.text()).toContain('Enter both a minimum and maximum director count.');

        await rangeInputs[1].setValue('1');
        await flushPromises();
        expect(wrapper.text()).toContain('Director count maximum must be greater than or equal to minimum.');
    });

    it('surfaces Step 2 director-count mismatch as an inline blocking error', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const fixedInput = wrapper.find('input[type="number"]');

        await fixedInput.setValue('2');
        await flushPromises();

        expect(wrapper.text()).toContain('Articles director count must match the 1 director');
        expect((wrapper.vm as any).validateLocal()).toContain('must match the 1 director');
    });

    it('shows P.O. Box feedback and uses a local-safe certificate date max', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const addressInput = wrapper.find('input[placeholder="Street address (P.O. Box not acceptable)"]');
        await addressInput.setValue('PO Box 100');
        await flushPromises();
        expect(wrapper.text()).toContain('P.O. Box addresses are not acceptable');

        const certificateCheckbox = wrapper.findAll('input[type="checkbox"]')[1];
        await certificateCheckbox.setValue(true);
        await flushPromises();

        expect((wrapper.find('input[type="date"]').element as HTMLInputElement).max).toBe(
            getLocalTodayISO(new Date('2026-04-09T12:00:00-04:00'))
        );
    });

    it('does not render mojibake text', async () => {
        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).not.toContain('â');
        expect(wrapper.text()).not.toContain('ðŸ');
    });

    it('serializes canonical whitespace-trimmed data while keeping local invalid drafts visible', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const addressInput = wrapper.find('input[placeholder="Street address (P.O. Box not acceptable)"]');
        await addressInput.setValue('   ');
        await flushPromises();
        await flushAutosave();

        expect((addressInput.element as HTMLInputElement).value).toBe('   ');
        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.articles?.registeredAddress).toBeUndefined();
    });
});
