use std::{
    io::Read,
    process::{Command, Stdio},
};

use tauri::{AppHandle, Window};

use crate::library::_tauri::emit_payload;
use crate::utility::_constant::FFmpegEvent;

/// 解析命令字符串为命令名和参数列表
/// # 参数
/// - `command_str` - 完整的命令字符串
/// # 返回
/// - `(String, Vec<String>)` - (命令名, 参数列表)
fn parse_command(command_str: &str) -> (String, Vec<String>) {
    let mut parts: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = command_str.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '"' => {
                // 切换引号状态，但不添加引号字符本身
                in_quotes = !in_quotes;
            }
            ' ' if !in_quotes => {
                // 只有在非引号内的空格才分割
                if !current.is_empty() {
                    parts.push(current.clone());
                    current.clear();
                }
            }
            _ => {
                // 添加所有其他字符（包括引号内的空格）
                current.push(c);
            }
        }
    }

    // 添加最后一个部分
    if !current.is_empty() {
        parts.push(current);
    }

    if parts.is_empty() {
        return (String::new(), Vec::new());
    }

    let cmd = parts[0].clone();
    let args = parts[1..].to_vec();

    (cmd, args)
}

/// 验证命令是否安全（基础验证，防止明显的命令注入）
/// # 参数
/// - `command_str` - 命令字符串
/// # 返回
/// - `bool` - 是否安全
fn is_safe_command(command_str: &str) -> bool {
    // 检查是否包含危险字符序列
    let dangerous_patterns = ["&&", "||", ";", "|", ">", "<", "`", "$("];

    for pattern in &dangerous_patterns {
        if command_str.contains(pattern) {
            return false;
        }
    }

    // 确保命令包含 ffmpeg 或 ffprobe 可执行文件
    let trimmed = command_str.trim().to_lowercase();
    trimmed.contains("ffmpeg") || trimmed.contains("ffprobe")
}

/// 处理执行command的log信息
/// # 参数
/// - `stderr` - 标准错误输出
/// - `closure` - 取得每行log信息后，要执行的功能
fn read_stderr<F: Fn(&char, &str)>(stderr: &mut std::process::ChildStderr, closure: F) {
    let mut buffer = [0u8; 4096];
    let mut partial = String::new();

    loop {
        match stderr.read(&mut buffer) {
            Err(_) => break,
            Ok(0) => break,
            Ok(size) => {
                let chunk = String::from_utf8_lossy(&buffer[..size]);
                partial.push_str(&chunk);
                process_partial_line(&mut partial, &closure);
            }
        }
    }
}

/// 处理log部分每一行的输出 => \r or \n
/// # 参数
/// - `partial` - 部分的标准输出
/// - `closure` - 取得每行log信息后，要执行的功能
fn process_partial_line<F: Fn(&char, &str)>(partial: &mut String, closure: F) {
    while let Some(index) = partial.find(|char| char == '\r' || char == '\n') {
        let delimit = partial.chars().nth(index).unwrap_or('\n');
        let line = partial[..index].to_string();

        closure(&delimit, &line);
        *partial = partial[index + 1..].to_string();
    }
}

/// 执行命令（通用执行器）
/// # 参数
/// - `_app` - Tauri 应用的 AppHandle
/// - `window` - Tauri 的 Window 对象，用来发送事件
/// - `command_str` - 完整的命令字符串（由前端生成）
/// # 返回
/// - `Result<u32, String>` - 成功返回进程ID，失败返回错误信息
/// # 说明
/// 这是一个纯命令执行器，不负责生成命令，只负责：
/// 1. 验证命令安全性
/// 2. 解析命令字符串
/// 3. 执行命令
/// 4. 发送执行事件（进度/完成/错误）
pub fn execute_ffmpeg(_app: AppHandle, window: Window, command_str: &str) -> Result<u32, String> {
    // 1. 安全验证
    if !is_safe_command(command_str) {
        return Err("不安全的命令，包含危险字符或不是有效的 FFmpeg/FFprobe 命令".to_string());
    }

    // 2. 解析命令
    let (cmd, args) = parse_command(command_str);

    if cmd.is_empty() {
        return Err("命令为空".to_string());
    }

    // 调试信息
    println!("解析后的命令: {}", cmd);
    println!("解析后的参数: {:?}", args);

    // 3. 创建命令
    let mut command = Command::new(&cmd);
    command.args(&args);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    // 4. 在新线程中执行命令
    let window_clone = window.clone();
    std::thread::spawn(move || {
        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(error) => {
                emit_payload(
                    &window_clone,
                    FFmpegEvent::Error.as_str(),
                    format!("启动命令失败: {:?}", error),
                );
                return;
            }
        };

        let pid = child.id();

        // 读取 stderr 输出（FFmpeg 的进度信息在 stderr）
        if let Some(mut stderr) = child.stderr.take() {
            read_stderr(&mut stderr, |delimiter, line| {
                let payload = serde_json::json!({
                    "delim": delimiter.to_string(),
                    "line": line
                });
                if !line.is_empty() {
                    emit_payload(&window_clone, FFmpegEvent::Progress.as_str(), payload);
                }
            });
        }

        // 等待进程结束
        match child.wait_with_output() {
            Ok(output) => {
                if output.status.success() {
                    emit_payload(
                        &window_clone,
                        FFmpegEvent::Finish.as_str(),
                        format!("转换完成 (进程ID: {})", pid),
                    );
                } else {
                    emit_payload(
                        &window_clone,
                        FFmpegEvent::Error.as_str(),
                        format!("命令执行失败 (退出码: {:?})", output.status.code()),
                    );
                }
            }
            Err(error) => {
                emit_payload(
                    &window_clone,
                    FFmpegEvent::Error.as_str(),
                    format!("等待进程失败: {:?}", error),
                );
            }
        }
    });

    Ok(0) // 立即返回，命令在后台执行
}
