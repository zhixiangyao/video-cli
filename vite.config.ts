import { chmodSync } from 'node:fs'
import { defineConfig } from 'vite'

const outDir = 'dist'
const outFileName = 'cli.mjs'

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: true,
    outDir,
    reportCompressedSize: false,
    minify: false,
    rolldownOptions: {
      input: 'source/cli.tsx',
      output: {
        entryFileNames: outFileName,
        postBanner: ['#!/usr/bin/env node'].join('\n'),
        codeSplitting: false,
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
