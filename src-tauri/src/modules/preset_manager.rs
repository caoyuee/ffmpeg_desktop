use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetData {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub output: OutputSettings,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decode: Option<DecodeSettings>,
    pub video: VideoSettings,
    pub audio: AudioSettings,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<ImageSettings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom: Option<CustomSettings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trim: Option<TrimSettings>,
    #[serde(rename = "streamControl", skip_serializing_if = "Option::is_none")]
    pub stream_control: Option<StreamControlSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputSettings {
    pub container: String,
    pub naming: NamingSettings,
    pub location: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamingSettings {
    #[serde(rename = "useAutoNaming")]
    pub use_auto_naming: bool,
    #[serde(rename = "autoNamingOption")]
    pub auto_naming_option: i32,
    #[serde(rename = "noOutputFileParam")]
    pub no_output_file_param: bool,
    #[serde(rename = "prefixText")]
    pub prefix_text: String,
    #[serde(rename = "replaceText")]
    pub replace_text: String,
    #[serde(rename = "suffixText")]
    pub suffix_text: String,
    #[serde(rename = "preserveCreationTime")]
    pub preserve_creation_time: bool,
    #[serde(rename = "preserveModifyTime")]
    pub preserve_modify_time: bool,
    #[serde(rename = "preserveAccessTime")]
    pub preserve_access_time: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodeSettings {
    pub decoder: String,
    #[serde(rename = "cpuThreads")]
    pub cpu_threads: String,
    #[serde(rename = "cpuAffinity")]
    pub cpu_affinity: String,
    #[serde(rename = "outputFormat")]
    pub output_format: String,
    #[serde(rename = "hwAccelParamName")]
    pub hw_accel_param_name: String,
    #[serde(rename = "hwAccelParam")]
    pub hw_accel_param: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoSettings {
    pub encoder: EncoderSettings,
    pub resolution: ResolutionSettings,
    #[serde(rename = "frameRate")]
    pub frame_rate: FrameRateSettings,
    #[serde(rename = "bitrateControl")]
    pub bitrate_control: BitrateControlSettings,
    #[serde(rename = "colorManagement", skip_serializing_if = "Option::is_none")]
    pub color_management: Option<ColorManagementSettings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<FilterSettings>,
    #[serde(rename = "subtitleBurn", skip_serializing_if = "Option::is_none")]
    pub subtitle_burn: Option<SubtitleBurnSettings>,
    #[serde(rename = "frameServer", skip_serializing_if = "Option::is_none")]
    pub frame_server: Option<FrameServerSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncoderSettings {
    pub category: String,
    pub codec: String,
    pub preset: String,
    pub profile: String,
    pub tune: String,
    pub gpu: String,
    pub threads: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionSettings {
    pub size: String,
    #[serde(rename = "autoWidth")]
    pub auto_width: String,
    #[serde(rename = "autoHeight")]
    pub auto_height: String,
    #[serde(rename = "cropFilter")]
    pub crop_filter: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameRateSettings {
    pub fps: String,
    #[serde(rename = "decimateMax")]
    pub decimate_max: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BitrateControlSettings {
    pub mode: String,
    #[serde(rename = "qualityParam")]
    pub quality_param: String,
    #[serde(rename = "qualityValue")]
    pub quality_value: String,
    #[serde(rename = "baseBitrate")]
    pub base_bitrate: String,
    #[serde(rename = "minBitrate")]
    pub min_bitrate: String,
    #[serde(rename = "maxBitrate")]
    pub max_bitrate: String,
    #[serde(rename = "bufferSize")]
    pub buffer_size: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub advanced_params: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorManagementSettings {
    #[serde(rename = "pixelFormat")]
    pub pixel_format: String,
    pub filter: String,
    #[serde(rename = "colorSpace")]
    pub color_space: String,
    #[serde(rename = "colorPrimaries")]
    pub color_primaries: String,
    #[serde(rename = "colorTRC")]
    pub color_trc: String,
    #[serde(rename = "colorRange")]
    pub color_range: String,
    #[serde(rename = "tonemapAlgo")]
    pub tonemap_algo: String,
    #[serde(rename = "processMode")]
    pub process_mode: i32,
    pub brightness: String,
    pub contrast: String,
    pub saturation: String,
    pub gamma: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameBlendSettings {
    #[serde(rename = "frameRate")]
    pub frame_rate: String,
    #[serde(rename = "blendMode")]
    pub blend_mode: String,
    pub ratio: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterSettings {
    pub deinterlace: i32,
    #[serde(rename = "frameBlend", skip_serializing_if = "Option::is_none")]
    pub frame_blend: Option<FrameBlendSettings>,
    pub denoise: DenoiseSettings,
    pub sharpen: SharpenSettings,
    pub interpolation: InterpolationSettings,
    #[serde(rename = "superResolution")]
    pub super_resolution: SuperResolutionSettings,
    pub rotation: i32,
    pub flip: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DenoiseSettings {
    pub method: String,
    pub param1: String,
    pub param2: String,
    pub param3: String,
    pub param4: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SharpenSettings {
    #[serde(rename = "lumaMsizeX")]
    pub luma_msize_x: String,
    #[serde(rename = "lumaMsizeY")]
    pub luma_msize_y: String,
    #[serde(rename = "lumaAmount")]
    pub luma_amount: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpolationSettings {
    #[serde(rename = "targetFps")]
    pub target_fps: String,
    pub mode: String,
    #[serde(rename = "meMode")]
    pub me_mode: String,
    #[serde(rename = "meAlgo")]
    pub me_algo: String,
    #[serde(rename = "mcMode")]
    pub mc_mode: String,
    pub vsbmc: bool,
    #[serde(rename = "blockSize")]
    pub block_size: String,
    #[serde(rename = "searchRange")]
    pub search_range: String,
    #[serde(rename = "scdThreshold")]
    pub scd_threshold: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuperResolutionSettings {
    #[serde(rename = "targetWidth")]
    pub target_width: String,
    #[serde(rename = "targetHeight")]
    pub target_height: String,
    pub upscaler: String,
    pub downscaler: String,
    pub antiringing: String,
    pub shaders: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleBurnSettings {
    pub filter: String,
    #[serde(rename = "formatPriority")]
    pub format_priority: Vec<i32>,
    #[serde(rename = "externalFile")]
    pub external_file: bool,
    #[serde(rename = "externalFileName")]
    pub external_file_name: String,
    #[serde(rename = "externalFolder")]
    pub external_folder: String,
    #[serde(rename = "embeddedStream")]
    pub embedded_stream: bool,
    #[serde(rename = "streamIndex")]
    pub stream_index: String,
    #[serde(rename = "fontsDir")]
    pub fonts_dir: String,
    pub style: SubtitleStyle,
    #[serde(rename = "borderStyle")]
    pub border_style: i32,
    #[serde(rename = "outlineWidth")]
    pub outline_width: String,
    #[serde(rename = "shadowDistance")]
    pub shadow_distance: String,
    #[serde(rename = "primaryColor")]
    pub primary_color: String,
    #[serde(rename = "primaryAlpha")]
    pub primary_alpha: String,
    #[serde(rename = "secondaryColor")]
    pub secondary_color: String,
    #[serde(rename = "secondaryAlpha")]
    pub secondary_alpha: String,
    #[serde(rename = "outlineColor")]
    pub outline_color: String,
    #[serde(rename = "outlineAlpha")]
    pub outline_alpha: String,
    #[serde(rename = "backColor")]
    pub back_color: String,
    #[serde(rename = "backAlpha")]
    pub back_alpha: String,
    pub alignment: i32,
    #[serde(rename = "marginV")]
    pub margin_v: String,
    #[serde(rename = "marginL")]
    pub margin_l: String,
    #[serde(rename = "marginR")]
    pub margin_r: String,
    pub spacing: String,
    #[serde(rename = "lineSpacing")]
    pub line_spacing: String,
    #[serde(rename = "customStyle")]
    pub custom_style: String,
    #[serde(rename = "customFilterParam")]
    pub custom_filter_param: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleStyle {
    #[serde(rename = "fontName")]
    pub font_name: String,
    #[serde(rename = "fontSize")]
    pub font_size: i32,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub strikeout: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameServerSettings {
    #[serde(rename = "useAviSynth")]
    pub use_avi_synth: bool,
    #[serde(rename = "avsScript")]
    pub avs_script: String,
    #[serde(rename = "useVapourSynth")]
    pub use_vapour_synth: bool,
    #[serde(rename = "vpyScript")]
    pub vpy_script: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSettings {
    pub encoder: String,
    pub bitrate: String,
    #[serde(rename = "qualityParam")]
    pub quality_param: String,
    #[serde(rename = "qualityValue")]
    pub quality_value: String,
    #[serde(rename = "channelLayout")]
    pub channel_layout: String,
    #[serde(rename = "sampleRate")]
    pub sample_rate: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loudnorm: Option<LoudnormSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoudnormSettings {
    #[serde(rename = "targetLoudness")]
    pub target_loudness: String,
    #[serde(rename = "dynamicRange")]
    pub dynamic_range: String,
    #[serde(rename = "peakLevel")]
    pub peak_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSettings {
    pub encoder: String,
    pub quality: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomSettings {
    #[serde(rename = "videoFilter")]
    pub video_filter: String,
    #[serde(rename = "audioFilter")]
    pub audio_filter: String,
    #[serde(rename = "filterComplex")]
    pub filter_complex: String,
    #[serde(rename = "videoParams")]
    pub video_params: String,
    #[serde(rename = "audioParams")]
    pub audio_params: String,
    #[serde(rename = "startParams")]
    pub start_params: String,
    #[serde(rename = "beforeOutputParams")]
    pub before_output_params: String,
    #[serde(rename = "afterOutputParams")]
    pub after_output_params: String,
    #[serde(rename = "endParams")]
    pub end_params: String,
    #[serde(rename = "fullCustom")]
    pub full_custom: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrimSettings {
    pub method: i32,
    #[serde(rename = "inPoint")]
    pub in_point: String,
    #[serde(rename = "outPoint")]
    pub out_point: String,
    #[serde(rename = "seekBackward")]
    pub seek_backward: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamControlSettings {
    #[serde(rename = "videoStreams")]
    pub video_streams: Vec<String>,
    #[serde(rename = "keepOtherVideo")]
    pub keep_other_video: bool,
    #[serde(rename = "audioStreams")]
    pub audio_streams: Vec<String>,
    #[serde(rename = "keepOtherAudio")]
    pub keep_other_audio: bool,
    #[serde(rename = "subtitleStreams")]
    pub subtitle_streams: Vec<String>,
    #[serde(rename = "subtitleOperation")]
    pub subtitle_operation: i32,
    #[serde(rename = "keepOtherSubtitle")]
    pub keep_other_subtitle: bool,
    #[serde(rename = "autoMuxSRT")]
    pub auto_mux_srt: bool,
    #[serde(rename = "autoMuxASS")]
    pub auto_mux_ass: bool,
    #[serde(rename = "autoMuxSSA")]
    pub auto_mux_ssa: bool,
    #[serde(rename = "convertSubtitleToMovText")]
    pub convert_subtitle_to_mov_text: bool,
    #[serde(rename = "metadataOption")]
    pub metadata_option: i32,
    #[serde(rename = "chapterOption")]
    pub chapter_option: i32,
    #[serde(rename = "attachmentOption")]
    pub attachment_option: i32,
}

fn get_preset_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let preset_dir = app_dir.join("presets");

    if !preset_dir.exists() {
        fs::create_dir_all(&preset_dir)
            .map_err(|e| format!("Failed to create preset directory: {}", e))?;
    }

    Ok(preset_dir)
}

#[tauri::command]
pub fn load_presets(app: AppHandle) -> Result<Vec<PresetData>, String> {
    let preset_dir = get_preset_dir(&app)?;
    let mut presets = Vec::new();

    if let Ok(entries) = fs::read_dir(&preset_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(preset) = serde_json::from_str::<PresetData>(&content) {
                            presets.push(preset);
                        }
                    }
                }
            }
        }
    }

    Ok(presets)
}

#[tauri::command]
pub fn save_preset(app: AppHandle, preset: PresetData) -> Result<PresetData, String> {
    let preset_dir = get_preset_dir(&app)?;

    let preset_id = if preset.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        preset.id.clone()
    };

    let now = chrono::Utc::now().to_rfc3339();

    let mut preset = preset;
    preset.id = preset_id.clone();

    if preset.created_at.is_empty() {
        preset.created_at = now.clone();
    }
    preset.updated_at = now;

    let file_path = preset_dir.join(format!("{}.json", preset_id));

    let content = serde_json::to_string_pretty(&preset)
        .map_err(|e| format!("Failed to serialize preset: {}", e))?;

    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write preset file: {}", e))?;

    Ok(preset)
}

#[tauri::command]
pub fn delete_preset(app: AppHandle, preset_id: String) -> Result<(), String> {
    let preset_dir = get_preset_dir(&app)?;
    let file_path = preset_dir.join(format!("{}.json", preset_id));

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete preset file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn export_preset(app: AppHandle, preset_id: String, file_path: String) -> Result<(), String> {
    let preset_dir = get_preset_dir(&app)?;
    let source_path = preset_dir.join(format!("{}.json", preset_id));

    if !source_path.exists() {
        return Err("Preset not found".to_string());
    }

    let content = fs::read_to_string(&source_path)
        .map_err(|e| format!("Failed to read preset: {}", e))?;

    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to export preset: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn import_preset(app: AppHandle, file_path: String) -> Result<PresetData, String> {
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read preset file: {}", e))?;

    let mut preset: PresetData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse preset: {}", e))?;

    preset.id = String::new();

    save_preset(app, preset)
}
