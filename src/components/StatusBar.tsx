import { useSyncExternalStore } from 'react'
import { ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { useWorkbench } from '@/store/workbench'
import { Kbd } from './ui'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function StatusBar() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  const setShortcutsOpen = useWorkbench((state) => state.setShortcutsOpen)
  return (
    <footer className="hidden h-7 shrink-0 items-center gap-4 border-t border-line bg-surface/40 px-4 text-[11px] text-muted sm:flex">
      <span className="flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-emerald-500" />
        100% client-side — nothing you paste leaves this tab
      </span>
      <span className="flex items-center gap-1.5">
        {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5 text-amber-500" />}
        {online ? 'Online' : 'Offline — still fully working'}
      </span>
      <button type="button" onClick={() => setShortcutsOpen(true)} className="ml-auto flex items-center gap-1.5 hover:text-fg">
        Shortcuts <Kbd combo="?" />
      </button>
      <span className="text-muted/70">v{__APP_VERSION__}</span>
    </footer>
  )
}
