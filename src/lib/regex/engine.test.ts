import { describe, expect, it } from 'vitest'
import { captureGroupNames, compileRegex, findMatches, normalizeFlags, replaceAll, toSegments } from './engine'

function compile(pattern: string, flags = 'g'): RegExp {
  const result = compileRegex(pattern, flags)
  if (!result.ok) throw new Error(result.error)
  return result.regex
}

describe('compileRegex', () => {
  it('reports syntax errors instead of throwing', () => {
    const result = compileRegex('(unclosed', 'g')
    expect(result.ok).toBe(false)
  })

  it('normalizes duplicate and unsupported flags', () => {
    expect(normalizeFlags('ggxim')).toBe('gim')
  })
})

describe('findMatches', () => {
  it('returns all matches with capture group positions and names', () => {
    const matches = findMatches(compile('(?<key>\\w+)=(\\d+)'), 'a=1, bb=22')
    expect(matches).toHaveLength(2)
    expect(matches[1]).toMatchObject({ start: 5, end: 10, text: 'bb=22' })
    expect(matches[1]!.groups).toEqual([
      { index: 1, name: 'key', value: 'bb', start: 5, end: 7 },
      { index: 2, name: null, value: '22', start: 8, end: 10 },
    ])
  })

  it('stops after the first match without the global flag', () => {
    expect(findMatches(compile('\\d', ''), '123')).toHaveLength(1)
  })

  it('does not loop forever on zero-length matches', () => {
    expect(findMatches(compile('x*'), 'abc')).toHaveLength(4)
  })

  it('respects the match limit', () => {
    expect(findMatches(compile('.'), 'abcdef', 3)).toHaveLength(3)
  })
})

describe('captureGroupNames', () => {
  it('ignores escaped parens, classes, lookarounds and non-capturing groups', () => {
    expect(captureGroupNames('\\((?:a)(?<x>b)[(](?=c)(?<!d)(e)')).toEqual(['x', null])
  })
})

describe('toSegments', () => {
  it('splits input into matched and unmatched segments', () => {
    const input = 'one 22 three 4'
    expect(toSegments(input, findMatches(compile('\\d+'), input))).toEqual([
      { text: 'one ', match: null },
      { text: '22', match: 0 },
      { text: ' three ', match: null },
      { text: '4', match: 1 },
    ])
  })
})

describe('replaceAll', () => {
  it('supports named group references', () => {
    expect(replaceAll(compile('(?<y>\\d{4})-(?<m>\\d{2})'), '2026-10', '$<m>/$<y>')).toBe('10/2026')
  })
})
