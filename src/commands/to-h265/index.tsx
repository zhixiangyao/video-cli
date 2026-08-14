import { Text } from 'ink'

import BackToMenu from '../../components/BackToMenu.tsx'
import Message from '../../components/Message.tsx'
import ProgressBar from '../../components/ProgressBar.tsx'
import TextInput from '../../components/TextInput.tsx'
import { useToH265 } from './useToH265.ts'

type Props = {
  onBack: () => void
}

export default function ToH265({ onBack }: Props) {
  const {
    step,
    modeInputError,
    modeInputKey,
    overwriteInputError,
    overwriteInputKey,
    handleFileChoice,
    handleModeChoice,
    handleOverwrite,
  } = useToH265()

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
        <Text color="yellow">⚠️ 此视频已是 H265/HEVC 编码, 无需转码.</Text>
        <BackToMenu onBack={onBack} />
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
        {modeInputError && <Text color="red">{modeInputError}</Text>}
        <TextInput key={modeInputKey} prompt="请输入选项 (1 或 2): " onSubmit={handleModeChoice} />
      </>
    )
  }

  if (step.type === 'confirm-overwrite') {
    return (
      <>
        <Text color="yellow">⚠️ 输出文件 '{step.outputFile}' 已存在.</Text>
        {overwriteInputError && <Text color="red">{overwriteInputError}</Text>}
        <TextInput key={overwriteInputKey} prompt="是否覆盖? (y/n): " onSubmit={handleOverwrite} />
      </>
    )
  }

  if (step.type === 'running') {
    const label = step.mode === 'cpu' ? 'CPU 软件转码 (libx265)' : 'GPU 硬件加速转码 (VAAPI)'
    const percent = step.durationMs !== null ? Math.min(100, (step.outTimeMs / step.durationMs) * 100) : null
    const speed = /^\d+(\.\d+)?x$/.test(step.speed) ? `| ${step.speed}` : ''
    return (
      <>
        <Text color="cyan">🚀 正在 {label}...</Text>
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
