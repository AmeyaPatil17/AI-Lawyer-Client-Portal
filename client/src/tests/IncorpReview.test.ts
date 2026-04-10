import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import IncorpReview from '../views/incorporation/IncorpReview.vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import api from '../api';

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

const createTestRouter = () =>
    createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/incorporation/review', component: { template: '<div />' } },
            { path: '/dashboard', component: { template: '<div />' } },
        ],
    });

const completeIncorpData = () => ({
    preIncorporation: {
        jurisdiction: 'obca',
        nameType: 'named',
        proposedName: 'Acme',
        legalEnding: 'Inc.',
        nuansReport: { reportDate: '2026-03-01' },
        nuansReviewed: true,
        nameConfirmed: true,
    },
    structureOwnership: {
        shareClasses: [{
            id: 'class_1',
            className: 'Common',
            votingRights: true,
            dividendRights: true,
            liquidationRights: true,
        }],
        initialShareholders: [{ id: 'holder_1', fullName: 'Alice Shareholder', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 100 }],
        directors: [{ id: 'dir_1', fullName: 'Jane Director', address: '123 Main St', isCanadianResident: true }],
        registeredOfficeAddress: '123 Main St',
        registeredOfficeProvince: 'ON',
    },
    articles: {
        corporateName: 'Acme Inc.',
        registeredAddress: '123 Main St',
        directorCountType: 'fixed',
        directorCountFixed: 1,
        shareCapitalDescription: 'Unlimited common shares',
        filingMethod: 'obr',
    },
    postIncorpOrg: {
        generalByLawDrafted: true,
        orgResolutionsPrepared: true,
        officeResolutionPassed: true,
        directorConsents: [{ id: 'consent_1', directorId: 'dir_1', directorName: 'Jane Director', consentSigned: true, consentDate: '2026-03-01' }],
    },
    shareIssuance: {
        subscriptionAgreements: [{ id: 'agreement_1', shareholderId: 'holder_1', subscriberName: 'Alice Shareholder', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 100, subscriberAddress: '123 Main St' }],
        certificateType: 'certificated',
        securitiesRegisterComplete: true,
        considerationCollected: true,
    },
    corporateRecords: {
        hasArticlesAndCertificate: true,
        hasByLaws: true,
        hasDirectorMinutes: true,
        hasShareholderMinutes: true,
        hasWrittenResolutions: true,
        hasSecuritiesRegister: true,
        hasDirectorRegister: true,
        hasOfficerRegister: true,
        hasISCRegister: true,
        recordsLocationConfirmed: true,
    },
    registrations: {
        craRegistered: true,
        craBusinessNumber: '123456789',
    },
    bankingSetup: {
        bankAccountOpened: true,
        bankName: 'RBC',
        minuteBookSetup: true,
    },
    incorpNotes: {
        clientNotes: '',
    },
});

describe('IncorpReview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses the footer submit contract, renders no duplicate in-page navigation, and opens the existing modal', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const store = useIncorpIntakeStore();
        store.hasLoaded = true;
        store.currentIncorpId = 'inc-123';
        store.incorpData = completeIncorpData() as any;

        const router = createTestRouter();
        await router.push('/incorporation/review');
        await router.isReady();

        const wrapper = mount(IncorpReview, {
            global: {
                plugins: [pinia, router],
            },
        });

        await flushPromises();

        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Back')).toBe(false);
        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Submit')).toBe(false);

        await (wrapper.vm as any).triggerPrimaryAction();
        await flushPromises();

        expect(wrapper.text()).toContain('Submit for Review?');
        expect(wrapper.findAll('button').some((button) => button.text().includes('Yes, Submit'))).toBe(true);
    });

    it('mirrors blocking issues through getPrimaryActionState', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const store = useIncorpIntakeStore();
        store.hasLoaded = true;
        store.currentIncorpId = 'inc-123';
        store.incorpData = {
            preIncorporation: {},
        } as any;

        const router = createTestRouter();
        await router.push('/incorporation/review');
        await router.isReady();

        const wrapper = mount(IncorpReview, {
            global: {
                plugins: [pinia, router],
            },
        });

        await flushPromises();

        const state = (wrapper.vm as any).getPrimaryActionState();
        expect(state.disabled).toBe(true);

        (wrapper.vm as any).triggerPrimaryAction();
        expect(showToast).toHaveBeenCalledWith(
            'Resolve the remaining checklist issues before submitting.',
            'error'
        );
    });

    it('flushes review notes through commitStep(true) for footer back preservation', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const store = useIncorpIntakeStore();
        store.hasLoaded = true;
        store.currentIncorpId = 'inc-123';
        store.incorpData = completeIncorpData() as any;

        (api.put as Mock).mockImplementation(async (_url: string, payload: any) => ({
            data: {
                data: {
                    ...store.incorpData,
                    ...payload.data,
                },
            },
        }));

        const router = createTestRouter();
        await router.push('/incorporation/review');
        await router.isReady();

        const wrapper = mount(IncorpReview, {
            global: {
                plugins: [pinia, router],
            },
        });

        await flushPromises();
        await wrapper.get('textarea').setValue('Please call me tomorrow.');
        await flushPromises();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        expect(api.put).toHaveBeenCalledWith('/incorporation/inc-123', {
            data: {
                incorpNotes: {
                    clientNotes: 'Please call me tomorrow.',
                },
            },
        });
        expect(store.incorpData.incorpNotes?.clientNotes).toBe('Please call me tomorrow.');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });
});
