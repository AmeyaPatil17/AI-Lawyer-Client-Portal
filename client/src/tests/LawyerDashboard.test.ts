import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import LawyerDashboard from '../views/LawyerDashboard.vue';
import api from '../api';

const socketHandlers: Record<string, Function> = {};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: (event: string, cb: Function) => { socketHandlers[event] = cb; },
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: true, user: { role: 'lawyer' }, logout: vi.fn() }),
}));

const mockPush = vi.fn();
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/lawyer/matter/:id', component: { template: '<div />' } },
  ],
});
router.push = mockPush as any;

const makeRow = (overrides: Record<string, any> = {}) => ({
  id: overrides._id || overrides.id || 'row-1',
  _id: overrides._id || overrides.id || 'row-1',
  status: 'submitted',
  type: 'will',
  flags: [],
  priorityScore: 0,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-02T09:00:00.000Z',
  clientId: { email: 'client@test.com', name: 'Client Test' },
  clientEmail: 'client@test.com',
  dataSummary: {
    personalProfileName: 'Client Test',
    spouseName: null,
    childrenCount: 0,
    businessOwner: false,
    hasForeignWill: false,
    assetTotal: 0,
    jurisdiction: '',
    proposedName: '',
  },
  ...overrides,
});

const makeSummary = (overrides: Record<string, any> = {}) => ({
  portfolioValue: 0,
  started: 1,
  submitted: 2,
  reviewing: 1,
  completed: 3,
  flaggedMatters: 1,
  ...overrides,
});

const makeQueueResponse = (rows: Record<string, any>[], overrides: Record<string, any> = {}) => ({
  data: {
    data: rows,
    pagination: {
      page: 1,
      limit: 20,
      total: rows.length,
      totalPages: 1,
      ...(overrides.pagination || {}),
    },
    summary: makeSummary(overrides.summary || {}),
  },
});

let wrappers: Array<any> = [];

const mountDashboard = () => {
  const wrapper = mount(LawyerDashboard, {
    global: {
      plugins: [router],
    },
  });
  wrappers.push(wrapper);
  return wrapper;
};

const findButtonByText = (wrapper: any, text: string) => {
  const match = wrapper.findAll('button').find((button: any) => button.text().includes(text));
  if (!match) {
    throw new Error(`Unable to find button with text: ${text}`);
  }
  return match;
};

describe('LawyerDashboard', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (api.get as any).mockReset();
    (api.patch as any).mockReset();
    (api.post as any).mockReset();
    vi.useRealTimers();
    Object.keys(socketHandlers).forEach((key) => delete socketHandlers[key]);
    mockPush.mockReset();
    await router.push('/');
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    wrappers = [];
  });

  it('fetches the default active queue and renders summary cards from the summary block', async () => {
    (api.get as any).mockResolvedValueOnce(makeQueueResponse([makeRow()], {
      summary: { portfolioValue: 1250000, submitted: 3, reviewing: 2, completed: 8, flaggedMatters: 4, started: 1 },
    }));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/lawyer/intakes?page=1&limit=20&statusGroup=active&sort=recent');
    expect(wrapper.text()).toContain('Valiant Law');
    expect(wrapper.text()).toContain('Lawyer Console');
    expect(wrapper.text()).toContain('$1M');
    expect(wrapper.get('#pipeline-card').text()).toContain('5');
    expect(wrapper.get('#completed-card').text()).toContain('8');
    expect(wrapper.text()).toContain('Across 14 files');
  });

  it('resets pagination to page 1 when search changes and queries the server', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-1' })], { pagination: { totalPages: 3, total: 30 } }))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-2' })], { pagination: { page: 2, totalPages: 3, total: 30 } }))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-3', clientId: { email: 'alice@test.com' } })], { pagination: { total: 1, totalPages: 1 } }));

    const wrapper = mountDashboard();
    await flushPromises();

    await findButtonByText(wrapper, 'Next').trigger('click');
    await flushPromises();

    await wrapper.get('#lawyer-search').setValue('alice');
    await flushPromises();

    expect(api.get).toHaveBeenNthCalledWith(2, '/lawyer/intakes?page=2&limit=20&statusGroup=active&sort=recent');
    expect(api.get).toHaveBeenNthCalledWith(3, '/lawyer/intakes?page=1&limit=20&statusGroup=active&sort=recent&search=alice');
  });

  it('resets pagination to page 1 when type changes and includes the type query param', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow()], { pagination: { totalPages: 2, total: 22 } }))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-2' })], { pagination: { page: 2, totalPages: 2, total: 22 } }))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-3', type: 'incorporation' })]));

    const wrapper = mountDashboard();
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Next')!.trigger('click');
    await flushPromises();

    await wrapper.get('#lawyer-type-filter').setValue('incorporation');
    await flushPromises();

    expect(api.get).toHaveBeenNthCalledWith(3, '/lawyer/intakes?page=1&limit=20&statusGroup=active&sort=recent&type=incorporation');
  });

  it('shows completed history from a dedicated completed view instead of mixing it into the default active queue', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'submitted-1', status: 'submitted', clientId: { email: 'submitted@test.com' } })]))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'completed-1', status: 'completed', clientId: { email: 'closed@test.com' } })]));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('submitted@test.com');
    expect(wrapper.text()).not.toContain('closed@test.com');

    await wrapper.get('#view-completed').trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenNthCalledWith(2, '/lawyer/intakes?page=1&limit=20&statusGroup=completed&sort=recent');
    expect(wrapper.text()).toContain('closed@test.com');
    expect(wrapper.text()).toContain('Completed');
    expect(wrapper.text()).not.toContain('submitted@test.com');
  });

  it('uses the same review-queue definition for the pipeline card and filter', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'active-1', status: 'submitted' })], {
        summary: { submitted: 4, reviewing: 3, completed: 0, started: 1, flaggedMatters: 0, portfolioValue: 0 },
      }))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'pipeline-1', status: 'reviewing' })]));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.get('#pipeline-card').text()).toContain('7');

    await wrapper.get('#pipeline-card').trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenNthCalledWith(2, '/lawyer/intakes?page=1&limit=20&statusGroup=pipeline&sort=recent');
  });

  it('renders a zero-priority row with a 0% bar instead of a synthetic non-zero width', async () => {
    (api.get as any).mockResolvedValueOnce(makeQueueResponse([makeRow({ priorityScore: 0 })]));

    const wrapper = mountDashboard();
    await flushPromises();

    const bar = wrapper.find('.bg-green-500');
    expect(bar.attributes('style')).toContain('width: 0%');
  });

  it('shows status actions only for submitted and reviewing rows', async () => {
    (api.get as any).mockResolvedValueOnce(makeQueueResponse([
      makeRow({ _id: 'started-1', status: 'started', clientId: { email: 'started@test.com' } }),
      makeRow({ _id: 'submitted-1', status: 'submitted', clientId: { email: 'submitted@test.com' } }),
      makeRow({ _id: 'reviewing-1', status: 'reviewing', clientId: { email: 'review@test.com' } }),
    ]));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('started@test.com');
    expect(wrapper.text()).toContain('submitted@test.com');
    expect(wrapper.text()).toContain('review@test.com');
    expect(wrapper.findAll('button').filter((button: any) => button.text().includes('Mark Reviewing'))).toHaveLength(1);
    expect(wrapper.findAll('button').filter((button: any) => button.text().includes('Mark Completed'))).toHaveLength(1);
  });

  it('refreshes the queue after a row-scoped status update', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'submitted-1', status: 'submitted' })]))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'submitted-1', status: 'reviewing' })]));
    (api.patch as any).mockResolvedValue({ data: { status: 'reviewing' } });

    const wrapper = mountDashboard();
    await flushPromises();

    await findButtonByText(wrapper, 'Mark Reviewing').trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/lawyer/intake/submitted-1/status', { status: 'reviewing' });
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Lawyer Reviewing');
  });

  it('loads full matter detail for quick view and uses detail state to hide nudge for submitted matters', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'matter-123', flags: [] })]))
      .mockResolvedValueOnce({
        data: {
          id: 'matter-123',
          _id: 'matter-123',
          clientEmail: 'client@test.com',
          status: 'submitted',
          type: 'will',
          priorityScore: 22,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
          flags: [{ type: 'hard', code: 'FOREIGN_ASSETS', message: 'Foreign assets detected.' }],
          data: { submitted: true },
          notes: [{ text: 'Detailed note', author: 'Lawyer', createdAt: '2026-04-02T10:00:00.000Z' }],
          logicWarnings: [],
        },
      });

    const wrapper = mountDashboard();
    await flushPromises();

    await findButtonByText(wrapper, 'Quick View').trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenNthCalledWith(2, '/lawyer/intake/matter-123');
    expect(wrapper.text()).toContain('Foreign assets detected.');
    expect(wrapper.text()).not.toContain('Send reminder email');
  });

  it('uses the lawyer-scoped nudge route when the detailed matter is still a draft', async () => {
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'matter-started', status: 'started' })]))
      .mockResolvedValueOnce({
        data: {
          id: 'matter-started',
          _id: 'matter-started',
          clientEmail: 'client@test.com',
          status: 'started',
          type: 'will',
          priorityScore: 10,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
          flags: [],
          data: { submitted: false },
          notes: [],
          logicWarnings: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'matter-started',
          _id: 'matter-started',
          clientEmail: 'client@test.com',
          status: 'started',
          type: 'will',
          priorityScore: 10,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-02T10:05:00.000Z',
          flags: [],
          data: { submitted: false },
          notes: [],
          logicWarnings: [],
        },
      });
    (api.post as any).mockResolvedValueOnce({ data: { message: 'Reminder sent' } });

    const wrapper = mountDashboard();
    await flushPromises();

    await findButtonByText(wrapper, 'Quick View').trigger('click');
    await flushPromises();

    expect(wrapper.find('[title="Send reminder email"]').exists()).toBe(true);

    await wrapper.get('[title="Send reminder email"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/lawyer/intake/matter-started/nudge');
    expect(api.get).toHaveBeenNthCalledWith(3, '/lawyer/intake/matter-started');
  });

  it('refetches the current query when a socket intake update arrives', async () => {
    vi.useFakeTimers();
    (api.get as any)
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-1', clientId: { email: 'before@test.com' } })]))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'row-1', clientId: { email: 'after@test.com' } })]));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('before@test.com');

    socketHandlers.intake_updated?.({
      id: 'row-1',
      _id: 'row-1',
      clientEmail: 'after@test.com',
      status: 'submitted',
      type: 'will',
      flagCount: 0,
    });

    vi.advanceTimersByTime(300);
    await flushPromises();

    expect(api.get).toHaveBeenNthCalledWith(2, '/lawyer/intakes?page=1&limit=20&statusGroup=active&sort=recent');
    expect(wrapper.text()).toContain('after@test.com');
  });

  it('shows an inline retry state instead of collapsing fetch failure into the empty state', async () => {
    (api.get as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(makeQueueResponse([makeRow({ _id: 'retry-row' })]));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Unable to load the lawyer queue.');
    expect(wrapper.get('#lawyer-empty-retry').exists()).toBe(true);

    await wrapper.get('#lawyer-empty-retry').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('client@test.com');
  });
});
