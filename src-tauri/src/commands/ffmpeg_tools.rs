use crate::library::_ffmpeg;
use std::process::Command;

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

#[tauri::command]
pub fn detect_hardware_acceleration(path: Option<String>) -> serde_json::Value {
    let ffmpeg_path = path
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| _ffmpeg::get_ffmpeg_path().unwrap_or_else(|| "ffmpeg".to_string()));

    let encoders = run_ffmpeg_list(&ffmpeg_path, "-encoders").unwrap_or_default();
    let hwaccels = run_ffmpeg_list(&ffmpeg_path, "-hwaccels").unwrap_or_default();
    let filters = run_ffmpeg_list(&ffmpeg_path, "-filters").unwrap_or_default();

    let encoder_names = parse_ffmpeg_encoders(&encoders);
    let hwaccel_names = parse_ffmpeg_hwaccels(&hwaccels);
    let filter_names = parse_ffmpeg_filters(&filters);

    serde_json::json!({
        "ffmpegPath": ffmpeg_path,
        "backends": detect_backends(&encoder_names, &hwaccel_names),
        "encoders": encoder_names,
        "hwaccels": hwaccel_names,
        "filters": filter_names,
    })
}

fn run_ffmpeg_list(ffmpeg_path: &str, arg: &str) -> Result<String, String> {
    let output = Command::new(ffmpeg_path)
        .args(["-hide_banner", arg])
        .output()
        .map_err(|e| format!("FFmpeg 执行失败: {}", e))?;

    let mut text = String::new();
    text.push_str(&String::from_utf8_lossy(&output.stdout));
    text.push_str(&String::from_utf8_lossy(&output.stderr));
    Ok(text)
}

fn parse_ffmpeg_encoders(output: &str) -> Vec<String> {
    parse_ffmpeg_capability_list(output, is_hardware_encoder)
}

fn parse_ffmpeg_filters(output: &str) -> Vec<String> {
    let mut values: Vec<String> = output
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("--") {
                return None;
            }

            let mut parts = trimmed.split_whitespace();
            let flags = parts.next()?;
            let name = parts.next()?;
            if flags.contains("->") || name.contains("->") {
                return None;
            }
            if flags.len() < 3 || !flags.chars().all(|ch| ch == '.' || ch.is_ascii_alphabetic()) {
                return None;
            }
            Some(name.to_string())
        })
        .collect();

    values.sort();
    values.dedup();
    values
}

fn parse_ffmpeg_capability_list(output: &str, include: impl Fn(&str) -> bool) -> Vec<String> {
    let mut values: Vec<String> = output
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("--") {
                return None;
            }

            let mut parts = trimmed.split_whitespace();
            let flags = parts.next()?;
            let name = parts.next()?;
            if !flags.chars().any(|ch| matches!(ch, 'V' | 'A' | 'S')) {
                return None;
            }
            if include(name) {
                Some(name.to_string())
            } else {
                None
            }
        })
        .collect();

    values.sort();
    values.dedup();
    values
}

fn parse_ffmpeg_hwaccels(output: &str) -> Vec<String> {
    let mut values: Vec<String> = output
        .lines()
        .map(str::trim)
        .filter(|line| {
            !line.is_empty()
                && !line.starts_with("Hardware acceleration methods")
                && !line.starts_with('-')
        })
        .map(ToString::to_string)
        .collect();

    values.sort();
    values.dedup();
    values
}

fn detect_backends(encoders: &[String], hwaccels: &[String]) -> Vec<String> {
    let mut backends = Vec::new();

    if has_encoder_suffix(encoders, "_nvenc") || contains_value(hwaccels, "cuda") {
        backends.push("nvenc".to_string());
    }
    if has_encoder_suffix(encoders, "_qsv") || contains_value(hwaccels, "qsv") {
        backends.push("qsv".to_string());
    }
    if has_encoder_suffix(encoders, "_amf") {
        backends.push("amf".to_string());
    }
    if has_encoder_suffix(encoders, "_vaapi") || contains_value(hwaccels, "vaapi") {
        backends.push("vaapi".to_string());
    }
    if has_encoder_suffix(encoders, "_videotoolbox") || contains_value(hwaccels, "videotoolbox") {
        backends.push("videotoolbox".to_string());
    }
    if has_encoder_suffix(encoders, "_vulkan") || contains_value(hwaccels, "vulkan") {
        backends.push("vulkan".to_string());
    }
    if has_encoder_suffix(encoders, "_d3d12va") || contains_value(hwaccels, "d3d12va") {
        backends.push("d3d12va".to_string());
    }

    backends
}

fn has_encoder_suffix(encoders: &[String], suffix: &str) -> bool {
    encoders.iter().any(|encoder| encoder.ends_with(suffix))
}

fn contains_value(values: &[String], needle: &str) -> bool {
    values.iter().any(|value| value == needle)
}

fn is_hardware_encoder(name: &str) -> bool {
    name.ends_with("_nvenc")
        || name.ends_with("_qsv")
        || name.ends_with("_amf")
        || name.ends_with("_vaapi")
        || name.ends_with("_videotoolbox")
        || name.ends_with("_vulkan")
        || name.ends_with("_d3d12va")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_hardware_encoders_from_ffmpeg_output() {
        let output = r#"
Encoders:
 V..... libx264              libx264 H.264
 V..... h264_nvenc           NVIDIA NVENC H.264 encoder
 V..... hevc_qsv             HEVC QSV encoder
 A..... aac                  AAC encoder
 V..... h264_vaapi           H.264 VAAPI encoder
"#;

        assert_eq!(
            parse_ffmpeg_encoders(output),
            vec!["h264_nvenc", "h264_vaapi", "hevc_qsv"]
        );
    }

    #[test]
    fn parse_hwaccels_from_ffmpeg_output() {
        let output = r#"
Hardware acceleration methods:
vdpau
cuda
vaapi
qsv
"#;

        assert_eq!(
            parse_ffmpeg_hwaccels(output),
            vec!["cuda", "qsv", "vaapi", "vdpau"]
        );
    }

    #[test]
    fn parse_filters_from_ffmpeg_output() {
        let output = r#"
Filters:
 ..C scale_cuda        V->V       GPU accelerated video resizer
 ... hwupload          V->V       Upload a normal frame to a hardware frame
 T.. anull             A->A       Pass the source unchanged
"#;

        assert_eq!(parse_ffmpeg_filters(output), vec!["anull", "hwupload", "scale_cuda"]);
    }

    #[test]
    fn detect_backends_from_encoders_and_hwaccels() {
        let encoders = vec![
            "h264_nvenc".to_string(),
            "hevc_qsv".to_string(),
            "h264_vaapi".to_string(),
        ];
        let hwaccels = vec!["cuda".to_string(), "vaapi".to_string()];

        assert_eq!(
            detect_backends(&encoders, &hwaccels),
            vec!["nvenc", "qsv", "vaapi"]
        );
    }
}
