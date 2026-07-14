import { useState, useEffect } from 'react'
import { Text, Box, useInput } from 'ink'
import Menu from './components/Menu.tsx'
import CutVideo from './components/CutVideo.tsx'
import ToH265 from './components/ToH265.tsx'
import AddCodecSuffix from './components/AddCodecSuffix.tsx'
import RemoveCodecSuffix from './components/RemoveCodecSuffix.tsx'
import SyncFolderName from './components/SyncFolderName.tsx'
import { checkDependencies, type MissingDeps } from './lib/ffmpeg.ts'

type Screen = 'menu' | 'cut-video' | 'to-h265' | 'add-codec-suffix' | 'remove-codec-suffix' | 'sync-folder-name'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [missingDeps, setMissingDeps] = useState<MissingDeps | null>(null)
  const [termHeight, setTermHeight] = useState(() => process.stdout.rows || 24)
  const [termWidth, setTermWidth] = useState(() => process.stdout.columns || 80)

  useEffect(() => {
    checkDependencies().then(setMissingDeps)

    const onResize = () => {
      setTermHeight(process.stdout.rows || 24)
      setTermWidth(process.stdout.columns || 80)
    }
    process.stdout.on('resize', onResize)
    return () => {
      process.stdout.off('resize', onResize)
    }
  }, [])

  useInput((input) => {
    if (input === 'q') {
      process.exit(0)
    }
  })

  const handleMenuSelect = (choice: string) => {
    switch (choice.trim()) {
      case '1':
        setScreen('cut-video')
        break
      case '2':
        setScreen('to-h265')
        break
      case '3':
        setScreen('add-codec-suffix')
        break
      case '4':
        setScreen('remove-codec-suffix')
        break
      case '5':
        setScreen('sync-folder-name')
        break
      case '6':
        process.exit(0)
      default:
        break
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
    switch (screen) {
      case 'menu':
        return <Menu onSelect={handleMenuSelect} />
      case 'cut-video':
        return <CutVideo onBack={goBack} />
      case 'to-h265':
        return <ToH265 onBack={goBack} />
      case 'add-codec-suffix':
        return <AddCodecSuffix onBack={goBack} />
      case 'remove-codec-suffix':
        return <RemoveCodecSuffix onBack={goBack} />
      case 'sync-folder-name':
        return <SyncFolderName onBack={goBack} />
    }
  }

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={termWidth}
      height={termHeight}
      flexDirection="column"
      padding={1}
    >
      {warning}
      {renderScreen()}
    </Box>
  )
}
