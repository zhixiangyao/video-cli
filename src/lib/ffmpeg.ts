import { execFile, ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getCodec(filepath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filepath,
    ])
    return stdout.trim().toLowerCase() || null
  } catch {
    return null
  }
}

/** 把 "41" / "00:00:41" / "1:02:03.5" 解析为毫秒, 失败返回 null */
export function parseTimeToMs(input: string): number | null {
  const parts = input.trim().split(':')
  if (parts.length === 0 || parts.length > 3) return null
  let seconds = 0
  for (const part of parts) {
    const n = parseFloat(part)
    if (!Number.isFinite(n)) return null
    seconds = seconds * 60 + n
  }
  return Math.round(seconds * 1000)
}

/** 用 ffprobe 读取视频时长, 返回毫秒; 失败返回 null */
export async function probeDuration(filepath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filepath,
    ])
    const seconds = parseFloat(stdout.trim())
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null
  } catch {
    return null
  }
}

/** -progress pipe:1 输出的进度快照 */
export type FfmpegProgress = {
  /** 已编码/复用的输出时间, 毫秒 */
  outTimeMs: number
  /** ffmpeg 报告的实时速度, 如 "1.45x" */
  speed: string
}

export type FfmpegOptions = {
  /** 需配合 -progress pipe:1 参数, 每个统计周期回调一次 */
  onProgress?: (progress: FfmpegProgress) => void
  env?: Record<string, string>
  signal?: AbortSignal
}

export function runFfmpeg(args: string[], options?: FfmpegOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = execFile('ffmpeg', args, {
      maxBuffer: 10 * 1024 * 1024,
      ...(options?.env ? { env: { ...process.env, ...options.env } } : {}),
    })

    let stderrAggregate = ''
    let lastSpeed = ''
    const PROGRESS_KEY_RE = /^([a-z0-9_]+)=(.+)$/

    const handleStdoutData = (data: Buffer | string) => {
      if (!options?.onProgress) return
      const text = typeof data === 'string' ? data : data.toString()
      for (const line of text.split(/\r?\n/)) {
        const match = PROGRESS_KEY_RE.exec(line)
        if (!match) continue
        const key = match[1]!
        const value = match[2]!
        if (key === 'speed') {
          lastSpeed = value
        } else if (key === 'out_time') {
          // 用 out_time 字符串 (HH:MM:SS.ffffff) 而非 out_time_ms:
          // ffmpeg 6.x 的 out_time_ms 实际输出的是微秒, 语义跨版本不可靠
          const outTimeMs = parseTimeToMs(value)
          if (outTimeMs === null) continue
          try {
            options.onProgress({ outTimeMs, speed: lastSpeed })
          } catch {
            // 忽略回调异常
          }
        }
      }
    }

    const handleStderrData = (data: Buffer | string) => {
      // 累积 stderr 用于失败诊断
      stderrAggregate += typeof data === 'string' ? data : data.toString()
    }

    if (child.stderr) {
      child.stderr.on('data', handleStderrData)
    }
    if (child.stdout) {
      child.stdout.on('data', handleStdoutData)
    }

    const abortHandler = () => {
      try {
        child.kill()
      } catch {
        // ignore
      }
    }

    if (options?.signal) {
      if (options.signal.aborted) abortHandler()
      else options.signal.addEventListener('abort', abortHandler, { once: true })
    }

    child.on('close', (code) => {
      if (options?.signal) options.signal.removeEventListener('abort', abortHandler)
      if (code === 0) {
        resolve()
      } else {
        // 取 stderr 末尾几行作为错误原因 (头部通常是 banner / 编码配置)
        const tail = stderrAggregate.trim().split(/\r?\n/).filter(Boolean).slice(-3).join('; ')
        reject(new Error(`ffmpeg exited with code ${code}${tail ? `: ${tail}` : ''}`))
      }
    })

    child.on('error', (err) => {
      if (options?.signal) options.signal.removeEventListener('abort', abortHandler)
      reject(err)
    })
  })
}
