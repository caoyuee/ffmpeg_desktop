/**
 * R1-11：跨平台路径处理统一入口。
 * Windows 使用 `\`，Unix 使用 `/`；所有取文件名/目录名的逻辑都必须走这里，
 * 禁止再出现 `path.split('/').pop()`（见《接力开发手册》§4.6）。
 */
export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, '/')
}

export function getFileName(path: string): string {
  const segments = normalizePathSeparators(path).split('/')
  const last = segments[segments.length - 1]
  // 以分隔符结尾的目录路径回退到原始值，避免返回空串。
  return last || path
}

export function getFileExtension(path: string): string {
  const name = getFileName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}
