/**
 * 格式化工具 Hook
 * 封装各种格式化函数
 */

import type { PresetData } from "@/types/preset";

/**
 * 格式化时长（秒 -> HH:MM:SS）
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 0) return "--:--:--";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes < 0) return "未知";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化码率
 */
export function formatBitrate(bitrate?: string | number): string {
  if (!bitrate) return "未知";

  const rate = typeof bitrate === "string" ? parseInt(bitrate) : bitrate;
  if (isNaN(rate)) return "未知";

  // 转换为 Mbps
  const mbps = rate / 1000000;
  return `${mbps.toFixed(2)} Mbps`;
}

/**
 * 格式化分辨率
 */
export function formatResolution(width?: number, height?: number): string {
  if (!width || !height) return "未知";
  return `${width}x${height}`;
}

/**
 * 获取状态文本
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "待处理",
    processing: "处理中...",
    success: "✓ 成功",
    error: "✗ 失败",
  };
  return statusMap[status] || status;
}

/**
 * 提取文件名（不含路径）
 */
export function extractFileName(path: string): string {
  const parts = path.split(/[\\\/]/);
  return parts[parts.length - 1] || "";
}

/**
 * 提取文件扩展名
 */
export function extractFileExtension(path: string): string {
  const fileName = extractFileName(path);
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.substring(lastDot + 1) : "";
}

/**
 * 生成输出文件路径
 */
export function generateOutputPath(
  inputPath: string,
  output?: string | PresetData["output"],
): string {
  const ext = normalizeExtension(
    typeof output === "string"
      ? output
      : output?.container || extractFileExtension(inputPath),
  );
  const lastDot = inputPath.lastIndexOf(".");
  const lastSlash = Math.max(
    inputPath.lastIndexOf("/"),
    inputPath.lastIndexOf("\\"),
  );
  const separator = inputPath.lastIndexOf("\\") > inputPath.lastIndexOf("/") ? "\\" : "/";

  const baseName = inputPath.substring(
    lastSlash + 1,
    lastDot > lastSlash ? lastDot : inputPath.length,
  );
  const sourceDir = inputPath.substring(0, lastSlash + 1);

  if (typeof output === "object" && output !== null) {
    const dirName = normalizeOutputDirectory(output.location, sourceDir, separator);
    const fileName = buildOutputFileName(baseName, output.naming);
    return `${dirName}${fileName}.${ext}`;
  }

  return `${sourceDir}${baseName}_output.${ext}`;
}

function normalizeExtension(format: string): string {
  const ext = format.trim().replace(/^\./, "");
  return ext || "mp4";
}

function normalizeOutputDirectory(
  configuredDir: string,
  sourceDir: string,
  separator: string,
): string {
  const dir = configuredDir.trim();
  if (!dir) return sourceDir;
  if (dir.endsWith("/") || dir.endsWith("\\")) return dir;
  return `${dir}${separator}`;
}

function buildOutputFileName(
  baseName: string,
  naming: PresetData["output"]["naming"],
): string {
  if (!naming.useAutoNaming) {
    return `${baseName}_output`;
  }

  switch (naming.autoNamingOption) {
    case 1:
      return `${naming.prefixText || ""}${baseName}`;
    case 2:
      return naming.replaceText || `${baseName}_output`;
    case 3:
      return `${naming.prefixText || ""}${naming.replaceText || baseName}${naming.suffixText || ""}`;
    case 0:
    default:
      return `${baseName}${naming.suffixText || "_output"}`;
  }
}
