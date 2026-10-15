import { useEffect } from 'react'
import { buildHash, decodeShareState, encodeShareState, parseHash } from '@/lib/share/link'
import { toast } from '@/store/toast'
import { SHAREABLE_FIELDS, pickShareable, useWorkbench, type ToolId, type ToolStates } from '@/store/workbench'
import { TOOL_IDS } from '@/tools/registry'

function isToolId(value: string | null): value is ToolId {
  return value !== null && (TOOL_IDS as string[]).includes(value)
}

function sanitize<K extends ToolId>(tool: K, payload: unknown): Partial<ToolStates[K]> {
  if (typeof payload !== 'object' || payload === null) return {}
  const allowed = new Set<string>(SHAREABLE_FIELDS[tool] as string[])
  const defaults = useWorkbench.getState()[tool] as unknown as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => allowed.has(key) && typeof value === typeof defaults[key] && Array.isArray(value) === Array.isArray(defaults[key]),
    ),
  ) as Partial<ToolStates[K]>
}

export async function createShareLink(): Promise<string> {
  const state = useWorkbench.getState()
  const tool = state.activeTool
  const encoded = await encodeShareState(pickShareable(tool, state[tool]))
  const url = new URL(window.location.href)
  url.hash = buildHash(tool, encoded)
  return url.toString()
}

export function useHashSync(): void {
  const activeTool = useWorkbench((state) => state.activeTool)

  useEffect(() => {
    const applyHash = async () => {
      const { tool, share } = parseHash(window.location.hash)
      if (!isToolId(tool)) return
      const store = useWorkbench.getState()
      if (share) {
        try {
          store.update(tool, sanitize(tool, await decodeShareState(share)))
          toast('Loaded shared workspace')
        } catch {
          toast('This share link is corrupted or truncated', 'error')
        }
        window.history.replaceState(null, '', buildHash(tool))
      }
      if (store.activeTool !== tool) store.setActiveTool(tool)
    }
    void applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  useEffect(() => {
    const { tool } = parseHash(window.location.hash)
    if (tool !== activeTool) window.history.replaceState(null, '', buildHash(activeTool))
  }, [activeTool])
}
