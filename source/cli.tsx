#!/usr/bin/env node
import { render } from 'ink'
import meow from 'meow'
import App from './app.tsx'

const cli = meow(
  `
	Usage
	  $ video-cli

	Options
		--name  Your name

	Examples
	  $ video-cli --name=Jane
	  Hello, Jane
`,
  {
    importMeta: import.meta,
    flags: {
      name: {
        type: 'string',
      },
    },
  },
)

render(<App name={cli.flags.name} />)
