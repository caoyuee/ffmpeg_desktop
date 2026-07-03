#[tauri::command]
pub fn extract_video_frame(video_path: String, timestamp: String) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};
    use std::path::PathBuf;
    use std::process::Command;

    const ALLOWED_VIDEO_EXTENSIONS: &[&str] = &[
        "mp4", "mkv", "avi", "mov", "webm", "wmv", "flv", "m4v", "mpg", "mpeg", "ts", "mts", "m2ts",
    ];

    fn validate_video_path(path: &str) -> Result<PathBuf, String> {
        let path = PathBuf::from(path);

        if !path.exists() {
            return Err("文件不存在".to_string());
        }

        let canonical_path = path
            .canonicalize()
            .map_err(|e| format!("无法解析文件路径: {}", e))?;

        let ext = canonical_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !ALLOWED_VIDEO_EXTENSIONS.contains(&ext.as_str()) {
            return Err(format!("不支持的视频文件格式: {}", ext));
        }

        Ok(canonical_path)
    }

    let validated_path = validate_video_path(&video_path)?;

    let temp_dir = std::env::temp_dir();
    let output_path = temp_dir.join("crop_preview_frame.png");

    let status = Command::new("ffmpeg")
        .args(&[
            "-ss",
            &timestamp,
            "-i",
            &validated_path.to_string_lossy().to_string(),
            "-frames:v",
            "1",
            "-q:v",
            "1",
            &output_path.to_string_lossy().to_string(),
            "-y",
        ])
        .status()
        .map_err(|e| format!("Failed to extract frame: {}", e))?;

    if !status.success() {
        return Err("Failed to extract video frame".to_string());
    }

    let image_data =
        std::fs::read(&output_path).map_err(|e| format!("Failed to read frame: {}", e))?;

    let base64_data = general_purpose::STANDARD.encode(&image_data);

    let _ = std::fs::remove_file(&output_path);

    Ok(base64_data)
}
