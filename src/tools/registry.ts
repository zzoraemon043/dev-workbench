import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { Binary, Braces, GitCompareArrows, KeyRound, Radio, Regex, type LucideIcon } from 'lucide-react'
import type { ToolId } from '@/store/workbench'

export interface ToolDefinition {
  id: ToolId
  name: string
  tagline: string
  icon: LucideIcon
  keywords: string[]
  component: LazyExoticComponent<ComponentType>
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'json',
    name: 'JSON Studio',
    tagline: 'Validate, explore, query and generate TypeScript types',
    icon: Braces,
    keywords: ['format', 'prettify', 'tree', 'jsonpath', 'typescript', 'interface'],
    component: lazy(() => import('./json/JsonStudio')),
  },
  {
    id: 'regex',
    name: 'Regex Lab',
    tagline: 'Live matching, capture groups, replace preview and plain-English explanations',
    icon: Regex,
    keywords: ['regexp', 'pattern', 'match', 'replace', 'explain'],
    component: lazy(() => import('./regex/RegexLab')),
  },
  {
    id: 'jwt',
    name: 'JWT Inspector',
    tagline: 'Decode claims, check expiry, verify and re-sign HMAC tokens',
    icon: KeyRound,
    keywords: ['token', 'auth', 'bearer', 'claims', 'hs256', 'sign'],
    component: lazy(() => import('./jwt/JwtInspector')),
  },
  {
    id: 'diff',
    name: 'Diff Studio',
    tagline: 'Side-by-side and unified diffs with word-level highlights',
    icon: GitCompareArrows,
    keywords: ['compare', 'patch', 'changes', 'myers'],
    component: lazy(() => import('./diff/DiffStudio')),
  },
  {
    id: 'codec',
    name: 'Codec Pipeline',
    tagline: 'Chain encoders, hashes and converters into drag-and-drop recipes',
    icon: Binary,
    keywords: ['base64', 'url', 'hex', 'hash', 'sha', 'timestamp', 'case', 'encode', 'decode'],
    component: lazy(() => import('./codec/CodecPipeline')),
  },
  {
    id: 'socket',
    name: 'Socket Console',
    tagline: 'Connect to any WebSocket and inspect every frame',
    icon: Radio,
    keywords: ['websocket', 'ws', 'realtime', 'frames', 'messages'],
    component: lazy(() => import('./socket/SocketConsole')),
  },
]

export const TOOL_IDS = TOOLS.map((tool) => tool.id)

export const TOOLS_BY_ID = Object.fromEntries(TOOLS.map((tool) => [tool.id, tool])) as Record<ToolId, ToolDefinition>
