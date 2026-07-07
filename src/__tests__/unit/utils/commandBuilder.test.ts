import { beforeEach, describe, it, expect } from 'vitest'
import { FFmpegCommandBuilder } from '@/utils/commandBuilder'
import { DEFAULT_PRESET, type PresetData } from '@/types/preset'

describe('FFmpegCommandBuilder', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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

    it('should quote the configured Windows FFmpeg path in generated queue commands', () => {
      localStorage.setItem('appSettings', JSON.stringify({
        ffmpegPath: 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      }))

      const cmd = FFmpegCommandBuilder.build(
        makePreset(),
        'input.webm',
        'output.mp4',
      )

      expect(cmd).toMatch(/^"C:\\Program Files\\ffmpeg\\bin\\ffmpeg\.exe" /)
      expect(cmd).toContain('-i "input.webm"')
      expect(cmd).toContain('"output.mp4"')
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

    it('should replace FFmpegFreeUI placeholders in full custom mode', () => {
      const cmd = FFmpegCommandBuilder.build(
        makePreset({
          custom: {
            ...DEFAULT_PRESET.custom,
            fullCustom: 'ffmpeg -i "<InputFile>" -metadata title="<InputFileNameWithOutExtension>" "<OutputFile>"',
          },
        }),
        '/media/source clip.mkv',
        '/exports/result.mp4',
      )

      expect(cmd).toContain('-i "/media/source clip.mkv"')
      expect(cmd).toContain('-metadata title="source clip"')
      expect(cmd).toContain('"/exports/result.mp4"')
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

    it('should add nvenc gpu index when provided', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          encoder: {
            ...DEFAULT_PRESET.video.encoder,
            codec: 'h264_nvenc',
            gpu: '1',
          },
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-c:v h264_nvenc')
      expect(cmd).toContain('-gpu 1')
    })

    it('should prepare vaapi upload filters and device for vaapi encoders', () => {
      const preset = makePreset({
        decode: {
          ...DEFAULT_PRESET.decode,
          hwAccelParamName: '-vaapi_device',
          hwAccelParam: '/dev/dri/renderD128',
        },
        video: {
          ...DEFAULT_PRESET.video,
          encoder: {
            ...DEFAULT_PRESET.video.encoder,
            codec: 'h264_vaapi',
          },
          resolution: {
            ...DEFAULT_PRESET.video.resolution,
            size: '1280:720',
          },
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-vaapi_device /dev/dri/renderD128')
      expect(cmd).toContain('-vf "scale=1280:720,format=nv12,hwupload"')
      expect(cmd).toContain('-c:v h264_vaapi')
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

    it('should include custom filter_complex params', () => {
      const preset = makePreset({
        custom: {
          ...DEFAULT_PRESET.custom,
          filterComplex: '[0:v]scale=1280:720[v]',
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-filter_complex "[0:v]scale=1280:720[v]"')
    })

    it('should include custom audio filter params', () => {
      const preset = makePreset({
        custom: {
          ...DEFAULT_PRESET.custom,
          audioFilter: 'volume=2',
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-af "volume=2"')
    })

    it('should replace FFmpegFreeUI placeholders in custom params', () => {
      const preset = makePreset({
        custom: {
          ...DEFAULT_PRESET.custom,
          beforeOutputParams: '-metadata title="<InputFileNameWithOutExtension>" -metadata source="<InputFilePath>"',
        },
      })

      const cmd = FFmpegCommandBuilder.build(
        preset,
        'C:\\Videos\\source clip.mkv',
        'C:\\Exports\\result.mp4',
      )

      expect(cmd).toContain('-metadata title="source clip"')
      expect(cmd).toContain('-metadata source="C:\\Videos"')
    })

    it('should skip automatic output file params when disabled', () => {
      const preset = makePreset({
        output: {
          ...DEFAULT_PRESET.output,
          naming: {
            ...DEFAULT_PRESET.output.naming,
            noOutputFileParam: true,
          },
        },
        custom: {
          ...DEFAULT_PRESET.custom,
          beforeOutputParams: '-f null -',
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-f null -')
      expect(cmd).not.toContain('"out.mp4" -y')
    })
  })

  describe('decode params', () => {
    it('should include hardware decode device params', () => {
      const preset = makePreset({
        decode: {
          ...DEFAULT_PRESET.decode,
          hwAccelParamName: '-hwaccel_device',
          hwAccelParam: '0',
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-hwaccel_device 0')
    })
  })

  describe('frame server params', () => {
    it('should use VapourSynth script as a vapoursynth input', () => {
      const preset = makePreset({
        video: {
          ...DEFAULT_PRESET.video,
          frameServer: {
            ...DEFAULT_PRESET.video.frameServer,
            useVapourSynth: true,
            vpyScript: '/scripts/source.vpy',
          },
        },
      })

      const cmd = FFmpegCommandBuilder.build(preset, 'in.mp4', 'out.mp4')

      expect(cmd).toContain('-f vapoursynth -i "/scripts/source.vpy"')
      expect(cmd).not.toContain('-i "in.mp4"')
    })
  })
})
