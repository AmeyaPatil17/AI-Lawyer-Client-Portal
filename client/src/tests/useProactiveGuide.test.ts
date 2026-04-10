import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { useAiChatStore } from '../stores/aiChat';
import { useProactiveGuide } from '../composables/useProactiveGuide';

const mountComposable = () =>
  mount({
    template: '<div />',
    setup() {
      return useProactiveGuide();
    },
  });

describe('useProactiveGuide', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds deterministic incorporation proactive guidance with structured metadata', async () => {
    const wrapper = mountComposable();
    const store = useAiChatStore();
    const setSystemMessages = vi.spyOn(store, 'setSystemMessages');

    (wrapper.vm as any).checkLocalRules(
      '/incorporation/jurisdiction-name',
      {
        preIncorporation: {
          nameType: 'named',
          nuansReport: { hasConflicts: true },
        },
      },
      'incorporation'
    );

    vi.advanceTimersByTime(1200);
    await flushPromises();

    expect(setSystemMessages).toHaveBeenCalledWith(
      'incorp-jurisdiction',
      'proactive',
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining('incorp_name_conflict'),
          severity: 'warning',
          source: 'proactive',
        }),
      ])
    );
  });

  it('cancels pending proactive timers before stale guidance is emitted', async () => {
    const wrapper = mountComposable();
    const store = useAiChatStore();
    const setSystemMessages = vi.spyOn(store, 'setSystemMessages');

    (wrapper.vm as any).checkLocalRules(
      '/wizard/assets',
      { assets: { list: [] } },
      'wills'
    );

    (wrapper.vm as any).clearPendingLocalRules();
    vi.runAllTimers();
    await flushPromises();

    expect(setSystemMessages).not.toHaveBeenCalled();
  });

  it('does not duplicate proactive guidance or unread counts when the same rule set reruns unchanged', async () => {
    const wrapper = mountComposable();
    const store = useAiChatStore();

    (wrapper.vm as any).checkLocalRules(
      '/wizard/assets',
      { assets: { list: [] } },
      'wills'
    );

    vi.advanceTimersByTime(1600);
    await flushPromises();

    const firstCount = store.chatState.messages.filter((message) => message.id === 'proactive:assets:tip_assets').length;
    const firstUnread = store.chatState.unreadCount;

    (wrapper.vm as any).checkLocalRules(
      '/wizard/assets',
      { assets: { list: [] } },
      'wills'
    );

    vi.advanceTimersByTime(1600);
    await flushPromises();

    expect(store.chatState.messages.filter((message) => message.id === 'proactive:assets:tip_assets')).toHaveLength(firstCount);
    expect(store.chatState.unreadCount).toBe(firstUnread);
  });
});
