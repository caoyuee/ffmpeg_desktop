import { describe, it, expect } from 'vitest'
import { getFileName, getFileExtension, normalizePathSeparators } from '@/utils/pathUtils'

describe('R1-11 跨平台路径处理', () => {
  it('Unix 路径取文件名', () => {
    expect(getFileName('/home/user/videos/clip.mp4')).toBe('clip.mp4')
  })

  it('Windows 反斜杠路径取文件名', () => {
    expect(getFileName('C:\\Videos\\Movies\\clip.mp4')).toBe('clip.mp4')
  })

  it('UNC / 混合分隔符也能取到文件名', () => {
    expect(getFileName('\\\\server\\share/clip.mkv')).toBe('clip.mkv')
  })

  it('无分隔符与目录结尾路径有合理回退', () => {
    expect(getFileName('clip.mp4')).toBe('clip.mp4')
    expect(getFileName('/home/user/videos/')).toBe('/home/user/videos/')
  })

  it('分隔符归一化与扩展名解析', () => {
    expect(normalizePathSeparators('C:\\a\\b')).toBe('C:/a/b')
    expect(getFileExtension('C:\\Videos\\CLIP.MP4')).toBe('mp4')
    expect(getFileExtension('README')).toBe('')
  })
})
