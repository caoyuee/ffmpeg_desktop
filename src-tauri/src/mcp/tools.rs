//! RM1：MCP 工具层纯函数——宽松透传，不做业务建模。
//!
//! 与 R2.4「Rust 零预设 schema」/ R2.5「Rust 零任务结构」同一分层：
//! 这里只做目录扫描、JSON 解析与字段宽松读取（缺失给 null，不做类型校验、
//! 不丢字段、不做版本迁移）。语义（status 枚举含义等）写进 MCP 工具的
//! description，由调用方 LLM 解读，不进 Rust 代码。

use serde_json::{json, Value};
use std::fs;
use std::path::Path;

/// 扫描预设目录，返回每个预设的宽松摘要。
/// 字段缺失时为 null；未在摘要中的字段不输出（完整内容仍以预设文件为准）。
pub fn summarize_presets(preset_dir: &Path) -> Result<Vec<Value>, String> {
    let mut presets = Vec::new();

    let entries =
        fs::read_dir(preset_dir).map_err(|e| format!("Failed to read preset directory: {}", e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        let content = match fs::read_to_string(&path) {
            Ok(content) => content,
            Err(_) => continue,
        };
        let Ok(value) = serde_json::from_str::<Value>(&content) else {
            continue;
        };
        if !value.is_object() {
            continue;
        }
        presets.push(json!({
            "id": value.get("id").and_then(Value::as_str),
            "name": value.get("name").and_then(Value::as_str),
            "category": value.get("category").and_then(Value::as_str),
            "updatedAt": value.get("updatedAt").and_then(Value::as_str),
        }));
    }
    fn name_key(value: &Value) -> &str {
        value.get("name").and_then(Value::as_str).unwrap_or("")
    }
    presets.sort_by(|a, b| name_key(a).cmp(name_key(b)));
    Ok(presets)
}

/// 解析任务队列快照，返回宽松状态摘要。
/// 只按 status 数字分组计数 + 透传每条任务的展示字段；status 语义不在此定义。
pub fn summarize_queue(snapshot: &str) -> Result<Value, String> {
    if snapshot.trim().is_empty() {
        return Ok(json!({ "empty": true }));
    }
    let value: Value = serde_json::from_str(snapshot)
        .map_err(|e| format!("Invalid task queue snapshot: {}", e))?;
    let Some(tasks) = value.get("tasks").and_then(Value::as_array) else {
        return Err("Task queue snapshot has no tasks array".to_string());
    };

    let mut status_counts: std::collections::BTreeMap<i64, usize> = Default::default();
    let mut items = Vec::with_capacity(tasks.len());
    for task in tasks {
        if let Some(status) = task.get("status").and_then(Value::as_i64) {
            *status_counts.entry(status).or_default() += 1;
        }
        items.push(json!({
            "id": task.get("id").and_then(Value::as_str),
            "inputFile": task.get("inputFile").and_then(Value::as_str),
            "outputFile": task.get("outputFile").and_then(Value::as_str),
            "status": task.get("status").and_then(Value::as_i64),
            "createdAt": task.get("createdAt").and_then(Value::as_str),
        }));
    }

    let counts: Value = status_counts
        .iter()
        .map(|(status, count)| (status.to_string(), json!(count)))
        .collect::<serde_json::Map<String, Value>>()
        .into();

    Ok(json!({
        "schemaVersion": value.get("schemaVersion").and_then(Value::as_i64),
        "total": items.len(),
        "statusCounts": counts,
        "tasks": items,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn write_preset(dir: &TempDir, id: &str, body: &str) {
        fs::write(dir.path().join(format!("{}.json", id)), body).unwrap();
    }

    #[test]
    fn summarize_presets_returns_loose_fields_and_ignores_non_json() {
        let dir = TempDir::new().unwrap();
        write_preset(
            &dir,
            "p2",
            r#"{"id":"p2","name":"快速转码","category":"fast","updatedAt":"2026-11-10T00:00:00Z","unknownFuture":123}"#,
        );
        write_preset(&dir, "p1", r#"{"id":"p1","name":"A 预设"}"#);
        fs::write(dir.path().join("readme.txt"), "not a preset").unwrap();
        fs::write(dir.path().join("broken.json"), "{broken").unwrap();

        let presets = summarize_presets(dir.path()).unwrap();

        assert_eq!(presets.len(), 2, "非 json/坏 json 文件被跳过");
        // 按 name 排序：A 预设在前。
        assert_eq!(presets[0]["id"], "p1");
        assert_eq!(presets[0]["category"], Value::Null, "缺失字段宽松为 null");
        assert_eq!(presets[1]["name"], "快速转码");
        assert_eq!(presets[1]["category"], "fast");
        // 未知字段不进摘要，但不影响文件本身。
        assert!(presets[1].get("unknownFuture").is_none());
    }

    #[test]
    fn summarize_presets_reports_missing_directory() {
        let err = summarize_presets(Path::new("/nonexistent/presets")).unwrap_err();
        assert!(err.contains("preset directory"));
    }

    #[test]
    fn summarize_queue_empty_snapshot_is_empty_object() {
        assert_eq!(summarize_queue("").unwrap(), json!({ "empty": true }));
        assert_eq!(summarize_queue("   ").unwrap(), json!({ "empty": true }));
    }

    #[test]
    fn summarize_queue_counts_by_raw_status_number() {
        let snapshot = r#"{
            "schemaVersion": 2,
            "tasks": [
                {"id":"a","inputFile":"/a.mp4","outputFile":"/a_out.mkv","status":0,"createdAt":"t1"},
                {"id":"b","inputFile":"/b.mp4","outputFile":"/b_out.mkv","status":0,"createdAt":"t2"},
                {"id":"c","inputFile":"/c.mp4","outputFile":"/c_out.mkv","status":10,"createdAt":"t3"},
                {"id":"d","inputFile":"/d.mp4","outputFile":"/d_out.mkv","status":99,"createdAt":"t4"}
            ]
        }"#;

        let summary = summarize_queue(snapshot).unwrap();
        assert_eq!(summary["total"], 4);
        assert_eq!(summary["schemaVersion"], 2);
        assert_eq!(summary["statusCounts"]["0"], 2);
        assert_eq!(summary["statusCounts"]["10"], 1);
        assert_eq!(summary["statusCounts"]["99"], 1);
        assert_eq!(summary["tasks"][0]["id"], "a");
        assert_eq!(summary["tasks"][2]["status"], 10);
    }

    #[test]
    fn summarize_queue_loose_on_missing_fields_and_rejects_garbage() {
        let summary = summarize_queue(r#"{"tasks":[{"id":"x"}]}"#).unwrap();
        assert_eq!(summary["tasks"][0]["inputFile"], Value::Null);
        assert_eq!(summary["statusCounts"], json!({}), "无 status 的任务不计数");

        assert!(summarize_queue("{broken").is_err());
        assert!(summarize_queue(r#"{"noTasks":1}"#).is_err());
    }
}
