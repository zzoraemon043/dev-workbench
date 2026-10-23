import { useDeferredValue, useEffect, useMemo, useState, type DragEvent } from 'react'
import { AlertTriangle, ArrowDown, FileInput, FileOutput, GripVertical, Plus, Search, Trash2, Workflow, X } from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Badge, Button, CopyButton, EmptyState, Panel, TextInput } from '@/components/ui'
import { rankByFuzzy } from '@/lib/fuzzy'
import { cn } from '@/lib/cn'
import { TRANSFORMS, TRANSFORMS_BY_ID, runPipeline, type PipelineStep, type TransformCategory } from '@/lib/codec/transforms'
import { useToolState } from '@/store/workbench'

const RECIPES: Array<{ label: string; pipeline: string[] }> = [
  { label: 'URL → JSON', pipeline: ['url-decode', 'query-to-json'] },
  { label: 'Base64 → JSON', pipeline: ['base64-decode', 'json-pretty'] },
  { label: 'Fingerprint', pipeline: ['trim', 'sha256'] },
  { label: 'Epoch → ISO', pipeline: ['to-iso'] },
  { label: 'Slugify', pipeline: ['trim', 'kebab'] },
]

const CATEGORY_ORDER: TransformCategory[] = ['Encoding', 'Format', 'Hashing', 'Text', 'Time']

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

export default function CodecPipeline() {
  const [state, update] = useToolState('codec')
  const input = useDeferredValue(state.input)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void runPipeline(input, state.pipeline).then((result) => !cancelled && setSteps(result))
    return () => {
      cancelled = true
    }
  }, [input, state.pipeline])

  const failed = steps.find((step) => step.error)
  const output = failed ? '' : (steps.at(-1)?.output ?? input)
  const totalMs = steps.reduce((sum, step) => sum + step.durationMs, 0)

  const onDragStart = (index: number) => (event: DragEvent) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/x-step', String(index))
  }

  const onDragOver = (index: number) => (event: DragEvent) => {
    if (dragIndex === null) return
    event.preventDefault()
    setDropIndex(index)
  }

  const onDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault()
    if (dragIndex !== null && dragIndex !== index) update({ pipeline: moveItem(state.pipeline, dragIndex, index) })
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div className="grid h-full min-h-[680px] grid-rows-[minmax(200px,1fr)_minmax(320px,auto)_minmax(200px,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)_minmax(0,1fr)] lg:grid-rows-1">
      <Panel title="Input" icon={FileInput} actions={<CopyButton text={state.input} />} bodyClassName="flex">
        <CodeEditor
          ariaLabel="Codec input"
          value={state.input}
          onChange={(value) => update({ input: value })}
          onFileText={(value) => update({ input: value })}
          placeholder="Paste text, a URL, base64, a timestamp…"
          softWrap
          className="flex-1"
        />
      </Panel>

      <Panel
        title="Pipeline"
        icon={Workflow}
        actions={
          state.pipeline.length > 0 && (
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => update({ pipeline: [] })}>
              Clear
            </Button>
          )
        }
        bodyClassName="flex flex-col overflow-hidden"
      >
        <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2">
          {RECIPES.map((recipe) => (
            <button
              type="button"
              key={recipe.label}
              onClick={() => update({ pipeline: recipe.pipeline })}
              className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              {recipe.label}
            </button>
          ))}
        </div>
        <ol className="space-y-1.5 overflow-auto p-3" onDragEnd={() => (setDragIndex(null), setDropIndex(null))}>
          {state.pipeline.length === 0 && (
            <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
              Add steps below — output of each step feeds the next.
            </li>
          )}
          {state.pipeline.map((id, index) => {
            const transform = TRANSFORMS_BY_ID.get(id)
            const step = steps[index]
            const skipped = !step && Boolean(failed)
            return (
              <li
                key={`${id}-${index}`}
                draggable
                onDragStart={onDragStart(index)}
                onDragOver={onDragOver(index)}
                onDrop={onDrop(index)}
                className={cn(
                  'group flex items-center gap-2 rounded-xl border bg-surface px-2 py-2 transition-all duration-150',
                  dragIndex === index && 'scale-[0.98] opacity-40',
                  dropIndex === index && dragIndex !== index ? 'border-accent ring-2 ring-accent/20' : 'border-line',
                  step?.error && 'border-rose-500/40 bg-rose-500/5',
                  skipped && 'opacity-50',
                )}
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted/60 active:cursor-grabbing" />
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[10px] font-semibold text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{transform?.label ?? id}</div>
                  {step?.error ? (
                    <div className="truncate text-[11px] text-rose-600 dark:text-rose-400" title={step.error}>
                      {step.error}
                    </div>
                  ) : (
                    step && (
                      <div className="truncate font-mono text-[11px] text-muted" title={step.output}>
                        {step.output.slice(0, 80) || '∅'}
                      </div>
                    )
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${transform?.label ?? id}`}
                  onClick={() => update({ pipeline: state.pipeline.filter((_, i) => i !== index) })}
                  className="rounded-md p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-2 hover:text-fg focus:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            )
          })}
          {state.pipeline.length > 0 && (
            <li className="flex justify-center py-1 text-muted/60">
              <ArrowDown className="size-4" />
            </li>
          )}
        </ol>
        <TransformPicker onPick={(id) => update({ pipeline: [...state.pipeline, id] })} />
      </Panel>

      <Panel
        title="Output"
        icon={FileOutput}
        actions={
          <>
            {steps.length > 0 && <Badge>{totalMs < 1 ? '<1' : totalMs.toFixed(1)} ms</Badge>}
            <CopyButton text={output} />
          </>
        }
        bodyClassName="flex flex-col"
      >
        {failed ? (
          <EmptyState
            icon={AlertTriangle}
            title={`Step “${failed.label}” failed`}
            hint={failed.error ?? undefined}
          />
        ) : (
          <CodeEditor ariaLabel="Codec output" value={output} readOnly softWrap className="flex-1" />
        )}
      </Panel>
    </div>
  )
}

function TransformPicker({ onPick }: { onPick: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const ranked = query ? rankByFuzzy(TRANSFORMS, query, (t) => `${t.label} ${t.category}`).map((r) => r.item) : TRANSFORMS
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: ranked.filter((transform) => transform.category === category),
    })).filter((group) => group.items.length > 0)
  }, [query])

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-line">
      <div className="relative px-3 pt-3">
        <Search className="pointer-events-none absolute top-1/2 left-5.5 mt-1.5 size-3.5 -translate-y-1/2 text-muted" />
        <TextInput
          aria-label="Search transforms"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            const first = groups[0]?.items[0]
            if (event.key === 'Enter' && first) {
              onPick(first.id)
              setQuery('')
            }
          }}
          placeholder="Add step… (base64, sha, camel)"
          className="w-full pl-8 font-sans"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pt-2 pb-3">
        {groups.length === 0 && <EmptyState icon={Search} title="No transforms found" />}
        {groups.map((group) => (
          <div key={group.category} className="mb-2">
            <div className="py-1 text-[10px] font-semibold tracking-wider text-muted uppercase">{group.category}</div>
            <div className="flex flex-wrap gap-1">
              {group.items.map((transform) => (
                <button
                  type="button"
                  key={transform.id}
                  onClick={() => onPick(transform.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs transition-all hover:-translate-y-px hover:border-accent/40 hover:text-accent active:translate-y-0"
                >
                  <Plus className="size-3" />
                  {transform.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
