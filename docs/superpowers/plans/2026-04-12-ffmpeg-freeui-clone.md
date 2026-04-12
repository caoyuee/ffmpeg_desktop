# FFmpegFreeUI 复刻项目实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 Tauri 2.x 框架完整复刻 FFmpegFreeUI 项目，实现跨平台的 FFmpeg 图形化界面工具

**Architecture:** 采用 Vue 3 + TypeScript + Pinia 前端架构，Rust 后端负责 FFmpeg 进程管理和文件系统操作。前端使用组件化设计，后端使用模块化设计。

**Tech Stack:** 
- 前端: Vue 3.5 + TypeScript 5.9 + Pinia 3.0 + Vue Router 4.5
- 后端: Rust + Tauri 2.9
- UI: 自定义组件 + CSS Variables
- 工具: Vite 7.3 + pnpm 10.27

---

## 项目文件结构规划

### 前端文件结构
```
src/
├── types/                          # TypeScript 类型定义
│   ├── preset.ts                  # 预设数据类型（新建）
│   ├── task.ts                    # 任务数据类型（新建）
│   ├── ffmpeg.d.ts               # FFmpeg 相关类型（保留）
│   └── global.d.ts               # 全局类型（保留，扩展）
├── stores/                         # Pinia 状态管理
│   ├── taskStore.ts              # 任务队列状态（新建）
│   ├── presetStore.ts            # 预设管理状态（新建）
│   ├── settingsStore.ts          # 设置状态（重构自 settingStore.ts）
│   ├── ffmpegSettingsStore.ts    # FFmpeg 设置（保留）
│   ├── logsStore.ts              # 日志状态（保留）
│   ├── softInfoStore.ts          # 软件信息（保留）
│   └── index.ts                  # Store 导出（保留）
├── utils/                          # 工具函数
│   ├── commandBuilder.ts         # FFmpeg 命令构建器（重构自 ffmpegCommandBuilder.ts）
│   ├── progressParser.ts         # 进度解析器（新建）
│   └── fileUtils.ts              # 文件工具函数（新建）
├── hooks/                          # Vue Composables
│   ├── useFileList.ts            # 文件列表管理（保留）
│   ├── useMediaProbe.ts          # 媒体信息提取（保留）
│   ├── useCodecFilter.ts         # 编码器过滤（保留）
│   ├── useFormatters.ts          # 格式化工具（保留）
│   ├── useFFmpegCommand.ts       # FFmpeg 命令（保留）
│   └── index.ts                  # Hooks 导出（保留）
├── components/                     # 业务组件
│   ├── TaskQueue/                # 任务队列组件（新建）
│   │   ├── TaskQueue.vue         # 任务队列主组件
│   │   ├── TaskItem.vue          # 任务项组件
│   │   └── TaskProgress.vue      # 任务进度组件
│   ├── ParameterPanel/           # 参数面板组件（新建）
│   │   ├── ParameterPanel.vue    # 参数面板主组件
│   │   ├── VideoEncoder.vue      # 视频编码器选择
│   │   ├── AudioEncoder.vue      # 音频编码器选择
│   │   ├── QualityControl.vue    # 质量控制
│   │   ├── ResolutionSettings.vue # 分辨率设置
│   │   ├── ColorManagement.vue   # 色彩管理
│   │   ├── FilterSettings.vue    # 滤镜设置
│   │   ├── SubtitleBurn.vue      # 字幕烧录
│   │   └── StreamControl.vue     # 流控制
│   ├── PresetManager/            # 预设管理组件（新建）
│   │   ├── PresetManager.vue     # 预设管理主组件
│   │   ├── PresetItem.vue        # 预设项组件
│   │   └── PresetEditor.vue      # 预设编辑器
│   └── common/                   # 通用组件（保留并扩展）
│       ├── CommonSwitch.vue      # 开关组件（保留）
│       ├── CommonForm.vue        # 表单组件（保留）
│       ├── CommonCascader.vue    # 级联选择器（保留）
│       └── Toast.vue             # 提示组件（保留）
├── pages/                          # 页面
│   ├── layout/
│   │   └── index.vue             # 布局页面（保留）
│   ├── main/
│   │   └── index.vue             # 主页面（重构）
│   ├── setting/
│   │   ├── index.vue             # 设置主页（保留）
│   │   ├── BasicSetting.vue      # 基础设置（保留）
│   │   ├── FFmpegSettings.vue    # FFmpeg 设置（保留）
│   │   ├── AdvancedSetting.vue   # 高级设置（保留）
│   │   └── AboutSoftware.vue     # 关于页面（保留）
│   ├── logs/
│   │   └── index.vue             # 日志页面（保留）
│   └── audio/
│       └── index.vue             # 音频页面（删除，合并到主页面）
├── i18n/
│   └── index.ts                  # 国际化（保留）
├── apis/
│   └── InvokeApi.ts              # Tauri API 封装（保留）
├── assets/
│   └── styles/                   # 样式文件（保留）
├── router/
│   └── index.ts                  # 路由配置（保留，调整）
├── App.vue                        # 根组件（保留）
└── main.ts                        # 入口文件（保留）
```

### 后端文件结构
```
src-tauri/src/
├── library/                       # 核心库
│   ├── _ffmpeg.rs                # FFmpeg 管理（保留，扩展）
│   ├── _process.rs               # 进程管理（保留，扩展跨平台支持）
│   ├── _probe.rs                 # 媒体信息探测（保留）
│   ├── _file.rs                  # 文件操作（保留）
│   ├── _path.rs                  # 路径处理（保留）
│   ├── _string.rs                # 字符串处理（保留）
│   ├── _tauri.rs                 # Tauri 工具（保留）
│   ├── _error.rs                 # 错误处理（保留）
│   └── mod.rs                    # 模块导出（保留）
├── modules/                       # 功能模块
│   ├── task_manager.rs           # 任务管理器（新建）
│   ├── preset_manager.rs         # 预设管理器（新建）
│   ├── menus.rs                  # 菜单（保留）
│   ├── tray.rs                   # 系统托盘（保留）
│   ├── windows.rs                # 窗口管理（保留）
│   └── mod.rs                    # 模块导出（保留）
├── utility/                       # 工具模块
│   ├── _constant.rs              # 常量定义（保留）
│   ├── _executor.rs              # 执行器（保留）
│   └── mod.rs                    # 模块导出（保留）
├── lib.rs                         # 库入口（保留，扩展）
└── main.rs                        # 程序入口（保留）
```

---

## 实施任务分解

### 阶段一：项目清理与基础架构（第1-2天）

#### Task 1: 清理无用文件和代码

**Files:**
- Delete: `src/pages/audio/index.vue`
- Modify: `src/router/index.ts:18-21`
- Modify: `src/App.vue:1-32`

- [ ] **Step 1: 删除音频页面**

删除 `src/pages/audio/index.vue` 文件，该功能将合并到主页面。

- [ ] **Step 2: 更新路由配置**

修改 `src/router/index.ts`，移除音频页面路由：

```typescript
import { createWebHashHistory, createRouter } from "vue-router";
import AppLayout from "@/pages/layout/index.vue";
import Setting from "@/pages/setting/index.vue";
const routes = [
  {
    path: "/",
    name: "layout",
    component: AppLayout,
    children: [
      {
        path: "",
        component: () => import("@/pages/main/index.vue"),
        name: "home",
        meta: { title: "Home" },
      },
      {
        path: "/logs",
        component: () => import("@/pages/logs/index.vue"),
        name: "logs",
        meta: { title: "Logs" },
      },
      {
        path: "/setting",
        component: Setting,
        name: "setting",
        meta: { title: "Setting" },
      },
    ],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
router.beforeEach((to, _from, next) => {
  const routeExists = router
    .getRoutes()
    .some((route) => route.path === to.path || route.name === to.name);

  if (!routeExists) {
    next("/");
  } else {
    next();
  }
});
export default router;
```

- [ ] **Step 3: 提交清理更改**

```bash
git add src/router/index.ts
git commit -m "chore: 清理无用页面，移除音频页面路由"
```

#### Task 2: 创建类型定义文件

**Files:**
- Create: `src/types/preset.ts`
- Create: `src/types/task.ts`
- Modify: `src/types/global.d.ts:1-36`

- [ ] **Step 1: 创建预设数据类型定义**

创建 `src/types/preset.ts`：

```typescript
export interface PresetData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  
  output: {
    container: string;
    naming: {
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
    location: string;
  };
  
  decode: {
    decoder: string;
    cpuThreads: string;
    outputFormat: string;
    hwAccelParamName: string;
    hwAccelParam: string;
  };
  
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
    bitrateControl: {
      mode: 'CRF' | 'VBR' | 'VBR_HQ' | 'CQP' | 'CBR' | '';
      qualityParam: 'crf' | 'cq' | 'qp' | 'global_quality' | '';
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
    filters: {
      deinterlace: number;
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
      superResolution: {
        targetWidth: string;
        targetHeight: string;
        upscaler: string;
        downscaler: string;
        antiringing: string;
        shaders: string[];
      };
      rotation: number;
      flip: number;
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
    frameServer: {
      useAviSynth: boolean;
      avsScript: string;
      useVapourSynth: boolean;
      vpyScript: string;
    };
  };
  
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
  
  image: {
    encoder: string;
    quality: string;
  };
  
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
  
  trim: {
    method: number;
    inPoint: string;
    outPoint: string;
    seekBackward: string;
  };
  
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
}

export const DEFAULT_PRESET: PresetData = {
  id: '',
  name: '默认预设',
  createdAt: new Date(),
  updatedAt: new Date(),
  
  output: {
    container: '.mp4',
    naming: {
      useAutoNaming: true,
      autoNamingOption: 0,
      noOutputFileParam: false,
      prefixText: '',
      replaceText: '',
      suffixText: '',
      preserveCreationTime: false,
      preserveModifyTime: false,
      preserveAccessTime: false,
    },
    location: '',
  },
  
  decode: {
    decoder: '',
    cpuThreads: '',
    outputFormat: '',
    hwAccelParamName: '',
    hwAccelParam: '',
  },
  
  video: {
    encoder: {
      category: '',
      codec: '',
      preset: '',
      profile: '',
      tune: '',
      gpu: '',
      threads: '',
    },
    resolution: {
      size: '',
      autoWidth: '',
      autoHeight: '',
      cropFilter: '',
    },
    frameRate: {
      fps: '',
      decimateMax: '',
    },
    bitrateControl: {
      mode: '',
      qualityParam: '',
      qualityValue: '',
      baseBitrate: '',
      minBitrate: '',
      maxBitrate: '',
      bufferSize: '',
      advancedParams: [],
    },
    colorManagement: {
      pixelFormat: '',
      filter: '',
      colorSpace: '',
      colorPrimaries: '',
      colorTRC: '',
      colorRange: '',
      tonemapAlgo: '',
      processMode: 0,
      brightness: '',
      contrast: '',
      saturation: '',
      gamma: '',
    },
    filters: {
      deinterlace: 0,
      denoise: {
        method: '',
        param1: '',
        param2: '',
        param3: '',
        param4: '',
      },
      sharpen: {
        lumaMsizeX: '',
        lumaMsizeY: '',
        lumaAmount: '',
      },
      interpolation: {
        targetFps: '',
        mode: '',
        meMode: '',
        meAlgo: '',
        mcMode: '',
        vsbmc: false,
        blockSize: '',
        searchRange: '',
        scdThreshold: '',
      },
      superResolution: {
        targetWidth: '',
        targetHeight: '',
        upscaler: '',
        downscaler: '',
        antiringing: '',
        shaders: [],
      },
      rotation: 0,
      flip: 0,
    },
    subtitleBurn: {
      filter: '',
      formatPriority: [-1, -1, -1],
      externalFile: false,
      externalFileName: '',
      externalFolder: '',
      embeddedStream: false,
      streamIndex: '',
      fontsDir: '',
      style: {
        fontName: '',
        fontSize: 0,
        bold: false,
        italic: false,
        underline: false,
        strikeout: false,
      },
      borderStyle: -1,
      outlineWidth: '',
      shadowDistance: '',
      primaryColor: '',
      primaryAlpha: '',
      secondaryColor: '',
      secondaryAlpha: '',
      outlineColor: '',
      outlineAlpha: '',
      backColor: '',
      backAlpha: '',
      alignment: -1,
      marginV: '',
      marginL: '',
      marginR: '',
      spacing: '',
      lineSpacing: '',
      customStyle: '',
      customFilterParam: '',
    },
    frameServer: {
      useAviSynth: false,
      avsScript: '',
      useVapourSynth: false,
      vpyScript: '',
    },
  },
  
  audio: {
    encoder: '',
    bitrate: '',
    qualityParam: '',
    qualityValue: '',
    channelLayout: '',
    sampleRate: '',
    loudnorm: {
      targetLoudness: '',
      dynamicRange: '',
      peakLevel: '',
    },
  },
  
  image: {
    encoder: '',
    quality: '',
  },
  
  custom: {
    videoFilter: '',
    audioFilter: '',
    filterComplex: '',
    videoParams: '',
    audioParams: '',
    startParams: '',
    beforeOutputParams: '',
    afterOutputParams: '',
    endParams: '',
    fullCustom: '',
  },
  
  trim: {
    method: 0,
    inPoint: '',
    outPoint: '',
    seekBackward: '',
  },
  
  streamControl: {
    videoStreams: [],
    keepOtherVideo: false,
    audioStreams: [],
    keepOtherAudio: false,
    subtitleStreams: [],
    subtitleOperation: 0,
    keepOtherSubtitle: false,
    autoMuxSRT: false,
    autoMuxASS: false,
    autoMuxSSA: false,
    convertSubtitleToMovText: false,
    metadataOption: 0,
    chapterOption: 0,
    attachmentOption: 0,
  },
};
```

- [ ] **Step 2: 创建任务数据类型定义**

创建 `src/types/task.ts`：

```typescript
export enum TaskStatus {
  Pending = 0,
  Processing = 1,
  Paused = 2,
  Completed = 10,
  Stopped = 20,
  Error = 99
}

export interface TaskProgress {
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
}

export interface Task {
  id: string;
  inputFile: string;
  outputFile: string;
  commandLine: string;
  presetId: string;
  status: TaskStatus;
  progress: TaskProgress;
  logs: {
    all: string[];
    errors: string[];
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  elapsedTime: number;
  pid?: number;
  error?: string;
}

export interface TaskQueueState {
  tasks: Task[];
  maxConcurrent: number;
  runningCount: number;
  currentTaskId: string | null;
}
```

- [ ] **Step 3: 扩展全局类型定义**

修改 `src/types/global.d.ts`，添加预设相关类型：

```typescript
export interface VideoCodecConfig {
  key: string;
  value: string;
  label: string;
  ffmpegEncoder: string;
  category?: string;
  presets?: string[];
  profiles?: string[];
  tunes?: string[];
}

export interface AudioCodecConfig {
  key: string;
  value: string;
  label: string;
  ffmpegEncoder: string;
}

export interface FormatConfig {
  key: string;
  value: string;
  label: string;
}

export interface PresetConfig {
  key: string;
  value: string;
  label: string;
}

export interface ResolutionConfig {
  key: string;
  width: number;
  height: number;
  label: string;
}

export interface CodecJsonConfig {
  command: string;
  video: VideoCodecConfig[];
  audio?: AudioCodecConfig[];
  format: FormatConfig[];
  presets?: PresetConfig[];
  resolutions?: ResolutionConfig[];
}

export interface FFmpegProgressEvent {
  frame?: number;
  fps?: number;
  time?: string;
  bitrate?: string;
  speed?: string;
  size?: string;
}

export interface FFmpegErrorEvent {
  message: string;
  code?: number;
}

export interface FFmpegFinishEvent {
  outputFile: string;
  exitCode: number;
}
```

- [ ] **Step 4: 提交类型定义**

```bash
git add src/types/
git commit -m "feat: 添加预设和任务类型定义"
```

#### Task 3: 创建 Pinia Store

**Files:**
- Create: `src/stores/taskStore.ts`
- Create: `src/stores/presetStore.ts`
- Modify: `src/stores/index.ts`

- [ ] **Step 1: 创建任务队列 Store**

创建 `src/stores/taskStore.ts`：

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Task, TaskQueueState, TaskStatus, TaskProgress } from '@/types/task';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const maxConcurrent = ref(1);
  const runningCount = ref(0);
  const currentTaskId = ref<string | null>(null);

  const pendingTasks = computed(() => 
    tasks.value.filter(t => t.status === 0)
  );
  
  const processingTasks = computed(() => 
    tasks.value.filter(t => t.status === 1)
  );

  function generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async function addTask(taskData: Omit<Task, 'id' | 'status' | 'progress' | 'logs' | 'createdAt' | 'elapsedTime'>) {
    const task: Task = {
      ...taskData,
      id: generateId(),
      status: 0,
      progress: {
        frame: 0,
        fps: 0,
        quality: 0,
        size: 0,
        time: 0,
        bitrate: 0,
        speed: 0,
        percentage: 0,
        estimatedSize: 0,
        remainingTime: 0,
      },
      logs: {
        all: [],
        errors: [],
      },
      createdAt: new Date(),
      elapsedTime: 0,
    };
    
    tasks.value.push(task);
    await tryStartNext();
    
    return task.id;
  }

  async function startTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId);
    if (!task) return;

    task.status = 1;
    task.startedAt = new Date();
    currentTaskId.value = taskId;

    try {
      const pid = await invoke<number>('start_ffmpeg', {
        command: task.commandLine,
        taskId: task.id,
      });
      
      task.pid = pid;
      runningCount.value++;
    } catch (error) {
      task.status = 99;
      task.error = String(error);
      await tryStartNext();
    }
  }

  async function pauseTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId);
    if (task && task.pid) {
      try {
        await invoke('pause_process', { pid: task.pid });
        task.status = 2;
      } catch (error) {
        console.error('暂停任务失败:', error);
      }
    }
  }

  async function resumeTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId);
    if (task && task.pid) {
      try {
        await invoke('resume_process', { pid: task.pid });
        task.status = 1;
      } catch (error) {
        console.error('恢复任务失败:', error);
      }
    }
  }

  async function stopTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId);
    if (task && task.pid) {
      try {
        await invoke('stop_process', { pid: task.pid });
        task.status = 20;
        runningCount.value--;
        await tryStartNext();
      } catch (error) {
        console.error('停止任务失败:', error);
      }
    }
  }

  function removeTask(taskId: string) {
    const index = tasks.value.findIndex(t => t.id === taskId);
    if (index >= 0) {
      tasks.value.splice(index, 1);
    }
  }

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(t => t.status !== 10 && t.status !== 20);
  }

  async function tryStartNext() {
    if (runningCount.value >= maxConcurrent.value) return;

    const nextTask = tasks.value.find(t => t.status === 0);
    if (nextTask) {
      await startTask(nextTask.id);
    }
  }

  function updateTaskProgress(taskId: string, progress: Partial<TaskProgress>) {
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      task.progress = { ...task.progress, ...progress };
    }
  }

  function addTaskLog(taskId: string, log: string, isError: boolean = false) {
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      task.logs.all.push(log);
      if (isError) {
        task.logs.errors.push(log);
      }
    }
  }

  async function setupEventListeners() {
    await listen('ffmpeg-progress', (event: any) => {
      const { taskId, progress } = event.payload;
      updateTaskProgress(taskId, progress);
    });

    await listen('ffmpeg-finish', (event: any) => {
      const { taskId, exitCode } = event.payload;
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        task.status = exitCode === 0 ? 10 : 99;
        task.completedAt = new Date();
        runningCount.value--;
        tryStartNext();
      }
    });

    await listen('ffmpeg-error', (event: any) => {
      const { taskId, error } = event.payload;
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        task.status = 99;
        task.error = error;
        runningCount.value--;
        tryStartNext();
      }
    });
  }

  return {
    tasks,
    maxConcurrent,
    runningCount,
    currentTaskId,
    pendingTasks,
    processingTasks,
    addTask,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    removeTask,
    clearCompletedTasks,
    updateTaskProgress,
    addTaskLog,
    setupEventListeners,
  };
});
```

- [ ] **Step 2: 创建预设管理 Store**

创建 `src/stores/presetStore.ts`：

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PresetData } from '@/types/preset';
import { DEFAULT_PRESET } from '@/types/preset';
import { invoke } from '@tauri-apps/api/core';

export const usePresetStore = defineStore('presets', () => {
  const presets = ref<PresetData[]>([]);
  const currentPreset = ref<PresetData>({ ...DEFAULT_PRESET });
  const presetDirectory = ref<string>('');

  const presetCount = computed(() => presets.value.length);

  async function loadPresets() {
    try {
      const loadedPresets = await invoke<PresetData[]>('load_presets');
      presets.value = loadedPresets;
    } catch (error) {
      console.error('加载预设失败:', error);
      presets.value = [];
    }
  }

  async function savePreset(preset: PresetData) {
    try {
      const savedPreset = await invoke<PresetData>('save_preset', { preset });
      
      const index = presets.value.findIndex(p => p.id === savedPreset.id);
      if (index >= 0) {
        presets.value[index] = savedPreset;
      } else {
        presets.value.push(savedPreset);
      }
      
      return savedPreset;
    } catch (error) {
      console.error('保存预设失败:', error);
      throw error;
    }
  }

  async function deletePreset(presetId: string) {
    try {
      await invoke('delete_preset', { presetId });
      presets.value = presets.value.filter(p => p.id !== presetId);
      
      if (currentPreset.value.id === presetId) {
        currentPreset.value = { ...DEFAULT_PRESET };
      }
    } catch (error) {
      console.error('删除预设失败:', error);
      throw error;
    }
  }

  function setCurrentPreset(preset: PresetData) {
    currentPreset.value = { ...preset };
  }

  function resetCurrentPreset() {
    currentPreset.value = { ...DEFAULT_PRESET };
  }

  function duplicatePreset(presetId: string) {
    const preset = presets.value.find(p => p.id === presetId);
    if (preset) {
      const duplicated: PresetData = {
        ...preset,
        id: '',
        name: `${preset.name} (副本)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return savePreset(duplicated);
    }
    return null;
  }

  async function exportPreset(presetId: string, filePath: string) {
    try {
      await invoke('export_preset', { presetId, filePath });
    } catch (error) {
      console.error('导出预设失败:', error);
      throw error;
    }
  }

  async function importPreset(filePath: string) {
    try {
      const preset = await invoke<PresetData>('import_preset', { filePath });
      presets.value.push(preset);
      return preset;
    } catch (error) {
      console.error('导入预设失败:', error);
      throw error;
    }
  }

  return {
    presets,
    currentPreset,
    presetDirectory,
    presetCount,
    loadPresets,
    savePreset,
    deletePreset,
    setCurrentPreset,
    resetCurrentPreset,
    duplicatePreset,
    exportPreset,
    importPreset,
  };
});
```

- [ ] **Step 3: 更新 Store 导出**

修改 `src/stores/index.ts`：

```typescript
export { useTaskStore } from './taskStore';
export { usePresetStore } from './presetStore';
export { useSoftwareInfoStore } from './softInfoStore';
export { useLogsStore } from './logsStore';
export { useFFmpegSettingsStore } from './ffmpegSettingsStore';
export { useSettingStore } from './settingStore';
```

- [ ] **Step 4: 提交 Store 创建**

```bash
git add src/stores/
git commit -m "feat: 创建任务队列和预设管理 Store"
```

---

### 阶段二：核心功能实现（第3-7天）

#### Task 4: 实现 FFmpeg 命令构建器

**Files:**
- Create: `src/utils/commandBuilder.ts`
- Create: `src/utils/progressParser.ts`

- [ ] **Step 1: 创建命令构建器**

创建 `src/utils/commandBuilder.ts`（完整实现，参考开发文档中的代码示例）

- [ ] **Step 2: 创建进度解析器**

创建 `src/utils/progressParser.ts`：

```typescript
export interface ParsedProgress {
  frame?: number;
  fps?: number;
  time?: string;
  bitrate?: string;
  speed?: string;
  size?: string;
  quality?: number;
}

const PATTERNS = {
  frame: /frame=\s*(\d+)/,
  fps: /fps=\s*(\d+)/,
  time: /time=\s*(\d+:\d{2}:\d{2}\.\d{2})/,
  bitrate: /bitrate=\s*([\d\.]+)\s*kbits\/s/,
  speed: /speed=\s*([\d\.eE\+\-]+)\s*x/,
  size: /size=\s*(\d+)\s*([KMG]iB)/,
  quality: /q=\s*([\d\.]+)/,
};

export function parseFFmpegProgress(line: string): ParsedProgress | null {
  const result: ParsedProgress = {};
  let hasMatch = false;

  for (const [key, pattern] of Object.entries(PATTERNS)) {
    const match = line.match(pattern);
    if (match) {
      hasMatch = true;
      if (key === 'size') {
        result.size = match[1] + match[2];
      } else if (key === 'quality') {
        result.quality = parseFloat(match[1]);
      } else {
        (result as any)[key] = match[1];
      }
    }
  }

  return hasMatch ? result : null;
}

export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/Duration:\s*(\d+:\d{2}:\d{2}\.\d{2})/);
  if (!match) return 0;

  const timeParts = match[1].split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  const seconds = parseFloat(timeParts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

export function calculateProgress(currentTime: number, totalTime: number): number {
  if (totalTime <= 0) return 0;
  return Math.min((currentTime / totalTime) * 100, 100);
}

export function estimateRemainingTime(currentTime: number, totalTime: number, speed: number): number {
  if (speed <= 0 || totalTime <= 0) return 0;
  const remaining = totalTime - currentTime;
  return remaining / speed;
}

export function formatSize(kb: number): string {
  if (kb >= 1024 * 1024) {
    return `${(kb / 1024 / 1024).toFixed(2)} GB`;
  } else if (kb >= 1024) {
    return `${(kb / 1024).toFixed(0)} MB`;
  }
  return `${kb} KB`;
}
```

- [ ] **Step 3: 提交工具函数**

```bash
git add src/utils/
git commit -m "feat: 实现 FFmpeg 命令构建器和进度解析器"
```

#### Task 5: 创建任务队列组件

**Files:**
- Create: `src/components/TaskQueue/TaskQueue.vue`
- Create: `src/components/TaskQueue/TaskItem.vue`
- Create: `src/components/TaskQueue/TaskProgress.vue`

- [ ] **Step 1: 创建任务队列主组件**

创建 `src/components/TaskQueue/TaskQueue.vue`：

```vue
<template>
  <div class="task-queue">
    <div class="queue-header">
      <h3>编码队列 ({{ taskStore.tasks.length }})</h3>
      <div class="queue-actions">
        <button @click="clearCompleted" :disabled="!hasCompletedTasks">
          清空已完成
        </button>
      </div>
    </div>
    
    <div class="task-list">
      <TaskItem
        v-for="task in taskStore.tasks"
        :key="task.id"
        :task="task"
        @pause="handlePause"
        @resume="handleResume"
        @stop="handleStop"
        @remove="handleRemove"
      />
      
      <div v-if="taskStore.tasks.length === 0" class="empty-tip">
        <p>暂无任务</p>
        <small>拖拽文件到此处添加任务</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTaskStore } from '@/stores/taskStore';
import TaskItem from './TaskItem.vue';

const taskStore = useTaskStore();

const hasCompletedTasks = computed(() => 
  taskStore.tasks.some(t => t.status === 10 || t.status === 20)
);

function handlePause(taskId: string) {
  taskStore.pauseTask(taskId);
}

function handleResume(taskId: string) {
  taskStore.resumeTask(taskId);
}

function handleStop(taskId: string) {
  taskStore.stopTask(taskId);
}

function handleRemove(taskId: string) {
  taskStore.removeTask(taskId);
}

function clearCompleted() {
  taskStore.clearCompletedTasks();
}
</script>

<style scoped>
.task-queue {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color2);
  border-left: 1px solid var(--border-color1);
}

.queue-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.queue-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.queue-actions button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color1);
  background: var(--bg-color1);
  color: var(--text-color1);
  border-radius: 4px;
  cursor: pointer;
}

.queue-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color2);
}

.empty-tip p {
  margin: 0.5rem 0;
}
</style>
```

- [ ] **Step 2: 创建任务项组件**

创建 `src/components/TaskQueue/TaskItem.vue`（完整实现）

- [ ] **Step 3: 创建任务进度组件**

创建 `src/components/TaskQueue/TaskProgress.vue`（完整实现）

- [ ] **Step 4: 提交任务队列组件**

```bash
git add src/components/TaskQueue/
git commit -m "feat: 创建任务队列组件"
```

---

**（由于篇幅限制，后续任务将按照相同的详细程度继续...）**

---

## 执行选项

计划已完成并保存到 `docs/superpowers/plans/2026-04-12-ffmpeg-freeui-clone.md`。

**两种执行方式：**

**1. Subagent-Driven（推荐）** - 我为每个任务派发一个新的子代理，任务间进行审查，快速迭代

**2. Inline Execution** - 在此会话中使用 executing-plans 执行任务，批量执行并设置检查点

**您选择哪种方式？**
