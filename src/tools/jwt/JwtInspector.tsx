import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  KeyRound,
  PenLine,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TimerOff,
  TimerReset,
} from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Badge, Button, CopyButton, EmptyState, ErrorBanner, Panel, TextInput } from '@/components/ui'
import { useHotkeys } from '@/hooks/useHotkeys'
import { cn } from '@/lib/cn'
import {
  CLAIM_LABELS,
  claimStatus,
  decodeJwt,
  formatRelative,
  isHmacAlgorithm,
  signHmac,
  timeClaims,
  verifyHmac,
  type ClaimStatus,
  type DecodedJwt,
  type JwtJson,
} from '@/lib/jwt/jwt'
import { toast } from '@/store/toast'
import { useToolState } from '@/store/workbench'

const STATUS_META: Record<ClaimStatus, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral'; icon: typeof TimerOff }> = {
  valid: { label: 'Active', tone: 'success', icon: BadgeCheck },
  expired: { label: 'Expired', tone: 'danger', icon: TimerOff },
  'not-yet-valid': { label: 'Not yet valid', tone: 'warning', icon: TimerReset },
  'no-expiry': { label: 'No expiry', tone: 'neutral', icon: ShieldQuestion },
}

const SEGMENT_COLORS = ['text-rose-500 dark:text-rose-400', 'text-violet-600 dark:text-violet-400', 'text-sky-600 dark:text-sky-400']

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

type Verification = 'checking' | 'valid' | 'invalid' | 'unsupported'

export default function JwtInspector() {
  const [state, update] = useToolState('jwt')
  const decoded = useMemo(() => (state.token.trim() ? decodeJwt(state.token) : null), [state.token])
  const jwt = decoded?.ok ? decoded.jwt : null

  return (
    <div className="grid h-full min-h-[640px] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-h-0 flex-col gap-3">
        <Panel
          title="Encoded token"
          icon={KeyRound}
          actions={<CopyButton text={state.token.trim()} />}
          className="min-h-56 flex-1"
          bodyClassName="flex flex-col"
        >
          <CodeEditor
            ariaLabel="JWT"
            softWrap
            syntaxOverlay
            overlay={colorizeToken(state.token)}
            value={state.token}
            onChange={(token) => update({ token })}
            onFileText={(token) => update({ token: token.trim() })}
            placeholder="Paste a JWT (the Bearer prefix is fine)…"
            className="min-h-24 flex-1"
          />
          {decoded && !decoded.ok && <ErrorBanner>{decoded.error}</ErrorBanner>}
        </Panel>
        {jwt && <SignaturePanel key={jwt.signingInput} jwt={jwt} />}
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-auto">
        {jwt ? (
          <>
            <ClaimsPanel payload={jwt.payload} />
            <JsonCard title="Header" json={jwt.header} accent={SEGMENT_COLORS[0]!} />
            <JsonCard title="Payload" json={jwt.payload} accent={SEGMENT_COLORS[1]!} />
          </>
        ) : (
          <Panel className="flex-1">
            <EmptyState
              icon={KeyRound}
              title="Paste a token to decode it"
              hint="Decoding and HMAC verification run locally with the Web Crypto API. Your token never leaves the browser."
            />
          </Panel>
        )}
      </div>
    </div>
  )
}

function colorizeToken(token: string): ReactNode {
  const prefix = /^\s*(Bearer\s+)?/i.exec(token)?.[0] ?? ''
  const parts = token.slice(prefix.length).split('.')
  return (
    <>
      <span className="text-muted">{prefix}</span>
      {parts.map((part, index) => (
        <span key={index}>
          <span className={SEGMENT_COLORS[index] ?? 'text-fg'}>{part}</span>
          {index < parts.length - 1 && <span className="text-muted">.</span>}
        </span>
      ))}
    </>
  )
}

function ClaimsPanel({ payload }: { payload: JwtJson }) {
  const now = useNow()
  const status = claimStatus(payload, now)
  const meta = STATUS_META[status]
  const times = timeClaims(payload)
  const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : null

  return (
    <Panel
      title="Claims"
      icon={CalendarClock}
      actions={
        <Badge tone={meta.tone} icon={meta.icon}>
          {meta.label}
          {exp && status !== 'not-yet-valid' && ` · ${formatRelative(exp, now)}`}
        </Badge>
      }
    >
      <dl className="divide-y divide-line text-[13px]">
        {Object.entries(payload).map(([claim, value]) => {
          const time = times.find((entry) => entry.claim === claim)
          return (
            <div key={claim} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-3 py-2">
              <dt className="truncate">
                <code className="font-mono text-xs text-accent">{claim}</code>
                {CLAIM_LABELS[claim] && <span className="ml-1.5 text-xs text-muted">{CLAIM_LABELS[claim]}</span>}
              </dt>
              <dd className="min-w-0 font-mono text-xs break-all">
                {time ? (
                  <>
                    {time.date.toLocaleString()}
                    <span className="ml-2 text-muted">{formatRelative(time.date.getTime(), now)}</span>
                  </>
                ) : typeof value === 'string' ? (
                  value
                ) : (
                  JSON.stringify(value)
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </Panel>
  )
}

function JsonCard({ title, json, accent }: { title: string; json: JwtJson; accent: string }) {
  const text = JSON.stringify(json, null, 2)
  return (
    <Panel title={<span className={accent}>{title}</span>} actions={<CopyButton text={text} />}>
      <pre className="overflow-auto p-3 font-mono text-xs leading-relaxed">{text}</pre>
    </Panel>
  )
}

function SignaturePanel({ jwt }: { jwt: DecodedJwt }) {
  const [state, update] = useToolState('jwt')
  const [checked, setChecked] = useState<{ key: string; valid: boolean } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => JSON.stringify(jwt.payload, null, 2))
  const algorithm = jwt.header.alg
  const supported = isHmacAlgorithm(algorithm)
  const verificationKey = `${state.token}\u0000${state.secret}`
  const verification: Verification = !supported
    ? 'unsupported'
    : checked?.key !== verificationKey
      ? 'checking'
      : checked.valid
        ? 'valid'
        : 'invalid'

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      verifyHmac(state.token, state.secret)
        .catch(() => false)
        .then((valid) => !cancelled && setChecked({ key: verificationKey, valid }))
    }, 120)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [state.token, state.secret, supported, verificationKey])

  const resign = async () => {
    let payload: unknown
    try {
      payload = JSON.parse(draft)
    } catch {
      toast('Payload must be valid JSON', 'error')
      return
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      toast('Payload must be a JSON object', 'error')
      return
    }
    const token = await signHmac(jwt.header, payload as JwtJson, state.secret)
    update({ token })
    toast('Token re-signed')
  }

  useHotkeys([{ combo: 'mod+enter', allowInInputs: true, handler: () => editing && void resign() }])

  const banner = {
    checking: null,
    valid: { icon: ShieldCheck, text: 'Signature verified', className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
    invalid: { icon: ShieldAlert, text: 'Invalid signature for this secret', className: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
    unsupported: {
      icon: ShieldQuestion,
      text: `${String(algorithm)} needs a public key — only HS256/384/512 verify offline`,
      className: 'text-amber-600 dark:text-amber-300 bg-amber-500/10',
    },
  }[verification]

  return (
    <Panel
      title="Signature"
      icon={ShieldCheck}
      actions={
        supported && (
          <Button size="sm" variant={editing ? 'secondary' : 'ghost'} icon={PenLine} onClick={() => setEditing(!editing)}>
            {editing ? 'Close editor' : 'Edit & re-sign'}
          </Button>
        )
      }
      bodyClassName="space-y-3 p-3"
    >
      <label className="block space-y-1.5">
        <span className="text-xs text-muted">HMAC secret · never included in share links</span>
        <TextInput
          type="text"
          value={state.secret}
          onChange={(event) => update({ secret: event.target.value })}
          placeholder="your-256-bit-secret"
          className="w-full"
        />
      </label>
      {banner && (
        <div className={cn('animate-in flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium', banner.className)}>
          <banner.icon className="size-4" />
          {banner.text}
        </div>
      )}
      {editing && (
        <div className="animate-in space-y-2">
          <textarea
            aria-label="Payload to sign"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            rows={8}
            className="w-full resize-y rounded-lg border border-line bg-surface-2 p-2.5 font-mono text-xs leading-relaxed outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
          />
          <Button variant="primary" icon={PenLine} onClick={() => void resign()} className="w-full">
            Sign with {isHmacAlgorithm(algorithm) ? algorithm : 'HS256'}
          </Button>
        </div>
      )}
    </Panel>
  )
}
