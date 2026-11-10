// RM1 后续：设置页「MCP 服务」展示的 mcp.json 配置在此唯一拼装。
// 服务 id 与模式参数必须与 Rust 侧 mcp 模块（server.rs name / main.rs 分流字面量）保持一致；
// 改名会导致已分发的客户端配置静默失效，任何变更需同步 mcpConfig.test.ts 与文档。
export const MCP_SERVER_ID = 'ffmpeg-desktop'

export const MCP_MODE_ARG = 'mcp'

/** 生成可直接粘贴进 AI 客户端（Claude Desktop / Cursor 等）mcp.json 的 pretty JSON。 */
export function buildMcpServerConfig(executablePath: string): string {
  const config = {
    mcpServers: {
      [MCP_SERVER_ID]: {
        command: executablePath,
        args: [MCP_MODE_ARG],
      },
    },
  }
  return JSON.stringify(config, null, 2)
}
