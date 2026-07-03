use serde_json::json;
use std::env;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

/// 检测指定工具是否已安装（ffmpeg/ffprobe/ffplay）
fn check_tool_installed(tool_name: &str) -> bool {
    match Command::new(tool_name).arg("-version").output() {
        Ok(_) => true,
        Err(_) => {
            // 尝试在Windows常见安装路径查找
            if cfg!(windows) {
                let common_paths = [
                    format!(r"C:\Program Files\ffmpeg\bin\{}.exe", tool_name),
                    format!(r"C:\Program Files (x86)\ffmpeg\bin\{}.exe", tool_name),
                    format!(r"C:\ffmpeg\bin\{}.exe", tool_name),
                ];

                for path in &common_paths {
                    if Path::new(path).exists() {
                        return true;
                    }
                }
            }
            false
        }
    }
}

/// 检测系统中是否已安装FFmpeg
pub fn check_ffmpeg_installed() -> bool {
    check_tool_installed("ffmpeg")
}

/// 检测系统中是否已安装FFprobe
pub fn check_ffprobe_installed() -> bool {
    check_tool_installed("ffprobe")
}

/// 检测系统中是否已安装FFplay
pub fn check_ffplay_installed() -> bool {
    check_tool_installed("ffplay")
}

/// 获取指定工具的路径（ffmpeg/ffprobe/ffplay）
fn get_tool_path(tool_name: &str) -> Option<String> {
    // 首先尝试直接运行命令
    if Command::new(tool_name).arg("-version").output().is_ok() {
        return Some(tool_name.to_string());
    }

    // 如果直接运行失败，在Windows上查找常见安装路径
    if cfg!(windows) {
        let common_paths = [
            format!(r"C:\Program Files\ffmpeg\bin\{}.exe", tool_name),
            format!(r"C:\Program Files (x86)\ffmpeg\bin\{}.exe", tool_name),
            format!(r"C:\ffmpeg\bin\{}.exe", tool_name),
        ];

        for path in &common_paths {
            if Path::new(&path).exists() {
                return Some(path.to_string());
            }
        }
    }

    None
}

/// 获取系统中FFmpeg的路径
pub fn get_ffmpeg_path() -> Option<String> {
    get_tool_path("ffmpeg")
}

/// 获取系统中FFprobe的路径
pub fn get_ffprobe_path() -> Option<String> {
    get_tool_path("ffprobe")
}

/// 获取系统中FFplay的路径
pub fn get_ffplay_path() -> Option<String> {
    get_tool_path("ffplay")
}

/// 获取工具版本信息（通用函数）
fn get_tool_version(tool_name: &str) -> Option<String> {
    match Command::new(tool_name).arg("-version").output() {
        Ok(output) => {
            let version_info = String::from_utf8_lossy(&output.stdout);
            // 提取版本号
            if let Some(line) = version_info.lines().next() {
                return Some(line.to_string());
            }
            None
        }
        Err(_) => {
            // 如果直接运行失败，尝试从文件路径获取
            if let Some(path) = get_tool_path(tool_name) {
                match Command::new(&path).arg("-version").output() {
                    Ok(output) => {
                        let version_info = String::from_utf8_lossy(&output.stdout);
                        if let Some(line) = version_info.lines().next() {
                            return Some(line.to_string());
                        }
                    }
                    Err(_) => {}
                }
            }
            None
        }
    }
}

/// 获取FFmpeg版本信息
pub fn get_ffmpeg_version() -> Option<String> {
    get_tool_version("ffmpeg")
}

/// 获取FFprobe版本信息
pub fn get_ffprobe_version() -> Option<String> {
    get_tool_version("ffprobe")
}

/// 获取FFplay版本信息
pub fn get_ffplay_version() -> Option<String> {
    get_tool_version("ffplay")
}

/// 下载并安装FFmpeg（基础框架，具体实现根据平台而定）
#[tauri::command]
pub async fn install_ffmpeg(_app: AppHandle) -> Result<String, String> {
    // 这里需要根据操作系统下载对应的FFmpeg版本
    if cfg!(target_os = "windows") {
        // Windows平台安装逻辑
        install_ffmpeg_windows()
    } else if cfg!(target_os = "macos") {
        // macOS平台安装逻辑
        install_ffmpeg_macos()
    } else if cfg!(target_os = "linux") {
        // Linux平台安装逻辑
        install_ffmpeg_linux()
    } else {
        Err("Unsupported platform".to_string())
    }
}

// Windows平台安装逻辑
fn install_ffmpeg_windows() -> Result<String, String> {
    // 这里应该实现实际的下载和安装逻辑
    // 例如使用PowerShell命令下载FFmpeg
    // 由于实际实现较复杂，这里仅提供框架
    Err("Windows FFmpeg installation not fully implemented yet".to_string())
}

// macOS平台安装逻辑
fn install_ffmpeg_macos() -> Result<String, String> {
    // 尝试使用Homebrew安装
    match Command::new("brew").arg("install").arg("ffmpeg").output() {
        Ok(output) => {
            if output.status.success() {
                Ok("FFmpeg installed successfully via Homebrew".to_string())
            } else {
                Err(format!(
                    "Failed to install FFmpeg via Homebrew: {}",
                    String::from_utf8_lossy(&output.stderr)
                ))
            }
        }
        Err(e) => Err(format!("Failed to run Homebrew: {}", e)),
    }
}

// Linux平台安装逻辑
fn install_ffmpeg_linux() -> Result<String, String> {
    // 尝试使用包管理器安装
    let commands = [
        ("apt", &["apt", "install", "-y", "ffmpeg"][..]),
        ("yum", &["yum", "install", "-y", "ffmpeg"][..]),
        ("dnf", &["dnf", "install", "-y", "ffmpeg"][..]),
        ("pacman", &["pacman", "-S", "--noconfirm", "ffmpeg"][..]),
    ];

    for (name, cmd) in &commands {
        if Command::new(name).arg("--version").output().is_ok() {
            let output = Command::new(cmd[0]).args(&cmd[1..]).output();

            match output {
                Ok(output) => {
                    if output.status.success() {
                        return Ok(format!("FFmpeg installed successfully via {}", name));
                    }
                }
                Err(e) => {
                    return Err(format!("Failed to run {} command: {}", name, e));
                }
            }
        }
    }

    Err("No supported package manager found for FFmpeg installation".to_string())
}

/// 获取当前系统信息（包含 ffmpeg/ffprobe/ffplay）
#[tauri::command]
pub fn get_system_info() -> serde_json::Value {
    json!({
        "platform": env::consts::OS,
        "arch": env::consts::ARCH,
        "ffmpeg_installed": check_ffmpeg_installed(),
        "ffmpeg_path": get_ffmpeg_path(),
        "ffmpeg_version": get_ffmpeg_version(),
        "ffprobe_installed": check_ffprobe_installed(),
        "ffprobe_path": get_ffprobe_path(),
        "ffprobe_version": get_ffprobe_version(),
        "ffplay_installed": check_ffplay_installed(),
        "ffplay_path": get_ffplay_path(),
        "ffplay_version": get_ffplay_version(),
    })
}
