import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type DiskCheck =
  | { kind: 'hdd' }
  | { kind: 'not-hdd' }
  | { kind: 'not-disk' }
  | { kind: 'error'; message: string }

/** 判断路径所在磁盘是否为机械硬盘 (通过 df + lsblk 的 ROTA 标记) */
export async function checkDiskType(dirpath: string): Promise<DiskCheck> {
  try {
    const device = await deviceForPath(dirpath)
    if (!device) return { kind: 'not-disk' }
    const rotational = await isRotational(device)
    if (rotational === null) return { kind: 'not-disk' }
    return rotational ? { kind: 'hdd' } : { kind: 'not-hdd' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { kind: 'error', message }
  }
}

/** 返回路径所在文件系统对应的块设备 (如 /dev/sda1), 非本地磁盘返回 null */
async function deviceForPath(dirpath: string): Promise<string | null> {
  const { stdout } = await execFileAsync('df', ['--output=source', dirpath])
  const lines = stdout.trim().split('\n')
  const source = lines[lines.length - 1]?.trim()
  if (!source || !source.startsWith('/dev/')) return null
  return source
}

/** 兼容处理: lsblk 输出的设备名可能是裸名 (如 sdb), 补全为可直接解析的完整路径 */
function toDevicePath(name: string): string {
  if (!name || name.startsWith('/')) return name
  return `/dev/${name}`
}

/** 沿 lsblk 向上追溯到整块磁盘, 读取 ROTA 标记 (1 = 机械盘) */
async function isRotational(device: string): Promise<boolean | null> {
  let current = device
  for (let i = 0; i < 8; i++) {
    const { stdout } = await execFileAsync('lsblk', ['-n', '-o', 'PKNAME', current])
    const parent = stdout.trim().split('\n')[0]?.trim()
    if (!parent) break
    current = toDevicePath(parent)
  }
  const { stdout } = await execFileAsync('lsblk', ['-n', '-d', '-o', 'ROTA', current])
  const rota = stdout.trim().split('\n')[0]?.trim()
  if (rota === '1') return true
  if (rota === '0') return false
  return null
}
