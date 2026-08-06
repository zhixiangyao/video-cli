import { spawn } from 'node:child_process'
import { mkdir, stat } from 'node:fs/promises'

import { Text } from 'ink'
import { useEffect, useRef, useState } from 'react'

import { dirExists, globAllFiles, join, dirname, relative } from '../lib/files.ts'
import BackToMenu from './BackToMenu.tsx'
import TextInput from './TextInput.tsx'

const DEFAULT_SRC_DIR = '/home/yaozhixiang/downloads/学习资料'
const DEFAULT_DST_DIR = '/mnt/disk1'
const PROGRESS_INTERVAL_MS = 500
const BAR_WIDTH = 20

type Props = {
  onBack: () => void
}

type FileItem = {
  file: string
  rel: string
  dst: string
  size: number
}

type Step =
  | { type: 'input-src' }
  | { type: 'input-dst'; srcDir: string }
  | { type: 'scanning' }
  | { type: 'confirm'; srcDir: string; dstDir: string; files: FileItem[]; totalSize: number }
  | {
      type: 'running'
      files: FileItem[]
      index: number
      currentSize: number
      copiedBytes: number
      speed: number
      skipped: number
      failed: number
      lastError: string
    }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatGB = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`

export default function SyncToHdd({ onBack }: Props) {
  const [step, setStep] = useState<Step>({ type: 'input-src' })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const handleSrcInput = (answer: string) => {
    const srcDir = answer.trim() || DEFAULT_SRC_DIR

    if (!dirExists(srcDir)) {
      setStep({ type: 'error', message: `❌ 源文件夹不存在: ${srcDir}` })
      return
    }

    setStep({ type: 'input-dst', srcDir })
  }

  const handleDstInput = async (answer: string) => {
    const current = step as { type: 'input-dst'; srcDir: string }
    const dstDir = answer.trim() || DEFAULT_DST_DIR

    setStep({ type: 'scanning' })

    if (!dirExists(dstDir)) {
      await mkdir(dstDir, { recursive: true })
    }

    const items: FileItem[] = []
    for (const filepath of await globAllFiles(current.srcDir)) {
      try {
        const st = await stat(filepath)
        if (st.isFile()) {
          const rel = relative(current.srcDir, filepath)
          items.push({ file: filepath, rel, dst: join(dstDir, rel), size: st.size })
        }
      } catch {
        // 忽略无法读取的文件
      }
    }

    if (items.length === 0) {
      setStep({ type: 'error', message: '⚠️ 源文件夹内没有文件.' })
      return
    }

    // 大文件优先: 每个文件串行顺序写入, 减少磁头寻道, 保持轨道顺滑
    items.sort((a, b) => b.size - a.size)
    const totalSize = items.reduce((sum, item) => sum + item.size, 0)

    setStep({ type: 'confirm', srcDir: current.srcDir, dstDir, files: items, totalSize })
  }

  const handleConfirm = (answer: string) => {
    const current = step as { type: 'confirm'; files: FileItem[] }
    if (!/^[Yy]$/.test(answer.trim())) {
      setStep({ type: 'done', message: '🛒 操作已取消.' })
      return
    }

    runCopy(current.files)
  }

  const copyWithProgress = (filepath: string, dstFile: string, totalSize: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'ionice',
        ['-c', '3', 'dd', `if=${filepath}`, `of=${dstFile}`, 'bs=4M', 'conv=fsync', 'status=none'],
        { stdio: 'ignore' },
      )

      let lastBytes = 0
      let lastTime = performance.now()

      pollingRef.current = setInterval(() => {
        stat(dstFile)
          .then((st) => {
            const bytes = Math.min(st.size, totalSize)
            const now = performance.now()
            const speed = (bytes - lastBytes) / ((now - lastTime) / 1000)
            lastBytes = bytes
            lastTime = now
            setStep((prev) => {
              if (prev.type === 'running') {
                return { ...prev, copiedBytes: bytes, speed }
              }
              return prev
            })
          })
          .catch(() => {
            // 目标文件可能尚未创建
          })
      }, PROGRESS_INTERVAL_MS)

      child.on('close', (code) => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`dd 退出, 退出码 ${code}`))
        }
      })

      child.on('error', (err) => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        reject(err)
      })
    })
  }

  const runCopy = async (files: FileItem[]) => {
    let skipped = 0
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      const item = files[i]!

      // 目标已存在且大小一致则跳过 (支持断点续传)
      const dstStat = await stat(item.dst).catch(() => null)
      if (dstStat?.isFile() && dstStat.size === item.size) {
        skipped++
        continue
      }

      await mkdir(dirname(item.dst), { recursive: true })

      setStep({
        type: 'running',
        files,
        index: i,
        currentSize: item.size,
        copiedBytes: 0,
        speed: 0,
        skipped,
        failed,
        lastError: '',
      })

      try {
        await copyWithProgress(item.file, item.dst, item.size)
        setStep((prev) => {
          if (prev.type === 'running') {
            return { ...prev, copiedBytes: item.size }
          }
          return prev
        })
      } catch (err) {
        failed++
        setStep((prev) => {
          if (prev.type === 'running') {
            const message = err instanceof Error ? err.message : String(err)
            return { ...prev, skipped, failed, lastError: `❌ 复制失败: ${item.rel} (${message})` }
          }
          return prev
        })
      }
    }

    const copied = files.length - skipped - failed
    setStep({
      type: 'done',
      message: `🎉 同步完成! 源文件已保留. (复制 ${copied} 个, 跳过 ${skipped} 个, 失败 ${failed} 个)`,
    })
  }

  if (step.type === 'input-src') {
    return (
      <>
        <Text color="cyan">📀 机械硬盘优化同步 (串行拷贝, 保持轨道顺滑)</Text>
        <TextInput prompt={`源文件夹 (默认 ${DEFAULT_SRC_DIR}): `} onSubmit={handleSrcInput} />
      </>
    )
  }

  if (step.type === 'input-dst') {
    return (
      <>
        <Text>源文件夹: {step.srcDir}</Text>
        <TextInput prompt={`目标文件夹 (默认 ${DEFAULT_DST_DIR}): `} onSubmit={handleDstInput} />
      </>
    )
  }

  if (step.type === 'scanning') {
    return <Text color="cyan">正在扫描源文件夹...</Text>
  }

  if (step.type === 'confirm') {
    return (
      <>
        <Text color="cyan">
          找到 {step.files.length} 个文件, 总计 {formatGB(step.totalSize)}
        </Text>
        <Text>源文件夹: {step.srcDir}</Text>
        <Text>目标文件夹: {step.dstDir}</Text>
        <TextInput prompt="确认开始同步? (y/N): " onSubmit={handleConfirm} />
      </>
    )
  }

  if (step.type === 'running') {
    const item = step.files[step.index]!
    const percent = step.currentSize > 0 ? Math.min(100, (step.copiedBytes / step.currentSize) * 100) : 100
    const filled = Math.round((percent / 100) * BAR_WIDTH)
    const bar = '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
    const copiedCount = step.index - step.skipped - step.failed

    return (
      <>
        <Text color="cyan">📀 机械硬盘优化同步中...</Text>
        <Text color="yellow">
          [{step.index + 1}/{step.files.length}] {item.rel} ({formatMB(item.size)})
        </Text>
        <Text>
          {bar} {percent.toFixed(1)}%{step.speed > 0 ? ` | ${(step.speed / 1024 / 1024).toFixed(1)} MB/s` : ''}
        </Text>
        <Text color="gray">
          已复制 {copiedCount} 个, 跳过 {step.skipped} 个, 失败 {step.failed} 个
        </Text>
        {step.lastError ? <Text color="red">{step.lastError}</Text> : null}
      </>
    )
  }

  if (step.type === 'done') {
    return <BackToMenu message={step.message} color="green" onBack={onBack} />
  }

  if (step.type === 'error') {
    return <BackToMenu message={step.message} color="red" onBack={onBack} />
  }

  return null
}
