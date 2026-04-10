import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FieldHelper from '../components/incorporation/FieldHelper.vue';
import { useAiChatStore } from '../stores/aiChat';
import { incorpHelpers } from '../utils/incorpFieldHelpers';

const mockAiChatStore = {
  chatState: { isOpen: false },
  sendAIMessage: vi.fn(() => Promise.resolve()),
};

vi.mock('../stores/aiChat', () => ({
  useAiChatStore: vi.fn(() => mockAiChatStore),
}));

vi.mock('../stores/incorpIntake', () => ({
  useIncorpIntakeStore: vi.fn(() => ({
    incorpData: {},
  })),
}));

describe('FieldHelper.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAiChatStore.chatState.isOpen = false;
    mockAiChatStore.sendAIMessage.mockResolvedValue(undefined);
  });

  it('renders nothing if no props are passed', () => {
    const wrapper = mount(FieldHelper);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('renders Example badge and reveals example text on click', async () => {
    const wrapper = mount(FieldHelper, {
      props: { example: 'This is an example' },
    });

    expect(wrapper.find('.field-helper__actions').exists()).toBe(true);
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].text()).toContain('Example');
    expect(wrapper.text()).not.toContain('This is an example');

    await buttons[0].trigger('click');

    expect(wrapper.text()).toContain('This is an example');
  });

  it('renders Why badge and reveals why text on click', async () => {
    const wrapper = mount(FieldHelper, {
      props: { why: 'This explains why' },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toContain('Why?');
    await buttons[0].trigger('click');
    expect(wrapper.text()).toContain('This explains why');
  });

  it('renders Legal badge and reveals legal text on click', async () => {
    const wrapper = mount(FieldHelper, {
      props: { legal: 'This is a legal warning' },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toContain('Legal Template');
    await buttons[0].trigger('click');
    expect(wrapper.text()).toContain('This is a legal warning');
  });

  it('renders Ask AI badge and dispatches AI message on click', async () => {
    const wrapper = mount(FieldHelper, {
      props: { askAi: { step: 'preIncorporation', prompt: 'Explain this field.' } },
    });

    const aiStore = useAiChatStore();
    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toContain('Ask AI');

    await buttons[0].trigger('click');

    expect(aiStore.chatState.isOpen).toBe(true);
    expect(aiStore.sendAIMessage).toHaveBeenCalledWith('Explain this field.', {
      intakeData: {},
      contextStep: 'preIncorporation',
      flow: 'incorporation',
    });
  });

  it('renders multiple badges in order', () => {
    const wrapper = mount(FieldHelper, {
      props: {
        example: 'E1',
        why: 'W1',
        askAi: { step: 'registrations', prompt: 'P1' },
        legal: 'L1',
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(4);
    expect(buttons[0].text()).toContain('Example');
    expect(buttons[1].text()).toContain('Why?');
    expect(buttons[2].text()).toContain('Ask AI');
    expect(buttons[3].text()).toContain('Legal Template');
  });

  it('prevents duplicate Ask AI dispatch while a request is in flight', async () => {
    let resolveSend!: () => void;
    mockAiChatStore.sendAIMessage.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveSend = resolve;
      })
    );

    const wrapper = mount(FieldHelper, {
      props: {
        askAi: incorpHelpers.structureOwnership.shareClassName.askAi,
      },
    });

    const button = wrapper.get('button');
    await button.trigger('click');
    await button.trigger('click');

    expect(mockAiChatStore.sendAIMessage).toHaveBeenCalledTimes(1);
    expect(button.attributes('disabled')).toBeDefined();

    resolveSend();
    await Promise.resolve();
  });

  it('does not rely on delayed timers to dispatch Ask AI', async () => {
    vi.useFakeTimers();

    const wrapper = mount(FieldHelper, {
      props: {
        askAi: incorpHelpers.registrations.importExport.askAi,
      },
    });

    await wrapper.get('button').trigger('click');
    wrapper.unmount();
    vi.runAllTimers();

    expect(mockAiChatStore.sendAIMessage).toHaveBeenCalledTimes(1);
    expect(mockAiChatStore.sendAIMessage).toHaveBeenCalledWith(
      incorpHelpers.registrations.importExport.askAi?.prompt,
      {
        intakeData: {},
        contextStep: 'registrations',
        flow: 'incorporation',
      }
    );

    vi.useRealTimers();
  });
});
