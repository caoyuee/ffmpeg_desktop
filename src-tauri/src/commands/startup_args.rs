use std::env;

/// R3.4：命令行语义全部由前端 `config/cliArgs.ts` 负责。
/// Rust 只把原始 argv 原样透传，不认识任何选项、预设或任务概念，
/// 与 R2.4「Rust 零预设 schema」/ R3.2「Rust 零历史知识」保持同一分层。
#[tauri::command]
pub fn parse_startup_args() -> Vec<String> {
    env::args().collect()
}

#[cfg(test)]
mod startup_args_tests {
    use super::*;

    #[test]
    fn returns_raw_argv_without_parsing() {
        let args = parse_startup_args();
        let expected: Vec<String> = env::args().collect();
        assert_eq!(args, expected);
        assert!(!args.is_empty());
    }

    #[test]
    fn has_no_embedded_business_keys() {
        // 保护分层：一旦有人把参数名搬回 Rust，这条会失败。
        // 键名用拼接构造，避免测试自身把字面量写进源码造成自引用。
        let source = include_str!("startup_args.rs");
        let preset_key = ["preset", "file"].join("_");
        let input_key = ["input", "file"].join("_");
        assert!(!source.contains(&preset_key));
        assert!(!source.contains(&input_key));
    }
}
