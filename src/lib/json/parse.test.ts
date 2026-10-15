import { describe, expect, it } from 'vitest'
import { collectStats, formatBytes, formatJson, locate, minifyJson, parseJson, sortKeysDeep } from './parse'

describe('parseJson', () => {
  it('parses valid documents', () => {
    expect(parseJson('{"a":[1,2]}')).toEqual({ ok: true, value: { a: [1, 2] } })
  })

  it('reports the line and column of syntax errors', () => {
    const result = parseJson('{\n  "a": 1,\n  "b": }')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.line).toBe(3)
      expect(result.column).toBeGreaterThan(1)
    }
  })
})

describe('locate', () => {
  it('maps an offset to a 1-based line and column', () => {
    expect(locate('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
  })
})

describe('formatting', () => {
  it('formats, minifies and deep-sorts keys', () => {
    const value = { b: 1, a: { d: [{ z: 1, y: 2 }], c: true } }
    expect(minifyJson(value)).toBe('{"b":1,"a":{"d":[{"z":1,"y":2}],"c":true}}')
    expect(formatJson({ a: 1 }, 4)).toBe('{\n    "a": 1\n}')
    expect(JSON.stringify(sortKeysDeep(value))).toBe('{"a":{"c":true,"d":[{"y":2,"z":1}]},"b":1}')
  })

  it('collects structural stats', () => {
    const source = '{"a":[1,{"b":null}]}'
    expect(collectStats(JSON.parse(source), source)).toEqual({ bytes: 20, keys: 2, depth: 4, nodes: 5 })
  })

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB')
  })
})
