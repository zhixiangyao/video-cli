import { statSync, existsSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { join, parse, dirname, basename } from 'node:path'

export async function globMp4Files(baseDir = '.'): Promise<string[]> {
  const results: string[] = []
  for await (const entry of glob('**/*.{mp4,MP4,Mp4}', { cwd: baseDir })) {
    results.push(join(baseDir, entry))
  }
  return results
}

export async function globMp4FilesFlat(baseDir = '.'): Promise<string[]> {
  const results: string[] = []
  for await (const entry of glob('*.{mp4,MP4,Mp4}', { cwd: baseDir })) {
    results.push(entry)
  }
  return results
}

export async function getDirectories(baseDir = '.'): Promise<string[]> {
  const results: string[] = []
  for await (const entry of glob('**', { cwd: baseDir, withFileTypes: true })) {
    if (entry.isDirectory()) {
      const path = join(baseDir, entry.name)
      if (path !== baseDir) results.push(path)
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

export { join, parse, dirname, basename }
