// 全局类型声明

// FFmpeg 配置相关类型
export interface VideoCodecConfig {
  key: string;
  value: string;
  label: string;
  ffmpegEncoder: string;
  category?: string;
  presets?: string[];
  profiles?: string[];
  tunes?: string[];
}

export interface AudioCodecConfig {
  key: string;
  value: string;
  label: string;
  ffmpegEncoder: string;
}

export interface FormatConfig {
  key: string;
  value: string;
  label: string;
}

export interface PresetConfig {
  key: string;
  value: string;
  label: string;
}

export interface ResolutionConfig {
  key: string;
  width: number;
  height: number;
  label: string;
}

export interface CodecJsonConfig {
  command: string;
  video: VideoCodecConfig[];
  audio?: AudioCodecConfig[];
  format: FormatConfig[];
  presets?: PresetConfig[];
  resolutions?: ResolutionConfig[];
}

export interface FFmpegProgressEvent {
  frame?: number;
  fps?: number;
  time?: string;
  bitrate?: string;
  speed?: string;
  size?: string;
}

export interface FFmpegErrorEvent {
  message: string;
  code?: number;
}

export interface FFmpegFinishEvent {
  outputFile: string;
  exitCode: number;
}
