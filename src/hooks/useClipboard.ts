import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/store/toast'

export async function copyText(text: string, label = 'Copied to clipboard'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast(label)
    return true
  } catch {
    toast('Clipboard access was blocked by the browser', 'error')
    return false
  }
}

export function useCopy(resetAfter = 1400) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string, label?: string) => {
      if (!(await copyText(text, label))) return
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), resetAfter)
    },
    [resetAfter],
  )
  return { copied, copy }
}
