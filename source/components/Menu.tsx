import { Text } from 'ink'

import TextInput from './TextInput.tsx'

type Props = {
  onSelect: (choice: string) => void
}

const MENU_ITEMS = [
  { key: '1', label: '无损裁剪视频 (cut-video)' },
  { key: '2', label: '硬件转码至 H265 (to-h265)' },
  { key: '3', label: '批量添加编码后缀 (add-codec-suffix)' },
  { key: '4', label: '批量移除编码后缀 (remove-codec-suffix)' },
  { key: '5', label: '同步文件夹名与视频名 (sync-folder-name)' },
  { key: '6', label: '退出' },
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
      <TextInput prompt="请选择功能 (1-6): " onSubmit={onSelect} />
    </>
  )
}
