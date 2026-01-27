# 路由正则生成

路由匹配的核心是将路径模式编译成正则表达式。这一章深入分析正则生成的细节，理解不同路径模式如何转换为对应的正则。

## 正则生成入口

正则生成发生在 `tokensToParser` 函数中：

```typescript
function tokensToParser(
  segments: Array<Token[]>,
  extraOptions?: PathParserOptions
): PathParser {
  const options = Object.assign(
    {},
    { strict: false, end: true, sensitive: false },
    extraOptions
  )

  let pattern = '^'
  const keys: PathParserKey[] = []

  for (const segment of segments) {
    pattern += buildSegmentPattern(segment, keys, options)
  }

  // 结尾处理
  if (options.strict) {
    pattern += '$'
  } else if (options.end) {
    pattern += '/?$'
  } else {
    pattern += '(?:/|$)'
  }

  const re = new RegExp(pattern, options.sensitive ? '' : 'i')

  return { re, keys, /* ... */ }
}
```

每个路径段被转换为正则片段，最后拼接成完整的正则表达式。

## 静态段的处理

静态段需要转义特殊字符：

```typescript
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildStaticPattern(value: string): string {
  return '/' + escapeRegExp(value)
}
```

示例：

```typescript
'/users'        → '/users'
'/user.info'    → '/user\\.info'
'/api/v1'       → '/api' + '/v1' → '/api/v1'
'/path[0]'      → '/path\\[0\\]'
```

转义确保特殊字符被当作字面量匹配，而不是正则语法。

## 参数段的处理

参数段生成捕获组：

```typescript
function buildParamPattern(token: Token, keys: PathParserKey[]): string {
  // 记录参数名
  keys.push({
    name: token.value,
    repeatable: !!token.repeatable,
    optional: !!token.optional
  })

  // 默认匹配除斜杠外的所有字符
  const regexp = token.regexp || '[^/]+'

  let pattern: string

  if (token.repeatable) {
    // 重复参数：匹配多段
    pattern = `((?:${regexp})(?:/(?:${regexp}))*)`
  } else {
    // 普通参数：匹配单段
    pattern = `(${regexp})`
  }

  if (token.optional) {
    // 可选参数：整个段可以不存在
    if (token.repeatable) {
      pattern = `(?:/${pattern})?`
    } else {
      pattern = `(?:/${pattern})?`
    }
  } else {
    pattern = '/' + pattern
  }

  return pattern
}
```

## 常见模式的正则

让我们看几个典型路径的正则生成：

**简单参数**：

```typescript
'/users/:id'
→ '/users/([^/]+)'
→ /^\/users\/([^/]+)\/?$/i

// 匹配
'/users/123'        ✓ params: { id: '123' }
'/users/abc'        ✓ params: { id: 'abc' }
'/users/'           ✗
'/users/123/extra'  ✗
```

**可选参数**：

```typescript
'/users/:id?'
→ '/users' + '(?:/([^/]+))?'
→ /^\/users(?:\/([^/]+))?\/?$/i

// 匹配
'/users'      ✓ params: { id: undefined }
'/users/123'  ✓ params: { id: '123' }
```

**重复参数**：

```typescript
'/files/:path+'
→ '/files/' + '((?:[^/]+)(?:/(?:[^/]+))*)'
→ /^\/files\/((?:[^/]+)(?:\/(?:[^/]+))*)\/?$/i

// 匹配
'/files/a'        ✓ params: { path: ['a'] }
'/files/a/b/c'    ✓ params: { path: ['a', 'b', 'c'] }
'/files'          ✗  (+ 要求至少一个)
```

**可选重复参数**：

```typescript
'/files/:path*'
→ '/files' + '(?:/((?:[^/]+)(?:/(?:[^/]+))*))?'
→ /^\/files(?:\/((?:[^/]+)(?:\/(?:[^/]+))*))?\/?$/i

// 匹配
'/files'          ✓ params: { path: [] }
'/files/a'        ✓ params: { path: ['a'] }
'/files/a/b/c'    ✓ params: { path: ['a', 'b', 'c'] }
```

**自定义正则约束**：

```typescript
'/users/:id(\\d+)'
→ '/users/([\\d]+)'
→ /^\/users\/([\d]+)\/?$/i

// 匹配
'/users/123'  ✓
'/users/abc'  ✗  (不符合 \d+ 约束)
```

## 结尾模式

`end` 和 `strict` 选项影响正则的结尾：

```typescript
// end: true, strict: false（默认）
pattern += '/?$'
// /users 匹配 /users 和 /users/

// end: true, strict: true
pattern += '$'
// /users 只匹配 /users

// end: false
pattern += '(?:/|$)'
// /users 匹配 /users、/users/、/users/anything
```

`end: false` 用于嵌套路由的父路由，允许子路径继续匹配。

## 大小写敏感

```typescript
const re = new RegExp(pattern, options.sensitive ? '' : 'i')
```

默认使用 `i` 标志，大小写不敏感：

```typescript
// sensitive: false（默认）
'/users' 匹配 '/Users'、'/USERS'

// sensitive: true
'/users' 只匹配 '/users'
```

## 复合路径段

一个段可以包含多个部分：

```typescript
'/files/:name.:ext'
// 分词
[{ type: 'Param', value: 'name' }, { type: 'Static', value: '.' }, { type: 'Param', value: 'ext' }]
// 正则
→ '/([^/]+)\\.([^/]+)'
→ /^\/files\/([^/]+)\.([^/]+)\/?$/i

// 匹配
'/files/readme.txt'  ✓ params: { name: 'readme', ext: 'txt' }
'/files/archive.tar.gz'  ✓ params: { name: 'archive.tar', ext: 'gz' }
```

这里 `:name` 的默认正则 `[^/]+` 会贪婪匹配，可能不是期望的行为。如果需要精确控制，使用自定义正则：

```typescript
'/files/:name([^.]+).:ext'
// 只匹配到第一个点
'/files/archive.tar.gz'  ✓ params: { name: 'archive', ext: 'tar.gz' }
```

## 捕获组和参数提取

正则的捕获组与 `keys` 数组一一对应：

```typescript
const path = '/users/:id/posts/:postId'
const parser = tokensToParser(tokenizePath(path))

// parser.keys = [
//   { name: 'id', repeatable: false, optional: false },
//   { name: 'postId', repeatable: false, optional: false }
// ]

const match = '/users/123/posts/456'.match(parser.re)
// match[1] = '123' → id
// match[2] = '456' → postId
```

`parse` 函数使用这个映射提取参数：

```typescript
function parse(path: string): PathParams | null {
  const match = path.match(re)
  if (!match) return null

  const params: PathParams = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = match[i + 1]  // 捕获组从 1 开始
    
    if (value !== undefined) {
      params[key.name] = key.repeatable 
        ? value.split('/') 
        : value
    }
  }
  return params
}
```

## 性能考虑

正则编译在创建路由器时执行一次，运行时只执行匹配：

```typescript
// 创建时（一次）
const parser = tokensToParser(tokenizePath('/users/:id'))

// 运行时（多次）
parser.re.test('/users/123')  // 快速
```

正则引擎针对简单模式有优化，Vue Router 生成的正则通常不复杂，匹配性能很好。

避免过于复杂的自定义正则，它们可能导致性能问题：

```typescript
// 简单，性能好
'/users/:id(\\d+)'

// 复杂，可能有性能问题
'/users/:id((\\d+|[a-z]+){3,10})'
```

## 本章小结

路由正则生成将路径模式转换为高效的匹配逻辑：

1. **静态段**：转义特殊字符，字面匹配
2. **参数段**：生成捕获组，默认匹配 `[^/]+`
3. **可选参数**：整个段包裹在 `(?:...)?` 中
4. **重复参数**：使用非捕获组处理多段
5. **自定义正则**：直接使用用户指定的模式

正则编译是一次性开销，运行时匹配高效。理解这个过程有助于编写正确的路由模式，也便于调试匹配问题。
