import type { PresetData } from "@/types/preset";

export class FFmpegCommandBuilder {
  static build(
    preset: PresetData,
    inputFile: string,
    outputFile: string,
  ): string {
    if (preset.custom.fullCustom) {
      return this.replacePlaceholders(
        preset.custom.fullCustom,
        inputFile,
        outputFile,
      );
    }

    const parts: string[] = [];

    parts.push("-hide_banner -nostdin");

    if (preset.custom.startParams) {
      parts.push(preset.custom.startParams);
    }

    if (preset.decode.decoder) {
      parts.push(`-hwaccel ${preset.decode.decoder}`);
    }
    if (preset.decode.cpuThreads) {
      parts.push(`-threads ${preset.decode.cpuThreads}`);
    }
    if (preset.decode.outputFormat) {
      parts.push(`-hwaccel_output_format ${preset.decode.outputFormat}`);
    }

    const trimParams = this.buildTrimParams(preset);
    parts.push(...trimParams);

    if (!trimParams.includes(`-i "$INPUT"`)) {
      parts.push(`-i "${inputFile}"`);
    }

    const videoFilters = this.buildVideoFilters(
      preset.video,
      preset.custom.videoFilter,
    );
    if (videoFilters.length > 0) {
      parts.push(`-vf "${videoFilters.join(",")}"`);
    }

    parts.push(
      ...this.buildVideoEncodeParams(preset.video, preset.custom.videoParams),
    );

    const audioFilters = this.buildAudioFilters(preset.audio);
    if (audioFilters.length > 0) {
      parts.push(`-af "${audioFilters.join(",")}"`);
    }

    parts.push(
      ...this.buildAudioEncodeParams(preset.audio, preset.custom.audioParams),
    );

    parts.push(...this.buildStreamControl(preset.streamControl));

    parts.push(...this.buildImageEncodeParams(preset.image));

    if (preset.custom.beforeOutputParams) {
      parts.push(preset.custom.beforeOutputParams);
    }

    parts.push(`"${outputFile}" -y`);

    if (preset.custom.afterOutputParams) {
      parts.push(preset.custom.afterOutputParams);
    }

    if (preset.custom.endParams) {
      parts.push(preset.custom.endParams);
    }

    let command = parts.join(" ");
    command = command.replace(/"\$INPUT"/g, `"${inputFile}"`);
    return command;
  }

  private static replacePlaceholders(
    template: string,
    inputFile: string,
    outputFile: string,
  ): string {
    return template
      .replace(/\{input\}/g, `"${inputFile}"`)
      .replace(/\{output\}/g, `"${outputFile}"`)
      .replace(/"\$INPUT"/g, `"${inputFile}"`)
      .replace(/"\$OUTPUT"/g, `"${outputFile}"`);
  }

  private static buildTrimParams(preset: PresetData): string[] {
    const params: string[] = [];

    if (preset.trim.method === 0) {
      return params;
    }

    if (preset.trim.method === 1) {
      if (preset.trim.inPoint) {
        if (preset.trim.seekBackward) {
          params.push(`-ss ${preset.trim.seekBackward}`);
          params.push(`-i "$INPUT"`);
          params.push(`-ss ${preset.trim.inPoint}`);
        } else {
          params.push(`-ss ${preset.trim.inPoint}`);
        }
      }
      if (preset.trim.outPoint) {
        params.push(`-to ${preset.trim.outPoint}`);
      }
    } else if (preset.trim.method === 2) {
      if (preset.trim.inPoint) {
        params.push(`-ss ${preset.trim.inPoint}`);
      }
      if (preset.trim.outPoint) {
        params.push(`-t ${preset.trim.outPoint}`);
      }
    }

    return params;
  }

  private static buildImageEncodeParams(
    image: PresetData["image"],
  ): string[] {
    const params: string[] = [];
    if (!image.encoder) return params;

    const encoderMap: Record<string, string> = {
      png: "png",
      apng: "apng",
      mjpeg: "mjpeg",
      libwebp: "libwebp",
      gif: "gif",
      bmp: "bmp",
      tiff: "tiff",
    };

    const ffmpegEncoder = encoderMap[image.encoder] || image.encoder;
    params.push(`-c:v ${ffmpegEncoder}`);

    if (image.quality) {
      if (image.encoder === "mjpeg") {
        params.push(`-q:v ${image.quality}`);
      } else if (image.encoder === "libwebp") {
        params.push(`-quality ${image.quality}`);
      } else if (image.encoder === "apng") {
        params.push(`-plays 0`);
      }
    }

    return params;
  }

  private static buildVideoFilters(
    video: PresetData["video"],
    customVideoFilter?: string,
  ): string[] {
    const filters: string[] = [];

    if (video.filters.deinterlace > 0) {
      filters.push(this.buildDeinterlace(video.filters.deinterlace));
    }

    if (video.resolution.cropFilter) {
      filters.push(`crop=${video.resolution.cropFilter}`);
    }

    if (video.resolution.size) {
      filters.push(`scale=${video.resolution.size}`);
    } else if (video.resolution.autoWidth) {
      filters.push(`scale=${video.resolution.autoWidth}:-2`);
    } else if (video.resolution.autoHeight) {
      filters.push(`scale=-2:${video.resolution.autoHeight}`);
    }

    if (video.filters.denoise.method) {
      filters.push(this.buildDenoise(video.filters.denoise));
    }

    if (video.filters.sharpen.lumaAmount) {
      filters.push(
        `unsharp=luma_msize_x=${video.filters.sharpen.lumaMsizeX}:` +
          `luma_msize_y=${video.filters.sharpen.lumaMsizeY}:` +
          `luma_amount=${video.filters.sharpen.lumaAmount}`,
      );
    }

    if (video.filters.interpolation.targetFps) {
      filters.push(this.buildInterpolation(video.filters.interpolation));
    }

    if (video.subtitleBurn.externalFile || video.subtitleBurn.embeddedStream) {
      const subtitleFilter = this.buildSubtitleFilter(video.subtitleBurn);
      if (subtitleFilter) {
        filters.push(subtitleFilter);
      }
    }

    if (video.filters.superResolution.targetWidth) {
      filters.push(this.buildSuperResolution(video.filters.superResolution));
    }

    if (video.colorManagement.processMode > 0) {
      filters.push(...this.buildColorManagement(video.colorManagement));
    }

    if (video.filters.rotation > 0) {
      filters.push(...this.buildRotation(video.filters.rotation));
    }
    if (video.filters.flip > 0) {
      filters.push(video.filters.flip === 1 ? "hflip" : "vflip");
    }

    if (customVideoFilter) {
      filters.push(customVideoFilter);
    }

    return filters;
  }

  private static buildDeinterlace(mode: number): string {
    switch (mode) {
      case 1:
        return "yadif=0:-1:0";
      case 2:
        return "yadif=1:-1:0";
      case 3:
        return "bwdif=0:-1:0";
      case 4:
        return "bwdif=1:-1:0";
      default:
        return "";
    }
  }

  private static buildDenoise(
    denoise: PresetData["video"]["filters"]["denoise"],
  ): string {
    const { method, param1, param2, param3, param4 } = denoise;

    switch (method) {
      case "hqdn3d":
        return `hqdn3d=${param1 || 4}:${param2 || 3}:${param3 || 6}:${param4 || 4}`;
      case "nlmeans":
        return `nlmeans=s=${param1 || 3}`;
      case "atadenoise":
        return `atadenoise=s=${param1 || 0.02}`;
      default:
        return "";
    }
  }

  private static buildInterpolation(
    interp: PresetData["video"]["filters"]["interpolation"],
  ): string {
    const params: string[] = [];

    params.push(`fps=${interp.targetFps}`);

    if (interp.mode) {
      params.push(`mi_mode=${interp.mode}`);
    }
    if (interp.meMode) {
      params.push(`me=${interp.meMode}`);
    }
    if (interp.meAlgo) {
      params.push(`me_mode=${interp.meAlgo}`);
    }
    if (interp.mcMode) {
      params.push(`mc_mode=${interp.mcMode}`);
    }
    if (interp.vsbmc) {
      params.push("vsbmc=1");
    }

    return `minterpolate=${params.join(":")}`;
  }

  private static buildSuperResolution(
    sr: PresetData["video"]["filters"]["superResolution"],
  ): string {
    const params: string[] = [];

    params.push(`w=${sr.targetWidth}`);
    params.push(`h=${sr.targetHeight}`);

    if (sr.upscaler) {
      params.push(`upscaler=${sr.upscaler}`);
    }
    if (sr.downscaler) {
      params.push(`downscaler=${sr.downscaler}`);
    }

    return `libplacebo=${params.join(":")}`;
  }

  private static buildColorManagement(
    color: PresetData["video"]["colorManagement"],
  ): string[] {
    const filters: string[] = [];

    if (color.pixelFormat) {
      filters.push(`format=${color.pixelFormat}`);
    }

    if (color.tonemapAlgo) {
      const tonemapParams: string[] = [`tonemap=${color.tonemapAlgo}`];
      if (color.colorPrimaries) {
        tonemapParams.push(`primaries=${color.colorPrimaries}`);
      }
      tonemapParams.push("desat=0");
      filters.push(tonemapParams.join(":"));
    }

    if (color.brightness || color.contrast || color.saturation || color.gamma) {
      const params: string[] = [];
      if (color.brightness) params.push(`brightness=${color.brightness}`);
      if (color.contrast) params.push(`contrast=${color.contrast}`);
      if (color.saturation) params.push(`saturation=${color.saturation}`);
      if (color.gamma) params.push(`gamma=${color.gamma}`);
      filters.push(`eq=${params.join(":")}`);
    }

    return filters;
  }

  private static buildRotation(rotation: number): string[] {
    switch (rotation) {
      case 1:
        return ["transpose=1"];
      case 2:
        return ["transpose=1,transpose=1"];
      case 3:
        return ["transpose=2"];
      default:
        return [];
    }
  }

  private static buildVideoEncodeParams(
    video: PresetData["video"],
    customVideoParams?: string,
  ): string[] {
    const params: string[] = [];

    if (video.encoder.codec) {
      params.push(`-c:v ${video.encoder.codec}`);
    }

    if (video.encoder.preset) {
      params.push(`-preset ${video.encoder.preset}`);
    }

    if (video.encoder.profile) {
      params.push(`-profile:v ${video.encoder.profile}`);
    }

    if (video.encoder.tune) {
      params.push(`-tune ${video.encoder.tune}`);
    }

    if (
      video.bitrateControl.qualityParam &&
      video.bitrateControl.qualityValue
    ) {
      params.push(
        `-${video.bitrateControl.qualityParam} ${video.bitrateControl.qualityValue}`,
      );
    }

    if (video.bitrateControl.baseBitrate) {
      params.push(`-b:v ${video.bitrateControl.baseBitrate}`);
    }
    if (video.bitrateControl.maxBitrate) {
      params.push(`-maxrate:v ${video.bitrateControl.maxBitrate}`);
    }
    if (video.bitrateControl.bufferSize) {
      params.push(`-bufsize:v ${video.bitrateControl.bufferSize}`);
    }

    if (video.frameRate.fps) {
      params.push(`-r ${video.frameRate.fps}`);
    }

    if (video.encoder.threads) {
      params.push(`-threads ${video.encoder.threads}`);
    }

    if (video.colorManagement.colorSpace) {
      params.push(`-colorspace ${video.colorManagement.colorSpace}`);
    }
    if (video.colorManagement.colorPrimaries) {
      params.push(`-color_primaries ${video.colorManagement.colorPrimaries}`);
    }
    if (video.colorManagement.colorTRC) {
      params.push(`-color_trc ${video.colorManagement.colorTRC}`);
    }
    if (video.colorManagement.colorRange) {
      params.push(`-color_range ${video.colorManagement.colorRange}`);
    }

    if (customVideoParams) {
      params.push(customVideoParams);
    }

    return params;
  }

  private static buildAudioFilters(audio: PresetData["audio"]): string[] {
    const filters: string[] = [];

    if (audio.loudnorm.targetLoudness) {
      const params: string[] = [];
      params.push(`I=${audio.loudnorm.targetLoudness}`);
      if (audio.loudnorm.dynamicRange) {
        params.push(`LRA=${audio.loudnorm.dynamicRange}`);
      }
      if (audio.loudnorm.peakLevel) {
        params.push(`TP=${audio.loudnorm.peakLevel}`);
      }
      filters.push(`loudnorm=${params.join(":")}`);
    }

    return filters;
  }

  private static buildAudioEncodeParams(
    audio: PresetData["audio"],
    customAudioParams?: string,
  ): string[] {
    const params: string[] = [];

    if (audio.encoder) {
      params.push(`-c:a ${audio.encoder}`);
    }

    if (audio.bitrate) {
      params.push(`-b:a ${audio.bitrate}`);
    }

    if (audio.sampleRate) {
      params.push(`-ar ${audio.sampleRate}`);
    }

    if (audio.channelLayout) {
      params.push(`-ac ${audio.channelLayout}`);
    }

    if (customAudioParams) {
      params.push(customAudioParams);
    }

    return params;
  }

  private static buildStreamControl(
    streamControl: PresetData["streamControl"],
  ): string[] {
    const params: string[] = [];

    if (streamControl.videoStreams.length > 0) {
      streamControl.videoStreams.forEach((stream) => {
        params.push(`-map ${stream}`);
      });
    }

    if (streamControl.audioStreams.length > 0) {
      streamControl.audioStreams.forEach((stream) => {
        params.push(`-map ${stream}`);
      });
    }

    if (streamControl.subtitleStreams.length > 0) {
      streamControl.subtitleStreams.forEach((stream) => {
        params.push(`-map ${stream}`);
      });
    }

    if (streamControl.metadataOption === 0) {
      params.push("-map_metadata 0");
    } else if (streamControl.metadataOption === 1) {
      params.push("-map_metadata -1");
    }

    if (streamControl.chapterOption === 0) {
      params.push("-map_chapters 0");
    } else if (streamControl.chapterOption === 1) {
      params.push("-map_chapters -1");
    }

    return params;
  }

  private static buildSubtitleFilter(
    subtitle: PresetData["video"]["subtitleBurn"],
  ): string {
    const params: string[] = [];

    if (subtitle.externalFile && subtitle.externalFileName) {
      const escapedPath = subtitle.externalFileName.replace(/'/g, "'\\''");
      params.push(`filename='${escapedPath}'`);
    } else if (subtitle.embeddedStream && subtitle.streamIndex) {
      params.push(`si=${subtitle.streamIndex}`);
    } else {
      return "";
    }

    const styleParams = this.buildSubtitleStyle(subtitle);
    if (styleParams) {
      params.push(`force_style='${styleParams}'`);
    }

    return `subtitles=${params.join(":")}`;
  }

  private static buildSubtitleStyle(
    subtitle: PresetData["video"]["subtitleBurn"],
  ): string {
    const styles: string[] = [];

    if (subtitle.style.fontName) {
      styles.push(`FontName=${subtitle.style.fontName}`);
    }
    if (subtitle.style.fontSize > 0) {
      styles.push(`FontSize=${subtitle.style.fontSize}`);
    }
    if (subtitle.style.bold) {
      styles.push("Bold=1");
    }
    if (subtitle.style.italic) {
      styles.push("Italic=1");
    }
    if (subtitle.primaryColor) {
      const assColor = this.hexToAssColor(subtitle.primaryColor);
      styles.push(`PrimaryColour=${assColor}`);
    }
    if (subtitle.outlineColor) {
      const assColor = this.hexToAssColor(subtitle.outlineColor);
      styles.push(`OutlineColour=${assColor}`);
    }
    if (subtitle.outlineWidth) {
      styles.push(`Outline=${subtitle.outlineWidth}`);
    }
    if (subtitle.shadowDistance) {
      styles.push(`Shadow=${subtitle.shadowDistance}`);
    }
    if (subtitle.alignment > 0) {
      styles.push(`Alignment=${subtitle.alignment}`);
    }
    if (subtitle.marginL) {
      styles.push(`MarginL=${subtitle.marginL}`);
    }
    if (subtitle.marginR) {
      styles.push(`MarginR=${subtitle.marginR}`);
    }
    if (subtitle.marginV) {
      styles.push(`MarginV=${subtitle.marginV}`);
    }

    return styles.join(",");
  }

  private static hexToAssColor(hex: string): string {
    const color = hex.replace("#", "");
    const r = color.substring(0, 2);
    const g = color.substring(2, 4);
    const b = color.substring(4, 6);
    return `&H${b}${g}${r}&`;
  }
}
