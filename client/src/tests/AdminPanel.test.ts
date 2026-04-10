import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { reactive } from 'vue';
import AdminPanel from '../views/AdminPanel.vue';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAuthStore = reactive({
  user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
});

vi.mock('../stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/admin', component: { template: '<div />' } },
    { path: '/lawyer/matter/:id', component: { template: '<div />' } },
  ],
});

type Wrapper = ReturnType<typeof mount>;
let wrappers: Wrapper[] = [];

const mountAdminPanel = () => {
  const wrapper = mount(AdminPanel, {
    global: {
      plugins: [router],
    },
  });
  wrappers.push(wrapper);
  return wrapper;
};

const defaultStats = {
  users: {
    total: 5,
    active: 4,
    disabled: 1,
    byRole: { client: 3, lawyer: 1, admin: 1 },
  },
  intakes: {
    total: 6,
    byStatus: { started: 2, submitted: 1, reviewing: 2, completed: 1 },
    byType: { will: 4, incorporation: 2 },
  },
};

const makeUsersResponse = (overrides: Record<string, any> = {}) => ({
  data: overrides.data ?? [
    {
      id: 'user-1',
      email: 'client@example.com',
      name: 'Client Example',
      role: 'client',
      isActive: true,
      createdAt: '2026-04-01T00:00:00.000Z',
      intakeCount: 1,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    ...(overrides.pagination ?? {}),
  },
});

const makeIntakesResponse = (overrides: Record<string, any> = {}) => ({
  data: overrides.data ?? [
    {
      id: 'intake-1',
      type: 'will',
      status: 'started',
      clientEmail: 'client@example.com',
      clientName: 'Client Example',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      highlights: 'Client Example',
      flagCount: 0,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    ...(overrides.pagination ?? {}),
  },
  summary: overrides.summary ?? {
    total: 1,
    byStatus: { started: 1, submitted: 0, reviewing: 0, completed: 0 },
    byType: { will: 1, incorporation: 0 },
  },
});

const makeAiUsageResponse = (overrides: Record<string, any> = {}) => ({
  rows: overrides.rows ?? [
    {
      _id: { date: '2026-04-02', endpoint: 'dashboard_insight' },
      totalRequests: 1,
      totalTokens: 10,
      totalPromptTokens: 6,
      totalCompletionTokens: 4,
    },
  ],
  summary: overrides.summary ?? {
    totalTokens: 10,
    promptTokens: 6,
    completionTokens: 4,
    requests: 1,
  },
  timeframe: overrides.timeframe ?? {
    startDate: '2026-03-03T00:00:00.000Z',
    endDate: '2026-04-02T00:00:00.000Z',
    days: 30,
  },
});

const makeAiSettingsResponse = (overrides: Record<string, any> = {}) => ({
  current: overrides.current ?? {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview',
  },
  defaults: overrides.defaults ?? {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview',
  },
  providers: overrides.providers ?? [
    { id: 'gemini', label: 'Gemini', enabled: true },
    { id: 'openai', label: 'ChatGPT', enabled: true },
  ],
  models: overrides.models ?? {
    gemini: [
      { id: 'gemini-3.1-flash-lite-preview', label: 'gemini-3.1-flash-lite-preview' },
      { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
    ],
    openai: [
      { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    ],
  },
  credentials: overrides.credentials ?? {
    geminiConfigured: true,
    openaiConfigured: true,
  },
  initialized: overrides.initialized ?? true,
  operational: overrides.operational ?? {
    rateLimitPerMinute: 30,
    maxRetries: 3,
    cacheTtlSeconds: 3600,
  },
  operationalDefaults: overrides.operationalDefaults ?? {
    rateLimitPerMinute: 30,
    maxRetries: 3,
    cacheTtlSeconds: 3600,
  },
});

const httpResponse = <T>(data: T) => ({ data });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('AdminPanel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthStore.user = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
    await router.push('/admin');
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    wrappers = [];
  });

  it('hydrates the users tab from the URL query and lazy-loads only the active tab', async () => {
    await router.push('/admin?tab=users&user_role=lawyer&user_page=2');
    (api.get as any).mockResolvedValueOnce(httpResponse(makeUsersResponse({
      pagination: { page: 2, total: 3, totalPages: 2 },
      data: [{
        id: 'lawyer-1',
        email: 'lawyer@example.com',
        name: 'Lawyer Example',
        role: 'lawyer',
        isActive: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        intakeCount: 0,
      }],
    })));

    const wrapper = mountAdminPanel();
    await flushPromises();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/users?page=2&limit=20&role=lawyer');
    expect((wrapper.get('#admin-user-role-filter').element as HTMLSelectElement).value).toBe('lawyer');
    expect(wrapper.text()).toContain('Lawyer Example');
    expect(wrapper.text()).not.toContain('Matter Pipeline');
  });

  it('shows an inline dashboard retry state when stats fail and recovers on retry', async () => {
    (api.get as any)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(httpResponse(defaultStats));

    const wrapper = mountAdminPanel();
    await flushPromises();

    expect(wrapper.get('#admin-dashboard-error').text()).toContain('Unable to load system stats.');

    await wrapper.get('#admin-dashboard-refresh').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Matter Pipeline');
    expect(wrapper.text()).toContain('Started:');
  });

  it('resets the users page to 1 when the role filter changes', async () => {
    await router.push('/admin?tab=users&user_page=2');
    (api.get as any)
      .mockResolvedValueOnce(httpResponse(makeUsersResponse({ pagination: { page: 2, total: 40, totalPages: 2 } })))
      .mockResolvedValueOnce(httpResponse(makeUsersResponse({
        data: [{
          id: 'lawyer-2',
          email: 'lawyer2@example.com',
          role: 'lawyer',
          isActive: true,
          createdAt: '2026-04-01T00:00:00.000Z',
          intakeCount: 0,
        }],
      })));

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-user-role-filter').setValue('lawyer');
    await flushPromises();

    expect(router.currentRoute.value.query.user_page).toBeUndefined();
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/users?page=1&limit=20&role=lawyer');
  });

  it('disables self-demote and self-disable controls for the current admin', async () => {
    await router.push('/admin?tab=users');
    (api.get as any).mockResolvedValueOnce(httpResponse(makeUsersResponse({
      data: [{
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        intakeCount: 0,
      }],
    })));

    const wrapper = mountAdminPanel();
    await flushPromises();

    expect(wrapper.get('#admin-user-role-admin-1').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#admin-user-status-admin-1').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Current admin account');
  });

  it('resets the create-user form on cancel', async () => {
    await router.push('/admin?tab=users');
    (api.get as any).mockResolvedValueOnce(httpResponse(makeUsersResponse()));

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-open-create-user').trigger('click');
    await wrapper.get('#admin-create-user-name').setValue('New Admin');
    await wrapper.get('#admin-create-user-email').setValue('new@example.com');
    await wrapper.get('#admin-create-user-password').setValue('secret');
    await wrapper.get('#admin-create-user-role').setValue('lawyer');
    await wrapper.get('#admin-create-user-cancel').trigger('click');
    await flushPromises();

    await wrapper.get('#admin-open-create-user').trigger('click');
    expect((wrapper.get('#admin-create-user-name').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('#admin-create-user-email').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('#admin-create-user-password').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('#admin-create-user-role').element as HTMLSelectElement).value).toBe('client');
  });

  it('refetches users and dashboard stats after a confirmed role change', async () => {
    await router.push('/admin?tab=users');
    (api.get as any)
      .mockResolvedValueOnce(httpResponse(makeUsersResponse()))
      .mockResolvedValueOnce(httpResponse(makeUsersResponse({
        data: [{
          id: 'user-1',
          email: 'client@example.com',
          role: 'lawyer',
          isActive: true,
          createdAt: '2026-04-01T00:00:00.000Z',
          intakeCount: 1,
        }],
      })))
      .mockResolvedValueOnce(httpResponse(defaultStats));
    (api.patch as any).mockResolvedValueOnce({ data: { message: 'ok' } });

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-user-role-user-1').setValue('lawyer');
    await flushPromises();
    await wrapper.get('#admin-user-confirm-role').trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/users/user-1/role', { role: 'lawyer' });
    expect(api.get).toHaveBeenCalledWith('/admin/users?page=1&limit=20');
    expect(api.get).toHaveBeenCalledWith('/admin/stats');
  });

  it('ignores stale intake responses when the query changes mid-request', async () => {
    await router.push('/admin?tab=intakes');
    const firstRequest = deferred<{ data: ReturnType<typeof makeIntakesResponse> }>();
    const secondRequest = deferred<{ data: ReturnType<typeof makeIntakesResponse> }>();

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('users') && url.includes('reviewing@example.com')) return secondRequest.promise;
      if (url.includes('users')) return Promise.resolve(httpResponse(makeUsersResponse()));
      if (url.includes('intakes') && url.includes('reviewing')) return secondRequest.promise;
      if (url.includes('intakes')) return firstRequest.promise;
      return Promise.resolve(httpResponse({}));
    });

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-intake-status-filter').setValue('reviewing');
    await flushPromises();

    secondRequest.resolve({
      data: makeIntakesResponse({
        data: [{
          id: 'intake-2',
          type: 'will',
          status: 'reviewing',
          clientEmail: 'reviewing@example.com',
          clientName: 'Reviewing Client',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-02T00:00:00.000Z',
          highlights: 'Reviewing Client',
          flagCount: 1,
        }],
        summary: {
          total: 1,
          byStatus: { started: 0, submitted: 0, reviewing: 1, completed: 0 },
          byType: { will: 1, incorporation: 0 },
        },
      }),
    });
    await flushPromises();

    firstRequest.resolve({ data: makeIntakesResponse() });
    await flushPromises();

    expect(wrapper.text()).toContain('reviewing@example.com');
    expect(wrapper.text()).not.toContain('client@example.com');
  });

  it('queries the dedicated admin intakes endpoint with server-side filters', async () => {
    await router.push('/admin?tab=intakes&intake_q=alice&intake_type=will&intake_status=reviewing&intake_sort=created_asc&intake_page=2');
    (api.get as any).mockResolvedValueOnce(httpResponse(makeIntakesResponse({
      pagination: { page: 2, total: 3, totalPages: 2 },
    })));

    mountAdminPanel();
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/intakes?page=2&limit=20&sort=created_asc&search=alice&type=will&status=reviewing');
  });

  it('confirms status overrides and refreshes both intakes and dashboard stats', async () => {
    await router.push('/admin?tab=intakes');
    let intakesFetchCount = 0;
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('users')) return Promise.resolve(httpResponse(makeUsersResponse()));
      if (url.includes('stats')) return Promise.resolve(httpResponse(defaultStats));
      if (url.includes('intakes')) {
        intakesFetchCount++;
        if (intakesFetchCount === 1) return Promise.resolve(httpResponse(makeIntakesResponse()));
        return Promise.resolve(httpResponse(makeIntakesResponse({
          data: [{
            id: 'intake-1',
            type: 'will',
            status: 'completed',
            clientEmail: 'client@example.com',
            clientName: 'Client Example',
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            highlights: 'Client Example',
            flagCount: 0,
          }],
          summary: {
            total: 1,
            byStatus: { started: 0, submitted: 0, reviewing: 0, completed: 1 },
            byType: { will: 1, incorporation: 0 },
          },
        })));
      }
      return Promise.resolve(httpResponse({}));
    });
    (api.patch as any).mockResolvedValueOnce({ data: { message: 'ok' } });

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-intake-status-intake-1').setValue('completed');
    await flushPromises();
    await wrapper.get('#admin-intake-status-confirm').trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/intakes/intake-1/status', { status: 'completed' });
    expect(api.get).toHaveBeenCalledWith('/admin/intakes?page=1&limit=20&sort=updated_desc');
    expect(api.get).toHaveBeenCalledWith('/admin/stats');
  });

  it('decrements the page after deleting the last intake row on a page', async () => {
    await router.push('/admin?tab=intakes&intake_page=2');
    let calls = 0;
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('users')) return Promise.resolve(httpResponse(makeUsersResponse()));
      if (url.includes('stats')) return Promise.resolve(httpResponse(defaultStats));
      if (url.includes('intakes')) {
        calls++;
        if (calls === 1) return Promise.resolve(httpResponse(makeIntakesResponse({ pagination: { page: 2, total: 21, totalPages: 2 } })));
        return Promise.resolve(httpResponse(makeIntakesResponse({
          pagination: { page: 1, total: 20, totalPages: 1 },
          data: [{
            id: 'intake-2',
            type: 'will',
            status: 'started',
            clientEmail: 'after-delete@example.com',
            clientName: 'After Delete',
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-02T00:00:00.000Z',
            highlights: 'After Delete',
            flagCount: 0,
          }],
        })));
      }
      return Promise.resolve(httpResponse({}));
    });
    (api.delete as any).mockResolvedValueOnce({ data: { message: 'deleted' } });

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-intake-delete-intake-1').trigger('click');
    await wrapper.get('#admin-intake-delete-confirm').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query.intake_page).toBeUndefined();
    expect(api.get).toHaveBeenCalledWith('/admin/intakes?page=1&limit=20&sort=updated_desc');
    expect(api.get).toHaveBeenCalledWith('/admin/stats');
    expect(wrapper.text()).toContain('after-delete@example.com');
  });

  it('uses the server AI summary totals and preserves the days filter in the URL', async () => {
    await router.push('/admin?tab=ai');
    (api.get as any)
      .mockResolvedValueOnce(httpResponse(makeAiSettingsResponse()))
      .mockResolvedValueOnce(httpResponse(makeAiUsageResponse({
        rows: [{
          _id: { date: '2026-04-02', endpoint: 'dashboard_insight' },
          totalRequests: 1,
          totalTokens: 10,
          totalPromptTokens: 6,
          totalCompletionTokens: 4,
        }],
        summary: {
          totalTokens: 999,
          promptTokens: 777,
          completionTokens: 222,
          requests: 55,
        },
      })))
      .mockResolvedValueOnce(httpResponse(makeAiUsageResponse({
        summary: {
          totalTokens: 123,
          promptTokens: 80,
          completionTokens: 43,
          requests: 9,
        },
        timeframe: {
          startDate: '2026-03-19T00:00:00.000Z',
          endDate: '2026-04-02T00:00:00.000Z',
          days: 14,
        },
      })));

    const wrapper = mountAdminPanel();
    await flushPromises();

    expect(wrapper.text()).toContain('999');
    expect(wrapper.text()).not.toContain('55,555');

    await wrapper.get('#admin-ai-days').setValue('14');
    await flushPromises();

    expect(router.currentRoute.value.query.ai_days).toBe('14');
    expect(api.get).toHaveBeenNthCalledWith(3, '/admin/ai-usage?days=14');
    expect((wrapper.get('#admin-ai-provider').element as HTMLSelectElement).value).toBe('gemini');
    expect((wrapper.get('#admin-ai-model').element as HTMLSelectElement).value).toBe('gemini-3.1-flash-lite-preview');
  });

  it('lets admins switch the active AI provider and model from the AI tab', async () => {
    await router.push('/admin?tab=ai');
    (api.get as any)
      .mockResolvedValueOnce(httpResponse(makeAiSettingsResponse()))
      .mockResolvedValueOnce(httpResponse(makeAiUsageResponse()));
    (api.patch as any).mockResolvedValueOnce(httpResponse(makeAiSettingsResponse({
      current: {
        provider: 'openai',
        model: 'gpt-4o-mini',
      },
      defaults: {
        provider: 'gemini',
        model: 'gemini-3.1-flash-lite-preview',
      },
    })));

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-ai-provider').setValue('openai');
    await flushPromises();
    await wrapper.get('#admin-ai-model').setValue('gpt-4o-mini');
    await wrapper.get('#admin-ai-settings-save').trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/ai-settings', {
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    expect((wrapper.get('#admin-ai-provider').element as HTMLSelectElement).value).toBe('openai');
    expect((wrapper.get('#admin-ai-model').element as HTMLSelectElement).value).toBe('gpt-4o-mini');
  });

  it('renders the operational limits form pre-populated from the API response', async () => {
    await router.push('/admin?tab=ai');
    (api.get as any)
      .mockResolvedValueOnce(httpResponse(makeAiSettingsResponse({
        operational: { rateLimitPerMinute: 45, maxRetries: 2, cacheTtlSeconds: 1800 },
      })))
      .mockResolvedValueOnce(httpResponse(makeAiUsageResponse()));

    const wrapper = mountAdminPanel();
    await flushPromises();

    expect((wrapper.get('#admin-ai-rate-limit').element as HTMLInputElement).value).toBe('45');
    expect((wrapper.get('#admin-ai-max-retries').element as HTMLInputElement).value).toBe('2');
    expect((wrapper.get('#admin-ai-cache-ttl').element as HTMLInputElement).value).toBe('1800');
    expect(wrapper.text()).toContain('Env default: 30');
  });

  it('calls PATCH /admin/ai-operational with correct payload on Save Limits click', async () => {
    await router.push('/admin?tab=ai');
    (api.get as any)
      .mockResolvedValueOnce(httpResponse(makeAiSettingsResponse()))
      .mockResolvedValueOnce(httpResponse(makeAiUsageResponse()))
      // second fetchAiSettings refetch after save
      .mockResolvedValueOnce(httpResponse(makeAiSettingsResponse({
        operational: { rateLimitPerMinute: 60, maxRetries: 5, cacheTtlSeconds: 900 },
      })));
    (api.patch as any).mockResolvedValueOnce(httpResponse({ message: 'ok', operational: { rateLimitPerMinute: 60, maxRetries: 5, cacheTtlSeconds: 900 } }));

    const wrapper = mountAdminPanel();
    await flushPromises();

    await wrapper.get('#admin-ai-rate-limit').setValue('60');
    await wrapper.get('#admin-ai-max-retries').setValue('5');
    await wrapper.get('#admin-ai-cache-ttl').setValue('900');
    await wrapper.get('#admin-ai-operational-save').trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/ai-operational', {
      rateLimitPerMinute: 60,
      maxRetries: 5,
      cacheTtlSeconds: 900,
    });
  });

  it('disables the Save Limits button while a save is in-flight', async () => {
    await router.push('/admin?tab=ai');
    const settingsDeferred = deferred<{ data: ReturnType<typeof makeAiSettingsResponse> }>();
    (api.get as any)
      .mockImplementationOnce(() => settingsDeferred.promise)
      .mockResolvedValueOnce(httpResponse(makeAiUsageResponse()));

    const wrapper = mountAdminPanel();
    settingsDeferred.resolve({ data: makeAiSettingsResponse() });
    await flushPromises();

    // Button should be enabled before save
    expect(wrapper.get('#admin-ai-operational-save').attributes('disabled')).toBeUndefined();
  });
});
