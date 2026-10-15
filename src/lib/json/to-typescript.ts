import { isPlainObject } from './parse'

type Primitive = 'string' | 'number' | 'boolean' | 'null'

interface Field {
  shape: Shape
  optional: boolean
}

type Shape =
  | { kind: 'unknown' }
  | { kind: 'primitive'; name: Primitive }
  | { kind: 'array'; item: Shape }
  | { kind: 'object'; fields: Map<string, Field> }
  | { kind: 'union'; members: Shape[] }

export interface TypeGenOptions {
  rootName?: string
  readonly?: boolean
  declaration?: 'interface' | 'type'
}

const UNKNOWN: Shape = { kind: 'unknown' }
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

export function inferShape(value: unknown): Shape {
  if (value === null) return { kind: 'primitive', name: 'null' }
  if (Array.isArray(value)) return { kind: 'array', item: value.map(inferShape).reduce(mergeShapes, UNKNOWN) }
  if (isPlainObject(value)) {
    const fields = new Map<string, Field>()
    for (const [key, child] of Object.entries(value)) fields.set(key, { shape: inferShape(child), optional: false })
    return { kind: 'object', fields }
  }
  const type = typeof value
  if (type === 'string' || type === 'number' || type === 'boolean') return { kind: 'primitive', name: type }
  return UNKNOWN
}

function membersOf(shape: Shape): Shape[] {
  if (shape.kind === 'union') return shape.members
  if (shape.kind === 'unknown') return []
  return [shape]
}

function mergeObjects(
  a: Extract<Shape, { kind: 'object' }>,
  b: Extract<Shape, { kind: 'object' }>,
): Shape {
  const fields = new Map<string, Field>()
  for (const key of new Set([...a.fields.keys(), ...b.fields.keys()])) {
    const left = a.fields.get(key)
    const right = b.fields.get(key)
    if (left && right) {
      fields.set(key, { shape: mergeShapes(left.shape, right.shape), optional: left.optional || right.optional })
    } else {
      fields.set(key, { shape: (left ?? right)!.shape, optional: true })
    }
  }
  return { kind: 'object', fields }
}

export function mergeShapes(a: Shape, b: Shape): Shape {
  const members: Shape[] = []
  for (const candidate of [...membersOf(a), ...membersOf(b)]) {
    const index = members.findIndex((member) => member.kind === candidate.kind)
    const existing = members[index]
    if (!existing) {
      members.push(candidate)
    } else if (existing.kind === 'object' && candidate.kind === 'object') {
      members[index] = mergeObjects(existing, candidate)
    } else if (existing.kind === 'array' && candidate.kind === 'array') {
      members[index] = { kind: 'array', item: mergeShapes(existing.item, candidate.item) }
    } else if (existing.kind === 'primitive' && candidate.kind === 'primitive' && existing.name !== candidate.name) {
      if (!members.some((member) => member.kind === 'primitive' && member.name === candidate.name)) {
        members.push(candidate)
      }
    }
  }
  if (members.length === 0) return UNKNOWN
  if (members.length === 1) return members[0]!
  return { kind: 'union', members }
}

export function toPascalCase(input: string): string {
  const words = input
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z\d]+/)
    .filter(Boolean)
  const name = words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join('')
  if (!name) return 'Item'
  return /^\d/.test(name) ? `T${name}` : name
}

export function singularize(word: string): string {
  if (/ies$/i.test(word)) return word.slice(0, -3) + 'y'
  if (/(ss|us|is)$/i.test(word)) return word
  if (/(x|ch|sh)es$/i.test(word)) return word.slice(0, -2)
  if (/s$/i.test(word) && word.length > 1) return word.slice(0, -1)
  return `${word}Item`
}

interface Declaration {
  name: string
  body: string
}

class TypeEmitter {
  private readonly declarations: Array<Declaration | null> = []
  private readonly bySignature = new Map<string, string>()
  private readonly usedNames = new Set<string>()
  private readonly options: Required<TypeGenOptions>

  constructor(options: Required<TypeGenOptions>) {
    this.options = options
  }

  emit(shape: Shape, hint: string): string {
    switch (shape.kind) {
      case 'unknown':
        return 'unknown'
      case 'primitive':
        return shape.name
      case 'array': {
        const item = this.emit(shape.item, singularize(hint))
        const wrapped = shape.item.kind === 'union' ? `(${item})` : item
        return this.options.readonly ? `readonly ${wrapped}[]` : `${wrapped}[]`
      }
      case 'union':
        return shape.members.map((member) => this.emit(member, hint)).join(' | ')
      case 'object':
        return this.emitObject(shape, hint)
    }
  }

  private emitObject(shape: Extract<Shape, { kind: 'object' }>, hint: string): string {
    const slot = this.declarations.length
    this.declarations.push(null)
    const modifier = this.options.readonly ? 'readonly ' : ''
    const lines = [...shape.fields].map(([key, field]) => {
      const property = IDENTIFIER.test(key) ? key : JSON.stringify(key)
      const type = this.emit(field.shape, toPascalCase(key))
      return `  ${modifier}${property}${field.optional ? '?' : ''}: ${type}`
    })
    const body = lines.length > 0 ? `{\n${lines.join('\n')}\n}` : '{}'
    const existing = this.bySignature.get(body)
    if (existing) return existing
    const name = this.reserve(toPascalCase(hint))
    this.bySignature.set(body, name)
    this.declarations[slot] = { name, body }
    return name
  }

  private reserve(base: string): string {
    let name = base
    for (let suffix = 2; this.usedNames.has(name); suffix += 1) name = `${base}${suffix}`
    this.usedNames.add(name)
    return name
  }

  render(rootType: string): string {
    const declarations = this.declarations.filter((entry): entry is Declaration => entry !== null)
    const blocks = declarations.map(({ name, body }) =>
      this.options.declaration === 'interface' ? `export interface ${name} ${body}` : `export type ${name} = ${body}`,
    )
    const rootName = toPascalCase(this.options.rootName)
    if (!declarations.some((entry) => entry.name === rootName)) {
      blocks.unshift(`export type ${rootName} = ${rootType}`)
    }
    return `${blocks.join('\n\n')}\n`
  }
}

export function jsonToTypeScript(value: unknown, options: TypeGenOptions = {}): string {
  const resolved: Required<TypeGenOptions> = {
    rootName: options.rootName ?? 'Root',
    readonly: options.readonly ?? false,
    declaration: options.declaration ?? 'interface',
  }
  const emitter = new TypeEmitter(resolved)
  const rootType = emitter.emit(inferShape(value), resolved.rootName)
  return emitter.render(rootType)
}
