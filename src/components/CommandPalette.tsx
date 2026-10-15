import { useMemo, useState, type KeyboardEvent } from 'react'
import { CornerDownLeft, Search } from 'lucide-react'
import { buildCommands, type Command } from '@/app/commands'
import { rankByFuzzy } from '@/lib/fuzzy'
import { cn } from '@/lib/cn'
import { useWorkbench } from '@/store/workbench'
import { Dialog } from './Dialog'
import { Kbd } from './ui'

function Highlighted({ text, indices }: { text: string; indices: number[] }) {
  const marks = new Set(indices)
  return (
    <span className="truncate">
      {Array.from(text, (char, index) =>
        marks.has(index) ? (
          <span key={index} className="font-semibold text-accent">
            {char}
          </span>
        ) : (
          char
        ),
      )}
    </span>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const commands = useMemo(() => buildCommands(), [])
  const results = useMemo(() => rankByFuzzy(commands, query, (command) => command.title), [commands, query])
  const selected = Math.min(cursor, Math.max(results.length - 1, 0))

  const execute = (command: Command) => {
    onClose()
    command.run()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault()
      setCursor((selected + 1) % Math.max(results.length, 1))
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault()
      setCursor((selected - 1 + results.length) % Math.max(results.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const command = results[selected]?.item
      if (command) execute(command)
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setCursor(0)
          }}
          placeholder="Search tools and actions…"
          aria-label="Search commands"
          className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/60"
        />
        <Kbd combo="escape" />
      </div>
      <ul role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No matching commands</li>}
        {results.map(({ item, match }, index) => {
          const Icon = item.icon
          const showGroup = index === 0 || results[index - 1]?.item.group !== item.group
          return (
            <li key={item.id}>
              {showGroup && !query && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">{item.group}</div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={index === selected}
                onMouseMove={() => setCursor(index)}
                onClick={() => execute(item)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  index === selected ? 'bg-accent/10 text-fg' : 'text-fg/80',
                )}
              >
                <Icon className={cn('size-4 shrink-0', index === selected ? 'text-accent' : 'text-muted')} />
                <Highlighted text={item.title} indices={match.indices} />
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  {item.shortcut && <Kbd combo={item.shortcut} />}
                  {index === selected && <CornerDownLeft className="size-3.5 text-muted" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function CommandPalette() {
  const open = useWorkbench((state) => state.paletteOpen)
  const setOpen = useWorkbench((state) => state.setPaletteOpen)
  return (
    <Dialog open={open} onClose={() => setOpen(false)} label="Command palette">
      <PaletteBody onClose={() => setOpen(false)} />
    </Dialog>
  )
}
