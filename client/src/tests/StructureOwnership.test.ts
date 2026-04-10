import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import StructureOwnership from '../views/incorporation/StructureOwnership.vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { normalizeIncorpData } from '../utils/incorpData';

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

describe('StructureOwnership.vue', () => {
    const mountStep = () => mount(StructureOwnership, {
        global: {
            plugins: [pinia],
            stubs: {
                FieldHelper: FieldHelperStub,
                IncorpStepSkeleton: IncorpStepSkeletonStub,
            },
        },
    });

    let pinia: ReturnType<typeof createPinia>;

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.clearAllMocks();
        vi.useFakeTimers();

        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentStatus = 'started';
        store.incorpData = normalizeIncorpData({
            preIncorporation: { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true },
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
                    email: '',
                    shareClassId: 'class_1',
                    shareClass: 'Common',
                    numberOfShares: 100,
                    considerationType: 'cash',
                    considerationAmount: 500,
                }],
                directors: [{
                    id: 'dir_1',
                    fullName: 'Jane Director',
                    address: '123 Main St',
                    isCanadianResident: true,
                }],
                registeredOfficeAddress: '123 Main St',
                fiscalYearEnd: '12-31',
                requiresUSA: false,
                requiresS85Rollover: false,
                isReportingIssuer: false,
            },
            postIncorpOrg: {
                generalByLawDrafted: true,
                orgResolutionsPrepared: true,
                officeResolutionPassed: true,
                directorConsents: [{
                    id: 'consent_1',
                    directorId: 'dir_1',
                    directorName: 'Jane Director',
                    consentSigned: true,
                    consentDate: '2026-04-01',
                }],
            },
            shareIssuance: {
                subscriptionAgreements: [{
                    id: 'agreement_1',
                    shareholderId: 'holder_1',
                    subscriberName: 'Alice Shareholder',
                    shareClassId: 'class_1',
                    shareClass: 'Common',
                    numberOfShares: 100,
                    considerationType: 'cash',
                    considerationAmount: 750,
                    agreementExecuted: true,
                    subscriberAddress: '123 Main St',
                }],
                certificateType: 'certificated',
                securitiesRegisterComplete: true,
                considerationCollected: true,
            },
        });

        (api.put as Mock).mockImplementation(async () => ({
            data: { data: store.incorpData },
        }));
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('keeps blank share counts invalid instead of rewriting them to 1', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const shareInputs = wrapper.findAll('input[type="number"]');
        const shareCountInput = shareInputs[1];

        await shareCountInput.setValue('');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        expect((shareCountInput.element as HTMLInputElement).value).toBe('');
        expect((wrapper.vm as any).validateLocal()).toContain('whole-number share count');
    });

    it('autosaves a blank added share class row without a rejected save path', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const addButton = wrapper.findAll('button').find((button) => button.text() === '+ Add Class');
        expect(addButton).toBeTruthy();

        await addButton!.trigger('click');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        const payload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data?.structureOwnership?.shareClasses?.at(-1);
        expect(payload).toEqual(expect.objectContaining({
            className: '',
            maxShares: 0,
        }));
        expect(showToast).not.toHaveBeenCalled();
    });

    it('does not derive a blank subscription agreement from a newly added blank shareholder row', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const addButton = wrapper.findAll('button').find((button) => button.text() === '+ Add Shareholder');
        expect(addButton).toBeTruthy();

        await addButton!.trigger('click');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        const payload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data;
        expect(payload?.structureOwnership?.initialShareholders).toHaveLength(2);
        expect(payload?.shareIssuance?.subscriptionAgreements || []).toHaveLength(1);
    });

    it('does not derive a blank director consent from a newly added blank director row', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const addButton = wrapper.findAll('button').find((button) => button.text() === '+ Add Director');
        expect(addButton).toBeTruthy();

        await addButton!.trigger('click');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        const payload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data;
        expect(payload?.structureOwnership?.directors).toHaveLength(2);
        expect(payload?.postIncorpOrg?.directorConsents || []).toHaveLength(1);
    });

    it('keeps blank max shares invalid instead of rewriting them to unlimited 0', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const maxSharesInput = wrapper.find('input[type="number"]');
        await maxSharesInput.setValue('');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        expect((maxSharesInput.element as HTMLInputElement).value).toBe('');
        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.structureOwnership?.shareClasses?.[0]?.maxShares).toBeUndefined();
    });

    it('keeps negative consideration invalid instead of rewriting it to 0', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const numberInputs = wrapper.findAll('input[type="number"]');
        const considerationInput = numberInputs[2];

        await considerationInput.setValue('-5');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        expect((considerationInput.element as HTMLInputElement).value).toBe('-5');
        expect((wrapper.vm as any).validateLocal()).toContain('cannot be negative');
    });

    it('preserves legacy shareholder class names without shareClassId on mount and save', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            preIncorporation: { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true },
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
                    id: 'holder_legacy',
                    fullName: 'Legacy Holder',
                    shareClass: 'Legacy Preferred',
                    numberOfShares: 10,
                    considerationType: 'cash',
                    considerationAmount: 0,
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
        });

        const wrapper = mountStep();
        await flushPromises();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const payload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data?.structureOwnership?.initialShareholders?.[0];
        expect(payload.shareClass).toBe('Legacy Preferred');
        expect(payload.shareClassId).toBeUndefined();
    });

    it('defaults OBCA drafts to an Ontario registered office province when empty', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData.structureOwnership = normalizeIncorpData({
            shareClasses: [],
        }).structureOwnership;

        const wrapper = mountStep();
        await flushPromises();

        const provinceSelect = wrapper.findAll('select').at(-1)!;
        expect((provinceSelect.element as HTMLSelectElement).value).toBe('ON');
    });

    it('preserves records office drafts across CBCA toggles and omits them from non-CBCA saves', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...store.incorpData,
            preIncorporation: { jurisdiction: 'cbca', nameType: 'numbered', nameConfirmed: true },
            structureOwnership: {
                ...store.incorpData.structureOwnership,
                registeredOfficeProvince: 'ON',
                recordsOfficeAddress: 'Suite 900, 123 King St',
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        const recordsOfficeInput = wrapper.findAll('input').find((input) =>
            (input.element as HTMLInputElement).value === 'Suite 900, 123 King St'
        );
        expect(recordsOfficeInput?.exists()).toBe(true);

        store.incorpData.preIncorporation = { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true };
        await flushPromises();
        expect(wrapper.text()).not.toContain('Records Office Address');

        store.incorpData.preIncorporation = { jurisdiction: 'cbca', nameType: 'numbered', nameConfirmed: true };
        await flushPromises();

        const restoredRecordsOffice = wrapper.findAll('input').find((input) =>
            (input.element as HTMLInputElement).value === 'Suite 900, 123 King St'
        );
        expect(restoredRecordsOffice?.exists()).toBe(true);

        store.incorpData.preIncorporation = { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true };
        await flushPromises();
        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.structureOwnership?.recordsOfficeAddress).toBeUndefined();
    });

    it('shows inline P.O. Box feedback for the registered office', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const registeredOfficeInput = wrapper.findAll('input[type="text"], input:not([type])')
            .filter((input) => (input.element as HTMLInputElement).value === '123 Main St')
            .at(-1)!;

        await registeredOfficeInput.setValue('PO Box 100');
        await flushPromises();

        expect(wrapper.text()).toContain('physical street address');
    });

    it('requires confirmation before removing shareholders and directors', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const wrapper = mountStep();
        await flushPromises();

        const initialShareholderCount = useIncorpIntakeStore().incorpData.structureOwnership?.initialShareholders?.length;
        const removeButtons = wrapper.findAll('button').filter((button) => button.text() === 'Remove');

        await removeButtons[0].trigger('click');
        await removeButtons[1].trigger('click');
        await flushPromises();

        expect(confirmSpy).toHaveBeenCalledTimes(2);
        expect(useIncorpIntakeStore().incorpData.structureOwnership?.initialShareholders?.length).toBe(initialShareholderCount);
    });

    it('reconciles downstream agreements and consents immediately when step 2 data changes', async () => {
        const wrapper = mountStep();
        await flushPromises();
        const store = useIncorpIntakeStore();

        const textInputs = wrapper.findAll('input[type="text"], input:not([type])');
        await textInputs[1].setValue('Renamed Shareholder');
        await flushPromises();

        expect(store.incorpData.shareIssuance?.subscriptionAgreements?.[0]?.subscriberName).toBe('Renamed Shareholder');
        expect(store.incorpData.shareIssuance?.subscriptionAgreements?.[0]?.agreementExecuted).toBe(true);
        expect(store.incorpData.shareIssuance?.subscriptionAgreements?.[0]?.subscriberAddress).toBe('123 Main St');

        await textInputs[2].setValue('Renamed Director');
        await flushPromises();

        expect(store.incorpData.postIncorpOrg?.directorConsents?.[0]?.directorName).toBe('Renamed Director');
        expect(store.incorpData.postIncorpOrg?.directorConsents?.[0]?.consentSigned).toBe(true);
        expect(store.incorpData.postIncorpOrg?.directorConsents?.[0]?.consentDate).toBe('2026-04-01');
    });

    it('drops orphan agreements and consents when shareholders or directors are removed', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const wrapper = mountStep();
        await flushPromises();
        const store = useIncorpIntakeStore();

        const removeButtons = wrapper.findAll('button').filter((button) => button.text() === 'Remove');
        await removeButtons[0].trigger('click');
        await removeButtons[1].trigger('click');
        await flushPromises();

        expect(confirmSpy).toHaveBeenCalled();
        expect(store.incorpData.shareIssuance?.subscriptionAgreements || []).toHaveLength(0);
        expect(store.incorpData.postIncorpOrg?.directorConsents || []).toHaveLength(0);
    });

    it('renders clean warning copy without mojibake artifacts', async () => {
        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).not.toContain('â');
    });
});
