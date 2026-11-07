/**
 * R3.7：全项目唯一 CSV 转义 / 拼装层。
 *
 * 任务历史导出（taskHistory.ts）与 ffprobe 报告导出（mediaReport.ts）共用此处，
 * 避免两处各写一份引号转义与公式注入处理。纯函数，零依赖。
 */

/** Excel / WPS 会把以这些字符开头的单元格当公式执行，统一前置单引号中性化。 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function escapeCsvCell(value: unknown): string {
  let text: string
  if (value === null || value === undefined) {
    text = ''
  } else if (typeof value === 'object') {
    text = ''
  } else {
    text = String(value)
  }
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/** 用 CRLF 连接；脏 rows 只输出表头，保证导出永不抛错。 */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const head = Array.isArray(header) ? header : []
  const safeRows = Array.isArray(rows) ? rows : []
  const lines = [head.map(escapeCsvCell).join(',')]
  for (const row of safeRows) {
    if (!Array.isArray(row)) continue
    lines.push(head.map((_, index) => escapeCsvCell(row[index])).join(','))
  }
  return lines.join('\r\n')
}
