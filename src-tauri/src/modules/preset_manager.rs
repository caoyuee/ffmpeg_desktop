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
    pub video: VideoSettings,
    pub audio: AudioSettings,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom: Option<CustomSettings>,
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
pub struct VideoSettings {
    pub encoder: EncoderSettings,
    pub resolution: ResolutionSettings,
    #[serde(rename = "frameRate")]
    pub frame_rate: FrameRateSettings,
    #[serde(rename = "bitrateControl")]
    pub bitrate_control: BitrateControlSettings,
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
