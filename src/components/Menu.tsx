import { Text } from 'ink'

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

export default function Menu({ onSelect }: Props) {
  return (
    <>
      <Text bold color="magenta">
        欢迎使用视频工具箱
      </Text>
      <Text>---------------------------------</Text>
      {MENU_ITEMS.map((item) => (
        <Text key={item.key}>
          {item.key}) {item.label}
        </Text>
      ))}
      <TextInput prompt="请选择功能 (1-4): " onSubmit={onSelect} />
    </>
  )
}
