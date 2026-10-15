import { useEffect, useRef, useState } from 'react'
import type { RegexMatch } from '@/lib/regex/engine'
import type { RegexJob, RegexJobResult } from './regex.worker'

const TIMEOUT_MS = 1500

interface RegexOutcome {
  key: string
  matches: RegexMatch[]
  replaced: string | null
  timedOut: boolean
}

export interface RegexWorkerState {
  matches: RegexMatch[]
  replaced: string | null
  timedOut: boolean
  pending: boolean
}

function spawn(): Worker {
  return new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' })
}

export function useRegexWorker(job: Omit<RegexJob, 'id'>): RegexWorkerState {
  const worker = useRef<Worker | null>(null)
  const nextId = useRef(0)
  const [outcome, setOutcome] = useState<RegexOutcome | null>(null)
  const key = JSON.stringify(job)

  useEffect(
    () => () => {
      worker.current?.terminate()
      worker.current = null
    },
    [],
  )

  useEffect(() => {
    const payload = JSON.parse(key) as Omit<RegexJob, 'id'>
    worker.current ??= spawn()
    const current = worker.current
    const id = ++nextId.current

    const timer = window.setTimeout(() => {
      current.terminate()
      worker.current = null
      setOutcome({ key, matches: [], replaced: null, timedOut: true })
    }, TIMEOUT_MS)

    const onMessage = ({ data }: MessageEvent<RegexJobResult>) => {
      if (data.id !== id) return
      window.clearTimeout(timer)
      setOutcome({ key, matches: data.matches, replaced: data.replaced, timedOut: false })
    }

    current.addEventListener('message', onMessage)
    current.postMessage({ ...payload, id } satisfies RegexJob)
    return () => {
      window.clearTimeout(timer)
      current.removeEventListener('message', onMessage)
    }
  }, [key])

  const fresh = outcome?.key === key
  return {
    matches: outcome?.matches ?? [],
    replaced: outcome?.replaced ?? null,
    timedOut: fresh && outcome.timedOut,
    pending: !fresh,
  }
}
