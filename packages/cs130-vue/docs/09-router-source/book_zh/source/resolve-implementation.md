# resolve 路由解析

`resolve` 是路由匹配的核心方法，将用户提供的位置描述转换为完整的路由对象。无论是编程式导航还是 RouterLink，都依赖这个方法。

## API 形式

```typescript
router.resolve(to: RouteLocationRaw, currentLocation?: RouteLocationNormalizedLoaded): RouteLocation & { href: string }
```

接受目标位置和可选的当前位置，返回解析后的路由对象。

## 位置描述的三种形式

用户可以用三种方式描述目标位置：

```typescript
// 1. 路径字符串
router.resolve('/users/123')

// 2. 路径对象
router.resolve({ path: '/users/123', query: { tab: 'posts' } })

// 3. 命名路由
router.resolve({ name: 'user', params: { id: '123' } })
```

`resolve` 需要统一处理这三种形式。

## Router 中的实现

```typescript
function resolve(
  rawLocation: RouteLocationRaw,
  currentLocation?: RouteLocationNormalizedLoaded
): RouteLocation & { href: string } {
  // 使用当前路由作为基准
  currentLocation = currentLocation || currentRoute.value
  
  // 规范化位置描述
  let matcherLocation: MatcherLocationRaw

  if (typeof rawLocation === 'string') {
    // 解析字符串路径
    const locationNormalized = parseURL(parseQuery, rawLocation, currentLocation.path)
    matcherLocation = Object.assign(locationNormalized, {
      path: locationNormalized.path
    })
  } else {
    // 对象形式
    matcherLocation = Object.assign({}, rawLocation)
    
    // 处理 hash
    if (matcherLocation.hash && !matcherLocation.hash.startsWith('#')) {
      matcherLocation.hash = '#' + matcherLocation.hash
    }
  }

  // 调用 matcher 解析
  const matchedRoute = matcher.resolve(matcherLocation, currentLocation)

  // 处理重定向
  const { redirect } = matchedRoute.matched[matchedRoute.matched.length - 1] || {}

  // 构建完整的 href
  const fullPath = stringifyURL(stringifyQuery, {
    ...matchedRoute,
    hash: matchedRoute.hash
  })
  
  const href = routerHistory.createHref(fullPath)

  return Object.assign(matchedRoute, {
    href,
    redirectedFrom: undefined
  })
}
```

## parseURL

解析路径字符串：

```typescript
function parseURL(
  parseQuery: (search: string) => LocationQuery,
  location: string,
  currentLocation: string = '/'
): LocationNormalized {
  let path: string
  let query: LocationQuery = {}
  let hash = ''

  // 分离 hash
  const hashPos = location.indexOf('#')
  if (hashPos > -1) {
    hash = location.slice(hashPos)
    location = location.slice(0, hashPos)
  }

  // 分离 query
  const searchPos = location.indexOf('?')
  if (searchPos > -1) {
    query = parseQuery(location.slice(searchPos + 1))
    location = location.slice(0, searchPos)
  }

  // 处理相对路径
  path = resolveRelativePath(location, currentLocation)

  return { path, query, hash }
}
```

将 `/users/123?tab=posts#section` 分解为：

- `path`: `/users/123`
- `query`: `{ tab: 'posts' }`
- `hash`: `#section`

## Matcher 的 resolve

核心匹配逻辑在 Matcher 中：

```typescript
function resolve(
  location: MatcherLocationRaw,
  currentLocation: MatcherLocation
): MatcherLocation {
  let matcher: RouteRecordMatcher | undefined
  let params: PathParams = {}
  let path: string
  let name: RouteRecordName | null | undefined

  if ('name' in location && location.name) {
    // 命名路由：从索引查找
    matcher = matcherMap.get(location.name)
    
    if (!matcher) {
      throw createRouterError(ErrorTypes.MATCHER_NOT_FOUND, {
        location
      })
    }

    name = matcher.record.name
    
    // 合并参数：当前路由的参数 + 新提供的参数
    params = Object.assign(
      pickParams(currentLocation.params, matcher.keys.map(k => k.name)),
      location.params
    )
    
    // 使用 stringify 生成路径
    path = matcher.stringify(params)
    
  } else if ('path' in location) {
    // 路径路由：遍历匹配
    path = location.path
    
    matcher = matchers.find(m => m.re.test(path))
    
    if (matcher) {
      params = matcher.parse(path)!
      name = matcher.record.name
    }
    
  } else {
    // 相对导航：基于当前路由
    matcher = currentLocation.name
      ? matcherMap.get(currentLocation.name)
      : matchers.find(m => m.re.test(currentLocation.path))

    if (!matcher) {
      throw createRouterError(ErrorTypes.MATCHER_NOT_FOUND, {
        location,
        currentLocation
      })
    }

    name = matcher.record.name
    params = Object.assign({}, currentLocation.params, location.params)
    path = matcher.stringify(params)
  }

  // 构建匹配链
  const matched: RouteRecordNormalized[] = []
  let parentMatcher: RouteRecordMatcher | undefined = matcher
  
  while (parentMatcher) {
    // 父路由在前面
    matched.unshift(parentMatcher.record)
    parentMatcher = parentMatcher.parent
  }

  return {
    name,
    path,
    params,
    matched,
    meta: mergeMetaFields(matched)
  }
}
```

## 三种解析模式

**命名路由**：

```typescript
router.resolve({ name: 'user', params: { id: '123' } })

// 流程：
// 1. matcherMap.get('user') 获取匹配器
// 2. matcher.stringify({ id: '123' }) 生成路径 '/users/123'
// 3. 构建 matched 数组
```

**路径路由**：

```typescript
router.resolve({ path: '/users/123' })

// 流程：
// 1. 遍历 matchers，找到 re.test('/users/123') 为 true 的
// 2. matcher.parse('/users/123') 提取参数 { id: '123' }
// 3. 构建 matched 数组
```

**相对导航**：

```typescript
// 当前在 /users/123
router.resolve({ params: { id: '456' } })

// 流程：
// 1. 使用当前路由的匹配器
// 2. 合并参数 { id: '456' }
// 3. stringify 生成新路径 '/users/456'
```

## matched 数组

`matched` 包含从根到当前的所有匹配记录：

```typescript
// 嵌套路由配置
{
  path: '/admin',
  component: AdminLayout,
  children: [
    { path: 'users', component: AdminUsers }
  ]
}

// resolve('/admin/users')
matched = [
  { path: '/admin', component: AdminLayout },
  { path: '/admin/users', component: AdminUsers }
]
```

RouterView 使用这个数组渲染嵌套组件。

## meta 合并

```typescript
function mergeMetaFields(matched: RouteRecordNormalized[]): RouteMeta {
  return matched.reduce((meta, record) => {
    return Object.assign(meta, record.meta)
  }, {} as RouteMeta)
}
```

子路由的 meta 会覆盖父路由的同名字段：

```typescript
// 父路由 meta: { requiresAuth: true, layout: 'admin' }
// 子路由 meta: { layout: 'full' }
// 合并后: { requiresAuth: true, layout: 'full' }
```

## href 生成

```typescript
const fullPath = stringifyURL(stringifyQuery, {
  path,
  query: location.query,
  hash: location.hash
})

const href = routerHistory.createHref(fullPath)
```

`href` 是完整的 URL，用于 RouterLink 的 `href` 属性：

```typescript
// Web History
resolve('/users/123') → { href: '/users/123' }

// Hash History  
resolve('/users/123') → { href: '#/users/123' }
```

## 错误处理

找不到匹配时抛出错误：

```typescript
if (!matcher) {
  throw createRouterError(
    ErrorTypes.MATCHER_NOT_FOUND,
    { location }
  )
}
```

在 `push`/`replace` 中，这个错误会被捕获并转换为导航失败。

## RouterLink 中的使用

RouterLink 使用 resolve 获取目标信息：

```typescript
// RouterLink 内部
const route = computed(() => router.resolve(props.to))

// 渲染
h('a', {
  href: route.value.href,
  onClick: () => router.push(route.value)
})
```

## 本章小结

`resolve` 是路由匹配的核心：

1. **统一处理**：路径字符串、路径对象、命名路由三种形式
2. **命名路由**：从索引查找，stringify 生成路径
3. **路径路由**：遍历匹配器，parse 提取参数
4. **相对导航**：基于当前路由合并参数
5. **构建结果**：matched 数组、合并 meta、生成 href

理解 resolve 有助于调试路由匹配问题，也能更好地使用命名路由和相对导航。
