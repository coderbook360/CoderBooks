# 实现路径解析

路径解析是路由匹配的基础。它需要处理静态路径、动态参数、通配符等多种模式。

## 路径的组成部分

一个完整的 URL 路径可能包含多种元素：静态段如 `/users`，动态参数如 `:id`，可选参数如 `:id?`，正则约束如 `:id(\\d+)`，通配符如 `*` 或 `**`。解析器需要识别这些模式并生成对应的正则表达式。

## Token 化

首先把路径字符串分解成 token 序列：

```typescript
// matcher/pathTokenizer.ts

export const enum TokenType {
  Static,    // 静态文本
  Param,     // 动态参数 :id
  Group,     // 分组 (a|b)
}

export interface Token {
  type: TokenType
  value: string
  regexp?: string
  optional: boolean
  repeatable: boolean
}

export function tokenizePath(path: string): Token[][] {
  if (!path) return [[]]
  if (path === '/') return [[]]
  
  // 移除开头的 /
  if (path.startsWith('/')) {
    path = path.slice(1)
  }
  
  // 按 / 分割成段
  const segments = path.split('/')
  const result: Token[][] = []
  
  for (const segment of segments) {
    const tokens = tokenizeSegment(segment)
    if (tokens.length) {
      result.push(tokens)
    }
  }
  
  return result
}

function tokenizeSegment(segment: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  
  while (i < segment.length) {
    const char = segment[i]
    
    if (char === ':') {
      // 动态参数
      const token = parseParam(segment, i)
      tokens.push(token.token)
      i = token.end
    } else if (char === '(') {
      // 分组
      const token = parseGroup(segment, i)
      tokens.push(token.token)
      i = token.end
    } else {
      // 静态文本
      const token = parseStatic(segment, i)
      tokens.push(token.token)
      i = token.end
    }
  }
  
  return tokens
}

function parseParam(
  segment: string, 
  start: number
): { token: Token; end: number } {
  let i = start + 1 // 跳过 :
  let name = ''
  let regexp = ''
  let optional = false
  let repeatable = false
  
  // 读取参数名
  while (i < segment.length && /[\w]/.test(segment[i])) {
    name += segment[i]
    i++
  }
  
  // 检查正则约束 (pattern)
  if (segment[i] === '(') {
    const closeIndex = findClosingParen(segment, i)
    regexp = segment.slice(i + 1, closeIndex)
    i = closeIndex + 1
  }
  
  // 检查修饰符
  if (segment[i] === '?') {
    optional = true
    i++
  } else if (segment[i] === '+') {
    repeatable = true
    i++
  } else if (segment[i] === '*') {
    optional = true
    repeatable = true
    i++
  }
  
  return {
    token: {
      type: TokenType.Param,
      value: name,
      regexp: regexp || '[^/]+',
      optional,
      repeatable
    },
    end: i
  }
}

function parseStatic(
  segment: string, 
  start: number
): { token: Token; end: number } {
  let i = start
  let value = ''
  
  while (i < segment.length && segment[i] !== ':' && segment[i] !== '(') {
    value += segment[i]
    i++
  }
  
  return {
    token: {
      type: TokenType.Static,
      value,
      optional: false,
      repeatable: false
    },
    end: i
  }
}

function parseGroup(
  segment: string, 
  start: number
): { token: Token; end: number } {
  const closeIndex = findClosingParen(segment, start)
  const value = segment.slice(start + 1, closeIndex)
  
  return {
    token: {
      type: TokenType.Group,
      value,
      optional: false,
      repeatable: false
    },
    end: closeIndex + 1
  }
}

function findClosingParen(str: string, start: number): number {
  let depth = 1
  let i = start + 1
  
  while (i < str.length && depth > 0) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') depth--
    i++
  }
  
  return i - 1
}
```

tokenizePath 函数把路径分割成段，每段再分解成 token 序列。动态参数可以带正则约束和修饰符，比如 `:id(\\d+)?` 表示一个可选的数字 ID。

## 生成正则表达式

根据 token 生成匹配用的正则：

```typescript
// matcher/pathRegex.ts
import { Token, TokenType, tokenizePath } from './pathTokenizer'

export interface PathKey {
  name: string
  optional: boolean
  repeatable: boolean
}

export interface CompiledPath {
  regex: RegExp
  keys: PathKey[]
  score: number
}

export function tokensToRegex(
  segments: Token[][], 
  options: { strict?: boolean; sensitive?: boolean; end?: boolean } = {}
): CompiledPath {
  const { strict = false, sensitive = false, end = true } = options
  
  const keys: PathKey[] = []
  let pattern = ''
  let score = 0
  
  for (const segment of segments) {
    let segmentPattern = '\\/'
    let segmentScore = 0
    
    for (const token of segment) {
      if (token.type === TokenType.Static) {
        // 静态文本直接匹配
        segmentPattern += escapeRegex(token.value)
        segmentScore += 4 // 静态路径得分最高
        
      } else if (token.type === TokenType.Param) {
        // 动态参数
        keys.push({
          name: token.value,
          optional: token.optional,
          repeatable: token.repeatable
        })
        
        const paramPattern = token.regexp || '[^/]+'
        
        if (token.repeatable) {
          segmentPattern += `((?:${paramPattern})(?:\\/(?:${paramPattern}))*)`
          segmentScore += 1
        } else {
          segmentPattern += `(${paramPattern})`
          segmentScore += 2
        }
        
        if (token.optional) {
          segmentPattern = `(?:${segmentPattern})?`
          segmentScore -= 1
        }
        
      } else if (token.type === TokenType.Group) {
        // 分组
        segmentPattern += `(?:${token.value})`
        segmentScore += 2
      }
    }
    
    pattern += segmentPattern
    score += segmentScore
  }
  
  // 尾部斜杠处理
  if (strict) {
    // 严格模式：精确匹配
  } else {
    pattern += '\\/?'
  }
  
  // 是否匹配到结尾
  if (end) {
    pattern += '$'
  } else {
    pattern += '(?=\\/|$)'
  }
  
  const flags = sensitive ? '' : 'i'
  const regex = new RegExp('^' + pattern, flags)
  
  return { regex, keys, score }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

score 用于在多个路由都能匹配时选择最优的。静态路径得分最高，动态参数次之，可选参数最低。

## 参数解析与路径生成

```typescript
// matcher/pathParser.ts
import { tokenizePath, Token, TokenType } from './pathTokenizer'
import { tokensToRegex, CompiledPath, PathKey } from './pathRegex'

export interface PathParser {
  regex: RegExp
  keys: PathKey[]
  score: number
  parse: (path: string) => Record<string, string | string[]> | null
  stringify: (params: Record<string, string | string[]>) => string
}

export function createPathParser(path: string): PathParser {
  const segments = tokenizePath(path)
  const { regex, keys, score } = tokensToRegex(segments)
  
  // 解析路径
  function parse(path: string): Record<string, string | string[]> | null {
    const match = path.match(regex)
    if (!match) return null
    
    const params: Record<string, string | string[]> = {}
    
    keys.forEach((key, index) => {
      const value = match[index + 1]
      
      if (value !== undefined) {
        if (key.repeatable) {
          // 可重复参数分割成数组
          params[key.name] = value.split('/')
        } else {
          params[key.name] = decodeURIComponent(value)
        }
      }
    })
    
    return params
  }
  
  // 生成路径
  function stringify(params: Record<string, string | string[]>): string {
    let result = ''
    
    for (const segment of segments) {
      result += '/'
      
      for (const token of segment) {
        if (token.type === TokenType.Static) {
          result += token.value
          
        } else if (token.type === TokenType.Param) {
          const value = params[token.value]
          
          if (value === undefined) {
            if (!token.optional) {
              throw new Error(`Missing required param "${token.value}"`)
            }
          } else if (Array.isArray(value)) {
            if (!token.repeatable) {
              throw new Error(`Param "${token.value}" should not be an array`)
            }
            result += value.map(encodeURIComponent).join('/')
          } else {
            result += encodeURIComponent(value)
          }
        }
      }
    }
    
    return result || '/'
  }
  
  return { regex, keys, score, parse, stringify }
}
```

## 路径匹配优先级

当多个路由都能匹配同一个路径时，需要有明确的优先级规则：

```typescript
// matcher/pathRanking.ts

export function comparePathParserScore(a: PathParser, b: PathParser): number {
  // 分数高的优先
  return b.score - a.score
}

// 更细粒度的排序
export function rankPaths(parsers: PathParser[]): PathParser[] {
  return [...parsers].sort((a, b) => {
    // 1. 总分比较
    if (a.score !== b.score) {
      return b.score - a.score
    }
    
    // 2. 静态段数量
    const aStatic = countStaticSegments(a)
    const bStatic = countStaticSegments(b)
    if (aStatic !== bStatic) {
      return bStatic - aStatic
    }
    
    // 3. 参数数量（少的优先）
    return a.keys.length - b.keys.length
  })
}

function countStaticSegments(parser: PathParser): number {
  // 通过正则模式估算静态段数量
  const matches = parser.regex.source.match(/\\\//g)
  return matches ? matches.length : 0
}
```

## 完整的路径解析模块

```typescript
// matcher/index.ts
export { tokenizePath, Token, TokenType } from './pathTokenizer'
export { tokensToRegex, PathKey, CompiledPath } from './pathRegex'
export { createPathParser, PathParser } from './pathParser'

// 便捷函数
export function matchPath(
  pattern: string, 
  path: string
): Record<string, string> | null {
  const parser = createPathParser(pattern)
  return parser.parse(path)
}

export function generatePath(
  pattern: string, 
  params: Record<string, string> = {}
): string {
  const parser = createPathParser(pattern)
  return parser.stringify(params)
}
```

## 使用示例

```typescript
import { createPathParser, matchPath, generatePath } from './matcher'

// 静态路径
const static1 = createPathParser('/users')
static1.parse('/users')  // {}
static1.parse('/posts')  // null

// 动态参数
const dynamic = createPathParser('/users/:id')
dynamic.parse('/users/123')  // { id: '123' }
dynamic.stringify({ id: '456' })  // '/users/456'

// 可选参数
const optional = createPathParser('/users/:id?')
optional.parse('/users')      // {}
optional.parse('/users/123')  // { id: '123' }

// 正则约束
const constrained = createPathParser('/users/:id(\\d+)')
constrained.parse('/users/123')   // { id: '123' }
constrained.parse('/users/abc')   // null

// 可重复参数
const repeatable = createPathParser('/files/:path+')
repeatable.parse('/files/a/b/c')  // { path: ['a', 'b', 'c'] }
repeatable.stringify({ path: ['x', 'y'] })  // '/files/x/y'

// 通配符
const wildcard = createPathParser('/docs/:path*')
wildcard.parse('/docs')           // { path: [] }
wildcard.parse('/docs/a/b/c')     // { path: ['a', 'b', 'c'] }
```

## 本章小结

路径解析的核心流程：

1. **Token 化**：把路径字符串分解成段和 token
2. **正则生成**：根据 token 构建匹配用的正则表达式
3. **参数提取**：从匹配结果中提取命名参数
4. **路径生成**：根据参数和模板反向生成路径
5. **优先级排序**：静态 > 动态 > 可选 > 通配

这套解析机制支持 Vue Router 的所有路径模式。下一章我们实现 createRouter 函数，把所有模块组装起来。
