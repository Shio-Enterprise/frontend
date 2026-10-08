/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const projectRoot = dirname(fileURLToPath(import.meta.url))

// O Node 25 ativa um localStorage próprio que sobrepõe o do jsdom nos testes.
const nodeMajor = Number(process.versions.node.split('.')[0])

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: projectRoot,
  cacheDir: resolve(projectRoot, 'node_modules/.vite'),
  server: {
    watch: {
      usePolling: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    execArgv: nodeMajor >= 25 ? ['--no-experimental-webstorage'] : [],
  },
})
