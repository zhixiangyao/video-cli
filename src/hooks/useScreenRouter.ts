import { useState } from 'react'

export type Screen = 'menu' | 'cut-video' | 'to-h265' | 'copy-to-hdd'

const SCREEN_KEYS: Record<string, Screen> = {
  '1': 'cut-video',
  '2': 'to-h265',
  '3': 'copy-to-hdd',
}

/** 管理菜单 → 各命令页面 → 返回菜单 的页面路由状态 */
export function useScreenRouter(initialScreen: Screen = 'menu') {
  const [screen, setScreen] = useState<Screen>(initialScreen)

  const handleMenuSelect = (choice: string) => {
    const trimmed = choice.trim()
    if (trimmed === '4') {
      process.exit(0)
    }
    const next = SCREEN_KEYS[trimmed]
    if (next) {
      setScreen(next)
    }
  }

  const goBack = () => setScreen('menu')

  return { screen, handleMenuSelect, goBack }
}
