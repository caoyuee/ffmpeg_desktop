import { loadSettings } from '@/config/settings'

function quoteCommandPath(path: string): string {
  const cleanPath = path.trim().replace(/^"+|"+$/g, '')
  const needsQuotes =
    cleanPath.includes(' ') ||
    cleanPath.includes('(') ||
    cleanPath.includes(')') ||
    /[\u0080-\uFFFF]/.test(cleanPath)

  return needsQuotes ? `"${cleanPath}"` : cleanPath
}

/**
 * 获取用户配置的 FFmpeg 可执行文件命令 token。
 * 优先使用设置中用户手动指定的路径，未配置则回退到 "ffmpeg"（从系统 PATH 查找）。
 * 自定义路径可能包含空格，需要加引号以便 Rust 端 shell_words 正确拆分命令。
 *
 * R2.3：不再自行解析 localStorage，统一经 config/settings.ts 读取（含旧键迁移）。
 */
export function getFFmpegPath(): string {
  try {
    const configured = loadSettings().ffmpegPath
    if (configured.trim()) {
      return quoteCommandPath(configured)
    }
  } catch {
    // localStorage 不可用或数据损坏，回退默认值
  }
  return 'ffmpeg'
}
