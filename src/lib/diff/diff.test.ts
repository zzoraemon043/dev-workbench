import { describe, expect, it } from 'vitest'
import { diffSequences } from './myers'
import { diffLines, diffWords, splitLines, summarize, toSplitRows, toUnifiedPatch } from './text'

function apply(a: string[], b: string[]): string[] {
  return diffSequences(a, b)
    .filter((edit) => edit.kind !== 'delete')
    .map((edit) => edit.value)
}

describe('diffSequences', () => {
  it('produces a minimal edit script', () => {
    const edits = diffSequences([...'ABCABBA'], [...'CBABAC'])
    expect(edits.filter((edit) => edit.kind !== 'equal')).toHaveLength(5)
  })

  it('reconstructs the target sequence for random inputs', () => {
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let round = 0; round < 200; round += 1) {
      const a = Array.from({ length: Math.floor(random() * 12) }, () => 'abc'[Math.floor(random() * 3)]!)
      const b = Array.from({ length: Math.floor(random() * 12) }, () => 'abc'[Math.floor(random() * 3)]!)
      expect(apply(a, b)).toEqual(b)
      const kept = diffSequences(a, b).filter((edit) => edit.kind !== 'insert')
      expect(kept.map((edit) => a[edit.oldIndex!])).toEqual(a)
    }
  })

  it('handles empty inputs', () => {
    expect(diffSequences([], [])).toEqual([])
    expect(diffSequences(['a'], []).map((edit) => edit.kind)).toEqual(['delete'])
    expect(diffSequences([], ['a']).map((edit) => edit.kind)).toEqual(['insert'])
  })
})

describe('diffLines', () => {
  it('numbers lines on both sides', () => {
    expect(diffLines('a\nb\nc', 'a\nB\nc')).toEqual([
      { kind: 'equal', text: 'a', oldLine: 1, newLine: 1 },
      { kind: 'delete', text: 'b', oldLine: 2, newLine: null },
      { kind: 'insert', text: 'B', oldLine: null, newLine: 2 },
      { kind: 'equal', text: 'c', oldLine: 3, newLine: 3 },
    ])
  })

  it('can ignore whitespace and case', () => {
    const lines = diffLines('  Hello   World', 'hello world', { ignoreWhitespace: true, ignoreCase: true })
    expect(lines.map((line) => line.kind)).toEqual(['equal'])
  })

  it('normalizes CRLF line endings', () => {
    expect(splitLines('a\r\nb\rc')).toEqual(['a', 'b', 'c'])
    expect(splitLines('')).toEqual([])
  })
})

describe('split view', () => {
  it('pairs replaced lines and highlights changed words', () => {
    const rows = toSplitRows(diffLines('const a = 1\nkeep', 'const b = 1\nkeep\nextra'))
    expect(rows.map((row) => row.kind)).toEqual(['change', 'equal', 'insert'])
    expect(rows[0]!.left!.parts).toEqual([
      { text: 'const ', changed: false },
      { text: 'a', changed: true },
      { text: ' = 1', changed: false },
    ])
  })

  it('diffs words independently', () => {
    expect(diffWords('foo bar', 'foo baz').right).toEqual([
      { text: 'foo ', changed: false },
      { text: 'baz', changed: true },
    ])
  })
})

describe('summary and patch', () => {
  it('summarizes changes', () => {
    const lines = diffLines('a\nb', 'a\nc')
    expect(summarize(lines)).toEqual({ additions: 1, deletions: 1, unchanged: 1, similarity: 0.5 })
    expect(toUnifiedPatch(lines)).toBe('--- a\n+++ b\n a\n-b\n+c')
  })
})
