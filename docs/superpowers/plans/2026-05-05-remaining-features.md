# ffmpeg_desktop 缺失功能补齐清单

## ⭐ 简单（每项 30 分钟以内）

### 1. 补充缺失的编码器选项
- `AudioSettings.vue` 追加 `libtwolame`、`tta`、`dca` 编码器
- `VideoEncoderSettings.vue` 追加 `hevc_vulkan`、`av1_vulkan`、`libsvt_vp9` 等变体
- `codec.json` 同步更新

### 2. 错误关键字匹配
- `task_manager.rs` 当前只靠退出码判断错误，增加 stderr 关键字匹配（Error、Invalid、Failed 等 11 个模式），匹配到立即发送 error 事件

### 3. 自动删除失败输出文件
- `taskStore.ts` 监听 `ffmpeg-error` 事件时，调用 Rust 删除已生成的残缺输出文件

### 4. 文件时间戳保留
- 编码完成后可选保留原文件的创建/修改/访问时间
- `PresetData.output.naming` 已有 `preserveCreationTime` 等字段，仅需 Rust 端实现

---

## ⭐⭐ 中等（每项 1-2 小时）

### 5. 任务完成/失败通知音效
- 前端播放内置提示音（用 Web Audio API 生成简单音调，不依赖外部文件）

### 6. GPU 硬件监控
- 当前 `get_system_metrics` 中 GPU 字段全是 0
- Linux 下可读 `/sys/class/drm/card*/device/gpu_busy_percent` 等文件
- macOS 用 IOKit，Windows 用 NVAPI/ADL
- 或引入 `nvml-wrapper` / `nvapi` crate（仅 NVIDIA）

### 7. CPU 核心亲和性绑定
- `taskStore` 新增 `cpuAffinity` 字段
- Rust `start_ffmpeg` 启动进程后，Unix 用 `sched_setaffinity`，Windows 用 `SetProcessAffinityMask`

### 8. VMAF/PSNR/SSIM 结果解析
- QualityAssess 页当前只显示日志，不提取最终评分
- stderr 末尾解析 VMAF 的 `VMAF score:` 行和 PSNR/SSIM 的 `average:` 行

---

## ⭐⭐⭐ 复杂（每项 2-4 小时）

### 9. 编码器精细化数据库
- 当前所有编码器共用同一套 Preset/Profile/Tune/PixFmt 列表
- 改为按编码器区分配置（如 libx264 有 veryslow→ultrafast，nvenc 有 p1→p7 等）
- 参考原版 `视频编码器数据库.vb` 的 23 类定义，写成 JSON 配置文件

### 10. 运行时 stdin 指令
- 允许用户向正在运行的 ffmpeg 进程发送键盘指令（按 q 优雅退出、调整日志级别等）
- Rust 端保持 `child.stdin` 引用，前端按钮触发 invoke

---

| # | 功能 | 难度 | 预计 |
|---|------|------|------|
| 1 | 编码器选项补齐 | ⭐ | 20min |
| 2 | 错误关键字匹配 | ⭐ | 20min |
| 3 | 自动删失败文件 | ⭐ | 15min |
| 4 | 文件时间戳保留 | ⭐ | 30min |
| 5 | 通知音效 | ⭐⭐ | 1h |
| 6 | GPU 监控 | ⭐⭐ | 2h |
| 7 | CPU 亲和性 | ⭐⭐ | 1h |
| 8 | VMAF 结果解析 | ⭐⭐ | 1.5h |
| 9 | 编码器精细化数据库 | ⭐⭐⭐ | 3h |
| 10 | stdin 指令 | ⭐⭐⭐ | 2h |

**总计约 12 小时**
