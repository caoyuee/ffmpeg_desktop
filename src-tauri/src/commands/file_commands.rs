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
