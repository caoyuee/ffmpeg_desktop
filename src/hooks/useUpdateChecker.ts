import { ref } from 'vue';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface ReleaseInfo {
  version: string;
  currentVersion: string;
  url: string;
  body: string;
  publishedAt: string;
}

interface UpdateState {
  checking: boolean;
  checked: boolean;
  installing: boolean;
  latestRelease: ReleaseInfo | null;
  hasUpdate: boolean;
  error: string | null;
  downloadProgress: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
}

function getMetadataUrl(update: Update): string {
  const rawUrl = update.rawJson.url || update.rawJson.html_url || update.rawJson.releaseUrl;
  return typeof rawUrl === 'string' ? rawUrl : '';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useUpdateChecker() {
  const availableUpdate = ref<Update | null>(null);
  const state = ref<UpdateState>({
    checking: false,
    checked: false,
    installing: false,
    latestRelease: null,
    hasUpdate: false,
    error: null,
    downloadProgress: null,
    downloadedBytes: 0,
    totalBytes: null,
  });

  function resetDownloadState() {
    state.value.downloadProgress = null;
    state.value.downloadedBytes = 0;
    state.value.totalBytes = null;
  }

  async function checkForUpdates() {
    state.value.checking = true;
    state.value.checked = false;
    state.value.error = null;
    resetDownloadState();

    try {
      const update = await check();
      availableUpdate.value = update;
      state.value.hasUpdate = update !== null;
      state.value.latestRelease = update
        ? {
            version: update.version,
            currentVersion: update.currentVersion,
            url: getMetadataUrl(update),
            body: update.body ?? '',
            publishedAt: update.date ?? '',
          }
        : null;
    } catch (error) {
      availableUpdate.value = null;
      state.value.hasUpdate = false;
      state.value.latestRelease = null;
      state.value.error = getErrorMessage(error);
    } finally {
      state.value.checked = true;
      state.value.checking = false;
    }
  }

  async function downloadAndInstallUpdate() {
    const update = availableUpdate.value;
    if (!update) return;

    state.value.installing = true;
    state.value.error = null;
    resetDownloadState();

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === 'Started') {
          state.value.totalBytes = event.data.contentLength ?? null;
          state.value.downloadedBytes = 0;
          state.value.downloadProgress = 0;
        } else if (event.event === 'Progress') {
          state.value.downloadedBytes += event.data.chunkLength;
          if (state.value.totalBytes) {
            state.value.downloadProgress = Math.min(
              100,
              Math.round((state.value.downloadedBytes / state.value.totalBytes) * 100),
            );
          }
        } else if (event.event === 'Finished') {
          state.value.downloadProgress = 100;
        }
      });
      await relaunch();
    } catch (error) {
      state.value.error = getErrorMessage(error);
      state.value.installing = false;
    }
  }

  return { state, checkForUpdates, downloadAndInstallUpdate };
}
