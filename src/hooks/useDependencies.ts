import { useEffect, useState } from 'react'

import { checkAllTools, TOOLS, type ToolId, type ToolSpec } from '../lib/deps.ts'
import type { Screen } from './useScreenRouter.ts'

/** 各命令页面需要的依赖工具 */
export const SCREEN_TOOLS: Record<Screen, ToolId[]> = {
  menu: [],
  'cut-video': ['ffmpeg', 'ffprobe'],
  'to-h265': ['ffmpeg', 'ffprobe'],
  'copy-to-hdd': ['ionice', 'dd', 'df', 'lsblk'],
}

/** 启动时检测各工具依赖是否可用 */
export function useDependencies() {
  const [missingTools, setMissingTools] = useState<Set<ToolId> | null>(null)

  useEffect(() => {
    checkAllTools().then(setMissingTools)
  }, [])

  /** 返回当前页面缺失的依赖, 未检测完成时为 null (不提示) */
  const missingFor = (screen: Screen): ToolSpec[] | null => {
    if (missingTools === null) return null
    return SCREEN_TOOLS[screen].filter((id) => missingTools.has(id)).map((id) => TOOLS[id])
  }

  return { missingFor }
}
