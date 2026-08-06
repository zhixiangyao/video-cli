import { useEffect, useState } from 'react'

import { globMp4FilesFlat } from '../lib/files.ts'

/** 扫描当前目录的 .mp4 文件, files 为 null 时表示仍在加载 */
export function useMp4Files() {
  const [files, setFiles] = useState<string[] | null>(null)

  useEffect(() => {
    let cancelled = false
    globMp4FilesFlat().then((result) => {
      if (!cancelled) {
        setFiles(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { files, loading: files === null }
}
