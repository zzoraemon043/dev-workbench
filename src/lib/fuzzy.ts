export interface FuzzyResult {
  score: number
  indices: number[]
}

export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  const needle = query.toLowerCase().replace(/\s+/g, '')
  if (!needle) return { score: 0, indices: [] }
  const haystack = target.toLowerCase()
  const indices: number[] = []
  let score = 0
  let cursor = 0
  let streak = 0

  for (const char of needle) {
    const found = haystack.indexOf(char, cursor)
    if (found === -1) return null
    const atWordStart = found === 0 || /[\s\-_/.]/.test(haystack[found - 1]!)
    streak = found === cursor && indices.length > 0 ? streak + 1 : 0
    score += 1 + streak * 2 + (atWordStart ? 3 : 0) - Math.min(found - cursor, 5) * 0.2
    indices.push(found)
    cursor = found + 1
  }
  return { score: score - haystack.length * 0.01, indices }
}

export function rankByFuzzy<T>(items: readonly T[], query: string, text: (item: T) => string) {
  return items
    .map((item) => ({ item, match: fuzzyMatch(query, text(item)) }))
    .filter((entry): entry is { item: T; match: FuzzyResult } => entry.match !== null)
    .sort((a, b) => b.match.score - a.match.score)
}
