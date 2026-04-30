use std::process::Command;

/// 执行 ffprobe 命令
/// 前端传入文件路径，后端构建并执行 ffprobe 命令
#[tauri::command]
pub fn probe_media_info(
    path: String,
) -> Result<serde_json::Value, String> {
    let args = vec![
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        &path,
    ];

    let output = Command::new("ffprobe")
        .args(&args)
        .output()
        .map_err(|e| format!("执行 ffprobe 失败: {:?}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe 执行错误: {}", error_msg));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json_value: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("解析输出失败: {:?}", e))?;

    Ok(json_value)
}
