import { defineStore } from "pinia";

// FFmpeg 工具信息接口
interface FFmpegToolInfo {
  installed: boolean;
  path: string;
  version: string;
}

// FFmpeg 工具集接口
interface FFmpegToolsInfo {
  ffmpeg: FFmpegToolInfo;
  ffprobe: FFmpegToolInfo;
  ffplay: FFmpegToolInfo;
}

export const useSoftwareInfoStore = defineStore("software_info", {
  state: () => ({
    // FFmpeg 工具集信息
    ffmpegTools: {
      ffmpeg: {
        installed: false,
        path: "",
        version: "",
      },
      ffprobe: {
        installed: false,
        path: "",
        version: "",
      },
      ffplay: {
        installed: false,
        path: "",
        version: "",
      },
    } as FFmpegToolsInfo,
  }),
  getters: {
    // FFmpeg 状态
    ffmpegInstalled: (state) => state.ffmpegTools.ffmpeg.installed,
    ffmpegPath: (state) => state.ffmpegTools.ffmpeg.path,
    ffmpegVersion: (state) => state.ffmpegTools.ffmpeg.version,

    // FFprobe 状态
    ffprobeInstalled: (state) => state.ffmpegTools.ffprobe.installed,
    ffprobePath: (state) => state.ffmpegTools.ffprobe.path,
    ffprobeVersion: (state) => state.ffmpegTools.ffprobe.version,

    // FFplay 状态
    ffplayInstalled: (state) => state.ffmpegTools.ffplay.installed,
    ffplayPath: (state) => state.ffmpegTools.ffplay.path,
    ffplayVersion: (state) => state.ffmpegTools.ffplay.version,

    // 所有工具是否安装
    allToolsInstalled: (state) =>
      state.ffmpegTools.ffmpeg.installed && state.ffmpegTools.ffprobe.installed,

    // 核心工具是否安装（ffmpeg + ffprobe）
    coreToolsInstalled: (state) =>
      state.ffmpegTools.ffmpeg.installed && state.ffmpegTools.ffprobe.installed,
  },
  actions: {
    // 更新所有 FFmpeg 工具信息
    updateFFmpegTools(tools: FFmpegToolsInfo) {
      this.ffmpegTools = tools;
    },

    // 更新单个工具信息
    updateFFmpegInfo(info: FFmpegToolInfo) {
      this.ffmpegTools.ffmpeg = info;
    },

    updateFFprobeInfo(info: FFmpegToolInfo) {
      this.ffmpegTools.ffprobe = info;
    },

    updateFFplayInfo(info: FFmpegToolInfo) {
      this.ffmpegTools.ffplay = info;
    },
  },
});
