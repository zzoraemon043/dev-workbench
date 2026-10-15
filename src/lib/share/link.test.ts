import { describe, expect, it } from 'vitest'
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
})
