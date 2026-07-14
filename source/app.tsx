import { useState, useEffect } from 'react'
import { Text, Box } from 'ink'
import Menu from './components/Menu.tsx'
import CutVideo from './components/CutVideo.tsx'
import ToH265 from './components/ToH265.tsx'
import AddCodecSuffix from './components/AddCodecSuffix.tsx'
import RemoveCodecSuffix from './components/RemoveCodecSuffix.tsx'
import SyncFolderName from './components/SyncFolderName.tsx'
import { checkDependencies, type MissingDeps } from './lib/ffmpeg.ts'

type Screen = 'menu' | 'cut-video' | 'to-h265' | 'add-codec-suffix' | 'remove-codec-suffix' | 'sync-folder-name'

const SCREEN_MAP = [
  { key: '1', screen: 'cut-video' as const, Component: CutVideo },
  { key: '2', screen: 'to-h265' as const, Component: ToH265 },
  { key: '3', screen: 'add-codec-suffix' as const, Component: AddCodecSuffix },
  { key: '4', screen: 'remove-codec-suffix' as const, Component: RemoveCodecSuffix },
  { key: '5', screen: 'sync-folder-name' as const, Component: SyncFolderName },
] as const

const screenComponentMap = new Map(SCREEN_MAP.map((s) => [s.screen, s.Component]))

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [missingDeps, setMissingDeps] = useState<MissingDeps | null>(null)
  const [termHeight, setTermHeight] = useState(() => process.stdout.rows || 24)
  const [termWidth, setTermWidth] = useState(() => process.stdout.columns || 80)

  useEffect(() => {
    checkDependencies().then(setMissingDeps)

    const onResize = () => {
      const h = process.stdout.rows || 24
      const w = process.stdout.columns || 80
      setTermHeight(h)
      setTermWidth(w)
      // 更新滚动区域，禁止 trackpad 滚动
      process.stdout.write(`\x1b[1;${h - 1}r`)
    }
    process.stdout.on('resize', onResize)
    return () => {
      process.stdout.off('resize', onResize)
    }
  }, [])

  const handleMenuSelect = (choice: string) => {
    const trimmed = choice.trim()
    if (trimmed === '6') {
      process.exit(0)
    }
    const config = SCREEN_MAP.find((s) => s.key === trimmed)
    if (config) {
      setScreen(config.screen)
    }
  }

  const goBack = () => setScreen('menu')

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
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={termWidth}
      height={termHeight - 1}
      flexDirection="column"
      padding={1}
    >
      {warning}
      {renderScreen()}
    </Box>
  )
}
