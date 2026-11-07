/**
 * R2.3 文件列表的共享类型（原散落在 hooks/useFileList.ts 与 hooks/useMediaProbe.ts）。
 * 跨模块复用的类型按《前端结构规范》§6 统一放在 src/types/ 下。
 */

export interface MediaInfo {
  duration?: number
  width?: number
  height?: number
  bitRate?: string
  codecName?: string
  formatName?: string
}

export type FileStatus = 'pending' | 'processing' | 'success' | 'error'

/** 带处理状态与媒体信息的列表条目（R2.3 起成为唯一模型）。 */
export interface FileItem {
  path: string
  status: FileStatus
  error?: string
  mediaInfo?: MediaInfo
}

/**
 * ffprobe 原始 JSON 的宽松类型（Rust `probe_media_info` 的返回值）。
 * 字段全部可选：ffprobe 对不同容器/编码的输出字段并不保证齐全。
 */
export interface FfprobeStream {
  index?: number
  codec_type?: string
  codec_name?: string
  codec_long_name?: string
  width?: number
  height?: number
  r_frame_rate?: string
  display_aspect_ratio?: string
  sample_rate?: string
  channels?: number
  bit_rate?: string
  language?: string
  tags?: { language?: string } & Record<string, string | undefined>
}

export interface FfprobeFormat {
  filename?: string
  format_name?: string
  format_long_name?: string
  duration?: string
  size?: string
  bit_rate?: string
  tags?: Record<string, string>
}

export interface FfprobeOutput {
  format?: FfprobeFormat
  streams?: FfprobeStream[]
}
