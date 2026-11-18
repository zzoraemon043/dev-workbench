import { describe, expect, it, vi } from 'vitest'
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

  it('diffs 16,000 lines against empty text without allocating a Myers trace', () => {
    const trace = vi.spyOn(Int32Array.prototype, 'slice').mockImplementation(() => {
      throw new Error('A one-sided diff should not allocate a trace')
    })
    try {
      const text = Array.from({ length: 16_000 }, (_, i) => String(i)).join('\n')
      const insertions = diffLines('', text)
      expect(insertions).toHaveLength(16_000)
      expect(insertions.at(-1)).toEqual({ kind: 'insert', text: '15999', oldLine: null, newLine: 16_000 })
      const deletions = diffLines(text, '')
      expect(deletions).toHaveLength(16_000)
      expect(deletions.at(-1)).toEqual({ kind: 'delete', text: '15999', oldLine: 16_000, newLine: null })
    } finally {
      trace.mockRestore()
    }
  })

  it('bounds trace memory while preserving matches in a large two-sided diff', () => {
    let bytes = 0
    const slice = Int32Array.prototype.slice
    const trace = vi.spyOn(Int32Array.prototype, 'slice').mockImplementation(function (this: Int32Array, start = 0, end = this.length) {
      bytes += (end - start) * Int32Array.BYTES_PER_ELEMENT
      if (bytes > 16 * 1024 * 1024) throw new Error('Diff trace exceeded 16 MiB')
      return slice.call(this, start, end)
    })
    try {
      const before = Array.from({ length: 3000 }, (_, i) => (i === 1500 ? 'shared' : 'before ' + i))
      const after = Array.from({ length: 3000 }, (_, i) => (i === 1501 ? 'shared' : 'after ' + i))
      const edits = diffSequences(before, after)
      expect(edits.filter((edit) => edit.kind === 'equal')).toEqual([
        { kind: 'equal', value: 'shared', oldIndex: 1500, newIndex: 1501 },
      ])
      expect(edits.filter((edit) => edit.kind !== 'insert').map((edit) => edit.value)).toEqual(before)
      expect(edits.filter((edit) => edit.kind !== 'delete').map((edit) => edit.value)).toEqual(after)
    } finally {
      trace.mockRestore()
    }
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
  })

  it('exports ranges and marks missing final newlines in the hunk', () => {
    expect(toUnifiedPatch('a\nb', 'a\nc')).toBe(
      '--- a\n+++ b\n@@ -1,2 +1,2 @@\n a\n-b\n\\ No newline at end of file\n+c\n\\ No newline at end of file\n',
    )
  })

  it('preserves final newline changes and CRLF bytes', () => {
    expect(toUnifiedPatch('a\r\nb', 'a\r\nb\r\n')).toBe(
      '--- a\n+++ b\n@@ -1,2 +1,2 @@\n a\r\n-b\n\\ No newline at end of file\n+b\r\n',
    )
  })

  it('uses zero-length ranges for empty files and omits identical patches', () => {
    expect(toUnifiedPatch('', 'x\n')).toBe('--- a\n+++ b\n@@ -0,0 +1,1 @@\n+x\n')
    expect(toUnifiedPatch('x\n', '')).toBe('--- a\n+++ b\n@@ -1,1 +0,0 @@\n-x\n')
    expect(toUnifiedPatch('x\n', 'x\n')).toBe('')
  })
})
