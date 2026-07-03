use crate::library::_ffmpeg;

#[tauri::command]
pub fn check_ffmpeg_tools() -> serde_json::Value {
    serde_json::json!({
        "ffmpeg": {
            "installed": _ffmpeg::check_ffmpeg_installed(),
            "path": _ffmpeg::get_ffmpeg_path().unwrap_or_else(|| "".to_string()),
            "version": _ffmpeg::get_ffmpeg_version().unwrap_or_else(|| "".to_string()),
        },
        "ffprobe": {
            "installed": _ffmpeg::check_ffprobe_installed(),
            "path": _ffmpeg::get_ffprobe_path().unwrap_or_else(|| "".to_string()),
            "version": _ffmpeg::get_ffprobe_version().unwrap_or_else(|| "".to_string()),
        },
        "ffplay": {
            "installed": _ffmpeg::check_ffplay_installed(),
            "path": _ffmpeg::get_ffplay_path().unwrap_or_else(|| "".to_string()),
            "version": _ffmpeg::get_ffplay_version().unwrap_or_else(|| "".to_string()),
        },
    })
}

#[tauri::command]
pub async fn install_ffmpeg_command(app: tauri::AppHandle) -> Result<String, String> {
    _ffmpeg::install_ffmpeg(app).await
}

#[tauri::command]
pub fn get_system_info_app() -> serde_json::Value {
    _ffmpeg::get_system_info()
}

#[tauri::command]
pub fn check_ffmpeg_from_path(path: &str) -> serde_json::Value {
    use std::path::Path;
    use std::process::Command;

    let is_valid = if Path::new(path).exists() {
        // 如果是完整路径，尝试运行它
        match Command::new(path).arg("-version").output() {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        // 如果只是命令名，尝试直接运行
        match Command::new(path).arg("-version").output() {
            Ok(_) => true,
            Err(_) => false,
        }
    };

    serde_json::json!({
        "valid": is_valid,
        "path": path
    })
}

#[tauri::command]
pub fn test_ffmpeg(path: String) -> Result<String, String> {
    use std::process::Command;

    let ffmpeg_path = if path.is_empty() {
        "ffmpeg".to_string()
    } else {
        path
    };

    match Command::new(&ffmpeg_path).arg("-version").output() {
        Ok(output) => {
            if output.status.success() {
                let version_info = String::from_utf8_lossy(&output.stdout);
                let first_line = version_info.lines().next().unwrap_or("FFmpeg 可用");
                Ok(first_line.to_string())
            } else {
                Err("FFmpeg 执行失败".to_string())
            }
        }
        Err(e) => Err(format!("未找到 FFmpeg: {}", e)),
    }
}
