import { describe, expect, it } from 'vitest'
import { claimStatus, decodeJwt, formatRelative, signHmac, timeClaims, verifyHmac } from './jwt'

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('decodeJwt', () => {
  it('decodes header and payload', () => {
    const result = decodeJwt(`Bearer ${SAMPLE}`)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.jwt.header).toEqual({ alg: 'HS256', typ: 'JWT' })
      expect(result.jwt.payload).toMatchObject({ sub: '1234567890', name: 'John Doe' })
    }
  })

  it('rejects malformed tokens', () => {
    expect(decodeJwt('a.b')).toMatchObject({ ok: false })
    expect(decodeJwt('###.e30.sig')).toMatchObject({ ok: false, error: expect.stringContaining('header') })
  })
})

describe('signatures', () => {
  it('verifies the canonical jwt.io sample', async () => {
    await expect(verifyHmac(SAMPLE, 'your-256-bit-secret')).resolves.toBe(true)
    await expect(verifyHmac(SAMPLE, 'wrong')).resolves.toBe(false)
  })

  it('round-trips sign and verify for every HMAC size', async () => {
    for (const alg of ['HS256', 'HS384', 'HS512']) {
      const token = await signHmac({ alg }, { sub: 'ünïcødé' }, 's3cret')
      await expect(verifyHmac(token, 's3cret')).resolves.toBe(true)
      const decoded = decodeJwt(token)
      expect(decoded.ok && decoded.jwt.payload.sub).toBe('ünïcødé')
    }
  })

  it('refuses to verify asymmetric algorithms offline', async () => {
    const token = await signHmac({ alg: 'HS256' }, {}, 'x')
    const [, payload, signature] = token.split('.')
    const rs256Header = btoa(JSON.stringify({ alg: 'RS256' })).replace(/=+$/, '')
    await expect(verifyHmac(`${rs256Header}.${payload}.${signature}`, 'x')).rejects.toThrow(/RS256/)
  })
})

describe('claims', () => {
  const now = Date.UTC(2026, 0, 1)
  const seconds = now / 1000

  it('computes status from exp and nbf', () => {
    expect(claimStatus({ exp: seconds + 60 }, now)).toBe('valid')
    expect(claimStatus({ exp: seconds - 60 }, now)).toBe('expired')
    expect(claimStatus({ nbf: seconds + 60, exp: seconds + 120 }, now)).toBe('not-yet-valid')
    expect(claimStatus({}, now)).toBe('no-expiry')
  })

  it('extracts time claims as dates', () => {
    expect(timeClaims({ iat: seconds, exp: 'soon' })).toEqual([{ claim: 'iat', date: new Date(now) }])
  })

  it('formats relative durations', () => {
    expect(formatRelative(now + 90_061_000, now)).toBe('in 1d 1h')
    expect(formatRelative(now - 5_000, now)).toBe('5s ago')
  })
})
