import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Task, TaskProgress } from "@/types/task";
import { TaskStatus } from "@/types/task";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

type ErrorType = "network" | "permission" | "not_found" | "invalid_input" | "process" | "unknown";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

function classifyError(error: unknown): ErrorType {

let audioCtx: AudioContext | null = null;
function playNotification(frequency: number, duration: number) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch { /* AudioContext may be blocked by browser */ }
}
  const message = formatError(error).toLowerCase();
  
  if (message.includes("network") || message.includes("connection") || message.includes("timeout")) {
    return "network";
  }
  if (message.includes("permission") || message.includes("access denied") || message.includes("权限")) {
    return "permission";
  }
  if (message.includes("not found") || message.includes("不存在") || message.includes("未找到")) {
    return "not_found";
  }
  if (message.includes("invalid") || message.includes("无效") || message.includes("格式")) {
    return "invalid_input";
  }
  if (message.includes("process") || message.includes("ffmpeg") || message.includes("进程")) {
    return "process";
  }
  return "unknown";
}

export const useTaskStore = defineStore("tasks", () => {
  const tasks = ref<Task[]>([]);
  const maxConcurrent = ref(1);
  const runningCount = ref(0);
  const currentTaskId = ref<string | null>(null);
  let isStarting = false;
  let unlisteners: UnlistenFn[] = [];

  const pendingTasks = computed(() =>
    tasks.value.filter((t) => t.status === TaskStatus.Pending),
  );

  const processingTasks = computed(() =>
    tasks.value.filter((t) => t.status === TaskStatus.Processing),
  );

  function generateId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 16);
    return `task_${timestamp}_${randomPart}`;
  }

  async function addTask(
    taskData: Omit<
      Task,
      "id" | "status" | "progress" | "logs" | "createdAt" | "elapsedTime"
    >,
    autoStart: boolean = true,
  ) {
    const task: Task = {
      ...taskData,
      id: generateId(),
      status: TaskStatus.Pending,
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
    if (autoStart) {
      await tryStartNext();
    }

    return task.id;
  }

  async function startTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;

    task.status = TaskStatus.Processing;
    task.startedAt = new Date();
    currentTaskId.value = taskId;

    try {
      const pid = await invoke<number>("start_ffmpeg", {
        command: task.commandLine,
        taskId: task.id,
        cpuAffinity: task.cpuAffinity || null,
      });

      task.pid = pid;
      runningCount.value++;
    } catch (error) {
      task.status = TaskStatus.Error;
      task.error = formatError(error);
      task.errorType = classifyError(error);
      addTaskLog(taskId, `任务启动失败: ${task.error}`, true);
      await tryStartNext();
    }
  }

  async function pauseTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task && task.pid) {
      try {
        await invoke("pause_process", { pid: task.pid });
        task.status = TaskStatus.Paused;
      } catch (error) {
        const errorMsg = formatError(error);
        addTaskLog(taskId, `暂停任务失败: ${errorMsg}`, true);
      }
    }
  }

  async function resumeTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task && task.pid) {
      try {
        await invoke("resume_process", { pid: task.pid });
        task.status = TaskStatus.Processing;
      } catch (error) {
        const errorMsg = formatError(error);
        addTaskLog(taskId, `恢复任务失败: ${errorMsg}`, true);
      }
    }
  }

  async function stopTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task && task.pid) {
      try {
        await invoke("stop_process", { pid: task.pid });
        task.status = TaskStatus.Stopped;
        runningCount.value--;
        await tryStartNext();
      } catch (error) {
        console.error("停止任务失败:", error);
      }
    }
  }

  function removeTask(taskId: string) {
    const index = tasks.value.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      tasks.value.splice(index, 1);
    }
  }

  function reorderTasks(orderedIds: string[]) {
    const taskMap = new Map(tasks.value.map(t => [t.id, t]));
    tasks.value = orderedIds.map(id => taskMap.get(id)!).filter(Boolean);
  }

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(
      (t) =>
        t.status !== TaskStatus.Completed && t.status !== TaskStatus.Stopped,
    );
  }

  async function tryStartNext() {
    if (isStarting) return;
    isStarting = true;

    try {
      if (runningCount.value >= maxConcurrent.value) return;

      const nextTask = tasks.value.find((t) => t.status === TaskStatus.Pending);
      if (nextTask) {
        await startTask(nextTask.id);
      }
    } finally {
      isStarting = false;
    }
  }

  function updateTaskProgress(taskId: string, progress: Partial<TaskProgress>) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.progress = { ...task.progress, ...progress };
    }
  }

  function addTaskLog(taskId: string, log: string, isError: boolean = false) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.logs.all.push(log);
      if (isError) {
        task.logs.errors.push(log);
      }
    }
  }

  async function setupEventListeners() {
    unlisteners.push(
      await listen("ffmpeg-progress", (event: any) => {
        const { taskId, progress } = event.payload;
        updateTaskProgress(taskId, progress);
      })
    );

    unlisteners.push(
      await listen("ffmpeg-finish", async (event: any) => {
        const { taskId, exitCode } = event.payload;
        const task = tasks.value.find((t) => t.id === taskId);
        if (task) {
          task.status = exitCode === 0 ? TaskStatus.Completed : TaskStatus.Error;
          task.completedAt = new Date();
          runningCount.value--;

          if (exitCode === 0 && task.outputFile && task.inputFile) {
            try { await invoke("preserve_file_times", { source: task.inputFile, dest: task.outputFile }); } catch { /* ignore */ }
          }
          playNotification(800, 0.15);

          tryStartNext();
        }
      })
    );

    unlisteners.push(
      await listen("ffmpeg-error", async (event: any) => {
        const { taskId, message, exitCode } = event.payload;
        const task = tasks.value.find((t) => t.id === taskId);
        if (task) {
          task.status = TaskStatus.Error;
          task.error = message || `退出码: ${exitCode}`;
          addTaskLog(taskId, task.error, true);
          runningCount.value--;

          if (task.outputFile) {
            try { await invoke("delete_file", { path: task.outputFile }); } catch { /* ignore */ }
          }
          playNotification(300, 0.3);

          tryStartNext();
        }
      })
    );

    unlisteners.push(
      await listen("add-independent-tasks", (event: any) => {
        const { tasks: newTasks } = event.payload;
        if (Array.isArray(newTasks)) {
          newTasks.forEach((t: { inputFile: string; outputFile: string; commandLine: string; presetId: string; cpuAffinity?: string }) => {
            addTask(t);
          });
        }
      })
    );
  }

  function cleanupEventListeners() {
    unlisteners.forEach((unlisten) => unlisten());
    unlisteners = [];
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
    reorderTasks,
    clearCompletedTasks,
    updateTaskProgress,
    addTaskLog,
    setupEventListeners,
    cleanupEventListeners,
  };
});
