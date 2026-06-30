import type { Page } from '@playwright/test';

type TauriInvokeArgs = Record<string, unknown> | undefined;

export async function installTauriMock(page: Page) {
  await page.addInitScript(() => {
    const listeners = new Map<number, (...args: unknown[]) => void>();
    let callbackId = 1;

    function resolveInvoke(command: string, args?: Record<string, unknown>) {
      if (command === 'parse_startup_args') return {};
      if (command === 'check_ffmpeg_tools') {
        return { ffmpeg: false, ffprobe: false, ffplay: false };
      }
      if (command.endsWith('|listen')) return callbackId++;
      if (command.endsWith('|unlisten')) return null;
      if (command.endsWith('|load')) return {};
      if (command.endsWith('|get_store_state')) return {};
      if (command.endsWith('|get_store_ids')) return [];
      if (command.endsWith('|get_store_path')) return '';
      if (command.endsWith('|get_store_collection_path')) return '';
      if (command.endsWith('|get_default_save_strategy')) return 'immediate';
      if (command.endsWith('|get_save_strategy')) return 'immediate';
      if (command.endsWith('|patch')) return null;
      if (command.endsWith('|set_store_options')) return null;
      if (command.endsWith('|save_some')) return null;
      if (command.endsWith('|save_some_now')) return null;
      if (command.endsWith('|save_all')) return null;
      if (command.endsWith('|save_all_now')) return null;
      if (command.endsWith('|set_autosave')) return null;
      if (command.endsWith('|clear_autosave')) return null;
      if (command.endsWith('|allow_save')) return null;
      if (command.endsWith('|allow_sync')) return null;
      if (command.endsWith('|deny_save')) return null;
      if (command.endsWith('|deny_sync')) return null;
      if (command.startsWith('plugin:')) return null;
      if (args) return null;
      return null;
    }

    window.__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: 'main' },
        currentWebview: { label: 'main' },
      },
      invoke: (command: string, args?: TauriInvokeArgs) => Promise.resolve(resolveInvoke(command, args)),
      transformCallback: (callback: (...args: unknown[]) => void) => {
        const id = callbackId++;
        listeners.set(id, callback);
        return id;
      },
      unregisterCallback: (id: number) => {
        listeners.delete(id);
      },
      convertFileSrc: (filePath: string, protocol = 'asset') => `${protocol}://localhost/${filePath}`,
    };

    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener: () => {},
    };
  });
}
