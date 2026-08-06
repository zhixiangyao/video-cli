import { useEffect, useState } from 'react'

import { checkDependencies, type MissingDeps } from '../lib/ffmpeg.ts'

/** 启动时检查 ffmpeg / ffprobe 依赖是否可用 */
export function useDependencies() {
  const [missingDeps, setMissingDeps] = useState<MissingDeps | null>(null)

  useEffect(() => {
    checkDependencies().then(setMissingDeps)
  }, [])

  return { missingDeps }
}
