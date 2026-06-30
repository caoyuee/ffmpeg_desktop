# FFmpeg Desktop - 跨平台视频处理工具

基于 Tauri 2.x + Vue 3 开发的跨平台 FFmpeg 图形化界面工具，复刻自 FFmpegFreeUI 项目。

## ✨ 功能特性

### 🎬 视频处理
- 支持多种视频编码器（H.264, H.265, AV1, VP9 等）
- 支持硬件加速编码（NVIDIA NVENC, Intel QSV, AMD AMF）
- 灵活的质量控制（CRF, VBR, CQP, CBR）
- 自定义分辨率和帧率
- 视频滤镜（降噪、锐化、插帧、超分辨率等）

### 🎵 音频处理
- 支持多种音频编码器（AAC, MP3, Opus, FLAC 等）
- 音频比特率和采样率设置
- 响度标准化

### 📋 任务队列
- 批量任务管理
- 任务暂停/恢复/停止
- 实时进度显示
- 并发任务控制

### 💾 预设管理
- 保存和加载编码预设
- 预设导入/导出
- 预设编辑器

### ⚙️ 系统设置
- FFmpeg 工具配置
- 临时文件路径设置
- 并发任务数设置
- 主题切换

## 🚀 快速开始

### 前置要求

1. **Node.js** >= 18.x
2. **pnpm** >= 8.x
3. **Rust** >= 1.70
4. **FFmpeg** - 系统已安装或通过应用自动安装

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# Rust 依赖会在首次运行时自动安装
```

### 开发模式

```bash
# 启动开发服务器
pnpm tauri dev
```

### 构建生产版本

```bash
# 构建应用
pnpm tauri build
```

## 📖 使用方法

### 1. 添加文件

**方式一：拖拽上传**
- 直接将视频文件拖拽到文件列表区域

**方式二：点击上传**
- 点击"上传"按钮，选择要处理的文件

### 2. 配置参数

#### 视频编码器
1. 选择编码器类别（软件编码/硬件加速）
2. 选择具体的编码器（如 libx265, h264_nvenc 等）
3. 设置编码预设（可选）

#### 质量控制
1. 选择质量控制模式：
   - **CRF**：恒定质量，适合大多数场景
   - **VBR**：动态码率，适合文件大小有要求的场景
   - **CQP**：恒定量化参数，适合专业场景
   - **CBR**：恒定码率，适合直播等场景
2. 调整质量值（CRF 推荐 18-28，值越小质量越好）

#### 分辨率
- **原始分辨率**：保持原始分辨率
- **预设分辨率**：选择常用分辨率（1080p, 720p 等）
- **自定义**：手动输入宽度和高度

#### 帧率
- 保持原始帧率或选择目标帧率

### 3. 添加到队列

配置完成后，点击"添加到队列"按钮，任务将自动添加到右侧任务队列。

### 4. 管理任务

- **暂停**：点击暂停按钮暂停正在进行的任务
- **恢复**：点击恢复按钮继续暂停的任务
- **停止**：点击停止按钮终止任务
- **移除**：点击移除按钮从队列中删除任务

### 5. 使用预设

#### 保存预设
1. 配置好参数后，点击"新建预设"
2. 输入预设名称
3. 点击"保存"

#### 加载预设
- 在预设列表中点击要使用的预设

#### 导入/导出预设
- 点击"导入"按钮导入预设文件
- 点击预设项的"导出"按钮导出预设

## 🛠️ 技术栈

### 前端
- **Vue 3.5** - 渐进式 JavaScript 框架
- **TypeScript 5.9** - 类型安全
- **Pinia 3.0** - 状态管理
- **Vue Router 4.5** - 路由管理
- **Vite 7.3** - 构建工具

### 后端
- **Rust** - 系统编程语言
- **Tauri 2.9** - 跨平台桌面应用框架

### 核心依赖
- **regex** - 正则表达式
- **serde** - 序列化/反序列化
- **chrono** - 时间处理
- **uuid** - UUID 生成

## 📁 项目结构

```
ffmpeg_desktop/
├── src/                    # Vue 前端
│   ├── components/         # 业务组件
│   │   ├── TaskQueue/     # 任务队列组件
│   │   ├── ParameterPanel/# 参数面板组件
│   │   └── PresetManager/ # 预设管理组件
│   ├── pages/             # 页面
│   │   ├── main/         # 主页面
│   │   ├── logs/         # 日志页面
│   │   └── setting/      # 设置页面
│   ├── store/            # Pinia 状态管理
│   ├── types/            # TypeScript 类型
│   └── utils/            # 工具函数
├── src-tauri/            # Rust 后端
│   ├── src/
│   │   ├── modules/     # 功能模块
│   │   │   ├── task_manager.rs    # 任务管理
│   │   │   └── preset_manager.rs  # 预设管理
│   │   └── library/     # 核心库
│   └── Cargo.toml
└── package.json
```

## 🔧 配置

### FFmpeg 路径配置

如果系统未安装 FFmpeg，可以通过以下方式配置：

1. **自动安装**：首次运行时，应用会提示安装 FFmpeg
2. **手动配置**：在设置页面手动指定 FFmpeg 路径

### 临时文件路径

在"设置 > 高级设置"中可以配置临时文件存储路径。

### 并发任务数

在"设置 > 高级设置"中可以调整同时处理的最大任务数（1-8个）。

## 🐛 故障排除

### FFmpeg 未找到
- 确认 FFmpeg 已正确安装
- 在设置中手动配置 FFmpeg 路径
- 检查系统 PATH 环境变量

### 任务失败
- 查看日志页面的错误信息
- 检查输入文件是否损坏
- 确认输出路径有写入权限

### 性能问题
- 降低并发任务数
- 使用硬件加速编码
- 调整编码预设为 faster 或 veryfast

## 📝 开发

### 环境要求
- Node.js >= 18
- Rust >= 1.70
- pnpm >= 8

### 本地开发
```bash
# 克隆项目
git clone <repository-url>
cd ffmpeg_desktop

# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev
```

### 构建
```bash
# 构建生产版本
pnpm tauri build
```

### Gitee 发布自动化

项目提供 Gitee-only 发布脚本。脚本只推送 `origin`，并要求远端地址指向 `gitee.com`。

```bash
# 试跑：创建本地 release commit/tag 后自动回滚，不推送
RELEASE_DRY_RUN=1 pnpm release:patch

# 发布 patch/minor/major 版本
pnpm release:patch
pnpm release:minor
pnpm release:major
```

发布流程：

1. 运行 `pnpm verify`，执行类型检查、Vitest、Playwright 和 Rust 测试。
2. 同步更新 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 版本号。
3. 创建 `chore: release vX.Y.Z` 提交和 `vX.Y.Z` tag。
4. 推送当前分支和 tag 到 Gitee `origin`。
5. 如果设置了 `GITEE_TOKEN`，调用 Gitee Release API 创建发行版记录。

常用环境变量：

```bash
# 跳过较慢的检查，仅建议临时本地调试使用
SKIP_E2E=1 pnpm verify
SKIP_RUST_TESTS=1 pnpm verify
SKIP_PREFLIGHT=1 pnpm release:patch

# 创建 Gitee 发行版记录
GITEE_TOKEN=<your-token> pnpm release:patch
```

## 🧪 测试

### 测试框架

- **前端**: Vitest + @vue/test-utils + happy-dom
- **后端**: Rust 内置测试框架 + cargo-tarpaulin

### 运行测试

```bash
# 运行前端测试（监听模式）
pnpm test

# 运行前端测试（单次）
pnpm test:run

# 运行前端测试并生成覆盖率
pnpm test:coverage

# 运行后端测试
cd src-tauri && cargo test

# 运行后端测试并生成覆盖率
cd src-tauri && cargo tarpaulin

# 运行所有测试并生成报告
pnpm test:all

# 完整发布前验证
pnpm verify
```

### 测试覆盖率目标

- **前端**: ≥ 85%
- **后端**: ≥ 80%

### 查看测试报告

测试完成后，可以在以下位置查看详细报告：

- 前端覆盖率: `test-reports/frontend/coverage/index.html`
- 后端覆盖率: `test-reports/backend/tarpaulin-report.html`
- 综合报告: `test-reports/TEST_REPORT.md`

## 📄 许可证

MIT License

## 🙏 致谢

- [FFmpeg](https://ffmpeg.org/) - 强大的多媒体处理工具
- [FFmpegFreeUI](https://github.com/...) - 原始项目灵感来源
- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架

## 📚 相关链接

- [开发教程：【Tauri】大家一起來做一個簡單的影片轉檔工具吧](https://william-weng.github.io/2025/07/tauri大家一起來做一個簡單的影片轉檔工具吧/)
- [更多 Rust 相关内容](https://caoyuee.github.io/tags/rust/)
