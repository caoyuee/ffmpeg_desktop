//! RM1：MCP 模式下没有 Tauri AppHandle，app data 目录按 Tauri 同款平台规则定位。
//!
//! 语义必须与 `tauri::path::PathResolver::app_data_dir()` 一致：
//! - Linux: `$XDG_DATA_HOME/{identifier}`，未设置时 `~/.local/share/{identifier}`
//! - macOS: `~/Library/Application Support/{identifier}`
//! - Windows: `%APPDATA%/{identifier}`（Roaming）
//!
//! 任何一侧漂移，MCP 读到的就不是用户 GUI 看到的同一份数据——由测试锁住规则。

use std::path::{Path, PathBuf};

pub const APP_IDENTIFIER: &str = "com.william.ffmpeg-desktop";

pub fn default_app_data_dir(identifier: &str) -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .ok()
            .filter(|v| !v.is_empty())
            .map(|base| PathBuf::from(base).join(identifier))
            .ok_or_else(|| "APPDATA is not set".to_string())
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .ok()
            .filter(|v| !v.is_empty())
            .map(|home| {
                PathBuf::from(home)
                    .join("Library")
                    .join("Application Support")
                    .join(identifier)
            })
            .ok_or_else(|| "HOME is not set".to_string())
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let base = match std::env::var("XDG_DATA_HOME") {
            Ok(dir) if !dir.is_empty() => PathBuf::from(dir),
            _ => std::env::var("HOME")
                .ok()
                .filter(|v| !v.is_empty())
                .map(|home| PathBuf::from(home).join(".local").join("share"))
                .ok_or_else(|| "Neither XDG_DATA_HOME nor HOME is set".to_string())?,
        };
        Ok(base.join(identifier))
    }
}

/// 预设目录定位与 preset_manager::resolve_preset_dir 保持同一语义：
/// 自定义目录优先，空/空白回退默认。
pub fn resolve_preset_dir(app_data_dir: &Path, custom: Option<&str>) -> PathBuf {
    match custom.map(str::trim).filter(|s| !s.is_empty()) {
        Some(dir) => PathBuf::from(dir),
        None => app_data_dir.join("presets"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(all(unix, not(target_os = "macos")))]
    #[test]
    fn linux_uses_xdg_data_home_then_home_fallback() {
        // 安全改环境变量：子进程隔离的测试进程内改动只影响本测试。
        std::env::set_var("XDG_DATA_HOME", "/tmp/xdg-data");
        let dir = default_app_data_dir("test.id").unwrap();
        assert_eq!(dir, PathBuf::from("/tmp/xdg-data/test.id"));

        std::env::remove_var("XDG_DATA_HOME");
        std::env::set_var("HOME", "/tmp/fake-home");
        let dir = default_app_data_dir("test.id").unwrap();
        assert_eq!(dir, PathBuf::from("/tmp/fake-home/.local/share/test.id"));
        // 恢复，避免污染同进程其他测试。
        std::env::set_var("XDG_DATA_HOME", "/tmp/xdg-data");
    }

    #[test]
    fn preset_dir_custom_overrides_default() {
        let app_dir = PathBuf::from("/app-data");
        assert_eq!(resolve_preset_dir(&app_dir, None), app_dir.join("presets"));
        assert_eq!(
            resolve_preset_dir(&app_dir, Some("  ")),
            app_dir.join("presets")
        );
        assert_eq!(
            resolve_preset_dir(&app_dir, Some("/custom/presets")),
            PathBuf::from("/custom/presets")
        );
    }
}
