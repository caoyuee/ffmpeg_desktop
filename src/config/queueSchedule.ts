import { TaskStatus, type Task } from '@/types/task'
import type { TaskPriority } from '@/config/settings'

/**
 * P1-2 收尾：taskPriority 设置的消费层（纯函数）。
 *
 * 语义：设置里的 taskPriority 是「新建任务的默认优先级」——addTask 入队时从
 * 设置快照盖到任务上；调度时高优先级先启动，同级保持插入顺序（稳定）。
 * 脏值 / 缺失一律视为 normal，绝不抛错。
 */

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }
const KNOWN_PRIORITIES: readonly string[] = ['low', 'normal', 'high']

export function priorityRank(priority: unknown): number {
  return typeof priority === 'string' && KNOWN_PRIORITIES.includes(priority)
    ? PRIORITY_RANK[priority as TaskPriority]
    : PRIORITY_RANK['normal']
}

/** 在队列中挑选下一个应启动的 Pending 任务：优先级降序、插入序稳定。 */
export function pickNextPendingTask(tasks: readonly Task[]): Task | undefined {
  if (!Array.isArray(tasks)) return undefined

  let best: Task | undefined
  let bestRank = Number.POSITIVE_INFINITY
  for (const task of tasks) {
    if (!task || task.status !== TaskStatus.Pending) continue
    const rank = priorityRank(task.priority)
    if (rank < bestRank) {
      best = task
      bestRank = rank
    }
  }
  return best
}
