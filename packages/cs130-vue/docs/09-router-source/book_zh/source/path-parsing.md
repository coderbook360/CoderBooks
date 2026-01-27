# 路径解析与规范化

路径解析是将用户定义的路由路径（如 `/users/:id`）转换为可执行的匹配逻辑。这个过程涉及分词、解析、生成正则表达式等步骤。

## 解析流程概览

路径解析分为三个阶段：

1. **分词（Tokenize）**：将路径字符串拆分为 token 序列
2. **解析（Parse）**：将 token 序列转换为解析器结构
3. **编译（Compile）**：生成正则表达式和辅助函数

```
'/users/:id/posts'
    ↓ tokenize
[{type: 'Static', value: 'users'}, {type: 'Param', value: 'id'}, {type: 'Static', value: 'posts'}]
    ↓ parse
{ segments: [...], keys: ['id'], ... }
    ↓ compile
{ re: /^\/users\/([^/]+)\/posts\/?$/, parse: fn, stringify: fn }
```

## tokenizePath

分词是第一步，将路径字符串转换为 token 数组：

```typescript
function tokenizePath(path: string): Array<Token[]> {
  if (!path) return [[]]
  if (path === '/') return [[{ type: TokenType.Static, value: '' }]]

  // 确保以 / 开头
  if (!path.startsWith('/')) {
    throw new Error(`Invalid path "${path}"`)
  }

  const segments: Array<Token[]> = []
  let segment: Token[] = []

  let i = 1  // 跳过开头的 /
  let char: string
  let buffer: string = ''
  let state: TokenizerState = TokenizerState.Static

  function consumeBuffer() {
    if (buffer) {
      segment.push({ type: TokenType.Static, value: buffer })
      buffer = ''
    }
  }

  while (i < path.length) {
    char = path[i]

    switch (state) {
      case TokenizerState.Static:
        if (char === '/') {
          consumeBuffer()
          segments.push(segment)
          segment = []
        } else if (char === ':') {
          consumeBuffer()
          state = TokenizerState.Param
        } else if (char === '(') {
          consumeBuffer()
          state = TokenizerState.Regexp
        } else {
          buffer += char
        }
        break

      case TokenizerState.Param:
        if (char === '/') {
          segment.push({ type: TokenType.Param, value: buffer })
          buffer = ''
          segments.push(segment)
          segment = []
          state = TokenizerState.Static
        } else if (char === '(') {
          segment.push({ 
            type: TokenType.Param, 
            value: buffer, 
            regexp: '' 
          })
          buffer = ''
          state = TokenizerState.ParamRegexp
        } else {
          buffer += char
        }
        break

      // ... 其他状态
    }
    i++
  }

  // 处理剩余的 buffer
  consumeBuffer()
  if (segment.length) segments.push(segment)

  return segments
}
```

分词器是一个状态机，处理几种模式：

- **Static**：普通静态文本
- **Param**：`:id` 形式的参数
- **Regexp**：`(\\d+)` 形式的正则约束

## Token 类型

```typescript
enum TokenType {
  Static = 'Static',
  Param = 'Param',
  Group = 'Group'
}

interface Token {
  type: TokenType
  value: string
  regexp?: string
  optional?: boolean
  repeatable?: boolean
}
```

不同的路径模式产生不同的 token：

```typescript
'/users'        → [{ type: 'Static', value: 'users' }]
'/users/:id'    → [{ type: 'Static', value: 'users' }], [{ type: 'Param', value: 'id' }]
'/files/:path+' → [...], [{ type: 'Param', value: 'path', repeatable: true }]
'/docs/:page?'  → [...], [{ type: 'Param', value: 'page', optional: true }]
```

## tokensToParser

将 token 序列转换为解析器：

```typescript
function tokensToParser(
  segments: Array<Token[]>,
  extraOptions?: PathParserOptions
): PathParser {
  const options = Object.assign({}, DEFAULT_OPTIONS, extraOptions)
  
  let pattern = '^'
  const keys: PathParserKey[] = []

  for (const segment of segments) {
    let segmentPattern = ''

    for (const token of segment) {
      if (token.type === TokenType.Static) {
        // 静态部分：直接转义
        segmentPattern += escapeRegExp(token.value)
      } else if (token.type === TokenType.Param) {
        // 参数部分：生成捕获组
        keys.push({
          name: token.value,
          repeatable: !!token.repeatable,
          optional: !!token.optional
        })

        const regexp = token.regexp || '[^/]+'
        
        if (token.repeatable) {
          segmentPattern += `((?:${regexp})(?:/(?:${regexp}))*)`
        } else {
          segmentPattern += `(${regexp})`
        }

        if (token.optional) {
          segmentPattern = `(?:/${segmentPattern})?`
        } else {
          segmentPattern = `/${segmentPattern}`
        }
      }
    }

    pattern += segmentPattern
  }

  // 处理结尾
  if (options.end) {
    pattern += '/?$'
  } else {
    pattern += '(?:/|$)'
  }

  // 创建正则
  const re = new RegExp(pattern, options.sensitive ? '' : 'i')

  // parse 函数：从路径提取参数
  function parse(path: string): PathParams | null {
    const match = path.match(re)
    if (!match) return null

    const params: PathParams = {}
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const value = match[i + 1]
      
      if (value) {
        params[key.name] = key.repeatable 
          ? value.split('/') 
          : value
      }
    }
    return params
  }

  // stringify 函数：从参数生成路径
  function stringify(params: PathParams): string {
    let path = ''
    for (const segment of segments) {
      for (const token of segment) {
        if (token.type === TokenType.Static) {
          path += '/' + token.value
        } else {
          const value = params[token.value]
          if (Array.isArray(value)) {
            path += '/' + value.join('/')
          } else if (value) {
            path += '/' + value
          }
        }
      }
    }
    return path || '/'
  }

  return {
    re,
    keys,
    parse,
    stringify,
    score: calculateScore(segments)
  }
}
```

## 路径匹配示例

让我们跟踪一个具体路径的解析过程：

```typescript
// 输入
const path = '/users/:id/posts/:postId?'

// 分词结果
const tokens = [
  [{ type: 'Static', value: 'users' }],
  [{ type: 'Param', value: 'id' }],
  [{ type: 'Static', value: 'posts' }],
  [{ type: 'Param', value: 'postId', optional: true }]
]

// 生成的正则
const re = /^\/users\/([^/]+)\/posts(?:\/([^/]+))?$/i

// parse 示例
parse('/users/123/posts/456')  // { id: '123', postId: '456' }
parse('/users/123/posts')      // { id: '123' }

// stringify 示例
stringify({ id: '123', postId: '456' })  // '/users/123/posts/456'
stringify({ id: '123' })                  // '/users/123/posts'
```

## 优先级计算

不同的路径模式有不同的匹配优先级：

```typescript
function calculateScore(segments: Token[][]): number[] {
  const score: number[] = []

  for (const segment of segments) {
    let segmentScore = PathScore.Base

    for (const token of segment) {
      if (token.type === TokenType.Static) {
        segmentScore += PathScore.Static
      } else if (token.type === TokenType.Param) {
        segmentScore += PathScore.Dynamic
        if (token.regexp) {
          segmentScore += PathScore.BonusCustomRegexp
        }
      }
      
      if (token.optional) {
        segmentScore += PathScore.BonusOptional
      }
      if (token.repeatable) {
        segmentScore += PathScore.BonusRepeatable
      }
    }

    score.push(segmentScore)
  }

  return score
}

const PathScore = {
  Base: 0,
  Static: 4,          // 静态段得分最高
  Dynamic: 2,         // 动态段次之
  BonusCustomRegexp: 0.5,
  BonusOptional: -0.5,
  BonusRepeatable: -1
}
```

优先级规则：

1. 静态路径 > 动态路径 > 通配符
2. 更长的路径 > 更短的路径
3. 有正则约束的参数 > 无约束的参数
4. 必需参数 > 可选参数

## 特殊路径模式

**重复参数**：

```typescript
// /:path+ 匹配一个或多个段
'/files/:path+'
// 匹配 /files/a, /files/a/b, /files/a/b/c
// params: { path: ['a', 'b', 'c'] }

// /:path* 匹配零个或多个段
'/files/:path*'
// 也匹配 /files
// params: { path: [] }
```

**自定义正则**：

```typescript
// :id 限制为数字
'/users/:id(\\d+)'
// 只匹配 /users/123，不匹配 /users/abc

// 多选
'/lang/:lang(en|zh|ja)'
// 只匹配 /lang/en, /lang/zh, /lang/ja
```

**敏感和严格模式**：

```typescript
// sensitive: true - 大小写敏感
'/Users' 不匹配 '/users'

// strict: true - 尾部斜杠敏感
'/users' 不匹配 '/users/'
```

## 路径规范化

在匹配之前，路径会被规范化：

```typescript
function normalizeRouteRecord(record: RouteRecordRaw): RouteRecordRaw {
  let { path } = record

  // 移除尾部斜杠（除非是根路径）
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1)
  }

  // 确保以 / 开头
  if (path && path[0] !== '/') {
    path = '/' + path
  }

  return { ...record, path }
}
```

## 本章小结

路径解析是 Vue Router 匹配系统的基础：

1. **分词**：状态机将路径拆分为 token
2. **解析**：token 转换为正则表达式和辅助函数
3. **优先级**：静态 > 动态 > 通配符
4. **规范化**：统一路径格式

这个编译过程在路由器创建时执行一次，运行时只需要执行正则匹配，保证了高效的路由匹配性能。
