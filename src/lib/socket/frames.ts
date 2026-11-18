import { base64DecodeBytes } from '@/lib/codec/bytes'

export type FrameDirection = 'in' | 'out' | 'system'

export interface Frame {
  id: number
  direction: FrameDirection
  data: string
  binary: boolean
  encoding?: 'base64'
  size: number
  at: number
}

export interface FrameStats {
  sent: number
  received: number
  bytesIn: number
  bytesOut: number
}

export function tryParseJson(data: string): unknown {
  const trimmed = data.trim()
  if (!/^[[{]/.test(trimmed)) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

export function previewFrame(data: string, max = 140): string {
  const flat = data.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export function frameDisplayData(frame: Frame): string {
  if (frame.encoding !== 'base64') return frame.data
  const maxBytes = 512
  const prefix = frame.data.slice(0, Math.ceil(maxBytes / 3) * 4)
  const bytes = base64DecodeBytes(prefix).subarray(0, maxBytes)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')
  return frame.size > maxBytes ? `${hex} …` : hex
}

export function frameStats(frames: readonly Frame[]): FrameStats {
  return frames.reduce<FrameStats>(
    (stats, frame) => {
      if (frame.direction === 'in') {
        stats.received += 1
        stats.bytesIn += frame.size
      } else if (frame.direction === 'out') {
        stats.sent += 1
        stats.bytesOut += frame.size
      }
      return stats
    },
    { sent: 0, received: 0, bytesIn: 0, bytesOut: 0 },
  )
}

export function filterFrames(frames: readonly Frame[], query: string, direction: FrameDirection | 'all'): Frame[] {
  const needle = query.trim().toLowerCase()
  return frames.filter(
    (frame) =>
      (direction === 'all' || frame.direction === direction) && (!needle || frameDisplayData(frame).toLowerCase().includes(needle)),
  )
}

export function isValidSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:'
  } catch {
    return false
  }
}
