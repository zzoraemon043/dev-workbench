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

/*
 * Myers' O((N+M)·D) greedy algorithm. `frontier[k]` holds the furthest x reached on
 * diagonal k = x - y. Before round d we snapshot only diagonals [-d-1, d+1], which keeps
 * the trace at O(D²) memory while still letting us walk the edit path backwards.
 */
function myers(a: string[], b: string[]): Step[] {
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max + 1
  const frontier = new Int32Array(2 * max + 3)
  const trace: Int32Array[] = []
  const read = (d: number, k: number) => trace[d]![k + d + 1]!

  outer: for (let d = 0; d <= max; d += 1) {
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
