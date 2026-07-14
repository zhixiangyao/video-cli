import { useState, useEffect } from 'react'
import { Text, Newline } from 'ink'
import TextInput from './TextInput.tsx'
import { globMp4Files, getDirectories, fileExists, dirExists, join, parse, dirname, basename } from '../lib/files.ts'
import { rename } from 'node:fs/promises'

type Props = {
  onBack: () => void
}

type Step =
  | { type: 'scanning' }
  | { type: 'confirm'; fileItems: RenameItem[]; dirItems: DirRenameItem[] }
  | { type: 'running'; fileCount: number; dirCount: number }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

type RenameItem = { filepath: string; newFilepath: string }
type DirRenameItem = { dir: string; newDirpath: string }

export default function RemoveCodecSuffix({ onBack }: Props) {
  const [step, setStep] = useState<Step>({ type: 'scanning' })

  useEffect(() => {
    scanFilesAndDirs()
  }, [])

  const scanFilesAndDirs = async () => {
    const files = await globMp4Files()

    // Process files
    const fileItems: RenameItem[] = []
    for (const filepath of files) {
      const { name: basenameStr, ext } = parse(filepath)
      const match = basenameStr.match(/^(.+?)(-[Hh]26[45])$/)
      if (!match) continue

      const newFilepath = join(dirname(filepath), `${match[1]}${ext}`)
      if (fileExists(newFilepath)) continue

      fileItems.push({ filepath, newFilepath })
    }

    // Process directories
    const directories = await getDirectories()
    directories.sort((a, b) => b.split('/').length - a.split('/').length)

    const dirItems: DirRenameItem[] = []
    for (const dir of directories) {
      if (!dirExists(dir)) continue

      const dirnameStr = basename(dir)
      const parentdir = dirname(dir)
      const dirMatch = dirnameStr.match(/^(.+?)(-[Hh]26[45])$/)
      if (!dirMatch) continue

      const subFiles = await globMp4Files(dir)
      const mp4Files = subFiles.filter((f) => /\.(mp4|MP4|Mp4)$/.test(f))
      if (mp4Files.length !== 1) continue

      const newDirpath = join(parentdir, dirMatch[1]!)
      if (dirExists(newDirpath)) continue

      dirItems.push({ dir, newDirpath })
    }

    if (fileItems.length === 0 && dirItems.length === 0) {
      setStep({ type: 'error', message: '⚠️  未找到需要移除编码后缀的文件或文件夹.' })
    } else {
      setStep({ type: 'confirm', fileItems, dirItems })
    }
  }

  const handleConfirm = async (answer: string) => {
    const current = step as { type: 'confirm'; fileItems: RenameItem[]; dirItems: DirRenameItem[] }

    if (!/^[Yy]$/.test(answer.trim())) {
      setStep({ type: 'done', message: '🛒 操作已取消.' })
      return
    }

    setStep({ type: 'running', fileCount: current.fileItems.length, dirCount: current.dirItems.length })

    for (const item of current.fileItems) {
      await rename(item.filepath, item.newFilepath)
    }

    for (const item of current.dirItems) {
      await rename(item.dir, item.newDirpath)
    }

    setStep({
      type: 'done',
      message: `🎉 移除任务完成! (处理了 ${current.fileItems.length} 个文件, ${current.dirItems.length} 个文件夹)`,
    })
  }

  if (step.type === 'scanning') {
    return <Text color="cyan">正在扫描当前目录中的视频和文件夹...</Text>
  }

  if (step.type === 'confirm') {
    return (
      <>
        {step.fileItems.length > 0 && (
          <>
            <Text color="cyan">找到 {step.fileItems.length} 个文件需要移除编码后缀:</Text>
            {step.fileItems.map((item) => (
              <Text key={item.filepath}>
                '{item.filepath}' → '{item.newFilepath}'
              </Text>
            ))}
          </>
        )}
        {step.dirItems.length > 0 && (
          <>
            <Text color="cyan">找到 {step.dirItems.length} 个文件夹需要移除编码后缀:</Text>
            {step.dirItems.map((item) => (
              <Text key={item.dir}>
                '{item.dir}' → '{item.newDirpath}'
              </Text>
            ))}
          </>
        )}
        <TextInput prompt="确认移除? (y/N): " onSubmit={handleConfirm} />
      </>
    )
  }

  if (step.type === 'running') {
    return (
      <Text color="yellow">
        正在处理... ({step.fileCount} 个文件, {step.dirCount} 个文件夹)
      </Text>
    )
  }

  if (step.type === 'error') {
    return (
      <>
        <Text color="red">{step.message}</Text>
        <Newline />
        <TextInput prompt="按 Enter 返回菜单..." onSubmit={onBack} />
      </>
    )
  }

  if (step.type === 'done') {
    return (
      <>
        <Text color="green">{step.message}</Text>
        <Newline />
        <TextInput prompt="按 Enter 返回菜单..." onSubmit={onBack} />
      </>
    )
  }

  return null
}
