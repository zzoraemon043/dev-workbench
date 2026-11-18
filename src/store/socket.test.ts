import { afterEach, expect, it, vi } from 'vitest'
import { routePastedText } from '@/hooks/useSmartPaste'
import { base64DecodeBytes } from '@/lib/codec/bytes'
import { frameDisplayData } from '@/lib/socket/frames'
import { useSocket } from './socket'
import { useWorkbench } from './workbench'

vi.mock('@/store/toast', () => ({ toast: vi.fn() }))

class FakeWebSocket {
  static readonly OPEN = 1
  static current: FakeWebSocket
  readyState = 0
  protocol = ''
  onopen?: () => void
  onclose?: (event: { code: number; reason: string }) => void
  onmessage?: (event: { data: ArrayBuffer | Blob }) => Promise<void>
  send = vi.fn()

  constructor() {
    FakeWebSocket.current = this
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.()
  }

  close() {
    this.readyState = 3
    this.onclose?.({ code: 1000, reason: '' })
  }
}

afterEach(() => {
  useSocket.getState().disconnect()
  useSocket.getState().clear()
  vi.unstubAllGlobals()
})

it('requires reconnecting after smart paste changes the socket URL', () => {
  vi.stubGlobal('WebSocket', FakeWebSocket)
  const firstUrl = 'wss://first.example/socket'
  const nextUrl = 'wss://next.example/socket'
  const { connect, send, disconnect } = useSocket.getState()

  routePastedText(firstUrl)
  connect(firstUrl, [])
  const firstSocket = FakeWebSocket.current
  firstSocket.open()
  expect(send('before paste')).toBe(true)
  firstSocket.send.mockClear()

  routePastedText(nextUrl)
  expect(useWorkbench.getState().socket.url).toBe(nextUrl)
  expect(send('after paste')).toBe(false)
  expect(firstSocket.send).not.toHaveBeenCalled()
  expect(useSocket.getState()).toMatchObject({ connectedUrl: firstUrl })

  disconnect()
  connect(nextUrl, [])
  const nextSocket = FakeWebSocket.current
  nextSocket.open()
  expect(useSocket.getState()).toMatchObject({ connectedUrl: nextUrl })
  expect(send('after reconnect')).toBe(true)
  expect(nextSocket.send).toHaveBeenCalledWith('after reconnect')
})

it.each(['ArrayBuffer', 'Blob'])('exports all binary bytes received as %s', async (kind) => {
  vi.stubGlobal('WebSocket', FakeWebSocket)
  const socket = useSocket.getState()
  socket.connect('wss://example.test/socket', [])
  FakeWebSocket.current.open()
  const bytes = Uint8Array.from({ length: 1024 }, (_, i) => (i * 31) % 251)
  const data = kind === 'Blob' ? new Blob([bytes]) : bytes.buffer
  await FakeWebSocket.current.onmessage!({ data })

  const exported = JSON.parse(JSON.stringify(useSocket.getState().frames)).at(-1)
  expect(exported).toMatchObject({ binary: true, size: 1024, encoding: 'base64' })
  expect(base64DecodeBytes(exported.data)).toEqual(bytes)
  const preview = frameDisplayData(exported).split(' ')
  expect(preview).toHaveLength(513)
  expect(preview.at(-1)).toBe('…')
})
