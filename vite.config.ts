import { chmodSync } from 'node:fs'
import { defineConfig } from 'vite'

const outDir = 'dist'
const outFileName = 'cli.mjs'

export default defineConfig({
  build: {
    ssr: 'source/cli.tsx',
    target: 'esnext',
    outDir,
    reportCompressedSize: false,
    minify: 'oxc',
    rolldownOptions: {
      output: {
        entryFileNames: outFileName,
        banner: ['#!/usr/bin/env node'].join('\n'),
      },
    },
  },
  plugins: [
    {
      name: 'make-executable',
      closeBundle() {
        chmodSync(`${outDir}/${outFileName}`, 0o755)
      },
    },
  ],
})
