/**
 * 获取用户配置的 FFmpeg 可执行文件路径
 * 优先使用 Settings 中用户手动指定的路径，未配置则回退到 "ffmpeg"（从系统 PATH 查找）
 * 跨平台兼容：Linux/macOS/Windows 通过 PATH 均可找到对应二进制
 */
export function getFFmpegPath(): string {
  try {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.ffmpegPath && typeof parsed.ffmpegPath === 'string' && parsed.ffmpegPath.trim()) {
        return parsed.ffmpegPath.trim();
      }
    }
  } catch {
    // localStorage 不可用或数据损坏，回退默认值
  }
  return 'ffmpeg';
}
