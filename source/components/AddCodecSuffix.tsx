import { rename } from 'node:fs/promises'

import { Text } from 'ink'
import { useState, useEffect } from 'react'

import { getCodec } from '../lib/ffmpeg.ts'
import { globMp4Files, getDirectories, fileExists, dirExists, join, parse, dirname } from '../lib/files.ts'
import BackToMenu from './BackToMenu.tsx'
import TextInput from './TextInput.tsx'

type Props = {
  onBack: () => void
}

type Step =
  | { type: 'scanning' }
  | { type: 'input-concurrency'; fileCount: number }
  | { type: 'probing'; total: number; done: number }
  | { type: 'renaming'; items: RenameItem[]; done: number }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

type RenameItem = {
  filepath: string
  filedir: string
  basename: string
  ext: string
  suffix: string
}

export default function AddCodecSuffix({ onBack }: Props) {
  const [step, setStep] = useState<Step>({ type: 'scanning' })

  useEffect(() => {
    globMp4Files().then((files) => {
      if (files.length === 0) {
        setStep({ type: 'error', message: '⚠️  未找到 .mp4 文件.' })
      } else {
        setStep({ type: 'input-concurrency', fileCount: files.length })
      }
    })
  }, [])

  const handleConcurrency = async (input: string) => {
    const concurrency = Math.max(1, parseInt(input, 10) || 4)
    const files = await globMp4Files()
    setStep({ type: 'probing', total: files.length, done: 0 })

    const probeResults: (RenameItem | null)[] = []

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(async (filepath) => {
          const { name: basename, ext } = parse(filepath)
          const filedir = dirname(filepath)

          if (/[Hh]26[45]/.test(basename)) return null

          const codec = await getCodec(filepath)
          if (!codec) {
            return null
          }

          let suffix = ''
          if (codec === 'h264') {
            suffix = '-H264'
          } else if (codec === 'hevc' || codec === 'h265') {
            suffix = '-H265'
          } else {
            return null
          }

          return { filepath, filedir, basename, ext, suffix }
        }),
      )
      probeResults.push(...batchResults)
      setStep((prev) => {
        if (prev.type === 'probing') {
          return { ...prev, done: Math.min(prev.total, prev.done + batch.length) }
        }
        return prev
      })
    }

    const validItems = probeResults.filter((item): item is RenameItem => item !== null)

    // Rename files
    const renameItems = []
    for (const item of validItems) {
      const newFilename = `${item.basename}${item.suffix}${item.ext}`
      const newFilepath = join(item.filedir, newFilename)
      if (fileExists(newFilepath)) {
        continue
      }
      await rename(item.filepath, newFilepath)
      renameItems.push(item)
    }

    // Process directories
    const directories = await getDirectories()
    directories.sort((a, b) => b.split('/').length - a.split('/').length)

    let dirCount = 0
    for (const dir of directories) {
      if (!dirExists(dir)) continue

      const dirnameStr = dir.split('/').pop()!
      const parentdir = dirname(dir)

      if (/[Hh]26[45]/.test(dirnameStr)) continue

      const subFiles = await globMp4Files(dir)
      const encodedFiles = subFiles.filter((f) => /-H264\.(mp4|MP4|Mp4)$/.test(f) || /-H265\.(mp4|MP4|Mp4)$/.test(f))

      if (encodedFiles.length !== 1) continue

      const mp4File = encodedFiles[0]!
      const mp4Filename = mp4File.split('/').pop()!
      const mp4FilenameNoExt = mp4Filename.replace(/\.(mp4|MP4|Mp4)$/, '')
      const videoBaseName = mp4FilenameNoExt.replace(/-[Hh]26[45]$/, '')

      if (videoBaseName !== dirnameStr) continue

      let suffix = ''
      if (/-H264\.(mp4|MP4|Mp4)$/.test(mp4File)) {
        suffix = '-H264'
      } else if (/-H265\.(mp4|MP4|Mp4)$/.test(mp4File)) {
        suffix = '-H265'
      }

      const newDirpath = join(parentdir, `${dirnameStr}${suffix}`)
      if (dirExists(newDirpath)) continue

      await rename(dir, newDirpath)
      dirCount++
    }

    setStep({ type: 'done', message: `🎉 重命名任务完成! (处理了 ${validItems.length} 个文件, ${dirCount} 个文件夹)` })
  }

  if (step.type === 'scanning') {
    return <Text color="cyan">正在扫描当前目录中的视频和文件夹...</Text>
  }

  if (step.type === 'input-concurrency') {
    return (
      <>
        <Text color="cyan">找到 {step.fileCount} 个 .mp4 文件.</Text>
        <TextInput prompt="请输入并发探测数量 (默认 4, 越大越快但越占资源): " onSubmit={handleConcurrency} />
      </>
    )
  }

  if (step.type === 'probing') {
    return (
      <Text color="yellow">
        🔍 正在分析视频编码... ({step.done}/{step.total})
      </Text>
    )
  }

  if (step.type === 'error') {
    return <BackToMenu message={step.message} color="red" onBack={onBack} />
  }

  if (step.type === 'done') {
    return <BackToMenu message={step.message} color="green" onBack={onBack} />
  }

  return null
}
