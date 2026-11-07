import { describe, expect, it } from 'vitest'
import {
  buildMuxCommand,
  hasExplicitStreamSelection,
  needsSubtitleCopyWarning,
  type MuxInputSpec,
} from '@/config/muxCommand'

const FFMPEG = 'ffmpeg'

function spec(overrides: Partial<MuxInputSpec> = {}): MuxInputSpec {
  return {
    path: '/a.mp4',
    videoStreams: '',
    audioStreams: '',
    subtitleStreams: '',
    useChapters: false,
    useMetadata: false,
    ...overrides,
  }
}

describe('hasExplicitStreamSelection', () => {
  it('空白流选择视为未选择', () => {
    expect(hasExplicitStreamSelection(spec())).toBe(false)
    expect(hasExplicitStreamSelection(spec({ videoStreams: '  ' }))).toBe(false)
  })

  it('任一流类型有选择即视为已选择', () => {
    expect(hasExplicitStreamSelection(spec({ audioStreams: '0' }))).toBe(true)
  })
})

describe('buildMuxCommand（P2-2：默认不丢流）', () => {
  it('未填任何流选择时追加 -map i 复制全部流，而不是依赖 ffmpeg 默认挑选', () => {
    const command = buildMuxCommand([spec()], '/out.mkv', FFMPEG)
    expect(command).toContain('-i "/a.mp4"')
    expect(command).toContain('-map 0 ')
    expect(command).toContain('-c copy')
    expect(command).toMatch(/-c copy "\/out\.mkv" -y$/)
  })

  it('多输入混合：未选择的文件 -map i，已选择的文件逐流 -map', () => {
    const command = buildMuxCommand(
      [spec({ path: '/a.mkv' }), spec({ path: '/b.mkv', audioStreams: '1' })],
      '/out.mkv',
      FFMPEG,
    )
    expect(command).toContain('-map 0 ')
    expect(command).toContain('-map 1:a:1')
    expect(command).not.toContain('-vn')
    expect(command).not.toContain('-an')
  })

  it('显式选择仍按 i:type:index 逐流映射', () => {
    const command = buildMuxCommand(
      [spec({ videoStreams: '0,2', audioStreams: '1', subtitleStreams: '0' })],
      '/out.mkv',
      FFMPEG,
    )
    expect(command).toContain('-map 0:v:0')
    expect(command).toContain('-map 0:v:2')
    expect(command).toContain('-map 0:a:1')
    expect(command).toContain('-map 0:s:0')
    expect(command).not.toContain('-map 0 ')
  })

  it('章节与元数据开关映射到 -map_chapters / -map_metadata', () => {
    const command = buildMuxCommand(
      [spec({ useChapters: true, useMetadata: true })],
      '/out.mkv',
      FFMPEG,
    )
    expect(command).toContain('-map_chapters 0')
    expect(command).toContain('-map_metadata 0')
  })

  it('全部未选择时不产生 map_chapters / map_metadata（保持 ffmpeg 默认继承首个输入）', () => {
    const command = buildMuxCommand([spec(), spec()], '/out.mkv', FFMPEG)
    expect(command).not.toContain('-map_chapters')
    expect(command).not.toContain('-map_metadata')
  })
})

describe('needsSubtitleCopyWarning（P2-2：字幕 copy 容器兼容提示）', () => {
  it('mp4/mov/m4v 输出 + 有字幕流选择时提示', () => {
    expect(needsSubtitleCopyWarning('/o.mp4', true)).toBe(true)
    expect(needsSubtitleCopyWarning('/o.MOV', true)).toBe(true)
    expect(needsSubtitleCopyWarning('/o.m4v', true)).toBe(true)
  })

  it('mkv 等容器或无字幕流选择时不提示', () => {
    expect(needsSubtitleCopyWarning('/o.mkv', true)).toBe(false)
    expect(needsSubtitleCopyWarning('/o.mp4', false)).toBe(false)
  })

  it('无扩展名 / 非法输入不提示', () => {
    expect(needsSubtitleCopyWarning('', true)).toBe(false)
    expect(needsSubtitleCopyWarning('nopath', true)).toBe(false)
  })
})
