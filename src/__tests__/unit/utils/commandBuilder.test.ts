import { describe, it, expect } from 'vitest'
import { FFmpegCommandBuilder } from '@/utils/commandBuilder'
import { DEFAULT_PRESET, type PresetData } from '@/types/preset'

describe('FFmpegCommandBuilder', () => {
  function makePreset(overrides: Partial<PresetData> = {}): PresetData {
    return { ...DEFAULT_PRESET, ...overrides } as PresetData
  }

  describe('basic command', () => {
    it('should generate a basic transcode command', () => {
      const cmd = FFmpegCommandBuilder.build(
        makePreset(),
        'input.mp4',
        'output.mp4',
      )
      expect(cmd).toContain('-hide_banner')
      expect(cmd).toContain('-i "input.mp4"')
      expect(cmd).toContain('"output.mp4"')
      expect(cmd).toContain('-y')
    })

    it('should handle full custom mode', () => {
      const cmd = FFmpegCommandBuilder.build(
        makePreset({ custom: { ...DEFAULT_PRESET.custom, fullCustom: 'ffmpeg -i "$INPUT" -c copy "$OUTPUT".mp4' } }),
        'input.mkv',
        'output',
      )
      expect(cmd).toContain('-i "input.mkv"')
      expect(cmd).toContain('-c copy')
      expect(cmd).toContain('"output".mp4')
    })
  })

  describe('video encoder params', () => {
    it('should set video codec', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          encoder: { ...DEFAULT_PRESET.video.encoder, codec: 'libx265' },
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('libx265')
    })

    it('should set video bitrate for VBR mode', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          bitrateControl: {
            ...DEFAULT_PRESET.video.bitrateControl,
            mode: 'VBR',
            baseBitrate: '5000',
          },
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('5000')
    })

    it('should set CRF for CRF mode', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          bitrateControl: {
            ...DEFAULT_PRESET.video.bitrateControl,
            mode: 'CRF',
            qualityValue: '18',
          },
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('crf')
      expect(cmd).toContain('18')
    })
  })

  describe('audio params', () => {
    it('should set audio codec', () => {
      const preset = makePreset({
        audio: {
          ...DEFAULT_PRESET.audio,
          encoder: 'aac',
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('aac')
    })

    it('should handle audio copy mode', () => {
      const preset = makePreset({
        audio: {
          ...DEFAULT_PRESET.audio,
          encoder: 'copy',
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('copy')
    })
  })

  describe('trim params', () => {
    it('should add trim seek params', () => {
      const preset = makePreset({
        trim: {
          method: 1,
          inPoint: '00:00:05',
          outPoint: '00:00:30',
          seekBackward: '',
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('-ss')
      expect(cmd).toContain('00:00:05')
    })
  })

  describe('filter params', () => {
    it('should add deinterlace filter', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          filters: {
            ...DEFAULT_PRESET.video.filters,
            deinterlace: 1,
          },
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('-vf')
      expect(cmd).toContain('yadif')
    })

    it('should add denoise filter', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          filters: {
            ...DEFAULT_PRESET.video.filters,
            denoise: {
              method: 'hqdn3d',
              param1: '4',
              param2: '3',
              param3: '6',
              param4: '4.5',
            },
          },
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('hqdn3d')
    })
  })

  describe('stream control', () => {
    it('should add stream mapping', () => {
      const preset = makePreset({
        streamControl: {
          ...DEFAULT_PRESET.streamControl,
          videoStreams: ['0'],
          audioStreams: ['0'],
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('-map')
    })
  })

  describe('custom params', () => {
    it('should include start params', () => {
      const preset = makePreset({
        custom: {
          ...DEFAULT_PRESET.custom,
          startParams: '-threads 4',
        },
      })
      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')
      expect(cmd).toContain('-threads 4')
    })
  })
})
