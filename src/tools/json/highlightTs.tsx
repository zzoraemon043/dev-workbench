import type { ReactNode } from 'react'

const TOKENS =
  /(\b(?:export|interface|type|readonly)\b)|(\b(?:string|number|boolean|null|unknown)\b)|("(?:[^"\\]|\\.)*")|(\b[A-Z]\w*\b)/g

const CLASSES = [
  'text-violet-600 dark:text-violet-400',
  'text-sky-600 dark:text-sky-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-300',
]

export function highlightTs(code: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const match of code.matchAll(TOKENS)) {
    if (match.index > cursor) nodes.push(code.slice(cursor, match.index))
    const group = match.slice(1).findIndex(Boolean)
    nodes.push(
      <span key={match.index} className={CLASSES[group]}>
        {match[0]}
      </span>,
    )
    cursor = match.index + match[0].length
  }
  nodes.push(code.slice(cursor))
  return nodes
}
