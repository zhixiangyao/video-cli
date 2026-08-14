import { useEffect, useRef, useState } from 'react'

import { useMp4Files } from '../../hooks/useMp4Files.ts'
import { useValidatedInput } from '../../hooks/useValidatedInput.ts'
import { useYnConfirm } from '../../hooks/useYnConfirm.ts'
import { getCodec, probeDuration, runFfmpeg, type FfmpegProgress } from '../../lib/ffmpeg.ts'
import { fileExists, parse } from '../../lib/files.ts'

export type Step =
  | { type: 'loading' }
  | { type: 'select-file'; files: string[] }
  | { type: 'checking-codec'; file: string }
  | { type: 'already-h265'; file: string; codec: string }
  | { type: 'choose-mode'; file: string; codec: string }
  | { type: 'confirm-overwrite'; file: string; outputFile: string; mode: string }
  | { type: 'running'; outputFile: string; mode: string; durationMs: number | null; outTimeMs: number; speed: string }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

/** 硬件转码至 H265 (to-h265) 的步骤状态机 */
export function useToH265() {
  const { files } = useMp4Files()
  const [step, setStep] = useState<Step>({ type: 'loading' })
  const checkingRef = useRef<string | null>(null)
  const modeInput = useValidatedInput()

  useEffect(() => {
    if (files) {
      setStep({ type: 'select-file', files })
    }
  }, [files])

  useEffect(() => {
    if (step.type !== 'checking-codec') return
    const file = step.file
    if (checkingRef.current === file) return
    checkingRef.current = file

    getCodec(file).then((codec) => {
      if (!codec) {
        setStep({ type: 'error', message: '❌ 视频格式分析失败.' })
        return
      }
      if (codec === 'hevc' || codec === 'h265') {
        setStep({ type: 'already-h265', file, codec })
      } else {
        setStep({ type: 'choose-mode', file, codec })
      }
    })
  }, [step])

  const handleFileChoice = (choice: string) => {
    const current = step as { type: 'select-file'; files: string[] }
    const idx = parseInt(choice, 10) - 1

    if (idx >= 0 && idx < current.files.length) {
      setStep({ type: 'checking-codec', file: current.files[idx]! })
    } else {
      setStep({ type: 'error', message: '无效的选择.' })
    }
  }

  const handleModeChoice = (choice: string) => {
    const current = step as { type: 'choose-mode'; file: string; codec: string }
    const trimmed = choice.trim()
    if (trimmed !== '1' && trimmed !== '2') {
      modeInput.reject('错误: 必须选择 1 (GPU) 或 2 (CPU).')
      return
    }
    modeInput.accept()
    const mode = trimmed === '2' ? 'cpu' : 'vaapi'
    const { name: baseName, ext } = parse(current.file)
    const outputFile = `${baseName}-H265${ext}`

    if (fileExists(outputFile)) {
      setStep({ type: 'confirm-overwrite', file: current.file, outputFile, mode })
    } else {
      runTranscode(current.file, outputFile, mode)
    }
  }

  const runTranscode = async (inputFile: string, outputFile: string, mode: string) => {
    const durationMs = await probeDuration(inputFile)
    setStep({ type: 'running', outputFile, mode, durationMs, outTimeMs: 0, speed: '' })

    const onProgress = (progress: FfmpegProgress) => {
      setStep((prev) => {
        if (prev.type === 'running') {
          return { ...prev, outTimeMs: progress.outTimeMs, speed: progress.speed }
        }
        return prev
      })
    }

    // -nostats 关闭 stderr 统计输出, -progress pipe:1 在 stdout 输出 key=value 进度
    const progressArgs = ['-nostats', '-progress', 'pipe:1', outputFile]

    try {
      if (mode === 'cpu') {
        await runFfmpeg(
          [
            '-y',
            '-i',
            inputFile,
            '-c:v',
            'libx265',
            '-crf',
            '22',
            '-preset',
            'medium',
            '-threads',
            '6',
            '-movflags',
            '+faststart',
            '-c:a',
            'copy',
            ...progressArgs,
          ],
          { onProgress },
        )
      } else {
        await runFfmpeg(
          [
            '-y',
            '-vaapi_device',
            '/dev/dri/renderD128',
            '-i',
            inputFile,
            '-vf',
            'format=nv12,hwupload',
            '-c:v',
            'hevc_vaapi',
            '-qp',
            '24',
            '-movflags',
            '+faststart',
            '-c:a',
            'copy',
            ...progressArgs,
          ],
          { onProgress, env: { LIBVA_DRIVER_NAME: 'iHD' } },
        )
      }
      setStep({ type: 'done', message: `🎉 转码完成! -> ${outputFile}` })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStep({ type: 'error', message: `❌ 转码失败: ${message}` })
    }
  }

  const overwrite = useYnConfirm({
    onConfirm: () => {
      const current = step as { type: 'confirm-overwrite'; file: string; outputFile: string; mode: string }
      runTranscode(current.file, current.outputFile, current.mode)
    },
    onCancel: () => setStep({ type: 'done', message: '🛒 操作已取消.' }),
  })

  return {
    step,
    modeInputError: modeInput.inputError,
    modeInputKey: modeInput.inputKey,
    overwriteInputError: overwrite.inputError,
    overwriteInputKey: overwrite.inputKey,
    handleFileChoice,
    handleModeChoice,
    handleOverwrite: overwrite.handleAnswer,
  }
}
