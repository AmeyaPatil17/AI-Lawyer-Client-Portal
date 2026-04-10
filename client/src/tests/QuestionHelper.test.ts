import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import api from '../api';
import QuestionHelper from '../components/QuestionHelper.vue';
import { useAiChatStore } from '../stores/aiChat';
import { ASSET_CATEGORIES } from '../utils/assetList';
import { willsAssetCategoryHelpers, willsHelpers } from '../utils/willsFieldHelpers';

const mockAiChatStore = {
  chatState: { isOpen: false },
  sendAIMessage: vi.fn().mockResolvedValue(undefined),
};

const mockIntakeStore = {
  intakeData: {
    personalProfile: { fullName: 'Alice Example' },
    assets: { list: [] },
  },
};

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../stores/aiChat', () => ({
  useAiChatStore: vi.fn(() => mockAiChatStore),
}));

vi.mock('../stores/intake', () => ({
  useIntakeStore: vi.fn(() => mockIntakeStore),
}));

const assetsDescriptionProps = {
  ...willsAssetCategoryHelpers.realEstate.description,
  currentValue: '123 Maple Dr.',
};

const funeralServiceProps = {
  ...willsHelpers.funeral.serviceDetails,
  currentValue: 'Play Sinatra at the service.',
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('QuestionHelper.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAiChatStore.chatState.isOpen = false;
    vi.mocked(api.post).mockResolvedValue({
      data: { suggestion: 'I direct that my ashes be scattered at Lake Muskoka.' },
    } as any);
  });

  it('renders the label and helper badges as separate elements for narrow assets fields', () => {
    const wrapper = mount(QuestionHelper, {
      props: assetsDescriptionProps,
      slots: {
        default: '<input id="asset-description" />',
      },
    });

    const label = wrapper.find('.question-helper__label');
    const actions = wrapper.find('.question-helper__actions');
    const buttonLabels = actions.findAll('button').map((button) => button.text().trim());

    expect(label.exists()).toBe(true);
    expect(actions.exists()).toBe(true);
    expect(label.text()).toContain('Property Address');
    expect(actions.text()).not.toContain('Property Address');
    expect(buttonLabels).toEqual(['Example', 'Why?', 'Ask AI']);
  });

  it('does not render a generated label for grouped helpers', () => {
    const wrapper = mount(QuestionHelper, {
      props: willsHelpers.priorWills.hasPriorWill,
      slots: {
        default: '<div id="prior-will-has" role="radiogroup">Existing Will</div>',
      },
    });

    expect(wrapper.find('.question-helper__label').exists()).toBe(false);
    expect(wrapper.find('.question-helper__actions').exists()).toBe(true);
  });

  it('does not render the legal-template action for structured fields', () => {
    const wrapper = mount(QuestionHelper, {
      props: assetsDescriptionProps,
      slots: {
        default: '<input id="asset-description" />',
      },
    });

    expect(wrapper.text()).not.toContain('Legal Template');
  });

  it('keeps only one helper panel open and syncs aria-describedby to the input', async () => {
    const wrapper = mount(QuestionHelper, {
      attachTo: document.body,
      props: assetsDescriptionProps,
      slots: {
        default: '<input id="asset-description" />',
      },
    });

    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');
    await flushPromises();
    await nextTick();

    const input = wrapper.get('#asset-description').element as HTMLInputElement;
    expect(wrapper.text()).toContain(willsAssetCategoryHelpers.realEstate.description.example);
    expect(input.getAttribute('aria-describedby')).toContain('asset-description-example');

    await buttons[1].trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).not.toContain(willsAssetCategoryHelpers.realEstate.description.example);
    expect(wrapper.text()).toContain(willsAssetCategoryHelpers.realEstate.description.whyItMatters);
    expect(input.getAttribute('aria-describedby')).toContain('asset-description-why');
    expect(input.getAttribute('aria-describedby')).not.toContain('asset-description-example');
  });

  it('loads the legal template and emits use-legal when copied for narrative fields', async () => {
    const wrapper = mount(QuestionHelper, {
      props: funeralServiceProps,
      slots: {
        default: '<textarea id="funeral-service-details"></textarea>',
      },
    });

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/intake/legal-phrasing', {
      context: 'funeral_service_details',
      currentValue: 'Play Sinatra at the service.',
    });
    expect(wrapper.text()).toContain('Legal Template');
    expect(wrapper.text()).toContain('I direct that my ashes be scattered at Lake Muskoka.');

    await wrapper.get('.question-helper__use-legal').trigger('click');

    expect(wrapper.emitted('use-legal')).toEqual([
      ['I direct that my ashes be scattered at Lake Muskoka.'],
    ]);
  });

  it('retries after a legal-template error and never emits placeholder text', async () => {
    vi.mocked(api.post)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: { suggestion: 'I direct that my funeral remain private.' } } as any);

    const wrapper = mount(QuestionHelper, {
      props: funeralServiceProps,
      slots: {
        default: '<textarea id="funeral-service-details"></textarea>',
      },
    });

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Unable to generate a legal template right now. Please try again.');
    expect(wrapper.find('.question-helper__use-legal').exists()).toBe(false);

    await wrapper.get('.question-helper__retry-legal').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('I direct that my funeral remain private.');

    await wrapper.get('.question-helper__use-legal').trigger('click');
    expect(wrapper.emitted('use-legal')).toEqual([['I direct that my funeral remain private.']]);
  });

  it('retries after an empty legal-template response', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { suggestion: '' } } as any)
      .mockResolvedValueOnce({ data: { suggestion: 'Scatter my ashes at sunset.' } } as any);

    const wrapper = mount(QuestionHelper, {
      props: funeralServiceProps,
      slots: {
        default: '<textarea id="funeral-service-details"></textarea>',
      },
    });

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('No legal template is available for this field yet.');
    expect(wrapper.find('.question-helper__use-legal').exists()).toBe(false);

    await wrapper.get('.question-helper__retry-legal').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Scatter my ashes at sunset.');
  });

  it('invalidates cached legal suggestions when the field value changes', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { suggestion: 'Use version one.' } } as any)
      .mockResolvedValueOnce({ data: { suggestion: 'Use version two.' } } as any);

    const wrapper = mount(QuestionHelper, {
      props: funeralServiceProps,
      slots: {
        default: '<textarea id="funeral-service-details"></textarea>',
      },
    });

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Use version one.');

    await wrapper.setProps({ currentValue: 'Updated funeral request.' });
    await flushPromises();

    expect(wrapper.text()).not.toContain('Use version one.');

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Use version two.');
    expect((api.post as any).mock.calls[1][1]).toEqual({
      context: 'funeral_service_details',
      currentValue: 'Updated funeral request.',
    });
  });

  it('ignores stale legal-template responses when props change mid-request', async () => {
    const firstRequest = createDeferred<any>();
    const secondRequest = createDeferred<any>();

    vi.mocked(api.post)
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const wrapper = mount(QuestionHelper, {
      props: funeralServiceProps,
      slots: {
        default: '<textarea id="funeral-service-details"></textarea>',
      },
    });

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();

    await wrapper.setProps({ currentValue: 'Second value' });
    await flushPromises();

    await wrapper.findAll('button')[2].trigger('click');
    await flushPromises();

    firstRequest.resolve({ data: { suggestion: 'First response' } });
    await flushPromises();
    expect(wrapper.text()).not.toContain('First response');

    secondRequest.resolve({ data: { suggestion: 'Second response' } });
    await flushPromises();
    expect(wrapper.text()).toContain('Second response');
  });

  it.each([
    ['assets', assetsDescriptionProps, 'assets'],
    ['executors', { ...willsHelpers.executors.compensationDetails, currentValue: 'Flat fee' }, 'executors'],
    ['family', { ...willsHelpers.family.childName, currentValue: 'Taylor Doe' }, 'family'],
    ['personalProfile', { ...willsHelpers.personalProfile.address, currentValue: '1 King St' }, 'personalProfile'],
  ])('uses the correct AI step mapping for %s fields', async (_label, props, expectedStep) => {
    const wrapper = mount(QuestionHelper, {
      props,
      slots: {
        default: `<input id="${props.inputId}" />`,
      },
    });

    const aiStore = useAiChatStore();
    const askAiButton = wrapper.findAll('button').find((button) => button.text().includes('Ask AI'));

    expect(askAiButton).toBeTruthy();
    await askAiButton!.trigger('click');

    expect(aiStore.chatState.isOpen).toBe(true);
    expect(aiStore.sendAIMessage).toHaveBeenCalledWith(
      expect.any(String),
      {
        intakeData: mockIntakeStore.intakeData,
        contextStep: expectedStep,
        flow: 'wills',
      }
    );
  });

  it('includes the live field value in Ask AI prompts', async () => {
    const wrapper = mount(QuestionHelper, {
      props: assetsDescriptionProps,
      slots: {
        default: '<input id="asset-description" />',
      },
    });

    await wrapper.findAll('button')[2].trigger('click');

    expect(mockAiChatStore.sendAIMessage).toHaveBeenCalledWith(
      expect.stringContaining('Current value: "123 Maple Dr."'),
      {
        intakeData: mockIntakeStore.intakeData,
        contextStep: 'assets',
        flow: 'wills',
      }
    );
  });

  it('keeps legacy fieldContext compatibility mapped to the correct AI step', async () => {
    const wrapper = mount(QuestionHelper, {
      props: {
        label: 'Description / Address',
        inputId: 'legacy-asset-description',
        fieldContext: 'asset_description',
        currentValue: 'Legacy value',
      },
      slots: {
        default: '<input id="legacy-asset-description" />',
      },
    });

    await wrapper.get('button').trigger('click');

    expect(mockAiChatStore.sendAIMessage).toHaveBeenCalledWith(
      expect.any(String),
      {
        intakeData: mockIntakeStore.intakeData,
        contextStep: 'assets',
        flow: 'wills',
      }
    );
  });

  it('migrates helper config and direct wizard call sites away from fieldContext', () => {
    expect(JSON.stringify(willsHelpers)).not.toContain('fieldContext');
    expect(willsAssetCategoryHelpers.realEstate.description.aiStep).toBe('assets');
    expect(willsHelpers.funeral.serviceDetails.legalContext).toBe('funeral_service_details');
    expect(willsHelpers.funeral.serviceDetails.allowLegalInsert).toBe(true);
    expect(willsAssetCategoryHelpers.realEstate.description.allowLegalInsert).toBeUndefined();

    const directFiles: Array<[string, string[]]> = [
      ['src/views/wizard/PersonalProfile.vue', ['v-bind="h.fullName"', 'v-bind="h.dateOfBirth"', 'v-bind="h.hasDomesticContract"', 'v-bind="h.hasSupportObligations"']],
      ['src/views/wizard/Family.vue', ['v-bind="h.spouseName"']],
      ['src/views/wizard/Guardians.vue', ['v-bind="h.primaryFullName"']],
      ['src/views/wizard/Executors.vue', ['v-bind="h.primaryFullName"']],
    ];

    for (const [file, requiredSnippets] of directFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).not.toContain('fieldContext=');
      for (const snippet of requiredSnippets) {
        expect(source).toContain(snippet);
      }
    }
  });

  it('ensures all wills helper entries have explicit aiStep and narrative-only legal insertion', () => {
    const allowedLegalInsertFields = new Set([
      'personalProfile.domesticContractDetails',
      'personalProfile.supportObligationDetails',
      'executors.compensationDetails',
      'beneficiaries.disaster',
      'poa.healthInstructions',
      'funeral.ashesDetails',
      'funeral.burialDetails',
      'funeral.serviceDetails',
      'priorWills.foreignWillDetails',
    ]);

    const actualLegalInsertFields = new Set<string>();

    for (const [sectionName, fields] of Object.entries(willsHelpers)) {
      for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        expect(fieldConfig.aiStep).toBeTruthy();
        expect(fieldConfig.helperKind).toMatch(/field|group/);

        if (fieldConfig.allowLegalInsert || fieldConfig.hasLegalWording) {
          actualLegalInsertFields.add(`${sectionName}.${fieldName}`);
          expect(fieldConfig.hasLegalWording).toBe(true);
          expect(fieldConfig.allowLegalInsert).toBe(true);
          expect(fieldConfig.legalContext).toBeTruthy();
        }
      }
    }

    expect(actualLegalInsertFields).toEqual(allowedLegalInsertFields);

    const sourceChecks: Array<[string, string[]]> = [
      [
        'src/views/wizard/PersonalProfile.vue',
        [
          '@use-legal="form.domesticContractDetails = $event"',
          '@use-legal="form.supportObligationDetails = $event"',
        ],
      ],
      [
        'src/views/wizard/Funeral.vue',
        [
          '@use-legal="form.ashesDetails = $event"',
          '@use-legal="form.burialDetails = $event"',
          '@use-legal="form.serviceDetails = $event"',
        ],
      ],
      [
        'src/views/wizard/Executors.vue',
        ['@use-legal="form.compensationDetails = $event"'],
      ],
      [
        'src/views/wizard/PowerOfAttorney.vue',
        ['@use-legal="form.personalCare.healthInstructions = $event"'],
      ],
      [
        'src/views/wizard/Beneficiaries.vue',
        ['@use-legal="form.disasterClause = $event"'],
      ],
      [
        'src/views/wizard/PriorWills.vue',
        ['@use-legal="form.foreignWillDetails = $event"'],
      ],
    ];

    const disallowedStructuredBindings = [
      '@use-legal="form.fullName = $event"',
      '@use-legal="form.maritalStatus = $event"',
      '@use-legal="form.spouseName = $event"',
      '@use-legal="form.primary.fullName = $event"',
      '@use-legal="form.property.primaryName = $event"',
      '@use-legal="form.personalCare.primaryName = $event"',
    ];

    for (const [file, requiredSnippets] of sourceChecks) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const snippet of requiredSnippets) {
        expect(source).toContain(snippet);
      }
      for (const disallowed of disallowedStructuredBindings) {
        expect(source).not.toContain(disallowed);
      }
    }
  });

  it('covers every asset category with typed helper entries and removes dead executor decision mode config', () => {
    expect(Object.keys(willsAssetCategoryHelpers).sort()).toEqual(Object.keys(ASSET_CATEGORIES).sort());
    expect('decisionMode' in willsHelpers.executors).toBe(false);

    for (const [key, meta] of Object.entries(ASSET_CATEGORIES)) {
      const categoryHelpers = willsAssetCategoryHelpers[key as keyof typeof willsAssetCategoryHelpers];
      expect(categoryHelpers.description.aiStep).toBe('assets');
      expect(categoryHelpers.value.aiStep).toBe('assets');
      expect(categoryHelpers.description.label.length).toBeGreaterThan(0);
      expect(categoryHelpers.value.label.length).toBeGreaterThan(0);
      expect(categoryHelpers.description.example?.length).toBeGreaterThan(0);
      expect(categoryHelpers.value.example?.length).toBeGreaterThan(0);

      if (key === 'realEstate') {
        expect(categoryHelpers.description.label).toBe('Property Address');
      }

      if (key === 'vehicles') {
        expect(categoryHelpers.description.label).toBe('Vehicle Description');
      }

      if (key === 'other') {
        expect(categoryHelpers.description.label).toBe('Description');
      }

      expect(meta.label.length).toBeGreaterThan(0);
    }

    expect(willsHelpers.personalProfile).toHaveProperty('supportObligationDetails');
    expect(willsHelpers.beneficiaries).toHaveProperty('legacyRelationship');
    expect(willsHelpers.family).toHaveProperty('spouseName');
    expect(willsHelpers.guardians).toHaveProperty('primaryFullName');
    expect(willsHelpers.executors).toHaveProperty('primaryFullName');
  });
});
