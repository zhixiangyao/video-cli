import { useState, useEffect, useRef } from 'react'
import { Text, Newline } from 'ink'
import TextInput from './TextInput.tsx'
import BackToMenu from './BackToMenu.tsx'
import { globMp4FilesFlat, fileExists, safeFileName, parse } from '../lib/files.ts'
import { getCodec, runFfmpeg } from '../lib/ffmpeg.ts'

type Props = {
  onBack: () => void
}

type Step =
  | { type: 'loading' }
  | { type: 'select-file'; files: string[]; manual?: boolean }
  | { type: 'checking-codec'; file: string }
  | { type: 'already-h265'; file: string; codec: string }
  | { type: 'choose-mode'; file: string; codec: string }
  | { type: 'confirm-overwrite'; file: string; outputFile: string; mode: string }
  | { type: 'running'; outputFile: string; mode: string; output: string }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

export default function ToH265({ onBack }: Props) {
  const [step, setStep] = useState<Step>({ type: 'loading' })
  const checkingRef = useRef<string | null>(null)

  useEffect(() => {
    globMp4FilesFlat().then((files) => {
      setStep({ type: 'select-file', files })
    })
  }, [])

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
      const file = current.files[idx]!
      setStep({ type: 'checking-codec', file })
    } else if (idx === current.files.length) {
      setStep({ type: 'select-file', files: current.files, manual: true })
    } else {
      setStep({ type: 'error', message: '无效的选择.' })
    }
  }

  const handleManualFile = (file: string) => {
    if (file.trim().toLowerCase() === 'q') {
      onBack()
      return
    }
    const trimmed = safeFileName(file.trim())
    if (!fileExists(trimmed)) {
      setStep({ type: 'error', message: `错误: 文件 '${trimmed}' 不存在.` })
      return
    }
    setStep({ type: 'checking-codec', file: trimmed })
  }

  const handleModeChoice = async (choice: string) => {
    const current = step as { type: 'choose-mode'; file: string; codec: string }
    const mode = choice.trim() === '2' ? 'cpu' : 'vaapi'
    const { name: baseName, ext } = parse(current.file)
    const outputFile = `${baseName}-H265${ext}`

    if (fileExists(outputFile)) {
      setStep({ type: 'confirm-overwrite', file: current.file, outputFile, mode })
    } else {
      runTranscode(current.file, outputFile, mode)
    }
  }

  const handleOverwrite = (answer: string) => {
    const current = step as { type: 'confirm-overwrite'; file: string; outputFile: string; mode: string }
    if (/^[Yy]$/.test(answer.trim())) {
      runTranscode(current.file, current.outputFile, current.mode)
    } else {
      setStep({ type: 'done', message: '🛒 操作已取消.' })
    }
  }

  const runTranscode = async (inputFile: string, outputFile: string, mode: string) => {
    setStep({ type: 'running', outputFile, mode, output: '' })

    const onOutput = (line: string) => {
      setStep((prev) => {
        if (prev.type === 'running') {
          return { ...prev, output: prev.output + line }
        }
        return prev
      })
    }

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
            outputFile,
          ],
          { onOutput },
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
            outputFile,
          ],
          { onOutput, env: { LIBVA_DRIVER_NAME: 'iHD' } },
        )
      }
      setStep({ type: 'done', message: `🎉 转码完成! -> ${outputFile}` })
    } catch {
      setStep({ type: 'error', message: '❌ 转码失败. 请查看上方错误日志.' })
    }
  }

  if (step.type === 'loading') {
    return <Text>正在扫描当前目录的 .mp4 文件...</Text>
  }

  if (step.type === 'select-file') {
    if (step.manual) {
      return <TextInput prompt="请手动输入视频文件名(输入 q 返回上级): " onSubmit={handleManualFile} />
    }
    if (step.files.length === 0) {
      return (
        <>
          <Text color="red">❌ 当前目录没有 .mp4 文件.</Text>
          <TextInput prompt="请手动输入视频文件名(输入 q 返回上级): " onSubmit={handleManualFile} />
        </>
      )
    }
    return (
      <>
        <Text color="cyan">🎵 当前目录找到以下 .mp4 文件:</Text>
        {step.files.map((file, i) => (
          <Text key={file}>
            {i + 1}) {file}
          </Text>
        ))}
        <Text>{step.files.length + 1}) 手动输入文件名</Text>
        <TextInput prompt="请输入序号: " onSubmit={handleFileChoice} />
      </>
    )
  }

  if (step.type === 'checking-codec') {
    return <Text color="yellow">🔍 正在分析视频编码格式 [{step.file}]...</Text>
  }

  if (step.type === 'already-h265') {
    return (
      <>
        <Text>ℹ️ 当前视频编码: {step.codec}</Text>
        <Text color="yellow">⚠️ 此视频已是 H265/HEVC 编码，无需转码.</Text>
        <Newline />
        <TextInput prompt="按 Enter 返回菜单..." onSubmit={onBack} />
      </>
    )
  }

  if (step.type === 'choose-mode') {
    return (
      <>
        <Text>ℹ️ 当前视频编码: {step.codec}</Text>
        <Text color="cyan">选择编码压缩模式 / Select Encoding Mode:</Text>
        <Text>1) GPU 硬件加速 (VAAPI - 速度快/占用低)</Text>
        <Text>2) CPU 软件压缩 (libx265 - 耗时/质量极高/文件小)</Text>
        <TextInput prompt="请输入选项 (1 或 2, 默认为 1): " onSubmit={handleModeChoice} />
      </>
    )
  }

  if (step.type === 'confirm-overwrite') {
    return (
      <>
        <Text color="yellow">⚠️ 输出文件 '{step.outputFile}' 已存在.</Text>
        <TextInput prompt="是否覆盖? (y/N): " onSubmit={handleOverwrite} />
      </>
    )
  }

  if (step.type === 'running') {
    const label = step.mode === 'cpu' ? 'CPU 软件转码 (libx265)' : 'GPU 硬件加速转码 (VAAPI)'
    return (
      <>
        <Text color="green">🚀 开始{label}...</Text>
        <Text>🎬 输出文件: {step.outputFile}</Text>
        <Newline />
        <Text>{step.output}</Text>
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
