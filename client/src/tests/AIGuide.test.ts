import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import AIGuide from '../components/AIGuide.vue';
import { useAiChatStore } from '../stores/aiChat';
import { useIntakeStore } from '../stores/intake';

const checkLocalRules = vi.fn();
const runContinuousStressTest = vi.fn();
const clearPendingLocalRules = vi.fn();
const clearPendingStressTest = vi.fn();

vi.mock('../composables/useProactiveGuide', () => ({
  useProactiveGuide: () => ({ checkLocalRules, clearPendingLocalRules }),
}));

vi.mock('../composables/useStressTest', () => ({
  useStressTest: () => ({ runContinuousStressTest, clearPendingStressTest }),
}));

vi.mock('marked', () => ({
  marked: {
    setOptions: vi.fn(),
    parse: (text: string) => text,
  },
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: (text: string) => text,
  },
}));

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/dashboard', component: { template: '<div />' } },
    { path: '/wizard/profile', component: { template: '<div />' } },
    { path: '/incorporation/jurisdiction-name', component: { template: '<div />' } },
  ],
});

const mountGuide = (
  pinia: Pinia,
  props: Record<string, unknown> = {},
  options: { attachTo?: HTMLElement } = {}
) =>
  mount(AIGuide, {
    attachTo: options.attachTo,
    props,
    global: {
      plugins: [pinia, router],
      stubs: {
        transition: false,
      },
    },
  });

describe('AIGuide floating chat', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    await router.push('/');
  });

  it('stays open when navigating from Home to Dashboard', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    await wrapper.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    expect(store.chatState.isOpen).toBe(true);
    expect(wrapper.get('#ai-guide-panel').isVisible()).toBe(true);

    await router.push('/dashboard');
    await flushPromises();

    expect(store.chatState.isOpen).toBe(true);
    expect(wrapper.get('#ai-guide-panel').isVisible()).toBe(true);
  });

  it('hides the floating launcher on embedded chat routes and restores the open panel afterwards', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    await wrapper.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    await router.push('/wizard/profile');
    await flushPromises();

    expect(store.chatState.isOpen).toBe(true);
    expect(wrapper.find('button[aria-label="Toggle AI legal assistant"]').exists()).toBe(false);

    await router.push('/dashboard');
    await flushPromises();

    expect(wrapper.get('button[aria-label="Toggle AI legal assistant"]').exists()).toBe(true);
    expect(wrapper.get('#ai-guide-panel').isVisible()).toBe(true);

    await router.push('/incorporation/jurisdiction-name');
    await flushPromises();

    expect(wrapper.find('button[aria-label="Toggle AI legal assistant"]').exists()).toBe(false);
  });

  it('runs proactive checks on wizard routes without requiring a stored bearer token', async () => {

    const pinia = createPinia();
    setActivePinia(pinia);
    mountGuide(pinia);
    await router.push('/wizard/profile');
    await flushPromises();

    expect(checkLocalRules).toHaveBeenCalled();
    expect(runContinuousStressTest).toHaveBeenCalled();
  });

  it('binds the unread badge aria label correctly', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    store.chatState.unreadCount = 3;
    await flushPromises();

    const badge = wrapper.get('span[aria-label="3 unread messages"]');
    expect(badge.text()).toBe('3');
  });

  it('does not increment unread while the floating panel is visible', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    await wrapper.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    store.setSystemMessages('general', 'proactive', [
      {
        id: 'proactive:general:test',
        text: 'Helpful tip',
        context: 'general',
        source: 'proactive',
        severity: 'info',
      },
    ]);

    expect(store.chatState.unreadCount).toBe(0);
  });

  it('suppresses the global shortcut while typing in the chat input', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    await wrapper.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    store.chatState.isOpen = true;
    await flushPromises();

    const input = wrapper.get('input');
    input.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'A',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    }));
    await flushPromises();

    expect(store.chatState.isOpen).toBe(true);
  });

  it('closes the floating panel on Escape', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    await wrapper.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    await wrapper.get('#ai-guide-panel').trigger('keydown', { key: 'Escape' });
    await flushPromises();

    expect(store.chatState.isOpen).toBe(false);
  });

  it('returns focus to the launcher after Escape closes the floating panel', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia, {}, { attachTo: document.body });

    const launcher = wrapper.get('button[aria-label="Toggle AI legal assistant"]');
    (launcher.element as HTMLButtonElement).focus();

    await launcher.trigger('click');
    await flushPromises();

    await wrapper.get('#ai-guide-panel').trigger('keydown', { key: 'Escape' });
    await flushPromises();

    expect(document.activeElement).toBe(launcher.element);
    wrapper.unmount();
  });

  it('renders warning styling from structured severity metadata instead of message text prefixes', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    store.setSystemMessages('general', 'stress', [
      {
        id: 'stress:general:metadata-warning',
        text: 'This message has no icon prefix but should still render as a warning.',
        context: 'general',
        source: 'stress',
        severity: 'warning',
      },
    ]);
    await flushPromises();

    const warningBubble = wrapper
      .findAll('.text-amber-100')
      .find((node) => node.text().includes('should still render as a warning'));

    expect(warningBubble).toBeTruthy();
  });

  it('does not auto-scroll while the user is reading older messages', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountGuide(pinia);
    const store = useAiChatStore();

    await wrapper.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    const log = wrapper.get('[role="log"]');
    let scrollTop = 120;

    Object.defineProperty(log.element, 'scrollHeight', {
      configurable: true,
      get: () => 600,
    });
    Object.defineProperty(log.element, 'clientHeight', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(log.element, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });

    await log.trigger('scroll');

    store.chatState.messages.push({
      id: 'older-reading-test',
      text: 'A new message should not yank the scroll position.',
      sender: 'ai',
      kind: 'chat',
      timestamp: Date.now(),
      source: 'chat',
      severity: 'info',
    });
    await flushPromises();

    expect(scrollTop).toBe(120);
  });

  it('uses only the primary instance for orchestration side effects', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    await router.push('/wizard/profile');
    await flushPromises();

    mountGuide(pinia, { instanceRole: 'primary' });
    await flushPromises();

    const proactiveCalls = checkLocalRules.mock.calls.length;
    const stressCalls = runContinuousStressTest.mock.calls.length;

    mountGuide(pinia, { embedded: true, instanceRole: 'embedded' });
    await flushPromises();

    expect(checkLocalRules.mock.calls.length).toBe(proactiveCalls);
    expect(runContinuousStressTest.mock.calls.length).toBe(stressCalls);
  });

  it('runs route and data change orchestration only once when a primary and embedded instance coexist', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const intakeStore = useIntakeStore();

    await router.push('/wizard/profile');
    await flushPromises();

    mountGuide(pinia, { instanceRole: 'primary' });
    mountGuide(pinia, { embedded: true, instanceRole: 'embedded' });
    await flushPromises();

    checkLocalRules.mockClear();
    runContinuousStressTest.mockClear();

    intakeStore.currentIntakeId = 'intake-123';
    intakeStore.intakeData = {
      personalProfile: {
        fullName: 'Alice Example',
      },
    } as any;
    await flushPromises();

    expect(checkLocalRules).toHaveBeenCalledTimes(1);
    expect(runContinuousStressTest).toHaveBeenCalledTimes(1);
  });

  it('generates unique input ids for separate instances', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const primary = mountGuide(pinia, { instanceRole: 'primary' });
    const embedded = mountGuide(pinia, { embedded: true, instanceRole: 'embedded' });

    await primary.get('button[aria-label="Toggle AI legal assistant"]').trigger('click');
    await flushPromises();

    const ids = [
      primary.get('input').attributes('id'),
      embedded.get('input').attributes('id'),
    ];

    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });
});
