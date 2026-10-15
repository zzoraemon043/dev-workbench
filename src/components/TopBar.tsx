import { Command as CommandIcon, Link2, Monitor, Moon, Sun } from 'lucide-react'
import { cycleTheme, shareCurrentTool } from '@/app/commands'
import { useWorkbench } from '@/store/workbench'
import { TOOLS_BY_ID } from '@/tools/registry'
import { Button, IconButton, Kbd } from './ui'

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor }

export function TopBar() {
  const activeTool = useWorkbench((state) => state.activeTool)
  const theme = useWorkbench((state) => state.theme)
  const setPaletteOpen = useWorkbench((state) => state.setPaletteOpen)
  const tool = TOOLS_BY_ID[activeTool]
  const Icon = tool.icon

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/40 px-4 backdrop-blur">
      <div key={tool.id} className="fade-slide flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
          <Icon className="size-4 text-accent" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-sm font-semibold tracking-tight">{tool.name}</h1>
          <p className="hidden truncate text-xs text-muted sm:block">{tool.tagline}</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden h-8 w-60 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface-2/60 px-2.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg lg:flex"
        >
          <CommandIcon className="size-3.5" />
          Search tools & actions
          <Kbd combo="mod+k" className="ml-auto" />
        </button>
        <IconButton icon={CommandIcon} label="Command palette" onClick={() => setPaletteOpen(true)} className="lg:hidden" />
        <Button icon={Link2} onClick={() => void shareCurrentTool()} title="Copy share link (Alt+S)">
          <span className="hidden sm:inline">Share</span>
        </Button>
        <IconButton icon={THEME_ICONS[theme]} label={`Theme: ${theme} (Alt+T)`} onClick={cycleTheme} />
      </div>
    </header>
  )
}
