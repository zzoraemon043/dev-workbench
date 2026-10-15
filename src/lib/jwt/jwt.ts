import { base64UrlDecodeBytes, base64UrlEncodeBytes, utf8Decode, utf8Encode } from '../codec/bytes'
import { isPlainObject } from '../json/parse'

export type JwtJson = Record<string, unknown>

export interface DecodedJwt {
  header: JwtJson
  payload: JwtJson
  signature: string
  signingInput: string
}

export type DecodeResult = { ok: true; jwt: DecodedJwt } | { ok: false; error: string }

export type ClaimStatus = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry'

export interface TimeClaim {
  claim: 'exp' | 'iat' | 'nbf' | 'auth_time'
  date: Date
}

export type HmacAlgorithm = 'HS256' | 'HS384' | 'HS512'

const HMAC_HASH: Record<HmacAlgorithm, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

export const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires at',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'JWT ID',
  auth_time: 'Authenticated at',
  scope: 'Scopes',
  azp: 'Authorized party',
  alg: 'Algorithm',
  typ: 'Token type',
  kid: 'Key ID',
}

function decodeSegment(segment: string, label: string): JwtJson {
  let parsed: unknown
  try {
    parsed = JSON.parse(utf8Decode(base64UrlDecodeBytes(segment)))
  } catch {
    throw new Error(`The ${label} is not valid base64url-encoded JSON`)
  }
  if (!isPlainObject(parsed)) throw new Error(`The ${label} must be a JSON object`)
  return parsed
}

export function decodeJwt(token: string): DecodeResult {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.')
  if (parts.length !== 3) {
    return { ok: false, error: `A JWT has 3 dot-separated parts, found ${parts.length}` }
  }
  const [header, payload, signature] = parts as [string, string, string]
  try {
    return {
      ok: true,
      jwt: {
        header: decodeSegment(header, 'header'),
        payload: decodeSegment(payload, 'payload'),
        signature,
        signingInput: `${header}.${payload}`,
      },
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function timeClaims(payload: JwtJson): TimeClaim[] {
  return (['iat', 'nbf', 'exp', 'auth_time'] as const)
    .filter((claim) => typeof payload[claim] === 'number')
    .map((claim) => ({ claim, date: new Date((payload[claim] as number) * 1000) }))
}

export function claimStatus(payload: JwtJson, now = Date.now()): ClaimStatus {
  const nbf = payload.nbf
  if (typeof nbf === 'number' && nbf * 1000 > now) return 'not-yet-valid'
  const exp = payload.exp
  if (typeof exp !== 'number') return 'no-expiry'
  return exp * 1000 <= now ? 'expired' : 'valid'
}

export function formatRelative(target: number, now = Date.now()): string {
  const delta = target - now
  const abs = Math.abs(delta)
  const units: Array<[number, string]> = [
    [86_400_000, 'd'],
    [3_600_000, 'h'],
    [60_000, 'm'],
    [1000, 's'],
  ]
  const parts: string[] = []
  let remaining = abs
  for (const [size, label] of units) {
    if (remaining >= size && parts.length < 2) {
      parts.push(`${Math.floor(remaining / size)}${label}`)
      remaining %= size
    }
  }
  const text = parts.join(' ') || '0s'
  return delta >= 0 ? `in ${text}` : `${text} ago`
}

export function isHmacAlgorithm(alg: unknown): alg is HmacAlgorithm {
  return alg === 'HS256' || alg === 'HS384' || alg === 'HS512'
}

async function hmacKey(secret: string, algorithm: HmacAlgorithm, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', utf8Encode(secret), { name: 'HMAC', hash: HMAC_HASH[algorithm] }, false, [
    usage,
  ])
}

export async function verifyHmac(token: string, secret: string): Promise<boolean> {
  const decoded = decodeJwt(token)
  if (!decoded.ok) return false
  const algorithm = decoded.jwt.header.alg
  if (!isHmacAlgorithm(algorithm)) throw new Error(`Only HS256/384/512 can be verified offline, got ${String(algorithm)}`)
  const key = await hmacKey(secret, algorithm, 'verify')
  return crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecodeBytes(decoded.jwt.signature),
    utf8Encode(decoded.jwt.signingInput),
  )
}

export async function signHmac(header: JwtJson, payload: JwtJson, secret: string): Promise<string> {
  const algorithm = isHmacAlgorithm(header.alg) ? header.alg : 'HS256'
  const fullHeader = { ...header, alg: algorithm, typ: header.typ ?? 'JWT' }
  const signingInput = [fullHeader, payload]
    .map((part) => base64UrlEncodeBytes(utf8Encode(JSON.stringify(part))))
    .join('.')
  const key = await hmacKey(secret, algorithm, 'sign')
  const signature = await crypto.subtle.sign('HMAC', key, utf8Encode(signingInput))
  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`
}
