# FFmpegFreeUI 完整复刻计划

> 基于对 ffmpeg_desktop 当前代码和 FFmpegFreeUI-main 原始项目的详细审计，制定完整复刻路线图。

## 当前状态评估

代码审计显示：**已有实现远超旧文档声称的 27%**。几乎所有核心编码功能都已有组件实现：

- ✅ 11 个完整页面（Home、PrepareFiles、EncodingQueue、Player、MediaInfo、Merge、Mux、QualityAssess、Performance、Settings、ParameterPanel）
- ✅ 7 个专用对话框（Crop、SuperResolution、Interpolation、FrameBlend、StreamSelector、Confirm、Toast）
- ✅ 6 个 Pinia stores（task、preset、setting、ffmpegSettings、logs、softInfo）
- ✅ Rust 后端：FFmpeg 进程管理、预设持久化、媒体探测
- ✅ i18n（zh-CN/en-US）、主题（light/dark/system）、系统托盘
- ✅ FFmpeg 命令构建器支持所有滤镜链

**但存在关键缺口**：部分组件未接入、codec 数据库不全、零测试覆盖。

---

## Phase 1: 修复关键缺口（修补现有代码）

### 1.1 ParameterPanel 缺页补齐 🔴

**问题**：`AudioSettings.vue` 和 `AdvancedSettings.vue` 组件已存在但未接入 ParameterPanel tab 系统。

**文件**：`src/pages/ParameterPanel/index.vue`

**改动**：
```diff
+ import AudioSettings from './components/AudioSettings.vue';
+ import AdvancedSettings from './components/AdvancedSettings.vue';

  在 tabs computed 中添加：
+ { id: 'audio', label: t('page.params.audio') },
+ { id: 'advanced', label: t('page.params.advanced') },

  在 template 中添加：
+ <div v-show="activeTab === 'audio'" class="tab-page">
+   <AudioSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
+ </div>
+ <div v-show="activeTab === 'advanced'" class="tab-page">
+   <AdvancedSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
+ </div>
```

**同时需要在 i18n 中添加对应翻译键**（page.params.audio, page.params.advanced）。

### 1.2 SubtitleSettings 重复处理 🟡

**问题**：`src/pages/ParameterPanel/components/SubtitleSettings.vue`（294行）和 `src/components/SubtitlePanel/SubtitlePanel.vue`（412行）功能重复。当前只接了 SubtitlePanel。

**决策**：保留 `SubtitlePanel.vue`（功能更完整），删除或用 `SubtitleSettings.vue` 替换（如果它有一些独特功能）。检查两者差异后决定。

### 1.3 codec.json 扩充 🔴

**文件**：`src-tauri/config/codec.json`

当前仅有 4 个软件编码器。需扩充至与原版匹配的完整编码器列表：

**新增视频编码器**：
```
SVT-AV1 (libsvtav1), VP8 (libvpx), ProRes (prores_ks),
NVENC: h264_nvenc, hevc_nvenc, av1_nvenc
QSV: h264_qsv, hevc_qsv, av1_qsv  
AMF: h264_amf, hevc_amf, av1_amf
VideoToolbox: h264_videotoolbox, hevc_videotoolbox
VAAPI: h264_vaapi, hevc_vaapi
Vulkan: h264_vulkan, hevc_vulkan
```

**新增音频编码器**：
```
libfdk_aac, libopus, flac, alac, ac3, eac3, dca, truehd,
vorbis, pcm_s16le, pcm_s24le, libmp3lame, wavpack
```

**新增容器格式**：
```
flv, m4a, ogg, opus, wav, flac, ac3, mpeg, mxf, 3gp
```

**注意**：`ffmpegCommandBuilder.ts` 中的 `FORMAT_COMPATIBILITY` 映射表也需要同步更新。

### 1.4 ffmpeg-settings.json 扩充 🟡

**文件**：`src-tauri/config/ffmpeg-settings.json`

补充缺失的硬件加速选项（VAAPI → Linux, VideoToolbox → macOS, Vulkan），以及更多编码质量预设选项。

---

## Phase 2: 验证并修复核心编码流程

### 2.1 端到端编码流程测试 🔴

**目标**：确认"添加文件 → 配置参数 → 生成命令 → 执行 FFmpeg → 进度更新"全链路可用。

**测试场景**：
- 用 PrepareFiles 添加视频文件
- 在 ParameterPanel 配置 H.264 + CRF 23
- 点击"添加到队列"触发 `EncodingQueue`
- 点击"开始"触发 `taskStore.startTask()` → `invoke("start_ffmpeg", ...)`
- 验证进度事件 `progress` / `finish` / `error` 回传正常

**可能的问题点**：
1. `taskStore.startTask()` 内部使用 `invoke("start_ffmpeg", ...)` 但 Rust 端命令名可能是 `start_ffmpeg`，需确认命名一致性
2. Tauri event 名称：`progress` / `finish` / `error` 需与 Rust `emit_payload` 一致
3. 进度解析：regex 在 `task_manager.rs` 解析 stderr，前端 `taskStore` 处理事件更新

### 2.2 命令构建器完整性验证 🟡

**文件**：`src/utils/commandBuilder.ts`

需要确认所有参数面板/对话框的值都能正确映射到 FFmpeg 命令行参数：

- [ ] ColorPanel → zscale/eq/tonemap 滤镜
- [ ] FilterPanel → yadif/bwdif/hqdn3d/nlmeans/unsharp 滤镜
- [ ] TrimPanel → -ss/-to/-t 参数
- [ ] SubtitlePanel → subtitles/ass 滤镜
- [ ] StreamPanel → -map 参数
- [ ] InterpolationDialog → minterpolate 滤镜参数
- [ ] SuperResolutionDialog → libplacebo 滤镜参数
- [ ] CropDialog → crop 滤镜参数
- [ ] FrameBlendDialog → tblend 滤镜参数
- [ ] AudioSettings → -c:a/-b:a/-ar/-ac 编码参数 + loudnorm 滤镜
- [ ] AdvancedSettings → -hwaccel/-threads/-hwaccel_output_format

### 2.3 PrepareFiles → EncodingQueue 数据流 🟡

验证从文件列表到任务队列的数据传递正确：文件名、路径、预设参数快照。

### 2.4 并发任务控制验证 🟡

检查 taskStore 的 `processingTaskProcessor()` 是否在 maxConcurrent 限制下正确调度任务。

---

## Phase 3: 测试覆盖

### 3.1 前端工具函数测试 🔴

**已有**：`__tests__/unit/utils/ffmpegCommandBuilder.test.ts`（仅 1 个文件）

**需新增**：
- [ ] `commandBuilder.test.ts` — 测试 FFmpegCommandBuilder.build() 各种参数组合
- [ ] `progressParser.test.ts` — 测试 stderr 解析
- [ ] `useFormatters.test.ts` — 测试 formatDuration、formatFileSize 等
- [ ] `useCodecFilter.test.ts` — 测试编解码器兼容性过滤
- [ ] `useFileList.test.ts` — 测试文件列表 hook

### 3.2 Pinia Store 测试 🔴

- [ ] `taskStore.test.ts` — 任务增删、状态转换、并发控制
- [ ] `presetStore.test.ts` — 预设 CRUD、导入导出
- [ ] `settingStore.test.ts` — 主题/语言设置
- [ ] `ffmpegSettingsStore.test.ts` — FFmpeg 设置持久化
- [ ] `logsStore.test.ts` — 日志操作

### 3.3 组件测试 🟡

优先测试核心交互组件：
- [ ] `TaskQueue` / `TaskItem` / `TaskProgress`
- [ ] `ParameterPanel` tab 切换、参数修改
- [ ] `ConfirmDialog` / `Toast`
- [ ] `NavigationTabs` 路由高亮

### 3.4 Rust 后端测试 🟡

- [ ] `task_manager` — 进度解析、进程管理
- [ ] `preset_manager` — JSON 序列化/反序列化
- [ ] `_executor` — 命令解析（引号处理）

---

## Phase 4: 低优先级补充

### 4.1 AviSynth/VapourSynth 界面 ⚪

**预设类型已有 frameServer 字段**，但没有 UI 组件。这是 Windows 专用功能，可延后。

### 4.2 图像编码 UI ⚪

`PresetData.image` 已有字段但没组件。添加简单的图像编码器/质量选择 UI。

### 4.3 全自定义命令模式 UI ⚪

`PresetData.custom.fullCustom` 已支持占位符替换，但 UI 缺少开关切换到全命令模式。

### 4.4 自动更新接入 ⚪

Settings 页面有 autoCheckUpdate 复选框，但实际更新机制未实现。可后续接 Tauri updater plugin。

### 4.5 FFmpegFreeUI 原版特有功能（不计划移植）

以下功能是原版 VB.NET 项目的特有功能，不适合或不需要移植到跨平台 Vue/Rust 项目：

- ❌ **插件系统**（VB.NET reflection 加载 .3fui.dll）
- ❌ **端口监听**（UDP 远程任务提交）
- ❌ **用户统计/遥测**
- ❌ **支持者页面**（赞助名单）
- ❌ **新闻获取**（news.ini）
- ❌ **启动参数 CLI**（`-i`, `-3fui_file` 等 — 可用 Tauri CLI 替代）

---

## 实施顺序建议

```
Day 1-2   Phase 1.1  ParameterPanel 缺页补齐
          Phase 1.2  Subtitle 组件去重
          Phase 2.1  端到端编码流程验证

Day 3-4   Phase 1.3  codec.json 扩充
          Phase 2.2  命令构建器完整性验证
          Phase 2.3  数据流验证

Day 5-7   Phase 3.1  前端工具函数测试
          Phase 3.2  Pinia Store 测试

Day 8-9   Phase 3.3  组件测试
          Phase 3.4  Rust 后端测试

Day 10+   Phase 4    低优先级补充
          Phase 2.4  并发控制验证
```

---

## 验收标准

复刻完成的标准：

1. ✅ 所有 ParameterPanel 标签页可访问且功能正常
2. ✅ codec.json 覆盖主流编解码器（≥20 种视频编码器）
3. ✅ 端到端编码流程可用（输入文件 → 配置 → 编码 → 输出验证）
4. ✅ 实时进度更新正确（frame/fps/speed/bitrate/time）
5. ✅ 任务暂停/恢复/停止功能正常
6. ✅ 预设保存/加载/导入/导出正常
7. ✅ 所有滤镜面板生成的命令参数与实际 FFmpeg 行为一致
8. ✅ 前端测试覆盖率 ≥ 85%（lines）、≥ 75%（branches）
9. ✅ Rust 后端测试全部通过
10. ✅ `pnpm typecheck` 和 `pnpm build` 无错误
