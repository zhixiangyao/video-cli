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

render(<App />)
