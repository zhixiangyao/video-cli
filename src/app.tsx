import { Text, useInput } from 'ink'
import type { ComponentType } from 'react'

import CopyToHdd from './commands/copy-to-hdd/index.tsx'
import CutVideo from './commands/cut-video/index.tsx'
import ToH265 from './commands/to-h265/index.tsx'
import Menu from './components/Menu.tsx'
import { useDependencies } from './hooks/useDependencies.ts'
import { useScreenRouter, type Screen } from './hooks/useScreenRouter.ts'

type CommandScreen = Exclude<Screen, 'menu'>

type Props = {
  /** 通过命令行子命令直接进入的页面, 默认进入菜单 */
  initialScreen?: Screen
}

const screenComponentMap = new Map<CommandScreen, ComponentType<{ onBack: () => void }>>([
  ['cut-video', CutVideo],
  ['to-h265', ToH265],
  ['copy-to-hdd', CopyToHdd],
])

export default function App({ initialScreen }: Props = {}) {
  const { screen, handleMenuSelect, goBack } = useScreenRouter(initialScreen)
  const { missingFor } = useDependencies()

  useInput((input) => {
    if (input === 'q') {
      process.exit(0)
    }
  })

  const missingDeps = missingFor(screen)
  const warning =
    missingDeps && missingDeps.length > 0 ? (
      <>
        <Text bold color="yellow">
          ⚠️ 缺少依赖:
        </Text>
        {missingDeps.map((tool) => (
          <Text key={tool.id} color="yellow">
            {' '}
            - {tool.id} 未安装, 请执行: {tool.installHint}
          </Text>
        ))}
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
