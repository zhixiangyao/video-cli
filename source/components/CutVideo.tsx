import { Text, Newline } from 'ink'
import { useState, useEffect } from 'react'

import { runFfmpeg } from '../lib/ffmpeg.ts'
import { globMp4FilesFlat, fileExists, parse } from '../lib/files.ts'
import BackToMenu from './BackToMenu.tsx'
import TextInput from './TextInput.tsx'

type Props = {
  onBack: () => void
}

type Step =
  | { type: 'loading' }
  | { type: 'select-file'; files: string[] }
  | { type: 'input-start-time'; file: string }
  | { type: 'confirm-overwrite'; file: string; outputFile: string; startTime: string }
  | { type: 'running'; outputFile: string; output: string }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

export default function CutVideo({ onBack }: Props) {
  const [step, setStep] = useState<Step>({ type: 'loading' })
  const [inputError, setInputError] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)

  useEffect(() => {
    globMp4FilesFlat().then((files) => {
      setStep({ type: 'select-file', files })
    })
  }, [])

  const handleFileChoice = (choice: string) => {
    const current = step as { type: 'select-file'; files: string[] }
    const idx = parseInt(choice, 10) - 1

    if (idx >= 0 && idx < current.files.length) {
      const file = current.files[idx]!
      setStep({ type: 'input-start-time', file })
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

  const handleOverwrite = (answer: string) => {
    const current = step as { type: 'confirm-overwrite'; file: string; outputFile: string; startTime: string }
    const trimmed = answer.trim()
    if (trimmed !== 'y' && trimmed !== 'Y' && trimmed !== 'n' && trimmed !== 'N') {
      setInputError('错误: 必须选择 y (是) 或 n (否).')
      setInputKey((k) => k + 1)
      return
    }
    setInputError(null)
    if (/^[Yy]$/.test(trimmed)) {
      runCut(current.file, current.outputFile, current.startTime)
    } else {
      setStep({ type: 'done', message: '🛒 操作已取消.' })
    }
  }

  const runCut = async (inputFile: string, outputFile: string, startTime: string) => {
    setStep({ type: 'running', outputFile, output: '' })

    try {
      await runFfmpeg(['-y', '-ss', startTime, '-i', inputFile, '-c', 'copy', outputFile], {
        onOutput: (line) => {
          setStep((prev) => {
            if (prev.type === 'running') {
              return { ...prev, output: prev.output + line }
            }
            return prev
          })
        },
      })
      setStep({ type: 'done', message: `🎉 视频裁剪完成! -> ${outputFile}` })
    } catch {
      setStep({ type: 'error', message: '❌ 操作失败. 请查看上方错误日志.' })
    }
  }

  if (step.type === 'loading') {
    return <Text>正在扫描当前目录的 .mp4 文件...</Text>
  }

  if (step.type === 'select-file') {
    if (step.files.length === 0) {
      return <BackToMenu message="❌ 当前目录没有 .mp4 文件." color="red" onBack={onBack} />
    }
    return (
      <>
        <Text color="cyan">🎵 当前目录找到以下 .mp4 文件:</Text>
        {step.files.map((file, i) => (
          <Text key={file}>
            {i + 1}) {file}
          </Text>
        ))}
        <TextInput prompt="请输入序号: " onSubmit={handleFileChoice} />
      </>
    )
  }

  if (step.type === 'input-start-time') {
    if (!step.file) {
      return <BackToMenu message="" onBack={onBack} />
    }
    return (
      <>
        <Text color="yellow">⏱️ 请输入裁剪起始时间 (例如 41, 00:00:41):</Text>
        <TextInput prompt={`✂️  裁剪起始时间 [${step.file}]: `} onSubmit={handleStartTime} />
      </>
    )
  }

  if (step.type === 'confirm-overwrite') {
    return (
      <>
        <Text color="yellow">⚠️ 输出文件 '{step.outputFile}' 已存在.</Text>
        {inputError && <Text color="red">{inputError}</Text>}
        <TextInput key={inputKey} prompt="是否覆盖? (y/n): " onSubmit={handleOverwrite} />
      </>
    )
  }

  if (step.type === 'running') {
    return (
      <>
        <Text color="green">🚀 开始无损裁剪... 输出文件: {step.outputFile}</Text>
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
