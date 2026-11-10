import { describe, expect, it } from 'vitest'

import { buildMcpServerConfig, MCP_MODE_ARG, MCP_SERVER_ID } from '@/config/mcpConfig'

describe('buildMcpServerConfig（设置页 MCP 配置的唯一拼装点）', () => {
  it('生成 mcpServers 信封，command 指向应用二进制并携带 mcp 模式参数', () => {
    const json = buildMcpServerConfig('/opt/apps/FFmpeg_Desktop')
    const parsed = JSON.parse(json)

    expect(parsed.mcpServers[MCP_SERVER_ID]).toEqual({
      command: '/opt/apps/FFmpeg_Desktop',
      args: [MCP_MODE_ARG],
    })
    expect(MCP_MODE_ARG).toBe('mcp')
  })

  it('Windows 反斜杠路径在 JSON 中被正确转义，解析后原样还原', () => {
    const exe = 'C:\\Apps\\FFmpeg_Desktop.exe'
    const json = buildMcpServerConfig(exe)
    const parsed = JSON.parse(json)

    expect(parsed.mcpServers['ffmpeg-desktop'].command).toBe(exe)
    // JSON 文本里反斜杠必须双写，否则客户端解析不出合法路径。
    expect(json).toContain('C:\\\\Apps\\\\FFmpeg_Desktop.exe')
  })

  it('输出为 2 空格缩进的 pretty JSON，便于用户直接粘贴进客户端配置文件', () => {
    const json = buildMcpServerConfig('/app')
    expect(json).toBe(
      [
        '{',
        '  "mcpServers": {',
        '    "ffmpeg-desktop": {',
        '      "command": "/app",',
        '      "args": [',
        '        "mcp"',
        '      ]',
        '    }',
        '  }',
        '}',
      ].join('\n'),
    )
  })

  it('服务 id 稳定，客户端配置一旦分发不能随意改名', () => {
    expect(MCP_SERVER_ID).toBe('ffmpeg-desktop')
  })
})
