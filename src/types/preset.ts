export interface PresetData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  output: {
    container: string;
    naming: {
      useAutoNaming: boolean;
      autoNamingOption: number;
      noOutputFileParam: boolean;
      prefixText: string;
      replaceText: string;
      suffixText: string;
      preserveCreationTime: boolean;
      preserveModifyTime: boolean;
      preserveAccessTime: boolean;
    };
    location: string;
  };

  decode: {
    decoder: string;
    cpuThreads: string;
    cpuAffinity: string;
    outputFormat: string;
    hwAccelParamName: string;
    hwAccelParam: string;
  };

  video: {
    encoder: {
      category: string;
      codec: string;
      preset: string;
      profile: string;
      tune: string;
      gpu: string;
      threads: string;
    };
    resolution: {
      size: string;
      autoWidth: string;
      autoHeight: string;
      cropFilter: string;
    };
    frameRate: {
      fps: string;
      decimateMax: string;
    };
    bitrateControl: {
      mode: "CRF" | "VBR" | "VBR_HQ" | "CQP" | "CBR" | "";
      qualityParam: "crf" | "cq" | "qp" | "global_quality" | "";
      qualityValue: string;
      baseBitrate: string;
      minBitrate: string;
      maxBitrate: string;
      bufferSize: string;
      advancedParams: string[];
    };
    colorManagement: {
      pixelFormat: string;
      filter: string;
      colorSpace: string;
      colorPrimaries: string;
      colorTRC: string;
      colorRange: string;
      tonemapAlgo: string;
      processMode: number;
      brightness: string;
      contrast: string;
      saturation: string;
      gamma: string;
    };
    filters: {
      deinterlace: number;
      denoise: {
        method: string;
        param1: string;
        param2: string;
        param3: string;
        param4: string;
      };
      sharpen: {
        lumaMsizeX: string;
        lumaMsizeY: string;
        lumaAmount: string;
      };
      interpolation: {
        targetFps: string;
        mode: string;
        meMode: string;
        meAlgo: string;
        mcMode: string;
        vsbmc: boolean;
        blockSize: string;
        searchRange: string;
        scdThreshold: string;
      };
      superResolution: {
        targetWidth: string;
        targetHeight: string;
        upscaler: string;
        downscaler: string;
        antiringing: string;
        shaders: string[];
      };
      rotation: number;
      flip: number;
    };
    subtitleBurn: {
      filter: string;
      formatPriority: number[];
      externalFile: boolean;
      externalFileName: string;
      externalFolder: string;
      embeddedStream: boolean;
      streamIndex: string;
      fontsDir: string;
      style: {
        fontName: string;
        fontSize: number;
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikeout: boolean;
      };
      borderStyle: number;
      outlineWidth: string;
      shadowDistance: string;
      primaryColor: string;
      primaryAlpha: string;
      secondaryColor: string;
      secondaryAlpha: string;
      outlineColor: string;
      outlineAlpha: string;
      backColor: string;
      backAlpha: string;
      alignment: number;
      marginV: string;
      marginL: string;
      marginR: string;
      spacing: string;
      lineSpacing: string;
      customStyle: string;
      customFilterParam: string;
    };
    frameServer: {
      useAviSynth: boolean;
      avsScript: string;
      useVapourSynth: boolean;
      vpyScript: string;
    };
  };

  audio: {
    encoder: string;
    bitrate: string;
    qualityParam: string;
    qualityValue: string;
    channelLayout: string;
    sampleRate: string;
    loudnorm: {
      targetLoudness: string;
      dynamicRange: string;
      peakLevel: string;
    };
  };

  image: {
    encoder: string;
    quality: string;
  };

  custom: {
    videoFilter: string;
    audioFilter: string;
    filterComplex: string;
    videoParams: string;
    audioParams: string;
    startParams: string;
    beforeOutputParams: string;
    afterOutputParams: string;
    endParams: string;
    fullCustom: string;
  };

  trim: {
    method: number;
    inPoint: string;
    outPoint: string;
    seekBackward: string;
  };

  streamControl: {
    videoStreams: string[];
    keepOtherVideo: boolean;
    audioStreams: string[];
    keepOtherAudio: boolean;
    subtitleStreams: string[];
    subtitleOperation: number;
    keepOtherSubtitle: boolean;
    autoMuxSRT: boolean;
    autoMuxASS: boolean;
    autoMuxSSA: boolean;
    convertSubtitleToMovText: boolean;
    metadataOption: number;
    chapterOption: number;
    attachmentOption: number;
  };
}

export const DEFAULT_PRESET: PresetData = {
  id: "",
  name: "默认预设",
  createdAt: new Date(),
  updatedAt: new Date(),

  output: {
    container: ".mp4",
    naming: {
      useAutoNaming: true,
      autoNamingOption: 0,
      noOutputFileParam: false,
      prefixText: "",
      replaceText: "",
      suffixText: "",
      preserveCreationTime: false,
      preserveModifyTime: false,
      preserveAccessTime: false,
    },
    location: "",
  },

  decode: {
    decoder: "",
    cpuThreads: "",
    cpuAffinity: "",
    outputFormat: "",
    hwAccelParamName: "",
    hwAccelParam: "",
  },

  video: {
    encoder: {
      category: "",
      codec: "",
      preset: "",
      profile: "",
      tune: "",
      gpu: "",
      threads: "",
    },
    resolution: {
      size: "",
      autoWidth: "",
      autoHeight: "",
      cropFilter: "",
    },
    frameRate: {
      fps: "",
      decimateMax: "",
    },
    bitrateControl: {
      mode: "CRF",
      qualityParam: "crf",
      qualityValue: "23",
      baseBitrate: "",
      minBitrate: "",
      maxBitrate: "",
      bufferSize: "",
      advancedParams: [],
    },
    colorManagement: {
      pixelFormat: "",
      filter: "",
      colorSpace: "",
      colorPrimaries: "",
      colorTRC: "",
      colorRange: "",
      tonemapAlgo: "",
      processMode: 0,
      brightness: "",
      contrast: "",
      saturation: "",
      gamma: "",
    },
    filters: {
      deinterlace: 0,
      denoise: {
        method: "",
        param1: "",
        param2: "",
        param3: "",
        param4: "",
      },
      sharpen: {
        lumaMsizeX: "",
        lumaMsizeY: "",
        lumaAmount: "",
      },
      interpolation: {
        targetFps: "",
        mode: "",
        meMode: "",
        meAlgo: "",
        mcMode: "",
        vsbmc: false,
        blockSize: "",
        searchRange: "",
        scdThreshold: "",
      },
      superResolution: {
        targetWidth: "",
        targetHeight: "",
        upscaler: "",
        downscaler: "",
        antiringing: "",
        shaders: [],
      },
      rotation: 0,
      flip: 0,
    },
    subtitleBurn: {
      filter: "",
      formatPriority: [-1, -1, -1],
      externalFile: false,
      externalFileName: "",
      externalFolder: "",
      embeddedStream: false,
      streamIndex: "",
      fontsDir: "",
      style: {
        fontName: "",
        fontSize: 0,
        bold: false,
        italic: false,
        underline: false,
        strikeout: false,
      },
      borderStyle: -1,
      outlineWidth: "",
      shadowDistance: "",
      primaryColor: "",
      primaryAlpha: "",
      secondaryColor: "",
      secondaryAlpha: "",
      outlineColor: "",
      outlineAlpha: "",
      backColor: "",
      backAlpha: "",
      alignment: -1,
      marginV: "",
      marginL: "",
      marginR: "",
      spacing: "",
      lineSpacing: "",
      customStyle: "",
      customFilterParam: "",
    },
    frameServer: {
      useAviSynth: false,
      avsScript: "",
      useVapourSynth: false,
      vpyScript: "",
    },
  },

  audio: {
    encoder: "",
    bitrate: "",
    qualityParam: "",
    qualityValue: "",
    channelLayout: "",
    sampleRate: "",
    loudnorm: {
      targetLoudness: "",
      dynamicRange: "",
      peakLevel: "",
    },
  },

  image: {
    encoder: "",
    quality: "",
  },

  custom: {
    videoFilter: "",
    audioFilter: "",
    filterComplex: "",
    videoParams: "",
    audioParams: "",
    startParams: "",
    beforeOutputParams: "",
    afterOutputParams: "",
    endParams: "",
    fullCustom: "",
  },

  trim: {
    method: 0,
    inPoint: "",
    outPoint: "",
    seekBackward: "",
  },

  streamControl: {
    videoStreams: [],
    keepOtherVideo: false,
    audioStreams: [],
    keepOtherAudio: false,
    subtitleStreams: [],
    subtitleOperation: 0,
    keepOtherSubtitle: false,
    autoMuxSRT: false,
    autoMuxASS: false,
    autoMuxSSA: false,
    convertSubtitleToMovText: false,
    metadataOption: 0,
    chapterOption: 0,
    attachmentOption: 0,
  },
};
