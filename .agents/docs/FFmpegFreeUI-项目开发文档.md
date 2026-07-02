# FFmpegFreeUI 项目开发文档

## 一、项目概述

### 1.1 项目简介
FFmpegFreeUI（简称3FUI）是一个基于FFmpeg的专业视频转码图形化界面工具，使用VB.NET开发，运行于.NET 10框架。该项目为FFmpeg命令行工具提供了完整的图形化操作界面，支持40+视频编码器、20+音频编码器、10+图片编码器，具备高度自由的参数配置能力。

### 1.2 技术栈
- **开发语言**: VB.NET
- **运行框架**: .NET 10 (Windows)
- **UI框架**: WinForm + WPF混合
- **界面库**: SunnyUI 3.7.2
- **依赖库**:
  - LibreHardwareMonitorLib 0.9.6-pre623 (性能监控)
  - Microsoft-WindowsAPICodePack-Shell 1.1.5 (文件对话框)
  
### 1.3 项目定位
- 目标用户：愿意折腾、追求质量、强迫症、专业工作者、压片佬
- 核心特点：完全透明、纯净自由、参数全面、批量处理
- 与同类软件对比：与HandBrake、ShanaEncoder同属常规专业级压制转换软件

### 1.4 版本信息
- 当前版本: 5.3.0
- 最低系统要求: Windows 10 1809
- 许可证: MIT

---

## 二、核心架构分析

### 2.1 项目结构

```
FFmpegFreeUI-main/
├── FFmpegFreeUI/              # 主项目目录
│   ├── 界面/                  # UI界面模块
│   │   ├── Form1.vb          # 主窗口
│   │   ├── 界面_常规流程参数_V2.vb  # 参数面板
│   │   ├── 界面_编码队列.vb  # 任务队列界面
│   │   └── ...               # 其他界面
│   ├── 编码任务/              # 核心业务逻辑
│   │   ├── 编码任务.vb       # 任务管理
│   │   ├── 预设管理.vb       # 预设系统
│   │   ├── 预设数据类型.vb   # 数据结构
│   │   └── 视频编码器数据库.vb # 编码器配置
│   ├── 界面控制/              # 界面逻辑控制
│   │   ├── 界面控制.vb       # 通用控制
│   │   ├── 界面控制_添加文件.vb
│   │   └── 界面控制_编码队列.vb
│   ├── 其他功能/              # 辅助功能
│   │   ├── 媒体信息解析器.vb
│   │   ├── 性能统计.vb
│   │   └── 插件管理.vb
│   ├── 网络功能/              # 网络相关
│   │   ├── 检查更新.vb
│   │   ├── 用户统计.vb
│   │   └── 端口监听.vb
│   └── 模块/                  # 工具模块
│       ├── Module1.vb        # 通用工具函数
│       ├── Module2.vb        # 进程管理
│       └── Module3_多语言.vb  # 国际化
├── PluginExample/             # 插件示例
└── Resources/                 # 资源文件
```

### 2.2 核心模块职责

#### 2.2.1 主窗口模块 (Form1.vb)
**职责**: 应用程序入口、全局状态管理、界面协调
**关键功能**:
- DPI适配与界面校准
- 页面切换管理
- 全局计时器管理
- 拖拽文件处理
- 窗口状态管理

**核心属性**:
```vb
Public Shared Property DPI As Single  ' DPI缩放比例
Public 起始页面 As New 界面_起始页
Public 准备文件页面 As New 界面_准备文件
Public 常规流程参数页面 As New 界面_常规流程参数_V2
Public 性能统计对象 As New 性能统计
Public 任务进度更新计时器 As New Timer
```

#### 2.2.2 编码任务模块 (编码任务.vb)
**职责**: 任务队列管理、FFmpeg进程控制、进度解析
**关键功能**:
- 任务队列管理（添加、删除、暂停、恢复）
- FFmpeg进程启动与监控
- 实时进度解析（正则表达式提取）
- 错误检测与处理
- 多任务并行控制

**核心数据结构**:
```vb
Public Class 单片任务
    Public Property 预设数据 As 预设数据类型
    Public Property 输入文件 As String
    Public Property 输出文件 As String
    Public Property 命令行 As String
    Public Property 状态 As 编码状态
    Public Property FFmpegProcess As Process
    ' 进度相关
    Public Property 实时_frame As String
    Public Property 实时_fps As String
    Public Property 实时_size As String
    Public Property 实时_time As TimeSpan
    Public Property 实时_bitrate As String
    Public Property 实时_speed As String
End Class
```

**进度解析正则表达式**:
```vb
DurationPattern = "Duration:\s*(\d+:\d{2}:\d{2}\.\d{2})"
FramePattern = "frame=\s*(?<value>\d+)"
FpsPattern = "fps=\s*(?<value>\d+)"
SizePattern = "size=\s*(?<value>\d+)\s*(?<unit>[KMG]iB)"
TimePattern = "time=\s*(?<value>\d+:\d{2}:\d{2}\.\d{2})"
BitratePattern = "bitrate=\s*(?<value>[\d\.]+)\s*kbits/s"
SpeedPattern = "speed=\s*(?<value>[\d\.eE\+\-]+)\s*x"
```

#### 2.2.3 预设管理模块 (预设管理.vb)
**职责**: 参数配置管理、FFmpeg命令行生成、预设保存/加载
**关键功能**:
- 参数面板数据与预设对象的转换
- FFmpeg命令行生成（核心逻辑）
- 预设文件导入/导出
- 参数总览显示

**命令行生成核心逻辑**:
```vb
Public Shared Function 将预设数据转换为命令行(
    a As 预设数据类型, 
    输入文件 As String, 
    输出文件 As String
) As String
```

**命令行生成流程**:
1. 检查是否使用"完全自己写参数"模式
2. 构建视频滤镜参数集
3. 构建音频滤镜参数集
4. 处理解码参数
5. 处理剪辑区间
6. 处理视频编码参数
7. 处理音频编码参数
8. 处理流控制（map）
9. 处理字幕混流
10. 处理元数据、章节、附件
11. 组装最终命令行

#### 2.2.4 预设数据类型 (预设数据类型.vb)
**职责**: 定义完整的参数数据结构
**核心属性分类**:

1. **输出设置**:
   - 输出容器、输出位置
   - 文件命名规则（自动命名、前后缀）

2. **解码参数**:
   - 硬件加速解码
   - CPU解码线程数
   - 解码数据格式

3. **视频参数**:
   - 编码器选择（类别、具体编码、预设、配置文件）
   - 分辨率、帧率
   - 质量控制（CRF/VBR/CQP等）
   - 色彩管理（像素格式、色彩空间、HDR）
   - 滤镜（降噪、锐化、插帧、超分、字幕烧录）

4. **音频参数**:
   - 编码器选择
   - 比特率、采样率
   - 声道布局
   - 响度标准化

5. **流控制**:
   - 视频流映射
   - 音频流映射
   - 字幕流映射
   - 元数据、章节、附件处理

6. **自定义参数**:
   - 自定义滤镜
   - 自定义编码参数
   - 完全自定义命令行

---

## 三、核心功能模块详解

### 3.1 任务队列系统

#### 3.1.1 任务状态管理
```vb
Enum 编码状态
    未处理 = 0
    正在处理 = 1
    已暂停 = 2
    已完成 = 10
    已停止 = 20
    错误 = 99
End Enum
```

#### 3.1.2 任务控制流程
1. **添加任务**:
   - 拖拽文件到队列
   - 创建预设数据快照
   - 生成ListViewItem

2. **启动任务**:
   - 检查并发任务数量限制
   - 创建FFmpeg进程
   - 重定向输出流
   - 启动进度监控

3. **暂停/恢复**:
   - 使用Windows API: `NtSuspendProcess` / `NtResumeProcess`
   - 暂停计时器

4. **停止任务**:
   - 强制终止进程
   - 清理资源
   - 可选删除输出文件

#### 3.1.3 并发控制
```vb
Public Shared Property 同时运行任务上限 As Integer = 1
' 用户可配置：1-10个并发任务
```

### 3.2 FFmpeg命令行生成系统

#### 3.2.1 命令行结构
```
ffmpeg [全局选项] [输入选项] -i 输入文件 [输出选项] 输出文件
```

#### 3.2.2 参数组装顺序
1. **开头参数**: `-hide_banner -nostdin`
2. **解码参数**: `-hwaccel`, `-threads`, `-hwaccel_output_format`
3. **剪辑参数**: `-ss`, `-to`, `-t`
4. **输入文件**: `-i 输入文件`
5. **视频滤镜**: `-vf "滤镜链"`
6. **视频编码参数**: `-c:v`, `-preset`, `-crf`, `-b:v`
7. **音频滤镜**: `-af "滤镜链"`
8. **音频编码参数**: `-c:a`, `-b:a`, `-ar`
9. **流映射**: `-map`
10. **元数据**: `-map_metadata`, `-map_chapters`
11. **输出文件**: `输出文件 -y`

#### 3.2.3 滤镜链构建
**视频滤镜链示例**:
```
yadif=0:-1:0,crop=1920:800:0:140,scale=1920:-2,hqdn3d=4:3:6:4,subtitles='字幕.srt'
```

**滤镜顺序**:
1. 反交错
2. 裁剪
3. 缩放
4. 降噪
5. 锐化
6. 插帧
7. 超分
8. 色彩转换
9. 字幕烧录

### 3.3 预设系统

#### 3.3.1 预设文件格式
- 文件格式: JSON
- 存储位置: `Preset/` 文件夹
- 文件后缀: `.3fui`

#### 3.3.2 预设数据结构
```json
{
  "输出容器": ".mp4",
  "视频参数_编码器_具体编码": "libx265",
  "视频参数_编码器_编码预设": "medium",
  "视频参数_质量控制_参数名": "crf",
  "视频参数_质量控制_值": "23",
  "音频参数_编码器_具体编码": "aac",
  "音频参数_比特率": "192k",
  ...
}
```

#### 3.3.3 预设管理功能
- 保存预设到文件
- 从文件加载预设
- 重置为默认值
- 预设参数总览
- 任务快照（每个任务独立的预设副本）

### 3.4 视频编码器支持

#### 3.4.1 软件编码器
- **H.264**: libx264
- **H.265**: libx265
- **AV1**: libaom-av1, libsvtav1, librav1e
- **VP9**: libvpx-vp9
- **其他**: libvpx (VP8), libvvenc (VVC)

#### 3.4.2 硬件加速编码器

**NVIDIA NVENC**:
- h264_nvenc, hevc_nvenc, av1_nvenc
- 支持质量参数: `-cq`, `-qp`
- 支持模式: VBR, VBR HQ, CQP, CBR

**Intel QSV**:
- h264_qsv, hevc_qsv, av1_qsv
- 支持质量参数: `-global_quality`
- 支持模式: VBR, LA_ICQ

**AMD AMF**:
- h264_amf, hevc_amf, av1_amf
- 支持质量参数: `-qp_i`, `-qp_p`
- 支持模式: VBR, HQVBR, CQP

#### 3.4.3 质量控制方式
1. **CRF (恒定质量)**: 软件编码首选
   - 参数: `-crf`
   - 推荐值: x264/x265: 23-25, SVT-AV1: 32-34

2. **VBR (动态码率)**: 硬件加速首选
   - 参数: `-cq` (N卡), `-global_quality` (I卡)
   - 推荐值: N卡AV1: cq=36

3. **VBR HQ (高质量动态码率)**: RTX 50系专用
   - 参数: `-rc vbr_hq -tune uhq`
   - 推荐值: cq=38

### 3.5 音频编码器支持

#### 3.5.1 支持的编码器
- **复制流**: copy
- **禁用**: -an
- **AAC**: aac, libfdk_aac (HE-AAC, HE-AAC v2)
- **MP3**: libmp3lame
- **Opus**: libopus
- **无损**: flac, alac, pcm_s16le/24le/32le/64le
- **其他**: ac3, eac3, dca, truehd, libvorbis, wavpack

#### 3.5.2 音频质量控制
- 比特率控制: `-b:a 192k`
- 质量参数: `-q:a` (VBR)
- 响度标准化: `loudnorm` 滤镜

### 3.6 视频滤镜系统

#### 3.6.1 反交错
- yadif (多种模式)
- bwdif
- pullup + decimate (IVTC)

#### 3.6.2 降噪
- **hqdn3d**: 快速降噪
- **nlmeans**: 高质量降噪
- **atadenoise**: 自适应时域降噪
- **bm3d**: 块匹配3D降噪（最高质量）

#### 3.6.3 插帧
- **minterpolate**: 运动补偿插帧
  - 模式: dup, blend, mci
  - 运动估计: bidir, bilat
  - 运动补偿: obmc, aobmc

#### 3.6.4 超分辨率
- **libplacebo**: GPU加速超分
  - 支持自定义着色器: Anime4K, FSRCNNX
  - 支持多种上采样算法

#### 3.6.5 色彩管理
- **zscale**: 快速色彩转换
- **libplacebo**: HDR色调映射
- **eq**: 亮度、对比度、饱和度、伽马调整

#### 3.6.6 字幕烧录
- **subtitles**: 支持SRT/ASS/SSA
- **ass**: ASS专用滤镜
- 支持自定义样式、字体、颜色、位置

### 3.7 流控制系统

#### 3.7.1 流映射逻辑
```vb
' 保留其他流 + 处理指定流
"-map 0:v? -c:v copy -c:v:0 libx265 -filter:v:0 ..."

' 仅处理指定流
"-map 0:v:0 -c:v libx265 -vf ..."
```

#### 3.7.2 字幕处理
- 自动混流同名SRT/ASS/SSA文件
- 内嵌字幕流映射
- 字幕编码转换（mov_text, srt, ass）

---

## 四、跨平台迁移方案

### 4.1 Windows特定功能识别

#### 4.1.1 进程管理
**Windows API调用**:
```vb
' 进程暂停/恢复
Declare Function NtSuspendProcess Lib "ntdll.dll" (ByVal hProcess As IntPtr) As Integer
Declare Function NtResumeProcess Lib "ntdll.dll" (ByVal hProcess As IntPtr) As Integer

' 处理器亲和性
Process.ProcessorAffinity = GetAffinityMask(cores)
```

**跨平台替代方案**:
- Linux/macOS: 使用 `SIGSTOP` / `SIGCONT` 信号
- Tauri: 使用Rust的 `nix` crate 或 `sysinfo` crate

#### 4.1.2 文件系统
**Windows特定路径处理**:
```vb
' 路径转换
Path.Combine()
Path.GetDirectoryName()
Path.GetFileNameWithoutExtension()
```

**跨平台注意事项**:
- 路径分隔符: Windows `\`, Unix `/`
- 文件名大小写敏感性
- 文件权限管理

#### 4.1.3 注册表操作
**原项目**: 不使用注册表（设计优势）

#### 4.1.4 性能监控
**Windows**: LibreHardwareMonitorLib
**跨平台替代**:
- Linux: `/proc` 文件系统
- macOS: `sysctl`, `ioreg`
- Tauri: `sysinfo` crate

### 4.2 UI框架迁移

#### 4.2.1 WinForm → Web技术
**原项目UI组件**:
- ListView (任务队列)
- TabControl (选项卡)
- ComboBox (下拉选择)
- TextBox (文本输入)
- CheckBox (复选框)
- Switch (开关)
- RichTextBox (日志显示)

**Tauri + Vue/React替代**:
- ListView → Virtual List (虚拟滚动列表)
- TabControl → Tabs组件
- ComboBox → Select组件
- TextBox → Input组件
- CheckBox → Checkbox组件
- Switch → Switch组件
- RichTextBox → 带样式的文本显示组件

#### 4.2.2 DPI适配
**原项目**: Windows DPI感知
```vb
Public Shared Property DPI As Single = Form1.CreateGraphics.DpiX / 96
```

**Tauri方案**: CSS `rem` 单位 + 媒体查询

### 4.3 数据持久化

#### 4.3.1 设置存储
**原项目**: JSON文件
```vb
Dim a = Path.Combine(Application.StartupPath, "Settings.json")
WriteAllText(a, JsonSerializer.Serialize(实例对象, JsonSO), False)
```

**Tauri方案**: 
- 使用 `tauri-plugin-store` 插件
- 或直接使用文件系统API

#### 4.3.2 预设文件
**格式**: JSON（跨平台兼容）

### 4.4 FFmpeg集成

#### 4.4.1 FFmpeg调用方式
**原项目**: 
- 系统环境变量
- 或放置在程序目录

**Tauri方案**:
1. **内置FFmpeg**:
   - 打包FFmpeg二进制文件
   - 使用 `tauri-bundler` 包含外部二进制

2. **系统FFmpeg**:
   - 检测系统PATH
   - 提供配置界面指定路径

#### 4.4.2 进程通信
**原项目**: 
```vb
FFmpegProcess.StartInfo.RedirectStandardOutput = True
FFmpegProcess.StartInfo.RedirectStandardError = True
FFmpegProcess.StartInfo.RedirectStandardInput = True
```

**Tauri方案**:
```rust
use std::process::{Command, Stdio};

let mut child = Command::new("ffmpeg")
    .args(&["-i", "input.mp4", "output.mp4"])
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;
```

---

## 五、Tauri实现建议

### 5.1 项目架构

#### 5.1.1 技术栈选择
```
前端: Vue 3 + TypeScript + Vite
后端: Rust + Tauri 2.x
UI框架: Element Plus / Ant Design Vue / Naive UI
状态管理: Pinia
```

#### 5.1.2 目录结构
```
./
├── src/                    # Vue前端
│   ├── components/         # 组件
│   │   ├── TaskQueue/     # 任务队列
│   │   ├── ParameterPanel/ # 参数面板
│   │   └── PresetManager/ # 预设管理
│   ├── views/             # 页面
│   │   ├── Home.vue       # 起始页
│   │   ├── Tasks.vue      # 任务管理
│   │   └── Settings.vue   # 设置
│   ├── stores/            # Pinia状态
│   │   ├── taskStore.ts   # 任务状态
│   │   ├── presetStore.ts # 预设状态
│   │   └── settingsStore.ts # 设置状态
│   ├── utils/             # 工具函数
│   │   ├── ffmpeg.ts      # FFmpeg工具
│   │   └── commandBuilder.ts # 命令行构建
│   └── types/             # TypeScript类型
│       └── preset.ts      # 预设类型定义
├── src-tauri/             # Rust后端
│   ├── src/
│   │   ├── lib.rs         # 主库
│   │   ├── ffmpeg.rs      # FFmpeg管理
│   │   ├── task.rs        # 任务管理
│   │   └── preset.rs      # 预设管理
│   └── Cargo.toml
└── package.json
```

### 5.2 核心功能实现

#### 5.2.1 TypeScript类型定义

**预设数据类型** (`src/types/preset.ts`):
```typescript
export interface PresetData {
  // 输出设置
  outputContainer: string;
  outputNaming: {
    useAutoNaming: boolean;
    autoNamingOption: number;
    noOutputFileParam: boolean;
    prefixText: string;
    replaceText: string;
    suffixText: string;
    preserveCreationTime: boolean;
    preserveModifyTime: boolean;
    preserveAccessTime: boolean;
  };
  
  // 解码参数
  decode: {
    decoder: string;
    cpuThreads: string;
    outputFormat: string;
    hwAccelParamName: string;
    hwAccelParam: string;
  };
  
  // 视频参数
  video: {
    encoder: {
      category: string;
      codec: string;
      preset: string;
      profile: string;
      tune: string;
      gpu: string;
      threads: string;
    };
    resolution: {
      size: string;
      autoWidth: string;
      autoHeight: string;
      cropFilter: string;
    };
    frameRate: {
      fps: string;
      decimateMax: string;
    };
    interpolation: {
      targetFps: string;
      mode: string;
      meMode: string;
      meAlgo: string;
      mcMode: string;
      vsbmc: boolean;
      blockSize: string;
      searchRange: string;
      scdThreshold: string;
    };
    frameBlend: {
      targetFps: string;
      blendMode: string;
      opacity: string;
    };
    superResolution: {
      targetWidth: string;
      targetHeight: string;
      upscaler: string;
      downscaler: string;
      antiringing: string;
      shaders: string[];
    };
    subtitleBurn: {
      filter: string;
      formatPriority: number[];
      externalFile: boolean;
      externalFileName: string;
      externalFolder: string;
      embeddedStream: boolean;
      streamIndex: string;
      fontsDir: string;
      style: {
        fontName: string;
        fontSize: number;
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikeout: boolean;
      };
      borderStyle: number;
      outlineWidth: string;
      shadowDistance: string;
      primaryColor: string;
      primaryAlpha: string;
      secondaryColor: string;
      secondaryAlpha: string;
      outlineColor: string;
      outlineAlpha: string;
      backColor: string;
      backAlpha: string;
      alignment: number;
      marginV: string;
      marginL: string;
      marginR: string;
      spacing: string;
      lineSpacing: string;
      customStyle: string;
      customFilterParam: string;
    };
    bitrateControl: {
      mode: string; // CRF, VBR, VBR_HQ, CQP, CBR
      qualityParam: string; // crf, cq, qp, global_quality
      qualityValue: string;
      baseBitrate: string;
      minBitrate: string;
      maxBitrate: string;
      bufferSize: string;
      advancedParams: string[];
    };
    colorManagement: {
      pixelFormat: string;
      filter: string;
      colorSpace: string;
      colorPrimaries: string;
      colorTRC: string;
      colorRange: string;
      tonemapAlgo: string;
      processMode: number;
      brightness: string;
      contrast: string;
      saturation: string;
      gamma: string;
    };
    denoise: {
      method: string;
      param1: string;
      param2: string;
      param3: string;
      param4: string;
    };
    sharpen: {
      lumaMsizeX: string;
      lumaMsizeY: string;
      lumaAmount: string;
    };
    deinterlace: number;
    rotation: number;
    flip: number;
    frameServer: {
      useAviSynth: boolean;
      avsScript: string;
      useVapourSynth: boolean;
      vpyScript: string;
    };
  };
  
  // 音频参数
  audio: {
    encoder: string;
    bitrate: string;
    qualityParam: string;
    qualityValue: string;
    channelLayout: string;
    sampleRate: string;
    loudnorm: {
      targetLoudness: string;
      dynamicRange: string;
      peakLevel: string;
    };
  };
  
  // 图片参数
  image: {
    encoder: string;
    quality: string;
  };
  
  // 自定义参数
  custom: {
    videoFilter: string;
    audioFilter: string;
    filterComplex: string;
    videoParams: string;
    audioParams: string;
    startParams: string;
    beforeOutputParams: string;
    afterOutputParams: string;
    endParams: string;
    fullCustom: string;
  };
  
  // 剪辑区间
  trim: {
    method: number;
    inPoint: string;
    outPoint: string;
    seekBackward: string;
  };
  
  // 流控制
  streamControl: {
    videoStreams: string[];
    keepOtherVideo: boolean;
    audioStreams: string[];
    keepOtherAudio: boolean;
    subtitleStreams: string[];
    subtitleOperation: number;
    keepOtherSubtitle: boolean;
    autoMuxSRT: boolean;
    autoMuxASS: boolean;
    autoMuxSSA: boolean;
    convertSubtitleToMovText: boolean;
    metadataOption: number;
    chapterOption: number;
    attachmentOption: number;
  };
  
  // 其他
  computerName: string;
  outputLocation: string;
}
```

**任务数据类型** (`src/types/task.ts`):
```typescript
export enum TaskStatus {
  Pending = 0,
  Processing = 1,
  Paused = 2,
  Completed = 10,
  Stopped = 20,
  Error = 99
}

export interface Task {
  id: string;
  preset: PresetData;
  inputFile: string;
  outputFile: string;
  commandLine: string;
  status: TaskStatus;
  progress: {
    frame: number;
    fps: number;
    quality: number;
    size: number;
    time: number;
    bitrate: number;
    speed: number;
    percentage: number;
    estimatedSize: number;
    remainingTime: number;
  };
  logs: {
    all: string[];
    errors: string[];
  };
  startTime: Date;
  elapsedTime: number;
  pid?: number;
}
```

#### 5.2.2 Rust后端实现

**FFmpeg管理** (`src-tauri/src/ffmpeg.rs`):
```rust
use std::process::{Command, Stdio, Child};
use std::io::{BufRead, BufReader};
use tauri::Window;

pub struct FFmpegProcess {
    child: Option<Child>,
}

impl FFmpegProcess {
    pub fn start(command: &str, window: Window) -> Result<Self, String> {
        let mut child = Command::new("ffmpeg")
            .args(command.split_whitespace())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;
        
        // 启动输出读取线程
        if let Some(stderr) = child.stderr.take() {
            let window_clone = window.clone();
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        // 发送进度更新到前端
                        window_clone.emit("ffmpeg-progress", &line).ok();
                    }
                }
            });
        }
        
        Ok(Self { child: Some(child) })
    }
    
    pub fn pause(&mut self) -> Result<(), String> {
        if let Some(ref mut child) = self.child {
            #[cfg(unix)]
            {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                kill(Pid::from_raw(child.id() as i32), Signal::SIGSTOP)
                    .map_err(|e| format!("Failed to pause: {}", e))?;
            }
            #[cfg(windows)]
            {
                // Windows暂停逻辑
            }
        }
        Ok(())
    }
    
    pub fn resume(&mut self) -> Result<(), String> {
        if let Some(ref mut child) = self.child {
            #[cfg(unix)]
            {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                kill(Pid::from_raw(child.id() as i32), Signal::SIGCONT)
                    .map_err(|e| format!("Failed to resume: {}", e))?;
            }
        }
        Ok(())
    }
    
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(ref mut child) = self.child {
            child.kill().map_err(|e| format!("Failed to stop: {}", e))?;
        }
        Ok(())
    }
}
```

**命令行构建器** (`src/utils/commandBuilder.ts`):
```typescript
export class FFmpegCommandBuilder {
  static build(preset: PresetData, inputFile: string, outputFile: string): string {
    if (preset.custom.fullCustom) {
      return this.replacePlaceholders(preset.custom.fullCustom, inputFile, outputFile);
    }
    
    const parts: string[] = [];
    
    // 1. 开头参数
    parts.push('-hide_banner -nostdin');
    if (preset.custom.startParams) parts.push(preset.custom.startParams);
    
    // 2. 解码参数
    if (preset.decode.decoder) parts.push(`-hwaccel ${preset.decode.decoder}`);
    if (preset.decode.cpuThreads) parts.push(`-threads ${preset.decode.cpuThreads}`);
    
    // 3. 剪辑参数
    parts.push(...this.buildTrimParams(preset.trim));
    
    // 4. 输入文件
    parts.push(`-i "${inputFile}"`);
    
    // 5. 视频滤镜
    const videoFilters = this.buildVideoFilters(preset.video);
    if (videoFilters.length > 0) {
      parts.push(`-vf "${videoFilters.join(',')}"`);
    }
    
    // 6. 视频编码参数
    parts.push(...this.buildVideoEncodeParams(preset.video));
    
    // 7. 音频滤镜
    const audioFilters = this.buildAudioFilters(preset.audio);
    if (audioFilters.length > 0) {
      parts.push(`-af "${audioFilters.join(',')}"`);
    }
    
    // 8. 音频编码参数
    parts.push(...this.buildAudioEncodeParams(preset.audio));
    
    // 9. 流控制
    parts.push(...this.buildStreamControl(preset.streamControl));
    
    // 10. 输出文件
    parts.push(`"${outputFile}" -y`);
    
    return parts.join(' ');
  }
  
  private static buildVideoFilters(video: VideoParams): string[] {
    const filters: string[] = [];
    
    // 反交错
    if (video.deinterlace > 0) {
      filters.push(this.buildDeinterlace(video.deinterlace));
    }
    
    // 裁剪
    if (video.resolution.cropFilter) {
      filters.push(`crop=${video.resolution.cropFilter}`);
    }
    
    // 缩放
    if (video.resolution.size) {
      filters.push(`scale=${video.resolution.size}`);
    } else if (video.resolution.autoWidth) {
      filters.push(`scale=${video.resolution.autoWidth}:-2`);
    } else if (video.resolution.autoHeight) {
      filters.push(`scale=-2:${video.resolution.autoHeight}`);
    }
    
    // 降噪
    if (video.denoise.method) {
      filters.push(this.buildDenoise(video.denoise));
    }
    
    // 锐化
    if (video.sharpen.lumaAmount) {
      filters.push(`unsharp=luma_msize_x=${video.sharpen.lumaMsizeX}:luma_msize_y=${video.sharpen.lumaMsizeY}:luma_amount=${video.sharpen.lumaAmount}`);
    }
    
    // 插帧
    if (video.interpolation.targetFps) {
      filters.push(this.buildInterpolation(video.interpolation));
    }
    
    // 超分
    if (video.superResolution.targetWidth) {
      filters.push(this.buildSuperResolution(video.superResolution));
    }
    
    // 色彩管理
    if (video.colorManagement.processMode > 0) {
      filters.push(...this.buildColorManagement(video.colorManagement));
    }
    
    // 字幕烧录
    if (video.subtitleBurn.filter) {
      filters.push(this.buildSubtitleBurn(video.subtitleBurn, inputFile));
    }
    
    // 翻转
    if (video.rotation > 0) {
      filters.push(...this.buildRotation(video.rotation));
    }
    if (video.flip > 0) {
      filters.push(video.flip === 1 ? 'hflip' : 'vflip');
    }
    
    // 自定义滤镜
    if (video.customFilter) {
      filters.push(video.customFilter);
    }
    
    return filters;
  }
  
  // ... 其他构建方法
}
```

### 5.3 关键技术点

#### 5.3.1 实时进度解析
**前端实现**:
```typescript
import { listen } from '@tauri-apps/api/event';

interface FFmpegProgress {
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
  size: string;
}

export function parseFFmpegProgress(line: string): Partial<FFmpegProgress> | null {
  const patterns = {
    frame: /frame=\s*(\d+)/,
    fps: /fps=\s*(\d+)/,
    time: /time=\s*(\d+:\d{2}:\d{2}\.\d{2})/,
    bitrate: /bitrate=\s*([\d\.]+)\s*kbits\/s/,
    speed: /speed=\s*([\d\.eE\+\-]+)\s*x/,
    size: /size=\s*(\d+)\s*([KMG]iB)/,
  };
  
  const result: Partial<FFmpegProgress> = {};
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = line.match(pattern);
    if (match) {
      (result as any)[key] = match[1];
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

// 监听FFmpeg输出
listen<string>('ffmpeg-progress', (event) => {
  const progress = parseFFmpegProgress(event.payload);
  if (progress) {
    // 更新UI
    updateTaskProgress(progress);
  }
});
```

#### 5.3.2 任务队列管理
**Pinia Store**:
```typescript
import { defineStore } from 'pinia';

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    maxConcurrent: 1,
    runningCount: 0,
  }),
  
  actions: {
    addTask(task: Omit<Task, 'id'>) {
      const newTask: Task = {
        ...task,
        id: generateId(),
        status: TaskStatus.Pending,
      };
      this.tasks.push(newTask);
      this.tryStartNext();
    },
    
    async startTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) return;
      
      task.status = TaskStatus.Processing;
      task.startTime = new Date();
      
      // 调用Rust后端启动FFmpeg
      const pid = await invoke('start_ffmpeg', {
        command: task.commandLine,
        taskId: task.id,
      });
      
      task.pid = pid;
      this.runningCount++;
    },
    
    pauseTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task && task.pid) {
        invoke('pause_process', { pid: task.pid });
        task.status = TaskStatus.Paused;
      }
    },
    
    resumeTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task && task.pid) {
        invoke('resume_process', { pid: task.pid });
        task.status = TaskStatus.Processing;
      }
    },
    
    stopTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task && task.pid) {
        invoke('stop_process', { pid: task.pid });
        task.status = TaskStatus.Stopped;
        this.runningCount--;
        this.tryStartNext();
      }
    },
    
    tryStartNext() {
      if (this.runningCount >= this.maxConcurrent) return;
      
      const nextTask = this.tasks.find(t => t.status === TaskStatus.Pending);
      if (nextTask) {
        this.startTask(nextTask.id);
      }
    },
  },
});
```

#### 5.3.3 文件拖拽处理
**Vue组件**:
```vue
<template>
  <div 
    class="drop-zone"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <p>拖拽文件到此处添加任务</p>
  </div>
</template>

<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore';

const taskStore = useTaskStore();

function onDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
  }
}

async function onDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (!files) return;
  
  // 检查是否按下Ctrl/Shift/Alt
  const useCustomPreset = e.ctrlKey || e.shiftKey || e.altKey;
  
  for (const file of files) {
    const filePath = await invoke('get_file_path', { file });
    
    if (useCustomPreset) {
      // 打开独立参数面板
      openCustomPresetDialog(filePath);
    } else {
      // 使用当前预设添加任务
      taskStore.addTask({
        inputFile: filePath,
        preset: currentPreset,
        // ...
      });
    }
  }
}
</script>
```

### 5.4 性能优化建议

#### 5.4.1 虚拟滚动
任务队列可能包含大量任务，使用虚拟滚动优化性能：
```vue
<template>
  <VirtualList
    :data="tasks"
    :item-size="60"
    :buffer="10"
  >
    <template #default="{ item }">
      <TaskItem :task="item" />
    </template>
  </VirtualList>
</template>
```

#### 5.4.2 Web Worker
将FFmpeg输出解析放在Web Worker中：
```typescript
// worker.ts
self.onmessage = (e) => {
  const progress = parseFFmpegProgress(e.data);
  if (progress) {
    self.postMessage(progress);
  }
};

// main thread
const worker = new Worker('worker.ts');
worker.onmessage = (e) => {
  updateTaskProgress(e.data);
};
```

#### 5.4.3 防抖与节流
进度更新使用节流：
```typescript
import { throttle } from 'lodash-es';

const updateProgress = throttle((taskId, progress) => {
  taskStore.updateProgress(taskId, progress);
}, 1000);
```

---

## 六、开发路线图

### 6.1 第一阶段：核心功能（2-3周）
- [ ] 项目架构搭建
- [ ] 预设数据结构定义
- [ ] FFmpeg命令行生成器
- [ ] 基础UI界面
- [ ] 任务队列管理
- [ ] FFmpeg进程控制

### 6.2 第二阶段：参数面板（3-4周）
- [ ] 视频编码器选择
- [ ] 音频编码器选择
- [ ] 质量控制参数
- [ ] 分辨率/帧率设置
- [ ] 色彩管理
- [ ] 滤镜配置（降噪、锐化等）

### 6.3 第三阶段：高级功能（2-3周）
- [ ] 字幕烧录
- [ ] 插帧/超分
- [ ] 剪辑区间
- [ ] 流控制
- [ ] 预设管理

### 6.4 第四阶段：辅助功能（1-2周）
- [ ] 媒体信息解析
- [ ] 性能监控
- [ ] 多语言支持
- [ ] 主题切换
- [ ] 插件系统

### 6.5 第五阶段：优化与测试（1-2周）
- [ ] 性能优化
- [ ] 跨平台测试
- [ ] Bug修复
- [ ] 文档完善

---

## 七、注意事项

### 7.1 跨平台兼容性
1. **路径处理**: 使用 `path` 模块处理路径，避免硬编码分隔符
2. **进程管理**: Linux/macOS使用信号，Windows使用特定API
3. **文件权限**: 注意Unix系统的文件权限
4. **FFmpeg路径**: 提供配置界面，支持系统PATH和自定义路径

### 7.2 性能考虑
1. **大文件处理**: 避免一次性读取大文件到内存
2. **任务数量**: 支持大量任务，使用虚拟滚动
3. **进度更新**: 使用节流避免频繁更新UI
4. **内存管理**: 及时清理已完成的任务数据

### 7.3 用户体验
1. **错误处理**: 提供清晰的错误信息和解决方案
2. **进度反馈**: 实时显示进度、剩余时间、预估大小
3. **参数验证**: 检查参数合法性，避免FFmpeg报错
4. **快捷键**: 支持常用操作的快捷键

### 7.4 安全性
1. **命令注入**: 验证用户输入，避免命令注入
2. **文件访问**: 限制文件访问范围
3. **进程权限**: 避免以管理员权限运行

---

## 八、参考资源

### 8.1 官方文档
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html)
- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Vue 3 Documentation](https://vuejs.org/)

### 8.2 编码器参考
- [NVIDIA NVENC Documentation](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new)
- [Intel QSV Documentation](https://en.wikipedia.org/wiki/Intel_Quick_Sync_Video)
- [AMD AMF Documentation](https://github.com/GPUOpen-LibrariesAndSDKs/AMF/wiki)

### 8.3 教程资源
- [极客湾 - 视频基础参数科普](https://www.bilibili.com/video/BV1nt411Q7S6)
- [影视飓风 - 视频的封装与编码](https://www.bilibili.com/video/BV1ws41157f8)
- [终末诗 - 3FUI入门教程](https://zhuanlan.zhihu.com/p/1943079795341623993)

---

## 九、总结

FFmpegFreeUI是一个功能完善、设计精良的FFmpeg图形化界面工具。通过深入分析其源代码，我们可以看到：

1. **架构清晰**: 模块划分明确，职责单一
2. **功能全面**: 支持几乎所有FFmpeg常用功能
3. **用户友好**: 界面直观，参数透明
4. **扩展性强**: 支持插件系统，自定义参数

使用Tauri框架复刻该项目，可以：
- 实现真正的跨平台（Windows/macOS/Linux）
- 保持轻量级（相比Electron）
- 利用现代Web技术栈
- 获得更好的性能

本开发文档提供了完整的技术分析和实现建议，可以作为后续开发的参考指南。
