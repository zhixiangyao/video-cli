import { Text } from 'ink'

import BackToMenu from '../../components/BackToMenu.tsx'
import Message from '../../components/Message.tsx'
import ProgressBar from '../../components/ProgressBar.tsx'
import TextInput from '../../components/TextInput.tsx'
import { useCopyToHdd } from './useCopyToHdd.ts'

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatGB = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`

type Props = {
  onBack: () => void
}

export default function CopyToHdd({ onBack }: Props) {
  const {
    step,
    pathInputError,
    pathInputKey,
    confirmInputError,
    confirmInputKey,
    handleSrcInput,
    handleDstInput,
    handleConfirm,
  } = useCopyToHdd()

  if (step.type === 'input-src') {
    return (
      <>
        <Text color="cyan">📀 复制到机械硬盘 (串行拷贝, 保持轨道顺滑)</Text>
        {pathInputError && <Text color="red">{pathInputError}</Text>}
        <TextInput key={pathInputKey} prompt="源路径 (文件或文件夹): " onSubmit={handleSrcInput} />
      </>
    )
  }

  if (step.type === 'input-dst') {
    return (
      <>
        <Text>源: {step.src}</Text>
        {pathInputError && <Text color="red">{pathInputError}</Text>}
        <TextInput key={pathInputKey} prompt="目标文件夹路径: " onSubmit={handleDstInput} />
      </>
    )
  }

  if (step.type === 'scanning') {
    return <Text color="cyan">正在扫描源...</Text>
  }

  if (step.type === 'confirm') {
    return (
      <>
        <Text color="cyan">
          找到 {step.files.length} 个文件, 总计 {formatGB(step.totalSize)}
        </Text>
        <Text>源: {step.src}</Text>
        <Text>目标文件夹: {step.dstDir}</Text>
        {confirmInputError && <Text color="red">{confirmInputError}</Text>}
        <TextInput key={confirmInputKey} prompt="确认开始复制? (y/n): " onSubmit={handleConfirm} />
      </>
    )
  }

  if (step.type === 'running') {
    const item = step.files[step.index]!
    const percent = step.currentSize > 0 ? Math.min(100, (step.copiedBytes / step.currentSize) * 100) : 100
    const copiedCount = step.index - step.skipped - step.failed

    return (
      <>
        <Text color="cyan">📀 正在复制到机械硬盘...</Text>
        <Text color="yellow">
          [{step.index + 1}/{step.files.length}] {item.rel} ({formatMB(item.size)})
        </Text>
        <ProgressBar
          percent={percent}
          extra={step.speed > 0 ? `| ${(step.speed / 1024 / 1024).toFixed(1)} MB/s` : ''}
        />
        <Text color="gray">
          已复制 {copiedCount} 个, 跳过 {step.skipped} 个, 失败 {step.failed} 个
        </Text>
        {step.lastError ? <Text color="red">{step.lastError}</Text> : null}
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
