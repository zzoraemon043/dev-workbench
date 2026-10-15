export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string; line: number; column: number }

export type Indent = 2 | 4 | '\t'

export interface JsonStats {
  bytes: number
  keys: number
  depth: number
  nodes: number
}

const POSITION_PATTERN = /position (\d+)/
const LINE_COLUMN_PATTERN = /line (\d+) column (\d+)/

export function locate(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset)
  const lines = before.split('\n')
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

export function parseJson(source: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(source) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const lineColumn = LINE_COLUMN_PATTERN.exec(message)
    if (lineColumn) {
      return { ok: false, error: message, line: Number(lineColumn[1]), column: Number(lineColumn[2]) }
    }
    const position = POSITION_PATTERN.exec(message)
    const offset = position ? Number(position[1]) : source.length
    return { ok: false, error: message, ...locate(source, offset) }
  }
}

export function formatJson(value: unknown, indent: Indent = 2): string {
  return JSON.stringify(value, null, indent)
}

export function minifyJson(value: unknown): string {
  return JSON.stringify(value)
}

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, sortKeysDeep(value[key])]),
    )
  }
  return value
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function collectStats(value: unknown, source: string): JsonStats {
  let keys = 0
  let nodes = 0
  let depth = 0
  const stack: Array<[unknown, number]> = [[value, 1]]
  while (stack.length > 0) {
    const [current, level] = stack.pop()!
    nodes += 1
    depth = Math.max(depth, level)
    if (Array.isArray(current)) {
      for (const item of current) stack.push([item, level + 1])
    } else if (isPlainObject(current)) {
      for (const child of Object.values(current)) {
        keys += 1
        stack.push([child, level + 1])
      }
    }
  }
  return { bytes: new TextEncoder().encode(source).length, keys, depth, nodes }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
