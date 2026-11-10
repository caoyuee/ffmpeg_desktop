//! RM1：MCP Server 模块——`FFmpeg_Desktop mcp` 以 stdio MCP Server 运行，不进 GUI。
//!
//! 分层说明（对铁律「Rust 只透传 argv」的显式例外）：
//! `mcp` 是**运行模式分流**（GUI 进程 vs MCP 进程），不是参数语义解析；
//! 除这一个字面量外，Rust 不认识任何业务选项。工具层 `tools.rs` 只做
//! 宽松透传，schema 语义仍归前端；协议层用官方 `rmcp` SDK。
//!
//! 传输固定 stdio：由 MCP 客户端（Claude Desktop / Cursor 等）本机拉起进程，
//! 无网络端口暴露。

pub mod app_data;
pub mod server;
pub mod tools;

use serde_json::json;

/// 分流判断：argv 中第一个非程序名参数是否为 `mcp`（大小写不敏感）。
/// 纯函数，便于单测；除该字面量外不做任何参数解读。
pub fn should_run<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter()
        .nth(1)
        .map(|arg| arg.as_ref().eq_ignore_ascii_case("mcp"))
        .unwrap_or(false)
}

/// 启动 stdio MCP Server（阻塞直至客户端断开）。
pub fn run_stdio() {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime for MCP mode");

    if let Err(error) = runtime.block_on(server::serve_stdio()) {
        // stdout 是 MCP 协议通道，诊断信息只能走 stderr。
        eprintln!("[mcp] server error: {}", error);
        std::process::exit(1);
    }
}

/// 汇总 MCP 模式运行的上下文信息（工具描述与诊断共用）。
pub fn mode_summary() -> serde_json::Value {
    let app_dir = app_data::default_app_data_dir(app_data::APP_IDENTIFIER)
        .map(|dir| dir.display().to_string())
        .unwrap_or_default();
    json!({
        "identifier": app_data::APP_IDENTIFIER,
        "appDataDir": app_dir,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_run_only_for_the_mcp_literal_as_first_argument() {
        assert!(should_run(["FFmpeg_Desktop", "mcp"]));
        assert!(should_run(["FFmpeg_Desktop", "MCP"]));
        assert!(should_run(["FFmpeg_Desktop", "Mcp"]));

        assert!(!should_run(["FFmpeg_Desktop"]));
        assert!(!should_run(["FFmpeg_Desktop", "--preset-file", "x"]));
        assert!(!should_run(["FFmpeg_Desktop", "serve"]));
        assert!(!should_run(std::iter::empty::<String>()));
    }

    #[test]
    fn mode_summary_carries_identifier() {
        let summary = mode_summary();
        assert_eq!(summary["identifier"], app_data::APP_IDENTIFIER);
    }
}
