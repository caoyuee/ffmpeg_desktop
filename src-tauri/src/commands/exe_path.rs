//! RM1 后续：设置页「MCP 服务」展示需要真实可执行文件路径。
//!
//! Windows 下 `std::env::current_exe()` 可能返回 `\\?\` 前缀路径，直接拼进
//! mcp.json 会不可读；剥前缀是纯字符串处理，独立成函数便于单测。

use std::path::PathBuf;

/// 剥掉 Windows 扩展长度路径前缀：`\\?\C:\...` → `C:\...`，
/// `\\?\UNC\server\share` → `\\server\share`；其他平台原样返回。
pub fn sanitize_executable_path(path: String) -> String {
    if let Some(rest) = path.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", rest)
    } else if let Some(rest) = path.strip_prefix(r"\\?\") {
        rest.to_string()
    } else {
        path
    }
}

#[tauri::command]
pub fn get_executable_path() -> Result<String, String> {
    std::env::current_exe()
        .map_err(|e| format!("Failed to resolve current executable: {}", e))
        .map(|path: PathBuf| sanitize_executable_path(path.display().to_string()))
}

#[cfg(test)]
mod exe_path_tests {
    use super::*;

    #[test]
    fn strips_extended_length_prefix() {
        assert_eq!(
            sanitize_executable_path(r"\\?\C:\Apps\FFmpeg_Desktop.exe".to_string()),
            r"C:\Apps\FFmpeg_Desktop.exe"
        );
    }

    #[test]
    fn strips_unc_prefix_back_to_unc_share() {
        assert_eq!(
            sanitize_executable_path(r"\\?\UNC\server\share\FFmpeg_Desktop.exe".to_string()),
            r"\\server\share\FFmpeg_Desktop.exe"
        );
    }

    #[test]
    fn keeps_plain_unix_and_windows_paths() {
        assert_eq!(
            sanitize_executable_path("/usr/bin/FFmpeg_Desktop".to_string()),
            "/usr/bin/FFmpeg_Desktop"
        );
        assert_eq!(
            sanitize_executable_path(r"C:\Apps\FFmpeg_Desktop.exe".to_string()),
            r"C:\Apps\FFmpeg_Desktop.exe"
        );
    }
}
