# 路径参数提取

路由匹配不只是判断路径是否符合模式，还需要从路径中提取参数值。这一章分析参数提取的实现细节。

## 提取流程

参数提取发生在路由解析时：

```typescript
// 用户访问
router.push('/users/123/posts/456')

// 匹配后得到
route.params = { id: '123', postId: '456' }
```

这个过程涉及正则匹配和结果解析。

## parse 函数

每个 PathParser 都有一个 `parse` 函数：

```typescript
function createParser(pattern: string): PathParser {
  const tokens = tokenizePath(pattern)
  const { re, keys } = tokensToParser(tokens)

  function parse(path: string): PathParams | null {
    const match = path.match(re)
    if (!match) return null

    const params: PathParams = {}
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      let value: string | undefined = match[i + 1]

      if (value !== undefined) {
        // URL 解码
        value = decodeURIComponent(value)
        
        if (key.repeatable) {
          // 重复参数拆分为数组
          params[key.name] = value.split('/').map(decodeURIComponent)
        } else {
          params[key.name] = value
        }
      }
    }

    return params
  }

  return { re, keys, parse, /* ... */ }
}
```

关键步骤：

1. 执行正则匹配
2. 遍历 keys，从捕获组提取值
3. URL 解码
4. 处理重复参数

## keys 数组

`keys` 记录了参数的元信息：

```typescript
interface PathParserKey {
  name: string
  repeatable: boolean
  optional: boolean
}
```

它与正则的捕获组一一对应：

```typescript
const path = '/users/:id/posts/:postId?'

// 生成的 keys
keys = [
  { name: 'id', repeatable: false, optional: false },
  { name: 'postId', repeatable: false, optional: true }
]

// 正则
re = /^\/users\/([^/]+)\/posts(?:\/([^/]+))?\/?$/i

// 匹配 '/users/123/posts/456'
match = ['/users/123/posts/456', '123', '456']
//       整体匹配             第1组   第2组

// match[1] 对应 keys[0] → params.id = '123'
// match[2] 对应 keys[1] → params.postId = '456'
```

## URL 解码

路径中的特殊字符会被 URL 编码：

```typescript
// 浏览器 URL
'/users/%E5%BC%A0%E4%B8%89'

// 解码后
params.id = '张三'
```

Vue Router 自动解码参数值：

```typescript
value = decodeURIComponent(value)
```

但路径本身在匹配前不解码，确保正则能正确匹配。

## 重复参数的处理

重复参数（`+` 或 `*`）返回数组：

```typescript
// 路由配置
{ path: '/files/:path+' }

// 访问 '/files/docs/readme/v1'
// 正则匹配得到 'docs/readme/v1'
// 拆分后
params.path = ['docs', 'readme', 'v1']
```

实现：

```typescript
if (key.repeatable) {
  params[key.name] = value.split('/').map(segment => 
    decodeURIComponent(segment)
  )
}
```

每个段单独解码，确保正确处理编码的斜杠。

## 可选参数的处理

可选参数可能不存在：

```typescript
// 路由配置
{ path: '/users/:id?' }

// 访问 '/users'
// match[1] = undefined
params.id = undefined  // 或不存在于 params 对象中
```

在模板中使用时需要处理 undefined：

```vue
<template>
  <div>User: {{ route.params.id || 'None' }}</div>
</template>
```

## 在 resolve 中的使用

Matcher 的 `resolve` 函数使用 `parse` 提取参数：

```typescript
function resolve(
  location: MatcherLocationRaw,
  currentLocation: MatcherLocation
): MatcherLocation {
  let matcher: RouteRecordMatcher | undefined
  let params: PathParams = {}
  let path: string

  if ('path' in location) {
    path = location.path
    
    // 遍历所有匹配器找到匹配的
    for (const m of matchers) {
      if (m.re.test(path)) {
        matcher = m
        // 使用 parse 提取参数
        params = m.parse(path)!
        break
      }
    }
  }

  // ...
  return { name, path, params, matched, meta }
}
```

## stringify：逆向操作

与 `parse` 相反，`stringify` 从参数生成路径：

```typescript
function stringify(params: PathParams): string {
  let path = ''

  for (const segment of segments) {
    for (const token of segment) {
      if (token.type === TokenType.Static) {
        path += '/' + token.value
      } else if (token.type === TokenType.Param) {
        const value = params[token.value]
        
        if (Array.isArray(value)) {
          // 重复参数：用 / 连接
          path += '/' + value.map(encodeURIComponent).join('/')
        } else if (value !== undefined) {
          path += '/' + encodeURIComponent(String(value))
        } else if (!token.optional) {
          throw new Error(`Missing required param "${token.value}"`)
        }
      }
    }
  }

  return path || '/'
}
```

`stringify` 用于命名路由导航：

```typescript
router.push({ name: 'user', params: { id: '123' } })
// 内部调用 stringify({ id: '123' })
// 得到 '/users/123'
```

## 参数验证

自定义正则可以限制参数格式：

```typescript
// 只接受数字
{ path: '/users/:id(\\d+)' }

// 访问 '/users/abc'
// 正则不匹配，返回 null
```

这种验证发生在匹配阶段，不匹配的路径不会被选中。

## 参数类型

所有参数值都是字符串（或字符串数组）：

```typescript
// 即使路径是 /users/123
params.id = '123'  // 字符串，不是数字
```

如果需要其他类型，需要在组件中转换：

```typescript
const userId = computed(() => Number(route.params.id))
```

或使用 props 模式自动转换：

```typescript
{
  path: '/users/:id',
  component: User,
  props: route => ({
    id: Number(route.params.id)
  })
}
```

## 默认值处理

可选参数缺失时，可以在组件中设置默认值：

```typescript
const page = computed(() => route.params.page || '1')
```

或在路由配置中使用 props：

```typescript
{
  path: '/list/:page?',
  props: route => ({
    page: route.params.page || '1'
  })
}
```

## 参数变化检测

当只有参数变化时，组件不会重新创建：

```typescript
// /users/1 → /users/2
// 同一个 User 组件，只是 params.id 变化
```

监听参数变化：

```typescript
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.params.id,
  (newId, oldId) => {
    // 重新获取数据
    fetchUser(newId)
  }
)
```

或使用 `onBeforeRouteUpdate`：

```typescript
import { onBeforeRouteUpdate } from 'vue-router'

onBeforeRouteUpdate((to, from) => {
  if (to.params.id !== from.params.id) {
    fetchUser(to.params.id)
  }
})
```

## 本章小结

路径参数提取是路由匹配的关键部分：

1. **parse 函数**：从正则匹配结果提取参数
2. **keys 数组**：记录参数元信息，与捕获组对应
3. **URL 解码**：自动解码参数值
4. **重复参数**：拆分为数组
5. **stringify**：逆向操作，从参数生成路径

理解参数提取有助于正确使用动态路由，也便于调试参数相关的问题。
