import { Suspense } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cycleTheme, shareCurrentTool } from '@/app/commands'
import { CommandPalette } from '@/components/CommandPalette'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'
import { MobileToolBar, Sidebar } from '@/components/Sidebar'
import { StatusBar } from '@/components/StatusBar'
import { Toaster } from '@/components/Toaster'
import { TopBar } from '@/components/TopBar'
import { useHashSync } from '@/hooks/useHashSync'
import { useHotkeys, type Hotkey } from '@/hooks/useHotkeys'
import { useSmartPaste } from '@/hooks/useSmartPaste'
import { useApplyTheme } from '@/hooks/useTheme'
import { useWorkbench } from '@/store/workbench'
import { TOOLS, TOOLS_BY_ID } from '@/tools/registry'

function useGlobalShortcuts() {
  const store = useWorkbench.getState
  const hotkeys: Hotkey[] = [
    { combo: 'mod+k', allowInInputs: true, handler: () => store().setPaletteOpen(!store().paletteOpen) },
    ...TOOLS.map((tool, index) => ({
      combo: `alt+${index + 1}`,
      allowInInputs: true,
      handler: () => store().setActiveTool(tool.id),
    })),
    { combo: 'alt+s', allowInInputs: true, handler: () => void shareCurrentTool() },
    { combo: 'alt+t', allowInInputs: true, handler: cycleTheme },
    { combo: 'alt+b', allowInInputs: true, handler: () => store().toggleSidebar() },
    { combo: 'shift+?', handler: () => store().setShortcutsOpen(true) },
  ]
  useHotkeys(hotkeys)
}

function ToolLoading() {
  return (
    <div className="flex h-full items-center justify-center text-muted">
      <LoaderCircle className="size-5 animate-spin" />
    </div>
  )
}

export default function App() {
  useApplyTheme()
  useHashSync()
  useSmartPaste()
  useGlobalShortcuts()

  const activeTool = useWorkbench((state) => state.activeTool)
  const ActiveTool = TOOLS_BY_ID[activeTool].component

  return (
    <div className="app-backdrop flex h-dvh overflow-hidden bg-bg text-fg">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <MobileToolBar />
        <div key={activeTool} className="fade-slide min-h-0 flex-1 overflow-auto p-3 md:p-4">
          <Suspense fallback={<ToolLoading />}>
            <ActiveTool />
          </Suspense>
        </div>
        <StatusBar />
      </main>
      <CommandPalette />
      <ShortcutsDialog />
      <Toaster />
    </div>
  )
}
