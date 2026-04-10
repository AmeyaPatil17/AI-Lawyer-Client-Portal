import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MatterDetail from '../views/MatterDetail.vue';

// Mock API
vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn()
    }
}));
import api from '../api';

// Mock Router Push for assertions
const mockPush = vi.fn();

// Mock useRouter and useRoute from vue-router
vi.mock('vue-router', async () => {
    const actual = await vi.importActual('vue-router');
    return {
        ...actual,
        useRouter: () => ({ push: mockPush }),
        useRoute: () => ({
            params: { id: '123' }
        })
    };
});

const pinia = createPinia();

describe('MatterDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setActivePinia(pinia);
        // Mock global alerts/confirms
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
    });

    it('loads and displays matter data', async () => {
        const mockIntake = {
            _id: '123',
            clientId: { email: 'client@test.com' },
            status: 'reviewing',
            data: {
                personalProfile: { fullName: 'John Doe' },
                family: { maritalStatus: 'Single' },
                assets: {}
            },
            flags: []
        };
        (api.get as any).mockImplementation((url: string) => {
            if (url.includes('/lawyer/intake/123/suggestions')) return Promise.resolve({ data: { suggestions: [] } });
            if (url.includes('/lawyer/intake/123')) return Promise.resolve({ data: mockIntake });
            return Promise.resolve({ data: {} });
        });

        // Provide $router global mock for template access
        const wrapper = mount(MatterDetail, {
            global: {
                plugins: [pinia],
                mocks: {
                    $router: { push: mockPush }
                }
            }
        });

        expect(wrapper.text()).toContain('Loading Matter Details...');
        await flushPromises();

        expect(api.get).toHaveBeenCalledWith('/lawyer/intake/123');
        // Check for personal info rendering
        expect(wrapper.text()).toContain('John Doe');
        expect(wrapper.text()).toContain('Single');
    });

    it('enters edit mode and saves changes', async () => {
        const mockIntake = {
            _id: '123',
            data: {
                personalProfile: { fullName: 'Original Name' },
                family: { children: [] },
                assets: {},
                executors: { primary: {}, alternates: [] },
                beneficiaries: { beneficiaries: [] },
                guardians: { primary: {} }
            },
            flags: [],
            logicWarnings: [],
            notes: []
        };
        (api.get as any).mockImplementation((url: string) => {
            if (url.includes('/suggestions')) return Promise.resolve({ data: { suggestions: [] } });
            if (url.includes('/lawyer/intake/123')) return Promise.resolve({ data: { ...mockIntake, data: { ...mockIntake.data, personalProfile: { fullName: { name: 'Original Name', id: '1' } } } } });
            // Mocking as object to test displayName logic, or string? The test below expects 'Original Name'.
            // If I mock as string 'Original Name', PeoplePicker handles it.
            return Promise.resolve({ data: mockIntake });
        });

        // Mock PUT response
        (api.put as any).mockResolvedValue({
            data: {
                ...mockIntake,
                data: {
                    ...mockIntake.data,
                    personalProfile: { fullName: 'New Name' }
                }
            }
        });

        const wrapper = mount(MatterDetail, {
            global: {
                plugins: [pinia],
                mocks: {
                    $router: { push: mockPush }
                }
            }
        });
        await flushPromises();

        // Click Edit
        const buttons = wrapper.findAll('button');
        const editButton = buttons.find(b => b.text().includes('Edit Data'));

        expect(editButton?.exists()).toBe(true);
        await editButton!.trigger('click');

        // Check input appears (PeoplePicker input)
        const input = wrapper.find('input');
        expect(input.exists()).toBe(true);

        // PeoplePicker input is bound to nameValue computed.
        // It's a text input.
        await input.setValue('New Name');

        // Save
        const currentButtons = wrapper.findAll('button');
        const saveButton = currentButtons.find(b => b.text().includes('Save Changes'));

        expect(saveButton?.exists()).toBe(true);
        await saveButton!.trigger('click');

        // Verify API called
        expect(api.put).toHaveBeenCalledWith('/intake/123', expect.objectContaining({
            data: expect.any(Object)
        }));
    });

    it('renders preserved asset ownership details and shareholder agreement notes', async () => {
        const mockIntake = {
            _id: '123',
            clientId: { email: 'client@test.com' },
            status: 'reviewing',
            data: {
                personalProfile: { fullName: 'Jordan Doe' },
                family: { maritalStatus: 'Single' },
                executors: { primary: {}, alternates: [] },
                beneficiaries: { beneficiaries: [] },
                guardians: { primary: {} },
                assets: {
                    hasShareholderAgreement: true,
                    list: [
                        {
                            type: 'Other',
                            category: 'other',
                            description: 'Family cottage',
                            ownership: 'joint_other',
                            jointOwner: 'Taylor Partner',
                            value: 0,
                            hasBeneficiaryDesignation: true,
                        },
                    ],
                    liabilities: [{ description: 'Mortgage', amount: 150000 }],
                },
            },
            flags: [],
            logicWarnings: [],
            notes: [],
        };

        (api.get as any).mockImplementation((url: string) => {
            if (url.includes('/lawyer/intake/123/suggestions')) return Promise.resolve({ data: { suggestions: [] } });
            if (url.includes('/lawyer/intake/123')) return Promise.resolve({ data: mockIntake });
            return Promise.resolve({ data: {} });
        });

        const wrapper = mount(MatterDetail, {
            global: {
                plugins: [pinia],
                mocks: {
                    $router: { push: mockPush }
                }
            }
        });

        await flushPromises();

        expect(wrapper.text()).toContain('Joint with Taylor Partner');
        expect(wrapper.text()).toContain('Beneficiary designation on file');
        expect(wrapper.text()).toContain('Shareholder agreement noted for the listed business interests.');
    });
});
