function quoteCommandPath(path: string): string {
  const cleanPath = path.trim().replace(/^"+|"+$/g, '');
  const needsQuotes =
    cleanPath.includes(' ') ||
    cleanPath.includes('(') ||
    cleanPath.includes(')') ||
    /[\u0080-\uFFFF]/.test(cleanPath);

  return needsQuotes ? `"${cleanPath}"` : cleanPath;
}

/**
 * 获取用户配置的 FFmpeg 可执行文件命令 token
 * 优先使用 Settings 中用户手动指定的路径，未配置则回退到 "ffmpeg"（从系统 PATH 查找）
 * 自定义路径可能包含空格，需要加引号以便 Rust 端 shell_words 正确拆分命令
 */
export function getFFmpegPath(): string {
  try {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.ffmpegPath && typeof parsed.ffmpegPath === 'string' && parsed.ffmpegPath.trim()) {
        return quoteCommandPath(parsed.ffmpegPath);
      }
    }
  } catch {
    // localStorage 不可用或数据损坏，回退默认值
  }
  return 'ffmpeg';
}
