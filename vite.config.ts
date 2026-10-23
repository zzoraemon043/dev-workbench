/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

function precacheServiceWorker(): Plugin {
  let outDir = 'dist'
  let assets: string[] = []
  return {
    name: 'precache-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    generateBundle(_, bundle) {
      assets = Object.keys(bundle)
        .filter((fileName) => !fileName.endsWith('.map') && fileName !== 'index.html')
        .sort()
    },
    closeBundle() {
      const path = join(outDir, 'sw.js')
      const build = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12)
      const source = readFileSync(path, 'utf8')
        .replace("const BUILD = 'dev'", `const BUILD = '${build}'`)
        .replace('const ASSETS = []', `const ASSETS = ${JSON.stringify(assets.map((fileName) => `./${fileName}`))}`)
      writeFileSync(path, source)
    },
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss(), precacheServiceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
