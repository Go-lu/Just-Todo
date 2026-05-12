import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import StickyNote from './StickyNote.vue';

const createServicesMock = () => ({
  setOpacity: vi.fn(),
  setAlwaysOnTop: vi.fn(() => true),
  closeWindow: vi.fn()
});

describe('StickyNote', () => {
  let servicesBackup;
  let rafBackup;

  beforeEach(() => {
    try {
      window.history.replaceState({}, '', '/?pin=0');
    } catch (e) {}
    servicesBackup = window.services;
    window.services = createServicesMock();
    rafBackup = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      cb(performance.now() + 1000);
      return 1;
    };
    localStorage.clear();
  });

  afterEach(() => {
    window.services = servicesBackup;
    window.requestAnimationFrame = rafBackup;
  });

  it('toggles always-on-top via menu switch', async () => {
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');
    const toggle = wrapper.find('.menu-popup .toggle-switch');
    await toggle.trigger('click');
    expect(window.services.setAlwaysOnTop).toHaveBeenCalledWith(true);
    await toggle.trigger('click');
    expect(window.services.setAlwaysOnTop).toHaveBeenCalledWith(false);
    wrapper.unmount();
  });

  it('updates opacity from slider', async () => {
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');
    const slider = wrapper.find('.menu-popup input[type="range"]');
    await slider.setValue('0.5');
    expect(wrapper.find('.sticky-note').attributes('style')).toContain('opacity');
    wrapper.unmount();
  });

  it('closes menu when clicking outside', async () => {
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');
    expect(wrapper.find('.menu-popup').exists()).toBe(true);
    await document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.menu-popup').exists()).toBe(false);
    wrapper.unmount();
  });

  it('edits a custom color and persists the change', async () => {
    localStorage.setItem('justtodo_custom_colors', JSON.stringify(['#112233']));
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');

    const customSwatch = wrapper.find('.custom-color-item .color-swatch');
    await customSwatch.trigger('click');

    const editInput = wrapper.find('.custom-color-item .edit-color-input');
    await editInput.trigger('change', { target: { value: '#445566' } });
    await wrapper.vm.$nextTick();

    const saved = JSON.parse(localStorage.getItem('justtodo_custom_colors'));
    expect(saved).toContain('#445566');
    expect(saved).not.toContain('#112233');
    expect(wrapper.find('.sticky-note').attributes('style')).toContain('#445566');
    wrapper.unmount();
  });
});
