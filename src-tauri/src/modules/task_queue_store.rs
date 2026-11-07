//! R2.5：任务队列快照只做 JSON blob 原子透传，Rust 不重建 Task 结构体。
//!
//! 与 R2.4 的预设一致：schema、默认值、状态迁移全部属于前端
//! `config/taskQueueSchema.ts`。本模块只负责：
//! 定位 app data dir 下的 `tasks.json`、校验 blob 是合法 JSON 对象且不过大、
//! 用「临时文件 + rename」原子替换，避免写一半崩溃留下损坏文件。

use serde_json::Value;
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const QUEUE_FILE: &str = "tasks.json";
/// 队列只存元数据（不含日志），512 KiB 足够；超限通常说明日志被误写入。
const MAX_SNAPSHOT_BYTES: usize = 512 * 1024;

fn queue_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    }
    Ok(app_dir.join(QUEUE_FILE))
}

fn temp_path(path: &PathBuf) -> PathBuf {
    let mut name = path.clone().into_os_string();
    name.push(".tmp");
    PathBuf::from(name)
}

/// 边界校验而非业务建模：只要求是体积受限的 JSON 对象，字段含义交给前端。
fn validate_snapshot(snapshot: &str) -> Result<(), String> {
    if snapshot.is_empty() {
        return Err("Task queue snapshot is empty".to_string());
    }
    if snapshot.len() > MAX_SNAPSHOT_BYTES {
        return Err(format!(
            "Task queue snapshot exceeds {} bytes",
            MAX_SNAPSHOT_BYTES
        ));
    }
    let value: Value = serde_json::from_str(snapshot)
        .map_err(|e| format!("Invalid task queue snapshot: {}", e))?;
    if !value.is_object() {
        return Err("Task queue snapshot must be a JSON object".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn load_task_queue(app: AppHandle) -> Result<String, String> {
    let path = queue_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("Failed to read {}: {}", path.display(), e)),
    }
}

#[tauri::command]
pub fn save_task_queue(app: AppHandle, snapshot: String) -> Result<(), String> {
    validate_snapshot(&snapshot)?;
    let path = queue_path(&app)?;
    let tmp_path = temp_path(&path);
    fs::write(&tmp_path, snapshot.as_bytes())
        .map_err(|e| format!("Failed to write temp queue file: {}", e))?;
    match fs::rename(&tmp_path, &path) {
        Ok(()) => Ok(()),
        Err(e) => {
            let _ = fs::remove_file(&tmp_path);
            Err(format!("Failed to replace queue file: {}", e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_accepts_object_snapshots() {
        assert!(validate_snapshot(r#"{"schemaVersion":1,"tasks":[]}"#).is_ok());
    }

    #[test]
    fn validate_rejects_empty_broken_array_and_oversized() {
        assert!(validate_snapshot("").is_err());
        assert!(validate_snapshot("{broken").is_err());
        assert!(validate_snapshot("[1,2]").is_err());
        assert!(validate_snapshot(r#""text""#).is_err());
        let huge = format!(r#"{{"tasks":"{}"}}"#, "x".repeat(MAX_SNAPSHOT_BYTES));
        assert!(validate_snapshot(&huge).is_err());
    }

    #[test]
    fn temp_path_stays_beside_the_queue_file() {
        let path = PathBuf::from("/tmp/app-data/tasks.json");
        assert_eq!(
            temp_path(&path),
            PathBuf::from("/tmp/app-data/tasks.json.tmp")
        );
    }
}
