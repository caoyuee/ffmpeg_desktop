/**
 * P2-2：混流命令的唯一构建层（纯函数，不依赖 Vue / Tauri / DOM）。
 *
 * 修复审计 P2-2 的两个问题：
 * 1. 未填任何流选择的文件此前不追加 `-map`，多输入时 ffmpeg 只按默认规则
 *    「每类挑一路最优」，其余流被静默丢弃；现在改为 `-map i` 复制该输入全部流。
 * 2. 字幕 `-c:s copy` 无容器兼容检查：mp4/mov/m4v 对 ass/srt 等字幕编码不友好，
 *    提供 needsSubtitleCopyWarning 供 UI 在启动前给出提示（不阻断，由用户决定）。
 *
 * 混流本质是流复制：统一在末尾追加一次 `-c copy`，替代旧的逐流 `-c:v/-c:a/-c:s copy`，
 * 语义等价且命令更短。显式禁用流（-vn/-an/-sn）的旧风险路径不允许在此出现。
 */

export interface MuxInputSpec {
  path: string
  videoStreams?: string
  audioStreams?: string
  subtitleStreams?: string
  useChapters?: boolean
  useMetadata?: boolean
}

/** 这些容器对原生字幕编码（ass/srt/subrip 等）copy 支持差，输出前值得提醒。 */
const SUBTITLE_COPY_RISK_EXTENSIONS = ['.mp4', '.mov', '.m4v'] as const

function splitStreamIndices(streams: string | undefined): string[] {
  return (streams ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

export function hasExplicitStreamSelection(spec: MuxInputSpec): boolean {
  return (
    splitStreamIndices(spec.videoStreams).length > 0 ||
    splitStreamIndices(spec.audioStreams).length > 0 ||
    splitStreamIndices(spec.subtitleStreams).length > 0
  )
}

/** 输出路径的扩展名（含点、小写）；无扩展名返回 null。 */
export function outputPathExtension(outputPath: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(outputPath.trim())
  return match ? `.${match[1]!.toLowerCase()}` : null
}

export function needsSubtitleCopyWarning(
  outputPath: string,
  hasSubtitleSelection: boolean,
): boolean {
  if (!hasSubtitleSelection) return false
  const extension = outputPathExtension(outputPath)
  if (extension === null) return false
  return (SUBTITLE_COPY_RISK_EXTENSIONS as readonly string[]).includes(extension)
}

/**
 * 构建混流命令。
 *
 * @param inputs      输入列表（路径 + 流选择）
 * @param outputPath  输出文件路径
 * @param ffmpegPath  ffmpeg 可执行文件路径
 */
export function buildMuxCommand(
  inputs: readonly MuxInputSpec[],
  outputPath: string,
  ffmpegPath: string,
): string {
  let command = `${ffmpegPath} -hide_banner -nostdin`

  for (const file of inputs) {
    command += ` -i "${file.path}"`
  }

  for (let i = 0; i < inputs.length; i++) {
    const file = inputs[i]!
    if (!hasExplicitStreamSelection(file)) {
      // P2-2：未选择流的输入复制全部流，避免多输入时默认规则丢流。
      // 章节 / 元数据开关与流选择互相独立，未选流时同样生效。
      command += ` -map ${i}`
      if (file.useChapters) command += ` -map_chapters ${i}`
      if (file.useMetadata) command += ` -map_metadata ${i}`
      continue
    }

    for (const stream of splitStreamIndices(file.videoStreams)) {
      command += ` -map ${i}:v:${stream}`
    }
    for (const stream of splitStreamIndices(file.audioStreams)) {
      command += ` -map ${i}:a:${stream}`
    }
    for (const stream of splitStreamIndices(file.subtitleStreams)) {
      command += ` -map ${i}:s:${stream}`
    }

    if (file.useChapters) command += ` -map_chapters ${i}`
    if (file.useMetadata) command += ` -map_metadata ${i}`
  }

  command += ` -c copy "${outputPath}" -y`
  return command
}
