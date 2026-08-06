import { spawn } from 'node:child_process'
import { mkdir, stat } from 'node:fs/promises'

import { useEffect, useRef, useState } from 'react'

import { useValidatedInput } from '../../hooks/useValidatedInput.ts'
import { useYnConfirm } from '../../hooks/useYnConfirm.ts'
import { dirExists, dirname, globAllFiles, join, relative } from '../../lib/files.ts'

const PROGRESS_INTERVAL_MS = 500

export type FileItem = {
  file: string
  rel: string
  dst: string
  size: number
}

export type Step =
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

/** 机械硬盘优化同步 (sync-to-hdd) 的步骤状态机与拷贝逻辑 */
export function useSyncToHdd() {
  const [step, setStep] = useState<Step>({ type: 'input-src' })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pathInput = useValidatedInput()

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const handleSrcInput = (answer: string) => {
    const srcDir = answer.trim()
    if (!srcDir) {
      pathInput.reject('错误: 必须输入源文件夹路径.')
      return
    }
    pathInput.accept()

    if (!dirExists(srcDir)) {
      setStep({ type: 'error', message: `❌ 源文件夹不存在: ${srcDir}` })
      return
    }

    setStep({ type: 'input-dst', srcDir })
  }

  const handleDstInput = async (answer: string) => {
    const current = step as { type: 'input-dst'; srcDir: string }
    const dstDir = answer.trim()
    if (!dstDir) {
      pathInput.reject('错误: 必须输入目标文件夹路径.')
      return
    }
    pathInput.accept()

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

  const confirm = useYnConfirm({
    onConfirm: () => {
      const current = step as { type: 'confirm'; files: FileItem[] }
      runCopy(current.files)
    },
    onCancel: () => setStep({ type: 'done', message: '🛒 操作已取消.' }),
  })

  return {
    step,
    pathInputError: pathInput.inputError,
    pathInputKey: pathInput.inputKey,
    confirmInputError: confirm.inputError,
    confirmInputKey: confirm.inputKey,
    handleSrcInput,
    handleDstInput,
    handleConfirm: confirm.handleAnswer,
  }
}
