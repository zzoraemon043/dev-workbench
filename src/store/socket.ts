import { create } from 'zustand'
import type { Frame, FrameDirection } from '@/lib/socket/frames'

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error'

const MAX_FRAMES = 2000

interface SocketStore {
  status: SocketStatus
  frames: Frame[]
  connectedAt: number | null
  connect: (url: string, protocols: string[]) => void
  disconnect: () => void
  send: (data: string) => boolean
  clear: () => void
}

let socket: WebSocket | null = null
let frameId = 0

async function readPayload(data: unknown): Promise<{ text: string; binary: boolean; size: number }> {
  if (typeof data === 'string') return { text: data, binary: false, size: new Blob([data]).size }
  const buffer = data instanceof Blob ? await data.arrayBuffer() : (data as ArrayBuffer)
  const bytes = new Uint8Array(buffer)
  const hex = Array.from(bytes.subarray(0, 512), (byte) => byte.toString(16).padStart(2, '0')).join(' ')
  return { text: bytes.length > 512 ? `${hex} …` : hex, binary: true, size: bytes.length }
}

export const useSocket = create<SocketStore>()((set, get) => {
  const record = (direction: FrameDirection, data: string, size = 0, binary = false) =>
    set((state) => ({
      frames: [...state.frames, { id: ++frameId, direction, data, size, binary, at: Date.now() }].slice(-MAX_FRAMES),
    }))

  return {
    status: 'idle',
    frames: [],
    connectedAt: null,
    connect: (url, protocols) => {
      get().disconnect()
      set({ status: 'connecting' })
      record('system', `Connecting to ${url}`)
      let instance: WebSocket
      try {
        instance = new WebSocket(url, protocols.length > 0 ? protocols : undefined)
      } catch (error) {
        set({ status: 'error' })
        record('system', error instanceof Error ? error.message : String(error))
        return
      }
      instance.binaryType = 'arraybuffer'
      socket = instance
      instance.onopen = () => {
        if (socket !== instance) return
        set({ status: 'open', connectedAt: Date.now() })
        record('system', `Connected${instance.protocol ? ` · protocol ${instance.protocol}` : ''}`)
      }
      instance.onmessage = async (event: MessageEvent) => {
        const payload = await readPayload(event.data)
        record('in', payload.text, payload.size, payload.binary)
      }
      instance.onerror = () => {
        if (socket !== instance) return
        set({ status: 'error' })
        record('system', 'Connection error — check the URL, protocol, or server CORS/origin policy')
      }
      instance.onclose = (event) => {
        if (socket !== instance) return
        socket = null
        set({ status: 'closed', connectedAt: null })
        record('system', `Closed · code ${event.code}${event.reason ? ` · ${event.reason}` : ''}`)
      }
    },
    disconnect: () => {
      if (!socket) return
      set({ status: 'closing' })
      socket.close(1000, 'Closed by user')
    },
    send: (data) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false
      socket.send(data)
      record('out', data, new Blob([data]).size)
      return true
    },
    clear: () => set({ frames: [] }),
  }
})
