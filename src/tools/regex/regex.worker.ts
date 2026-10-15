import { compileRegex, findMatches, replaceAll, type RegexMatch } from '@/lib/regex/engine'

export interface RegexJob {
  id: number
  pattern: string
  flags: string
  input: string
  replacement: string | null
}

export interface RegexJobResult {
  id: number
  matches: RegexMatch[]
  replaced: string | null
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<RegexJob>) => void) | null
  postMessage: (message: RegexJobResult) => void
}

const scope = self as unknown as WorkerScope

scope.onmessage = ({ data }) => {
  const compiled = compileRegex(data.pattern, data.flags)
  if (!compiled.ok) {
    scope.postMessage({ id: data.id, matches: [], replaced: null })
    return
  }
  scope.postMessage({
    id: data.id,
    matches: data.pattern ? findMatches(compiled.regex, data.input) : [],
    replaced: data.replacement === null ? null : replaceAll(compiled.regex, data.input, data.replacement),
  })
}
