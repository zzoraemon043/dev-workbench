import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Braces,
  Download,
  Info,
  Plug,
  Radio,
  Send,
  Trash2,
  Unplug,
} from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Badge, Button, EmptyState, Kbd, Panel, Segmented, TextInput, Toggle } from '@/components/ui'
import { useHotkeys } from '@/hooks/useHotkeys'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/json/parse'
import {
  filterFrames,
  frameStats,
  isValidSocketUrl,
  previewFrame,
  tryParseJson,
  type Frame,
  type FrameDirection,
} from '@/lib/socket/frames'
import { useSocket, type SocketStatus } from '@/store/socket'
import { toast } from '@/store/toast'
import { useToolState } from '@/store/workbench'

const STATUS_STYLES: Record<SocketStatus, { dot: string; label: string }> = {
  idle: { dot: 'bg-muted/50', label: 'Idle' },
  connecting: { dot: 'bg-amber-500 animate-pulse', label: 'Connecting' },
  open: { dot: 'bg-emerald-500 shadow-[0_0_0_4px] shadow-emerald-500/20', label: 'Connected' },
  closing: { dot: 'bg-amber-500 animate-pulse', label: 'Closing' },
  closed: { dot: 'bg-muted/50', label: 'Closed' },
  error: { dot: 'bg-rose-500', label: 'Error' },
}

export default function SocketConsole() {
  const [state, update] = useToolState('socket')
  const { status, frames, connect, disconnect, send, clear } = useSocket()
  const [filter, setFilter] = useState('')
  const [direction, setDirection] = useState<FrameDirection | 'all'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const deferredFilter = useDeferredValue(filter)
  const visible = useMemo(() => filterFrames(frames, deferredFilter, direction), [frames, deferredFilter, direction])
  const stats = useMemo(() => frameStats(frames), [frames])
  const live = status === 'open' || status === 'connecting'
  const draftJson = useMemo(() => tryParseJson(state.draft), [state.draft])

  const toggleConnection = () => {
    if (live) {
      disconnect()
      return
    }
    if (!isValidSocketUrl(state.url)) {
      toast('Enter a ws:// or wss:// URL', 'error')
      return
    }
    const protocols = state.protocols
      .split(',')
      .map((protocol) => protocol.trim())
      .filter(Boolean)
    connect(state.url, protocols)
  }

  const sendDraft = () => {
    if (!state.draft) return
    if (!send(state.draft)) toast('Connect before sending', 'error')
  }

  useHotkeys([{ combo: 'mod+enter', allowInInputs: true, handler: sendDraft }])

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(frames, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `socket-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-3">
      <Panel bodyClassName="flex flex-col gap-2 p-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cn('size-2.5 shrink-0 rounded-full transition-all', STATUS_STYLES[status].dot)} />
          <TextInput
            aria-label="WebSocket URL"
            value={state.url}
            onChange={(event) => update({ url: event.target.value })}
            onKeyDown={(event) => event.key === 'Enter' && toggleConnection()}
            placeholder="wss://your-server.dev/socket"
            disabled={live}
            className="h-9 flex-1"
          />
          <TextInput
            aria-label="Subprotocols"
            value={state.protocols}
            onChange={(event) => update({ protocols: event.target.value })}
            placeholder="subprotocols"
            disabled={live}
            className="hidden h-9 w-48 xl:block"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge>{STATUS_STYLES[status].label}</Badge>
          <Button
            variant={live ? 'danger' : 'primary'}
            icon={live ? Unplug : Plug}
            onClick={toggleConnection}
            className="h-9 min-w-32"
          >
            {live ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </Panel>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:grid-rows-1">
        <Panel
          title="Compose"
          icon={Send}
          actions={draftJson !== undefined && <Badge tone="success" icon={Braces}>JSON</Badge>}
          bodyClassName="flex flex-col"
        >
          <CodeEditor
            ariaLabel="Message to send"
            value={state.draft}
            onChange={(draft) => update({ draft })}
            onFileText={(draft) => update({ draft })}
            placeholder="Message payload…"
            className="min-h-40 flex-1"
          />
          <footer className="flex items-center gap-2 border-t border-line px-3 py-2">
            <Button
              size="sm"
              variant="ghost"
              icon={Braces}
              disabled={draftJson === undefined}
              onClick={() => update({ draft: JSON.stringify(draftJson, null, 2) })}
            >
              Prettify
            </Button>
            <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted sm:flex">
              <Kbd combo="mod+enter" />
            </span>
            <Button size="sm" variant="primary" icon={Send} disabled={status !== 'open'} onClick={sendDraft}>
              Send
            </Button>
          </footer>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              Frames
              <Badge tone="accent" icon={ArrowUpRight}>
                {stats.sent} · {formatBytes(stats.bytesOut)}
              </Badge>
              <Badge tone="success" icon={ArrowDownLeft}>
                {stats.received} · {formatBytes(stats.bytesIn)}
              </Badge>
            </span>
          }
          actions={
            <>
              <Button size="sm" variant="ghost" icon={Download} disabled={frames.length === 0} onClick={exportLog} title="Export log as JSON" />
              <Button size="sm" variant="ghost" icon={Trash2} disabled={frames.length === 0} onClick={clear} title="Clear log" />
            </>
          }
          bodyClassName="flex flex-col"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <TextInput
              aria-label="Filter frames"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter payloads…"
              className="h-7 min-w-32 flex-1 font-sans"
            />
            <Segmented<FrameDirection | 'all'>
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'all', label: 'All' },
                { value: 'out', label: 'Sent' },
                { value: 'in', label: 'Received' },
              ]}
            />
            <Toggle checked={autoScroll} onChange={setAutoScroll} label="Follow" />
          </div>
          <FrameLog frames={visible} autoScroll={autoScroll} empty={frames.length === 0} />
        </Panel>
      </div>
    </div>
  )
}

function FrameLog({ frames, autoScroll, empty }: { frames: Frame[]; autoScroll: boolean; empty: boolean }) {
  const container = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (autoScroll && container.current) container.current.scrollTop = container.current.scrollHeight
  }, [frames, autoScroll])

  if (empty) {
    return (
      <EmptyState
        icon={Radio}
        title="No frames yet"
        hint="Connect to any WebSocket endpoint. Traffic flows directly between your browser and the server."
      />
    )
  }
  return (
    <ol ref={container} className="min-h-0 flex-1 overflow-auto font-mono text-xs">
      {frames.map((frame) => (
        <FrameRow key={frame.id} frame={frame} />
      ))}
    </ol>
  )
}

function FrameRow({ frame }: { frame: Frame }) {
  const [open, setOpen] = useState(false)
  const json = useMemo(() => (open ? tryParseJson(frame.data) : undefined), [open, frame.data])
  const time = new Date(frame.at).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions)

  if (frame.direction === 'system') {
    return (
      <li className="flex items-center gap-2 border-b border-line/50 bg-surface-2/40 px-3 py-1.5 text-muted">
        <Info className="size-3.5 shrink-0" />
        <span className="text-muted/70">{time}</span>
        <span className="truncate font-sans">{frame.data}</span>
      </li>
    )
  }

  const outgoing = frame.direction === 'out'
  return (
    <li className="border-b border-line/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2"
      >
        {outgoing ? (
          <ArrowUpRight className="size-3.5 shrink-0 text-accent" />
        ) : (
          <ArrowDownLeft className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <span className="shrink-0 text-muted/70">{time}</span>
        <span className="min-w-0 flex-1 truncate">{previewFrame(frame.data)}</span>
        {frame.binary && <Badge className="h-5">binary</Badge>}
        <span className="shrink-0 text-muted/70">{formatBytes(frame.size)}</span>
      </button>
      {open && (
        <pre className="animate-in mx-3 mb-2 max-h-80 overflow-auto rounded-lg bg-surface-2 p-2.5 leading-relaxed whitespace-pre-wrap break-all">
          {json === undefined ? frame.data : JSON.stringify(json, null, 2)}
        </pre>
      )}
    </li>
  )
}
