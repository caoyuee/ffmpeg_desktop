import { describe, it, expect } from 'vitest'
import {
  CODEC_DATABASE,
  FORMAT_COMPATIBILITY,
  getFormatCompatibility,
  isCodecCompatible,
  getRecommendedCodec,
  getCompatibleCodecs,
  filterCompatibleCodecs,
  getCodecMeta,
} from '@/config/codecDatabase'

// R2.2：格式兼容性元数据从被删除的 ffmpegCommandBuilder.ts 迁入 codecDatabase.ts，
// 这些用例同时守住「纯查询、不改用户状态」的契约。
describe('codecDatabase 格式兼容性元数据', () => {
  describe('getFormatCompatibility（格式归一化）', () => {
    it('去掉前导点并忽略大小写', () => {
      expect(getFormatCompatibility('.webm')).toBe(FORMAT_COMPATIBILITY.webm)
      expect(getFormatCompatibility('WEBM')).toBe(FORMAT_COMPATIBILITY.webm)
      expect(getFormatCompatibility('.MP4')).toBe(FORMAT_COMPATIBILITY.mp4)
      expect(getFormatCompatibility('webm')).toBe(FORMAT_COMPATIBILITY.webm)
    })

    it('未知格式返回 null 而不是退化成默认容器', () => {
      expect(getFormatCompatibility('unknown')).toBeNull()
      expect(getFormatCompatibility('')).toBeNull()
    })

    it('每个格式条目都有完整且类型正确的四个字段', () => {
      for (const [format, meta] of Object.entries(FORMAT_COMPATIBILITY)) {
        expect(Array.isArray(meta.videoCodecs), `${format}.videoCodecs`).toBe(true)
        expect(Array.isArray(meta.audioCodecs), `${format}.audioCodecs`).toBe(true)
        expect(typeof meta.defaultVideo, `${format}.defaultVideo`).toBe('string')
        expect(typeof meta.defaultAudio, `${format}.defaultAudio`).toBe('string')
        expect(typeof meta.description, `${format}.description`).toBe('string')
        expect(meta.description.length, `${format}.description`).toBeGreaterThan(0)
      }
    })

    it('有视频能力的容器，默认视频编码器必须在自己支持的列表里', () => {
      for (const [format, meta] of Object.entries(FORMAT_COMPATIBILITY)) {
        if (meta.videoCodecs.length === 0) continue
        expect(meta.videoCodecs, format).toContain(meta.defaultVideo)
      }
    })

    it('默认音频编码器必须在自己支持的列表里', () => {
      for (const [format, meta] of Object.entries(FORMAT_COMPATIBILITY)) {
        expect(meta.audioCodecs, format).toContain(meta.defaultAudio)
      }
    })
  })

  describe('isCodecCompatible', () => {
    it('应正确识别 WebM 支持的视频编码器', () => {
      expect(isCodecCompatible('webm', 'libvpx-vp9', 'video')).toBe(true)
      expect(isCodecCompatible('webm', 'libaom-av1', 'video')).toBe(true)
      expect(isCodecCompatible('webm', 'libx264', 'video')).toBe(false)
    })

    it('应正确识别 MP4 支持的视频编码器', () => {
      expect(isCodecCompatible('mp4', 'libx264', 'video')).toBe(true)
      expect(isCodecCompatible('mp4', 'libx265', 'video')).toBe(true)
      expect(isCodecCompatible('mp4', 'libvpx-vp9', 'video')).toBe(false)
    })

    it('未知格式允许所有编码器', () => {
      expect(isCodecCompatible('unknown', 'any_codec', 'video')).toBe(true)
      expect(isCodecCompatible('unknown', 'any_codec', 'audio')).toBe(true)
    })

    it('带点前缀与大写格式同样生效', () => {
      expect(isCodecCompatible('.WEBM', 'libx264', 'video')).toBe(false)
      expect(isCodecCompatible('.MP4', 'libx264', 'video')).toBe(true)
    })
  })

  describe('getRecommendedCodec', () => {
    it('应返回 WebM 的推荐视频/音频编码器', () => {
      expect(getRecommendedCodec('webm', 'video')).toBe('libvpx-vp9')
      expect(getRecommendedCodec('webm', 'audio')).toBe('libopus')
    })

    it('应返回 MP4 的推荐视频/音频编码器', () => {
      expect(getRecommendedCodec('mp4', 'video')).toBe('libx264')
      expect(getRecommendedCodec('mp4', 'audio')).toBe('aac')
    })

    it('未知格式返回通用编码器', () => {
      expect(getRecommendedCodec('unknown', 'video')).toBe('libx264')
      expect(getRecommendedCodec('unknown', 'audio')).toBe('aac')
    })

    it('纯音频容器的推荐视频编码器为空字符串', () => {
      expect(getRecommendedCodec('mp3', 'video')).toBe('')
      expect(getRecommendedCodec('flac', 'audio')).toBe('flac')
    })
  })

  describe('getCompatibleCodecs', () => {
    it('应返回 WebM 支持的所有视频编码器', () => {
      const codecs = getCompatibleCodecs('webm', 'video')
      expect(codecs).toContain('libvpx-vp9')
      expect(codecs).toContain('libaom-av1')
      expect(codecs).not.toContain('libx264')
    })

    it('应返回 MP4 支持的所有音频编码器', () => {
      const codecs = getCompatibleCodecs('mp4', 'audio')
      expect(codecs).toContain('aac')
      expect(codecs).toContain('mp3')
      expect(codecs).toContain('libopus')
    })

    it('未知格式返回空数组（表示支持所有）', () => {
      expect(getCompatibleCodecs('unknown', 'video')).toEqual([])
      expect(getCompatibleCodecs('unknown', 'audio')).toEqual([])
    })
  })

  describe('filterCompatibleCodecs', () => {
    it('应过滤出兼容的编码器', () => {
      const codecs = [
        { ffmpegEncoder: 'libx264', name: 'H.264' },
        { ffmpegEncoder: 'libvpx-vp9', name: 'VP9' },
        { ffmpegEncoder: 'libaom-av1', name: 'AV1' },
      ]

      const filtered = filterCompatibleCodecs('webm', codecs, 'video')

      expect(filtered).toHaveLength(2)
      expect(filtered[0]!.ffmpegEncoder).toBe('libvpx-vp9')
      expect(filtered[1]!.ffmpegEncoder).toBe('libaom-av1')
    })

    it('copy 模式对所有格式都兼容', () => {
      const codecs = [
        { ffmpegEncoder: 'copy', name: 'Copy' },
        { ffmpegEncoder: 'libx264', name: 'H.264' },
      ]

      const filtered = filterCompatibleCodecs('webm', codecs, 'video')

      expect(filtered).toHaveLength(1)
      expect(filtered[0]!.ffmpegEncoder).toBe('copy')
    })

    it('未知格式不过滤、且不修改传入数组', () => {
      const codecs = [{ ffmpegEncoder: 'libx264' }]
      const filtered = filterCompatibleCodecs('unknown', codecs, 'video')
      expect(filtered).toEqual(codecs)
      expect(codecs).toEqual([{ ffmpegEncoder: 'libx264' }])
    })
  })

  describe('与编码器元数据库共存', () => {
    it('CODEC_DATABASE / getCodecMeta 未因元数据迁入受影响', () => {
      expect(getCodecMeta('libx264').presets).toContain('medium')
      expect(getCodecMeta('不存在的编码器')).toEqual({
        presets: [],
        profiles: [],
        tunes: [],
        pixFmts: [],
      })
      expect(CODEC_DATABASE.libx264).toBeDefined()
    })
  })
})
