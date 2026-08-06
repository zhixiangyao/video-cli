import { render } from 'ink'
import meow from 'meow'

import App from './app.tsx'

const helpMessage = `
Usage
  $ video-cli

Options
  --version  查看版本
`

meow(helpMessage, { importMeta: import.meta })

render(<App />)
