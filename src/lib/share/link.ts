import { base64UrlDecodeBytes, base64UrlEncodeBytes, utf8Decode, utf8Encode } from '../codec/bytes'

const FORMAT = 'deflate-raw'

async function pipeThrough(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const output = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

export async function encodeShareState(state: unknown): Promise<string> {
  const compressed = await pipeThrough(utf8Encode(JSON.stringify(state)), new CompressionStream(FORMAT))
  return base64UrlEncodeBytes(compressed)
}

export async function decodeShareState<T = unknown>(encoded: string): Promise<T> {
  const inflated = await pipeThrough(base64UrlDecodeBytes(encoded), new DecompressionStream(FORMAT))
  return JSON.parse(utf8Decode(inflated)) as T
}

export interface HashRoute {
  tool: string | null
  share: string | null
}

export function parseHash(hash: string): HashRoute {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  const params = new URLSearchParams(query)
  return { tool: path || null, share: params.get('s') }
}

export function buildHash(tool: string, share?: string): string {
  return share ? `#/${tool}?s=${share}` : `#/${tool}`
}
