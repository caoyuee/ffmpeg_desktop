import { describe, expect, it } from 'vitest'
import zhCN from '@/i18n/locales/zh-CN'
import enUS from '@/i18n/locales/en-US'

describe('i18n locales', () => {
  function expectParamKeys(keys: string[]) {
    keys.forEach((key) => {
      expect(zhCN.page.params).toHaveProperty(key)
      expect(enUS.page.params).toHaveProperty(key)
    })
  }

  function expectPageKeys(page: keyof typeof zhCN.page, keys: string[]) {
    keys.forEach((key) => {
      expect(zhCN.page[page]).toHaveProperty(key)
      expect(enUS.page[page]).toHaveProperty(key)
    })
  }

  it('should include advanced parameter labels in both locales', () => {
    expectParamKeys([
      'fullCustomMode',
      'enableFullCustom',
      'customCommand',
      'placeholderHint',
      'decodeSettings',
      'decoder',
      'autoSelect',
      'hardwareDecodeH264',
      'hardwareDecodeHevc',
      'hardwareDecodeAv1',
      'hwAccelParamName',
      'notSpecified',
      'hwAccelParam',
      'hwAccelParamPlaceholder',
      'cpuThreads',
      'cpuThreadsPlaceholder',
      'cpuAffinity',
      'cpuAffinityPlaceholder',
      'customParams',
      'videoFilter',
      'videoFilterPlaceholder',
      'audioFilter',
      'audioFilterPlaceholder',
      'filterComplex',
      'filterComplexPlaceholder',
      'videoParams',
      'videoParamsPlaceholder',
      'audioParams',
      'audioParamsPlaceholder',
      'startParams',
      'startParamsPlaceholder',
      'beforeOutputParams',
      'beforeOutputParamsPlaceholder',
      'afterOutputParams',
      'afterOutputParamsPlaceholder',
      'endParams',
      'endParamsPlaceholder',
      'streamControl',
      'metadataMode',
      'keepMetadata',
      'removeMetadata',
      'chapterMode',
      'keepChapters',
      'removeChapters',
      'attachmentMode',
      'keepAttachments',
      'removeAttachments',
      'imageEncoding',
      'imageEncoder',
      'noImageProcessing',
      'apngAnimated',
      'imageQuality',
      'imageQualityPlaceholder',
    ])
  })

  it('should include output setting labels in both locales', () => {
    expectParamKeys([
      'outputContainer',
      'noOutputFileParam',
      'outputDirectory',
      'outputDirectoryPlaceholder',
      'selectDirectory',
      'autoNaming',
      'autoNamingOption',
      'suffixOnly',
      'prefixOnly',
      'replaceFileName',
      'fullyCustom',
      'prefixText',
      'replaceText',
      'suffixText',
      'preserveTimestamps',
      'preserveCreationTime',
      'preserveModifyTime',
      'preserveAccessTime',
      'videoCodecIncompatible',
      'audioCodecIncompatible',
    ])
  })

  it('should include video encoder setting labels in both locales', () => {
    expectParamKeys([
      'encoderCategory',
      'specificEncoder',
      'encoderPreset',
      'defaultOption',
      'profile',
      'tune',
      'gpuAcceleration',
      'gpuPlaceholder',
      'threads',
      'threadsPlaceholder',
    ])
  })

  it('should include audio setting labels in both locales', () => {
    expectParamKeys([
      'audioEncoder',
      'encoder',
      'noAudioProcessing',
      'copyStream',
      'lossless',
      'appleLossless',
      'audioQuality',
      'qualityControl',
      'bitrate',
      'qualityLevel',
      'bitrateKbps',
      'audioParameters',
      'sampleRate',
      'keepOriginal',
      'channelLayout',
      'mono',
      'stereo',
      'channel51',
      'channel71',
      'loudnessNormalization',
      'targetLoudness',
      'dynamicRange',
      'peakLevel',
    ])
  })

  it('should include quality setting labels in both locales', () => {
    expectParamKeys([
      'qualityControlMode',
      'qualityMode',
      'crfMode',
      'vbrMode',
      'vbrHqMode',
      'cbrMode',
      'cqpMode',
      'crfValueLabel',
      'qpValueLabel',
      'losslessHint',
      'defaultHint',
      'worstHint',
      'baseBitrateKbps',
      'baseBitratePlaceholder',
      'bitrateControl',
      'minBitrateKbps',
      'maxBitrateKbps',
      'bufferSizeKbps',
      'optionalPlaceholder',
    ])
  })

  it('should include video frame setting labels in both locales', () => {
    expectParamKeys([
      'resolution',
      'resolutionPreset',
      'custom',
      'width',
      'widthPlaceholder',
      'height',
      'heightPlaceholder',
      'cropFilter',
      'cropFilterPlaceholder',
      'cropWindow',
      'frameRate',
      'fps',
      'advancedFeatures',
      'interpolationParams',
      'superResolutionParams',
      'frameBlend',
    ])
  })

  it('should include color panel labels in both locales', () => {
    const keys = [
      'basicAdjustments',
      'brightness',
      'contrast',
      'saturation',
      'gamma',
      'resetBasicAdjustments',
      'pixelFormat',
      'automatic',
      'colorSpace',
      'colorPrimaries',
      'transferCharacteristics',
      'matrixCoefficients',
      'colorRange',
      'toneMapping',
      'toneMappingAlgo',
      'noToneMapping',
      'recommended',
      'hdrToSdrHint',
    ]

    keys.forEach((key) => {
      expect(zhCN.page.params.colorPanel).toHaveProperty(key)
      expect(enUS.page.params.colorPanel).toHaveProperty(key)
    })
  })

  it('should include queue drag and stdin labels in both locales', () => {
    expectPageKeys('queue', [
      'stdinPlaceholder',
      'dragToIndependentPanel',
      'dragToQueueHint',
      'sendStdinFailed',
    ])
  })

  it('should include independent panel labels in both locales', () => {
    expectPageKeys('independentPanel', [
      'title',
      'fileListTitle',
      'fileCount',
      'confirmAndAdd',
    ])
  })

  it('should include frame blend dialog labels in both locales', () => {
    const keys = [
      'title',
      'description1',
      'description2',
      'reduceFrameRate',
      'frameRatePlaceholder',
      'optional',
      'blendMode',
      'doNotUse',
      'averagePreviousFrame',
      'blend',
      'bitwiseAnd',
      'bitwiseOr',
      'bitwiseXor',
      'addPixels',
      'multiplyPixels',
      'cancelFilterHint',
      'blendRatio',
      'ratioPlaceholder',
      'mayNotWork',
    ]

    keys.forEach((key) => {
      expect(zhCN.dialog.frameBlend).toHaveProperty(key)
      expect(enUS.dialog.frameBlend).toHaveProperty(key)
    })
  })

  it('should include super resolution dialog labels in both locales', () => {
    const keys = [
      'title',
      'description1',
      'description2',
      'targetResolution',
      'widthPlaceholder',
      'heightPlaceholder',
      'cancelFilterHint',
      'samplingAlgorithm',
      'upscalerPlaceholder',
      'downscalerPlaceholder',
      'customShaderHint',
      'antiRinging',
      'antiRingingHint',
      'customShaderLabel',
      'add',
      'remove',
      'moveUp',
      'moveDown',
      'supportedShaderFormats',
      'download',
      'emptyShaderHint',
      'shaderFiles',
      'addShaderFailed',
    ]

    keys.forEach((key) => {
      expect(zhCN.dialog.superResolution).toHaveProperty(key)
      expect(enUS.dialog.superResolution).toHaveProperty(key)
    })
  })

  it('should include interpolation dialog labels in both locales', () => {
    const keys = [
      'title',
      'description1',
      'description2',
      'targetFrameRate',
      'targetFrameRatePlaceholder',
      'cancelFilterHint',
      'algorithmMode',
      'interpolationMode',
      'twoFrameWeightedAverage',
      'motionCompensatedInterpolation',
      'motionEstimationMode',
      'bidirectionalMotionEstimation',
      'bilateralMotionEstimation',
      'motionEstimationAlgorithm',
      'exhaustiveSearch',
      'threeStepSearch',
      'twoDimensionalLogSearch',
      'newThreeStepSearch',
      'fourStepSearch',
      'diamondSearch',
      'hexagonBasedSearch',
      'enhancedPredictiveZonalSearch',
      'unevenMultiHexagonSearch',
      'compensationMode',
      'motionCompensationMode',
      'overlappedBlockMotionCompensation',
      'adaptiveOverlappedBlockMotionCompensation',
      'variableSizeMotionCompensation',
      'detection',
      'default16',
      'blockSize',
      'default32',
      'searchRangePixels',
      'sceneChange',
      'default10',
      'cancelParamHint',
    ]

    keys.forEach((key) => {
      expect(zhCN.dialog.interpolation).toHaveProperty(key)
      expect(enUS.dialog.interpolation).toHaveProperty(key)
    })
  })

  it('should include stream selector dialog labels in both locales', () => {
    const keys = [
      'title',
      'open',
      'reset',
      'loading',
      'emptyHint',
      'videoStream',
      'audioStream',
      'subtitleStream',
      'videoStreamName',
      'audioStreamName',
      'subtitleStreamName',
      'mediaFiles',
      'openFileFailed',
      'readMediaInfoFailed',
    ]

    keys.forEach((key) => {
      expect(zhCN.dialog.streamSelector).toHaveProperty(key)
      expect(enUS.dialog.streamSelector).toHaveProperty(key)
    })
  })

  it('should include crop dialog labels in both locales', () => {
    const keys = [
      'title',
      'instruction1',
      'instruction2',
      'instruction3',
      'open',
      'complete',
      'cropPlaceholder',
      'timestamp',
      'aspectRatio',
      'free',
      'center',
      'dropHint',
      'videoFiles',
      'openVideoFailed',
      'extractFrameFailed',
    ]

    keys.forEach((key) => {
      expect(zhCN.dialog.crop).toHaveProperty(key)
      expect(enUS.dialog.crop).toHaveProperty(key)
    })
  })

  it('should include stream panel labels in both locales', () => {
    const keys = [
      'videoStream',
      'videoStreamIndex',
      'videoStreamPlaceholder',
      'defaultVideoStreamHint',
      'keepOtherVideo',
      'audioStream',
      'audioStreamIndex',
      'audioStreamPlaceholder',
      'defaultAudioStreamHint',
      'keepOtherAudio',
      'subtitleStream',
      'subtitleOperation',
      'noProcessing',
      'burnToVideo',
      'muxToOutput',
      'discard',
      'subtitleStreamIndex',
      'subtitleStreamPlaceholder',
      'keepOtherSubtitle',
      'autoMuxSrt',
      'autoMuxAss',
      'autoMuxSsa',
      'metadataAndChapter',
      'metadataOption',
      'keepMetadata',
      'removeMetadata',
      'chapterOption',
      'keepChapters',
      'removeChapters',
      'attachmentOption',
      'keepAttachments',
      'removeAttachments',
    ]

    keys.forEach((key) => {
      expect(zhCN.page.params.streamPanel).toHaveProperty(key)
      expect(enUS.page.params.streamPanel).toHaveProperty(key)
    })
  })

  it('should include subtitle panel labels in both locales', () => {
    const keys = [
      'subtitleBurn',
      'subtitleMode',
      'noSubtitle',
      'externalSubtitle',
      'embeddedSubtitle',
      'subtitleFile',
      'subtitleFilePlaceholder',
      'select',
      'subtitleStreamIndex',
      'fontStyle',
      'fontName',
      'fontSize',
      'bold',
      'italic',
      'primaryColor',
      'outlineColor',
      'borderAndPosition',
      'outlineWidth',
      'shadowDistance',
      'alignment',
      'default',
      'topLeft',
      'topCenter',
      'topRight',
      'middleLeft',
      'middleCenter',
      'middleRight',
      'bottomLeft',
      'bottomCenter',
      'bottomRight',
      'leftMargin',
      'rightMargin',
      'verticalMargin',
      'subtitleFiles',
      'selectSubtitleFailed',
    ]

    keys.forEach((key) => {
      expect(zhCN.page.params.subtitlePanel).toHaveProperty(key)
      expect(enUS.page.params.subtitlePanel).toHaveProperty(key)
    })
  })
})
