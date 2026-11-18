import { createElement, forwardRef, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Button } from '@/components/ui'
import { DEFAULT_TOOL_STATES } from '@/store/workbench'
import JsonStudio from './JsonStudio'

const { actions, update, useToolState, toast } = vi.hoisted(() => ({
  actions: new Map<string, () => void>(),
  update: vi.fn(),
  useToolState: vi.fn(),
  toast: vi.fn(),
}))

vi.mock(import('@/store/workbench'), async (importOriginal) => ({
  ...await importOriginal(),
  useToolState,
}))
vi.mock('@/store/toast', () => ({ toast }))
vi.mock(import('@/components/ui'), async (importOriginal) => ({
  ...await importOriginal(),
  Button: forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof Button>>(({ children, onClick }, _ref) => {
    const label = isValidElement<{ children?: ReactNode }>(children) ? children.props.children : children
    if (typeof label === 'string' && onClick) actions.set(label, () => onClick({} as Parameters<typeof onClick>[0]))
    return null
  }),
}))

beforeEach(() => {
  actions.clear()
  vi.clearAllMocks()
})

it.each([
  ['Format', '{\n  "z": 9007199254740993,\n  "a": [\n    1e400,\n    -0,\n    1.2300,\n    "~0:2"\n  ]\n}'],
  ['Minify', '{"z":9007199254740993,"a":[1e400,-0,1.2300,"~0:2"]}'],
  ['Sort', '{\n  "a": [\n    1e400,\n    -0,\n    1.2300,\n    "~0:2"\n  ],\n  "z": 9007199254740993\n}'],
])('preserves numeric tokens during %s', (action, expected) => {
  const input = '{"z": 9007199254740993, "a": [1e400, -0, 1.2300, "\\u007e0:2"]}'
  useToolState.mockReturnValue([{ ...DEFAULT_TOOL_STATES.json, input }, update])
  renderToStaticMarkup(createElement(JsonStudio))

  actions.get(action)!()

  expect(update).toHaveBeenCalledWith({ input: expected })
})

it('leaves invalid JSON unchanged and reports the syntax error', () => {
  useToolState.mockReturnValue([{ ...DEFAULT_TOOL_STATES.json, input: '{123: 456}' }, update])
  renderToStaticMarkup(createElement(JsonStudio))

  actions.get('Format')!()

  expect(update).not.toHaveBeenCalled()
  expect(toast).toHaveBeenCalledWith('Fix the JSON syntax error first', 'error')
})

it('reports when duplicate keys would discard a numeric token', () => {
  const input = '{"id":9007199254740993,"id":1}'
  useToolState.mockReturnValue([{ ...DEFAULT_TOOL_STATES.json, input }, update])
  renderToStaticMarkup(createElement(JsonStudio))

  actions.get('Format')!()

  expect(update).not.toHaveBeenCalled()
  expect(toast).toHaveBeenCalledWith('Could not transform JSON without changing its numbers', 'error')
})
