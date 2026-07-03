use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::{AppHandle, Window};

use crate::library::_process::kill_process;
use crate::utility::_executor::execute_ffmpeg;

static GLOBAL_PID: Lazy<Mutex<Option<u32>>> = Lazy::new(|| Mutex::new(None));

/// 新的命令执行接口：接收完整的 FFmpeg 命令字符串并执行
#[tauri::command]
pub fn execute_ffmpeg_command(
    app: AppHandle,
    window: Window,
    command: String,
) -> Result<String, String> {
    match execute_ffmpeg(app, window, &command) {
        Ok(_) => Ok("命令已开始执行".to_string()),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn stop_convert() {
    let mut pid_opt = GLOBAL_PID.lock().unwrap();

    // pid_opt.take() 的功能是「取出 Option 內的值，並把自己設為 None」。
    if let Some(pid) = pid_opt.take() {
        kill_process(pid);
    }
}
