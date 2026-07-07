import { mount } from '@vue/test-utils';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import Settings from '@/pages/Settings/index.vue';

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(() => Promise.resolve('0.1.6')),
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(() => Promise.resolve()),
}));

describe('Settings about links', () => {
  beforeEach(() => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(invoke).mockResolvedValue(null);
    vi.mocked(openUrl).mockResolvedValue(undefined);
  });

  it('opens the current GitHub repository, issues, and releases pages', async () => {
    const wrapper = mount(Settings, {
      global: {
        plugins: [i18n, createPinia()],
        stubs: {
          ConfirmDialog: true,
          Toast: true,
        },
      },
    });

    await wrapper.findAll('.settings-tab')[4]?.trigger('click');

    const links = wrapper.findAll('.links a');
    await links[0]?.trigger('click');
    await links[1]?.trigger('click');
    await links[2]?.trigger('click');

    expect(openUrl).toHaveBeenNthCalledWith(1, 'https://github.com/caoyuee/ffmpeg_desktop');
    expect(openUrl).toHaveBeenNthCalledWith(2, 'https://github.com/caoyuee/ffmpeg_desktop/issues');
    expect(openUrl).toHaveBeenNthCalledWith(3, 'https://github.com/caoyuee/ffmpeg_desktop/releases');
  });
});
