import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import api from '../api';
import Registrations from '../views/incorporation/Registrations.vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { normalizeIncorpData } from '../utils/incorpData';

vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

const showToast = vi.fn();
vi.mock('../composables/useToast', () => ({
    useToast: () => ({ showToast }),
}));

const FieldHelperStub = {
    template: '<div><slot /></div>',
};

const IncorpStepSkeletonStub = {
    template: '<div data-testid="skeleton" />',
};

describe('Registrations.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountStep = () => mount(Registrations, {
        global: {
            plugins: [pinia],
            stubs: {
                FieldHelper: FieldHelperStub,
                IncorpStepSkeleton: IncorpStepSkeletonStub,
            },
        },
    });

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.clearAllMocks();
        vi.useFakeTimers();

        const store = useIncorpIntakeStore();
        store.currentIncorpId = 'incorp-123';
        store.currentStatus = 'started';
        store.incorpData = normalizeIncorpData({
            preIncorporation: { jurisdiction: 'obca', nameType: 'numbered', nameConfirmed: true },
            registrations: {
                craRegistered: true,
                craBusinessNumber: '123456789',
            },
        });

        (api.put as Mock).mockImplementation(async () => ({
            data: { data: store.incorpData },
        }));
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('autosaves a blank added municipal licence row without surfacing a rejected save path', async () => {
        const wrapper = mountStep();
        await flushPromises();

        const addButton = wrapper.findAll('button').find((button) => button.text() === '+ Add Licence');
        expect(addButton).toBeTruthy();

        await addButton!.trigger('click');
        await flushPromises();
        vi.advanceTimersByTime(900);
        await flushPromises();

        const payload = (api.put as Mock).mock.calls.at(-1)?.[1]?.data?.registrations?.municipalLicences?.[0];
        expect(payload).toEqual(expect.objectContaining({
            municipality: '',
            obtained: false,
        }));
        expect(showToast).not.toHaveBeenCalled();
        expect((wrapper.vm as any).validateLocal()).toContain('municipality');
    });
});
