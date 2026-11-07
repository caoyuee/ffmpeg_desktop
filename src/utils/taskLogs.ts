/**
 * R1-6：输出面板的日志筛选。
 * 后端 `ffmpeg-log` 现在转发全量 stderr 行并在 level 上标注 error，
 * 前端按 outputType 决定读全量还是只读错误行，不再始终读 logs.all。
 */
export type OutputLogType = 'all' | 'error'

export function selectTaskLogs(
  logs: { all: string[]; errors: string[] } | undefined,
  outputType: string,
): string[] {
  if (!logs) return []
  return outputType === 'error' ? logs.errors : logs.all
}
