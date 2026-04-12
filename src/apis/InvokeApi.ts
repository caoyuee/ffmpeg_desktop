import { invoke } from "@tauri-apps/api/core";

export class InitFFmpegConfigApi {
  /**
   * 检查所有 FFmpeg 工具（ffmpeg, ffprobe, ffplay）
   * 返回统一的工具集信息
   *
   * @public
   * @static
   * @async
   * @returns {Promise<{
   *   ffmpeg: { installed: boolean, path: string, version: string },
   *   ffprobe: { installed: boolean, path: string, version: string },
   *   ffplay: { installed: boolean, path: string, version: string }
   * }>}
   */
  public static async check_ffmpeg_tools() {
    return await invoke("check_ffmpeg_tools");
  }

  /**
   * 安装 FFmpeg
   *
   * @public
   * @static
   * @async
   * @returns {unknown}
   */
  public static async install_ffmpeg_command() {
    return await invoke("install_ffmpeg_command");
  }
}
