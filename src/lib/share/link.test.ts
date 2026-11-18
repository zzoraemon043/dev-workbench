import { describe, expect, it, vi } from 'vitest'
import { createShareLink } from '@/hooks/useHashSync'
import { jsonToTypeScript } from '@/lib/json/to-typescript'
import { DEFAULT_TOOL_STATES, useWorkbench, type JsonState } from '@/store/workbench'
import { buildHash, decodeShareState, encodeShareState, parseHash } from './link'

describe('share links', () => {
  it('round-trips state through a compressed URL-safe string', async () => {
    const state = { tool: 'json', input: '{"hello":"wörld"}'.repeat(50) }
    const encoded = await encodeShareState(state)
    expect(encoded).toMatch(/^[\w-]+$/)
    expect(encoded.length).toBeLessThan(JSON.stringify(state).length)
    await expect(decodeShareState(encoded)).resolves.toEqual(state)
  })

  it('parses and builds hash routes', () => {
    expect(parseHash('#/regex?s=abc')).toEqual({ tool: 'regex', share: 'abc' })
    expect(parseHash('')).toEqual({ tool: null, share: null })
    expect(buildHash('jwt')).toBe('#/jwt')
    expect(buildHash('jwt', 'xyz')).toBe('#/jwt?s=xyz')
  })

  it('shares JSON Types settings for a recipient with default preferences', async () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/workbench/' } })
    try {
      useWorkbench.getState().update('json', {
        input: '{"id":1}',
        view: 'types',
        rootName: 'Invoice',
        declaration: 'type',
        readonlyTypes: true,
      })
      const { tool, share } = parseHash(new URL(await createShareLink()).hash)
      expect(tool).toBe('json')
      const received = { ...DEFAULT_TOOL_STATES.json, ...await decodeShareState<Partial<JsonState>>(share!) }
      expect(received.view).toBe('types')
      expect(jsonToTypeScript(JSON.parse(received.input), {
        rootName: received.rootName,
        declaration: received.declaration,
        readonly: received.readonlyTypes,
      })).toBe('export type Invoice = {\n  readonly id: number\n}\n')
    } finally {
      useWorkbench.getState().reset('json')
      vi.unstubAllGlobals()
    }
  })
})
