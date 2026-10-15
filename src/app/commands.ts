import {
  ClipboardPaste,
  Keyboard,
  Link2,
  Monitor,
  Moon,
  PanelLeft,
  RotateCcw,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { GithubIcon } from '@/components/GithubIcon'
import { createShareLink } from '@/hooks/useHashSync'
import { copyText } from '@/hooks/useClipboard'
import { routePastedText } from '@/hooks/useSmartPaste'
import { toast } from '@/store/toast'
import { useWorkbench, type ThemePreference } from '@/store/workbench'
import { TOOLS, TOOLS_BY_ID } from '@/tools/registry'

export const REPOSITORY_URL = 'https://github.com/zzoraemon043/dev-workbench'

export interface Command {
  id: string
  title: string
  group: 'Tools' | 'Actions' | 'Appearance'
  icon: LucideIcon
  shortcut?: string
  run: () => void
}

export const SHORTCUTS: Array<{ combo: string; label: string }> = [
  { combo: 'mod+k', label: 'Open command palette' },
  ...TOOLS.map((tool, index) => ({ combo: `alt+${index + 1}`, label: `Open ${tool.name}` })),
  { combo: 'mod+enter', label: "Run the current tool's primary action" },
  { combo: 'alt+s', label: 'Copy a share link for the current tool' },
  { combo: 'alt+t', label: 'Cycle theme' },
  { combo: 'alt+b', label: 'Toggle sidebar' },
  { combo: '?', label: 'Show keyboard shortcuts' },
]

const THEME_CYCLE: ThemePreference[] = ['light', 'dark', 'system']

export function cycleTheme(): void {
  const { theme, setTheme } = useWorkbench.getState()
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]!
  setTheme(next)
  toast(`Theme: ${next}`, 'info')
}

export async function shareCurrentTool(): Promise<void> {
  const link = await createShareLink()
  if (link.length > 32_000) {
    toast('This workspace is too large for a share link', 'error')
    return
  }
  await copyText(link, 'Share link copied — state lives in the URL, not on a server')
}

export async function pasteFromClipboard(): Promise<void> {
  try {
    const text = await navigator.clipboard.readText()
    if (text.trim()) routePastedText(text)
    else toast('Clipboard is empty', 'info')
  } catch {
    toast('Clipboard read was blocked — press Ctrl/⌘+V anywhere outside an editor instead', 'error')
  }
}

export function buildCommands(): Command[] {
  const store = useWorkbench.getState()
  const activeName = TOOLS_BY_ID[store.activeTool].name
  const themes: Array<{ value: ThemePreference; icon: LucideIcon }> = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'system', icon: Monitor },
  ]
  return [
    ...TOOLS.map((tool, index) => ({
      id: `tool:${tool.id}`,
      title: `${tool.name} — ${tool.tagline}`,
      group: 'Tools' as const,
      icon: tool.icon,
      shortcut: `alt+${index + 1}`,
      run: () => store.setActiveTool(tool.id),
    })),
    {
      id: 'paste',
      title: 'Paste from clipboard & auto-detect',
      group: 'Actions',
      icon: ClipboardPaste,
      run: () => void pasteFromClipboard(),
    },
    { id: 'share', title: 'Copy share link', group: 'Actions', icon: Link2, shortcut: 'alt+s', run: () => void shareCurrentTool() },
    {
      id: 'reset',
      title: `Reset ${activeName} to sample data`,
      group: 'Actions',
      icon: RotateCcw,
      run: () => {
        store.reset(store.activeTool)
        toast(`${activeName} reset`, 'info')
      },
    },
    { id: 'sidebar', title: 'Toggle sidebar', group: 'Appearance', icon: PanelLeft, shortcut: 'alt+b', run: store.toggleSidebar },
    ...themes.map(({ value, icon }) => ({
      id: `theme:${value}`,
      title: `Theme: ${value[0]!.toUpperCase()}${value.slice(1)}`,
      group: 'Appearance' as const,
      icon,
      run: () => store.setTheme(value),
    })),
    {
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      group: 'Actions',
      icon: Keyboard,
      shortcut: '?',
      run: () => store.setShortcutsOpen(true),
    },
    {
      id: 'github',
      title: 'Star on GitHub',
      group: 'Actions',
      icon: GithubIcon,
      run: () => window.open(REPOSITORY_URL, '_blank', 'noopener'),
    },
  ]
}
