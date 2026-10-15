import { describe, expect, it } from 'vitest'
import { jsonToTypeScript, singularize, toPascalCase } from './to-typescript'

describe('jsonToTypeScript', () => {
  it('generates nested interfaces with singularized array item names', () => {
    const output = jsonToTypeScript({
      id: 1,
      name: 'Ada',
      users: [{ id: 1, email: 'a@b.c' }],
    })
    expect(output).toBe(
      [
        'export interface Root {',
        '  id: number',
        '  name: string',
        '  users: User[]',
        '}',
        '',
        'export interface User {',
        '  id: number',
        '  email: string',
        '}',
        '',
      ].join('\n'),
    )
  })

  it('marks keys missing from some array items as optional and unions mixed types', () => {
    const output = jsonToTypeScript({ items: [{ a: 1, b: 'x' }, { a: null }] })
    expect(output).toContain('  a: number | null')
    expect(output).toContain('  b?: string')
  })

  it('quotes non-identifier keys and handles empty arrays', () => {
    const output = jsonToTypeScript({ 'content-type': 'json', list: [] })
    expect(output).toContain('  "content-type": string')
    expect(output).toContain('  list: unknown[]')
  })

  it('emits an alias when the root is not an object', () => {
    expect(jsonToTypeScript([1, 'two'], { rootName: 'payload' })).toBe('export type Payload = (number | string)[]\n')
  })

  it('reuses identical shapes instead of duplicating declarations', () => {
    const output = jsonToTypeScript({ home: { lat: 1, lng: 2 }, work: { lat: 3, lng: 4 } })
    expect(output).toContain('  home: Home')
    expect(output).toContain('  work: Home')
    expect(output.match(/interface/g)).toHaveLength(2)
  })

  it('supports readonly type aliases', () => {
    const output = jsonToTypeScript({ tags: ['a'] }, { readonly: true, declaration: 'type' })
    expect(output).toBe('export type Root = {\n  readonly tags: readonly string[]\n}\n')
  })
})

describe('naming helpers', () => {
  it('converts keys to PascalCase', () => {
    expect(toPascalCase('user_profile-data')).toBe('UserProfileData')
    expect(toPascalCase('createdAt')).toBe('CreatedAt')
    expect(toPascalCase('123abc')).toBe('T123abc')
  })

  it('singularizes common plurals', () => {
    expect(singularize('Categories')).toBe('Category')
    expect(singularize('Boxes')).toBe('Box')
    expect(singularize('Users')).toBe('User')
    expect(singularize('Status')).toBe('Status')
    expect(singularize('Data')).toBe('DataItem')
  })
})
