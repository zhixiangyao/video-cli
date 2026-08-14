import { Text } from 'ink'

import BackToMenu from '../../components/BackToMenu.tsx'
import Message from '../../components/Message.tsx'
import ProgressBar from '../../components/ProgressBar.tsx'
import TextInput from '../../components/TextInput.tsx'
import { useCutVideo } from './useCutVideo.ts'

type Props = {
  onBack: () => void
}

export default function CutVideo({ onBack }: Props) {
  const { step, inputError, inputKey, handleFileChoice, handleStartTime, handleOverwrite } = useCutVideo()

  if (step.type === 'loading') {
    return <Text>正在扫描当前目录的 .mp4 文件...</Text>
  }

  if (step.type === 'select-file') {
    if (step.files.length === 0) {
      return (
        <>
          <Message tone="error">❌ 当前目录没有 .mp4 文件.</Message>
          <BackToMenu onBack={onBack} />
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
        <TextInput key="select-file" prompt="请输入序号: " onSubmit={handleFileChoice} />
      </>
    )
  }

  if (step.type === 'input-start-time') {
    if (!step.file) {
      return <BackToMenu onBack={onBack} />
    }
    return (
      <>
        <Text color="yellow">⏱️ 请输入裁剪起始时间 (例如 41, 00:00:41):</Text>
        <TextInput key="input-start-time" prompt={`✂️  裁剪起始时间 [${step.file}]: `} onSubmit={handleStartTime} />
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
    const percent = step.durationMs !== null ? Math.min(100, (step.outTimeMs / step.durationMs) * 100) : null
    const speed = /^\d+(\.\d+)?x$/.test(step.speed) ? `| ${step.speed}` : ''
    return (
      <>
        <Text color="cyan">🚀 正在无损裁剪...</Text>
        <Text>🎬 输出文件: {step.outputFile}</Text>
        <ProgressBar percent={percent} extra={speed} />
      </>
    )
  }

  if (step.type === 'done') {
    return (
      <>
        <Message tone="success">{step.message}</Message>
        <BackToMenu onBack={onBack} />
      </>
    )
  }

  if (step.type === 'error') {
    return (
      <>
        <Message tone="error">{step.message}</Message>
        <BackToMenu onBack={onBack} />
      </>
    )
  }

  return null
}
