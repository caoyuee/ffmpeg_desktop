export enum TaskStatus {
  Pending = 0,
  Processing = 1,
  Paused = 2,
  Completed = 10,
  Stopped = 20,
  Error = 99,
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
  errorType?: "network" | "permission" | "not_found" | "invalid_input" | "process" | "unknown";
  cpuAffinity?: string;
  preserveFileTimes?: {
    creation: boolean;
    modification: boolean;
    access: boolean;
  };
}

export interface TaskQueueState {
  tasks: Task[];
  maxConcurrent: number;
  runningCount: number;
  currentTaskId: string | null;
}
