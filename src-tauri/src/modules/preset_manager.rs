//! R2.4：预设只存 JSON blob，Rust 不再结构化建模。
//!
//! 原先本文件用 30 个 struct 手工镜像 TS `types/preset.ts`，但 Rust 对预设内容
//! 没有任何业务消费，建模纯属双向同步负担，还会静默丢弃未知/未来字段。
//! 现在 schema、默认值、类型校验、版本迁移全部由前端
//! `config/presetSchema.ts::normalizePreset` 负责；本模块只做：
//! 目录定位、按 id 读写 JSON 文件、生成 id/时间戳、原样透传内容。

use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const ID_FIELD: &str = "id";
const CREATED_AT_FIELD: &str = "createdAt";
const UPDATED_AT_FIELD: &str = "updatedAt";

/// R1-7：自定义预设目录优先（前端设置 `presetDir`）；空/空白/None 回退 app data 的
/// `presets`。纯路径计算，不碰文件系统，便于单测。
fn resolve_preset_dir(app_dir: &std::path::Path, custom: Option<&str>) -> PathBuf {
    match custom.map(str::trim).filter(|s| !s.is_empty()) {
        Some(dir) => PathBuf::from(dir),
        None => app_dir.join("presets"),
    }
}

fn get_preset_dir(app: &AppHandle, custom: Option<&str>) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let preset_dir = resolve_preset_dir(&app_dir, custom);
    if !preset_dir.exists() {
        fs::create_dir_all(&preset_dir)
            .map_err(|e| format!("Failed to create preset directory: {}", e))?;
    }
    Ok(preset_dir)
}

/// 文件名由 id 拼出，必须限制字符集，防止 `../` 之类的路径穿越。
fn is_safe_preset_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn preset_path(app: &AppHandle, id: &str, custom: Option<&str>) -> Result<PathBuf, String> {
    if !is_safe_preset_id(id) {
        return Err("Invalid preset id".to_string());
    }
    Ok(get_preset_dir(app, custom)?.join(format!("{}.json", id)))
}

fn as_object(value: Value) -> Result<Map<String, Value>, String> {
    match value {
        Value::Object(map) => Ok(map),
        _ => Err("Preset must be a JSON object".to_string()),
    }
}

#[tauri::command]
pub fn load_presets(app: AppHandle, dir: Option<String>) -> Result<Vec<Value>, String> {
    let preset_dir = get_preset_dir(&app, dir.as_deref())?;
    let mut presets = Vec::new();

    if let Ok(entries) = fs::read_dir(&preset_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                continue;
            }
            if let Ok(content) = fs::read_to_string(&path) {
                // 保留完整 JSON（含未知/未来字段），是否可用由前端 normalizePreset 判定。
                if let Ok(value) = serde_json::from_str::<Value>(&content) {
                    if value.is_object() {
                        presets.push(value);
                    }
                }
            }
        }
    }
    Ok(presets)
}

#[tauri::command]
pub fn save_preset(app: AppHandle, preset: Value, dir: Option<String>) -> Result<Value, String> {
    let mut object = as_object(preset)?;

    // 空 id 或非法 id 都重新生成，避免覆盖已有预设或写出目录之外。
    let id = match object.get(ID_FIELD).and_then(Value::as_str) {
        Some(id) if is_safe_preset_id(id) => id.to_string(),
        _ => uuid::Uuid::new_v4().to_string(),
    };

    let now = chrono::Utc::now().to_rfc3339();
    let created_at = object
        .get(CREATED_AT_FIELD)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .unwrap_or_else(|| now.clone());

    object.insert(ID_FIELD.to_string(), Value::String(id.clone()));
    object.insert(CREATED_AT_FIELD.to_string(), Value::String(created_at));
    object.insert(UPDATED_AT_FIELD.to_string(), Value::String(now));

    let preset = Value::Object(object);
    let content = serde_json::to_string_pretty(&preset)
        .map_err(|e| format!("Failed to serialize preset: {}", e))?;
    fs::write(preset_path(&app, &id, dir.as_deref())?, content)
        .map_err(|e| format!("Failed to write preset file: {}", e))?;
    Ok(preset)
}

#[tauri::command]
pub fn delete_preset(app: AppHandle, preset_id: String, dir: Option<String>) -> Result<(), String> {
    let file_path = preset_path(&app, &preset_id, dir.as_deref())?;
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| format!("Failed to delete preset file: {}", e))?;
    }
    Ok(())
}

/// R3.1：分享文件的格式/版本/校验全部在前端 config/presetShare.ts。
/// 这里只把调用方给出的文本原样写盘，连 JSON 都不解析。
#[tauri::command]
pub fn export_preset(file_path: String, content: String) -> Result<(), String> {
    fs::write(&file_path, content).map_err(|e| format!("Failed to export preset: {}", e))?;
    Ok(())
}

/// R3.1：只读回原始文本，由前端 parsePresetShare 判定格式与版本。
#[tauri::command]
pub fn import_preset(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read preset file: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_preset_id_accepts_generated_ids() {
        assert!(is_safe_preset_id("550e8400-e29b-41d4-a716-446655440000"));
        assert!(is_safe_preset_id("preset_1"));
    }

    #[test]
    fn safe_preset_id_rejects_traversal_and_oversized_ids() {
        for bad in ["", "../evil", "a/b", "a\\b", "..", "has space"] {
            assert!(!is_safe_preset_id(bad), "should reject {bad}");
        }
        assert!(!is_safe_preset_id(&"x".repeat(129)));
    }

    #[test]
    fn as_object_only_accepts_json_objects() {
        assert!(as_object(serde_json::json!({ "name": "x" })).is_ok());
        assert!(as_object(serde_json::json!([1, 2])).is_err());
        assert!(as_object(serde_json::json!("text")).is_err());
    }

    #[test]
    fn r17_custom_preset_dir_takes_precedence() {
        let app_dir = std::path::Path::new("/app/data");
        assert_eq!(
            resolve_preset_dir(app_dir, Some("/my/presets".into())),
            PathBuf::from("/my/presets")
        );
        assert_eq!(
            resolve_preset_dir(app_dir, Some("  /my/presets  ".into())),
            PathBuf::from("/my/presets")
        );
    }

    #[test]
    fn r17_blank_or_missing_custom_falls_back_to_default() {
        let app_dir = std::path::Path::new("/app/data");
        let default = PathBuf::from("/app/data").join("presets");
        assert_eq!(resolve_preset_dir(app_dir, None), default);
        assert_eq!(resolve_preset_dir(app_dir, Some("".into())), default);
        assert_eq!(resolve_preset_dir(app_dir, Some("   ".into())), default);
    }

    #[test]
    fn share_export_and_import_are_plain_text_io() {
        let dir = std::env::temp_dir().join(format!("ffd-share-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).expect("create temp dir");
        let path = dir.join("sample.ffpreset.json");
        // 故意写成损坏的 JSON：证明 Rust 不解析分享格式，校验完全在前端。
        let content = "{\"format\":\"foreign\",broken";
        export_preset(path.to_string_lossy().into_owned(), content.to_string())
            .expect("write share file");
        assert_eq!(
            import_preset(path.to_string_lossy().into_owned()).expect("read share file"),
            content
        );
        fs::remove_dir_all(&dir).expect("cleanup temp dir");
    }
}
