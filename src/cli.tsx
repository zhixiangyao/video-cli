import { render } from 'ink'
import meow from 'meow'

import App from './app.tsx'
import type { Screen } from './hooks/useScreenRouter.ts'

const COMMANDS = ['cut-video', 'to-h265', 'copy-to-hdd'] as const satisfies readonly Exclude<Screen, 'menu'>[]

const helpMessage = `
Usage
  $ video-cli [command]

Commands
  cut-video      裁剪视频片段(无损,不重新编码)
  to-h265        硬件转码为 H.265(体积更小)
  copy-to-hdd    复制到机械硬盘(串行拷贝,保持轨道顺滑)

Options
  -v, --version  查看版本
  -h, --help     查看帮助
`

const cli = meow(helpMessage, {
  importMeta: import.meta,
  commands: COMMANDS,
  flags: {
    help: { type: 'boolean', shortFlag: 'h' },
    version: { type: 'boolean', shortFlag: 'v' },
  },
})

const screenFromCommand = (command: string | undefined): Screen =>
  command && COMMANDS.includes(command as (typeof COMMANDS)[number]) ? (command as (typeof COMMANDS)[number]) : 'menu'

render(<App initialScreen={screenFromCommand(cli.command)} />)
