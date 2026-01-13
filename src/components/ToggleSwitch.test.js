import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ToggleSwitch from './ToggleSwitch.vue';

describe('ToggleSwitch', () => {
  it('emits update and change on click', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false }
    });

    await wrapper.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    expect(wrapper.emitted('change')?.[0]).toEqual([true]);
  });

  it('does not emit when disabled', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false, disabled: true }
    });

    await wrapper.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });
});

