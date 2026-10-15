import { diffSequences, type EditKind } from './myers'

export interface DiffOptions {
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
}

export interface InlinePart {
  text: string
  changed: boolean
}

export interface DiffLine {
  kind: EditKind
  text: string
  oldLine: number | null
  newLine: number | null
}

export interface SplitCell {
  line: number
  text: string
  parts: InlinePart[]
}

export interface SplitRow {
  kind: 'equal' | 'change' | 'insert' | 'delete'
  left: SplitCell | null
  right: SplitCell | null
}

export interface DiffSummary {
  additions: number
  deletions: number
  unchanged: number
  similarity: number
}

export function splitLines(text: string): string[] {
  if (text === '') return []
  return text.replace(/\r\n?/g, '\n').split('\n')
}

function lineKey(options: DiffOptions) {
  return (line: string) => {
    let key = options.ignoreWhitespace ? line.trim().replace(/\s+/g, ' ') : line
    if (options.ignoreCase) key = key.toLowerCase()
    return key
  }
}

export function diffLines(before: string, after: string, options: DiffOptions = {}): DiffLine[] {
  const oldLines = splitLines(before)
  const newLines = splitLines(after)
  return diffSequences(oldLines, newLines, lineKey(options)).map((edit) => ({
    kind: edit.kind,
    text: edit.kind === 'delete' ? oldLines[edit.oldIndex!]! : newLines[edit.newIndex!]!,
    oldLine: edit.oldIndex === null ? null : edit.oldIndex + 1,
    newLine: edit.newIndex === null ? null : edit.newIndex + 1,
  }))
}

const WORD_TOKENS = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu

export function diffWords(before: string, after: string): { left: InlinePart[]; right: InlinePart[] } {
  const oldTokens = before.match(WORD_TOKENS) ?? []
  const newTokens = after.match(WORD_TOKENS) ?? []
  const left: InlinePart[] = []
  const right: InlinePart[] = []
  const append = (parts: InlinePart[], text: string, changed: boolean) => {
    const last = parts.at(-1)
    if (last && last.changed === changed) last.text += text
    else parts.push({ text, changed })
  }
  for (const edit of diffSequences(oldTokens, newTokens)) {
    if (edit.kind !== 'insert') append(left, edit.value, edit.kind === 'delete')
    if (edit.kind !== 'delete') append(right, edit.value, edit.kind === 'insert')
  }
  return { left, right }
}

function plainCell(line: number, text: string, changed: boolean): SplitCell {
  return { line, text, parts: [{ text, changed }] }
}

export function toSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (line.kind === 'equal') {
      rows.push({
        kind: 'equal',
        left: plainCell(line.oldLine!, line.text, false),
        right: plainCell(line.newLine!, line.text, false),
      })
      i += 1
      continue
    }
    const deletions: DiffLine[] = []
    const insertions: DiffLine[] = []
    while (i < lines.length && lines[i]!.kind !== 'equal') {
      const current = lines[i]!
      if (current.kind === 'delete') deletions.push(current)
      else insertions.push(current)
      i += 1
    }
    const span = Math.max(deletions.length, insertions.length)
    for (let row = 0; row < span; row += 1) {
      const removed = deletions[row]
      const added = insertions[row]
      if (removed && added) {
        const words = diffWords(removed.text, added.text)
        rows.push({
          kind: 'change',
          left: { line: removed.oldLine!, text: removed.text, parts: words.left },
          right: { line: added.newLine!, text: added.text, parts: words.right },
        })
      } else if (removed) {
        rows.push({ kind: 'delete', left: plainCell(removed.oldLine!, removed.text, true), right: null })
      } else if (added) {
        rows.push({ kind: 'insert', left: null, right: plainCell(added.newLine!, added.text, true) })
      }
    }
  }
  return rows
}

export function summarize(lines: DiffLine[]): DiffSummary {
  const counts = { insert: 0, delete: 0, equal: 0 }
  for (const line of lines) counts[line.kind] += 1
  const total = counts.equal * 2 + counts.insert + counts.delete
  return {
    additions: counts.insert,
    deletions: counts.delete,
    unchanged: counts.equal,
    similarity: total === 0 ? 1 : (counts.equal * 2) / total,
  }
}

export function toUnifiedPatch(lines: DiffLine[], oldName = 'a', newName = 'b'): string {
  const body = lines.map((line) => `${line.kind === 'insert' ? '+' : line.kind === 'delete' ? '-' : ' '}${line.text}`)
  return [`--- ${oldName}`, `+++ ${newName}`, ...body].join('\n')
}
