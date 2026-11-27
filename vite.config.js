/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config'
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
    exclude: [...configDefaults.exclude, 'e2e/**'],
    execArgv: nodeMajor >= 25 ? ['--no-experimental-webstorage'] : [],
  },
})
