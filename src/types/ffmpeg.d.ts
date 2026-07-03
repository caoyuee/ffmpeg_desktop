// FFmpeg 工具信息类型定义

export interface FFmpegToolInfo {
  installed: boolean;
  path: string;
  version: string;
}

export interface FFmpegToolsInfo {
  ffmpeg: FFmpegToolInfo;
  ffprobe: FFmpegToolInfo;
  ffplay: FFmpegToolInfo;
}

export interface FFmpegToolsResponse {
  ffmpeg: FFmpegToolInfo;
  ffprobe: FFmpegToolInfo;
  ffplay: FFmpegToolInfo;
}
