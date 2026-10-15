import { useEffect } from 'react'
import { detectContent, parseRegexLiteral } from '@/lib/detect'
import { toast } from '@/store/toast'
import { useWorkbench } from '@/store/workbench'
import { TOOLS_BY_ID } from '@/tools/registry'
import { isEditableTarget } from './useHotkeys'

export function routePastedText(text: string): void {
  const detection = detectContent(text)
  const store = useWorkbench.getState()
  const trimmed = text.trim()

  switch (detection.tool) {
    case 'jwt':
      store.update('jwt', { token: trimmed })
      break
    case 'json':
      store.update('json', { input: trimmed })
      break
    case 'socket':
      store.update('socket', { url: trimmed })
      break
    case 'regex': {
      const literal = parseRegexLiteral(trimmed)
      if (literal) store.update('regex', literal)
      break
    }
    case 'diff': {
      const [left = '', right = ''] = text.split('\n---\n')
      store.update('diff', { left, right })
      break
    }
    case 'codec':
      store.update('codec', { input: text, pipeline: detection.pipeline ?? store.codec.pipeline })
      break
  }
  store.setActiveTool(detection.tool)
  toast(`Detected ${detection.label} → ${TOOLS_BY_ID[detection.tool].name}`, 'info')
}

export function useSmartPaste(): void {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return
      const text = event.clipboardData?.getData('text/plain')
      if (!text?.trim()) return
      event.preventDefault()
      routePastedText(text)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])
}
