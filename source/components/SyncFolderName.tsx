import { useState, useEffect } from 'react'
import { Text, Newline } from 'ink'
import TextInput from './TextInput.tsx'
import { globMp4Files, getDirectories, dirExists, join, dirname } from '../lib/files.ts'
import { rename } from 'node:fs/promises'

type Props = {
  onBack: () => void
}

type Step =
  | { type: 'scanning' }
  | { type: 'confirm'; items: SyncItem[] }
  | { type: 'running'; count: number }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

type SyncItem = { dir: string; newDirpath: string; dirname: string; videoBasename: string }

export default function SyncFolderName({ onBack }: Props) {
  const [step, setStep] = useState<Step>({ type: 'scanning' })

  useEffect(() => {
    scanDirs()
  }, [])

  const scanDirs = async () => {
    const directories = await getDirectories()
    directories.sort((a, b) => b.split('/').length - a.split('/').length)

    const items: SyncItem[] = []

    for (const dir of directories) {
      if (!dirExists(dir)) continue

      const subFiles = await globMp4Files(dir)
      const mp4Files = subFiles.filter((f) => /\.(mp4|MP4|Mp4)$/.test(f))
      if (mp4Files.length !== 1) continue

      const dirnameStr = dir.split('/').pop()!
      const parentdir = dirname(dir)
      const videoBasename = mp4Files[0]!
        .split('/')
        .pop()!
        .replace(/\.(mp4|MP4|Mp4)$/, '')

      if (videoBasename === dirnameStr) continue

      const newDirpath = join(parentdir, videoBasename)
      if (dirExists(newDirpath)) continue

      items.push({ dir, newDirpath, dirname: dirnameStr, videoBasename })
    }

    if (items.length === 0) {
      setStep({ type: 'error', message: '⚠️  没有需要同步的文件夹.' })
    } else {
      setStep({ type: 'confirm', items })
    }
  }

  const handleConfirm = async (answer: string) => {
    const current = step as { type: 'confirm'; items: SyncItem[] }

    if (!/^[Yy]$/.test(answer.trim())) {
      setStep({ type: 'done', message: '🛒 操作已取消.' })
      return
    }

    setStep({ type: 'running', count: current.items.length })

    for (const item of current.items) {
      await rename(item.dir, item.newDirpath)
    }

    setStep({ type: 'done', message: `🎉 同步完成! (处理了 ${current.items.length} 个文件夹)` })
  }

  if (step.type === 'scanning') {
    return <Text color="cyan">正在扫描当前目录中的文件夹...</Text>
  }

  if (step.type === 'confirm') {
    return (
      <>
        <Text color="cyan">找到 {step.items.length} 个文件夹需要同步:</Text>
        {step.items.map((item) => (
          <Text key={item.dir}>
            '{item.dirname}' → '{item.videoBasename}'
          </Text>
        ))}
        <TextInput prompt="确认同步? (y/N): " onSubmit={handleConfirm} />
      </>
    )
  }

  if (step.type === 'running') {
    return <Text color="yellow">正在同步 {step.count} 个文件夹...</Text>
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
