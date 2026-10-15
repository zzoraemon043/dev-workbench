import { useEffect, useSyncExternalStore } from 'react'
import { useWorkbench } from '@/store/workbench'

const query = '(prefers-color-scheme: dark)'

function subscribe(callback: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useWorkbench((state) => state.theme)
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

export function useApplyTheme(): void {
  const theme = useResolvedTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0c10' : '#f7f8fa')
  }, [theme])
}
