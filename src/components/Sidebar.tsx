import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { REPOSITORY_URL } from '@/app/commands'
import { cn } from '@/lib/cn'
import { useWorkbench } from '@/store/workbench'
import { TOOLS } from '@/tools/registry'
import { GithubIcon } from './GithubIcon'
import { Logo } from './Logo'
import { Kbd } from './ui'

export function Sidebar() {
  const activeTool = useWorkbench((state) => state.activeTool)
  const setActiveTool = useWorkbench((state) => state.setActiveTool)
  const collapsed = useWorkbench((state) => state.sidebarCollapsed)
  const toggleSidebar = useWorkbench((state) => state.toggleSidebar)

  return (
    <nav
      aria-label="Tools"
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <Logo className="size-7 shrink-0" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold tracking-tight">Dev Workbench</div>
            <div className="text-[11px] text-muted">offline · zero backend</div>
          </div>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {TOOLS.map((tool, index) => {
          const Icon = tool.icon
          const active = tool.id === activeTool
          return (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => setActiveTool(tool.id)}
                title={collapsed ? tool.name : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150',
                  collapsed && 'justify-center px-0',
                  active ? 'bg-accent/10 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {active && <span className="absolute top-2 bottom-2 -left-2 w-0.5 rounded-full bg-accent" />}
                <Icon className={cn('size-4 shrink-0 transition-transform group-hover:scale-110', active && 'text-accent')} />
                {!collapsed && (
                  <>
                    <span className="truncate">{tool.name}</span>
                    <Kbd combo={`alt+${index + 1}`} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className={cn('flex items-center gap-1 border-t border-line p-2', collapsed && 'flex-col')}>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg',
            !collapsed && 'flex-1',
          )}
        >
          <GithubIcon className="size-4" />
          {!collapsed && 'Star on GitHub'}
        </a>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
    </nav>
  )
}

export function MobileToolBar() {
  const activeTool = useWorkbench((state) => state.activeTool)
  const setActiveTool = useWorkbench((state) => state.setActiveTool)
  return (
    <nav aria-label="Tools" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
      {TOOLS.map((tool) => {
        const Icon = tool.icon
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActiveTool(tool.id)}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium',
              tool.id === activeTool ? 'bg-accent/10 text-accent' : 'text-muted',
            )}
          >
            <Icon className="size-3.5" />
            {tool.name}
          </button>
        )
      })}
    </nav>
  )
}
