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

export type FfmpegOptions = {
  /** Called for every output line from ffmpeg (stderr) or stdout */
  onOutput?: (line: string, source?: 'stderr' | 'stdout') => void
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

    const pushLines = (data: Buffer | string, source: 'stderr' | 'stdout') => {
      const text = typeof data === 'string' ? data : data.toString()
      // accumulate stderr for diagnostics
      if (source === 'stderr') stderrAggregate += text
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        if (line.length === 0) continue
        try {
          options?.onOutput?.(line, source)
        } catch {
          // swallow user callback errors
        }
      }
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => pushLines(data, 'stderr'))
    }
    if (child.stdout) {
      child.stdout.on('data', (data) => pushLines(data, 'stdout'))
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
        const snippet = stderrAggregate ? `: ${stderrAggregate.slice(0, 1024)}` : ''
        reject(new Error(`ffmpeg exited with code ${code}${snippet}`))
      }
    })

    child.on('error', (err) => {
      if (options?.signal) options.signal.removeEventListener('abort', abortHandler)
      reject(err)
    })
  })
}
