import { Text, useInput } from 'ink'
import type { ComponentType } from 'react'

import CutVideo from './commands/cut-video/index.tsx'
import SyncToHdd from './commands/sync-to-hdd/index.tsx'
import ToH265 from './commands/to-h265/index.tsx'
import Menu from './components/Menu.tsx'
import { useDependencies } from './hooks/useDependencies.ts'
import { useScreenRouter, type Screen } from './hooks/useScreenRouter.ts'

type CommandScreen = Exclude<Screen, 'menu'>

const screenComponentMap = new Map<CommandScreen, ComponentType<{ onBack: () => void }>>([
  ['cut-video', CutVideo],
  ['to-h265', ToH265],
  ['sync-to-hdd', SyncToHdd],
])

export default function App() {
  const { screen, handleMenuSelect, goBack } = useScreenRouter()
  const { missingDeps } = useDependencies()

  useInput((input) => {
    if (input === 'q') {
      process.exit(0)
    }
  })

  const warning =
    missingDeps && (screen === 'cut-video' || screen === 'to-h265') && (missingDeps.ffmpeg || missingDeps.ffprobe) ? (
      <>
        <Text bold color="yellow">
          ⚠️ 缺少依赖:
        </Text>
        {missingDeps.ffmpeg && <Text color="yellow"> - ffmpeg 未安装, 请执行: sudo apt install ffmpeg</Text>}
        {missingDeps.ffprobe && <Text color="yellow"> - ffprobe 未安装, 请执行: sudo apt install ffmpeg</Text>}
        <Text color="yellow">---------------------------------</Text>
      </>
    ) : null

  const renderScreen = () => {
    if (screen === 'menu') return <Menu onSelect={handleMenuSelect} />
    const Component = screenComponentMap.get(screen)
    if (Component) return <Component onBack={goBack} />
    return null
  }

  return (
    <>
      {warning}
      {renderScreen()}
    </>
  )
}
