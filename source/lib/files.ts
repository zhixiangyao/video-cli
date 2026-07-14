import { globSync, statSync, existsSync } from 'node:fs'
import { join, parse, dirname, basename } from 'node:path'

export async function globMp4Files(baseDir = '.'): Promise<string[]> {
  return globSync('**/*.{mp4,MP4,Mp4}', { cwd: baseDir }).map((entry) => join(baseDir, entry))
}

export async function globMp4FilesFlat(baseDir = '.'): Promise<string[]> {
  return globSync('*.{mp4,MP4,Mp4}', { cwd: baseDir })
}

export async function getDirectories(baseDir = '.'): Promise<string[]> {
  return globSync('**/', { cwd: baseDir })
    .filter((entry) => entry !== baseDir)
    .map((entry) => join(baseDir, entry))
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

export { join, parse, dirname, basename }
