export const SUPPORTED_FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const
export type RegexFlag = (typeof SUPPORTED_FLAGS)[number]

export interface CaptureGroup {
  index: number
  name: string | null
  value: string | undefined
  start: number | null
  end: number | null
}

export interface RegexMatch {
  index: number
  start: number
  end: number
  text: string
  groups: CaptureGroup[]
}

export type CompileResult = { ok: true; regex: RegExp } | { ok: false; error: string }

export interface Segment {
  text: string
  match: number | null
}

export function normalizeFlags(flags: string): string {
  return SUPPORTED_FLAGS.filter((flag) => flags.includes(flag)).join('')
}

export function compileRegex(pattern: string, flags: string): CompileResult {
  try {
    return { ok: true, regex: new RegExp(pattern, normalizeFlags(flags)) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function captureGroupNames(source: string): Array<string | null> {
  const names: Array<string | null> = []
  let inClass = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (char === '\\') {
      i += 1
    } else if (inClass) {
      if (char === ']') inClass = false
    } else if (char === '[') {
      inClass = true
    } else if (char === '(') {
      if (source[i + 1] !== '?') {
        names.push(null)
      } else {
        const named = /^\(\?<([A-Za-z_$][\w$]*)>/.exec(source.slice(i))
        if (named) names.push(named[1]!)
      }
    }
  }
  return names
}

export function findMatches(regex: RegExp, input: string, limit = 5000): RegexMatch[] {
  const flags = new Set(regex.flags)
  const global = flags.has('g')
  flags.add('g')
  flags.add('d')
  const scanner = new RegExp(regex.source, [...flags].join(''))
  const names = captureGroupNames(regex.source)
  const matches: RegexMatch[] = []

  for (const match of input.matchAll(scanner)) {
    const start = match.index
    const groups: CaptureGroup[] = []
    for (let i = 1; i < match.length; i += 1) {
      const range = match.indices?.[i]
      groups.push({
        index: i,
        name: names[i - 1] ?? null,
        value: match[i],
        start: range ? range[0] : null,
        end: range ? range[1] : null,
      })
    }
    matches.push({ index: matches.length, start, end: start + match[0].length, text: match[0], groups })
    if (!global || matches.length >= limit) break
  }
  return matches
}

export function toSegments(input: string, matches: RegexMatch[]): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.start > cursor) segments.push({ text: input.slice(cursor, match.start), match: null })
    if (match.end > match.start) segments.push({ text: input.slice(match.start, match.end), match: match.index })
    cursor = Math.max(cursor, match.end)
  }
  if (cursor < input.length) segments.push({ text: input.slice(cursor), match: null })
  return segments
}

export function replaceAll(regex: RegExp, input: string, replacement: string): string {
  return input.replace(regex, replacement)
}
