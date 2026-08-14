import { Newline } from 'ink'

import TextInput from './TextInput.tsx'

type Props = {
  onBack: () => void
}

export default function BackToMenu({ onBack }: Props) {
  return (
    <>
      <Newline />
      <TextInput prompt="按 Enter 返回菜单..." onSubmit={onBack} />
    </>
  )
}
