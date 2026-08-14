import { Box, Text } from 'ink'

import { useValidatedInput } from '../hooks/useValidatedInput.ts'
import TextInput from './TextInput.tsx'

type Props = {
  onSelect: (choice: string) => void
}

const MENU_ITEMS = [
  { key: '1', label: '裁剪视频片段(无损,不重新编码) (cut-video)' },
  { key: '2', label: '硬件转码为 H.265(体积更小) (to-h265)' },
  { key: '3', label: '复制到机械硬盘(串行拷贝,保持轨道顺滑) (copy-to-hdd)' },
  { key: '4', label: '退出程序' },
]

const VALID_KEYS = MENU_ITEMS.map((item) => item.key)

export default function Menu({ onSelect }: Props) {
  const { inputError, inputKey, reject, accept } = useValidatedInput()

  const handleSelect = (choice: string) => {
    const trimmed = choice.trim()
    if (VALID_KEYS.includes(trimmed)) {
      accept()
      onSelect(trimmed)
    } else {
      reject(`无效选项 "${trimmed}", 请输入 1-4`)
    }
  }

  return (
    <>
      <Text bold color="magenta">
        欢迎使用视频工具箱
      </Text>

      <Box flexDirection="column" paddingY={1}>
        {MENU_ITEMS.map((item) => (
          <Text key={item.key}>
            {item.key}) {item.label}
          </Text>
        ))}
      </Box>

      {inputError && <Text color="red">{inputError}</Text>}
      <TextInput key={inputKey} prompt="请选择功能 (1-4): " onSubmit={handleSelect} />
    </>
  )
}
