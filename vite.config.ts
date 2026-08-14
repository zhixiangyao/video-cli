import { chmodSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'

const outDir = 'dist'
const outFileName = 'cli.mjs'

export default defineConfig({
  input: resolve(import.meta.dirname, 'src/cli.tsx'),
  build: {
    outDir,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      platform: 'node',
      output: {
        entryFileNames: outFileName,
        postBanner: ['#!/usr/bin/env node'].join('\n'),
        codeSplitting: false,
        comments: false,
      },
      external: (id) => id.startsWith('node:') || builtinModules.includes(id),
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
