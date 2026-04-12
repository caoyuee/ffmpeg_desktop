use std::process::Command;
use serde_json;

/// 验证命令字符串
/// 确保命令不包含危险操作
pub fn validate_command_string(command: &str) -> Result<(), String> {
    // 基本验证：确保命令不为空
    if command.trim().is_empty() {
        return Err("命令不能为空".to_string());
    }

    // 安全检查：禁止某些危险操作
    let dangerous_patterns = [
        "rm ", "del ", "delete ", "format ",
        "&&", "||", ";",
        " | ",  // 管道符（前后有空格）
        ">>", " > ", " < ",
    ];

    let cmd_lower = command.to_lowercase();
    for pattern in &dangerous_patterns {
        if cmd_lower.contains(pattern) {
            return Err(format!("命令包含不安全的操作符: {}", pattern));
        }
    }

    Ok(())
}

/// 解析命令字符串为程序路径和参数列表
/// 正确处理引号内的空格
fn parse_command(command: &str) -> Result<(String, Vec<String>), String> {
    let mut parts = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = command.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            '"' => {
                in_quotes = !in_quotes;
                // 引号内的内容保留，但不包括引号本身
            }
            ' ' if !in_quotes => {
                if !current.is_empty() {
                    parts.push(current.clone());
                    current.clear();
                }
            }
            _ => {
                current.push(ch);
            }
        }
    }

    if !current.is_empty() {
        parts.push(current);
    }

    if parts.is_empty() {
        return Err("无效的命令格式".to_string());
    }

    let program = parts[0].clone();
    let args = parts[1..].to_vec();

    Ok((program, args))
}

/// 执行 ffprobe 命令
/// 前端传入完整的命令行字符串，后端验证并执行
#[tauri::command]
pub fn probe_media_info(
    command: String,
) -> Result<serde_json::Value, String> {
    // 验证命令字符串
    validate_command_string(&command)?;

    // 解析命令字符串
    let (program, args) = parse_command(&command)?;

    // 执行命令
    let output = Command::new(&program)
        .args(&args)
        .output()
        .map_err(|e| format!("执行命令失败: {:?}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("命令执行错误: {}", error_msg));
    }

    // 解析 JSON 输出
    let json_str = String::from_utf8_lossy(&output.stdout);
    let json_value: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("解析输出失败: {:?}", e))?;

    Ok(json_value)
}
