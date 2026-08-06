import { Text } from 'ink'

import BackToMenu from '../../components/BackToMenu.tsx'
import TextInput from '../../components/TextInput.tsx'
import { useSyncToHdd } from './useSyncToHdd.ts'

const BAR_WIDTH = 20

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatGB = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`

type Props = {
  onBack: () => void
}

export default function SyncToHdd({ onBack }: Props) {
  const {
    step,
    pathInputError,
    pathInputKey,
    confirmInputError,
    confirmInputKey,
    handleSrcInput,
    handleDstInput,
    handleConfirm,
  } = useSyncToHdd()

  if (step.type === 'input-src') {
    return (
      <>
        <Text color="cyan">📀 机械硬盘优化同步 (串行拷贝, 保持轨道顺滑)</Text>
        {pathInputError && <Text color="red">{pathInputError}</Text>}
        <TextInput key={pathInputKey} prompt="源文件夹路径: " onSubmit={handleSrcInput} />
      </>
    )
  }

  if (step.type === 'input-dst') {
    return (
      <>
        <Text>源文件夹: {step.srcDir}</Text>
        {pathInputError && <Text color="red">{pathInputError}</Text>}
        <TextInput key={pathInputKey} prompt="目标文件夹路径: " onSubmit={handleDstInput} />
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
        {confirmInputError && <Text color="red">{confirmInputError}</Text>}
        <TextInput key={confirmInputKey} prompt="确认开始同步? (y/n): " onSubmit={handleConfirm} />
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
