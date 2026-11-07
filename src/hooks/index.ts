/**
 * Hooks 统一导出
 */

// R2.1：零调用方的 legacy 命令 hook 已删除，一次性任务统一走下面的执行器。
export { useTransientFFmpegTask } from './useTransientFFmpegTask'
export type { TransientFFmpegTask, TransientTaskHandlers } from './useTransientFFmpegTask'

export { useMediaProbe } from './useMediaProbe'

// R2.3：文件列表模型迁入 src/types/fileList.ts，局部状态的 useFileList hook 已删除，
// 唯一状态源是 store/fileListStore.ts。
export type { MediaInfo, FileItem, FileStatus } from '@/types/fileList'

// R2.2：零调用方的编码器过滤 hook 已删除；格式兼容性查询统一收敛到 config/codecDatabase。

export {
  formatDuration,
  formatFileSize,
  formatBitrate,
  formatResolution,
  getStatusText,
  extractFileName,
  extractFileExtension,
  generateOutputPath,
} from './useFormatters'
