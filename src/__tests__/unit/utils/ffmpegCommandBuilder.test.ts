import { describe, it, expect } from 'vitest'
import {
  FFmpegCommandBuilder,
  buildFFmpegCommand,
  isCodecCompatible,
  getRecommendedCodec,
  getCompatibleCodecs,
  filterCompatibleCodecs,
  type FFmpegCommandOptions,
} from '@/utils/ffmpegCommandBuilder'

describe('FFmpegCommandBuilder', () => {
  describe('基本命令生成', () => {
    it('应生成最简单的转码命令', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('ffmpeg')
      expect(command).toContain('-i')
      expect(command).toContain('/test/input.mp4')
    })

    it('应正确处理输入输出路径', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        output: '/test/output.mkv',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('/test/input.mp4')
      expect(command).toContain('/test/output.mkv')
    })

    it('应自动生成输出文件名', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        format: 'mkv',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('_output.mkv')
    })
  })

  describe('视频编码参数', () => {
    it('应正确设置视频编码器', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx265',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-c:v libx265')
    })

    it('应正确设置 CRF 值', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx264',
        crf: 23,
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-crf 23')
    })

    it('应正确设置编码预设', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx264',
        preset: 'fast',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-preset fast')
    })

    it('H.264/H.265 应自动添加 yuv420p 像素格式', () => {
      const h264Options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx264',
      }
      expect(buildFFmpegCommand(h264Options)).toContain('-pix_fmt yuv420p')

      const h265Options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx265',
      }
      expect(buildFFmpegCommand(h265Options)).toContain('-pix_fmt yuv420p')
    })

    it('H.265 应添加 hvc1 标签', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx265',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-tag:v hvc1')
    })
  })

  describe('音频编码参数', () => {
    it('应正确设置音频编码器', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        videoCodec: 'libx264',
        audioCodec: 'libopus',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-c:a libopus')
    })

    it('Opus/Vorbis 应自动转换为立体声', () => {
      const opusOptions: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        output: '/test/output.webm',
        videoCodec: 'libvpx-vp9',
        audioCodec: 'libopus',
      }
      expect(buildFFmpegCommand(opusOptions)).toContain('-ac 2')

      const vorbisOptions: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        output: '/test/output.webm',
        videoCodec: 'libvpx-vp9',
        audioCodec: 'libvorbis',
      }
      expect(buildFFmpegCommand(vorbisOptions)).toContain('-ac 2')
    })
  })

  describe('时间范围处理', () => {
    it('应正确设置开始时间', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        startTime: '00:01:30',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-ss 00:01:30')
    })

    it('应正确设置持续时间', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        duration: '60',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-t 60')
    })

    it('应根据开始和结束时间计算持续时间', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        startTime: '00:01:00',
        endTime: '00:02:30',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-t 90')
    })
  })

  describe('文件路径转义', () => {
    it('应正确转义包含空格的路径', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/my video file.mp4',
        output: '/test/output file.mp4',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('"/test/my video file.mp4"')
      expect(command).toContain('"/test/output file.mp4"')
    })

    it('应正确转义包含中文的路径', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/视频文件.mp4',
        output: '/test/输出文件.mp4',
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('"/test/视频文件.mp4"')
      expect(command).toContain('"/test/输出文件.mp4"')
    })
  })

  describe('copy 模式', () => {
    it('应使用 -c copy 进行流复制', () => {
      const options: FFmpegCommandOptions = {
        input: '/test/input.mp4',
        copyCodec: true,
      }
      const command = buildFFmpegCommand(options)
      
      expect(command).toContain('-c copy')
      expect(command).not.toContain('-c:v')
      expect(command).not.toContain('-c:a')
    })
  })
})

describe('编码器兼容性检查', () => {
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

    it('未知格式应允许所有编码器', () => {
      expect(isCodecCompatible('unknown', 'any_codec', 'video')).toBe(true)
      expect(isCodecCompatible('unknown', 'any_codec', 'audio')).toBe(true)
    })
  })

  describe('getRecommendedCodec', () => {
    it('应返回 WebM 的推荐视频编码器', () => {
      expect(getRecommendedCodec('webm', 'video')).toBe('libvpx-vp9')
    })

    it('应返回 MP4 的推荐视频编码器', () => {
      expect(getRecommendedCodec('mp4', 'video')).toBe('libx264')
    })

    it('应返回 WebM 的推荐音频编码器', () => {
      expect(getRecommendedCodec('webm', 'audio')).toBe('libopus')
    })

    it('应返回 MP4 的推荐音频编码器', () => {
      expect(getRecommendedCodec('mp4', 'audio')).toBe('aac')
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

    it('未知格式应返回空数组', () => {
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
      expect(filtered[0].ffmpegEncoder).toBe('libvpx-vp9')
      expect(filtered[1].ffmpegEncoder).toBe('libaom-av1')
    })

    it('copy 模式应对所有格式兼容', () => {
      const codecs = [
        { ffmpegEncoder: 'copy', name: 'Copy' },
        { ffmpegEncoder: 'libx264', name: 'H.264' },
      ]
      
      const filtered = filterCompatibleCodecs('webm', codecs, 'video')
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].ffmpegEncoder).toBe('copy')
    })
  })
})

describe('格式自动修正', () => {
  it('WebM 格式应自动切换不兼容的编码器', () => {
    const options: FFmpegCommandOptions = {
      input: '/test/input.mp4',
      output: '/test/output.webm',
      videoCodec: 'libx264',
      audioCodec: 'aac',
    }
    const command = buildFFmpegCommand(options)
    
    expect(command).toContain('-c:v libvpx-vp9')
    expect(command).toContain('-c:a libopus')
  })

  it('MP4 格式应保持兼容的编码器', () => {
    const options: FFmpegCommandOptions = {
      input: '/test/input.mp4',
      output: '/test/output.mp4',
      videoCodec: 'libx264',
      audioCodec: 'aac',
    }
    const command = buildFFmpegCommand(options)
    
    expect(command).toContain('-c:v libx264')
    expect(command).toContain('-c:a aac')
  })
})

describe('getDescription', () => {
  it('应生成正确的描述', () => {
    const builder = new FFmpegCommandBuilder({
      input: '/test/input.mp4',
      videoCodec: 'libx264',
      crf: 23,
      preset: 'medium',
    })
    
    const description = builder.getDescription()
    
    expect(description).toContain('编码: libx264')
    expect(description).toContain('CRF: 23')
    expect(description).toContain('预设: medium')
  })

  it('应包含分辨率调整信息', () => {
    const builder = new FFmpegCommandBuilder({
      input: '/test/input.mp4',
      videoCodec: 'libx264',
      width: 1920,
      height: 1080,
    })
    
    const description = builder.getDescription()
    
    expect(description).toContain('分辨率调整')
  })

  it('应包含剪切信息', () => {
    const builder = new FFmpegCommandBuilder({
      input: '/test/input.mp4',
      startTime: '00:01:00',
      endTime: '00:02:00',
    })
    
    const description = builder.getDescription()
    
    expect(description).toContain('剪切')
  })
})
