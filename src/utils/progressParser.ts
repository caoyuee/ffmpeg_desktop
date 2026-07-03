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
      if (key === "size") {
        result.size = match[1] + match[2];
      } else if (key === "quality") {
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

  const timeParts = match[1].split(":");
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  const seconds = parseFloat(timeParts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}

export function calculateProgress(
  currentTime: number,
  totalTime: number,
): number {
  if (totalTime <= 0) return 0;
  return Math.min((currentTime / totalTime) * 100, 100);
}

export function estimateRemainingTime(
  currentTime: number,
  totalTime: number,
  speed: number,
): number {
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
