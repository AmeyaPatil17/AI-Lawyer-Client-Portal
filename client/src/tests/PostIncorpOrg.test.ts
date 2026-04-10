import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import PostIncorpOrg from '../views/incorporation/PostIncorpOrg.vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { normalizeIncorpData } from '../utils/incorpData';
import { getLocalTodayISO } from '../utils/incorpPostIncorpOrg';

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

describe('PostIncorpOrg.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const baseData = () => normalizeIncorpData({
        preIncorporation: {
            jurisdiction: 'obca',
            nameType: 'numbered',
            nameConfirmed: true,
        },
        structureOwnership: {
            shareClasses: [{
                id: 'class_1',
                className: 'Common',
                votingRights: true,
                dividendRights: true,
                liquidationRights: true,
                maxShares: 100,
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
            certificateReceived: true,
            filingMethod: 'obr',
        },
        postIncorpOrg: {
            generalByLawDrafted: true,
            bankingByLawSeparate: true,
            bankingByLawDrafted: true,
            orgResolutionsPrepared: true,
            shareholderResolutionPrepared: false,
            auditWaiverResolution: false,
            officeResolutionPassed: true,
            directorConsents: [{
                id: 'consent_1',
                directorId: 'dir_1',
                directorName: 'Jane Director',
                consentSigned: true,
                consentDate: '2026-04-01',
            }],
        },
    });

    const mountStep = () => mount(PostIncorpOrg, {
        global: {
            plugins: [pinia],
            stubs: {
                FieldHelper: FieldHelperStub,
                IncorpStepSkeleton: IncorpStepSkeletonStub,
            },
        },
    });

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

        (api.put as Mock).mockImplementation(async (_url, payload) => ({
            data: { data: { ...store.incorpData, ...payload.data } },
        }));
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('does not rewrite or autosave untouched stored consents on mount', async () => {
        const wrapper = mountStep();
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        expect((api.put as Mock)).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('1 of 1 active consents complete');
        expect((wrapper.find('input[readonly]').element as HTMLInputElement).value).toBe('Jane Director');
    });

    it('preserves separate banking by-law drafts locally and omits them from serialized saves when inactive', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const labels = wrapper.findAll('label');
        const separateToggle = labels.find((label) => label.text().includes('Banking or borrowing by-law is separate'))!.find('input');
        const separateDraftToggle = labels.find((label) => label.text().includes('Separate banking by-law drafted'))!.find('input');

        expect((separateDraftToggle.element as HTMLInputElement).checked).toBe(true);

        await separateToggle.setValue(false);
        await flushPromises();
        await (wrapper.vm as any).commitStep();
        await flushPromises();

        const savedPayload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data?.postIncorpOrg;
        expect(savedPayload.bankingByLawSeparate).toBe(false);
        expect(savedPayload.bankingByLawDrafted).toBeUndefined();

        await separateToggle.setValue(true);
        await flushPromises();

        const restoredToggle = wrapper.findAll('label').find((label) => label.text().includes('Separate banking by-law drafted'))!.find('input');
        expect((restoredToggle.element as HTMLInputElement).checked).toBe(true);
    });

    it('mark all signed populates blank consent dates with the local current date', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...baseData(),
            structureOwnership: {
                ...baseData().structureOwnership,
                directors: [
                    { id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true },
                    { id: 'dir_2', fullName: 'John Director', address: '456 Queen St', isCanadianResident: true },
                ],
            },
            postIncorpOrg: {
                ...baseData().postIncorpOrg,
                directorConsents: [
                    { id: 'consent_1', directorId: 'dir_1', directorName: 'Jane Director', consentSigned: false, consentDate: '' },
                    { id: 'consent_2', directorId: 'dir_2', directorName: 'John Director', consentSigned: false, consentDate: '' },
                ],
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Mark All Signed');
        expect(button).toBeTruthy();
        await button!.trigger('click');
        await flushPromises();

        const dates = wrapper.findAll('input[type="date"]').map((input) => (input.element as HTMLInputElement).value);
        expect(dates).toEqual([getLocalTodayISO(new Date('2026-04-09T12:00:00-04:00')), getLocalTodayISO(new Date('2026-04-09T12:00:00-04:00'))]);
        expect(wrapper.text()).toContain('2 of 2 active consents complete');
        expect(wrapper.text()).not.toContain('Enter a consent date');
    });

    it('clears and disables the consent date when a consent is unchecked', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const consentCheckbox = wrapper.findAll('input[type="checkbox"]').at(-1)!;
        expect((wrapper.find('input[type="date"]').element as HTMLInputElement).disabled).toBe(false);

        await consentCheckbox.setValue(false);
        await flushPromises();

        const dateInput = wrapper.find('input[type="date"]');
        expect((dateInput.element as HTMLInputElement).value).toBe('');
        expect((dateInput.element as HTMLInputElement).disabled).toBe(true);
    });

    it('shows no eligible directors when Step 2 only has blank director placeholders', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...baseData(),
            structureOwnership: {
                ...baseData().structureOwnership,
                directors: [{
                    id: 'dir_blank',
                    fullName: '',
                    address: '123 Main St',
                    isCanadianResident: true,
                }],
            },
            postIncorpOrg: {
                ...baseData().postIncorpOrg,
                directorConsents: [],
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).toContain('No eligible directors available yet');
        expect(wrapper.findAll('input[readonly]')).toHaveLength(0);
    });

    it('retains orphaned consent history until the user confirms sync removal', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...baseData(),
            structureOwnership: {
                ...baseData().structureOwnership,
                directors: [],
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).toContain('outdated consent retained');
        expect(wrapper.findAll('input[readonly]')).toHaveLength(1);
        expect((api.put as Mock)).not.toHaveBeenCalled();

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const syncButton = wrapper.findAll('button').find((candidate) => candidate.text() === 'Sync Directors')!;
        await syncButton.trigger('click');
        await flushAutosave();

        expect(confirmSpy).toHaveBeenCalled();
        expect(wrapper.findAll('input[readonly]')).toHaveLength(0);
        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.postIncorpOrg?.directorConsents).toEqual([]);
    });

    it('does not silently inherit consent history when legacy-name matching is ambiguous', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...baseData(),
            structureOwnership: {
                ...baseData().structureOwnership,
                directors: [
                    { fullName: 'Chris Director', address: '1 King St', isCanadianResident: true },
                    { fullName: 'Chris Director', address: '2 King St', isCanadianResident: true },
                ],
            },
            postIncorpOrg: {
                ...baseData().postIncorpOrg,
                directorConsents: [{
                    directorName: 'Chris Director',
                    consentSigned: true,
                    consentDate: '2026-04-01',
                }],
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).toContain('ambiguous director match');
        expect(wrapper.text()).toContain('could not be matched safely');
        expect(wrapper.findAll('input[readonly]')).toHaveLength(3);
        expect(wrapper.text()).toContain('0 of 2 active consents complete');
    });

    it('renders inline future-date and date-without-signature errors', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...baseData(),
            structureOwnership: {
                ...baseData().structureOwnership,
                directors: [
                    { id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true },
                    { id: 'dir_2', fullName: 'John Director', address: '456 Queen St', isCanadianResident: true },
                ],
            },
            postIncorpOrg: {
                ...baseData().postIncorpOrg,
                directorConsents: [
                    {
                        id: 'consent_1',
                        directorId: 'dir_1',
                        directorName: 'Jane Director',
                        consentSigned: true,
                        consentDate: '2099-01-01',
                    },
                    {
                        id: 'consent_2',
                        directorId: 'dir_2',
                        directorName: 'John Director',
                        consentSigned: false,
                        consentDate: '2026-04-01',
                    },
                ],
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).toContain('Consent date cannot be in the future for Jane Director.');
        expect(wrapper.text()).toContain('Mark John Director as signed or clear the consent date.');
    });

    it('shows the certificate prerequisite banner and advisory resolution copy', async () => {
        const store = useIncorpIntakeStore();
        store.incorpData = normalizeIncorpData({
            ...baseData(),
            articles: {
                certificateReceived: false,
                filingMethod: 'obr',
            },
            structureOwnership: {
                ...baseData().structureOwnership,
                initialShareholders: [
                    { id: 'holder_1', fullName: 'Alice Shareholder', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 5 },
                    { id: 'holder_2', fullName: 'Bob Shareholder', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 5 },
                ],
            },
        });

        const wrapper = mountStep();
        await flushPromises();

        expect(wrapper.text()).toContain('Articles does not yet show the Certificate of Incorporation as received.');
        expect(wrapper.text()).toContain('Optional shareholder resolution confirming by-laws prepared');
        expect(wrapper.text()).toContain('Requires unanimous shareholder consent from all 2 shareholders if used.');
    });
});
