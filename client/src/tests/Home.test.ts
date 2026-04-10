import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { nextTick, reactive } from 'vue';
import Home from '../views/Home.vue';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

type MockUser = {
  role: string;
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
};

const mockAuthStore = reactive<{
  isAuthenticated: boolean;
  user: MockUser | null;
}>({
  isAuthenticated: false,
  user: null,
});

vi.mock('../stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/login', component: { template: '<div />' } },
    { path: '/triage', component: { template: '<div />' } },
    { path: '/incorp-triage', component: { template: '<div />' } },
    { path: '/wizard/:step', component: { template: '<div />' } },
    { path: '/wizard/review', component: { template: '<div />' } },
    { path: '/incorporation/:step', component: { template: '<div />' } },
    { path: '/incorporation/review', component: { template: '<div />' } },
    { path: '/dashboard', component: { template: '<div />' } },
    { path: '/lawyer', component: { template: '<div />' } },
    { path: '/admin', component: { template: '<div />' } },
  ],
});

let wrappers: any[] = [];

const mountHome = () => {
  const wrapper = mount(Home, {
    global: {
      plugins: [createPinia(), router],
    },
  });
  wrappers.push(wrapper);
  return wrapper;
};

const now = new Date().toISOString();

const makeIntake = (overrides: Partial<{
  _id: string;
  type: 'will' | 'incorporation';
  status: 'started' | 'submitted' | 'reviewing' | 'completed';
  data: Record<string, any>;
  updatedAt: string;
  createdAt: string;
}> = {}) => ({
  _id: overrides._id ?? 'matter-1',
  type: overrides.type ?? 'will',
  status: overrides.status ?? 'started',
  data: overrides.data ?? {},
  createdAt: overrides.createdAt ?? now,
  updatedAt: overrides.updatedAt ?? now,
});

const completeWillData = {
  triage: { hasMinors: false },
  personalProfile: { fullName: 'Alice', dateOfBirth: '1990-01-01', maritalStatus: 'single' },
  family: { maritalStatus: 'single', children: [] },
  executors: { primary: { fullName: 'Bob' } },
  beneficiaries: { beneficiaries: [{ fullName: 'Charlie', share: 100 }] },
  assets: { list: [] },
  poa: {
    property: { primaryName: 'Dave', primaryRelationship: 'Sibling' },
    personalCare: { primaryName: 'Eve', primaryRelationship: 'Friend' },
  },
  funeral: { type: 'Cremation' },
  priorWills: { hasPriorWill: 'no' },
};

const invalidExecutorsWillData = {
  ...completeWillData,
  executors: {
    primary: { fullName: 'Bob' },
    alternates: [{ fullName: 'Bob', relationship: 'Sibling' }],
  },
};

const completeIncorpData = {
  preIncorporation: {
    jurisdiction: 'obca',
    nameType: 'numbered',
    nameConfirmed: true,
  },
  structureOwnership: {
    shareClasses: [{
      id: 'class-a',
      className: 'Common',
      maxShares: 100,
      votingRights: true,
      dividendRights: true,
      liquidationRights: true,
    }],
    initialShareholders: [{
      id: 'holder-1',
      fullName: 'Alice',
      shareClassId: 'class-a',
      numberOfShares: 10,
    }],
    directors: [{ id: 'director-1', fullName: 'Alice', address: '1 Main St' }],
    registeredOfficeAddress: '1 Main St',
    registeredOfficeProvince: 'ON',
    isReportingIssuer: false,
    requiresUSA: false,
    requiresS85Rollover: false,
  },
  articles: {
    registeredAddress: '1 Main St',
    directorCountType: 'fixed',
    directorCountFixed: 1,
    shareCapitalDescription: 'Common shares',
    filingMethod: 'obr',
  },
  postIncorpOrg: {
    generalByLawDrafted: true,
    bankingByLawSeparate: false,
    orgResolutionsPrepared: true,
    officeResolutionPassed: true,
    directorConsents: [{ directorId: 'director-1', directorName: 'Alice', consentSigned: true, consentDate: '2025-01-01' }],
  },
  shareIssuance: {
    subscriptionAgreements: [{
      shareholderId: 'holder-1',
      subscriberName: 'Alice',
      subscriberAddress: '1 Main St',
      shareClassId: 'class-a',
      numberOfShares: 10,
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
    recordsLocationConfirmed: true,
    hasISCRegister: true,
    hasUSACopy: false,
  },
  registrations: {
    craRegistered: true,
    craBusinessNumber: '123456789',
    hstGstRegistered: false,
    payrollAccountRegistered: false,
    extraProvincialRegistered: false,
    wsibRegistered: false,
    municipalLicences: [],
  },
  bankingSetup: {
    bankAccountOpened: true,
    bankName: 'Test Bank',
    minuteBookSetup: true,
    accountantEngaged: false,
    insuranceObtained: false,
    agreementsDrafted: false,
    shareCertificatesOrdered: true,
  },
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('Home.vue', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.user = null;
    await router.push('/');
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    wrappers = [];
  });

  it('renders the client portal heading and supported client cards', () => {
    const wrapper = mountHome();
    expect(wrapper.text()).toContain('Valiant Law');
    expect(wrapper.text()).toContain('Client Portal');
    expect(wrapper.text()).toContain('Wills & Estate Planning');
    expect(wrapper.text()).toContain('Business Incorporation');
  });

  it('shows the sign-in prompt for unauthenticated users', () => {
    const wrapper = mountHome();
    expect(wrapper.text()).toContain('Sign in to your account');
    expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(false);
  });

  it('shows the client dashboard link for authenticated clients', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', name: 'Alice', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({ data: [] });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(true);
  });

  it('shows /admin for authenticated admins and hides the client intake cards', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'admin', id: 'admin-1', email: 'admin@example.com' };

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.find('a[href="/admin"]').exists()).toBe(true);
    expect(wrapper.find('#home-estate-cta').exists()).toBe(false);
    expect(wrapper.find('#home-incorp-cta').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Residential Real Estate');
  });

  it('shows /lawyer for authenticated lawyers and hides the client intake cards', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'lawyer', id: 'lawyer-1', email: 'lawyer@example.com' };

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.find('a[href="/lawyer"]').exists()).toBe(true);
    expect(wrapper.find('#home-estate-cta').exists()).toBe(false);
    expect(wrapper.find('#home-incorp-cta').exists()).toBe(false);
  });

  it('disables supported service cards while the authenticated intake fetch is unresolved', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockReturnValue(new Promise(() => {}));

    const wrapper = mountHome();
    await nextTick();

    expect(wrapper.get('#home-estate-cta').attributes('aria-disabled')).toBe('true');
    expect(wrapper.get('#home-incorp-cta').attributes('aria-disabled')).toBe('true');
    expect(wrapper.text()).toContain('Loading...');
  });

  it('treats an invalid /intake/me payload as an error state instead of empty success', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({ data: { invalid: true } });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-matter-error').exists()).toBe(true);
    expect(wrapper.get('#home-estate-cta').text()).toContain('Unavailable');
    expect(wrapper.get('#home-incorp-cta').text()).toContain('Unavailable');
  });

  it('shows retry UI on fetch failure and restores supported CTAs after a successful retry', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: [] });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-retry-btn').exists()).toBe(true);
    expect(wrapper.get('#home-estate-cta').attributes('aria-disabled')).toBe('true');

    await wrapper.get('#home-retry-btn').trigger('click');
    await flushPromises();

    expect(wrapper.find('#home-retry-btn').exists()).toBe(false);
    expect(wrapper.get('#home-estate-cta').text()).toContain('Begin Intake');
    expect(wrapper.get('#home-incorp-cta').text()).toContain('Begin Intake');
  });

  it('shows Continue for a started will intake and routes to the next incomplete wizard step', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', name: 'Alice', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [
        makeIntake({
          _id: 'will-1',
          type: 'will',
          status: 'started',
          data: {
            personalProfile: { fullName: 'Alice', dateOfBirth: '1990-01-01', maritalStatus: 'single' },
          },
        }),
      ],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Continue');

    await wrapper.get('#home-estate-cta').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('intakeId')).toBe('will-1');
    expect(router.currentRoute.value.fullPath).toBe('/wizard/family');
  });

  it('shows Review Summary for a 100% complete started will intake', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [makeIntake({ _id: 'will-complete', type: 'will', data: completeWillData })],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Review Summary');

    await wrapper.get('#home-estate-cta').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/wizard/review');
  });

  it('keeps a will intake on Continue when executors are invalid and routes back to executors', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [makeIntake({ _id: 'will-invalid-executors', type: 'will', data: invalidExecutorsWillData })],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Continue');
    expect(wrapper.get('[data-testid="home-estate-card"]').text()).not.toContain('Review your answers before submitting');

    await wrapper.get('#home-estate-cta').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('intakeId')).toBe('will-invalid-executors');
    expect(router.currentRoute.value.fullPath).toBe('/wizard/executors');
  });

  it('keeps a will intake on Continue when POA is invalid and routes back to poa', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [makeIntake({
        _id: 'will-invalid-poa',
        type: 'will',
        data: {
          ...completeWillData,
          poa: {
            property: { primaryName: 'Dave', primaryRelationship: '' },
            personalCare: { primaryName: 'Eve', primaryRelationship: 'Friend' },
          },
        },
      })],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Continue');

    await wrapper.get('#home-estate-cta').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('intakeId')).toBe('will-invalid-poa');
    expect(router.currentRoute.value.fullPath).toBe('/wizard/poa');
  });

  it('shows Review Summary for a 100% complete started incorporation intake', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [makeIntake({ _id: 'incorp-complete', type: 'incorporation', data: completeIncorpData })],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-incorp-cta').text()).toContain('Review Summary');

    await wrapper.get('#home-incorp-cta').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/incorporation/review');
  });

  it('shows distinct submitted and reviewing labels and helper text', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [
        makeIntake({ _id: 'will-submitted', type: 'will', status: 'submitted' }),
        makeIntake({ _id: 'incorp-reviewing', type: 'incorporation', status: 'reviewing' }),
      ],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Submission Received');
    expect(wrapper.get('[data-testid=\"home-estate-card\"]').text()).toContain('queued for review');
    expect(wrapper.get('#home-incorp-cta').text()).toContain('Under Lawyer Review');
    expect(wrapper.get('[data-testid=\"home-incorp-card\"]').text()).toContain('actively reviewing');
  });

  it('shows Start New Intake plus a latest-summary link when only completed matters exist', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [makeIntake({ _id: 'will-completed', type: 'will', status: 'completed' })],
    });

    localStorage.setItem('intakeId', 'stale-will');
    localStorage.setItem('wizardStep', 'assets');

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Start New Intake');
    expect(wrapper.get('#home-estate-summary-link').attributes('href')).toBe('/wizard/review');

    await wrapper.get('#home-estate-cta').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('intakeId')).toBeNull();
    expect(localStorage.getItem('wizardStep')).toBeNull();
    expect(router.currentRoute.value.fullPath).toBe('/triage');
  });

  it('clears stale draft state for modified-click fresh starts without changing the current route', async () => {
    mockAuthStore.isAuthenticated = false;
    localStorage.setItem('intakeId', 'stale-will');
    localStorage.setItem('wizardStep', 'assets');

    const wrapper = mountHome();
    await flushPromises();

    await wrapper.get('#home-estate-cta').trigger('click', { ctrlKey: true });

    expect(localStorage.getItem('intakeId')).toBeNull();
    expect(localStorage.getItem('wizardStep')).toBeNull();
    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it('navigates through the secondary summary link without falling back to the primary matter route', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [
        makeIntake({
          _id: 'will-started',
          type: 'will',
          status: 'started',
          data: {
            personalProfile: { fullName: 'Alice', dateOfBirth: '1990-01-01', maritalStatus: 'single' },
          },
        }),
        makeIntake({
          _id: 'will-completed',
          type: 'will',
          status: 'completed',
          updatedAt: '2026-03-01T12:00:00.000Z',
        }),
      ],
    });

    const wrapper = mountHome();
    await flushPromises();

    await wrapper.get('#home-estate-summary-link').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('intakeId')).toBe('will-completed');
    expect(router.currentRoute.value.fullPath).toBe('/wizard/review');
  });

  it('prioritizes the newest started matter over a newer reviewing matter of the same type', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any).mockResolvedValue({
      data: [
        makeIntake({
          _id: 'will-reviewing',
          type: 'will',
          status: 'reviewing',
          updatedAt: '2026-03-31T12:00:00.000Z',
        }),
        makeIntake({
          _id: 'will-started',
          type: 'will',
          status: 'started',
          updatedAt: '2026-03-30T12:00:00.000Z',
          data: {
            personalProfile: { fullName: 'Alice', dateOfBirth: '1990-01-01', maritalStatus: 'single' },
          },
        }),
      ],
    });

    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Continue');
    expect(wrapper.get('[data-testid=\"home-estate-card\"]').text()).toContain('1 other matter is also on file.');

    await wrapper.get('#home-estate-cta').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('intakeId')).toBe('will-started');
    expect(router.currentRoute.value.fullPath).toBe('/wizard/family');
  });

  it('refetches when the authenticated client identity changes without a role change', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any)
      .mockResolvedValueOnce({ data: [makeIntake({ _id: 'alice-will', status: 'submitted' })] })
      .mockResolvedValueOnce({ data: [] });

    const wrapper = mountHome();
    await flushPromises();
    expect(wrapper.get('#home-estate-cta').text()).toContain('Submission Received');

    mockAuthStore.user = { role: 'client', id: 'client-2', email: 'bob@example.com' };
    await nextTick();
    await flushPromises();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(wrapper.get('#home-estate-cta').text()).toContain('Begin Intake');
  });

  it('ignores stale fetch responses when client identity changes mid-request', async () => {
    const firstRequest = deferred<{ data: any[] }>();
    const secondRequest = deferred<{ data: any[] }>();

    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { role: 'client', id: 'client-1', email: 'alice@example.com' };
    (api.get as any)
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const wrapper = mountHome();
    await nextTick();

    mockAuthStore.user = { role: 'client', id: 'client-2', email: 'bob@example.com' };
    await nextTick();

    secondRequest.resolve({ data: [] });
    await flushPromises();
    expect(wrapper.get('#home-estate-cta').text()).toContain('Begin Intake');

    firstRequest.resolve({ data: [makeIntake({ _id: 'stale-will', status: 'submitted' })] });
    await flushPromises();

    expect(wrapper.get('#home-estate-cta').text()).toContain('Begin Intake');
    expect(wrapper.get('#home-estate-cta').text()).not.toContain('Submission Received');
  });

  it('renders supported service CTAs as links when active', async () => {
    const wrapper = mountHome();

    expect(wrapper.get('#home-estate-cta').element.tagName).toBe('A');
    expect(wrapper.get('#home-estate-cta').attributes('href')).toBe('/triage');
    expect(wrapper.get('#home-incorp-cta').element.tagName).toBe('A');
    expect(wrapper.get('#home-incorp-cta').attributes('href')).toBe('/incorp-triage');
  });
});
