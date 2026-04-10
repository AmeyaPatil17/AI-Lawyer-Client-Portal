import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import api from '../api';

// --- Mocks ---

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const showToast = vi.fn();
vi.mock('../composables/useToast', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../components/common/SkeletonLoader.vue', () => ({
  default: { template: '<div data-testid="skeleton" />' },
}));

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/wizard/:step', component: { template: '<div />' } },
    { path: '/wizard/review', component: { template: '<div />' } },
    { path: '/incorp-triage', component: { template: '<div />' } },
    { path: '/incorporation/:step', component: { template: '<div />' } },
    { path: '/incorporation/review', component: { template: '<div />' } },
    { path: '/triage', component: { template: '<div />' } },
    { path: '/login', component: { template: '<div />' } },
  ],
});

// --- Helpers ---

const mountDashboard = () =>
  mount(Dashboard, {
    global: {
      plugins: [createPinia(), router],
      stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
    },
  });

const now = new Date().toISOString();

const makeIntake = (overrides: Partial<{
  _id: string; type: string; status: string; data: any;
  updatedAt: string; createdAt: string; submittedAt: string;
  flags: Array<{ type: string; code: string; message: string }>;
}> = {}) => ({
  _id:       overrides._id       ?? '1',
  type:      overrides.type      ?? 'will',
  status:    overrides.status    ?? 'started',
  data:      overrides.data      ?? {},
  createdAt: overrides.createdAt ?? now,
  updatedAt: overrides.updatedAt ?? now,
  ...(overrides.submittedAt ? { submittedAt: overrides.submittedAt } : {}),
  ...(overrides.flags       ? { flags: overrides.flags } : {}),
});

const makeResponse = (intakes: any[] = []) => ({ data: intakes });

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

// --- Tests ---

describe('Dashboard.vue (Generic Hub)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify({ name: 'Alice', email: 'alice@example.com' }));
    localStorage.setItem('token', 'mock-token');
  });

  // ── Existing Tests (enum fixed: 'estate-plan' → 'will') ──────────────────

  it('shows skeleton while loading and main content after load', async () => {
    let resolve: (v: any) => void;
    (api.get as any).mockReturnValue(new Promise(r => { resolve = r; }));

    const wrapper = mountDashboard();
    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true);

    resolve!(makeResponse([makeIntake({ type: 'will' })]));
    await flushPromises();

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Your Active Submissions');
  });

  it('shows personalized greeting and zero-state when no intakes exist', async () => {
    (api.get as any).mockResolvedValue(makeResponse([]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Welcome Back, Alice');
    expect(wrapper.text()).toContain('Start a new legal service');
    expect(wrapper.text()).not.toContain('Your Active Submissions');
  });

  it('renders multiple active service cards correctly', async () => {
    (api.get as any).mockResolvedValue(makeResponse([
      makeIntake({ _id: '1', type: 'will' }),
      makeIntake({ _id: '2', type: 'incorporation' }),
    ]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Wills & Estate Planning');
    expect(wrapper.text()).toContain('Business Incorporation');
    expect(wrapper.text()).toContain('You have 2 active services in progress.');
  });

  it('computes 0% progress for empty estate plan', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ type: 'will', data: {} })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('0%');
    expect(wrapper.text()).toContain('Resume Questionnaire');
  });

  it('always shows Start a New Service section', async () => {
    (api.get as any).mockResolvedValue(makeResponse([]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Start a New Service');
    const links = wrapper.findAll('a');
    expect(links.some(l => l.attributes('href') === '/triage')).toBe(true);
    expect(links.some(l => l.attributes('href') === '/incorp-triage')).toBe(true);
  });

  it('shows error toast on fetch failure', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    mountDashboard();
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load'),
      'error'
    );
  });

  // ── New Tests ─────────────────────────────────────────────────────────────

  it('shows retry button when fetch fails and retries successfully', async () => {
    (api.get as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(makeResponse([makeIntake({ type: 'will' })]));

    const wrapper = mountDashboard();
    await flushPromises();

    const retryBtn = wrapper.find('#dashboard-retry-btn');
    expect(retryBtn.exists()).toBe(true);

    await retryBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('#dashboard-retry-btn').exists()).toBe(false);
    expect(wrapper.text()).toContain('Your Active Submissions');
  });

  it('clicking Resume sets intakeId in localStorage and navigates', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ _id: 'abc123', type: 'will' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    const resumeBtn = wrapper.find('#intake-action-abc123');
    expect(resumeBtn.exists()).toBe(true);
    await resumeBtn.trigger('click');

    expect(localStorage.getItem('intakeId')).toBe('abc123');
  });

  it('sets incorpIntakeId when resuming an incorporation intake', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ _id: 'incorp1', type: 'incorporation' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    const btn = wrapper.find('#intake-action-incorp1');
    expect(btn.exists()).toBe(true);
    expect(btn.attributes('href')).toBe('/incorporation/jurisdiction-name');
    await btn.trigger('click');

    expect(localStorage.getItem('incorpIntakeId')).toBe('incorp1');
  });

  it('shows Questionnaire Complete and Review Summary for fully-complete estate intake', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ type: 'will', data: completeWillData })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Questionnaire Complete');
    expect(wrapper.text()).toContain('Review Summary');
  });

  it('shows all-complete greeting when every intake has 100% progress', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ status: 'submitted', data: completeWillData })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('All your active submissions are complete or under review.');
  });

  it('keeps dashboard progress incomplete when executor data is invalid', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve(makeResponse([makeIntake({ status: 'started', data: invalidExecutorsWillData })]));
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      if (url.includes('/insight')) return Promise.reject(new Error('no insight'));
      return Promise.resolve({ data: [] });
    });

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Questionnaire Complete');
    expect(wrapper.text()).toContain('Resume Questionnaire');
    expect(wrapper.text()).toContain('88%');
    expect(wrapper.text()).toContain('Continue Your Questionnaire');
    expect(wrapper.text()).not.toContain('Ready to Submit');
  });

  it('keeps dashboard progress incomplete when POA relationships are missing', async () => {
    const invalidPoaWillData = {
      ...completeWillData,
      poa: {
        property: { primaryName: 'Dave', primaryRelationship: '' },
        personalCare: { primaryName: 'Eve', primaryRelationship: 'Friend' },
      },
    };

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve(makeResponse([makeIntake({ status: 'started', data: invalidPoaWillData })]));
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      if (url.includes('/insight')) return Promise.reject(new Error('no insight'));
      return Promise.resolve({ data: [] });
    });

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Questionnaire Complete');
    expect(wrapper.text()).toContain('88%');
    expect(wrapper.text()).toContain('Continue Your Questionnaire');
  });

  it('renders status-mapped badge: submitted → Under Review', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ status: 'submitted' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Under Review');
  });

  it('renders status-mapped badge: reviewing → Lawyer Reviewing', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ status: 'reviewing' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Lawyer Reviewing');
  });

  it('renders status-mapped badge: completed → Completed', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ status: 'completed' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Completed');
  });

  it('hides CTA for will service type when will intake already exists', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ type: 'will' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('You already have an active will intake.');
    // The Begin Intake link for the estate service should not exist
    const estateLink = wrapper.find('#cta-estate');
    expect(estateLink.exists()).toBe(false);
  });

  it('hides CTA for incorporation when incorporation intake already exists', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ type: 'incorporation' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('You already have an active incorporation intake.');
    const incorpLink = wrapper.find('#cta-incorp');
    expect(incorpLink.exists()).toBe(false);
  });

  it('Start Over button calls DELETE /intake/:id and refreshes', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ _id: 'del1', type: 'will', status: 'started' })]));
    (api.delete as any).mockResolvedValue({});
    // Second call returns empty list (intake deleted)
    (api.get as any)
      .mockResolvedValueOnce(makeResponse([makeIntake({ _id: 'del1', type: 'will', status: 'started' })]))
      .mockResolvedValueOnce(makeResponse([]));

    const wrapper = mountDashboard();
    await flushPromises();

    // Click Start Over
    const resetBtn = wrapper.find('#intake-reset-del1');
    expect(resetBtn.exists()).toBe(true);
    await resetBtn.trigger('click');
    await flushPromises();

    // Confirm dialog appears — click confirm
    const confirmBtn = wrapper.find('#reset-confirm-btn');
    expect(confirmBtn.exists()).toBe(true);
    await confirmBtn.trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/intake/del1');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('reset'), 'success');
  });

  it('displays updated timestamp on intake card', async () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ updatedAt: past })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Updated');
    expect(wrapper.text()).toMatch(/2h ago|just now|1h ago/);
  });

  it('shows dynamic sidebar What\'s Next panel based on intake status', async () => {
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ status: 'reviewing' })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain("What's Next");
    expect(wrapper.text()).toContain('Under Lawyer Review');
  });

  it('shows Recent Activity panel with intake events', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve(makeResponse([makeIntake({ type: 'will', status: 'submitted' })]));
      if (url === '/auth/activity') return Promise.resolve({ data: [{ action: 'intake.submit', createdAt: new Date().toISOString() }] });
      return Promise.resolve({ data: [] });
    });
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Recent Activity');
    expect(wrapper.text()).toContain('Intake submitted for review');
  });

  // ── Bug Regression Tests ─────────────────────────────────────────────────

  it('Bug 1: progress for estate intake WITH minor children counts guardians step (9 steps)', async () => {
    // Estate intake with minor children — guardians step should be included
    const dataWithMinor = {
      triage: { hasMinors: true },
      personalProfile: { fullName: 'Alice', dateOfBirth: '1990-01-01', maritalStatus: 'single' },
      family: { maritalStatus: 'single', children: [{ fullName: 'Zoe', isMinor: true }] },
      executors:      { primary: { fullName: 'Bob' } },
      beneficiaries:  { beneficiaries: [{ fullName: 'Charlie', share: 100 }] },
      assets:         { list: [] },
      poa:            {
        property: { primaryName: 'Dave', primaryRelationship: 'Sibling' },
        personalCare: { primaryName: 'Eve', primaryRelationship: 'Friend' },
      },
      funeral:        { type: 'Cremation' },
      priorWills:     { hasPriorWill: 'no' },
      // guardians NOT filled — so progress should NOT be 100%
    };
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ type: 'will', data: dataWithMinor })]));
    const wrapper = mountDashboard();
    await flushPromises();

    // Has 8 of 9 steps complete — should NOT say "Questionnaire Complete"
    expect(wrapper.text()).not.toContain('Questionnaire Complete');
    // Progress should be 89% (8/9 steps = 88.88% → rounds up to 89%)
    expect(wrapper.text()).toContain('89%');
  });

  it('Bug 1: progress for estate intake WITHOUT minor children excludes guardians step (8 steps)', async () => {
    const dataNoMinor = {
      triage: { hasMinors: false },
      personalProfile: { fullName: 'Alice', dateOfBirth: '1990-01-01', maritalStatus: 'single' },
      family:         { maritalStatus: 'single', children: [] },
      executors:      { primary: { fullName: 'Bob' } },
      beneficiaries:  { beneficiaries: [{ fullName: 'Charlie', share: 100 }] },
      assets:         { list: [] },
      poa:            {
        property: { primaryName: 'Dave', primaryRelationship: 'Sibling' },
        personalCare: { primaryName: 'Eve', primaryRelationship: 'Friend' },
      },
      funeral:        { type: 'Cremation' },
      priorWills:     { hasPriorWill: 'no' },
    };
    (api.get as any).mockResolvedValue(makeResponse([makeIntake({ type: 'will', data: dataNoMinor })]));
    const wrapper = mountDashboard();
    await flushPromises();

    // All 8 applicable steps done — should show complete
    expect(wrapper.text()).toContain('Questionnaire Complete');
    expect(wrapper.text()).toContain('100%');
  });

  it('Bug 4: smartGreeting shows "complete or under review" for submitted intake even with <100% progress', async () => {
    // Intake is submitted but data is empty (progress = 0%) — should still show the complete greeting.
    // Use Once so the /insight call (only for 'started' intakes) is not affected; submitted intakes
    // don't trigger fetchAIInsight at all, so a single mockResolvedValueOnce is sufficient.
    (api.get as any).mockResolvedValueOnce(makeResponse([makeIntake({ status: 'submitted', data: {} })]));
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('All your active submissions are complete or under review.');
  });

  it('Bug 7: whatsNext shows "Ready to Submit" when started intake has 100% progress', async () => {
    // status is 'started' (not submitted yet) but questionnaire is 100% done.
    // mockResolvedValueOnce for /intake/me; mockRejectedValueOnce for /insight so aiInsight stays null
    // mockResolvedValueOnce chaining is fragile because /auth/activity triggers concurrently.
    // Instead, router matching explicitly isolates the expected payload logic per URL.
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve(makeResponse([makeIntake({ status: 'started', data: completeWillData })]));
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      if (url.includes('/insight')) return Promise.reject(new Error('no insight'));
      return Promise.resolve({ data: [] });
    });
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Ready to Submit');
    expect(wrapper.text()).toContain('Review & Submit');
    expect(wrapper.text()).not.toContain('Continue Your Questionnaire');
  });

  // \u2500\u2500 GAP 6: New Tests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  it('GAP 2: activity feed sorts events by raw ISO timestamp — most recent first', async () => {
    const old    = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();       // 1 hour ago

    const intake = makeIntake({
      _id: 'sort1',
      type: 'will',
      status: 'reviewing',
      createdAt: old,
      updatedAt: old,
      submittedAt: recent,
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve({ data: [intake] });
      if (url === '/auth/activity') return Promise.resolve({ data: [
        { action: 'intake.create', createdAt: old },
        { action: 'intake.submit', createdAt: recent }
      ]});
      return Promise.resolve({ data: [] });
    });
    const wrapper = mountDashboard();
    await flushPromises();

    const activityList = wrapper.find('ol[aria-label="Recent account activity"]');
    expect(activityList.exists()).toBe(true);

    const items = activityList.findAll('li');
    expect(items.length).toBeGreaterThanOrEqual(2);

    // submitted (1h ago) should appear before created (2 days ago)
    const texts = items.map(li => li.text());
    const submittedIdx = texts.findIndex(t => t.includes('submitted'));
    const createdIdx   = texts.findIndex(t => t.includes('started'));
    expect(submittedIdx).toBeGreaterThanOrEqual(0);
    expect(createdIdx).toBeGreaterThanOrEqual(0);
    expect(submittedIdx).toBeLessThan(createdIdx);
  });

  it('GAP 1b: renders hard flag badge and soft flag badge on intake card', async () => {
    const intake = makeIntake({
      _id: 'flagged1',
      status: 'submitted',
      data: {},
      flags: [
        { type: 'hard', code: 'RESIDENCY_FAIL', message: 'Client is not an Ontario resident.' },
        { type: 'soft', code: 'SPOUSAL_OMISSION', message: 'Spouse not listed as beneficiary.' },
      ],
    });

    (api.get as any).mockResolvedValueOnce({ data: [intake] });
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('1 Critical');
    expect(wrapper.text()).toContain('1 Attention');
  });

  it('GAP 1a: AI Summary button appears for submitted intake and calls POST /summary', async () => {
    const intake = makeIntake({ _id: 'sum1', status: 'submitted' });
    (api.get as any).mockResolvedValueOnce({ data: [intake] });
    (api.post as any).mockResolvedValueOnce({ data: { summary: 'You have named Alice as executor.' } });

    const wrapper = mountDashboard();
    await flushPromises();

    const summaryBtn = wrapper.find('#summary-btn-sum1');
    expect(summaryBtn.exists()).toBe(true);
    expect(summaryBtn.text()).toContain('View AI Summary');

    await summaryBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/intake/sum1/summary', {});
    expect(wrapper.text()).toContain('You have named Alice as executor.');
  });

  it('fetches and renders AI insight for a started incorporation matter', async () => {
    const incorp = makeIntake({
      _id: 'incorp-ai-1',
      type: 'incorporation',
      status: 'started',
      data: {
        preIncorporation: {
          jurisdiction: 'obca',
          nameType: 'named',
          proposedName: 'Blue Heron Consulting',
          legalEnding: 'Inc.',
          nameConfirmed: true,
          nuansReport: { reportDate: '2026-03-01' },
          nuansReviewed: true,
        },
      },
      updatedAt: '2026-04-09T12:00:00.000Z',
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve({ data: [incorp] });
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      if (url === '/intake/incorp-ai-1/insight') {
        return Promise.resolve({ data: { insight: 'You should define your share classes next.', step: 'structureOwnership' } });
      }
      return Promise.resolve({ data: [] });
    });

    const wrapper = mountDashboard();
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/intake/incorp-ai-1/insight');
    expect(wrapper.text()).toContain('Your Next Step');
    expect(wrapper.text()).toContain('You should define your share classes next.');
    expect(wrapper.text()).not.toContain('Continue Your Questionnaire');
  });

  it('allows AI summary generation for incorporation matters', async () => {
    const intake = makeIntake({ _id: 'incorp-sum-1', type: 'incorporation', status: 'reviewing' });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve({ data: [intake] });
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValueOnce({
      data: {
        summary: 'Blue Heron Consulting Inc. is set up as an Ontario named corporation. Jane Founder is listed as the director. One Common share class is in place. The matter is under review.',
      },
    });

    const wrapper = mountDashboard();
    await flushPromises();

    const summaryBtn = wrapper.find('#summary-btn-incorp-sum-1');
    expect(summaryBtn.exists()).toBe(true);

    await summaryBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/intake/incorp-sum-1/summary', {});
    expect(wrapper.text()).toContain('Blue Heron Consulting Inc. is set up as an Ontario named corporation.');
  });

  it('uses the most recently active started matter for AI insight across will and incorporation drafts', async () => {
    const olderWill = makeIntake({
      _id: 'will-started-1',
      type: 'will',
      status: 'started',
      data: {},
      updatedAt: '2026-04-09T09:00:00.000Z',
      createdAt: '2026-04-08T09:00:00.000Z',
    });
    const newerIncorp = makeIntake({
      _id: 'incorp-started-1',
      type: 'incorporation',
      status: 'started',
      data: {
        preIncorporation: {
          jurisdiction: 'obca',
          nameType: 'named',
          proposedName: 'Blue Heron Consulting',
          legalEnding: 'Inc.',
          nameConfirmed: true,
          nuansReport: { reportDate: '2026-03-01' },
          nuansReviewed: true,
        },
      },
      updatedAt: '2026-04-09T12:00:00.000Z',
      createdAt: '2026-04-08T10:00:00.000Z',
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve({ data: [olderWill, newerIncorp] });
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      if (url === '/intake/incorp-started-1/insight') {
        return Promise.resolve({ data: { insight: 'You should move to share structure next.', step: 'structureOwnership' } });
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const wrapper = mountDashboard();
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/intake/incorp-started-1/insight');
    expect(wrapper.text()).toContain('You should move to share structure next.');
  });

  it('binds the AI insight action link to the same selected target matter', async () => {
    const willDraft = makeIntake({
      _id: 'will-draft-link',
      type: 'will',
      status: 'started',
      data: {},
      updatedAt: '2026-04-09T08:00:00.000Z',
      createdAt: '2026-04-08T08:00:00.000Z',
    });
    const incorpDraft = makeIntake({
      _id: 'incorp-draft-link',
      type: 'incorporation',
      status: 'started',
      data: {
        preIncorporation: {
          jurisdiction: 'obca',
          nameType: 'named',
          proposedName: 'Blue Heron Consulting',
          legalEnding: 'Inc.',
          nameConfirmed: true,
          nuansReport: { reportDate: '2026-03-01' },
          nuansReviewed: true,
        },
      },
      updatedAt: '2026-04-09T13:00:00.000Z',
      createdAt: '2026-04-08T09:00:00.000Z',
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve({ data: [willDraft, incorpDraft] });
      if (url === '/auth/activity') return Promise.resolve({ data: [] });
      if (url === '/intake/incorp-draft-link/insight') {
        return Promise.resolve({ data: { insight: 'You should review the structure section next.', step: 'structureOwnership' } });
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const wrapper = mountDashboard();
    await flushPromises();

    const link = wrapper.find('#ai-insight-link');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('/incorporation/structure-ownership');
    expect(link.text()).toContain('Resume Now');
  });

  it('GAP 1c: Download Documents link visible for reviewing/completed but not started', async () => {
    const reviewing = makeIntake({ _id: 'r1', status: 'reviewing' });
    const completed = makeIntake({ _id: 'c1', status: 'completed' });
    const started   = makeIntake({ _id: 's1', status: 'started' });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/intake/me') return Promise.resolve({ data: [reviewing, completed, started] });
      if (url.includes('/insight')) return Promise.reject(new Error('no insight'));
      return Promise.resolve({ data: [] });
    });

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.find('#doc-download-r1').exists()).toBe(true);
    expect(wrapper.find('#doc-download-c1').exists()).toBe(true);
    expect(wrapper.find('#doc-download-s1').exists()).toBe(false);
  });
});
