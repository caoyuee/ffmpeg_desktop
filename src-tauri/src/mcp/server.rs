//! RM1：rmcp 协议装配层——只做协议与工具注册，工具实现全部委托 `tools.rs` 纯函数。
//!
//! 两个只读工具：
//! - `list_presets`：宽松摘要预设清单（id/name/category/updatedAt）
//! - `get_queue_status`：宽松摘要任务队列（按 status 原始数字分组计数）
//!
//! status 的枚举语义写在工具 description 里（0=pending 1=processing 2=paused
//! 10=completed 20=stopped 99=error），Rust 代码不建模——与 R2.5 分层一致。

use super::{app_data, tools};
use rmcp::{
    handler::server::wrapper::Parameters, model::CallToolResult, model::ContentBlock, schemars,
    tool, tool_handler, tool_router, transport::stdio, ErrorData as McpError, ServerHandler,
    ServiceExt,
};
use serde_json::Value;
use std::path::{Path, PathBuf};

/// 结构化 JSON 输出 + 兼容旧客户端的 pretty text 块。
fn tool_result(value: Value) -> Result<CallToolResult, McpError> {
    let text = serde_json::to_string_pretty(&value).map_err(|e| {
        McpError::internal_error(format!("Failed to encode tool output: {}", e), None)
    })?;
    let mut result = CallToolResult::success(vec![ContentBlock::text(text)]);
    result.structured_content = Some(value);
    Ok(result)
}

fn to_mcp_error(error: String) -> McpError {
    McpError::internal_error(error, None)
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct ListPresetsParams {
    /// Optional custom preset directory (the GUI `presetDir` setting). Defaults to the app preset directory.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dir: Option<String>,
}

#[derive(Clone)]
pub struct FfmpegDesktopServer {
    app_data_dir: PathBuf,
}

#[tool_router]
impl FfmpegDesktopServer {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self { app_data_dir }
    }

    #[tool(
        description = "List all transcoding presets with loose summaries (id/name/category/updatedAt). Field is null when missing. Optional param dir points to a custom preset directory (the app `presetDir` setting)."
    )]
    fn list_presets(
        &self,
        Parameters(params): Parameters<ListPresetsParams>,
    ) -> Result<CallToolResult, McpError> {
        let preset_dir = app_data::resolve_preset_dir(&self.app_data_dir, params.dir.as_deref());
        let presets = tools::summarize_presets(&preset_dir).map_err(to_mcp_error)?;
        tool_result(Value::Array(presets))
    }

    #[tool(
        description = "Summarize the task queue snapshot loosely: total count, counts grouped by raw status number, and per-task id/inputFile/outputFile/status/createdAt. Status number meanings: 0=pending 1=processing 2=paused 10=completed 20=stopped 99=error. The queue is scheduled by the desktop GUI; MCP mode is read-only and never starts transcoding."
    )]
    fn get_queue_status(&self) -> Result<CallToolResult, McpError> {
        let snapshot = read_queue_snapshot(&self.app_data_dir)?;
        let summary = tools::summarize_queue(&snapshot).map_err(to_mcp_error)?;
        tool_result(summary)
    }
}

/// 读取 tasks.json；不存在时视为空队列（与 task_queue_store 的 NotFound 语义一致）。
fn read_queue_snapshot(app_data_dir: &Path) -> Result<String, McpError> {
    let path = app_data_dir.join("tasks.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(to_mcp_error(format!(
            "Failed to read {}: {}",
            path.display(),
            e
        ))),
    }
}

// get_info（name/version/instructions）由 #[tool_handler] 宏生成，勿手写覆盖。
// 注意：attribute 参数只接受字面量（env! 宏不合法），版本号升级时需同步此处。
#[tool_handler(
    name = "ffmpeg-desktop",
    version = "0.1.7",
    instructions = "Read-only MCP entry of FFmpeg Desktop: list presets and inspect the task queue. Submit transcoding tasks in the desktop app (GUI bridge arrives in RM2)."
)]
impl ServerHandler for FfmpegDesktopServer {}

/// 以 stdio transport 启动并阻塞服务，直到客户端断开。
pub async fn serve_stdio() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app_data::default_app_data_dir(app_data::APP_IDENTIFIER)?;
    let service = FfmpegDesktopServer::new(app_data_dir)
        .serve(stdio())
        .await?;
    service.waiting().await?;
    Ok(())
}
