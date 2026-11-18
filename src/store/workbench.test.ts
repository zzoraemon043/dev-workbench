import { afterEach, expect, it, vi } from 'vitest'

function storageWithQuota(limit: number, initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      const used = [...items].reduce((sum, [name, entry]) => sum + (name === key ? 0 : entry.length), 0)
      if (used + value.length > limit) throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      items.set(key, value)
    },
  }
}

async function loadWorkbench() {
  vi.resetModules()
  return (await import('./workbench')).useWorkbench
}

afterEach(() => vi.unstubAllGlobals())

it('keeps other tool edits saved when an oversized input hits the quota', async () => {
  vi.stubGlobal('localStorage', storageWithQuota(5 * 1024 * 1024, {
    'dev-workbench': JSON.stringify({ version: 1, state: { codec: { input: 'previous input' }, theme: 'dark' } }),
  }))
  const store = await loadWorkbench()
  const { update } = store.getState()
  const oversized = 'x'.repeat(8 * 1024 * 1024)

  expect(() => update('codec', { input: oversized })).not.toThrow()
  expect(store.getState().codec.input).toBe(oversized)
  expect(store.getState()).toMatchObject({ unsavedInputs: ['Codec input'] })

  update('json', { input: '{"saved":true}' })
  const reloaded = await loadWorkbench()
  expect(reloaded.getState()).toMatchObject({
    theme: 'dark',
    codec: { input: 'previous input' },
    json: { input: '{"saved":true}' },
  })

  update('codec', { input: 'small again' })
  expect(store.getState()).toMatchObject({ unsavedInputs: [] })
  expect((await loadWorkbench()).getState().codec.input).toBe('small again')
})
