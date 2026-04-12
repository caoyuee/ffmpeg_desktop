import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Task, TaskProgress } from "@/types/task";
import { TaskStatus } from "@/types/task";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const useTaskStore = defineStore("tasks", () => {
  const tasks = ref<Task[]>([]);
  const maxConcurrent = ref(1);
  const runningCount = ref(0);
  const currentTaskId = ref<string | null>(null);

  const pendingTasks = computed(() =>
    tasks.value.filter((t) => t.status === TaskStatus.Pending),
  );

  const processingTasks = computed(() =>
    tasks.value.filter((t) => t.status === TaskStatus.Processing),
  );

  function generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async function addTask(
    taskData: Omit<
      Task,
      "id" | "status" | "progress" | "logs" | "createdAt" | "elapsedTime"
    >,
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
    await tryStartNext();

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
      });

      task.pid = pid;
      runningCount.value++;
    } catch (error) {
      task.status = TaskStatus.Error;
      task.error = String(error);
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
        console.error("暂停任务失败:", error);
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
        console.error("恢复任务失败:", error);
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

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(
      (t) =>
        t.status !== TaskStatus.Completed && t.status !== TaskStatus.Stopped,
    );
  }

  async function tryStartNext() {
    if (runningCount.value >= maxConcurrent.value) return;

    const nextTask = tasks.value.find((t) => t.status === TaskStatus.Pending);
    if (nextTask) {
      await startTask(nextTask.id);
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
    await listen("ffmpeg-progress", (event: any) => {
      const { taskId, progress } = event.payload;
      updateTaskProgress(taskId, progress);
    });

    await listen("ffmpeg-finish", (event: any) => {
      const { taskId, exitCode } = event.payload;
      const task = tasks.value.find((t) => t.id === taskId);
      if (task) {
        task.status = exitCode === 0 ? TaskStatus.Completed : TaskStatus.Error;
        task.completedAt = new Date();
        runningCount.value--;
        tryStartNext();
      }
    });

    await listen("ffmpeg-error", (event: any) => {
      const { taskId, error } = event.payload;
      const task = tasks.value.find((t) => t.id === taskId);
      if (task) {
        task.status = TaskStatus.Error;
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
