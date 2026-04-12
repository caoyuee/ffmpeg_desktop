/**
 * FFmpeg 命令构建器
 * 用于生成完整的 FFmpeg 命令行
 */

/**
 * 格式与编码器兼容性配置
 * 定义每种容器格式支持的视频和音频编码器
 */
export interface FormatCompatibility {
  videoCodecs: string[]; // 支持的视频编码器列表
  audioCodecs: string[]; // 支持的音频编码器列表
  defaultVideo: string; // 默认推荐的视频编码器
  defaultAudio: string; // 默认推荐的音频编码器
  description: string; // 格式说明
}

/**
 * 完整的格式兼容性映射表
 */
export const FORMAT_COMPATIBILITY: Record<string, FormatCompatibility> = {
  // MP4 - 最通用的格式，支持 H.264/H.265/AV1
  mp4: {
    videoCodecs: [
      "libx264",
      "libx265",
      "libaom-av1",
      "libsvtav1",
      "mpeg4",
      "copy",
      "h264_nvenc",
      "hevc_nvenc",
      "h264_qsv",
      "hevc_qsv",
      "h264_vaapi",
      "hevc_vaapi",
      "h264_videotoolbox",
      "hevc_videotoolbox",
      "h264_amf",
      "hevc_amf",
    ],
    audioCodecs: ["aac", "mp3", "ac3", "eac3", "libfdk_aac", "libopus", "copy"],
    defaultVideo: "libx264",
    defaultAudio: "aac",
    description: "MP4 - 最通用的格式，兼容性最好，支持 H.264/H.265/AV1",
  },

  // MKV - 万能容器，几乎支持所有编码器
  mkv: {
    videoCodecs: [
      "libx264",
      "libx265",
      "libvpx-vp9",
      "libaom-av1",
      "libsvtav1",
      "mpeg4",
      "copy",
      "h264_nvenc",
      "hevc_nvenc",
      "h264_qsv",
      "hevc_qsv",
      "h264_vaapi",
      "hevc_vaapi",
      "h264_videotoolbox",
      "hevc_videotoolbox",
      "h264_amf",
      "hevc_amf",
    ],
    audioCodecs: [
      "aac",
      "mp3",
      "ac3",
      "eac3",
      "libopus",
      "libvorbis",
      "flac",
      "pcm_s16le",
      "copy",
    ],
    defaultVideo: "libx264",
    defaultAudio: "aac",
    description: "MKV - 万能容器，支持几乎所有编码器",
  },

  // WebM - 开源格式，只支持 VP8/VP9/AV1 + Vorbis/Opus
  webm: {
    videoCodecs: ["libvpx", "libvpx-vp9", "libaom-av1", "libsvtav1", "copy"],
    audioCodecs: ["libvorbis", "libopus", "opus", "copy"],
    defaultVideo: "libvpx-vp9",
    defaultAudio: "libopus",
    description:
      "WebM - Web 专用开源格式，只支持 VP8/VP9/AV1 视频和 Vorbis/Opus 音频",
  },

  // MOV - QuickTime 格式，主要用于 Apple 生态
  mov: {
    videoCodecs: [
      "libx264",
      "libx265",
      "libaom-av1",
      "prores",
      "mpeg4",
      "copy",
      "h264_nvenc",
      "hevc_nvenc",
      "h264_qsv",
      "hevc_qsv",
      "h264_vaapi",
      "hevc_vaapi",
      "h264_videotoolbox",
      "hevc_videotoolbox",
      "h264_amf",
      "hevc_amf",
    ],
    audioCodecs: ["aac", "mp3", "ac3", "pcm_s16le", "libopus", "copy"],
    defaultVideo: "libx264",
    defaultAudio: "aac",
    description: "MOV - QuickTime 格式，主要用于 Apple 设备",
  },

  // AVI - 传统格式，兼容性广但不推荐新项目使用
  avi: {
    videoCodecs: [
      "libx264",
      "mpeg4",
      "msmpeg4v3",
      "copy",
      "h264_nvenc",
      "h264_qsv",
      "h264_vaapi",
      "h264_videotoolbox",
      "h264_amf",
    ],
    audioCodecs: ["mp3", "ac3", "pcm_s16le", "copy"],
    defaultVideo: "mpeg4",
    defaultAudio: "mp3",
    description: "AVI - 传统格式，兼容性好但不推荐新项目使用",
  },

  // TS - MPEG 传输流，用于流媒体和广播
  ts: {
    videoCodecs: [
      "libx264",
      "libx265",
      "mpeg2video",
      "copy",
      "h264_nvenc",
      "hevc_nvenc",
      "h264_qsv",
      "hevc_qsv",
      "h264_vaapi",
      "hevc_vaapi",
      "h264_videotoolbox",
      "hevc_videotoolbox",
      "h264_amf",
      "hevc_amf",
    ],
    audioCodecs: ["aac", "mp3", "ac3", "mp2", "copy"],
    defaultVideo: "libx264",
    defaultAudio: "aac",
    description: "MPEG-TS - 传输流格式，用于流媒体和广播",
  },
};

/**
 * 检查编码器是否与格式兼容
 */
export function isCodecCompatible(
  format: string,
  codec: string,
  type: "video" | "audio"
): boolean {
  const formatLower = format.toLowerCase().replace(".", "");
  const compatibility = FORMAT_COMPATIBILITY[formatLower];

  if (!compatibility) {
    // 未知格式，允许所有编码器
    return true;
  }

  const codecList =
    type === "video" ? compatibility.videoCodecs : compatibility.audioCodecs;
  return codecList.includes(codec);
}

/**
 * 获取格式的推荐编码器
 */
export function getRecommendedCodec(
  format: string,
  type: "video" | "audio"
): string {
  const formatLower = format.toLowerCase().replace(".", "");
  const compatibility = FORMAT_COMPATIBILITY[formatLower];

  if (!compatibility) {
    // 未知格式，返回通用编码器
    return type === "video" ? "libx264" : "aac";
  }

  return type === "video"
    ? compatibility.defaultVideo
    : compatibility.defaultAudio;
}

/**
 * 获取格式支持的所有编码器
 */
export function getCompatibleCodecs(
  format: string,
  type: "video" | "audio"
): string[] {
  const formatLower = format.toLowerCase().replace(".", "");
  const compatibility = FORMAT_COMPATIBILITY[formatLower];

  if (!compatibility) {
    // 未知格式，返回空数组（表示支持所有）
    return [];
  }

  return type === "video"
    ? compatibility.videoCodecs
    : compatibility.audioCodecs;
}

/**
 * 过滤出与指定格式兼容的编码器列表
 * @param format 输出格式
 * @param codecs 编码器列表（带有 ffmpegEncoder 字段）
 * @param type 编码器类型
 * @returns 过滤后的编码器列表
 */
export function filterCompatibleCodecs<T extends { ffmpegEncoder: string }>(
  format: string,
  codecs: T[],
  type: "video" | "audio"
): T[] {
  const compatibleCodecs = getCompatibleCodecs(format, type);

  // 如果是空数组，表示支持所有编码器
  if (compatibleCodecs.length === 0) {
    return codecs;
  }

  // 过滤出兼容的编码器
  return codecs.filter((codec) => {
    // 'copy' 模式对所有格式都兼容
    if (codec.ffmpegEncoder === "copy") {
      return true;
    }
    return compatibleCodecs.includes(codec.ffmpegEncoder);
  });
}

export interface FFmpegCommandOptions {
  ffmpegPath?: string;
  input: string;
  output?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  crf?: number;
  preset?: string;
  width?: number;
  height?: number;
  fps?: number;
  scale?: string;
  customFilters?: string[];
  copyCodec?: boolean;
  hwaccel?: string;
  extraArgs?: string[];
}

export class FFmpegCommandBuilder {
  private options: FFmpegCommandOptions;
  private parts: string[] = [];

  constructor(options: FFmpegCommandOptions) {
    this.options = options;
  }

  /**
   * 构建完整的 FFmpeg 命令
   */
  build(): string {
    this.parts = [];

    // FFmpeg 可执行文件路径（需要转义）
    const ffmpegPath = this.options.ffmpegPath || "ffmpeg";
    this.parts.push(this.escapeFilePath(ffmpegPath));

    // 硬件加速
    if (this.options.hwaccel) {
      this.parts.push("-hwaccel", this.options.hwaccel);
    }

    // 输入时间范围（-ss 应该在 -i 之前以实现快速 seek）
    if (this.options.startTime) {
      this.parts.push("-ss", this.options.startTime);
    }

    // 输入文件
    this.parts.push("-i", this.escapeFilePath(this.options.input));

    // 持续时间或结束时间
    if (this.options.duration) {
      this.parts.push("-t", this.options.duration);
    } else if (this.options.endTime && this.options.startTime) {
      const duration = this.calculateDuration(
        this.options.startTime,
        this.options.endTime
      );
      if (duration > 0) {
        this.parts.push("-t", duration.toString());
      }
    }

    // ✅ WebM 格式兼容性检查和自动修正
    this.ensureFormatCompatibility();

    // 视频编码参数
    this.addVideoCodecParams();

    // 音频编码参数
    this.addAudioCodecParams();

    // 滤镜
    this.addFilters();

    // 额外参数
    if (this.options.extraArgs) {
      this.parts.push(...this.options.extraArgs);
    }

    // 输出文件
    const output = this.options.output || this.generateOutputPath();
    this.parts.push(this.escapeFilePath(output));

    return this.parts.join(" ");
  }

  /**
   * 确保输出格式与编码器兼容
   * 自动检查并修正不兼容的编码器
   */
  private ensureFormatCompatibility(): void {
    const outputFormat = this.getOutputFormat();
    const compatibility = FORMAT_COMPATIBILITY[outputFormat];

    // 如果是未知格式，不做修改
    if (!compatibility) {
      return;
    }

    // ❗ 特殊处理：copy 模式 + 严格格式（WebM/AVI）
    if (this.options.copyCodec) {
      // WebM 和 AVI 对编码器有严格要求，copy 模式可能导致失败
      const strictFormats = ["webm", "avi"];
      if (strictFormats.includes(outputFormat)) {
        console.warn(
          `⚠️ ${outputFormat.toUpperCase()} 格式不支持 copy 模式（源文件编码器可能不兼容），已自动切换为重新编码`
        );
        // 禁用 copy 模式，强制使用推荐编码器
        this.options.copyCodec = false;
        this.options.videoCodec = compatibility.defaultVideo;
        this.options.audioCodec = compatibility.defaultAudio;
      }
      // 其他格式（MP4/MKV/MOV/TS）允许 copy 模式
      return;
    }

    const videoCodec = this.options.videoCodec;
    const audioCodec = this.options.audioCodec;

    // 检查视频编码器是否兼容
    if (videoCodec && !compatibility.videoCodecs.includes(videoCodec)) {
      const recommended = compatibility.defaultVideo;
      console.warn(
        `${outputFormat.toUpperCase()} 格式不支持 ${videoCodec} 视频编码器，自动切换到 ${recommended}`
      );
      this.options.videoCodec = recommended;
    }

    // 检查音频编码器是否兼容
    if (audioCodec && !compatibility.audioCodecs.includes(audioCodec)) {
      const recommended = compatibility.defaultAudio;
      console.warn(
        `${outputFormat.toUpperCase()} 格式不支持 ${audioCodec} 音频编码器，自动切换到 ${recommended}`
      );
      this.options.audioCodec = recommended;
    } else if (!audioCodec && videoCodec) {
      // 如果没有指定音频编码器，使用格式的默认值
      this.options.audioCodec = compatibility.defaultAudio;
    }
  }

  /**
   * 获取输出格式
   */
  private getOutputFormat(): string {
    // 从 output 路径获取
    if (this.options.output) {
      const ext = this.options.output.split(".").pop()?.toLowerCase();
      if (ext) return ext;
    }

    // 从 format 选项获取
    if (this.options.format) {
      return this.options.format.replace(".", "").toLowerCase();
    }

    // 默认 mp4
    return "mp4";
  }

  /**
   * 添加视频编码参数
   */
  private addVideoCodecParams(): void {
    if (this.options.copyCodec) {
      this.parts.push("-c", "copy");
      return;
    }

    if (this.options.videoCodec) {
      this.parts.push("-c:v", this.options.videoCodec);

      // CRF 质量控制
      if (this.options.crf !== undefined) {
        this.parts.push("-crf", this.options.crf.toString());
      }

      // 编码预设
      if (this.options.preset) {
        this.parts.push("-preset", this.options.preset);
      }

      // 视频码率
      if (this.options.videoBitrate) {
        this.parts.push("-b:v", this.options.videoBitrate);
      }

      // 帧率
      if (this.options.fps) {
        this.parts.push("-r", this.options.fps.toString());
      }

      // 像素格式（H.264/H.265 需要）
      if (
        this.options.videoCodec === "libx264" ||
        this.options.videoCodec === "libx265"
      ) {
        this.parts.push("-pix_fmt", "yuv420p");
      }

      // H.265 特殊标签
      if (this.options.videoCodec === "libx265") {
        this.parts.push("-tag:v", "hvc1");
      }
    }
  }

  /**
   * 添加音频编码参数
   */
  private addAudioCodecParams(): void {
    if (this.options.copyCodec) {
      return;
    }

    if (this.options.audioCodec) {
      this.parts.push("-c:a", this.options.audioCodec);

      // Opus/Vorbis 特殊处理：非标准声道布局转换为立体声
      if (
        this.options.audioCodec === "libopus" ||
        this.options.audioCodec === "opus" ||
        this.options.audioCodec === "libvorbis"
      ) {
        // 对于多声道音频（如 4.0、5.1等），自动转换为立体声
        // 这避免了 "Invalid channel layout" 错误
        this.parts.push("-ac", "2"); // 强制转换为立体声
      }

      // 音频码率
      if (this.options.audioBitrate) {
        this.parts.push("-b:a", this.options.audioBitrate);
      }
    } else if (this.options.videoCodec) {
      // 根据输出格式选择默认音频编码器
      const outputFormat = this.getOutputFormat();
      if (outputFormat === "webm") {
        this.parts.push("-c:a", "libopus");
        // Opus 默认转换为立体声
        this.parts.push("-ac", "2");
      } else {
        this.parts.push("-c:a", "aac");
      }
    }
  }

  /**
   * 添加视频滤镜
   */
  private addFilters(): void {
    const filters: string[] = [];

    // 缩放
    if (this.options.scale) {
      filters.push(`scale=${this.options.scale}`);
    } else if (this.options.width || this.options.height) {
      const width = this.options.width || -1;
      const height = this.options.height || -1;
      filters.push(`scale=${width}:${height}`);
    }

    // 自定义滤镜
    if (this.options.customFilters) {
      filters.push(...this.options.customFilters);
    }

    // 应用滤镜
    if (filters.length > 0) {
      this.parts.push("-vf", filters.join(","));
    }
  }

  /**
   * 计算持续时间（秒）
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const startSeconds = this.timeToSeconds(startTime);
    const endSeconds = this.timeToSeconds(endTime);
    return Math.max(0, endSeconds - startSeconds);
  }

  /**
   * 时间字符串转秒数
   */
  private timeToSeconds(time: string): number {
    const parts = time.split(":").map(Number);
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * 转义文件路径（添加引号）
   * 对于包含空格、中文、特殊字符的路径，必须用引号包裹
   */
  private escapeFilePath(path: string): string {
    // 检查是否需要引号的条件：
    // 1. 包含空格
    // 2. 包含中文字符（Unicode 大于 127）
    // 3. 包含特殊字符
    const needsQuotes =
      path.includes(" ") ||
      path.includes("(") ||
      path.includes(")") ||
      /[\u0080-\uFFFF]/.test(path); // 检测非-ASCII 字符（包括中文）

    if (needsQuotes) {
      // 如果路径已经有引号，先去除
      const cleanPath = path.replace(/^"+|"+$/g, "");
      return `"${cleanPath}"`;
    }
    return path;
  }

  /**
   * 生成输出文件路径
   */
  private generateOutputPath(): string {
    const input = this.options.input;
    const format = this.options.format || "mp4";

    // 获取文件名（不含扩展名）
    const lastDot = input.lastIndexOf(".");
    const lastSlash = Math.max(input.lastIndexOf("/"), input.lastIndexOf("\\"));
    const baseName = input.substring(
      lastSlash + 1,
      lastDot > lastSlash ? lastDot : input.length
    );
    const dirName = input.substring(0, lastSlash + 1);

    // 生成输出文件名
    return `${dirName}${baseName}_output.${format}`;
  }

  /**
   * 获取当前配置的简要描述
   */
  getDescription(): string {
    const parts: string[] = [];

    if (this.options.videoCodec) {
      parts.push(`编码: ${this.options.videoCodec}`);
    }
    if (this.options.crf !== undefined) {
      parts.push(`CRF: ${this.options.crf}`);
    }
    if (this.options.preset) {
      parts.push(`预设: ${this.options.preset}`);
    }
    if (this.options.scale || this.options.width || this.options.height) {
      parts.push(`分辨率调整`);
    }
    if (this.options.startTime || this.options.endTime) {
      parts.push(`剪切`);
    }

    return parts.join(" | ") || "转码";
  }
}

/**
 * 便捷函数：快速构建命令
 */
export function buildFFmpegCommand(options: FFmpegCommandOptions): string {
  const builder = new FFmpegCommandBuilder(options);
  return builder.build();
}

/**
 * 预设配置
 */
export const FFmpegPresets = {
  // H.264 高质量
  h264_high: (input: string): FFmpegCommandOptions => ({
    input,
    videoCodec: "libx264",
    audioCodec: "aac",
    crf: 18,
    preset: "slow",
  }),

  // H.264 中等质量
  h264_medium: (input: string): FFmpegCommandOptions => ({
    input,
    videoCodec: "libx264",
    audioCodec: "aac",
    crf: 23,
    preset: "medium",
  }),

  // H.265 高质量
  h265_high: (input: string): FFmpegCommandOptions => ({
    input,
    videoCodec: "libx265",
    audioCodec: "aac",
    crf: 20,
    preset: "slow",
  }),

  // 快速复制（无转码）
  copy: (input: string): FFmpegCommandOptions => ({
    input,
    copyCodec: true,
  }),

  // 720p 转码
  to720p: (input: string): FFmpegCommandOptions => ({
    input,
    videoCodec: "libx264",
    audioCodec: "aac",
    crf: 23,
    preset: "medium",
    height: 720,
    width: -1,
  }),

  // 1080p 转码
  to1080p: (input: string): FFmpegCommandOptions => ({
    input,
    videoCodec: "libx264",
    audioCodec: "aac",
    crf: 21,
    preset: "medium",
    height: 1080,
    width: -1,
  }),
};
