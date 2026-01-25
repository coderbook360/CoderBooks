# createRouterMatcher 匹配器创建

`createRouterMatcher` 创建路由匹配器，负责将 URL 路径转换为匹配的路由记录。它是 Vue Router 的核心算法模块。

## 函数签名

```typescript
function createRouterMatcher(
  routes: Readonly<RouteRecordRaw[]>,
  globalOptions: PathParserOptions
): RouterMatcher
```

接收初始路由配置和全局选项，返回匹配器对象。

## RouterMatcher 接口

```typescript
interface RouterMatcher {
  addRoute: (record: RouteRecordRaw, parent?: RouteRecordMatcher) => () => void
  removeRoute: (matcher: RouteRecordMatcher) => void
  getRoutes: () => RouteRecordMatcher[]
  getRecordMatcher: (name: RouteRecordName) => RouteRecordMatcher | undefined
  resolve: (location: MatcherLocationRaw, currentLocation: MatcherLocation) => MatcherLocation
}
```

提供增删查改和解析能力。

## 内部数据结构

```typescript
function createRouterMatcher(routes, globalOptions) {
  // 所有匹配器列表，按优先级排序
  const matchers: RouteRecordMatcher[] = []
  
  // 命名路由的索引
  const matcherMap = new Map<RouteRecordName, RouteRecordMatcher>()

  // 合并默认选项
  globalOptions = mergeOptions(
    { strict: false, end: true, sensitive: false },
    globalOptions
  )

  // 添加初始路由
  routes.forEach(route => addRoute(route))

  // ...
}
```

`matchers` 数组存储所有路由匹配器，保持按优先级排序。`matcherMap` 是命名路由的快速查找表。

## addRoute 方法

添加路由是最复杂的操作：

```typescript
function addRoute(
  record: RouteRecordRaw,
  parent?: RouteRecordMatcher,
  originalRecord?: RouteRecordMatcher
): () => void {
  // 规范化路由记录
  const mainNormalizedRecord = normalizeRouteRecord(record)
  
  // 处理别名
  const normalizedRecords: NormalizedRouteRecord[] = [mainNormalizedRecord]
  if ('alias' in record) {
    const aliases = typeof record.alias === 'string' 
      ? [record.alias] 
      : record.alias!
    
    for (const alias of aliases) {
      normalizedRecords.push(
        Object.assign({}, mainNormalizedRecord, {
          path: alias,
          aliasOf: mainNormalizedRecord
        })
      )
    }
  }

  // 为每个规范化记录创建匹配器
  for (const normalizedRecord of normalizedRecords) {
    // 处理路径
    const { path } = normalizedRecord
    
    // 子路由的路径需要拼接父路径
    if (parent && path[0] !== '/') {
      normalizedRecord.path = parent.record.path + 
        (path && '/' + path)
    }

    // 创建匹配器
    const matcher = createRouteRecordMatcher(normalizedRecord, parent, globalOptions)

    // 处理子路由
    if ('children' in record) {
      const children = record.children!
      for (let i = 0; i < children.length; i++) {
        addRoute(children[i], matcher, originalRecord || matcher)
      }
    }

    // 插入到正确位置（按优先级）
    insertMatcher(matcher)
  }

  // 返回移除函数
  return () => {
    removeRoute(matcher)
  }
}
```

关键步骤：

1. **规范化**：将用户的路由配置转换为标准格式
2. **别名处理**：为每个别名创建独立的匹配器
3. **路径拼接**：子路由继承父路由的路径
4. **创建匹配器**：调用 `createRouteRecordMatcher`
5. **递归处理子路由**
6. **排序插入**

## normalizeRouteRecord

将用户配置转换为内部格式：

```typescript
function normalizeRouteRecord(record: RouteRecordRaw): NormalizedRouteRecord {
  return {
    path: record.path,
    redirect: record.redirect,
    name: record.name,
    meta: record.meta || {},
    aliasOf: undefined,
    beforeEnter: record.beforeEnter,
    props: normalizeRecordProps(record),
    children: record.children || [],
    instances: {},
    leaveGuards: new Set(),
    updateGuards: new Set(),
    enterCallbacks: {},
    components: 'components' in record
      ? record.components || {}
      : { default: record.component }
  }
}
```

注意 `component` 被转换为 `components: { default: ... }`，统一处理命名视图。

## createRouteRecordMatcher

为单个路由创建匹配器：

```typescript
function createRouteRecordMatcher(
  record: NormalizedRouteRecord,
  parent: RouteRecordMatcher | undefined,
  options: PathParserOptions
): RouteRecordMatcher {
  // 解析路径，生成正则
  const parser = tokensToParser(
    tokenizePath(record.path),
    options
  )

  const matcher: RouteRecordMatcher = {
    ...parser,
    record,
    parent,
    children: [],
    alias: []
  }

  if (parent) {
    parent.children.push(matcher)
  }

  return matcher
}
```

`tokenizePath` 将路径字符串分词，`tokensToParser` 将 token 转换为正则表达式和解析器。

## insertMatcher

按优先级插入匹配器：

```typescript
function insertMatcher(matcher: RouteRecordMatcher) {
  let i = 0
  
  while (
    i < matchers.length &&
    comparePathParserScore(matcher, matchers[i]) >= 0
  ) {
    i++
  }
  
  matchers.splice(i, 0, matcher)

  // 如果有名字，添加到索引
  if (matcher.record.name) {
    matcherMap.set(matcher.record.name, matcher)
  }
}
```

使用二分查找的思想，找到正确的插入位置。`comparePathParserScore` 比较两个匹配器的优先级。

## 优先级规则

匹配器的优先级由 score 数组决定：

```typescript
// 静态段 > 动态段 > 通配符
// /users/create 的优先级高于 /users/:id
// /users/:id 的优先级高于 /users/*

function comparePathParserScore(a, b) {
  const aScore = a.score
  const bScore = b.score

  // 逐段比较
  let i = 0
  while (i < aScore.length && i < bScore.length) {
    const diff = bScore[i] - aScore[i]
    if (diff) return diff
    i++
  }

  // 更长的优先级更低
  return bScore.length - aScore.length
}
```

分数越高，优先级越高。静态路径段分数最高，通配符最低。

## resolve 方法

解析目标位置：

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
    // 命名路由
    matcher = matcherMap.get(location.name)
    
    if (!matcher) {
      throw createRouterError(ErrorTypes.MATCHER_NOT_FOUND, { location })
    }

    name = matcher.record.name
    params = Object.assign(
      extractComponentsGuards(currentLocation.params),
      location.params
    )
    path = matcher.stringify(params)
    
  } else if ('path' in location) {
    // 路径路由
    path = location.path
    matcher = matchers.find(m => m.re.test(path))
    
    if (matcher) {
      params = matcher.parse(path)!
      name = matcher.record.name
    }
    
  } else {
    // 相对导航
    matcher = currentLocation.name
      ? matcherMap.get(currentLocation.name)
      : matchers.find(m => m.re.test(currentLocation.path))

    // ...
  }

  // 构建匹配链
  const matched: MatcherLocation['matched'] = []
  let parentMatcher: RouteRecordMatcher | undefined = matcher
  while (parentMatcher) {
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

resolve 处理三种情况：

1. **命名路由**：从 `matcherMap` 查找，使用 `stringify` 生成路径
2. **路径路由**：遍历 `matchers`，使用正则匹配
3. **相对导航**：基于当前位置解析

## removeRoute

移除路由：

```typescript
function removeRoute(matcherRef: RouteRecordMatcher) {
  const index = matchers.indexOf(matcherRef)
  if (index > -1) {
    matchers.splice(index, 1)
  }
  
  if (matcherRef.record.name) {
    matcherMap.delete(matcherRef.record.name)
  }
  
  // 递归移除子路由
  matcherRef.children.forEach(removeRoute)
  
  // 移除别名
  matcherRef.alias.forEach(removeRoute)
}
```

移除时需要同时移除子路由和别名，保持数据一致。

## getRoutes 和 getRecordMatcher

```typescript
function getRoutes() {
  return matchers
}

function getRecordMatcher(name: RouteRecordName) {
  return matcherMap.get(name)
}
```

简单的查询方法。

## 本章小结

`createRouterMatcher` 是 Vue Router 的路由匹配核心：

1. **数据结构**：`matchers` 数组按优先级排序，`matcherMap` 提供命名查找
2. **addRoute**：规范化配置、处理别名、递归处理子路由、排序插入
3. **resolve**：支持命名路由、路径路由、相对导航三种模式
4. **优先级**：静态路径优先于动态路径，具体路径优先于通配符

匹配器将路由配置编译为可执行的正则表达式和解析器，在运行时快速匹配 URL。这种编译+执行的模式是性能优化的关键。
