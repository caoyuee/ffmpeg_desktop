use tauri::{AppHandle, Manager};

use crate::library::_file::read_file;

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))
}

#[tauri::command]
pub fn preserve_file_times(
    source: String,
    dest: String,
    preserve_creation: bool,
    preserve_modification: bool,
    preserve_access: bool,
) -> Result<(), String> {
    use std::fs;
    let src_meta = fs::metadata(&source).map_err(|e| format!("读取源文件失败: {}", e))?;

    if preserve_modification {
        let modified = filetime::FileTime::from_last_modification_time(&src_meta);
        filetime::set_file_mtime(&dest, modified)
            .map_err(|e| format!("设置修改时间失败: {}", e))?;
    }

    if preserve_access {
        let accessed = filetime::FileTime::from_last_access_time(&src_meta);
        filetime::set_file_atime(&dest, accessed)
            .map_err(|e| format!("设置访问时间失败: {}", e))?;
    }

    if preserve_creation {
        let _ = filetime::FileTime::from_creation_time(&src_meta);
    }

    Ok(())
}

/// 讀取JSON文件資料夾檔名列表
/// ## 參數
/// - `app`: Tauri 應用的 AppHandle
/// - `filename`: 文件名稱
/// ## 返回
/// - `String`: 成功時返回記錄的 JSON 字符串，失敗
#[tauri::command]
pub fn read_json_file(app: AppHandle, filename: &str) -> Result<String, String> {
    read_file(app, "config", filename)
}

#[tauri::command]
pub fn write_concat_file(app: AppHandle, content: String) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let concat_file_path = app_data_dir.join("ffmpeg_concat_demuxer.txt");

    let mut file = File::create(&concat_file_path)
        .map_err(|e| format!("Failed to create concat file: {}", e))?;

    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write concat file: {}", e))?;

    Ok(concat_file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_video_file(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};

    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(general_purpose::STANDARD.encode(&data))
}

/// R1-9：递归枚举目录中的视频文件，供"添加文件夹"使用。
/// 只跟随真实目录、跳过符号链接，避免目录环导致无限递归；深度上限作为第二道保护。
const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "flv", "webm", "wmv", "m4v", "mpg", "mpeg", "ts", "m2ts", "mts",
    "vob", "3gp", "ogv", "ogm", "rmvb", "asf", "divx",
];

fn is_video_file(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| VIDEO_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn collect_media_files(
    dir: &std::path::Path,
    out: &mut Vec<std::path::PathBuf>,
    depth: usize,
) -> Result<(), String> {
    const MAX_DEPTH: usize = 32;
    if depth > MAX_DEPTH {
        return Ok(());
    }

    let entries =
        std::fs::read_dir(dir).map_err(|e| format!("Failed to read {}: {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {}", e))?;
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to inspect {}: {}", entry.path().display(), e))?;
        let path = entry.path();

        if file_type.is_dir() {
            collect_media_files(&path, out, depth + 1)?;
        } else if file_type.is_file() && is_video_file(&path) {
            out.push(path);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_media_files(dir: String) -> Result<Vec<String>, String> {
    let root = std::path::PathBuf::from(&dir);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let mut files = Vec::new();
    collect_media_files(&root, &mut files, 0)?;
    files.sort();

    Ok(files
        .into_iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect())
}

/// R3.2：通用文件体积查询。只返回与入参等长的字节数序列，
/// 不认识任务/历史 schema，也不持久化结果；文件不存在或无权限一律返回 None。
const MAX_FILE_SIZE_PATHS: usize = 400;

fn metadata_sizes(paths: &[String]) -> Vec<Option<u64>> {
    paths
        .iter()
        .take(MAX_FILE_SIZE_PATHS)
        .map(|path| std::fs::metadata(path).ok().map(|meta| meta.len()))
        .collect()
}

#[tauri::command]
pub fn get_file_sizes(paths: Vec<String>) -> Vec<Option<u64>> {
    metadata_sizes(&paths)
}

#[cfg(test)]
mod media_file_tests {
    use super::*;

    #[test]
    fn accepts_video_extensions_case_insensitively() {
        assert!(is_video_file(std::path::Path::new("clip.MP4")));
        assert!(is_video_file(std::path::Path::new("clip.mkv")));
        assert!(is_video_file(std::path::Path::new("nested/clip.MTS")));
        assert!(!is_video_file(std::path::Path::new("notes.txt")));
        assert!(!is_video_file(std::path::Path::new("README")));
    }

    #[test]
    fn r32_missing_files_are_none() {
        let sizes = metadata_sizes(&["/definitely/not/here.mp4".to_string()]);
        assert_eq!(sizes, vec![None]);
    }

    #[test]
    fn r32_real_length_is_reported_and_batch_is_capped() {
        let path = std::env::temp_dir().join(format!("ffd-r32-{}.bin", std::process::id()));
        std::fs::write(&path, b"12345").expect("write temp file");
        let p = path.to_string_lossy().to_string();
        assert_eq!(
            metadata_sizes(&[p.clone(), p.clone()]),
            vec![Some(5), Some(5)]
        );
        let _ = std::fs::remove_file(&path);

        let many = vec!["/missing".to_string(); MAX_FILE_SIZE_PATHS + 10];
        assert_eq!(metadata_sizes(&many).len(), MAX_FILE_SIZE_PATHS);
    }
}
