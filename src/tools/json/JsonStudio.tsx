import { useDeferredValue, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownAZ,
  Braces,
  CheckCircle2,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCode2,
  ListTree,
  Minimize2,
  Search,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Badge, Button, CopyButton, EmptyState, ErrorBanner, Kbd, Panel, Segmented, TextInput, Toggle } from '@/components/ui'
import { useHotkeys } from '@/hooks/useHotkeys'
import { collectStats, formatBytes, formatJson, minifyJson, parseJson, sortKeysDeep, type Indent } from '@/lib/json/parse'
import { formatPath, queryJson } from '@/lib/json/path'
import { jsonToTypeScript } from '@/lib/json/to-typescript'
import { toast } from '@/store/toast'
import { useToolState, type JsonState } from '@/store/workbench'
import { JsonTree } from './JsonTree'
import { highlightTs } from './highlightTs'

const INDENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '2', label: '2' },
  { value: '4', label: '4' },
  { value: 'tab', label: 'Tab' },
]

const QUERY_EXAMPLES = ['$..email', '$.users[*].name', '$.users[-1]', '$.settings.shortcuts']

function indentFromOption(option: string): Indent {
  return option === 'tab' ? '\t' : (Number(option) as 2 | 4)
}

export default function JsonStudio() {
  const [state, update] = useToolState('json')
  const editor = useRef<HTMLTextAreaElement>(null)
  const [expandDepth, setExpandDepth] = useState({ depth: 2, version: 0 })
  const deferredInput = useDeferredValue(state.input)
  const result = useMemo(() => (deferredInput.trim() ? parseJson(deferredInput) : null), [deferredInput])
  const value = result?.ok ? result.value : undefined
  const stats = useMemo(() => (result?.ok ? collectStats(result.value, deferredInput) : null), [result, deferredInput])

  const transform = (fn: (value: unknown) => string, label: string) => {
    const parsed = parseJson(state.input)
    if (!parsed.ok) {
      toast('Fix the JSON syntax error first', 'error')
      return
    }
    update({ input: fn(parsed.value) })
    toast(label)
  }

  const format = () => transform((v) => formatJson(v, state.indent), 'Formatted')

  useHotkeys([
    { combo: 'mod+enter', allowInInputs: true, handler: format },
    { combo: 'mod+shift+m', allowInInputs: true, handler: () => transform(minifyJson, 'Minified') },
  ])

  const jumpToError = () => {
    if (!result || result.ok || !editor.current) return
    const lines = state.input.split('\n')
    const offset = lines.slice(0, result.line - 1).reduce((sum, line) => sum + line.length + 1, 0) + result.column - 1
    editor.current.focus()
    editor.current.setSelectionRange(offset, Math.min(offset + 1, state.input.length))
  }

  return (
    <div className="grid h-full min-h-[600px] grid-rows-2 gap-3 lg:grid-cols-2 lg:grid-rows-1">
      <Panel
        title="Input"
        icon={Braces}
        actions={
          <>
            <span className="mr-1 hidden text-[11px] text-muted xl:inline">Indent</span>
            <Segmented
              value={state.indent === '\t' ? 'tab' : String(state.indent)}
              options={INDENT_OPTIONS}
              onChange={(option) => update({ indent: indentFromOption(option) })}
            />
            <Button size="sm" icon={WandSparkles} variant="primary" onClick={format} title="Format (Mod+Enter)">
              Format
            </Button>
            <Button size="sm" icon={Minimize2} variant="ghost" onClick={() => transform(minifyJson, 'Minified')}>
              <span className="hidden sm:inline">Minify</span>
            </Button>
            <Button
              size="sm"
              icon={ArrowDownAZ}
              variant="ghost"
              onClick={() => transform((v) => formatJson(sortKeysDeep(v), state.indent), 'Keys sorted')}
            >
              <span className="hidden sm:inline">Sort</span>
            </Button>
          </>
        }
        bodyClassName="flex flex-col"
      >
        <CodeEditor
          ref={editor}
          ariaLabel="JSON input"
          value={state.input}
          onChange={(input) => update({ input })}
          onFileText={(input) => update({ input })}
          placeholder="Paste or drop a JSON file…"
          highlightLine={result && !result.ok ? result.line : null}
          className="flex-1"
        />
        {result && !result.ok ? (
          <ErrorBanner>
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1">
              Line {result.line}, column {result.column}: {result.error}
            </span>
            <button type="button" onClick={jumpToError} className="shrink-0 underline-offset-2 hover:underline">
              Jump
            </button>
          </ErrorBanner>
        ) : (
          <footer className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
            {stats ? (
              <>
                <Badge tone="success" icon={CheckCircle2}>
                  Valid
                </Badge>
                <Badge>{formatBytes(stats.bytes)}</Badge>
                <Badge>{stats.keys} keys</Badge>
                <Badge>depth {stats.depth}</Badge>
              </>
            ) : (
              <span className="text-xs text-muted">Waiting for input</span>
            )}
            <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted md:flex">
              <Kbd combo="mod+enter" /> format
            </span>
          </footer>
        )}
      </Panel>

      <Panel
        title={
          <Segmented<JsonState['view']>
            size="md"
            value={state.view}
            onChange={(view) => update({ view })}
            options={[
              { value: 'tree', label: 'Tree', icon: ListTree },
              { value: 'types', label: 'Types', icon: FileCode2 },
              { value: 'query', label: 'Query', icon: Search },
            ]}
          />
        }
        actions={
          state.view === 'tree' && value !== undefined ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={ChevronsUpDown}
                onClick={() => setExpandDepth((prev) => ({ depth: 99, version: prev.version + 1 }))}
                title="Expand all"
              >
                <span className="hidden xl:inline">Expand</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={ChevronsDownUp}
                onClick={() => setExpandDepth((prev) => ({ depth: 1, version: prev.version + 1 }))}
                title="Collapse all"
              >
                <span className="hidden xl:inline">Collapse</span>
              </Button>
            </>
          ) : null
        }
        bodyClassName="overflow-auto"
      >
        {value === undefined ? (
          <EmptyState
            icon={Sparkles}
            title={result ? 'Fix the syntax error to explore' : 'Paste JSON to get started'}
            hint="Drop a .json file, paste from your clipboard, or load the sample from the command palette."
          />
        ) : state.view === 'tree' ? (
          <JsonTree key={expandDepth.version} value={value} expandDepth={expandDepth.depth} />
        ) : state.view === 'types' ? (
          <TypesView value={value} />
        ) : (
          <QueryView value={value} />
        )}
      </Panel>
    </div>
  )
}

function TypesView({ value }: { value: unknown }) {
  const [state, update] = useToolState('json')
  const code = useMemo(
    () =>
      jsonToTypeScript(value, {
        rootName: state.rootName || 'Root',
        readonly: state.readonlyTypes,
        declaration: state.declaration,
      }),
    [value, state.rootName, state.readonlyTypes, state.declaration],
  )
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <TextInput
          aria-label="Root type name"
          value={state.rootName}
          onChange={(event) => update({ rootName: event.target.value })}
          className="h-7 w-32"
        />
        <Segmented<JsonState['declaration']>
          value={state.declaration}
          onChange={(declaration) => update({ declaration })}
          options={[
            { value: 'interface', label: 'interface' },
            { value: 'type', label: 'type' },
          ]}
        />
        <Toggle checked={state.readonlyTypes} onChange={(readonlyTypes) => update({ readonlyTypes })} label="readonly" />
        <div className="ml-auto">
          <CopyButton text={code} />
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">{highlightTs(code)}</pre>
    </div>
  )
}

function QueryView({ value }: { value: unknown }) {
  const [state, update] = useToolState('json')
  const deferredQuery = useDeferredValue(state.query)
  const outcome = useMemo(() => {
    try {
      return { matches: queryJson(value, deferredQuery || '$'), error: null }
    } catch (error) {
      return { matches: [], error: error instanceof Error ? error.message : String(error) }
    }
  }, [value, deferredQuery])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <TextInput
            aria-label="JSONPath query"
            value={state.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="$.users[*].email"
            className="flex-1"
          />
          <Badge tone={outcome.error ? 'danger' : 'accent'}>{outcome.error ? 'error' : `${outcome.matches.length} hits`}</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {QUERY_EXAMPLES.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => update({ query: example })}
              className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
      {outcome.error ? (
        <ErrorBanner>{outcome.error}</ErrorBanner>
      ) : outcome.matches.length === 0 ? (
        <EmptyState icon={Search} title="No matches" hint="Try $..key for a recursive search or [*] to fan out over arrays." />
      ) : (
        <ul className="divide-y divide-line overflow-auto">
          {outcome.matches.slice(0, 500).map((match) => {
            const path = formatPath(match.path)
            return (
              <li key={path} className="group px-3 py-2">
                <div className="mb-1 flex items-center gap-2">
                  <code className="truncate font-mono text-xs text-accent">{path}</code>
                  <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                    <CopyButton text={JSON.stringify(match.value, null, 2)} label="Value" />
                  </span>
                </div>
                <pre className="max-h-48 overflow-auto rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs leading-relaxed">
                  {JSON.stringify(match.value, null, 2)}
                </pre>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
