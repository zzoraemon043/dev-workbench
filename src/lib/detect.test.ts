import { describe, expect, it } from 'vitest'
import { detectContent, parseRegexLiteral } from './detect'

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('detectContent', () => {
  it.each([
    [JWT, 'jwt'],
    [`Bearer ${JWT}`, 'jwt'],
    ['{"a": 1}', 'json'],
    ['[1, 2', 'codec'],
    ['wss://echo.example.com/socket', 'socket'],
    ['/^\\d+$/gm', 'regex'],
    ['1700000000', 'codec'],
    ['https://example.com/search?q=hello%20world', 'codec'],
    ['SGVsbG8gV29ybGQh', 'codec'],
    ['just some words', 'codec'],
  ])('routes %s to %s', (input, tool) => {
    expect(detectContent(input).tool).toBe(tool)
  })

  it('suggests a decode pipeline for base64 and timestamps', () => {
    expect(detectContent('SGVsbG8gV29ybGQh').pipeline).toEqual(['base64-decode'])
    expect(detectContent('1700000000000').pipeline).toEqual(['to-iso'])
  })
})

describe('parseRegexLiteral', () => {
  it('extracts pattern and flags', () => {
    expect(parseRegexLiteral('/a\\/b/gi')).toEqual({ pattern: 'a\\/b', flags: 'gi' })
    expect(parseRegexLiteral('nope')).toBeNull()
  })
})
