export type EditKind = 'equal' | 'insert' | 'delete'

export interface Edit<T> {
  kind: EditKind
  value: T
  oldIndex: number | null
  newIndex: number | null
}

export function diffSequences<T>(a: readonly T[], b: readonly T[], key: (item: T) => string = String): Edit<T>[] {
  const left = a.map(key)
  const right = b.map(key)

  let prefix = 0
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const middle = myers(left.slice(prefix, left.length - suffix), right.slice(prefix, right.length - suffix))
  const edits: Edit<T>[] = []
  for (let i = 0; i < prefix; i += 1) edits.push({ kind: 'equal', value: b[i]!, oldIndex: i, newIndex: i })
  for (const step of middle) {
    const oldIndex = step.oldIndex === null ? null : step.oldIndex + prefix
    const newIndex = step.newIndex === null ? null : step.newIndex + prefix
    const value = newIndex === null ? a[oldIndex!]! : b[newIndex]!
    edits.push({ kind: step.kind, value, oldIndex, newIndex })
  }
  for (let i = suffix; i > 0; i -= 1) {
    edits.push({ kind: 'equal', value: b[b.length - i]!, oldIndex: a.length - i, newIndex: b.length - i })
  }
  return edits
}

interface Step {
  kind: EditKind
  oldIndex: number | null
  newIndex: number | null
}

const MAX_TRACE_BYTES = 8 * 1024 * 1024

function appendUnmatched(steps: Step[], oldStart: number, oldEnd: number, newStart: number, newEnd: number): void {
  for (let i = oldStart; i < oldEnd; i += 1) steps.push({ kind: 'delete', oldIndex: i, newIndex: null })
  for (let i = newStart; i < newEnd; i += 1) steps.push({ kind: 'insert', oldIndex: null, newIndex: i })
}

// Hirschberg's algorithm reconstructs a longest common subsequence using two rows at a time.
function linearSpaceDiff(a: string[], b: string[]): Step[] {
  const steps: Step[] = []
  const leftKeys = new Set(a)
  if (!b.some((key) => leftKeys.has(key))) {
    appendUnmatched(steps, 0, a.length, 0, b.length)
    return steps
  }

  const splitColumn = (start: number, mid: number, end: number, from: number, to: number): number => {
    const width = to - from
    const lengths = (first: number, count: number, reverse: boolean) => {
      const row = new Uint32Array(width + 1)
      for (let i = 0; i < count; i += 1) {
        const key = a[reverse ? first - i : first + i]
        let diagonal = 0
        for (let j = 1; j <= width; j += 1) {
          const above = row[j]!
          row[j] = key === b[reverse ? to - j : from + j - 1] ? diagonal + 1 : Math.max(row[j - 1]!, above)
          diagonal = above
        }
      }
      return row
    }
    const forward = lengths(start, mid - start, false)
    const backward = lengths(end - 1, end - mid, true)
    let best = -1
    let column = 0
    for (let j = 0; j <= width; j += 1) {
      const score = forward[j]! + backward[width - j]!
      if (score > best) {
        best = score
        column = j
      }
    }
    return from + column
  }

  const visit = (start: number, end: number, from: number, to: number): void => {
    if (start === end || from === to) {
      appendUnmatched(steps, start, end, from, to)
    } else if (end - start === 1) {
      const match = b.indexOf(a[start]!, from)
      if (match === -1 || match >= to) {
        appendUnmatched(steps, start, end, from, to)
        return
      }
      appendUnmatched(steps, start, start, from, match)
      steps.push({ kind: 'equal', oldIndex: start, newIndex: match })
      appendUnmatched(steps, end, end, match + 1, to)
    } else {
      const mid = start + Math.floor((end - start) / 2)
      const split = splitColumn(start, mid, end, from, to)
      visit(start, mid, from, split)
      visit(mid, end, split, to)
    }
  }
  visit(0, a.length, 0, b.length)
  return steps
}

/*
 * Myers' O((N+M)·D) greedy algorithm. `frontier[k]` holds the furthest x reached on
 * diagonal k = x - y. Before round d we snapshot only diagonals [-d-1, d+1], which keeps
 * the trace at O(D²) memory while still letting us walk the edit path backwards.
 */
function myers(a: string[], b: string[]): Step[] {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) {
    const steps: Step[] = []
    appendUnmatched(steps, 0, n, 0, m)
    return steps
  }
  const max = n + m
  const offset = max + 1
  const frontier = new Int32Array(2 * max + 3)
  const trace: Int32Array[] = []
  const read = (d: number, k: number) => trace[d]![k + d + 1]!

  outer: for (let d = 0; d <= max; d += 1) {
    if ((d + 1) * (d + 3) * Int32Array.BYTES_PER_ELEMENT > MAX_TRACE_BYTES) return linearSpaceDiff(a, b)
    trace.push(frontier.slice(offset - d - 1, offset + d + 2))
    for (let k = -d; k <= d; k += 2) {
      const goDown = k === -d || (k !== d && frontier[offset + k - 1]! < frontier[offset + k + 1]!)
      let x = goDown ? frontier[offset + k + 1]! : frontier[offset + k - 1]! + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x += 1
        y += 1
      }
      frontier[offset + k] = x
      if (x >= n && y >= m) break outer
    }
  }

  const steps: Step[] = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d >= 0; d -= 1) {
    const k = x - y
    const goDown = k === -d || (k !== d && read(d, k - 1) < read(d, k + 1))
    const prevK = goDown ? k + 1 : k - 1
    const prevX = read(d, prevK)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      x -= 1
      y -= 1
      steps.push({ kind: 'equal', oldIndex: x, newIndex: y })
    }
    if (d > 0) {
      if (goDown) {
        y -= 1
        steps.push({ kind: 'insert', oldIndex: null, newIndex: y })
      } else {
        x -= 1
        steps.push({ kind: 'delete', oldIndex: x, newIndex: null })
      }
    }
  }
  return steps.reverse()
}
