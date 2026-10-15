import { describe, expect, it } from 'vitest'
import { fuzzyMatch, rankByFuzzy } from './fuzzy'

describe('fuzzyMatch', () => {
  it('matches subsequences and records indices', () => {
    expect(fuzzyMatch('jwt', 'JWT Inspector')?.indices).toEqual([0, 1, 2])
    expect(fuzzyMatch('xyz', 'JSON')).toBeNull()
  })

  it('ranks word-start and contiguous matches higher', () => {
    const ranked = rankByFuzzy(['Toggle theme', 'Regex Lab', 'Share link'], 'tt', (item) => item)
    expect(ranked[0]?.item).toBe('Toggle theme')
    const prefix = rankByFuzzy(['Socket console', 'JSON Studio'], 'json', (item) => item)
    expect(prefix.map((entry) => entry.item)).toEqual(['JSON Studio'])
  })
})
