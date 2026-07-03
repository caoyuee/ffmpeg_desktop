/**
 * 媒体文件信息提取 Hook
 * 封装 ffprobe 调用逻辑
 */
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

export interface MediaInfo {
  duration?: number;
  width?: number;
  height?: number;
  bitRate?: string;
  codecName?: string;
  formatName?: string;
}

export function useMediaProbe() {
  const isProbing = ref(false);

  /**
   * 从 ffprobe 原始输出中提取关键信息
   */
  function extractMediaInfo(rawData: any): MediaInfo {
    const info: MediaInfo = {};

    // 从 format 获取基本信息
    if (rawData.format) {
      if (rawData.format.duration) {
        info.duration = parseFloat(rawData.format.duration);
      }
      if (rawData.format.bit_rate) {
        info.bitRate = rawData.format.bit_rate;
      }
      if (rawData.format.format_name) {
        info.formatName = rawData.format.format_name;
      }
    }

    // 从 streams 获取视频信息
    if (rawData.streams && Array.isArray(rawData.streams)) {
      const videoStream = rawData.streams.find(
        (s: any) => s.codec_type === "video"
      );
      if (videoStream) {
        info.width = videoStream.width;
        info.height = videoStream.height;
        info.codecName = videoStream.codec_name;
      }
    }

    return info;
  }

  /**
   * 提取媒体文件信息
   */
  async function probe(filePath: string): Promise<MediaInfo | null> {
    if (isProbing.value) {
      console.warn("正在提取媒体信息，请稍候");
      return null;
    }

    isProbing.value = true;

    try {
      const result = await invoke<any>("probe_media_info", {
        path: filePath,
      });

      // 提取关键信息
      return extractMediaInfo(result);
    } catch (error) {
      console.error("提取媒体信息失败:", error);
      return null;
    } finally {
      isProbing.value = false;
    }
  }

  /**
   * 批量提取媒体信息
   */
  async function probeBatch(
    filePaths: string[]
  ): Promise<Map<string, MediaInfo | null>> {
    const results = new Map<string, MediaInfo | null>();

    for (const filePath of filePaths) {
      const info = await probe(filePath);
      results.set(filePath, info);
    }

    return results;
  }

  return {
    isProbing,
    probe,
    probeBatch,
  };
}
