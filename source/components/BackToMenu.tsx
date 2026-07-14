import { Text, Newline } from 'ink'
import TextInput from './TextInput.tsx'

type Props = {
  message: string
  color?: 'green' | 'red' | 'yellow'
  onBack: () => void
}

export default function BackToMenu({ message, color = 'green', onBack }: Props) {
  return (
    <>
      <Text color={color}>{message}</Text>
      <Newline />
      <TextInput prompt="按 Enter 返回菜单..." onSubmit={onBack} />
    </>
  )
}
