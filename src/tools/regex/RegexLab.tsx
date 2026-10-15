import { useDeferredValue, useMemo } from 'react'
import { AlertTriangle, BookOpenText, Highlighter, ListChecks, Replace, Sparkles, TextCursorInput } from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Badge, CopyButton, EmptyState, ErrorBanner, Panel, Segmented, TextInput } from '@/components/ui'
import { cn } from '@/lib/cn'
import { SUPPORTED_FLAGS, compileRegex, toSegments, type RegexMatch } from '@/lib/regex/engine'
import { REGEX_PRESETS, explainRegex, type TokenKind } from '@/lib/regex/explain'
import { useToolState, type RegexState } from '@/store/workbench'
import { useRegexWorker } from './useRegexWorker'

const FLAG_HINTS: Record<string, string> = {
  g: 'global — find all matches',
  i: 'ignore case',
  m: 'multiline — ^ and $ match at line breaks',
  s: 'dotAll — . matches newlines',
  u: 'unicode — full Unicode and \\p{…} classes',
  y: 'sticky — match only at lastIndex',
}

const TOKEN_STYLES: Record<TokenKind, string> = {
  anchor: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
  class: 'bg-sky-500/12 text-sky-600 dark:text-sky-300',
  group: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
  quantifier: 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
  alternation: 'bg-orange-500/12 text-orange-600 dark:text-orange-300',
  escape: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
  literal: 'bg-surface-2 text-fg',
  any: 'bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300',
}

export default function RegexLab() {
  const [state, update] = useToolState('regex')
  const deferredInput = useDeferredValue(state.input)
  const compiled = useMemo(() => compileRegex(state.pattern, state.flags), [state.pattern, state.flags])
  const { matches, replaced, timedOut, pending } = useRegexWorker({
    pattern: compiled.ok ? state.pattern : '',
    flags: state.flags,
    input: deferredInput,
    replacement: state.panel === 'replace' ? state.replacement : null,
  })
  const overlay = useMemo(
    () =>
      toSegments(deferredInput, matches).map((segment, index) =>
        segment.match === null ? (
          segment.text
        ) : (
          <mark key={index} className={cn('text-transparent', segment.match % 2 === 0 ? 'match-a' : 'match-b')}>
            {segment.text}
          </mark>
        ),
      ),
    [deferredInput, matches],
  )

  const toggleFlag = (flag: string) =>
    update({ flags: state.flags.includes(flag) ? state.flags.replace(flag, '') : state.flags + flag })

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-3">
      <Panel bodyClassName="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center rounded-xl border bg-surface-2 font-mono text-[15px] transition-colors focus-within:bg-surface focus-within:ring-2',
              compiled.ok ? 'border-line focus-within:border-accent/50 focus-within:ring-accent/15' : 'border-rose-500/50 ring-rose-500/15',
            )}
          >
            <span className="pl-3 text-muted">/</span>
            <input
              aria-label="Regular expression"
              value={state.pattern}
              onChange={(event) => update({ pattern: event.target.value })}
              spellCheck={false}
              autoComplete="off"
              placeholder="your pattern"
              className="h-11 min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-muted/50"
            />
            <span className="pr-1 text-muted">/</span>
            <span className="pr-3 text-accent">{state.flags}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
              {SUPPORTED_FLAGS.map((flag) => (
                <button
                  key={flag}
                  type="button"
                  title={FLAG_HINTS[flag]}
                  aria-pressed={state.flags.includes(flag)}
                  onClick={() => toggleFlag(flag)}
                  className={cn(
                    'size-7 rounded-md font-mono text-xs font-semibold transition-all',
                    state.flags.includes(flag) ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg',
                  )}
                >
                  {flag}
                </button>
              ))}
            </div>
            <select
              aria-label="Load a preset"
              value=""
              onChange={(event) => {
                const preset = REGEX_PRESETS.find((item) => item.id === event.target.value)
                if (preset) update({ pattern: preset.pattern, flags: preset.flags, input: preset.sample })
              }}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-fg outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Presets…</option>
              {REGEX_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <Badge tone={!compiled.ok || timedOut ? 'danger' : matches.length ? 'accent' : 'neutral'} className={cn(pending && 'opacity-60')}>
              {!compiled.ok
                ? 'invalid'
                : timedOut
                  ? 'timed out'
                  : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`}
            </Badge>
          </div>
        </div>
        {(!compiled.ok || timedOut) && (
          <p className="animate-in mt-2 flex items-center gap-1.5 font-mono text-xs text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-3.5" />
            {compiled.ok
              ? `Evaluation took over 1.5s and was stopped — likely catastrophic backtracking. Try possessive-style rewrites or tighter quantifiers.`
              : compiled.error}
          </p>
        )}
      </Panel>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 lg:grid-cols-[1.2fr_1fr] lg:grid-rows-1">
        <Panel title="Test string" icon={TextCursorInput} bodyClassName="flex flex-col">
          <CodeEditor
            ariaLabel="Regex test input"
            value={state.input}
            onChange={(input) => update({ input })}
            onFileText={(input) => update({ input })}
            overlay={overlay}
            placeholder="Type or drop text to test against…"
            className="flex-1"
          />
        </Panel>

        <Panel
          title={
            <Segmented<RegexState['panel']>
              size="md"
              value={state.panel}
              onChange={(panel) => update({ panel })}
              options={[
                { value: 'matches', label: 'Matches', icon: ListChecks },
                { value: 'explain', label: 'Explain', icon: BookOpenText },
                { value: 'replace', label: 'Replace', icon: Replace },
              ]}
            />
          }
          bodyClassName="overflow-auto"
        >
          {state.panel === 'matches' && <MatchList matches={matches} />}
          {state.panel === 'explain' && <Explanation pattern={state.pattern} />}
          {state.panel === 'replace' && compiled.ok && (
            <ReplacePreview output={replaced ?? ''} replacement={state.replacement} />
          )}
          {state.panel === 'replace' && !compiled.ok && <ErrorBanner>{compiled.error}</ErrorBanner>}
        </Panel>
      </div>
    </div>
  )
}

function MatchList({ matches }: { matches: RegexMatch[] }) {
  if (matches.length === 0) {
    return <EmptyState icon={Highlighter} title="No matches yet" hint="Matches highlight live in the test string as you type." />
  }
  return (
    <ol className="divide-y divide-line">
      {matches.slice(0, 300).map((match) => (
        <li key={match.index} className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded text-[10px] font-semibold',
                match.index % 2 === 0 ? 'match-a' : 'match-b',
              )}
            >
              {match.index + 1}
            </span>
            <code className="truncate font-mono text-[13px]">{match.text || <em className="text-muted">empty</em>}</code>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">
              {match.start}–{match.end}
            </span>
          </div>
          {match.groups.length > 0 && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pl-7 font-mono text-xs">
              {match.groups.map((group) => (
                <div key={group.index} className="contents">
                  <dt className="text-muted">{group.name ?? `$${group.index}`}</dt>
                  <dd className="truncate">
                    {group.value === undefined ? <span className="text-muted italic">undefined</span> : group.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ol>
  )
}

function Explanation({ pattern }: { pattern: string }) {
  const tokens = useMemo(() => explainRegex(pattern), [pattern])
  if (tokens.length === 0) return <EmptyState icon={Sparkles} title="Type a pattern to see it explained" />
  return (
    <ol className="space-y-1 p-3">
      {tokens.map((token, index) => (
        <li key={index} className="flex items-start gap-3" style={{ paddingLeft: `${token.depth * 16}px` }}>
          <code className={cn('shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs', TOKEN_STYLES[token.kind])}>
            {token.source}
          </code>
          <span className="pt-0.5 text-[13px] text-fg/80">{token.description}</span>
        </li>
      ))}
    </ol>
  )
}

function ReplacePreview({ output, replacement }: { output: string; replacement: string }) {
  const [, update] = useToolState('regex')
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <TextInput
          aria-label="Replacement"
          value={replacement}
          onChange={(event) => update({ replacement: event.target.value })}
          placeholder="$1, $<name>, $&"
          className="flex-1"
        />
        <CopyButton text={output} />
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">{output}</pre>
    </div>
  )
}
