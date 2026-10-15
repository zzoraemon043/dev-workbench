import { useEffect, useRef } from 'react'

export interface Hotkey {
  combo: string
  handler: (event: KeyboardEvent) => void
  allowInInputs?: boolean
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

interface ParsedCombo {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

function parseCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split('+')
  return {
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.at(-1) ?? '',
  }
}

function eventKey(event: KeyboardEvent): string {
  if (/^Digit\d$/.test(event.code)) return event.code.slice(5)
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase()
  return event.key.toLowerCase()
}

export function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parsed = parseCombo(combo)
  const mod = isMac ? event.metaKey : event.ctrlKey
  return (
    parsed.mod === mod &&
    parsed.alt === event.altKey &&
    (parsed.shift === event.shiftKey || parsed.key === '?') &&
    eventKey(event) === parsed.key
  )
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function formatCombo(combo: string): string[] {
  return combo.split('+').map((part) => {
    switch (part.toLowerCase()) {
      case 'mod':
        return isMac ? '⌘' : 'Ctrl'
      case 'shift':
        return isMac ? '⇧' : 'Shift'
      case 'alt':
        return isMac ? '⌥' : 'Alt'
      case 'enter':
        return '↵'
      case 'escape':
        return 'Esc'
      default:
        return part.length === 1 ? part.toUpperCase() : part
    }
  })
}

export function useHotkeys(hotkeys: Hotkey[]): void {
  const latest = useRef(hotkeys)
  useEffect(() => {
    latest.current = hotkeys
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      for (const hotkey of latest.current) {
        if (!matchesCombo(event, hotkey.combo)) continue
        const plainKey = !hotkey.combo.includes('mod') && !hotkey.combo.includes('alt')
        if (isEditableTarget(event.target) && (plainKey || !hotkey.allowInInputs)) continue
        event.preventDefault()
        hotkey.handler(event)
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
