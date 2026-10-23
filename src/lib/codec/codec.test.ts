import { describe, expect, it } from 'vitest'
import { base64UrlDecodeBytes, base64UrlEncodeBytes, hexToBytes, utf8Encode } from './bytes'
import { TRANSFORMS_BY_ID, runPipeline } from './transforms'

async function run(id: string, input: string): Promise<string> {
  const transform = TRANSFORMS_BY_ID.get(id)
  if (!transform) throw new Error(`Unknown transform ${id}`)
  return transform.run(input)
}

describe('bytes', () => {
  it('round-trips base64url without padding', () => {
    const encoded = base64UrlEncodeBytes(utf8Encode('??>>'))
    expect(encoded).toBe('Pz8-Pg')
    expect(new TextDecoder().decode(base64UrlDecodeBytes(encoded))).toBe('??>>')
  })

  it('rejects invalid hex', () => {
    expect(() => hexToBytes('abc')).toThrow()
    expect(() => hexToBytes('zz')).toThrow()
    expect(Array.from(hexToBytes('0xDE:AD'))).toEqual([0xde, 0xad])
  })
})

describe('transforms', () => {
  it('encodes and decodes UTF-8 safely', async () => {
    expect(await run('base64-encode', 'héllo 𝄞')).toBe('aMOpbGxvIPCdhJ4=')
    expect(await run('base64-decode', 'aMOpbGxvIPCdhJ4=')).toBe('héllo 𝄞')
    expect(await run('hex-decode', await run('hex-encode', 'ok✓'))).toBe('ok✓')
  })

  it('escapes HTML and unicode', async () => {
    expect(await run('html-escape', `<a href="x">&</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
    expect(await run('html-unescape', '&lt;&#x1D11E;&#65;&copy;&bogus;')).toBe('<𝄞A©&bogus;')
    expect(await run('unicode-escape', 'é𝄞')).toBe('\\u00e9\\u{1d11e}')
    expect(await run('unicode-unescape', '\\u00e9\\u{1d11e}')).toBe('é𝄞')
  })

  it('leaves out of range code points as written', async () => {
    expect(await run('html-unescape', '&#9999999999;&#65;&#x110000;')).toBe('&#9999999999;A&#x110000;')
    expect(await run('unicode-unescape', '\\u{110000}\\u0041')).toBe('\\u{110000}A')
  })

  it('rejects timestamps outside the date range', async () => {
    await expect(run('to-unix', '99999999999999999')).rejects.toThrow(/date/)
    await expect(run('to-unix-ms', '99999999999999999')).rejects.toThrow(/date/)
  })

  it('hashes with SHA-256', async () => {
    expect(await run('sha256', 'abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('converts between naming conventions', async () => {
    expect(await run('camel', 'XMLHttpRequest handler')).toBe('xmlHttpRequestHandler')
    expect(await run('snake', 'userProfileId')).toBe('user_profile_id')
    expect(await run('kebab', 'User Profile ID')).toBe('user-profile-id')
    expect(await run('constant', 'max-retry count')).toBe('MAX_RETRY_COUNT')
  })

  it('converts timestamps in seconds and milliseconds', async () => {
    expect(await run('to-iso', '1700000000')).toBe('2023-11-14T22:13:20.000Z')
    expect(await run('to-iso', '1700000000000')).toBe('2023-11-14T22:13:20.000Z')
    expect(await run('to-unix', '2023-11-14T22:13:20Z')).toBe('1700000000')
  })

  it('parses query strings with repeated keys', async () => {
    expect(JSON.parse(await run('query-to-json', 'https://x.dev/?a=1&b=2&a=3'))).toEqual({ a: ['1', '3'], b: '2' })
  })
})

describe('runPipeline', () => {
  it('chains transforms and records each step', async () => {
    const steps = await runPipeline('hello', ['upper', 'base64-encode', 'base64-decode'])
    expect(steps.map((step) => step.output)).toEqual(['HELLO', 'SEVMTE8=', 'HELLO'])
  })

  it('reports an unknown step instead of skipping it', async () => {
    const steps = await runPipeline('hello', ['upper', 'no-such-step', 'lower'])
    expect(steps.map((step) => step.error)).toEqual([null, 'Unknown step "no-such-step"'])
  })

  it('stops at the first failing step', async () => {
    const steps = await runPipeline('not base64!', ['base64-decode', 'upper'])
    expect(steps).toHaveLength(1)
    expect(steps[0]!.error).toMatch(/base64/)
  })
})
