import { defineStore } from "pinia";
import { ref } from "vue";

export interface FFmpegGlobalSettings {
  hardware: {
    enabled: boolean;
    type: string; // auto, none, nvenc, qsv, vaapi, videotoolbox, amf
  };
  performance: {
    threads: number;
    maxConcurrent: number;
  };
  output: {
    overwrite: boolean;
    loglevel: string;
  };
  quality: {
    defaultPreset: string;
    defaultCRF: number;
  };
  advanced: {
    customParams: string;
  };
}

export const useFFmpegSettingsStore = defineStore("ffmpeg_settings", () => {
  // 默认设置
  const settings = ref<FFmpegGlobalSettings>({
    hardware: {
      enabled: false,
      type: "auto",
    },
    performance: {
      threads: 0, // 0 = auto
      maxConcurrent: 2,
    },
    output: {
      overwrite: true,
      loglevel: "info",
    },
    quality: {
      defaultPreset: "medium",
      defaultCRF: 23,
    },
    advanced: {
      customParams: "",
    },
  });

  // 从 localStorage 加载设置
  function loadSettings() {
    const saved = localStorage.getItem("ffmpeg_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        settings.value = { ...settings.value, ...parsed };
      } catch (error) {
        console.error("加载FFmpeg设置失败:", error);
      }
    }
  }

  // 保存设置到 localStorage
  function saveSettings() {
    localStorage.setItem("ffmpeg_settings", JSON.stringify(settings.value));
  }

  // 更新硬件加速设置
  function updateHardware(enabled: boolean, type: string) {
    settings.value.hardware.enabled = enabled;
    settings.value.hardware.type = type;
    saveSettings();
  }

  // 更新性能设置
  function updatePerformance(threads: number, maxConcurrent: number) {
    settings.value.performance.threads = threads;
    settings.value.performance.maxConcurrent = maxConcurrent;
    saveSettings();
  }

  // 更新输出设置
  function updateOutput(overwrite: boolean, loglevel: string) {
    settings.value.output.overwrite = overwrite;
    settings.value.output.loglevel = loglevel;
    saveSettings();
  }

  // 更新质量设置
  function updateQuality(preset: string, crf: number) {
    settings.value.quality.defaultPreset = preset;
    settings.value.quality.defaultCRF = crf;
    saveSettings();
  }

  // 更新高级设置
  function updateAdvanced(customParams: string) {
    settings.value.advanced.customParams = customParams;
    saveSettings();
  }

  // 重置为默认设置
  function resetSettings() {
    settings.value = {
      hardware: {
        enabled: false,
        type: "auto",
      },
      performance: {
        threads: 0,
        maxConcurrent: 2,
      },
      output: {
        overwrite: true,
        loglevel: "info",
      },
      quality: {
        defaultPreset: "medium",
        defaultCRF: 23,
      },
      advanced: {
        customParams: "",
      },
    };
    saveSettings();
  }

  // 获取用于FFmpeg命令的全局参数
  function getGlobalFFmpegParams(): string[] {
    const params: string[] = [];

    // 硬件加速
    if (
      settings.value.hardware.enabled &&
      settings.value.hardware.type !== "none"
    ) {
      if (settings.value.hardware.type === "auto") {
        // 自动检测，暂时不添加参数，由命令构建器决定
      } else {
        params.push("-hwaccel", settings.value.hardware.type);
      }
    }

    // 线程数
    if (settings.value.performance.threads > 0) {
      params.push("-threads", settings.value.performance.threads.toString());
    }

    // 覆盖输出文件
    if (settings.value.output.overwrite) {
      params.push("-y");
    } else {
      params.push("-n");
    }

    // 日志级别
    params.push("-loglevel", settings.value.output.loglevel);

    // 自定义参数
    if (settings.value.advanced.customParams.trim()) {
      params.push(...settings.value.advanced.customParams.trim().split(" "));
    }

    return params;
  }

  // 根据硬件加速类型获取对应的编码器
  function getHardwareEncoder(baseCodec: string): string {
    if (!settings.value.hardware.enabled) {
      return baseCodec;
    }

    const hwType = settings.value.hardware.type;

    // 硬件编码器映射
    const hardwareEncoders: Record<string, Record<string, string>> = {
      nvenc: {
        libx264: "h264_nvenc",
        libx265: "hevc_nvenc",
      },
      qsv: {
        libx264: "h264_qsv",
        libx265: "hevc_qsv",
      },
      vaapi: {
        libx264: "h264_vaapi",
        libx265: "hevc_vaapi",
      },
      videotoolbox: {
        libx264: "h264_videotoolbox",
        libx265: "hevc_videotoolbox",
      },
      amf: {
        libx264: "h264_amf",
        libx265: "hevc_amf",
      },
    };

    if (hwType in hardwareEncoders && baseCodec in hardwareEncoders[hwType]) {
      return hardwareEncoders[hwType][baseCodec];
    }

    return baseCodec;
  }

  return {
    settings,
    loadSettings,
    saveSettings,
    updateHardware,
    updatePerformance,
    updateOutput,
    updateQuality,
    updateAdvanced,
    resetSettings,
    getGlobalFFmpegParams,
    getHardwareEncoder,
  };
});
