import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type ToolId = 'ffmpeg' | 'ffprobe' | 'ionice' | 'dd' | 'df' | 'lsblk'

export type ToolSpec = {
  id: ToolId
  /** 探测命令是否可用时使用的参数 */
  args: string[]
  /** 缺失时的安装提示 (Debian/Ubuntu) */
  installHint: string
}

export const TOOLS: Record<ToolId, ToolSpec> = {
  ffmpeg: { id: 'ffmpeg', args: ['-version'], installHint: 'sudo apt install ffmpeg' },
  ffprobe: { id: 'ffprobe', args: ['-version'], installHint: 'sudo apt install ffmpeg' },
  ionice: { id: 'ionice', args: ['--version'], installHint: 'sudo apt install util-linux' },
  dd: { id: 'dd', args: ['--version'], installHint: 'sudo apt install coreutils' },
  df: { id: 'df', args: ['--version'], installHint: 'sudo apt install coreutils' },
  lsblk: { id: 'lsblk', args: ['--version'], installHint: 'sudo apt install util-linux' },
}

async function checkTool(tool: ToolSpec): Promise<boolean> {
  try {
    await execFileAsync(tool.id, tool.args)
    return true
  } catch {
    return false
  }
}

/** 探测全部工具, 返回缺失工具的集合 */
export async function checkAllTools(): Promise<Set<ToolId>> {
  const results = await Promise.all(Object.values(TOOLS).map(async (tool) => ({ tool, ok: await checkTool(tool) })))
  const missing = new Set<ToolId>()
  for (const result of results) {
    if (!result.ok) missing.add(result.tool.id)
  }
  return missing
}
