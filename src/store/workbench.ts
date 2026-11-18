import { create } from 'zustand'
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
  json: ['input', 'view', 'query', 'rootName', 'declaration', 'readonlyTypes'],
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
  unsavedInputs: string[]
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
  codec: { input: SAMPLES.codec, pipeline: ['query-to-json'] },
  socket: { url: 'wss://echo.websocket.org', protocols: '', draft: '{\n  "type": "ping",\n  "id": 1\n}' },
}

const STORAGE_KEY = 'dev-workbench'
const TOOL_IDS = Object.keys(DEFAULT_TOOL_STATES) as ToolId[]
const INPUTS = [
  ['json', 'input', 'JSON input'],
  ['json', 'query', 'JSON query'],
  ['json', 'rootName', 'JSON root name'],
  ['regex', 'pattern', 'Regex pattern'],
  ['regex', 'input', 'Regex test text'],
  ['regex', 'replacement', 'Regex replacement'],
  ['jwt', 'token', 'JWT token'],
  ['jwt', 'secret', 'JWT secret'],
  ['diff', 'left', 'Original diff text'],
  ['diff', 'right', 'Modified diff text'],
  ['codec', 'input', 'Codec input'],
  ['socket', 'url', 'WebSocket URL'],
  ['socket', 'protocols', 'WebSocket subprotocols'],
  ['socket', 'draft', 'WebSocket message'],
] as const satisfies ReadonlyArray<{ [K in ToolId]: [K, keyof ToolStates[K], string] }[ToolId]>

type Settings = Pick<WorkbenchStore, 'activeTool' | 'theme' | 'sidebarCollapsed'>
type SavedWorkspace = Settings & { [K in ToolId]: Partial<ToolStates[K]> }

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function readWorkspace(): Partial<SavedWorkspace> {
  const raw = readStorage(STORAGE_KEY)
  if (!raw) return {}
  try {
    const saved = JSON.parse(raw) as { version?: number; state?: Partial<SavedWorkspace> } | null
    return saved && (saved.version === undefined || saved.version === 1) ? (saved.state ?? {}) : {}
  } catch {
    return {}
  }
}

const inputKey = (tool: ToolId, field: string) => STORAGE_KEY + ':' + tool + ':' + field
const legacyInputs = new Map<string, string>()
const saved = readWorkspace()
const initialTools = { ...DEFAULT_TOOL_STATES }
for (const tool of TOOL_IDS) {
  Object.assign(initialTools, { [tool]: { ...DEFAULT_TOOL_STATES[tool], ...saved[tool] } })
}
for (const [tool, field] of INPUTS) {
  const key = inputKey(tool, field)
  const legacy = (saved[tool] as Record<string, unknown> | undefined)?.[field]
  if (typeof legacy === 'string') legacyInputs.set(key, legacy)
  const input = readStorage(key)
  if (input !== null) Object.assign(initialTools[tool], { [field]: input })
}

export const useWorkbench = create<WorkbenchStore>()((set) => ({
  ...initialTools,
  activeTool: saved.activeTool ?? 'json',
  theme: saved.theme ?? 'system',
  sidebarCollapsed: saved.sidebarCollapsed ?? false,
  paletteOpen: false,
  shortcutsOpen: false,
  unsavedInputs: [],
  setActiveTool: (activeTool) => set({ activeTool, paletteOpen: false }),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  update: (tool, patch) => set((state) => ({ [tool]: { ...state[tool], ...patch } }) as Partial<WorkbenchStore>),
  reset: (tool) => set({ [tool]: DEFAULT_TOOL_STATES[tool] } as Partial<WorkbenchStore>),
}))

function serializeSettings(state: WorkbenchStore): string {
  const settings = { activeTool: state.activeTool, theme: state.theme, sidebarCollapsed: state.sidebarCollapsed } as SavedWorkspace
  for (const tool of TOOL_IDS) Object.assign(settings, { [tool]: { ...state[tool] } })
  for (const [tool, field] of INPUTS) {
    // Keep the old value until this field has been saved under its own key.
    const legacy = legacyInputs.get(inputKey(tool, field))
    const toolSettings = settings[tool] as Record<string, unknown>
    if (legacy === undefined) delete toolSettings[field]
    else toolSettings[field] = legacy
  }
  return JSON.stringify({ version: 1, state: settings })
}

let savedSettings = serializeSettings(useWorkbench.getState())
useWorkbench.subscribe((state, previous) => {
  if (
    state.activeTool === previous.activeTool && state.theme === previous.theme &&
    state.sidebarCollapsed === previous.sidebarCollapsed && TOOL_IDS.every((tool) => state[tool] === previous[tool])
  ) return

  const unsaved = new Set(state.unsavedInputs)
  for (const [tool, field, label] of INPUTS) {
    const value = (state[tool] as unknown as Record<string, string>)[field]!
    if (value === (previous[tool] as unknown as Record<string, string>)[field]) continue
    const key = inputKey(tool, field)
    if (writeStorage(key, value)) {
      legacyInputs.delete(key)
      unsaved.delete(label)
    } else {
      unsaved.add(label)
    }
  }
  const settings = serializeSettings(state)
  if (settings !== savedSettings) {
    if (writeStorage(STORAGE_KEY, settings)) {
      savedSettings = settings
      unsaved.delete('Workspace settings')
    } else {
      unsaved.add('Workspace settings')
    }
  } else {
    unsaved.delete('Workspace settings')
  }
  if (unsaved.size !== state.unsavedInputs.length || state.unsavedInputs.some((label) => !unsaved.has(label))) {
    useWorkbench.setState({ unsavedInputs: [...unsaved] })
  }
})

export function useToolState<K extends ToolId>(tool: K): [ToolStates[K], (patch: Partial<ToolStates[K]>) => void] {
  const state = useWorkbench((store) => store[tool])
  const update = useWorkbench((store) => store.update)
  return [state, (patch) => update(tool, patch)]
}

export function pickShareable<K extends ToolId>(tool: K, state: ToolStates[K]): Partial<ToolStates[K]> {
  const fields = SHAREABLE_FIELDS[tool] as Array<keyof ToolStates[K]>
  return Object.fromEntries(fields.map((field) => [field, state[field]])) as Partial<ToolStates[K]>
}
