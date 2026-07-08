import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface TauriWindowConfig {
  width?: number;
  height?: number;
  resizable?: boolean;
  maximizable?: boolean;
  minWidth?: number;
  minHeight?: number;
}

interface TauriConfig {
  app?: {
    windows?: TauriWindowConfig[];
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('window configuration', () => {
  it('keeps the main app window resizeable after packaging', () => {
    const config = readJson<TauriConfig>('src-tauri/tauri.conf.json');
    const mainWindow = config.app?.windows?.[0];

    expect(mainWindow?.resizable).toBe(true);
    expect(mainWindow?.maximizable).toBe(true);
    expect(mainWindow?.width).toBe(1280);
    expect(mainWindow?.height).toBe(800);
    expect(mainWindow?.minWidth).toBe(1024);
    expect(mainWindow?.minHeight).toBe(640);
  });

  it('does not override resize settings in the Windows packaging config', () => {
    const windowsConfig = readJson<TauriConfig>('src-tauri/tauri.windows.conf.json');

    expect(windowsConfig.app?.windows).toBeUndefined();
  });
});
