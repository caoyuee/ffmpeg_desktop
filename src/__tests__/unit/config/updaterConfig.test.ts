import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface TauriConfig {
  plugins?: {
    updater?: {
      endpoints?: string[];
    };
  };
}

function readTauriConfig(): TauriConfig {
  return JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')) as TauriConfig;
}

describe('updater configuration', () => {
  it('uses the GitHub latest release asset instead of the missing Gitee latest tag asset', () => {
    const endpoints = readTauriConfig().plugins?.updater?.endpoints ?? [];

    expect(endpoints).toContain('https://github.com/caoyuee/ffmpeg_desktop/releases/latest/download/latest.json');
    expect(endpoints).not.toContain('https://gitee.com/caoyuee/ffmpeg_desktop/releases/download/latest/latest.json');
  });
});
