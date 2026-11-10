// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // RM1：`FFmpeg_Desktop mcp` 以 stdio MCP Server 运行（无 GUI）。
    // 这是运行模式分流而非参数语义解析（见 mcp/mod.rs 模块注释）；
    // 其余参数仍由前端 config/cliArgs.ts 语义化，Rust 不解读。
    if tauri_ffmpeg_gui_lib::mcp::should_run(std::env::args()) {
        tauri_ffmpeg_gui_lib::mcp::run_stdio();
        return;
    }
    tauri_ffmpeg_gui_lib::run()
}
