import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToasts, type ToastTone } from '@/store/toast'

const ICONS: Record<ToastTone, typeof Info> = { success: CheckCircle2, error: XCircle, info: Info }
const TONES: Record<ToastTone, string> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-accent',
}

export function Toaster() {
  const toasts = useToasts((state) => state.toasts)
  const dismiss = useToasts((state) => state.dismiss)
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-10 z-50 flex flex-col items-end gap-2">
      {toasts.map((item) => {
        const Icon = ICONS[item.tone]
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => dismiss(item.id)}
            className="toast-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-left text-[13px] shadow-lg shadow-black/10 backdrop-blur"
          >
            <Icon className={cn('size-4 shrink-0', TONES[item.tone])} />
            {item.message}
          </button>
        )
      })}
    </div>
  )
}
