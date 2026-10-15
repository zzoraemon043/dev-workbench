import {
  base64DecodeBytes,
  base64EncodeBytes,
  base64UrlDecodeBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  hexToBytes,
  utf8Decode,
  utf8Encode,
} from './bytes'

export type TransformCategory = 'Encoding' | 'Hashing' | 'Text' | 'Format' | 'Time'

export interface Transform {
  id: string
  label: string
  category: TransformCategory
  run: (input: string) => string | Promise<string>
}

export interface PipelineStep {
  id: string
  label: string
  output: string
  error: string | null
  durationMs: number
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  hellip: '…',
  mdash: '—',
}

function words(input: string): string[] {
  return input
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

function digest(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512') {
  return async (input: string) => bytesToHex(new Uint8Array(await crypto.subtle.digest(algorithm, utf8Encode(input))))
}

function parseTimestamp(input: string): Date {
  const value = input.trim()
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const numeric = Number(value)
    return new Date(Math.abs(numeric) < 1e11 ? numeric * 1000 : numeric)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Not a recognizable date or timestamp')
  return date
}

export const TRANSFORMS: Transform[] = [
  { id: 'base64-encode', label: 'Base64 encode', category: 'Encoding', run: (s) => base64EncodeBytes(utf8Encode(s)) },
  { id: 'base64-decode', label: 'Base64 decode', category: 'Encoding', run: (s) => utf8Decode(base64DecodeBytes(s)) },
  {
    id: 'base64url-encode',
    label: 'Base64URL encode',
    category: 'Encoding',
    run: (s) => base64UrlEncodeBytes(utf8Encode(s)),
  },
  {
    id: 'base64url-decode',
    label: 'Base64URL decode',
    category: 'Encoding',
    run: (s) => utf8Decode(base64UrlDecodeBytes(s)),
  },
  { id: 'url-encode', label: 'URL encode', category: 'Encoding', run: (s) => encodeURIComponent(s) },
  { id: 'url-decode', label: 'URL decode', category: 'Encoding', run: (s) => decodeURIComponent(s.replace(/\+/g, ' ')) },
  { id: 'hex-encode', label: 'Hex encode', category: 'Encoding', run: (s) => bytesToHex(utf8Encode(s)) },
  { id: 'hex-decode', label: 'Hex decode', category: 'Encoding', run: (s) => utf8Decode(hexToBytes(s)) },
  {
    id: 'html-escape',
    label: 'HTML escape',
    category: 'Encoding',
    run: (s) => s.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!),
  },
  {
    id: 'html-unescape',
    label: 'HTML unescape',
    category: 'Encoding',
    run: (s) =>
      s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
        if (body[0] === '#') {
          const code = body[1]?.toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
          return String.fromCodePoint(code)
        }
        return NAMED_ENTITIES[body.toLowerCase()] ?? entity
      }),
  },
  {
    id: 'unicode-escape',
    label: 'Unicode escape',
    category: 'Encoding',
    run: (s) =>
      Array.from(s, (char) => {
        const code = char.codePointAt(0)!
        if (code < 0x80) return char
        return code > 0xffff ? `\\u{${code.toString(16)}}` : `\\u${code.toString(16).padStart(4, '0')}`
      }).join(''),
  },
  {
    id: 'unicode-unescape',
    label: 'Unicode unescape',
    category: 'Encoding',
    run: (s) =>
      s.replace(/\\u\{([\da-f]+)\}|\\u([\da-f]{4})/gi, (_, wide: string | undefined, short: string | undefined) =>
        String.fromCodePoint(parseInt(wide ?? short!, 16)),
      ),
  },
  { id: 'sha1', label: 'SHA-1', category: 'Hashing', run: digest('SHA-1') },
  { id: 'sha256', label: 'SHA-256', category: 'Hashing', run: digest('SHA-256') },
  { id: 'sha384', label: 'SHA-384', category: 'Hashing', run: digest('SHA-384') },
  { id: 'sha512', label: 'SHA-512', category: 'Hashing', run: digest('SHA-512') },
  { id: 'json-escape', label: 'JSON string escape', category: 'Format', run: (s) => JSON.stringify(s).slice(1, -1) },
  {
    id: 'json-unescape',
    label: 'JSON string unescape',
    category: 'Format',
    run: (s) => {
      const parsed: unknown = JSON.parse(`"${s.replace(/^"|"$/g, '')}"`)
      return String(parsed)
    },
  },
  { id: 'json-pretty', label: 'JSON prettify', category: 'Format', run: (s) => JSON.stringify(JSON.parse(s), null, 2) },
  { id: 'json-minify', label: 'JSON minify', category: 'Format', run: (s) => JSON.stringify(JSON.parse(s)) },
  {
    id: 'query-to-json',
    label: 'Query string → JSON',
    category: 'Format',
    run: (s) => {
      const params = new URLSearchParams(s.trim().replace(/^[^?]*\?/, ''))
      const result: Record<string, string | string[]> = {}
      for (const [key, value] of params) {
        const existing = result[key]
        result[key] = existing === undefined ? value : [...(Array.isArray(existing) ? existing : [existing]), value]
      }
      return JSON.stringify(result, null, 2)
    },
  },
  { id: 'upper', label: 'UPPERCASE', category: 'Text', run: (s) => s.toUpperCase() },
  { id: 'lower', label: 'lowercase', category: 'Text', run: (s) => s.toLowerCase() },
  {
    id: 'camel',
    label: 'camelCase',
    category: 'Text',
    run: (s) => words(s).map((word, i) => (i === 0 ? word : capitalize(word))).join(''),
  },
  { id: 'pascal', label: 'PascalCase', category: 'Text', run: (s) => words(s).map(capitalize).join('') },
  { id: 'snake', label: 'snake_case', category: 'Text', run: (s) => words(s).join('_') },
  { id: 'kebab', label: 'kebab-case', category: 'Text', run: (s) => words(s).join('-') },
  { id: 'constant', label: 'CONSTANT_CASE', category: 'Text', run: (s) => words(s).join('_').toUpperCase() },
  { id: 'reverse', label: 'Reverse', category: 'Text', run: (s) => Array.from(s).reverse().join('') },
  {
    id: 'sort-lines',
    label: 'Sort lines',
    category: 'Text',
    run: (s) =>
      s
        .split('\n')
        .sort((a, b) => a.localeCompare(b))
        .join('\n'),
  },
  { id: 'dedupe-lines', label: 'Dedupe lines', category: 'Text', run: (s) => [...new Set(s.split('\n'))].join('\n') },
  { id: 'trim', label: 'Trim whitespace', category: 'Text', run: (s) => s.trim() },
  { id: 'to-iso', label: 'Timestamp → ISO 8601', category: 'Time', run: (s) => parseTimestamp(s).toISOString() },
  {
    id: 'to-unix',
    label: 'Date → Unix seconds',
    category: 'Time',
    run: (s) => String(Math.floor(parseTimestamp(s).getTime() / 1000)),
  },
  {
    id: 'to-unix-ms',
    label: 'Date → Unix millis',
    category: 'Time',
    run: (s) => String(parseTimestamp(s).getTime()),
  },
]

export const TRANSFORMS_BY_ID = new Map(TRANSFORMS.map((transform) => [transform.id, transform]))

export async function runPipeline(input: string, ids: readonly string[]): Promise<PipelineStep[]> {
  const steps: PipelineStep[] = []
  let current = input
  for (const id of ids) {
    const transform = TRANSFORMS_BY_ID.get(id)
    if (!transform) continue
    const startedAt = performance.now()
    try {
      current = await transform.run(current)
      steps.push({ id, label: transform.label, output: current, error: null, durationMs: performance.now() - startedAt })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      steps.push({ id, label: transform.label, output: '', error: message, durationMs: performance.now() - startedAt })
      break
    }
  }
  return steps
}
