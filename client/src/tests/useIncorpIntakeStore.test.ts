import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { normalizeIncorpData } from '../utils/incorpData';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import type { IncorporationData } from '../stores/incorpTypes';

const showToast = vi.fn();

vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

vi.mock('../composables/useToast', () => ({
    useToast: () => ({ showToast }),
}));

const CURRENT_KEY = 'incorpCurrentMatterId:anonymous';
const EXPLICIT_KEY = 'incorpExplicitMatterId:anonymous';
const stepKey = (matterId: string) => `incorpWizardStep:anonymous:${matterId}`;

const makeAxiosError = (status: number, message = 'Request failed') => ({
    response: {
        status,
        data: { message },
    },
});

const makeCompleteData = (): IncorporationData => ({
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
            maxShares: 1000,
            votingRights: true,
            dividendRights: true,
            liquidationRights: true,
        }],
        initialShareholders: [{
            id: 'holder_1',
            fullName: 'Alice Shareholder',
            shareClassId: 'class_1',
            shareClass: 'Common',
            numberOfShares: 100,
        }],
        directors: [{
            id: 'director_1',
            fullName: 'Jane Director',
            address: '123 Main St',
            isCanadianResident: true,
        }],
        registeredOfficeAddress: '123 Main St',
        registeredOfficeProvince: 'ON',
        fiscalYearEnd: '12-31',
    },
    articles: {
        corporateName: 'Acme Inc.',
        registeredAddress: '123 Main St',
        directorCountType: 'fixed',
        directorCountFixed: 1,
        shareCapitalDescription: 'Unlimited common shares',
        filingMethod: 'obr',
        certificateReceived: true,
        corporationNumber: 'ONT-123',
        certificateDate: '2026-03-15',
    },
    postIncorpOrg: {
        generalByLawDrafted: true,
        orgResolutionsPrepared: true,
        officeResolutionPassed: true,
        directorConsents: [{
            id: 'consent_1',
            directorId: 'director_1',
            directorName: 'Jane Director',
            consentSigned: true,
            consentDate: '2026-03-15',
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
            subscriberAddress: '123 Main St',
            considerationAmount: 100,
        }],
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
        bankName: 'RBC Royal Bank',
        minuteBookSetup: true,
    },
});

describe('useIncorpIntakeStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        showToast.mockReset();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('resetDraftState clears ids, version, scoped step state, data, flags, warnings, and load metadata', () => {
        localStorage.setItem(CURRENT_KEY, 'incorp-123');
        localStorage.setItem(stepKey('incorp-123'), 'articles');

        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentVersion = 7;
        store.currentStep = 'articles';
        store.incorpData = {
            preIncorporation: { jurisdiction: 'obca' },
        } as any;
        store.intakeFlags = [{ code: 'FLAG-1', message: 'Flagged' }];
        store.logicWarnings = [{ code: 'WARN-1', message: 'Warned' }];
        store.hasLoaded = true;

        store.resetDraftState();

        expect(store.currentIncorpId).toBeNull();
        expect(store.currentVersion).toBeUndefined();
        expect(store.currentStatus).toBeNull();
        expect(store.currentStep).toBe('jurisdiction-name');
        expect(store.incorpData).toEqual(normalizeIncorpData({}));
        expect(store.intakeFlags).toEqual([]);
        expect(store.logicWarnings).toEqual([]);
        expect(store.hasLoaded).toBe(false);
        expect(localStorage.getItem(CURRENT_KEY)).toBeNull();
        expect(sessionStorage.getItem(EXPLICIT_KEY)).toBeNull();
    });

    it('createIncorpIntake returns create-vs-resume metadata and tracks status and version', async () => {
        const store = useIncorpIntakeStore();
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                status: 201,
                data: { _id: 'inc-new', __v: 0, status: 'started', data: { preIncorporation: { jurisdiction: 'obca' } } },
            } as any)
            .mockResolvedValueOnce({
                status: 200,
                data: { _id: 'inc-existing', __v: 4, status: 'started', data: { preIncorporation: { jurisdiction: 'cbca' } } },
            } as any);

        const created = await store.createIncorpIntake();
        expect(created.wasResumed).toBe(false);
        expect(store.currentIncorpId).toBe('inc-new');
        expect(store.currentVersion).toBe(0);
        expect(store.currentStatus).toBe('started');

        const resumed = await store.createIncorpIntake();
        expect(resumed.wasResumed).toBe(true);
        expect(store.currentIncorpId).toBe('inc-existing');
        expect(store.currentVersion).toBe(4);
        expect(store.currentStatus).toBe('started');
    });

    it('load failures remain errors and ensureLoaded stays retryable', async () => {
        const store = useIncorpIntakeStore();
        vi.mocked(api.get)
            .mockRejectedValueOnce(makeAxiosError(500, 'Server down'))
            .mockRejectedValueOnce(makeAxiosError(404, 'Not found'));

        await expect(store.ensureLoaded()).rejects.toMatchObject({
            response: { status: 500 },
        });
        expect(store.hasLoaded).toBe(false);
        expect(store.lastLoadError?.kind).toBe('server');

        await store.ensureLoaded(true);
        expect(store.hasLoaded).toBe(true);
        expect(store.currentIncorpId).toBeNull();
    });

    it('does not let a stale persisted current id pin the wrong matter', async () => {
        localStorage.setItem(CURRENT_KEY, 'stale-id');

        const store = useIncorpIntakeStore();
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                _id: 'inc-current',
                __v: 3,
                status: 'started',
                data: { preIncorporation: { jurisdiction: 'obca' } },
            },
        } as any);

        await store.loadCurrentIncorpMatter(true);

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('/incorporation/current');
        expect(store.currentIncorpId).toBe('inc-current');
        expect(localStorage.getItem(CURRENT_KEY)).toBe('inc-current');
    });

    it('uses an explicit session-scoped selection when present', async () => {
        sessionStorage.setItem(EXPLICIT_KEY, 'inc-review');

        const store = useIncorpIntakeStore();
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                _id: 'inc-review',
                __v: 6,
                status: 'reviewing',
                data: { preIncorporation: { jurisdiction: 'cbca' } },
            },
        } as any);

        await store.loadCurrentIncorpMatter(true);

        expect(api.get).toHaveBeenCalledWith('/incorporation/inc-review');
        expect(store.currentIncorpId).toBe('inc-review');
        expect(store.currentStatus).toBe('reviewing');
    });

    it('loading a different matter re-scopes the saved step instead of inheriting the old one', async () => {
        localStorage.setItem(stepKey('inc-old'), 'articles');
        localStorage.setItem(CURRENT_KEY, 'inc-old');

        const store = useIncorpIntakeStore();
        store.currentStep = 'articles';

        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                _id: 'inc-new',
                __v: 1,
                status: 'started',
                data: { preIncorporation: { jurisdiction: 'obca' } },
            },
        } as any);

        await store.loadCurrentIncorpMatter(true);

        expect(store.currentIncorpId).toBe('inc-new');
        expect(store.currentStep).toBe('jurisdiction-name');
    });

    it('saveIncorpStep throws when no incorporation matter is selected', async () => {
        const store = useIncorpIntakeStore();
        await expect(store.saveIncorpStep({})).rejects.toThrow(
            'No incorporation matter is currently selected.'
        );
    });

    it('sends expectedVersion on save and stores the returned version', async () => {
        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentVersion = 2;
        store.incorpData = normalizeIncorpData(makeCompleteData());

        vi.mocked(api.put).mockResolvedValueOnce({
            data: {
                _id: 'incorp-123',
                expectedVersion: 3,
                data: makeCompleteData(),
                flags: [],
                logicWarnings: [],
            },
        } as any);

        await store.saveIncorpStep({
            articles: {
                corporateName: 'Acme Holdings Inc.',
            },
        });

        expect(api.put).toHaveBeenCalledWith('/incorporation/incorp-123', {
            data: expect.objectContaining({
                articles: expect.objectContaining({
                    corporateName: 'Acme Holdings Inc.',
                }),
            }),
            expectedVersion: 2,
        });
        expect(store.currentVersion).toBe(3);
    });

    it('surfaces a conflict-specific error path for 409 responses', async () => {
        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentVersion = 4;
        store.incorpData = normalizeIncorpData(makeCompleteData());
        vi.mocked(api.put).mockRejectedValueOnce(makeAxiosError(409, 'Conflict'));

        await expect(store.saveIncorpStep({
            articles: { corporateName: 'Collision Inc.' },
        })).rejects.toBeTruthy();

        expect(store.lastSaveError).toMatchObject({
            kind: 'conflict',
            mode: 'explicit',
            status: 409,
        });
        expect(showToast).toHaveBeenCalledWith(
            'This incorporation was updated in another tab or device. Reload before continuing.',
            'error'
        );
    });

    it('keeps background validation failures quiet but visible in save status state', async () => {
        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.incorpData = normalizeIncorpData(makeCompleteData());
        vi.mocked(api.put).mockRejectedValueOnce(makeAxiosError(400, 'Validation failed'));

        await expect(store.saveIncorpStep({
            structureOwnership: {
                shareClasses: [{ id: 'share_class_1', className: '' }],
            },
        } as any, false, { mode: 'background' })).rejects.toBeTruthy();

        expect(store.lastSaveError).toMatchObject({
            kind: 'validation',
            mode: 'background',
            status: 400,
        });
        expect(showToast).not.toHaveBeenCalled();
    });

    it('does not let an older failed save roll back a newer staged change', async () => {
        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentVersion = 1;
        store.incorpData = normalizeIncorpData(makeCompleteData());

        vi.mocked(api.put)
            .mockRejectedValueOnce(makeAxiosError(500, 'First failed'))
            .mockResolvedValueOnce({
                data: {
                    _id: 'incorp-123',
                    expectedVersion: 2,
                    data: {
                        ...makeCompleteData(),
                        articles: {
                            ...makeCompleteData().articles,
                            corporateName: 'Second Inc.',
                        },
                    },
                    flags: [],
                    logicWarnings: [],
                },
            } as any);

        const firstSave = store.saveIncorpStep({
            articles: { corporateName: 'First Inc.' },
        }).catch(() => undefined);
        const secondSave = store.saveIncorpStep({
            articles: { corporateName: 'Second Inc.' },
        });

        await firstSave;
        await secondSave;

        expect(store.incorpData.articles?.corporateName).toBe('Second Inc.');
    });

    it('resolveResumePath honors the earliest incomplete section instead of a later saved step', () => {
        const store = useIncorpIntakeStore();

        store.currentStatus = 'started';
        store.currentStep = 'banking-setup';
        store.incorpData = {
            preIncorporation: { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true },
        } as any;

        expect(store.resolveResumePath()).toBe('/incorporation/structure-ownership');
    });

    it('nextStep routes non-started matters to review instead of editable wizard steps', () => {
        const store = useIncorpIntakeStore();
        store.currentStatus = 'submitted';
        store.incorpData = normalizeIncorpData(makeCompleteData());

        expect(store.nextStep).toBe('/incorporation/review');
    });

    it('keeps nextStep on structure ownership when only a blank placeholder row exists', () => {
        const store = useIncorpIntakeStore();
        const data = makeCompleteData();
        data.structureOwnership = {
            shareClasses: [{
                id: 'class_1',
                className: '',
                votingRights: true,
                dividendRights: true,
                liquidationRights: true,
                maxShares: 0,
            }],
            initialShareholders: data.structureOwnership?.initialShareholders,
            directors: data.structureOwnership?.directors,
            registeredOfficeAddress: '123 Main St',
            registeredOfficeProvince: 'ON',
        };

        store.incorpData = normalizeIncorpData(data);

        expect(store.nextStep).toBe('/incorporation/structure-ownership');
    });

    it('keeps nextStep on registrations when only a blank municipal licence row is present', () => {
        const store = useIncorpIntakeStore();
        const data = makeCompleteData();
        data.registrations = {
            craRegistered: true,
            craBusinessNumber: '123456789',
            municipalLicences: [{
                id: 'municipal_1',
                municipality: '',
                licenceType: '',
                obtained: false,
            }],
        };

        store.incorpData = normalizeIncorpData(data);

        expect(store.nextStep).toBe('/incorporation/registrations');
    });
});
