interface CodecMeta {
  presets: string[];
  profiles: string[];
  tunes: string[];
  pixFmts: string[];
}

export const CODEC_DATABASE: Record<string, CodecMeta> = {
  "copy": {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: [],
  },

  // H.264
  "libx264": {
    presets: ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast", "superfast", "ultrafast"],
    profiles: ["baseline", "main", "high", "high10", "high422", "high444"],
    tunes: ["film", "animation", "grain", "stillimage", "psnr", "ssim", "fastdecode", "zerolatency"],
    pixFmts: ["yuv420p", "yuvj420p", "yuv422p", "yuvj422p", "yuv444p", "yuvj444p", "nv12", "nv16", "nv21", "yuv420p10le", "yuv422p10le", "yuv444p10le", "nv20le", "gray", "gray10le"],
  },
  "h264_nvenc": {
    presets: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
    profiles: ["baseline", "main", "high", "high10", "high422", "high444p"],
    tunes: ["hq", "ll", "ull", "lossless"],
    pixFmts: ["yuv420p", "nv12", "p010le", "yuv444p", "p016le", "nv16", "p210le", "p216le", "yuv444p16le", "bgr0", "bgra", "rgb0", "rgba", "x2rgb10le", "x2bgr10le", "gbrp", "gbrp16le", "cuda", "d3d11"],
  },
  "h264_qsv": {
    presets: ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast"],
    profiles: ["baseline", "main", "high"],
    tunes: [],
    pixFmts: ["nv12", "qsv"],
  },
  "h264_amf": {
    presets: ["speed", "balanced", "quality"],
    profiles: ["main", "high", "constrained_baseline", "constrained_high"],
    tunes: ["transcoding", "ultralowlatency", "lowlatency", "webcam", "high_quality", "lowlatency_high_quality"],
    pixFmts: ["nv12", "yuv420p", "d3d11", "dxva2_vld", "p010le", "bgr0", "rgb0", "bgra", "argb", "rgba", "x2bgr10le", "rgbaf16le"],
  },
  "h264_vaapi": {
    presets: [],
    profiles: ["baseline", "main", "high", "constrained_baseline"],
    tunes: [],
    pixFmts: ["vaapi"],
  },
  "h264_videotoolbox": {
    presets: [],
    profiles: ["baseline", "main", "high"],
    tunes: [],
    pixFmts: ["videotoolbox_vld", "nv12", "yuv420p"],
  },
  "h264_vulkan": {
    presets: [],
    profiles: ["main", "main10", "rext", "constrained_baseline"],
    tunes: ["hq", "ll", "ull", "lossless"],
    pixFmts: ["vulkan"],
  },

  // H.265/HEVC
  "libx265": {
    presets: ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast", "superfast", "ultrafast"],
    profiles: ["main", "mainstillpicture"],
    tunes: ["psnr", "ssim", "grain", "fastdecode", "zerolatency", "animation", "stillimage"],
    pixFmts: ["yuv420p", "yuvj420p", "yuv422p", "yuvj422p", "yuv444p", "yuvj444p", "gbrp", "yuv420p10le", "yuv422p10le", "yuv444p10le", "gbrp10le", "yuv420p12le", "yuv422p12le", "yuv444p12le", "gbrp12le", "gray", "gray10le", "gray12le", "yuva420p", "yuva420p10le"],
  },
  "hevc_nvenc": {
    presets: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
    profiles: ["main", "rext"],
    tunes: ["hq", "uhq", "ll", "ull", "lossless"],
    pixFmts: ["yuv420p", "nv12", "p010le", "yuv444p", "p016le", "nv16", "p210le", "p216le", "yuv444p16le", "bgr0", "bgra", "rgb0", "rgba", "x2rgb10le", "x2bgr10le", "gbrp", "gbrp16le", "cuda", "d3d11"],
  },
  "hevc_qsv": {
    presets: ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast"],
    profiles: ["main", "mainsp", "rext", "scc"],
    tunes: [],
    pixFmts: ["nv12", "p010le", "p012le", "yuyv422", "y210le", "qsv", "bgra", "x2rgb10le", "vuyx", "xv30le"],
  },
  "hevc_amf": {
    presets: ["speed", "balanced", "quality"],
    profiles: ["main"],
    tunes: ["transcoding", "ultralowlatency", "lowlatency", "webcam", "high_quality", "lowlatency_high_quality"],
    pixFmts: ["nv12", "yuv420p", "d3d11", "dxva2_vld", "p010le", "bgr0", "rgb0", "bgra", "argb", "rgba", "x2bgr10le", "rgbaf16le"],
  },
  "hevc_vaapi": {
    presets: [],
    profiles: ["main", "main10", "rext"],
    tunes: [],
    pixFmts: ["vaapi"],
  },
  "hevc_videotoolbox": {
    presets: [],
    profiles: ["main", "main10"],
    tunes: [],
    pixFmts: ["videotoolbox_vld", "nv12", "yuv420p"],
  },
  "hevc_vulkan": {
    presets: [],
    profiles: ["main", "main10", "rext"],
    tunes: ["hq", "ll", "ull", "lossless"],
    pixFmts: ["vulkan"],
  },

  // AV1
  "libaom-av1": {
    presets: ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
    profiles: ["0", "1", "2"],
    tunes: ["psnr", "ssim", "qmt"],
    pixFmts: ["yuv420p", "yuv422p", "yuv444p", "gbrp", "yuv420p10le", "yuv422p10le", "yuv444p10le", "yuv420p12le", "yuv422p12le", "yuv444p12le", "gbrp10le", "gbrp12le", "gray", "gray10le", "gray12le"],
  },
  "libsvtav1": {
    presets: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
    profiles: ["main", "high", "professional"],
    tunes: [],
    pixFmts: ["yuv420p", "yuv420p10le"],
  },
  "librav1e": {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ["yuv420p", "yuvj420p", "yuv420p10le", "yuv420p12le", "yuv422p", "yuvj422p", "yuv422p10le", "yuv422p12le", "yuv444p", "yuvj444p", "yuv444p10le", "yuv444p12le"],
  },
  "av1_nvenc": {
    presets: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
    profiles: ["main", "high", "professional"],
    tunes: ["hq", "uhq", "ll", "ull", "lossless"],
    pixFmts: ["yuv420p", "nv12", "p010le", "yuv444p", "p016le", "nv16", "p210le", "p216le", "yuv444p10msble", "yuv444p16le", "bgr0", "bgra", "rgb0", "rgba", "x2rgb10le", "x2bgr10le", "gbrp", "gbrp10msble", "gbrp16le", "cuda", "d3d11"],
  },
  "av1_qsv": {
    presets: ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast"],
    profiles: ["main", "main10"],
    tunes: [],
    pixFmts: ["nv12", "p010le", "qsv"],
  },
  "av1_amf": {
    presets: ["speed", "balanced", "quality", "high_quality"],
    profiles: ["main"],
    tunes: [],
    pixFmts: ["nv12", "yuv420p", "d3d11", "dxva2_vld", "p010le", "bgr0", "rgb0", "bgra", "argb", "rgba", "x2bgr10le", "rgbaf16le"],
  },
  "av1_vaapi": {
    presets: [],
    profiles: ["main", "high", "professional"],
    tunes: [],
    pixFmts: ["vaapi"],
  },

  // VP9
  "libvpx-vp9": {
    presets: ["0", "1", "2", "3", "4", "5"],
    profiles: [],
    tunes: ["psnr", "ssim"],
    pixFmts: ["yuv420p", "yuva420p", "yuv422p", "yuv440p", "yuv444p", "yuv420p10le", "yuv422p10le", "yuv440p10le", "yuv444p10le", "yuv420p12le", "yuv422p12le", "yuv440p12le", "yuv444p12le", "gbrp", "gbrp10le", "gbrp12le"],
  },
  "vp9_qsv": {
    presets: ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast"],
    profiles: ["profile0", "profile1", "profile2", "profile3"],
    tunes: [],
    pixFmts: ["nv12", "p010le", "vuyx", "qsv", "xv30le"],
  },

  // VP8
  "libvpx": {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ["yuv420p", "yuva420p"],
  },

  // ProRes
  "prores_ks": {
    presets: [],
    profiles: ["auto", "proxy", "lt", "standard", "hq", "4444", "4444xq"],
    tunes: [],
    pixFmts: ["yuv422p10le", "yuv444p10le", "yuva444p10le"],
  },
  "prores_aw": {
    presets: [],
    profiles: ["auto", "proxy", "lt", "standard", "hq", "4444", "4444xq"],
    tunes: [],
    pixFmts: ["yuv422p10le", "yuv444p10le", "yuva444p10le"],
  },

  // Misc
  "mpeg4": {
    presets: [],
    profiles: ["simple", "simplep", "core", "main", "advanced", "advancedp"],
    tunes: [],
    pixFmts: ["yuv420p"],
  },
  "mpeg2video": {
    presets: [],
    profiles: ["main", "main8", "main10", "main12", "422", "422h", "422_10", "422_12", "high", "high8", "high10", "high12", "high422", "high422h", "high422_10", "high422_12", "high444", "high444h", "high444_10", "high444_12"],
    tunes: [],
    pixFmts: ["yuv420p", "yuv422p", "yuv444p"],
  },
  "libtheora": {
    presets: [],
    profiles: [],
    tunes: [],
    pixFmts: ["yuv420p", "yuv422p", "yuv444p"],
  },
};

export function getCodecMeta(codec: string): CodecMeta {
  return CODEC_DATABASE[codec] || { presets: [], profiles: [], tunes: [], pixFmts: [] };
}
