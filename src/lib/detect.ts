import { base64DecodeBytes } from './codec/bytes'
import { decodeJwt } from './jwt/jwt'

export type DetectedKind = 'jwt' | 'json' | 'url' | 'base64' | 'timestamp' | 'regex' | 'websocket' | 'text'

export interface Detection {
  kind: DetectedKind
  tool: 'json' | 'regex' | 'jwt' | 'diff' | 'codec' | 'socket'
  confidence: number
  label: string
  pipeline?: string[]
}

const JWT_SHAPE = /^(Bearer\s+)?[\w-]+\.[\w-]+\.[\w-]*$/i
const BASE64_SHAPE = /^[A-Za-z\d+/]+={0,2}$/
const URL_SHAPE = /^https?:\/\/\S+$/i
const WS_SHAPE = /^wss?:\/\/\S+$/i
const REGEX_LITERAL = /^\/((?:\\.|\[(?:\\.|[^\]\\])*\]|[^\\/[])+)\/([dgimsuvy]*)$/s
const strictUtf8 = new TextDecoder('utf-8', { fatal: true })

function decodesToText(text: string): boolean {
  try {
    const decoded = strictUtf8.decode(base64DecodeBytes(text))
    const printable = Array.from(decoded).filter((char) => /[\p{L}\p{N}\p{P}\p{S}\s]/u.test(char)).length
    return decoded.length > 0 && printable / Array.from(decoded).length >= 0.9
  } catch {
    return false
  }
}
const TIMESTAMP_SHAPE = /^\d{10}(\d{3})?$/

function looksLikeJson(text: string): boolean {
  if (!/^[[{]/.test(text)) return false
  try {
    JSON.parse(text)
    return true
  } catch {
    return /^[[{][\s\S]*[\]}]$/.test(text)
  }
}

export function detectContent(raw: string): Detection {
  const text = raw.trim()
  if (JWT_SHAPE.test(text) && decodeJwt(text).ok) {
    return { kind: 'jwt', tool: 'jwt', confidence: 0.98, label: 'JSON Web Token' }
  }
  if (looksLikeJson(text)) return { kind: 'json', tool: 'json', confidence: 0.95, label: 'JSON document' }
  if (WS_SHAPE.test(text)) return { kind: 'websocket', tool: 'socket', confidence: 0.95, label: 'WebSocket endpoint' }
  if (REGEX_LITERAL.test(text)) return { kind: 'regex', tool: 'regex', confidence: 0.8, label: 'Regular expression' }
  if (TIMESTAMP_SHAPE.test(text)) {
    return { kind: 'timestamp', tool: 'codec', confidence: 0.85, label: 'Unix timestamp', pipeline: ['to-iso'] }
  }
  if (URL_SHAPE.test(text) && text.includes('?')) {
    return { kind: 'url', tool: 'codec', confidence: 0.8, label: 'URL with query', pipeline: ['query-to-json'] }
  }
  if (URL_SHAPE.test(text) || /%[\da-f]{2}/i.test(text)) {
    return { kind: 'url', tool: 'codec', confidence: 0.7, label: 'URL-encoded text', pipeline: ['url-decode'] }
  }
  if (text.length >= 8 && text.length % 4 === 0 && BASE64_SHAPE.test(text) && /[A-Z]/.test(text) && /[a-z\d]/.test(text) && decodesToText(text)) {
    return { kind: 'base64', tool: 'codec', confidence: 0.75, label: 'Base64 data', pipeline: ['base64-decode'] }
  }
  if (text.split('\n').length > 1 && text.includes('\n---\n')) {
    return { kind: 'text', tool: 'diff', confidence: 0.5, label: 'Two text blocks' }
  }
  return { kind: 'text', tool: 'codec', confidence: 0.3, label: 'Plain text' }
}

export function parseRegexLiteral(text: string): { pattern: string; flags: string } | null {
  const match = REGEX_LITERAL.exec(text.trim())
  return match ? { pattern: match[1]!, flags: match[2]! } : null
}
