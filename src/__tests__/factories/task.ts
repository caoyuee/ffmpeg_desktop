import type { Task, TaskProgress } from '@/types/task'
import { TaskStatus } from '@/types/task'

export function createMockProgress(overrides: Partial<TaskProgress> = {}): TaskProgress {
  return {
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
    ...overrides,
  }
}

export function createMockTask(overrides: Partial<Task> = {}): Task {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  
  return {
    id: `task_${timestamp}_${random}`,
    inputPath: '/test/input.mp4',
    outputPath: '/test/output.mp4',
    commandLine: 'ffmpeg -i /test/input.mp4 -c:v libx264 -c:a aac /test/output.mp4',
    status: TaskStatus.Pending,
    progress: createMockProgress(),
    logs: {
      all: [],
      errors: [],
    },
    createdAt: new Date(),
    elapsedTime: 0,
    ...overrides,
  }
}

export function createMockTaskList(count: number = 3): Task[] {
  return Array.from({ length: count }, (_, index) => 
    createMockTask({
      id: `task_${index}_${Date.now()}`,
      inputPath: `/test/input_${index}.mp4`,
      outputPath: `/test/output_${index}.mp4`,
    })
  )
}
