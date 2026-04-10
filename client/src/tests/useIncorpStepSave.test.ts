import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncorpStepSave } from '../composables/useIncorpStepSave';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import type { IncorporationData } from '../stores/incorpTypes';

describe('useIncorpStepSave', () => {
    let pinia: ReturnType<typeof createPinia>;

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.restoreAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('catches autosave rejections but still lets explicit flushes reject', async () => {
        const TestHost = defineComponent({
            setup(_, { expose }) {
                const payload = ref<Partial<IncorporationData>>({
                    structureOwnership: {
                        shareClasses: [],
                    },
                });
                const save = useIncorpStepSave(() => payload.value, 25);
                expose({
                    ...save,
                    payload,
                });
                return () => h('div');
            },
        });

        const store = useIncorpIntakeStore();
        const saveSpy = vi.spyOn(store, 'saveIncorpStep').mockRejectedValue(new Error('autosave failed'));

        const wrapper = mount(TestHost, {
            global: {
                plugins: [pinia],
            },
        });

        (wrapper.vm as any).markInitialized();
        (wrapper.vm as any).scheduleSave();

        vi.advanceTimersByTime(30);
        await flushPromises();

        expect(saveSpy).toHaveBeenCalledTimes(1);
        expect(saveSpy).toHaveBeenCalledWith(
            (wrapper.vm as any).payload,
            false,
            { mode: 'background' }
        );
        await expect((wrapper.vm as any).flushSave()).rejects.toThrow('autosave failed');
    });
});
