import { ref } from 'vue'

interface ReleaseInfo {
  version: string
  url: string
  body: string
  publishedAt: string
}

interface UpdateState {
  checking: boolean
  latestRelease: ReleaseInfo | null
  hasUpdate: boolean
  error: string | null
}

const RELEASE_API = 'https://gitee.com/api/v5/repos/caoyuee/video-editor/releases/latest'
const CURRENT_VERSION = '0.1.1'

export function useUpdateChecker() {
  const state = ref<UpdateState>({
    checking: false,
    latestRelease: null,
    hasUpdate: false,
    error: null,
  })

  function compareVersions(current: string, latest: string): boolean {
    const cur = current.split('.').map(Number)
    const lat = latest.replace(/^v/, '').split('.').map(Number)
    for (let i = 0; i < Math.max(cur.length, lat.length); i++) {
      const c = cur[i] ?? 0
      const l = lat[i] ?? 0
      if (l > c) return true
      if (l < c) return false
    }
    return false
  }

  async function checkForUpdates() {
    state.value.checking = true
    state.value.error = null

    try {
      const resp = await fetch(RELEASE_API)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      const latestVersion = data.tag_name || data.name || ''

      state.value.latestRelease = {
        version: latestVersion,
        url: data.html_url || data.url || '',
        body: data.body || data.description || '',
        publishedAt: data.published_at || data.created_at || '',
      }

      state.value.hasUpdate = compareVersions(CURRENT_VERSION, latestVersion)
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      state.value.checking = false
    }
  }

  return { state, checkForUpdates }
}
