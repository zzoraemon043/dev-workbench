import { describe, expect, it } from 'vitest'
import { filterFrames, frameStats, isValidSocketUrl, previewFrame, tryParseJson, type Frame } from './frames'

const frames: Frame[] = [
  { id: 1, direction: 'out', data: '{"op":"subscribe"}', binary: false, size: 18, at: 0 },
  { id: 2, direction: 'in', data: '{"op":"ack"}', binary: false, size: 12, at: 1 },
  { id: 3, direction: 'system', data: 'Connected', binary: false, size: 0, at: 2 },
  { id: 4, direction: 'in', data: 'pong', binary: false, size: 4, at: 3 },
]

describe('socket frames', () => {
  it('aggregates traffic stats', () => {
    expect(frameStats(frames)).toEqual({ sent: 1, received: 2, bytesIn: 16, bytesOut: 18 })
  })

  it('filters by direction and text', () => {
    expect(filterFrames(frames, 'op', 'all').map((frame) => frame.id)).toEqual([1, 2])
    expect(filterFrames(frames, '', 'in').map((frame) => frame.id)).toEqual([2, 4])
  })

  it('parses JSON payloads leniently', () => {
    expect(tryParseJson(' {"a":1} ')).toEqual({ a: 1 })
    expect(tryParseJson('{broken')).toBeUndefined()
    expect(tryParseJson('42')).toBeUndefined()
  })

  it('previews long payloads on one line', () => {
    expect(previewFrame('a\n  b', 10)).toBe('a b')
    expect(previewFrame('x'.repeat(20), 10)).toBe(`${'x'.repeat(9)}…`)
  })

  it('validates socket URLs', () => {
    expect(isValidSocketUrl('wss://example.com')).toBe(true)
    expect(isValidSocketUrl('https://example.com')).toBe(false)
    expect(isValidSocketUrl('nope')).toBe(false)
  })
})
