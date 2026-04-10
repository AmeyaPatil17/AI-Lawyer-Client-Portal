import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import { useAiChatStore } from '../stores/aiChat';
import { useStressTest } from '../composables/useStressTest';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const mountComposable = () =>
  mount({
    template: '<div />',
    setup() {
      return useStressTest();
    },
  });

describe('useStressTest', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears stress guidance immediately when there is no active intake id', async () => {
    const wrapper = mountComposable();
    const store = useAiChatStore();
    const setSystemMessages = vi.spyOn(store, 'setSystemMessages');

    (wrapper.vm as any).runContinuousStressTest({
      flow: 'wills',
      intakeId: null,
      context: 'assets',
    });
    await flushPromises();

    expect(setSystemMessages).toHaveBeenCalledWith('assets', 'stress', []);
  });

  it('ignores stale stress-test responses after a newer context run starts', async () => {
    const wrapper = mountComposable();
    const store = useAiChatStore();
    const setSystemMessages = vi.spyOn(store, 'setSystemMessages');
    const firstRequest = createDeferred<any>();

    vi.mocked(api.post)
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce({ data: { questions: ['Second context warning'] } } as any);

    (wrapper.vm as any).runContinuousStressTest({
      flow: 'incorporation',
      intakeId: 'intake-1',
      context: 'family',
    });
    vi.advanceTimersByTime(3000);

    (wrapper.vm as any).runContinuousStressTest({
      flow: 'incorporation',
      intakeId: 'intake-1',
      context: 'assets',
    });
    vi.advanceTimersByTime(3000);
    await flushPromises();

    firstRequest.resolve({ data: { questions: ['First context warning'] } });
    await flushPromises();

    expect(setSystemMessages).toHaveBeenCalledWith(
      'assets',
      'stress',
      expect.arrayContaining([
        expect.objectContaining({
          source: 'stress',
          severity: 'warning',
        }),
      ])
    );

    expect(setSystemMessages).not.toHaveBeenCalledWith(
      'family',
      'stress',
      expect.anything()
    );
    expect(api.post).toHaveBeenCalledWith('/intake/intake-1/stress-test', { context: 'family' });
    expect(api.post).toHaveBeenLastCalledWith('/intake/intake-1/stress-test', { context: 'assets' });
  });

  it('cancels pending stress-test timers before the API call starts', async () => {
    const wrapper = mountComposable();

    (wrapper.vm as any).runContinuousStressTest({
      flow: 'wills',
      intakeId: 'intake-2',
      context: 'assets',
    });

    (wrapper.vm as any).clearPendingStressTest();
    vi.runAllTimers();
    await flushPromises();

    expect(api.post).not.toHaveBeenCalled();
  });
});
