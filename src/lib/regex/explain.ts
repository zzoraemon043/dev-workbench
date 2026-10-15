export type TokenKind = 'anchor' | 'class' | 'group' | 'quantifier' | 'alternation' | 'escape' | 'literal' | 'any'

export interface RegexToken {
  kind: TokenKind
  source: string
  description: string
  depth: number
}

const ESCAPES: Record<string, string> = {
  d: 'a digit (0-9)',
  D: 'any non-digit',
  w: 'a word character (letter, digit, underscore)',
  W: 'any non-word character',
  s: 'a whitespace character',
  S: 'any non-whitespace character',
  b: 'a word boundary',
  B: 'a non-word boundary',
  n: 'a line feed',
  r: 'a carriage return',
  t: 'a tab',
  '0': 'a NUL character',
}

const GROUP_PREFIXES: Array<[RegExp, (match: RegExpExecArray) => string]> = [
  [/^\(\?:/, () => 'non-capturing group'],
  [/^\(\?=/, () => 'positive lookahead'],
  [/^\(\?!/, () => 'negative lookahead'],
  [/^\(\?<=/, () => 'positive lookbehind'],
  [/^\(\?<!/, () => 'negative lookbehind'],
  [/^\(\?<([A-Za-z_$][\w$]*)>/, (match) => `named capture group "${match[1]}"`],
]

function describeQuantifier(source: string): string {
  const lazy = source.endsWith('?') && source.length > 1
  const core = lazy ? source.slice(0, -1) : source
  const suffix = lazy ? ' (lazy)' : ''
  if (core === '*') return `zero or more times${suffix}`
  if (core === '+') return `one or more times${suffix}`
  if (core === '?') return `optional${suffix}`
  const range = /^\{(\d+)(,(\d*))?\}$/.exec(core)
  if (!range) return `quantifier ${source}`
  const [, min, comma, max] = range
  if (!comma) return `exactly ${min} times${suffix}`
  if (!max) return `${min} or more times${suffix}`
  return `between ${min} and ${max} times${suffix}`
}

function describeEscape(source: string): { kind: TokenKind; description: string } {
  const char = source[1] ?? ''
  if (char === 'b' || char === 'B') return { kind: 'anchor', description: ESCAPES[char]! }
  if (ESCAPES[char]) return { kind: 'escape', description: ESCAPES[char] }
  if (/^\\u\{?[\da-f]+\}?$/i.test(source)) return { kind: 'escape', description: `unicode character ${source}` }
  if (/^\\x[\da-f]{2}$/i.test(source)) return { kind: 'escape', description: `hex character ${source}` }
  if (/^\\[pP]\{.+\}$/.test(source)) {
    const negated = char === 'P' ? 'not ' : ''
    return { kind: 'class', description: `a character ${negated}in unicode property ${source.slice(3, -1)}` }
  }
  if (/^\\k<.+>$/.test(source)) return { kind: 'escape', description: `back-reference to group "${source.slice(3, -1)}"` }
  if (/^\\[1-9]\d*$/.test(source)) return { kind: 'escape', description: `back-reference to group #${source.slice(1)}` }
  return { kind: 'literal', description: `the literal "${char}"` }
}

function readEscape(pattern: string, start: number): string {
  const rest = pattern.slice(start)
  const extended = /^\\(u\{[\da-fA-F]+\}|u[\da-fA-F]{4}|x[\da-fA-F]{2}|[pP]\{[^}]+\}|k<[^>]+>|[1-9]\d*|c[A-Za-z])/.exec(rest)
  return extended ? extended[0] : rest.slice(0, 2)
}

function readClass(pattern: string, start: number): string {
  for (let i = start + 1; i < pattern.length; i += 1) {
    if (pattern[i] === '\\') i += 1
    else if (pattern[i] === ']') return pattern.slice(start, i + 1)
  }
  return pattern.slice(start)
}

export function explainRegex(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = []
  let depth = 0
  let captureIndex = 0
  let i = 0

  while (i < pattern.length) {
    const char = pattern[i]!
    const rest = pattern.slice(i)
    const push = (kind: TokenKind, source: string, description: string, at = depth) => {
      tokens.push({ kind, source, description, depth: at })
      i += source.length
    }

    if (char === '\\') {
      const source = readEscape(pattern, i)
      const { kind, description } = describeEscape(source)
      push(kind, source, description)
    } else if (char === '[') {
      const source = readClass(pattern, i)
      const negated = source.startsWith('[^')
      push('class', source, `${negated ? 'any character except' : 'one of'} ${source}`)
    } else if (char === '(') {
      const prefix = GROUP_PREFIXES.map(([regex, describe]) => {
        const match = regex.exec(rest)
        return match ? { source: match[0], description: describe(match) } : null
      }).find(Boolean)
      if (prefix?.description.startsWith('named')) captureIndex += 1
      const description = prefix?.description ?? `capture group #${(captureIndex += 1)}`
      push('group', prefix?.source ?? '(', `start of ${description}`)
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
      push('group', ')', 'end of group')
    } else if (char === '|') {
      push('alternation', '|', 'or')
    } else if (char === '^') {
      push('anchor', '^', 'start of input (or line with the m flag)')
    } else if (char === '$') {
      push('anchor', '$', 'end of input (or line with the m flag)')
    } else if (char === '.') {
      push('any', '.', 'any character except line breaks (unless the s flag is set)')
    } else {
      const quantifier = /^([*+?]|\{\d+(,\d*)?\})\??/.exec(rest)
      if (quantifier) {
        push('quantifier', quantifier[0], describeQuantifier(quantifier[0]))
      } else {
        const literal = /^[^\\[\]()|^$.*+?{]+/.exec(rest)?.[0] ?? char
        const nextIsQuantifier = /^([*+?]|\{\d+(,\d*)?\})/.test(pattern.slice(i + literal.length))
        const source = nextIsQuantifier && literal.length > 1 ? literal.slice(0, -1) : literal
        push('literal', source, `the literal text "${source}"`)
      }
    }
  }
  return tokens
}

export interface RegexPreset {
  id: string
  label: string
  pattern: string
  flags: string
  sample: string
}

export const REGEX_PRESETS: RegexPreset[] = [
  {
    id: 'email',
    label: 'Email address',
    pattern: '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+\\.[\\w.-]+)',
    flags: 'gi',
    sample: 'Ping ada@lovelace.dev or grace.hopper+navy@cobol.org — not @nobody.',
  },
  {
    id: 'url',
    label: 'URL',
    pattern: 'https?:\\/\\/(?<host>[\\w.-]+)(?<path>\\/[^\\s?#]*)?(?<query>\\?[^\\s#]*)?',
    flags: 'gi',
    sample: 'Docs at https://vite.dev/guide/ and https://api.example.com/v1/users?page=2#top',
  },
  {
    id: 'ipv4',
    label: 'IPv4 address',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b',
    flags: 'g',
    sample: 'Gateway 192.168.0.1, DNS 1.1.1.1, invalid 256.300.1.1',
  },
  {
    id: 'uuid',
    label: 'UUID',
    pattern: '\\b[\\da-f]{8}-[\\da-f]{4}-[1-8][\\da-f]{3}-[89ab][\\da-f]{3}-[\\da-f]{12}\\b',
    flags: 'gi',
    sample: 'request 3f2b8c1e-9d4a-4e6f-8b2a-1c3d5e7f9a0b failed, retry 0190a6f1-7c2e-7b3d-9a4f-5e6d7c8b9a01',
  },
  {
    id: 'iso-date',
    label: 'ISO 8601 date',
    pattern: '(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])(?:T(?<time>\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?)(?<tz>Z|[+-]\\d{2}:\\d{2})?)?',
    flags: 'g',
    sample: 'Released 2026-10-15T09:30:00Z, patched 2026-11-02, EOL 2027-13-40',
  },
  {
    id: 'semver',
    label: 'Semantic version',
    pattern: '\\bv?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<pre>[\\da-z-]+(?:\\.[\\da-z-]+)*))?\\b',
    flags: 'gi',
    sample: 'Upgrade react 18.3.1 → v19.0.0-rc.1, keep vite 8.3.4',
  },
  {
    id: 'hex-color',
    label: 'Hex color',
    pattern: '#(?:[\\da-f]{3}){1,2}\\b',
    flags: 'gi',
    sample: 'Palette: #7c3aed, #FFF, #0ea5e9 and not #zzzzzz',
  },
]
