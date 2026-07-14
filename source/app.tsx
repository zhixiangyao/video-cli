import { useState, useEffect } from 'react'
import { Text } from 'ink'
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

  useEffect(() => {
    checkDependencies().then(setMissingDeps)
  }, [])

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
        {missingDeps.ffmpeg && <Text color="yellow">  - ffmpeg 未安装, 请执行: sudo apt install ffmpeg</Text>}
        {missingDeps.ffprobe && <Text color="yellow">  - ffprobe 未安装, 请执行: sudo apt install ffmpeg</Text>}
        <Text color="yellow">---------------------------------</Text>
      </>
    ) : null

  switch (screen) {
    case 'menu':
      return (
        <>
          {warning}
          <Menu onSelect={handleMenuSelect} />
        </>
      )
    case 'cut-video':
      return (
        <>
          {warning}
          <CutVideo onBack={goBack} />
        </>
      )
    case 'to-h265':
      return (
        <>
          {warning}
          <ToH265 onBack={goBack} />
        </>
      )
    case 'add-codec-suffix':
      return <AddCodecSuffix onBack={goBack} />
    case 'remove-codec-suffix':
      return <RemoveCodecSuffix onBack={goBack} />
    case 'sync-folder-name':
      return <SyncFolderName onBack={goBack} />
  }
}
