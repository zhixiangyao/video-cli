import { Text } from 'ink'

type Props = {
  /** 完成百分比 0-100; null 表示总时长未知, 显示占位 */
  percent: number | null
  /** 进度条字符宽度 */
  width?: number
  /** 百分比后追加的信息, 如 "| 1.5x" (需自带前导空格) */
  extra?: string
}

export default function ProgressBar({ percent, width = 20, extra }: Props) {
  const clamped = percent === null ? 0 : Math.max(0, Math.min(100, percent))
  const filled = Math.round((clamped / 100) * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  const label = percent === null ? '--.-%' : `${clamped.toFixed(1)}%`

  return (
    <Text>
      {bar} {label}
      {extra ? ` ${extra}` : ''}
    </Text>
  )
}
