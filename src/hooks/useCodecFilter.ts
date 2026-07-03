/**
 * 编码器过滤 Hook
 * 根据选择的输出格式自动过滤兼容的编码器
 */

import { computed, Ref } from "vue";
import {
  filterCompatibleCodecs,
  getRecommendedCodec,
  FORMAT_COMPATIBILITY,
  type FormatCompatibility,
} from "@/utils/ffmpegCommandBuilder";

interface CodecOption {
  key: string;
  value: string;
  label: string;
  ffmpegEncoder: string;
}

export function useCodecFilter(
  selectedFormat: Ref<string>,
  allCodecs: Ref<CodecOption[]>
) {
  /**
   * 过滤后的视频编码器列表
   */
  const filteredVideoCodecs = computed(() => {
    return filterCompatibleCodecs(
      selectedFormat.value,
      allCodecs.value,
      "video"
    );
  });

  /**
   * 获取当前格式的推荐视频编码器
   */
  const recommendedVideoCodec = computed(() => {
    return getRecommendedCodec(selectedFormat.value, "video");
  });

  /**
   * 获取当前格式的推荐音频编码器
   */
  const recommendedAudioCodec = computed(() => {
    return getRecommendedCodec(selectedFormat.value, "audio");
  });

  /**
   * 获取当前格式的兼容性信息
   */
  const formatInfo = computed((): FormatCompatibility | null => {
    const format = selectedFormat.value.toLowerCase().replace(".", "");
    return FORMAT_COMPATIBILITY[format] || null;
  });

  /**
   * 获取格式描述
   */
  const formatDescription = computed(() => {
    return formatInfo.value?.description || "未知格式";
  });

  /**
   * 检查当前选择的编码器是否与格式兼容
   */
  const isCurrentCodecCompatible = (
    codec: string,
    type: "video" | "audio" = "video"
  ) => {
    const info = formatInfo.value;
    if (!info) return true; // 未知格式，允许所有编码器

    const compatibleList =
      type === "video" ? info.videoCodecs : info.audioCodecs;
    return compatibleList.includes(codec) || codec === "copy";
  };

  /**
   * 自动选择兼容的编码器
   * 如果当前编码器不兼容，则自动切换到推荐编码器
   */
  const ensureCompatibleCodec = (
    currentCodec: Ref<string>,
    type: "video" | "audio" = "video"
  ) => {
    if (!isCurrentCodecCompatible(currentCodec.value, type)) {
      const recommended =
        type === "video"
          ? recommendedVideoCodec.value
          : recommendedAudioCodec.value;

      console.warn(
        `当前编码器 ${currentCodec.value} 与 ${selectedFormat.value} 格式不兼容，已自动切换到 ${recommended}`
      );

      currentCodec.value = recommended;
    }
  };

  return {
    filteredVideoCodecs,
    recommendedVideoCodec,
    recommendedAudioCodec,
    formatInfo,
    formatDescription,
    isCurrentCodecCompatible,
    ensureCompatibleCodec,
  };
}
