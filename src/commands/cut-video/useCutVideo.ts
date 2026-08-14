import { useEffect, useState } from 'react'

import { useMp4Files } from '../../hooks/useMp4Files.ts'
import { useYnConfirm } from '../../hooks/useYnConfirm.ts'
import { parseTimeToMs, probeDuration, runFfmpeg, type FfmpegProgress } from '../../lib/ffmpeg.ts'
import { fileExists, parse } from '../../lib/files.ts'

export type Step =
  | { type: 'loading' }
  | { type: 'select-file'; files: string[] }
  | { type: 'input-start-time'; file: string }
  | { type: 'confirm-overwrite'; file: string; outputFile: string; startTime: string }
  | { type: 'running'; outputFile: string; durationMs: number | null; outTimeMs: number; speed: string }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

/** 无损裁剪 (cut-video) 的步骤状态机 */
export function useCutVideo() {
  const { files } = useMp4Files()
  const [step, setStep] = useState<Step>({ type: 'loading' })

  useEffect(() => {
    if (files) {
      setStep({ type: 'select-file', files })
    }
  }, [files])

  const handleFileChoice = (choice: string) => {
    const current = step as { type: 'select-file'; files: string[] }
    const idx = parseInt(choice, 10) - 1

    if (idx >= 0 && idx < current.files.length) {
      setStep({ type: 'input-start-time', file: current.files[idx]! })
    } else {
      setStep({ type: 'error', message: '无效的选择.' })
    }
  }

  const handleStartTime = (startTime: string) => {
    const current = step as { type: 'input-start-time'; file: string }
    if (!startTime.trim()) {
      setStep({ type: 'error', message: '错误: 起始时间不能为空.' })
      return
    }
    const { name: baseName, ext } = parse(current.file)
    const outputFile = `${baseName}-cutted${ext}`

    if (fileExists(outputFile)) {
      setStep({ type: 'confirm-overwrite', file: current.file, outputFile, startTime: startTime.trim() })
    } else {
      runCut(current.file, outputFile, startTime.trim())
    }
  }

  const runCut = async (inputFile: string, outputFile: string, startTime: string) => {
    const inputDurationMs = await probeDuration(inputFile)
    const startMs = parseTimeToMs(startTime)
    // 裁剪后时长 ≈ 原时长 - 起始时间 (fast seek 会偏移少量, 仅用于估算进度)
    const durationMs = inputDurationMs !== null && startMs !== null ? Math.max(0, inputDurationMs - startMs) : null
    setStep({ type: 'running', outputFile, durationMs, outTimeMs: 0, speed: '' })

    const onProgress = (progress: FfmpegProgress) => {
      setStep((prev) => {
        if (prev.type === 'running') {
          return { ...prev, outTimeMs: progress.outTimeMs, speed: progress.speed }
        }
        return prev
      })
    }

    try {
      await runFfmpeg(
        ['-y', '-ss', startTime, '-i', inputFile, '-c', 'copy', '-nostats', '-progress', 'pipe:1', outputFile],
        { onProgress },
      )
      setStep({ type: 'done', message: `🎉 视频裁剪完成! -> ${outputFile}` })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStep({ type: 'error', message: `❌ 操作失败: ${message}` })
    }
  }

  const overwrite = useYnConfirm({
    onConfirm: () => {
      const current = step as { type: 'confirm-overwrite'; file: string; outputFile: string; startTime: string }
      runCut(current.file, current.outputFile, current.startTime)
    },
    onCancel: () => setStep({ type: 'done', message: '🛒 操作已取消.' }),
  })

  return {
    step,
    inputError: overwrite.inputError,
    inputKey: overwrite.inputKey,
    handleFileChoice,
    handleStartTime,
    handleOverwrite: overwrite.handleAnswer,
  }
}
