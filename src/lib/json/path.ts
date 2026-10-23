import { isPlainObject } from './parse'

export type PathSegment = string | number

export interface QueryMatch {
  path: PathSegment[]
  value: unknown
}

type Selector =
  | { kind: 'key'; name: string }
  | { kind: 'index'; index: number }
  | { kind: 'wildcard' }
  | { kind: 'descendant'; name: string | null }

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

export function formatPath(path: PathSegment[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`
    return IDENTIFIER.test(segment) ? `${acc}.${segment}` : `${acc}[${JSON.stringify(segment)}]`
  }, '$')
}

export function parseQuery(query: string): Selector[] {
  const source = query.trim()
  const selectors: Selector[] = []
  let cursor = source.startsWith('$') ? 1 : 0

  const readName = (): string => {
    const match = /^[^.[\]\s]+/.exec(source.slice(cursor))
    if (!match) throw new SyntaxError(`Expected a property name at ${cursor}`)
    cursor += match[0].length
    return match[0]
  }

  if (cursor === 0 && source.length > 0 && source[0] !== '.' && source[0] !== '[') {
    selectors.push(toKeySelector(readName()))
  }

  while (cursor < source.length) {
    const char = source[cursor]
    if (source.startsWith('..', cursor)) {
      cursor += 2
      if (source[cursor] === '*') {
        cursor += 1
        selectors.push({ kind: 'descendant', name: null })
      } else {
        selectors.push({ kind: 'descendant', name: readName() })
      }
    } else if (char === '.') {
      cursor += 1
      selectors.push(toKeySelector(readName()))
    } else if (char === '[') {
      const close = findClosingBracket(source, cursor)
      selectors.push(parseBracket(source.slice(cursor + 1, close).trim()))
      cursor = close + 1
    } else {
      throw new SyntaxError(`Unexpected "${char}" at ${cursor}`)
    }
  }
  return selectors
}

function toKeySelector(name: string): Selector {
  return name === '*' ? { kind: 'wildcard' } : { kind: 'key', name }
}

function findClosingBracket(source: string, open: number): number {
  let quote: string | null = null
  for (let i = open + 1; i < source.length; i += 1) {
    const char = source[i]
    if (quote) {
      if (char === '\\') i += 1
      else if (char === quote) quote = null
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === ']') {
      return i
    }
  }
  throw new SyntaxError(`Unclosed "[" at ${open}`)
}

function parseBracket(inner: string): Selector {
  if (inner === '*') return { kind: 'wildcard' }
  if (/^-?\d+$/.test(inner)) return { kind: 'index', index: Number(inner) }
  const quoted = /^(['"])(.*)\1$/.exec(inner)
  if (quoted) return { kind: 'key', name: quoted[2]!.replace(/\\(.)/g, '$1') }
  throw new SyntaxError(`Invalid bracket selector [${inner}]`)
}

function children(value: unknown, path: PathSegment[]): QueryMatch[] {
  if (Array.isArray(value)) return value.map((item, index) => ({ path: [...path, index], value: item }))
  if (isPlainObject(value)) return Object.entries(value).map(([key, item]) => ({ path: [...path, key], value: item }))
  return []
}

function descendants(match: QueryMatch): QueryMatch[] {
  const result: QueryMatch[] = []
  const queue = [match]
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!
    result.push(current)
    for (const child of children(current.value, current.path)) queue.push(child)
  }
  return result
}

function apply(selector: Selector, matches: QueryMatch[]): QueryMatch[] {
  return matches.flatMap(({ path, value }): QueryMatch[] => {
    switch (selector.kind) {
      case 'key':
        return isPlainObject(value) && Object.hasOwn(value, selector.name)
          ? [{ path: [...path, selector.name], value: value[selector.name] }]
          : []
      case 'index': {
        if (!Array.isArray(value)) return []
        const index = selector.index < 0 ? value.length + selector.index : selector.index
        return index >= 0 && index < value.length ? [{ path: [...path, index], value: value[index] }] : []
      }
      case 'wildcard':
        return children(value, path)
      case 'descendant': {
        const all = descendants({ path, value })
        if (selector.name === null) return all.slice(1)
        return apply({ kind: 'key', name: selector.name }, all)
      }
    }
  })
}

export function queryJson(root: unknown, query: string): QueryMatch[] {
  return parseQuery(query).reduce<QueryMatch[]>((matches, selector) => apply(selector, matches), [
    { path: [], value: root },
  ])
}
