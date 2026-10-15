import { describe, expect, it } from 'vitest'
import { formatPath, parseQuery, queryJson } from './path'

const doc = {
  store: {
    books: [
      { title: 'SICP', price: 42, tags: ['lisp'] },
      { title: 'TAOCP', price: 199 },
      { title: 'Refactoring', price: 35 },
    ],
    'opening hours': { mon: '9-5' },
  },
  owner: { title: 'Ada' },
}

describe('queryJson', () => {
  it('selects by key and index, including negative indices', () => {
    expect(queryJson(doc, '$.store.books[0].title').map((m) => m.value)).toEqual(['SICP'])
    expect(queryJson(doc, 'store.books[-1].price').map((m) => m.value)).toEqual([35])
  })

  it('supports wildcards and bracket-quoted keys', () => {
    expect(queryJson(doc, '$.store.books[*].price').map((m) => m.value)).toEqual([42, 199, 35])
    expect(queryJson(doc, `$.store['opening hours'].mon`).map((m) => m.value)).toEqual(['9-5'])
  })

  it('supports recursive descent', () => {
    expect(queryJson(doc, '$..title').map((m) => m.value)).toEqual(['Ada', 'SICP', 'TAOCP', 'Refactoring'])
  })

  it('returns the root for "$" and nothing for missing paths', () => {
    expect(queryJson(doc, '$')).toEqual([{ path: [], value: doc }])
    expect(queryJson(doc, '$.nope.deeper')).toEqual([])
  })

  it('reports matched paths', () => {
    expect(queryJson(doc, '$.store.books[1]')[0]?.path).toEqual(['store', 'books', 1])
  })

  it('rejects malformed queries', () => {
    expect(() => parseQuery('$.a[')).toThrow(SyntaxError)
    expect(() => parseQuery('$.a[foo]')).toThrow(SyntaxError)
  })
})

describe('formatPath', () => {
  it('renders dotted and bracketed segments', () => {
    expect(formatPath(['store', 'opening hours', 0, 'x'])).toBe('$.store["opening hours"][0].x')
  })
})
