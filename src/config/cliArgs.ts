/**
 * R3.4：命令行集成的唯一解析层（纯函数，零 Tauri / Vue 依赖）。
 *
 * Rust `parse_startup_args` 只把原始 argv 透传回来，所有参数语义都在这里。
 * 兼容旧版 `-3fui_file` / `-3fuiVideoHelperInPointTime` / `-3fuiVideoHelperOutPointTime`
 * 与 `-ffmpeg` 透传段；main.ts 依据 CliPlan 走真实生效链路（导入预设 → 生成任务 → 入队）。
 */
export interface CliPlan {
  inputs: string[]
  presetFile: string | null
  outputFile: string | null
  watch: boolean
  ab: boolean
  help: boolean
  trimStart: string | null
  trimEnd: string | null
  unknown: string[]
}

export const CLI_SUPPORTED_OPTIONS = [
  '-i',
  '--input',
  '-p',
  '--preset',
  '-o',
  '--output',
  '--watch',
  '--ab',
  '--help',
  '-h',
  '-3fui_file',
  '-3fuiVideoHelperInPointTime',
  '-3fuiVideoHelperOutPointTime',
  '-ffmpeg',
] as const

function emptyPlan(): CliPlan {
  return {
    inputs: [],
    presetFile: null,
    outputFile: null,
    watch: false,
    ab: false,
    help: false,
    trimStart: null,
    trimEnd: null,
    unknown: [],
  }
}

/** 选项值不能吃掉下一个选项；路径可以带前导 '-' 以外任意字符。 */
function takeValue(argv: readonly string[], index: number): { value: string | null; next: number } {
  const candidate = argv[index + 1]
  if (typeof candidate !== 'string' || candidate === '' || candidate.startsWith('-')) {
    return { value: null, next: index + 1 }
  }
  return { value: candidate, next: index + 2 }
}

export function parseCliArgs(argv: readonly string[]): CliPlan {
  const plan = emptyPlan()
  if (!Array.isArray(argv)) return plan

  // argv[0] 是可执行文件名，永远不是用户输入。
  for (let i = 1; i < argv.length;) {
    const arg = argv[i]
    if (typeof arg !== 'string') {
      i += 1
      continue
    }

    if (arg === '-ffmpeg') {
      plan.unknown.push(...argv.slice(i + 1).filter((v): v is string => typeof v === 'string'))
      break
    }

    const valueFlags: Record<string, (value: string) => void> = {
      '-i': (v) => plan.inputs.push(v),
      '--input': (v) => plan.inputs.push(v),
      '-p': (v) => {
        plan.presetFile = v
      },
      '--preset': (v) => {
        plan.presetFile = v
      },
      '-3fui_file': (v) => {
        plan.presetFile = v
      },
      '-o': (v) => {
        plan.outputFile = v
      },
      '--output': (v) => {
        plan.outputFile = v
      },
      '-3fuiVideoHelperInPointTime': (v) => {
        plan.trimStart = v
      },
      '-3fuiVideoHelperOutPointTime': (v) => {
        plan.trimEnd = v
      },
    }

    const assign = valueFlags[arg]
    if (assign) {
      const taken = takeValue(argv, i)
      if (taken.value !== null) assign(taken.value)
      i = taken.next
      continue
    }

    if (arg === '--watch') plan.watch = true
    else if (arg === '--ab') plan.ab = true
    else if (arg === '--help' || arg === '-h') plan.help = true
    else if (arg.startsWith('-')) plan.unknown.push(arg)
    else plan.inputs.push(arg)
    i += 1
  }

  return plan
}

export function buildCliHelp(lang: 'zh-CN' | 'en-US'): string {
  if (lang === 'en-US') {
    return [
      'ffmpeg-desktop [options] [files...]',
      '  -i, --input <file>    media file to enqueue (repeatable)',
      '  -p, --preset <file>   preset share file (.ffpreset.json / legacy JSON)',
      '  -o, --output <file>   explicit output path (single input only)',
      '      --watch           start folder watch mode after import',
      '      --ab              open A/B compare for the first input',
      '      --help            show this help',
      'Legacy: -3fui_file, -3fuiVideoHelperInPointTime, -3fuiVideoHelperOutPointTime, -ffmpeg',
    ].join('\n')
  }
  return [
    'ffmpeg-desktop [选项] [文件...]',
    '  -i, --input <文件>    加入队列的媒体文件（可重复）',
    '  -p, --preset <文件>   预设分享文件（.ffpreset.json / 旧版 JSON）',
    '  -o, --output <文件>   显式输出路径（仅单个输入时生效）',
    '      --watch           导入后开启文件夹监控模式',
    '      --ab              为第一个输入打开 A/B 参数对比',
    '      --help            显示本帮助',
    '旧版兼容：-3fui_file、-3fuiVideoHelperInPointTime、-3fuiVideoHelperOutPointTime、-ffmpeg',
  ].join('\n')
}
