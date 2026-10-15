import { Keyboard } from 'lucide-react'
import { SHORTCUTS } from '@/app/commands'
import { useWorkbench } from '@/store/workbench'
import { Dialog } from './Dialog'
import { Kbd } from './ui'

export function ShortcutsDialog() {
  const open = useWorkbench((state) => state.shortcutsOpen)
  const setOpen = useWorkbench((state) => state.setShortcutsOpen)
  return (
    <Dialog open={open} onClose={() => setOpen(false)} label="Keyboard shortcuts" className="w-[min(480px,calc(100vw-2rem))]">
      <header className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Keyboard className="size-4 text-accent" />
        <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
        <Kbd combo="escape" className="ml-auto" />
      </header>
      <ul className="divide-y divide-line px-5 py-2">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.combo} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-fg/80">{shortcut.label}</span>
            <Kbd combo={shortcut.combo} />
          </li>
        ))}
      </ul>
      <p className="border-t border-line bg-surface-2/60 px-5 py-3 text-xs text-muted">
        Tip: paste anything (JWT, JSON, URL, base64, timestamp, ws:// URL) outside an editor and Workbench routes it to the right tool.
      </p>
    </Dialog>
  )
}
