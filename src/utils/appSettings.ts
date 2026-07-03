import type { LanguageCode } from "@/i18n";
import type { ThemeMode } from "@/store/settingStore";

export type FailedOutputDeleteMode = "mp4" | "all" | "never";

export interface AppSettings {
  language: LanguageCode;
  theme: ThemeMode;
  autoCheckUpdate: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  ffmpegPath: string;
  ffprobePath: string;
  maxConcurrentTasks: number;
  taskPriority: string;
  defaultOutputDir: string;
  customOutputDir: string;
  autoOpenOutputFolder: boolean;
  showNotification: boolean;
  playSound: boolean;
  failedOutputDeleteMode: FailedOutputDeleteMode;
  presetDir: string;
  logRetentionDays: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: "zh-CN",
  theme: "system",
  autoCheckUpdate: true,
  minimizeToTray: false,
  closeToTray: false,
  ffmpegPath: "",
  ffprobePath: "",
  maxConcurrentTasks: 2,
  taskPriority: "normal",
  defaultOutputDir: "same",
  customOutputDir: "",
  autoOpenOutputFolder: false,
  showNotification: true,
  playSound: false,
  failedOutputDeleteMode: "mp4",
  presetDir: "",
  logRetentionDays: 30,
};

function clampConcurrentTasks(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_APP_SETTINGS.maxConcurrentTasks;
  return Math.min(Math.max(parsed, 1), 8);
}

function normalizeFailedOutputDeleteMode(value: unknown): FailedOutputDeleteMode {
  if (value === "mp4" || value === "all" || value === "never") {
    return value;
  }
  return DEFAULT_APP_SETTINGS.failedOutputDeleteMode;
}

export function loadAppSettings(): AppSettings {
  const saved = localStorage.getItem("appSettings");
  if (!saved) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      maxConcurrentTasks: clampConcurrentTasks(parsed.maxConcurrentTasks),
      failedOutputDeleteMode: normalizeFailedOutputDeleteMode(parsed.failedOutputDeleteMode),
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem("appSettings", JSON.stringify(settings));
}
