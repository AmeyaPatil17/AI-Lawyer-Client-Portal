import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import api from '../api';
import IncorpTriage from '../views/IncorpTriage.vue';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/incorp-triage', component: IncorpTriage },
      { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/incorporation/:step', component: { template: '<div>Incorporation Step</div>' } },
      { path: '/incorporation/review', component: { template: '<div>Review</div>' } },
    ],
  });

const mountView = async () => {
  const router = makeRouter();
  await router.push('/incorp-triage');
  await router.isReady();

  const wrapper = mount(IncorpTriage, {
    global: {
      plugins: [createPinia(), router],
    },
  });

  await flushPromises();
  return { wrapper, router };
};

const makeAxiosError = (status: number, message = 'Request failed') => ({
  response: {
    status,
    data: { message },
  },
});

const stepKey = (matterId: string) => `incorpWizardStep:anonymous:${matterId}`;

describe('IncorpTriage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts a new incorporation and routes to the first wizard step when no matter exists', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(makeAxiosError(404, 'Not found'));
    vi.mocked(api.post).mockResolvedValueOnce({
      status: 201,
      data: { _id: 'inc-new', status: 'started', data: {} },
    } as any);

    const { wrapper, router } = await mountView();

    expect(wrapper.text()).toContain('Start your incorporation wizard');
    expect(wrapper.text()).not.toContain('How many directors will the corporation have?');

    await wrapper.get('button.bg-gradient-to-r').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/incorporation', { data: expect.any(Object) });
    expect(localStorage.getItem('incorpWizardStep')).toBe('jurisdiction-name');
    expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
  });

  it('resumes an active started matter using the saved valid step', async () => {
    localStorage.setItem(stepKey('inc-started'), 'structure-ownership');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        _id: 'inc-started',
        status: 'started',
        data: {
          preIncorporation: {
            jurisdiction: 'obca',
            nameType: 'numbered',
            legalEnding: 'Inc.',
            nameConfirmed: true,
          },
        },
      },
    } as any);

    const { wrapper, router } = await mountView();

    expect(wrapper.text()).toContain('Resume your incorporation draft');
    await wrapper.get('button.bg-gradient-to-r').trigger('click');
    await flushPromises();

    expect(api.post).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe('/incorporation/structure-ownership');
  });

  it('resumes via nextStep when the saved step is invalid', async () => {
    localStorage.setItem(stepKey('inc-started'), 'not-a-step');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        _id: 'inc-started',
        status: 'started',
        data: {
          preIncorporation: {
            jurisdiction: 'obca',
            nameType: 'numbered',
            legalEnding: 'Inc.',
            nameConfirmed: true,
          },
        },
      },
    } as any);

    const { wrapper, router } = await mountView();

    await wrapper.get('button.bg-gradient-to-r').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
  });

  it('routes submitted or reviewing matters to the dashboard', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        _id: 'inc-submitted',
        status: 'submitted',
        data: {
          preIncorporation: { jurisdiction: 'obca', nameType: 'numbered' },
        },
      },
    } as any);

    const { wrapper, router } = await mountView();

    expect(wrapper.text()).toContain('View Matter Status');
    await wrapper.get('button.bg-gradient-to-r').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/dashboard');
  });

  it('allows a new start when the latest matter is completed', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        _id: 'inc-completed',
        status: 'completed',
        data: {
          preIncorporation: { jurisdiction: 'cbca', nameType: 'named' },
        },
      },
    } as any);
    vi.mocked(api.post).mockResolvedValueOnce({
      status: 201,
      data: { _id: 'inc-fresh', status: 'started', data: {} },
    } as any);

    const { wrapper, router } = await mountView();

    expect(wrapper.text()).toContain('Start a new incorporation matter');
    await wrapper.get('button.bg-gradient-to-r').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.fullPath).toBe('/incorporation/jurisdiction-name');
  });

  it('routes resumed create responses to the resume path instead of the first step', async () => {
    localStorage.setItem(stepKey('inc-existing'), 'banking-setup');
    vi.mocked(api.get).mockRejectedValueOnce(makeAxiosError(404, 'Not found'));
    vi.mocked(api.post).mockResolvedValueOnce({
      status: 200,
      data: {
        _id: 'inc-existing',
        status: 'started',
        data: {
          preIncorporation: {
            jurisdiction: 'obca',
            nameType: 'numbered',
            legalEnding: 'Inc.',
            nameConfirmed: true,
          },
        },
      },
    } as any);

    const { wrapper, router } = await mountView();

    await wrapper.get('button.bg-gradient-to-r').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/incorporation/structure-ownership');
  });

  it('shows retry UI when bootstrap fails and recovers on retry', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(makeAxiosError(500, 'Network issue'))
      .mockRejectedValueOnce(makeAxiosError(404, 'Not found'));

    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain('We could not load your incorporation matter.');
    expect(wrapper.find('button.bg-gradient-to-r').exists()).toBe(false);

    await wrapper.get('button.bg-emerald-600').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Start your incorporation wizard');
  });

  it('does not render the old director-count launcher question or mojibake text', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(makeAxiosError(404, 'Not found'));

    const { wrapper } = await mountView();

    expect(wrapper.text()).not.toContain('How many directors will the corporation have?');
    expect(wrapper.find('#director-count').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('â');
  });
});
