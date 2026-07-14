import { rm, chmod } from 'node:fs/promises'
import esbuild from 'esbuild'

// Clean old dist output
await rm('dist', { recursive: true, force: true })

await esbuild.build({
  entryPoints: ['source/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node26',
  format: 'esm',
  outfile: 'dist/cli.mjs',
  banner: {
    js: [
      '#!/usr/bin/env node',
      'import { createRequire } from "module";',
      'const require = createRequire(import.meta.url);',
    ].join('\n'),
  },
  minify: true,
  treeShaking: true,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
})

// Make the output executable
await chmod('dist/cli.mjs', 0o755)

console.log('Build complete: dist/cli.mjs')
