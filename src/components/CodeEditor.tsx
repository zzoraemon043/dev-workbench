import { forwardRef, useMemo, useRef, type KeyboardEvent, type ReactNode, type UIEvent } from 'react'
import { FileUp } from 'lucide-react'
import { useFileDrop } from '@/hooks/useFileDrop'
import { cn } from '@/lib/cn'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  overlay?: ReactNode
  lineNumbers?: boolean
  highlightLine?: number | null
  onFileText?: (text: string) => void
  softWrap?: boolean
  syntaxOverlay?: boolean
  className?: string
  ariaLabel: string
}

const METRICS = 'p-3 font-mono text-[13px] leading-[1.6] [tab-size:2]'
const WRAP = 'whitespace-pre-wrap break-all'
const NO_WRAP = 'whitespace-pre'

export const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(function CodeEditor(
  {
    value,
    onChange,
    placeholder,
    readOnly,
    overlay,
    lineNumbers = true,
    highlightLine,
    onFileText,
    softWrap = false,
    syntaxOverlay = false,
    className,
    ariaLabel,
  },
  ref,
) {
  const gutter = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLPreElement>(null)
  const { dragging, handlers } = useFileDrop((text) => onFileText?.(text))

  const lineCount = useMemo(() => {
    let count = 1
    for (let i = value.indexOf('\n'); i !== -1; i = value.indexOf('\n', i + 1)) count += 1
    return count
  }, [value])

  const gutterText = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1).join('\n'),
    [lineCount],
  )

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget
    if (gutter.current) gutter.current.style.transform = `translateY(${-scrollTop}px)`
    if (backdrop.current) backdrop.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab' || event.shiftKey || readOnly) return
    event.preventDefault()
    const target = event.currentTarget
    const { selectionStart, selectionEnd } = target
    const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`
    onChange?.(next)
    requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2))
  }

  return (
    <div className={cn('relative flex h-full min-h-0 overflow-hidden', className)} {...(onFileText ? handlers : {})}>
      {lineNumbers && !softWrap && (
        <div className="relative w-12 shrink-0 overflow-hidden border-r border-line bg-surface-2/50 select-none">
          <div ref={gutter} className="relative text-[13px] will-change-transform">
            {highlightLine != null && (
              <span
                className="absolute inset-x-0 h-[1.6em] bg-rose-500/20"
                style={{ top: `calc(0.75rem + ${(highlightLine - 1) * 1.6}em)` }}
              />
            )}
            <pre aria-hidden className={cn(METRICS, 'relative m-0 pr-2 text-right text-muted/50')}>
              {gutterText}
            </pre>
          </div>
        </div>
      )}
      <div className="relative min-w-0 flex-1">
        {overlay !== undefined && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <pre
              ref={backdrop}
              className={cn(METRICS, softWrap ? WRAP : NO_WRAP, 'm-0 will-change-transform', !syntaxOverlay && 'text-transparent')}
            >
              {overlay}
              {'\n'}
            </pre>
          </div>
        )}
        <textarea
          ref={ref}
          aria-label={ariaLabel}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap={softWrap ? 'soft' : 'off'}
          onChange={(event) => onChange?.(event.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          className={cn(
            METRICS,
            softWrap ? WRAP : NO_WRAP,
            'absolute inset-0 size-full resize-none overflow-auto bg-transparent caret-accent outline-none',
            syntaxOverlay && overlay !== undefined ? 'text-transparent' : 'text-fg',
            'placeholder:text-muted/50 selection:bg-accent/25',
          )}
        />
      </div>
      {dragging && (
        <div className="animate-in pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-[2px]">
          <FileUp className="size-6 text-accent" />
          <span className="text-sm font-medium text-accent">Drop to load file</span>
        </div>
      )}
    </div>
  )
})
