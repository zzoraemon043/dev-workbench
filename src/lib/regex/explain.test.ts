import { describe, expect, it } from 'vitest'
import { REGEX_PRESETS, explainRegex } from './explain'

describe('explainRegex', () => {
  it('describes common tokens', () => {
    const tokens = explainRegex('^\\d{2,4}[a-z]+?(?<id>x|y)$')
    expect(tokens.map((token) => [token.kind, token.source])).toEqual([
      ['anchor', '^'],
      ['escape', '\\d'],
      ['quantifier', '{2,4}'],
      ['class', '[a-z]'],
      ['quantifier', '+?'],
      ['group', '(?<id>'],
      ['literal', 'x'],
      ['alternation', '|'],
      ['literal', 'y'],
      ['group', ')'],
      ['anchor', '$'],
    ])
    expect(tokens[2]!.description).toBe('between 2 and 4 times')
    expect(tokens[4]!.description).toBe('one or more times (lazy)')
    expect(tokens[5]!.description).toContain('named capture group "id"')
  })

  it('tracks nesting depth', () => {
    const depths = explainRegex('(a(b))').map((token) => token.depth)
    expect(depths).toEqual([0, 1, 1, 2, 1, 0])
  })

  it('splits the last literal character off before a quantifier', () => {
    const tokens = explainRegex('abc+')
    expect(tokens.map((token) => token.source)).toEqual(['ab', 'c', '+'])
  })

  it('numbers unnamed capture groups', () => {
    const tokens = explainRegex('(a)(?:b)(c)')
    expect(tokens.filter((token) => token.description.startsWith('start of capture')).map((t) => t.description)).toEqual([
      'start of capture group #1',
      'start of capture group #2',
    ])
  })
})

describe('REGEX_PRESETS', () => {
  it('compile and match their own samples', () => {
    for (const preset of REGEX_PRESETS) {
      const regex = new RegExp(preset.pattern, preset.flags)
      expect(preset.sample.match(regex), preset.id).not.toBeNull()
    }
  })
})
