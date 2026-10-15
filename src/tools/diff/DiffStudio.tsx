import { useDeferredValue, useMemo } from 'react'
import { ArrowLeftRight, Columns2, FileDiff, FileMinus2, FilePlus2, Rows3 } from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Badge, Button, CopyButton, EmptyState, Panel, Segmented, Toggle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { diffLines, summarize, toSplitRows, toUnifiedPatch, type DiffLine, type InlinePart, type SplitCell } from '@/lib/diff/text'
import { useToolState, type DiffState } from '@/store/workbench'

const MAX_LINES = 20_000

export default function DiffStudio() {
  const [state, update] = useToolState('diff')
  const left = useDeferredValue(state.left)
  const right = useDeferredValue(state.right)
  const options = useMemo(
    () => ({ ignoreWhitespace: state.ignoreWhitespace, ignoreCase: state.ignoreCase }),
    [state.ignoreWhitespace, state.ignoreCase],
  )
  const tooLarge = left.split('\n').length + right.split('\n').length > MAX_LINES
  const lines = useMemo(() => (tooLarge ? [] : diffLines(left, right, options)), [left, right, options, tooLarge])
  const summary = useMemo(() => summarize(lines), [lines])
  const identical = lines.length > 0 && summary.additions === 0 && summary.deletions === 0

  return (
    <div className="grid h-full min-h-[720px] grid-rows-[minmax(180px,0.8fr)_minmax(0,1.4fr)] gap-3">
      <div className="grid min-h-0 gap-3 md:grid-cols-2">
        <Panel title="Original" icon={FileMinus2} actions={<CopyButton text={state.left} />} bodyClassName="flex">
          <CodeEditor
            ariaLabel="Original text"
            value={state.left}
            onChange={(value) => update({ left: value })}
            onFileText={(value) => update({ left: value })}
            placeholder="Paste or drop the original…"
            className="flex-1"
          />
        </Panel>
        <Panel title="Modified" icon={FilePlus2} actions={<CopyButton text={state.right} />} bodyClassName="flex">
          <CodeEditor
            ariaLabel="Modified text"
            value={state.right}
            onChange={(value) => update({ right: value })}
            onFileText={(value) => update({ right: value })}
            placeholder="Paste or drop the modified version…"
            className="flex-1"
          />
        </Panel>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <FileDiff className="size-4 text-muted" />
            Diff
            <Badge tone="success">+{summary.additions}</Badge>
            <Badge tone="danger">−{summary.deletions}</Badge>
            <Badge className="hidden sm:inline-flex">{Math.round(summary.similarity * 100)}% similar</Badge>
          </span>
        }
        actions={
          <>
            <div className="mr-2 hidden items-center gap-3 lg:flex">
              <Toggle
                checked={state.ignoreWhitespace}
                onChange={(ignoreWhitespace) => update({ ignoreWhitespace })}
                label="Ignore whitespace"
              />
              <Toggle checked={state.ignoreCase} onChange={(ignoreCase) => update({ ignoreCase })} label="Ignore case" />
            </div>
            <Segmented<DiffState['view']>
              value={state.view}
              onChange={(view) => update({ view })}
              options={[
                { value: 'split', label: 'Split', icon: Columns2 },
                { value: 'unified', label: 'Unified', icon: Rows3 },
              ]}
            />
            <Button
              size="sm"
              variant="ghost"
              icon={ArrowLeftRight}
              onClick={() => update({ left: state.right, right: state.left })}
              title="Swap sides"
            />
            <CopyButton text={toUnifiedPatch(lines, 'original', 'modified')} label="Patch" disabled={lines.length === 0} />
          </>
        }
        bodyClassName="overflow-auto"
      >
        {tooLarge ? (
          <EmptyState icon={FileDiff} title="Inputs are too large" hint={`Diffs are limited to ${MAX_LINES.toLocaleString()} lines to keep the tab responsive.`} />
        ) : lines.length === 0 ? (
          <EmptyState icon={FileDiff} title="Nothing to compare yet" hint="Paste text into both editors or drop a file onto each." />
        ) : identical ? (
          <EmptyState icon={FileDiff} title="The inputs are identical" hint={options.ignoreWhitespace || options.ignoreCase ? 'With the current ignore options applied.' : undefined} />
        ) : state.view === 'split' ? (
          <SplitView lines={lines} />
        ) : (
          <UnifiedView lines={lines} />
        )}
      </Panel>
    </div>
  )
}

function Parts({ parts, tone }: { parts: InlinePart[]; tone: 'add' | 'del' }) {
  return (
    <>
      {parts.map((part, index) =>
        part.changed ? (
          <span
            key={index}
            className={cn('rounded-sm', tone === 'add' ? 'bg-emerald-500/30 dark:bg-emerald-400/25' : 'bg-rose-500/30 dark:bg-rose-400/25')}
          >
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

const ROW_TONES = {
  add: 'bg-emerald-500/8 dark:bg-emerald-400/8',
  del: 'bg-rose-500/8 dark:bg-rose-400/8',
}

function Cell({ cell, tone }: { cell: SplitCell | null; tone: 'add' | 'del' | null }) {
  if (!cell) return <td colSpan={2} className="bg-surface-2/60" />
  return (
    <>
      <td className={cn('w-10 border-r border-line px-2 text-right text-muted/60 select-none', tone && ROW_TONES[tone])}>
        {cell.line}
      </td>
      <td className={cn('px-3 whitespace-pre-wrap break-all', tone && ROW_TONES[tone])}>
        {tone ? <Parts parts={cell.parts} tone={tone} /> : cell.text || ' '}
      </td>
    </>
  )
}

function SplitView({ lines }: { lines: DiffLine[] }) {
  const rows = useMemo(() => toSplitRows(lines), [lines])
  return (
    <table className="w-full table-fixed border-collapse font-mono text-xs leading-[1.7]">
      <colgroup>
        <col className="w-10" />
        <col />
        <col className="w-10" />
        <col />
      </colgroup>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-line/40">
            <Cell cell={row.left} tone={row.kind === 'equal' || row.kind === 'insert' ? null : 'del'} />
            <Cell cell={row.right} tone={row.kind === 'equal' || row.kind === 'delete' ? null : 'add'} />
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function UnifiedView({ lines }: { lines: DiffLine[] }) {
  return (
    <table className="w-full border-collapse font-mono text-xs leading-[1.7]">
      <tbody>
        {lines.map((line, index) => {
          const tone = line.kind === 'insert' ? 'add' : line.kind === 'delete' ? 'del' : null
          return (
            <tr key={index} className={cn(tone && ROW_TONES[tone])}>
              <td className="w-10 px-2 text-right text-muted/60 select-none">{line.oldLine ?? ''}</td>
              <td className="w-10 border-r border-line px-2 text-right text-muted/60 select-none">{line.newLine ?? ''}</td>
              <td
                className={cn(
                  'w-6 text-center select-none',
                  tone === 'add' && 'text-emerald-600 dark:text-emerald-400',
                  tone === 'del' && 'text-rose-600 dark:text-rose-400',
                )}
              >
                {tone === 'add' ? '+' : tone === 'del' ? '−' : ''}
              </td>
              <td className="pr-3 whitespace-pre-wrap break-all">{line.text || ' '}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
