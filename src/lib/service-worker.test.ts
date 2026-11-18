/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

type WorkerListener = (event: { waitUntil: (task: Promise<unknown>) => void }) => void

it('only removes obsolete caches for its own registration scope', async () => {
  const scope = 'https://example.test/workbench/'
  const cacheKey = (url: string, build: string) => `dev-workbench:${encodeURIComponent(url)}:${build}`
  const obsolete = cacheKey(scope, 'old')
  const keys = new Set([
    obsolete,
    cacheKey('https://example.test/workbench/other/', 'old'),
    'other-app-offline',
    'dev-workbench-legacy',
  ])
  const listeners = new Map<string, WorkerListener>()
  const claim = vi.fn()
  const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')
  runInNewContext(source, {
    self: {
      registration: { scope },
      addEventListener: (name: string, listener: WorkerListener) => listeners.set(name, listener),
      clients: { claim },
      skipWaiting: () => {},
    },
    caches: {
      open: async (key: string) => {
        keys.add(key)
        return { addAll: async () => {} }
      },
      keys: async () => [...keys],
      delete: async (key: string) => keys.delete(key),
    },
  })
  async function dispatch(name: string) {
    let pending: Promise<unknown> | undefined
    listeners.get(name)!({ waitUntil: (task) => (pending = task) })
    await pending
  }

  await dispatch('install')
  await dispatch('activate')

  expect(keys).toEqual(new Set([
    cacheKey(scope, 'dev'),
    cacheKey('https://example.test/workbench/other/', 'old'),
    'other-app-offline',
    'dev-workbench-legacy',
  ]))
  expect(claim).toHaveBeenCalledOnce()
})
