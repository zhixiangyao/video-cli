import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function checkCommand(cmd: string): Promise<boolean> {
  try {
    await execFileAsync(cmd, ['-version'])
    return true
  } catch {
    return false
  }
}

export type MissingDeps = { ffmpeg: boolean; ffprobe: boolean }

export async function checkDependencies(): Promise<MissingDeps> {
  const [ffmpeg, ffprobe] = await Promise.all([checkCommand('ffmpeg'), checkCommand('ffprobe')])
  return { ffmpeg: !ffmpeg, ffprobe: !ffprobe }
}

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
  onOutput?: (line: string) => void
  env?: Record<string, string>
}

export function runFfmpeg(args: string[], options?: FfmpegOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile('ffmpeg', args, {
      maxBuffer: 10 * 1024 * 1024,
      ...(options?.env ? { env: { ...process.env, ...options.env } } : {}),
    })

    if (options?.onOutput && child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        options.onOutput!(data.toString())
      })
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    child.on('error', reject)
  })
}
