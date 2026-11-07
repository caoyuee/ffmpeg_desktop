import type { PresetData } from '@/types/preset'
import { normalizePreset } from '@/config/presetSchema'
import { FFmpegCommandBuilder } from '@/utils/commandBuilder'
import { generateOutputPath } from '@/hooks/useFormatters'

/**
 * R3：唯一任务草稿层。
 *
 * R2 收敛后仍有五处（PrepareFiles / EncodingQueue 拖拽 / 独立面板 / 新功能）各自
 * 重复「generateOutputPath → FFmpegCommandBuilder.build → 组装 task 字段」。
 * 本模块把这条链路收敛为唯一入口，所有新功能（文件夹监控 / A/B / CLI / 工作台）
 * 只调用 createTaskDraft，杜绝参数与命令漂移。
 */
export interface TaskDraft {
  inputFile: string
  outputFile: string
  commandLine: string
  presetId: string
  cpuAffinity?: string
  preserveFileTimes?: {
    creation: boolean
    modification: boolean
    access: boolean
  }
}

/**
 * R1-7：输出目录决策的唯一入口（defaultOutputDir/customOutputDir 生效点）。
 * outputDir 来自 settingsStore.taskOutputDir；非空时覆盖 preset.output.location，
 * 命名与扩展名规则保持 preset 语义；空/空白回退既有行为。preset 读取其 output 对象，不做二次规范化。
 */
export function resolveOutputFile(
  preset: PresetData,
  inputFile: string,
  outputDir?: string,
): string {
  const dir = typeof outputDir === 'string' ? outputDir.trim() : ''
  if (dir === '') return generateOutputPath(inputFile, preset.output)
  if (preset.output && typeof preset.output === 'object') {
    return generateOutputPath(inputFile, { ...preset.output, location: dir })
  }
  return generateOutputPath(inputFile, dir)
}

export function createTaskDraft(
  preset: PresetData,
  inputFile: string,
  outputFile?: string,
  outputDir?: string,
): TaskDraft {
  // 深拷贝：调用方事后修改预设不会改写已生成的命令（R2.4 的规范派上用场）。
  const normalized = normalizePreset(preset)
  const output =
    outputFile && outputFile.trim() !== ''
      ? outputFile
      : resolveOutputFile(normalized, inputFile, outputDir)

  const draft: TaskDraft = {
    inputFile,
    outputFile: output,
    commandLine: FFmpegCommandBuilder.build(normalized, inputFile, output),
    presetId: normalized.id,
  }

  const affinity = normalized.decode?.cpuAffinity
  if (typeof affinity === 'string' && affinity.trim() !== '') draft.cpuAffinity = affinity

  const naming = normalized.output?.naming
  if (naming) {
    draft.preserveFileTimes = {
      creation: naming.preserveCreationTime === true,
      modification: naming.preserveModifyTime === true,
      access: naming.preserveAccessTime === true,
    }
  }
  return draft
}

export function createTaskDrafts(
  preset: PresetData,
  inputFiles: readonly string[],
  outputDir?: string,
): TaskDraft[] {
  const paths = Array.isArray(inputFiles) ? inputFiles : []
  return paths
    .filter((path): path is string => typeof path === 'string' && path.trim() !== '')
    .map((path) => createTaskDraft(preset, path, undefined, outputDir))
}

/** 参数页的命令预览：与真实任务共用同一构建链路，避免预览与实际入队漂移。 */
export function previewCommand(
  preset: PresetData,
  inputFile = 'input.mp4',
  outputFile = 'output.mp4',
): string {
  return createTaskDraft(preset, inputFile, outputFile).commandLine
}
