import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Indent } from '@/lib/json/parse'
import { SAMPLES } from './samples'

export type ToolId = 'json' | 'regex' | 'jwt' | 'diff' | 'codec' | 'socket'
export type ThemePreference = 'light' | 'dark' | 'system'

export interface JsonState {
  input: string
  indent: Indent
  view: 'tree' | 'types' | 'query'
  query: string
  rootName: string
  readonlyTypes: boolean
  declaration: 'interface' | 'type'
}

export interface RegexState {
  pattern: string
  flags: string
  input: string
  replacement: string
  panel: 'matches' | 'explain' | 'replace'
}

export interface JwtState {
  token: string
  secret: string
}

export interface DiffState {
  left: string
  right: string
  view: 'split' | 'unified'
  ignoreWhitespace: boolean
  ignoreCase: boolean
}

export interface CodecState {
  input: string
  pipeline: string[]
}

export interface SocketState {
  url: string
  protocols: string
  draft: string
}

export interface ToolStates {
  json: JsonState
  regex: RegexState
  jwt: JwtState
  diff: DiffState
  codec: CodecState
  socket: SocketState
}

export const SHAREABLE_FIELDS: { [K in ToolId]: Array<keyof ToolStates[K]> } = {
  json: ['input', 'view', 'query'],
  regex: ['pattern', 'flags', 'input', 'replacement', 'panel'],
  jwt: ['token'],
  diff: ['left', 'right', 'view', 'ignoreWhitespace', 'ignoreCase'],
  codec: ['input', 'pipeline'],
  socket: ['url', 'protocols', 'draft'],
}

interface WorkbenchStore extends ToolStates {
  activeTool: ToolId
  theme: ThemePreference
  sidebarCollapsed: boolean
  paletteOpen: boolean
  shortcutsOpen: boolean
  setActiveTool: (tool: ToolId) => void
  setTheme: (theme: ThemePreference) => void
  toggleSidebar: () => void
  setPaletteOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  update: <K extends ToolId>(tool: K, patch: Partial<ToolStates[K]>) => void
  reset: (tool: ToolId) => void
}

export const DEFAULT_TOOL_STATES: ToolStates = {
  json: {
    input: SAMPLES.json,
    indent: 2,
    view: 'tree',
    query: '$.users[*].email',
    rootName: 'Root',
    readonlyTypes: false,
    declaration: 'interface',
  },
  regex: {
    pattern: SAMPLES.regex.pattern,
    flags: SAMPLES.regex.flags,
    input: SAMPLES.regex.input,
    replacement: '[$<user> at $<domain>]',
    panel: 'matches',
  },
  jwt: { token: SAMPLES.jwt, secret: 'your-256-bit-secret' },
  diff: { left: SAMPLES.diff.left, right: SAMPLES.diff.right, view: 'split', ignoreWhitespace: false, ignoreCase: false },
  codec: { input: SAMPLES.codec, pipeline: ['url-decode', 'query-to-json'] },
  socket: { url: 'wss://echo.websocket.org', protocols: '', draft: '{\n  "type": "ping",\n  "id": 1\n}' },
}

export const useWorkbench = create<WorkbenchStore>()(
  persist(
    (set) => ({
      ...DEFAULT_TOOL_STATES,
      activeTool: 'json',
      theme: 'system',
      sidebarCollapsed: false,
      paletteOpen: false,
      shortcutsOpen: false,
      setActiveTool: (activeTool) => set({ activeTool, paletteOpen: false }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      update: (tool, patch) => set((state) => ({ [tool]: { ...state[tool], ...patch } }) as Partial<WorkbenchStore>),
      reset: (tool) => set({ [tool]: DEFAULT_TOOL_STATES[tool] } as Partial<WorkbenchStore>),
    }),
    {
      name: 'dev-workbench',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ paletteOpen, shortcutsOpen, ...rest }) => rest,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<WorkbenchStore>
        const merged = { ...current, ...saved }
        for (const tool of Object.keys(DEFAULT_TOOL_STATES) as ToolId[]) {
          Object.assign(merged, { [tool]: { ...DEFAULT_TOOL_STATES[tool], ...saved[tool] } })
        }
        return merged
      },
    },
  ),
)

export function useToolState<K extends ToolId>(tool: K): [ToolStates[K], (patch: Partial<ToolStates[K]>) => void] {
  const state = useWorkbench((store) => store[tool])
  const update = useWorkbench((store) => store.update)
  return [state, (patch) => update(tool, patch)]
}

export function pickShareable<K extends ToolId>(tool: K, state: ToolStates[K]): Partial<ToolStates[K]> {
  const fields = SHAREABLE_FIELDS[tool] as Array<keyof ToolStates[K]>
  return Object.fromEntries(fields.map((field) => [field, state[field]])) as Partial<ToolStates[K]>
}
