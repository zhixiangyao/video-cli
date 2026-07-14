import { render } from 'ink'
import App from './app.tsx'
import meow from 'meow'

const helpMessage = `
Usage
  $ video-cli

Options
  --version  查看版本
`

meow(helpMessage, { importMeta: import.meta })

const rows = process.stdout.rows || 24

const enterAltScreen = () =>
  process.stdout.write('\x1b[?1049h' + '\x1b[?25l' + '\x1b[?1000h' + '\x1b[?1006h' + `\x1b[1;${rows}r`)

const exitAltScreen = () => process.stdout.write('\x1b[?1000l' + '\x1b[?1006l' + '\x1b[?1049l' + '\x1b[r' + '\x1b[?25h')

enterAltScreen()

// 确保退出时恢复终端
process.on('exit', exitAltScreen)
process.on('SIGINT', () => {
  exitAltScreen()
  process.exit()
})
process.on('SIGTERM', () => {
  exitAltScreen()
  process.exit()
})

const { waitUntilExit } = render(<App />)

waitUntilExit().then(exitAltScreen)
