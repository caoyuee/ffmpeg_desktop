interface CodecMeta {
  presets: string[]
  profiles: string[]
  tunes: string[]
  pixFmts: string[]
}

export const CODEC_DATABASE: Record<string, CodecMeta> = {
  copy: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: [],
  },

  // H.264
  libx264: {
    presets: [
      'veryslow',
      'slower',
      'slow',
      'medium',
      'fast',
      'faster',
      'veryfast',
      'superfast',
      'ultrafast',
    ],
    profiles: ['baseline', 'main', 'high', 'high10', 'high422', 'high444'],
    tunes: [
      'film',
      'animation',
      'grain',
      'stillimage',
      'psnr',
      'ssim',
      'fastdecode',
      'zerolatency',
    ],
    pixFmts: [
      'yuv420p',
      'yuvj420p',
      'yuv422p',
      'yuvj422p',
      'yuv444p',
      'yuvj444p',
      'nv12',
      'nv16',
      'nv21',
      'yuv420p10le',
      'yuv422p10le',
      'yuv444p10le',
      'nv20le',
      'gray',
      'gray10le',
    ],
  },
  h264_nvenc: {
    presets: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    profiles: ['baseline', 'main', 'high', 'high10', 'high422', 'high444p'],
    tunes: ['hq', 'll', 'ull', 'lossless'],
    pixFmts: [
      'yuv420p',
      'nv12',
      'p010le',
      'yuv444p',
      'p016le',
      'nv16',
      'p210le',
      'p216le',
      'yuv444p16le',
      'bgr0',
      'bgra',
      'rgb0',
      'rgba',
      'x2rgb10le',
      'x2bgr10le',
      'gbrp',
      'gbrp16le',
      'cuda',
      'd3d11',
    ],
  },
  h264_qsv: {
    presets: ['veryslow', 'slower', 'slow', 'medium', 'fast', 'faster', 'veryfast'],
    profiles: ['baseline', 'main', 'high'],
    tunes: [],
    pixFmts: ['nv12', 'qsv'],
  },
  h264_amf: {
    presets: ['speed', 'balanced', 'quality'],
    profiles: ['main', 'high', 'constrained_baseline', 'constrained_high'],
    tunes: [
      'transcoding',
      'ultralowlatency',
      'lowlatency',
      'webcam',
      'high_quality',
      'lowlatency_high_quality',
    ],
    pixFmts: [
      'nv12',
      'yuv420p',
      'd3d11',
      'dxva2_vld',
      'p010le',
      'bgr0',
      'rgb0',
      'bgra',
      'argb',
      'rgba',
      'x2bgr10le',
      'rgbaf16le',
    ],
  },
  h264_vaapi: {
    presets: [],
    profiles: ['baseline', 'main', 'high', 'constrained_baseline'],
    tunes: [],
    pixFmts: ['vaapi'],
  },
  h264_videotoolbox: {
    presets: [],
    profiles: ['baseline', 'main', 'high'],
    tunes: [],
    pixFmts: ['videotoolbox_vld', 'nv12', 'yuv420p'],
  },
  h264_vulkan: {
    presets: [],
    profiles: ['main', 'main10', 'rext', 'constrained_baseline'],
    tunes: ['hq', 'll', 'ull', 'lossless'],
    pixFmts: ['vulkan'],
  },

  // H.265/HEVC
  libkvazaar: {
    presets: [
      'veryslow',
      'slower',
      'slow',
      'medium',
      'fast',
      'faster',
      'veryfast',
      'superfast',
      'ultrafast',
    ],
    profiles: ['main', 'main10', 'mainstillpicture'],
    tunes: ['psnr', 'ssim', 'grain', 'fastdecode', 'zerolatency'],
    pixFmts: [
      'yuv420p',
      'yuv422p',
      'yuv444p',
      'yuv420p10le',
      'yuv422p10le',
      'yuv444p10le',
      'yuv420p12le',
      'yuv422p12le',
      'yuv444p12le',
    ],
  },
  libx265: {
    presets: [
      'veryslow',
      'slower',
      'slow',
      'medium',
      'fast',
      'faster',
      'veryfast',
      'superfast',
      'ultrafast',
    ],
    profiles: ['main', 'mainstillpicture'],
    tunes: ['psnr', 'ssim', 'grain', 'fastdecode', 'zerolatency', 'animation', 'stillimage'],
    pixFmts: [
      'yuv420p',
      'yuvj420p',
      'yuv422p',
      'yuvj422p',
      'yuv444p',
      'yuvj444p',
      'gbrp',
      'yuv420p10le',
      'yuv422p10le',
      'yuv444p10le',
      'gbrp10le',
      'yuv420p12le',
      'yuv422p12le',
      'yuv444p12le',
      'gbrp12le',
      'gray',
      'gray10le',
      'gray12le',
      'yuva420p',
      'yuva420p10le',
    ],
  },
  hevc_nvenc: {
    presets: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    profiles: ['main', 'rext'],
    tunes: ['hq', 'uhq', 'll', 'ull', 'lossless'],
    pixFmts: [
      'yuv420p',
      'nv12',
      'p010le',
      'yuv444p',
      'p016le',
      'nv16',
      'p210le',
      'p216le',
      'yuv444p16le',
      'bgr0',
      'bgra',
      'rgb0',
      'rgba',
      'x2rgb10le',
      'x2bgr10le',
      'gbrp',
      'gbrp16le',
      'cuda',
      'd3d11',
    ],
  },
  hevc_qsv: {
    presets: ['veryslow', 'slower', 'slow', 'medium', 'fast', 'faster', 'veryfast'],
    profiles: ['main', 'mainsp', 'rext', 'scc'],
    tunes: [],
    pixFmts: [
      'nv12',
      'p010le',
      'p012le',
      'yuyv422',
      'y210le',
      'qsv',
      'bgra',
      'x2rgb10le',
      'vuyx',
      'xv30le',
    ],
  },
  hevc_amf: {
    presets: ['speed', 'balanced', 'quality'],
    profiles: ['main'],
    tunes: [
      'transcoding',
      'ultralowlatency',
      'lowlatency',
      'webcam',
      'high_quality',
      'lowlatency_high_quality',
    ],
    pixFmts: [
      'nv12',
      'yuv420p',
      'd3d11',
      'dxva2_vld',
      'p010le',
      'bgr0',
      'rgb0',
      'bgra',
      'argb',
      'rgba',
      'x2bgr10le',
      'rgbaf16le',
    ],
  },
  hevc_vaapi: {
    presets: [],
    profiles: ['main', 'main10', 'rext'],
    tunes: [],
    pixFmts: ['vaapi'],
  },
  hevc_videotoolbox: {
    presets: [],
    profiles: ['main', 'main10'],
    tunes: [],
    pixFmts: ['videotoolbox_vld', 'nv12', 'yuv420p'],
  },
  hevc_vulkan: {
    presets: [],
    profiles: ['main', 'main10', 'rext'],
    tunes: ['hq', 'll', 'ull', 'lossless'],
    pixFmts: ['vulkan'],
  },

  // AV1
  'libaom-av1': {
    presets: ['0', '1', '2', '3', '4', '5', '6', '7', '8'],
    profiles: ['0', '1', '2'],
    tunes: ['psnr', 'ssim', 'qmt'],
    pixFmts: [
      'yuv420p',
      'yuv422p',
      'yuv444p',
      'gbrp',
      'yuv420p10le',
      'yuv422p10le',
      'yuv444p10le',
      'yuv420p12le',
      'yuv422p12le',
      'yuv444p12le',
      'gbrp10le',
      'gbrp12le',
      'gray',
      'gray10le',
      'gray12le',
    ],
  },
  libsvtav1: {
    presets: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
    profiles: ['main', 'high', 'professional'],
    tunes: [],
    pixFmts: ['yuv420p', 'yuv420p10le'],
  },
  librav1e: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: [
      'yuv420p',
      'yuvj420p',
      'yuv420p10le',
      'yuv420p12le',
      'yuv422p',
      'yuvj422p',
      'yuv422p10le',
      'yuv422p12le',
      'yuv444p',
      'yuvj444p',
      'yuv444p10le',
      'yuv444p12le',
    ],
  },
  av1_nvenc: {
    presets: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    profiles: ['main', 'high', 'professional'],
    tunes: ['hq', 'uhq', 'll', 'ull', 'lossless'],
    pixFmts: [
      'yuv420p',
      'nv12',
      'p010le',
      'yuv444p',
      'p016le',
      'nv16',
      'p210le',
      'p216le',
      'yuv444p10msble',
      'yuv444p16le',
      'bgr0',
      'bgra',
      'rgb0',
      'rgba',
      'x2rgb10le',
      'x2bgr10le',
      'gbrp',
      'gbrp10msble',
      'gbrp16le',
      'cuda',
      'd3d11',
    ],
  },
  av1_qsv: {
    presets: ['veryslow', 'slower', 'slow', 'medium', 'fast', 'faster', 'veryfast'],
    profiles: ['main', 'main10'],
    tunes: [],
    pixFmts: ['nv12', 'p010le', 'qsv'],
  },
  av1_amf: {
    presets: ['speed', 'balanced', 'quality', 'high_quality'],
    profiles: ['main'],
    tunes: [],
    pixFmts: [
      'nv12',
      'yuv420p',
      'd3d11',
      'dxva2_vld',
      'p010le',
      'bgr0',
      'rgb0',
      'bgra',
      'argb',
      'rgba',
      'x2bgr10le',
      'rgbaf16le',
    ],
  },
  av1_vaapi: {
    presets: [],
    profiles: ['main', 'high', 'professional'],
    tunes: [],
    pixFmts: ['vaapi'],
  },
  av1_vulkan: {
    presets: [],
    profiles: ['main'],
    tunes: ['hq', 'll', 'ull', 'lossless'],
    pixFmts: ['vulkan'],
  },
  av1_d3d12va: {
    presets: [],
    profiles: ['main'],
    tunes: [],
    pixFmts: ['d3d12'],
  },

  // VP9
  'libvpx-vp9': {
    presets: ['0', '1', '2', '3', '4', '5'],
    profiles: [],
    tunes: ['psnr', 'ssim'],
    pixFmts: [
      'yuv420p',
      'yuva420p',
      'yuv422p',
      'yuv440p',
      'yuv444p',
      'yuv420p10le',
      'yuv422p10le',
      'yuv440p10le',
      'yuv444p10le',
      'yuv420p12le',
      'yuv422p12le',
      'yuv440p12le',
      'yuv444p12le',
      'gbrp',
      'gbrp10le',
      'gbrp12le',
    ],
  },
  libsvt_vp9: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ['yuv420p', 'yuv420p10le'],
  },
  vp9_qsv: {
    presets: ['veryslow', 'slower', 'slow', 'medium', 'fast', 'faster', 'veryfast'],
    profiles: ['profile0', 'profile1', 'profile2', 'profile3'],
    tunes: [],
    pixFmts: ['nv12', 'p010le', 'vuyx', 'qsv', 'xv30le'],
  },
  vp9_vaapi: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ['vaapi'],
  },

  // VP8
  libvpx: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ['yuv420p', 'yuva420p'],
  },
  vp8_vaapi: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ['vaapi'],
  },

  // ProRes
  prores_ks: {
    presets: [],
    profiles: ['auto', 'proxy', 'lt', 'standard', 'hq', '4444', '4444xq'],
    tunes: [],
    pixFmts: ['yuv422p10le', 'yuv444p10le', 'yuva444p10le'],
  },
  prores_aw: {
    presets: [],
    profiles: ['auto', 'proxy', 'lt', 'standard', 'hq', '4444', '4444xq'],
    tunes: [],
    pixFmts: ['yuv422p10le', 'yuv444p10le', 'yuva444p10le'],
  },

  // Misc
  mpeg4: {
    presets: [],
    profiles: ['simple', 'simplep', 'core', 'main', 'advanced', 'advancedp'],
    tunes: [],
    pixFmts: ['yuv420p'],
  },
  mpeg2video: {
    presets: [],
    profiles: [
      'main',
      'main8',
      'main10',
      'main12',
      '422',
      '422h',
      '422_10',
      '422_12',
      'high',
      'high8',
      'high10',
      'high12',
      'high422',
      'high422h',
      'high422_10',
      'high422_12',
      'high444',
      'high444h',
      'high444_10',
      'high444_12',
    ],
    tunes: [],
    pixFmts: ['yuv420p', 'yuv422p', 'yuv444p'],
  },
  libtheora: {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ['yuv420p', 'yuv422p', 'yuv444p'],
  },
}

export function getCodecMeta(codec: string): CodecMeta {
  return CODEC_DATABASE[codec] || { presets: [], profiles: [], tunes: [], pixFmts: [] }
}

// ---------------------------------------------------------------------------
// R2.2：格式↔编码器兼容性元数据。原属被删除的旧命令构建器，现与 CODEC_DATABASE
// 一起作为编码器/容器元数据的唯一事实源。这里的函数一律是纯查询：只返回结论，
// 绝不修改用户选择，是否调整由 UI 显式确认后决定。
// ---------------------------------------------------------------------------

/**
 * 格式与编码器兼容性配置
 * 定义每种容器格式支持的视频和音频编码器
 */
export interface FormatCompatibility {
  videoCodecs: string[] // 支持的视频编码器列表
  audioCodecs: string[] // 支持的音频编码器列表
  defaultVideo: string // 默认推荐的视频编码器
  defaultAudio: string // 默认推荐的音频编码器
  description: string // 格式说明
}

/**
 * 完整的格式兼容性映射表
 */
export const FORMAT_COMPATIBILITY: Record<string, FormatCompatibility> = {
  // MP4 - 最通用的格式，支持 H.264/H.265/AV1
  mp4: {
    videoCodecs: [
      'libx264',
      'libx265',
      'libaom-av1',
      'libsvtav1',
      'mpeg4',
      'copy',
      'h264_nvenc',
      'hevc_nvenc',
      'av1_nvenc',
      'h264_qsv',
      'hevc_qsv',
      'av1_qsv',
      'h264_vaapi',
      'hevc_vaapi',
      'av1_vaapi',
      'h264_videotoolbox',
      'hevc_videotoolbox',
      'h264_amf',
      'hevc_amf',
      'av1_amf',
      'h264_vulkan',
      'hevc_vulkan',
    ],
    audioCodecs: ['aac', 'mp3', 'ac3', 'eac3', 'libfdk_aac', 'libopus', 'copy'],
    defaultVideo: 'libx264',
    defaultAudio: 'aac',
    description: 'MP4 - 最通用的格式，兼容性最好，支持 H.264/H.265/AV1',
  },

  // MKV - 万能容器，几乎支持所有编码器
  mkv: {
    videoCodecs: [
      'libx264',
      'libx265',
      'libvpx-vp9',
      'libaom-av1',
      'libsvtav1',
      'mpeg4',
      'prores_ks',
      'copy',
      'h264_nvenc',
      'hevc_nvenc',
      'av1_nvenc',
      'h264_qsv',
      'hevc_qsv',
      'av1_qsv',
      'h264_vaapi',
      'hevc_vaapi',
      'av1_vaapi',
      'h264_videotoolbox',
      'hevc_videotoolbox',
      'h264_amf',
      'hevc_amf',
      'av1_amf',
      'h264_vulkan',
      'hevc_vulkan',
    ],
    audioCodecs: [
      'aac',
      'mp3',
      'ac3',
      'eac3',
      'libopus',
      'libvorbis',
      'flac',
      'pcm_s16le',
      'dca',
      'truehd',
      'copy',
    ],
    defaultVideo: 'libx264',
    defaultAudio: 'aac',
    description: 'MKV - 万能容器，支持几乎所有编码器',
  },

  // WebM - 开源格式，只支持 VP8/VP9/AV1 + Vorbis/Opus
  webm: {
    videoCodecs: ['libvpx', 'libvpx-vp9', 'libaom-av1', 'libsvtav1', 'copy'],
    audioCodecs: ['libvorbis', 'libopus', 'opus', 'copy'],
    defaultVideo: 'libvpx-vp9',
    defaultAudio: 'libopus',
    description: 'WebM - Web 专用开源格式，只支持 VP8/VP9/AV1 视频和 Vorbis/Opus 音频',
  },

  // MOV - QuickTime 格式，主要用于 Apple 生态
  mov: {
    videoCodecs: [
      'libx264',
      'libx265',
      'libaom-av1',
      'prores_ks',
      'mpeg4',
      'copy',
      'h264_nvenc',
      'hevc_nvenc',
      'h264_qsv',
      'hevc_qsv',
      'h264_vaapi',
      'hevc_vaapi',
      'h264_videotoolbox',
      'hevc_videotoolbox',
      'h264_amf',
      'hevc_amf',
    ],
    audioCodecs: ['aac', 'mp3', 'ac3', 'pcm_s16le', 'alac', 'libopus', 'copy'],
    defaultVideo: 'libx264',
    defaultAudio: 'aac',
    description: 'MOV - QuickTime 格式，主要用于 Apple 设备',
  },

  // AVI - 传统格式，兼容性广但不推荐新项目使用
  avi: {
    videoCodecs: [
      'libx264',
      'mpeg4',
      'msmpeg4v3',
      'copy',
      'h264_nvenc',
      'h264_qsv',
      'h264_vaapi',
      'h264_videotoolbox',
      'h264_amf',
    ],
    audioCodecs: ['mp3', 'ac3', 'pcm_s16le', 'copy'],
    defaultVideo: 'mpeg4',
    defaultAudio: 'mp3',
    description: 'AVI - 传统格式，兼容性好但不推荐新项目使用',
  },

  // TS - MPEG 传输流，用于流媒体和广播
  ts: {
    videoCodecs: [
      'libx264',
      'libx265',
      'mpeg2video',
      'copy',
      'h264_nvenc',
      'hevc_nvenc',
      'h264_qsv',
      'hevc_qsv',
      'h264_vaapi',
      'hevc_vaapi',
      'h264_videotoolbox',
      'hevc_videotoolbox',
      'h264_amf',
      'hevc_amf',
    ],
    audioCodecs: ['aac', 'mp3', 'ac3', 'mp2', 'copy'],
    defaultVideo: 'libx264',
    defaultAudio: 'aac',
    description: 'MPEG-TS - 传输流格式，用于流媒体和广播',
  },

  // FLV - Flash Video
  flv: {
    videoCodecs: ['libx264', 'flv', 'copy'],
    audioCodecs: ['aac', 'mp3', 'copy'],
    defaultVideo: 'libx264',
    defaultAudio: 'aac',
    description: 'FLV - Flash Video 格式',
  },

  // OGG - 开源容器
  ogg: {
    videoCodecs: ['libtheora', 'copy'],
    audioCodecs: ['libvorbis', 'libopus', 'flac', 'libtheora', 'copy'],
    defaultVideo: 'libtheora',
    defaultAudio: 'libvorbis',
    description: 'OGG - 开源容器格式',
  },

  // M4A - 纯音频 MP4
  m4a: {
    videoCodecs: [],
    audioCodecs: ['aac', 'alac', 'libfdk_aac', 'copy'],
    defaultVideo: '',
    defaultAudio: 'aac',
    description: 'M4A - MPEG-4 音频',
  },

  // MXF - 专业广播格式
  mxf: {
    videoCodecs: ['libx264', 'mpeg2video', 'prores_ks', 'copy'],
    audioCodecs: ['pcm_s16le', 'pcm_s24le', 'copy'],
    defaultVideo: 'libx264',
    defaultAudio: 'pcm_s16le',
    description: 'MXF - 专业广播格式',
  },

  // 3GP - 移动设备格式
  '3gp': {
    videoCodecs: ['libx264', 'mpeg4', 'copy'],
    audioCodecs: ['aac', 'amr_nb', 'copy'],
    defaultVideo: 'libx264',
    defaultAudio: 'aac',
    description: '3GP - 移动设备格式',
  },
  // FLAC - 无损音频格式
  flac: {
    videoCodecs: [],
    audioCodecs: ['flac', 'copy'],
    defaultVideo: '',
    defaultAudio: 'flac',
    description: 'FLAC - 无损音频格式',
  },
  // OPUS - 开源无损音频格式
  opus: {
    videoCodecs: [],
    audioCodecs: ['opus', 'copy'],
    defaultVideo: '',
    defaultAudio: 'opus',
    description: 'OPUS - 开源无损音频格式',
  },
  // WAV - 无损音频格式
  wav: {
    videoCodecs: [],
    audioCodecs: ['pcm_s16le', 'copy'],
    defaultVideo: '',
    defaultAudio: 'pcm_s16le',
    description: 'WAV - 无损音频格式',
  },
  // MPEG - 有损音频格式
  mpeg: {
    videoCodecs: [],
    audioCodecs: ['mp3', 'copy'],
    defaultVideo: '',
    defaultAudio: 'mp3',
    description: 'MPEG - 有损音频格式',
  },
  // MP3 - 有损音频格式
  mp3: {
    videoCodecs: [],
    audioCodecs: ['mp3', 'copy'],
    defaultVideo: '',
    defaultAudio: 'mp3',
    description: 'MP3 - 有损音频格式',
  },
  // AAC - 音频编码格式
  aac: {
    videoCodecs: [],
    audioCodecs: ['aac', 'copy'],
    defaultVideo: '',
    defaultAudio: 'aac',
    description: 'AAC - 音频编码格式',
  },
  // PCM - 无损音频格式
  pcm: {
    videoCodecs: [],
    audioCodecs: ['pcm_s16le', 'copy'],
    defaultVideo: '',
    defaultAudio: 'pcm_s16le',
    description: 'PCM - 无损音频格式',
  },
  // VORBIS - 开源无损音频格式
  vorbis: {
    videoCodecs: [],
    audioCodecs: ['vorbis', 'copy'],
    defaultVideo: '',
    defaultAudio: 'vorbis',
    description: 'VORBIS - 开源无损音频格式',
  },
}

/** 把 ".WEBM" / "WEBM" / "webm" 统一成元数据表的键。 */
function normalizeFormatKey(format: string): string {
  return format.trim().replace(/^\./, '').toLowerCase()
}

/** 查询格式兼容性；未知格式返回 null（表示不做限制）。 */
export function getFormatCompatibility(format: string): FormatCompatibility | null {
  return FORMAT_COMPATIBILITY[normalizeFormatKey(format)] ?? null
}

/** 检查编码器是否与格式兼容；未知格式允许所有编码器。 */
export function isCodecCompatible(format: string, codec: string, type: 'video' | 'audio'): boolean {
  const compatibility = getFormatCompatibility(format)

  if (!compatibility) {
    return true
  }

  const codecList = type === 'video' ? compatibility.videoCodecs : compatibility.audioCodecs
  return codecList.includes(codec)
}

/** 获取格式的推荐编码器；未知格式返回通用编码器。 */
export function getRecommendedCodec(format: string, type: 'video' | 'audio'): string {
  const compatibility = getFormatCompatibility(format)

  if (!compatibility) {
    return type === 'video' ? 'libx264' : 'aac'
  }

  return type === 'video' ? compatibility.defaultVideo : compatibility.defaultAudio
}

/** 获取格式支持的所有编码器；空数组表示支持所有（未知格式）。 */
export function getCompatibleCodecs(format: string, type: 'video' | 'audio'): string[] {
  const compatibility = getFormatCompatibility(format)

  if (!compatibility) {
    return []
  }

  return type === 'video' ? compatibility.videoCodecs : compatibility.audioCodecs
}

/** 过滤出与指定格式兼容的编码器列表（copy 模式始终保留）。 */
export function filterCompatibleCodecs<T extends { ffmpegEncoder: string }>(
  format: string,
  codecs: T[],
  type: 'video' | 'audio',
): T[] {
  const compatibleCodecs = getCompatibleCodecs(format, type)

  if (compatibleCodecs.length === 0) {
    return codecs
  }

  return codecs.filter((codec) => {
    if (codec.ffmpegEncoder === 'copy') {
      return true
    }
    return compatibleCodecs.includes(codec.ffmpegEncoder)
  })
}
