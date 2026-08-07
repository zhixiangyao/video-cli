import { spawn } from 'node:child_process'
import { access, constants, mkdir, realpath, stat } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'

import { useEffect, useRef, useState } from 'react'

import { useValidatedInput } from '../../hooks/useValidatedInput.ts'
import { useYnConfirm } from '../../hooks/useYnConfirm.ts'
import { checkDiskType } from '../../lib/disk.ts'
import { dirname, globAllFiles } from '../../lib/files.ts'

const PROGRESS_INTERVAL_MS = 500

export type FileItem = {
  file: string
  rel: string
  dst: string
  size: number
}

export type Step =
  | { type: 'input-src' }
  | { type: 'input-dst'; src: string }
  | { type: 'scanning' }
  | { type: 'confirm'; src: string; dstDir: string; files: FileItem[]; totalSize: number }
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

/** 收集源中的文件: 源是文件则单文件, 是文件夹则递归收集; 过滤掉会写回自身的项 */
async function collectItems(src: string, dstDir: string): Promise<FileItem[]> {
  const st = await stat(src)

  if (st.isFile()) {
    const rel = basename(src)
    const dst = join(dstDir, rel)
    if (await isSamePath(src, dst)) return []
    return [{ file: src, rel, dst, size: st.size }]
  }

  const items: FileItem[] = []
  for (const filepath of await globAllFiles(src)) {
    try {
      const fst = await stat(filepath)
      if (!fst.isFile()) continue
      const rel = relative(src, filepath)
      const dst = join(dstDir, rel)
      if (await isSamePath(filepath, dst)) continue
      items.push({ file: filepath, rel, dst, size: fst.size })
    } catch {
      // 忽略无法读取的文件
    }
  }
  return items
}

async function isSamePath(a: string, b: string): Promise<boolean> {
  try {
    return (await realpath(a)) === (await realpath(b))
  } catch {
    return resolve(a) === resolve(b)
  }
}

/** 复制到机械硬盘 (copy-to-hdd) 的步骤状态机与拷贝逻辑 */
export function useCopyToHdd() {
  const [step, setStep] = useState<Step>({ type: 'input-src' })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pathInput = useValidatedInput()

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const handleSrcInput = async (answer: string) => {
    const src = answer.trim()
    if (!src) {
      pathInput.reject('错误: 必须输入源路径.')
      return
    }
    pathInput.accept()

    const st = await stat(src).catch(() => null)
    if (!st) {
      setStep({ type: 'error', message: `❌ 源不存在: ${src}` })
      return
    }
    if (!st.isFile() && !st.isDirectory()) {
      setStep({ type: 'error', message: `❌ 源既不是文件也不是文件夹: ${src}` })
      return
    }

    setStep({ type: 'input-dst', src })
  }

  const handleDstInput = async (answer: string) => {
    const current = step as { type: 'input-dst'; src: string }
    const dstDir = answer.trim()
    if (!dstDir) {
      pathInput.reject('错误: 必须输入目标文件夹路径.')
      return
    }
    pathInput.accept()

    // 1. 目标已存在时必须是文件夹
    const dstStat = await stat(dstDir).catch(() => null)
    if (dstStat && !dstStat.isDirectory()) {
      setStep({ type: 'error', message: `❌ 目标路径不是文件夹: ${dstDir}` })
      return
    }

    // 2. 不存在则创建
    if (!dstStat) {
      try {
        await mkdir(dstDir, { recursive: true })
      } catch {
        setStep({ type: 'error', message: `❌ 无法创建目标文件夹: ${dstDir}` })
        return
      }
    }

    // 3. 检查写权限
    try {
      await access(dstDir, constants.W_OK)
    } catch {
      setStep({ type: 'error', message: `❌ 目标文件夹没有写权限: ${dstDir}` })
      return
    }

    // 4. 检查目标是否位于机械硬盘
    const disk = await checkDiskType(dstDir)
    if (disk.kind !== 'hdd') {
      const reason =
        disk.kind === 'not-hdd'
          ? '目标磁盘不是机械硬盘 (SSD / 虚拟磁盘)'
          : disk.kind === 'not-disk'
            ? '目标不在本地磁盘 (可能是 tmpfs / 网络挂载)'
            : `无法检测目标磁盘: ${disk.message}`
      setStep({ type: 'error', message: `❌ ${reason}: ${dstDir}` })
      return
    }

    setStep({ type: 'scanning' })

    const items = await collectItems(current.src, dstDir)
    if (items.length === 0) {
      setStep({ type: 'error', message: '⚠️ 没有可复制的文件 (源为空, 或目标与源重叠).' })
      return
    }

    // 大文件优先: 每个文件串行顺序写入, 减少磁头寻道, 保持轨道顺滑
    items.sort((a, b) => b.size - a.size)
    const totalSize = items.reduce((sum, item) => sum + item.size, 0)

    setStep({ type: 'confirm', src: current.src, dstDir, files: items, totalSize })
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
      message: `🎉 复制完成! 源文件已保留. (复制 ${copied} 个, 跳过 ${skipped} 个, 失败 ${failed} 个)`,
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
