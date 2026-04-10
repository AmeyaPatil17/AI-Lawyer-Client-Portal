import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Review from '../views/wizard/Review.vue';
import { useIntakeStore } from '../stores/intake';

vi.mock('../api', () => ({
    default: {
        put: vi.fn(),
        post: vi.fn(),
    }
}));

vi.mock('../composables/useToast', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    })
}));

import api from '../api';

const createTestRouter = () =>
    createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/wizard/review', component: { template: '<div />' } },
            { path: '/dashboard', component: { template: '<div />' } },
        ],
    });

describe('Review submit flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses the exposed footer-submit contract and does not render a duplicate in-page submit button', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const store = useIntakeStore();
        store.isInitialized = true;
        store.currentIntakeId = 'intake-123';
        store.intakeData = {
            personalProfile: {
                fullName: 'Jane Doe',
                dateOfBirth: '1980-01-01',
                maritalStatus: 'Married',
            },
            family: {
                maritalStatus: 'Married',
                children: [],
            },
            executors: {
                primary: { fullName: 'John Executor', relationship: 'Spouse' },
                alternates: [{ fullName: 'Backup Executor', relationship: 'Sibling' }],
                compensation: 'specific',
                compensationDetails: '$5,000 flat fee',
            },
            beneficiaries: {
                beneficiaries: [
                    { fullName: 'Jane Doe', relationship: 'Spouse', share: 100 },
                ],
            },
            assets: { list: [] },
            poa: {
                property: {
                    primaryName: 'Pat Property',
                    primaryRelationship: 'Sibling',
                    alternateName: 'Backup Property',
                    alternateRelationship: 'Friend',
                },
                personalCare: {
                    primaryName: 'Morgan Care',
                    primaryRelationship: 'Spouse',
                    alternateName: 'Backup Care',
                    alternateRelationship: 'Sibling',
                    hasLivingWill: true,
                    healthInstructions: 'No heroic measures.',
                },
            },
        } as any;

        (api.post as any).mockResolvedValue({
            data: {
                submissionDate: '2026-03-31T12:00:00.000Z',
            }
        });
        (api.put as any).mockResolvedValue({ data: {} });

        const router = createTestRouter();
        await router.push('/wizard/review');
        await router.isReady();

        const wrapper = mount(Review, {
            global: {
                plugins: [pinia, router],
                stubs: {
                    RouterLink: RouterLinkStub,
                },
            },
        });

        await flushPromises();

        const poaToggle = wrapper.findAll('button').find((button) => button.text().includes('Power of Attorney'));
        await poaToggle!.trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Backup Executor (Sibling)');
        expect(wrapper.text()).toContain('Specific Terms');
        expect(wrapper.text()).toContain('$5,000 flat fee');
        expect(wrapper.text()).toContain('Pat Property');
        expect(wrapper.text()).toContain('Backup Property');
        expect(wrapper.text()).toContain('Living Will Clause:');
        expect(wrapper.text()).toContain('No heroic measures.');

        await wrapper.get('textarea').setValue('Please call after 5 PM');

        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Back')).toBe(false);
        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Continue')).toBe(false);
        expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Submit')).toBe(false);
        expect(wrapper.findAll('button').some((button) => button.text().includes('Submit to Lawyer'))).toBe(false);

        await (wrapper.vm as any).triggerPrimaryAction();
        await flushPromises();

        const confirmButton = wrapper.findAll('button').find((button) => button.text().includes('Yes, Submit Intake'));
        const cancelButton = wrapper.findAll('button').find((button) => button.text().includes('Cancel'));

        expect(confirmButton?.exists()).toBe(true);
        expect(cancelButton?.exists()).toBe(true);

        await confirmButton!.trigger('click');
        await flushPromises();

        expect(api.post).toHaveBeenCalledWith('/intake/intake-123/submit', {
            clientNotes: 'Please call after 5 PM'
        });
        expect(store.intakeData.clientNotes).toBe('Please call after 5 PM');
        expect(store.intakeData.submitted).toBe(true);
        expect(router.currentRoute.value.path).toBe('/dashboard');
    });

    it('exposes disabled submit state for incomplete reviews and flushes notes through commitStep(true)', async () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        const store = useIntakeStore();
        store.isInitialized = true;
        store.currentIntakeId = 'intake-123';
        store.intakeData = {
            personalProfile: {
                fullName: 'Jane Doe',
                dateOfBirth: '1980-01-01',
                maritalStatus: 'single',
            },
            family: {
                maritalStatus: 'single',
                children: [],
            },
        } as any;

        (api.put as any).mockResolvedValue({ data: {} });

        const router = createTestRouter();
        await router.push('/wizard/review');
        await router.isReady();

        const wrapper = mount(Review, {
            global: {
                plugins: [pinia, router],
                stubs: {
                    RouterLink: RouterLinkStub,
                },
            },
        });

        await flushPromises();

        const primaryState = (wrapper.vm as any).getPrimaryActionState();
        expect(primaryState.disabled).toBe(true);

        await wrapper.get('textarea').setValue('Need help with final review');
        await flushPromises();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        expect(api.put).toHaveBeenCalledWith('/intake/intake-123', {
            data: {
                clientNotes: 'Need help with final review',
            },
            expectedVersion: undefined,
        });
        expect(store.intakeData.clientNotes).toBe('Need help with final review');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });
});
