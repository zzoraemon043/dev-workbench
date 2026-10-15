import { memo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { copyText } from '@/hooks/useClipboard'
import { isPlainObject } from '@/lib/json/parse'
import { formatPath, type PathSegment } from '@/lib/json/path'
import { cn } from '@/lib/cn'

const PAGE_SIZE = 200

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-rose-500 dark:text-rose-400">null</span>
  switch (typeof value) {
    case 'string':
      return <span className="break-all text-emerald-600 dark:text-emerald-400">{JSON.stringify(value)}</span>
    case 'number':
      return <span className="text-sky-600 dark:text-sky-400">{String(value)}</span>
    case 'boolean':
      return <span className="text-violet-600 dark:text-violet-400">{String(value)}</span>
    default:
      return <span className="text-muted">{String(value)}</span>
  }
}

interface NodeProps {
  label: PathSegment | null
  value: unknown
  path: PathSegment[]
  depth: number
  expandDepth: number
}

const JsonNode = memo(function JsonNode({ label, value, path, depth, expandDepth }: NodeProps) {
  const [open, setOpen] = useState(depth < expandDepth)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const isArray = Array.isArray(value)
  const isObject = isPlainObject(value)
  const entries: Array<[PathSegment, unknown]> = isArray
    ? value.map((item, index) => [index, item])
    : isObject
      ? Object.entries(value)
      : []
  const container = isArray || isObject

  const labelNode =
    label === null ? (
      <span className="text-muted">root</span>
    ) : (
      <button
        type="button"
        title={`Copy path ${formatPath(path)}`}
        onClick={(event) => {
          event.stopPropagation()
          void copyText(formatPath(path), `Copied ${formatPath(path)}`)
        }}
        className={cn(
          'rounded px-0.5 transition-colors hover:bg-accent/15 hover:text-accent',
          typeof label === 'number' ? 'text-muted' : 'text-fg',
        )}
      >
        {typeof label === 'number' ? label : JSON.stringify(label).slice(1, -1)}
      </button>
    )

  if (!container) {
    return (
      <div className="flex gap-1.5 py-px pl-5">
        {labelNode}
        <span className="text-muted">:</span>
        <Primitive value={value} />
      </div>
    )
  }

  const summary = isArray ? `[${entries.length}]` : `{${entries.length}}`
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), setOpen(!open))}
        className="group flex cursor-pointer items-center gap-1.5 rounded py-px hover:bg-surface-2"
      >
        <ChevronRight className={cn('size-3.5 shrink-0 text-muted transition-transform duration-150', open && 'rotate-90')} />
        {labelNode}
        <span className="text-muted">:</span>
        <span className="rounded bg-surface-2 px-1.5 text-[11px] text-muted group-hover:bg-surface">{summary}</span>
      </div>
      {open && (
        <div className="ml-[7px] border-l border-line pl-2">
          {entries.slice(0, limit).map(([key, child]) => (
            <JsonNode
              key={key}
              label={key}
              value={child}
              path={[...path, key]}
              depth={depth + 1}
              expandDepth={expandDepth}
            />
          ))}
          {entries.length > limit && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="my-1 ml-5 rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:text-fg"
            >
              Show {Math.min(PAGE_SIZE, entries.length - limit)} more of {entries.length - limit}
            </button>
          )}
        </div>
      )}
    </div>
  )
})

export function JsonTree({ value, expandDepth }: { value: unknown; expandDepth: number }) {
  return (
    <div className="p-3 font-mono text-[13px] leading-relaxed">
      <JsonNode label={null} value={value} path={[]} depth={0} expandDepth={expandDepth} />
    </div>
  )
}
