# FFmpeg Desktop

跨平台 FFmpeg 图形化桌面工具。基于 Tauri 2 + Vue 3 + Rust，支持 Windows / Linux（macOS 配置就绪，暂无 CI 构建）。

> 本项目复刻自开源项目 FFmpegFreeUI，并在此基础上独立演进。

## 功能

- **批量转码**：多文件队列、并发控制、暂停/恢复/停止、实时进度（fps / speed / ETA / 已写大小）
- **编码参数**：软/硬件编码器（libx264/x265、NVENC、QSV、AMF 等 20 种），CRF/VBR/CQP/CBR 质量模式，滤镜、剪辑、色彩管理、字幕烧录、流选择
- **预设系统**：保存/加载/导入/导出编码预设（JSON blob + `schemaVersion` 1，前端唯一 schema 与迁移层），独立参数面板可为不同文件指定不同参数
- **队列持久化**：任务元数据经 Rust 原子写入 `tasks.json`，重启后恢复队列；运行中任务标记为中断、恢复后不自动开工，日志与进度有意不落盘
- **工具箱**：视频合并（concat）、混流（多文件流映射）、画质评测（VMAF/SSIM/PSNR）、媒体信息（ffprobe）、性能监控（CPU/内存/进程）
- **跨平台**：Linux（deb/rpm/AppImage）、Windows（msi/nsis），带签名自动更新（GitHub 渠道）

## 环境要求

| 依赖             | 版本                                         |
| ---------------- | -------------------------------------------- |
| Node.js          | ≥ 22（CI 使用 22）                           |
| pnpm             | ≥ 10.27（`packageManager` 强制锁定 10.27.0） |
| Rust             | stable（≥ 1.70）                             |
| FFmpeg / FFprobe | 系统安装，或在应用设置中指定路径             |

## 快速开始

```bash
pnpm install
pnpm tauri dev        # 桌面应用开发模式
pnpm dev              # 纯浏览器模式（Tauri API 已 mock，调试 UI 用）
```

## 构建与测试

```bash
pnpm build                    # 类型检查 + 前端构建
pnpm typecheck                # vue-tsc --noEmit
pnpm test:run                 # Vitest 单次运行
pnpm test:coverage            # 覆盖率报告（阈值与实测基线见质量保障文档）
cd src-tauri && cargo test    # Rust 单元测试
bash scripts/preflight.sh     # 发布前全量预检（构建 + CSP 断言 + 测试）
```

测试口径说明：前端单元测试在 mock 层运行（不依赖真实 Tauri 后端）；E2E 为浏览器 + Tauri mock。桌面端真实转码验证请参见 `.agents/docs/质量保障与发布.md`。

## 发布

正式发布依赖 GitHub Actions（推送 `v*` tag 触发）：

```bash
RELEASE_DRY_RUN=1 pnpm release:patch   # 演练（自动回滚）
pnpm release:patch                     # 正式：版本号同步 → commit/tag → 推送 → CI 构建签名产物
```

- CI 自动构建 Linux（deb/rpm/AppImage）与 Windows（msi/nsis）安装包，生成更新器 manifest（`latest.json`）并发布到 GitHub Release。
- 签名密钥通过仓库 Secrets（`TAURI_SIGNING_PRIVATE_KEY` 等）注入，本地无需持有。
- macOS 构建当前无 CI 支持，需本机 `pnpm tauri build`（`tauri.macos.conf.json` 已配置 dmg 目标）。

发布细节与已知风险见 `.agents/docs/质量保障与发布.md`。

## 项目结构

```
├── src/                  # Vue 前端（pages / components / store / hooks / utils / i18n）
├── src-tauri/            # Rust 后端（modules: 任务管理与预设；commands: 工具命令；library: 基础库）
│   └── tauri.*.conf.json # 主配置 + 平台覆盖（linux/macos/windows/no-updater）
├── scripts/              # 预检、版本、发布、更新器 manifest、CSP 断言脚本
├── e2e/                  # Playwright E2E（Tauri mock 层）
└── .agents/docs/         # 项目文档体系（审计、架构、路线图、规范、手册）
```

## 文档

完整文档位于 `.agents/docs/`：

| 文档                  | 内容                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `项目现状审计报告.md` | 当前状态、已验证问题清单（P0/P1/P2 分级）                          |
| `架构与数据流.md`     | 前后端架构、单一执行路径、事件契约、状态版图、预设与队列单一事实源 |
| `重构路线图.md`       | 分阶段改造方案（治理 → 修复 → 收敛 → 进化）                        |
| `UI-UX重设计规范.md`  | 设计 token、信息架构重设计方向                                     |
| `质量保障与发布.md`   | 测试策略、发布矩阵与流程                                           |
| `接力开发手册.md`     | 新人/AI 接手上手指南与陷阱清单                                     |
| `前端结构规范.md`     | 前端编码硬性规范                                                   |
| `业务操作手册.md`     | 最终用户使用指南                                                   |
| `archive/`            | 历史文档（复刻期分析与旧审查报告）                                 |

## 许可证

MIT

## 致谢

- [FFmpeg](https://ffmpeg.org/)
- [Tauri](https://tauri.app/)
- [Vue.js](https://vuejs.org/)
- FFmpegFreeUI（原始项目灵感来源）
- [开发教程：【Tauri】大家一起來做一個簡單的影片轉檔工具吧](https://william-weng.github.io/2025/07/tauri大家一起來做一個簡單的影片轉檔工具吧/)
