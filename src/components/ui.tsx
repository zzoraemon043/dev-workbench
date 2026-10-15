import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check, Copy, type LucideIcon } from 'lucide-react'
import { formatCombo } from '@/hooks/useHotkeys'
import { useCopy } from '@/hooks/useClipboard'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: LucideIcon
  size?: 'sm' | 'md'
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-sm shadow-accent/30 hover:bg-accent/90',
  secondary: 'border border-line bg-surface text-fg hover:bg-surface-2 hover:border-line-strong',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', icon: Icon, size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-[13px]',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2} />}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  active?: boolean
}

export function IconButton({ icon: Icon, label, active, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-all duration-150',
        'hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-90',
        active && 'bg-accent/10 text-accent',
        className,
      )}
      {...props}
    >
      <Icon className="size-4" />
    </button>
  )
}

export function CopyButton({ text, label = 'Copy', disabled }: { text: string; label?: string; disabled?: boolean }) {
  const { copied, copy } = useCopy()
  return (
    <Button size="sm" variant="ghost" icon={copied ? Check : Copy} disabled={disabled || !text} onClick={() => copy(text)}>
      {copied ? 'Copied' : label}
    </Button>
  )
}

export function Kbd({ combo, className }: { combo: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {formatCombo(combo).map((key) => (
        <kbd
          key={key}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1 font-sans text-[10px] font-medium text-muted"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  bodyClassName?: string
}

export function Panel({ title, icon: Icon, actions, className, bodyClassName, children, ...props }: PanelProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)]',
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <header className="flex min-h-11 items-center gap-2 border-b border-line px-3 py-1.5">
          {Icon && <Icon className="size-4 text-muted" />}
          {title && <h2 className="truncate text-[13px] font-semibold tracking-tight">{title}</h2>}
          <div className="ml-auto flex items-center gap-1">{actions}</div>
        </header>
      )}
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: ReactNode; icon?: LucideIcon }>
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}

export function Segmented<T extends string>({ value, options, onChange, size = 'sm' }: SegmentedProps<T>) {
  return (
    <div role="tablist" className="inline-flex items-center rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((option) => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-[13px]',
              selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  accent: 'bg-accent/10 text-accent border-accent/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  className,
  children,
}: {
  tone?: BadgeTone
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium tabular-nums',
        BADGE_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-muted hover:text-fg">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-4 w-7 rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-3',
          )}
        />
      </button>
      {label}
    </label>
  )
}

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="mb-1 flex size-10 items-center justify-center rounded-xl border border-line bg-surface-2">
        <Icon className="size-5 text-muted" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in flex items-start gap-2 border-t border-rose-500/20 bg-rose-500/8 px-3 py-2 font-mono text-xs text-rose-600 dark:text-rose-400">
      {children}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      spellCheck={false}
      autoComplete="off"
      className={cn(
        'h-8 min-w-0 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-[13px] text-fg transition-colors',
        'placeholder:text-muted/60 focus:border-accent/50 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/15',
        className,
      )}
      {...props}
    />
  )
})
