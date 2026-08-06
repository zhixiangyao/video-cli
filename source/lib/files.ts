import { statSync, existsSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { join, parse, dirname, basename, relative } from 'node:path'

export async function globMp4FilesFlat(baseDir = '.'): Promise<string[]> {
  const results: string[] = []
  for await (const entry of glob('*.{mp4,MP4,Mp4}', { cwd: baseDir })) {
    results.push(entry)
  }
  return results
}

export async function globAllFiles(baseDir = '.'): Promise<string[]> {
  const results: string[] = []
  for await (const entry of glob('**/*', { cwd: baseDir })) {
    const full = join(baseDir, entry)
    try {
      if ((await stat(full)).isFile()) results.push(full)
    } catch {
      // ignore stat errors
    }
  }
  return results
}

export function fileExists(filepath: string): boolean {
  try {
    return existsSync(filepath) && statSync(filepath).isFile()
  } catch {
    return false
  }
}

export function dirExists(dirpath: string): boolean {
  try {
    return existsSync(dirpath) && statSync(dirpath).isDirectory()
  } catch {
    return false
  }
}

export function safeFileName(filename: string): string {
  if (filename.startsWith('-')) {
    return `./${filename}`
  }
  return filename
}

export { join, parse, dirname, basename, relative }
