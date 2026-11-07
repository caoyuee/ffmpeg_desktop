import type { TaskProgress } from '@/types/task'

/**
 * R3.8：任务卡「实时编码监视墙」的唯一数字格式化层。
 *
 * 数字一律返回字符串（页面用等宽字体 + tabular-nums 渲染），缺失值用占位符，
 * 不做逐帧动效；组件按 MONITOR_THROTTLE_MS 采样，避免高频进度事件打爆渲染。
 */
export const MONITOR_THROTTLE_MS = 500

export type MonitorKey = 'fps' | 'speed' | 'size' | 'eta' | 'bitrate'

export interface MonitorCell {
  key: MonitorKey
  value: string
}

const PLACEHOLDER = '--'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : PLACEHOLDER
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return PLACEHOLDER
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export function buildMonitorCells(progress: TaskProgress | null): MonitorCell[] {
  const source = isRecord(progress) ? progress : {}
  const fps = finite(source['fps'])
  return [
    { key: 'fps', value: fps === null ? PLACEHOLDER : `${Number(fps.toFixed(1))} fps` },
    { key: 'speed', value: text(source['speed']) },
    { key: 'size', value: text(source['size']) },
    { key: 'eta', value: formatEta(finite(source['remainingTime'])) },
    { key: 'bitrate', value: text(source['bitrate']) },
  ]
}
