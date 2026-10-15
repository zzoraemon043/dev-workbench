const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export function utf8Encode(text: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(text)
}

export function utf8Decode(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}

export function base64EncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64DecodeBytes(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.replace(/\s+/g, '')
  if (!/^[A-Za-z\d+/]*={0,2}$/.test(clean)) throw new Error('Input is not valid base64')
  const binary = atob(clean)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  return base64EncodeBytes(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecodeBytes(input: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z\d_-]*={0,2}$/.test(input.trim())) throw new Error('Input is not valid base64url')
  const normalized = input.trim().replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return base64DecodeBytes(padded)
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/^0x/i, '').replace(/[\s:-]/g, '')
  if (clean.length % 2 !== 0 || /[^\da-f]/i.test(clean)) throw new Error('Input is not valid hex')
  return Uint8Array.from(clean.match(/../g) ?? [], (pair) => parseInt(pair, 16))
}
