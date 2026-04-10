import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Assets from '../views/wizard/Assets.vue';
import { useIntakeStore } from '../stores/intake';
import api from '../api';
import { willsAssetCategoryHelpers, willsHelpers } from '../utils/willsFieldHelpers';

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

vi.mock('vue-router', () => ({
    useRoute: vi.fn(() => ({ path: '/wizard/assets' })),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), currentRoute: { value: { path: '/wizard/assets' } } })),
}));

vi.mock('../components/common/SkeletonLoader.vue', () => ({
    default: { template: '<div data-testid="skeleton" />' },
}));

const QuestionHelperStub = {
    props: ['label', 'inputId', 'example', 'whyItMatters', 'hasLegalWording', 'allowLegalInsert', 'legalContext', 'aiStep', 'currentValue', 'required', 'helperKind'],
    template: '<div class="question-helper-stub" :data-label="label" :data-example="example"><slot /></div>',
};

describe('Assets.vue', () => {
    let pinia: ReturnType<typeof createPinia>;

    const mountAssets = () => mount(Assets, {
        global: {
            plugins: [pinia],
            stubs: {
                QuestionHelper: QuestionHelperStub,
            },
        },
    });

    const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
        wrapper.findAll('button').find((button) => button.text().includes(text));

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.clearAllMocks();
        vi.useFakeTimers();

        const store = useIntakeStore();
        store.currentIntakeId = 'intake-123';
        store.isInitialized = true;
        store.intakeData = {
            assets: {
                list: [],
            },
        } as any;

        (api.put as Mock).mockResolvedValue({ data: {} });
        (api.post as Mock).mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('flushes current edits through commitStep and does not render duplicate page-level navigation', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Real Estate')!.trigger('click');
        await findButton(wrapper, 'Add your first real estate asset')!.trigger('click');
        await wrapper.get(`#${willsAssetCategoryHelpers.realEstate.description.inputId}-realEstate-0`).setValue('123 Lake Road');
        await flushPromises();

        expect(findButton(wrapper, 'Back')).toBeUndefined();
        expect(findButton(wrapper, 'Continue')).toBeUndefined();

        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(api.put).toHaveBeenCalled();
        expect(store.intakeData.assets?.list?.[0]?.description).toBe('123 Lake Road');
        expect((wrapper.vm as any).hasPendingChanges()).toBe(false);
    });

    it('preserves zero asset values when saving', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Real Estate')!.trigger('click');
        await findButton(wrapper, 'Add your first real estate asset')!.trigger('click');
        await wrapper.get(`#${willsAssetCategoryHelpers.realEstate.description.inputId}-realEstate-0`).setValue('Primary Residence');
        await wrapper.get(`#${willsAssetCategoryHelpers.realEstate.value.inputId}-realEstate-0`).setValue('0');
        await flushPromises();

        expect((wrapper.vm as any).validateLocal()).toBeNull();
        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(store.intakeData.assets?.list?.[0]?.value).toBe(0);
        expect((api.put as Mock).mock.calls.at(-1)?.[1]?.data?.assets?.list?.[0]?.value).toBe(0);
    });

    it('requires a valid liability amount before continuing', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Add Liability')!.trigger('click');
        await wrapper.get(`#${willsHelpers.assets.liabilityDesc.inputId}-0`).setValue('RBC Mortgage');
        await flushPromises();

        const warning = (wrapper.vm as any).validateLocal();
        await flushPromises();

        expect(warning).toContain('valid non-negative amount');
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('valid non-negative amount'),
            'warning'
        );
    });

    it('captures joint owner details for assets marked joint with other', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Bank Accounts')!.trigger('click');
        await findButton(wrapper, 'Add your first bank account')!.trigger('click');
        await wrapper.get(`#${willsAssetCategoryHelpers.bankAccounts.description.inputId}-bankAccounts-0`).setValue('Joint Savings');
        await wrapper.get(`#${willsHelpers.assets.ownership.inputId}-bankAccounts-0`).setValue('joint_other');
        await wrapper.get('#asset-joint-owner-bankAccounts-0').setValue('Taylor Partner');
        await flushPromises();

        expect((wrapper.vm as any).validateLocal()).toBeNull();
        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(store.intakeData.assets?.list?.[0]?.jointOwner).toBe('Taylor Partner');
    });

    it('persists shareholder agreements only while business assets remain', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Business Interests')!.trigger('click');
        await findButton(wrapper, 'Add your first business interest')!.trigger('click');
        await wrapper.get(`#${willsAssetCategoryHelpers.business.description.inputId}-business-0`).setValue('Holdco Shares');
        await wrapper.get(`#${willsHelpers.assets.shareholderAgm.inputId}`).setValue(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(store.intakeData.assets?.hasShareholderAgreement).toBe(true);

        const removeButtons = wrapper.findAll('button.absolute');
        await removeButtons[0].trigger('click');
        await flushPromises();

        expect(store.intakeData.assets?.hasShareholderAgreement).toBeUndefined();
    });

    it('confirms before clearing a selected category and removes persisted rows when accepted', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const wrapper = mountAssets();

        await findButton(wrapper, 'Vehicles')!.trigger('click');
        await findButton(wrapper, 'Add your first vehicle')!.trigger('click');
        await wrapper.get(`#${willsAssetCategoryHelpers.vehicles.description.inputId}-vehicles-0`).setValue('2018 Tesla Model 3');
        await flushPromises();

        await findButton(wrapper, 'Vehicles')!.trigger('click');
        await flushPromises();

        const store = useIntakeStore();
        expect(window.confirm).toHaveBeenCalled();
        expect(store.intakeData.assets?.list).toHaveLength(0);
    });

    it('auto-unchecks the category when the last row is removed', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Real Estate')!.trigger('click');
        await findButton(wrapper, 'Add your first real estate asset')!.trigger('click');
        await flushPromises();

        const removeButtons = wrapper.findAll('button.absolute');
        await removeButtons[0].trigger('click');
        await flushPromises();

        expect(findButton(wrapper, 'Real Estate')!.attributes('aria-expanded')).toBe('false');
    });

    it('keeps the remaining asset row stable after removing an earlier row', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Bank Accounts')!.trigger('click');
        await findButton(wrapper, 'Add your first bank account')!.trigger('click');
        await findButton(wrapper, 'Add Another Item')!.trigger('click');
        await wrapper.get(`#${willsAssetCategoryHelpers.bankAccounts.description.inputId}-bankAccounts-1`).setValue('Second Account');
        await flushPromises();

        const removeButtons = wrapper.findAll('button.absolute');
        await removeButtons[0].trigger('click');
        await flushPromises();

        expect((wrapper.get(`#${willsAssetCategoryHelpers.bankAccounts.description.inputId}-bankAccounts-0`).element as HTMLInputElement).value).toBe('Second Account');
    });

    it('uses category-specific examples for asset description helpers', async () => {
        const wrapper = mountAssets();

        await findButton(wrapper, 'Real Estate')!.trigger('click');
        await findButton(wrapper, 'Add your first real estate asset')!.trigger('click');
        await findButton(wrapper, 'Bank Accounts')!.trigger('click');
        await findButton(wrapper, 'Add your first bank account')!.trigger('click');
        await flushPromises();

        const realEstateDescription = wrapper.get(`#${willsAssetCategoryHelpers.realEstate.description.inputId}-realEstate-0`).element as HTMLInputElement;
        const bankAccountDescription = wrapper.get(`#${willsAssetCategoryHelpers.bankAccounts.description.inputId}-bankAccounts-0`).element as HTMLInputElement;

        const realEstateExample = realEstateDescription.closest('.question-helper-stub')?.getAttribute('data-example');
        const bankAccountExample = bankAccountDescription.closest('.question-helper-stub')?.getAttribute('data-example');

        expect(realEstateExample).toBe('123 Maple Drive, Toronto, ON');
        expect(bankAccountExample).toBe('RBC chequing account ending in 4321');
        expect(realEstateExample).not.toBe(bankAccountExample);
    });

    it('allows the explicit empty-state acknowledgement to complete the step', async () => {
        const wrapper = mountAssets();

        await wrapper.get('#assets-none').setValue(true);
        await flushPromises();

        expect((wrapper.vm as any).validateLocal()).toBeNull();
        await (wrapper.vm as any).commitStep(true);
        await flushPromises();

        const store = useIntakeStore();
        expect(store.intakeData.assets?.confirmedNoSignificantAssets).toBe(true);
    });

    it('uses the current intake id for smart import and updates the version from the response', async () => {
        (api.post as Mock).mockResolvedValue({
            data: {
                _id: 'intake-123',
                data: {
                    assets: {
                        list: [
                            { type: 'Other', category: 'vehicles', description: 'Imported Tesla', value: 50000, ownership: 'sole' },
                        ],
                    },
                },
                expectedVersion: 4,
            },
        });

        const wrapper = mountAssets();
        await findButton(wrapper, 'Smart Import')!.trigger('click');
        await wrapper.get('textarea').setValue('Imported Tesla');
        await flushPromises();

        await findButton(wrapper, 'Parse & Import Assets')!.trigger('click');
        await flushPromises();

        const store = useIntakeStore();
        expect(api.post).toHaveBeenCalledWith('/intake/intake-123/assets/import', expect.any(FormData));
        expect(store.dataVersion).toBe(4);
        expect(store.intakeData.assets?.list?.[0]?.description).toBe('Imported Tesla');
    });
});
