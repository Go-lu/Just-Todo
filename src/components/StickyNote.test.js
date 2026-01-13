import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    getTodos: vi.fn(() => ([
      { id: '1', content: 'A', isCompleted: false },
      { id: '2', content: 'B', isCompleted: false }
    ])),
    saveTodos: vi.fn()
  }
}));

vi.mock('../utils/db', () => ({
  db: dbMock
}));

import StickyNote from './StickyNote.vue';

const createServicesMock = () => ({
  setOpacity: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  closeWindow: vi.fn()
});

describe('StickyNote', () => {
  let servicesBackup;
  let rafBackup;

  beforeEach(() => {
    servicesBackup = window.services;
    window.services = createServicesMock();
    dbMock.getTodos.mockClear();
    dbMock.saveTodos.mockClear();
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

  it('loads todos and applies initial opacity', () => {
    const wrapper = mount(StickyNote);
    expect(dbMock.getTodos).toHaveBeenCalledTimes(1);
    expect(window.services.setOpacity).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('toggles always-on-top via action button', async () => {
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');
    const toggle = wrapper.find('.menu-popup button.action-btn');
    await toggle.trigger('click');
    expect(window.services.setAlwaysOnTop).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('updates opacity from slider', async () => {
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');
    window.services.setOpacity.mockClear();
    const slider = wrapper.find('.menu-popup input[type="range"]');
    await slider.setValue('0.5');
    expect(window.services.setOpacity).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('changes background color from preset palette', async () => {
    const wrapper = mount(StickyNote);
    await wrapper.find('button.menu-btn').trigger('click');
    const firstColor = wrapper.find('.menu-popup .color-item');
    await firstColor.trigger('click');
    expect(localStorage.getItem('sticky-note-bg')).toBeTruthy();
    wrapper.unmount();
  });
});
