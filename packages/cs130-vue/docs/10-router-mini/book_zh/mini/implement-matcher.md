# 实现路由匹配器

路由匹配器是连接 URL 和组件的桥梁。它负责解析路由配置、匹配路径、提取参数。

## 匹配器的职责

匹配器需要完成几个核心任务：存储和管理路由记录，根据 URL 路径找到匹配的路由，从路径中提取动态参数，根据路由名称和参数生成 URL。这些功能组合起来，构成了路由系统的核心数据层。

## 路径转正则表达式

动态路由需要把路径模式转换成正则表达式。比如 `/users/:id` 要能匹配 `/users/123` 并提取出 `id=123`：

```typescript
// matcher/pathParser.ts

export interface PathKey {
  name: string
  pattern: string
}

export interface PathMatcher {
  regex: RegExp
  keys: PathKey[]
  parse: (path: string) => Record<string, string> | null
  stringify: (params: Record<string, string>) => string
}

export function pathToRegex(path: string): PathMatcher {
  const keys: PathKey[] = []
  let pattern = ''
  
  // 分割路径段
  const segments = path.split('/').filter(Boolean)
  
  for (const segment of segments) {
    pattern += '\\/'
    
    if (segment.startsWith(':')) {
      // 动态参数 :id 或 :id(\\d+)
      const match = segment.match(/^:([^(]+)(?:\((.+)\))?$/)
      if (match) {
        const [, name, customPattern] = match
        keys.push({
          name,
          pattern: customPattern || '[^/]+'
        })
        pattern += `(${customPattern || '[^/]+'})`
      }
    } else if (segment === '*') {
      // 通配符
      keys.push({ name: 'pathMatch', pattern: '.*' })
      pattern += '(.*)'
    } else {
      // 静态段
      pattern += escapeRegex(segment)
    }
  }
  
  // 可选的尾部斜杠
  pattern += '\\/?'
  
  const regex = new RegExp(`^${pattern}$`, 'i')
  
  // 解析路径
  function parse(path: string): Record<string, string> | null {
    const match = path.match(regex)
    if (!match) return null
    
    const params: Record<string, string> = {}
    keys.forEach((key, i) => {
      params[key.name] = match[i + 1]
    })
    
    return params
  }
  
  // 生成路径
  function stringify(params: Record<string, string>): string {
    let result = path
    
    for (const key of keys) {
      const value = params[key.name]
      if (value == null) {
        throw new Error(`Missing param "${key.name}"`)
      }
      result = result.replace(`:${key.name}`, value)
    }
    
    return result
  }
  
  return { regex, keys, parse, stringify }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

pathToRegex 函数遍历路径的每个段，识别出动态参数和静态部分，构建出对应的正则表达式。parse 方法用正则匹配路径并提取参数，stringify 方法则是反向操作，把参数填入模板生成路径。

## 路由记录管理

```typescript
// matcher/index.ts
import type { 
  RouteRecordRaw, 
  RouteRecord, 
  RouteLocation, 
  RouteLocationRaw,
  RouterMatcher 
} from '../types'
import { pathToRegex, PathMatcher } from './pathParser'

interface RouteRecordMatcher {
  record: RouteRecord
  pathMatcher: PathMatcher
  parent?: RouteRecordMatcher
  children: RouteRecordMatcher[]
}

export function createRouterMatcher(
  routes: RouteRecordRaw[]
): RouterMatcher {
  // 路由记录存储
  const matchers: RouteRecordMatcher[] = []
  const matcherMap = new Map<string, RouteRecordMatcher>()
  
  // 添加路由
  function addRoute(
    route: RouteRecordRaw,
    parent?: RouteRecordMatcher
  ): () => void {
    // 规范化路由记录
    const normalizedRecord = normalizeRouteRecord(route, parent?.record)
    
    // 创建路径匹配器
    const pathMatcher = pathToRegex(normalizedRecord.path)
    
    const matcher: RouteRecordMatcher = {
      record: normalizedRecord,
      pathMatcher,
      parent,
      children: []
    }
    
    // 添加到父级
    if (parent) {
      parent.children.push(matcher)
    }
    
    // 存储
    matchers.push(matcher)
    if (normalizedRecord.name) {
      matcherMap.set(normalizedRecord.name as string, matcher)
    }
    
    // 递归添加子路由
    if (route.children) {
      route.children.forEach(child => addRoute(child, matcher))
    }
    
    // 返回移除函数
    return () => removeRoute(matcher)
  }
  
  function removeRoute(matcher: RouteRecordMatcher) {
    const index = matchers.indexOf(matcher)
    if (index > -1) {
      matchers.splice(index, 1)
    }
    if (matcher.record.name) {
      matcherMap.delete(matcher.record.name as string)
    }
    // 移除子路由
    matcher.children.forEach(removeRoute)
  }
  
  // 初始化路由
  routes.forEach(route => addRoute(route))
  
  return {
    addRoute: (route, parent) => {
      const parentMatcher = parent 
        ? matcherMap.get(parent as string)
        : undefined
      return addRoute(route, parentMatcher)
    },
    removeRoute: (name) => {
      const matcher = matcherMap.get(name)
      if (matcher) removeRoute(matcher)
    },
    getRoutes: () => matchers.map(m => m.record),
    getRecordMatcher: (name) => matcherMap.get(name)?.record,
    resolve: (location, currentLocation) => 
      resolve(location, currentLocation, matchers, matcherMap)
  }
}
```

createRouterMatcher 维护了两个数据结构：matchers 数组用于遍历匹配，matcherMap 用于按名称快速查找。每个路由记录都关联了一个 PathMatcher 用于路径匹配。

## 规范化路由记录

用户配置的路由需要转换成内部格式：

```typescript
function normalizeRouteRecord(
  route: RouteRecordRaw,
  parent?: RouteRecord
): RouteRecord {
  // 处理路径
  let path = route.path
  if (!path.startsWith('/') && parent) {
    // 子路由路径是相对的
    path = parent.path + '/' + path
  }
  path = path.replace(/\/+/g, '/') // 移除多余斜杠
  
  // 规范化 components
  const components: Record<string, any> = route.components || {}
  if (route.component) {
    components.default = route.component
  }
  
  // 规范化 props
  const props: Record<string, any> = {}
  if (route.props === true) {
    props.default = true
  } else if (typeof route.props === 'object') {
    props.default = route.props
  } else if (typeof route.props === 'function') {
    props.default = route.props
  }
  
  // 规范化 beforeEnter
  const beforeEnter = route.beforeEnter
    ? Array.isArray(route.beforeEnter) 
      ? route.beforeEnter 
      : [route.beforeEnter]
    : []
  
  return {
    path,
    name: route.name,
    components,
    redirect: route.redirect,
    children: [], // 会被递归填充
    meta: route.meta || {},
    beforeEnter,
    props,
    parent,
    regex: null as any, // 由 pathMatcher 提供
    keys: []
  }
}
```

## 路由解析

resolve 方法是匹配器的核心，它根据目标位置找到匹配的路由：

```typescript
function resolve(
  location: RouteLocationRaw,
  currentLocation: RouteLocation,
  matchers: RouteRecordMatcher[],
  matcherMap: Map<string, RouteRecordMatcher>
): RouteLocation {
  // 字符串形式
  if (typeof location === 'string') {
    return resolveByPath(location, matchers)
  }
  
  // 命名路由
  if (location.name) {
    return resolveByName(location, matcherMap)
  }
  
  // 路径形式
  if (location.path) {
    return resolveByPath(
      buildFullPath(location),
      matchers
    )
  }
  
  // 只有 params，使用当前路由
  if (location.params && currentLocation.name) {
    return resolveByName({
      name: currentLocation.name,
      params: { ...currentLocation.params, ...location.params }
    }, matcherMap)
  }
  
  // 兜底
  return resolveByPath('/', matchers)
}

function resolveByPath(
  path: string,
  matchers: RouteRecordMatcher[]
): RouteLocation {
  // 分离 path、query、hash
  const { path: cleanPath, query, hash } = parsePath(path)
  
  // 找到匹配的路由
  for (const matcher of matchers) {
    const params = matcher.pathMatcher.parse(cleanPath)
    if (params) {
      // 构建 matched 数组（包含所有父级）
      const matched = buildMatched(matcher)
      
      return {
        path: cleanPath,
        name: matcher.record.name,
        params,
        query,
        hash,
        fullPath: path,
        matched,
        meta: mergeMeta(matched)
      }
    }
  }
  
  // 没有匹配
  return {
    path: cleanPath,
    params: {},
    query,
    hash,
    fullPath: path,
    matched: [],
    meta: {}
  }
}

function resolveByName(
  location: { name: string; params?: Record<string, string> },
  matcherMap: Map<string, RouteRecordMatcher>
): RouteLocation {
  const matcher = matcherMap.get(location.name)
  
  if (!matcher) {
    console.warn(`Route "${location.name}" not found`)
    return {
      path: '/',
      params: {},
      query: {},
      hash: '',
      fullPath: '/',
      matched: [],
      meta: {}
    }
  }
  
  const params = location.params || {}
  const path = matcher.pathMatcher.stringify(params)
  const matched = buildMatched(matcher)
  
  return {
    path,
    name: location.name,
    params,
    query: {},
    hash: '',
    fullPath: path,
    matched,
    meta: mergeMeta(matched)
  }
}
```

## 构建 matched 数组

matched 数组包含了从根到当前路由的所有记录，这对嵌套路由很重要：

```typescript
function buildMatched(matcher: RouteRecordMatcher): RouteRecord[] {
  const matched: RouteRecord[] = []
  let current: RouteRecordMatcher | undefined = matcher
  
  // 从当前往上遍历
  while (current) {
    matched.unshift(current.record)
    current = current.parent
  }
  
  return matched
}

function mergeMeta(matched: RouteRecord[]): Record<string, unknown> {
  return matched.reduce((meta, record) => {
    return { ...meta, ...record.meta }
  }, {})
}
```

## 路径解析工具

```typescript
function parsePath(path: string): {
  path: string
  query: Record<string, string>
  hash: string
} {
  let cleanPath = path
  let query: Record<string, string> = {}
  let hash = ''
  
  // 提取 hash
  const hashIndex = path.indexOf('#')
  if (hashIndex > -1) {
    hash = path.slice(hashIndex + 1)
    cleanPath = path.slice(0, hashIndex)
  }
  
  // 提取 query
  const queryIndex = cleanPath.indexOf('?')
  if (queryIndex > -1) {
    const queryString = cleanPath.slice(queryIndex + 1)
    cleanPath = cleanPath.slice(0, queryIndex)
    
    // 解析 query
    const params = new URLSearchParams(queryString)
    params.forEach((value, key) => {
      query[key] = value
    })
  }
  
  return { path: cleanPath, query, hash }
}

function buildFullPath(location: RouteLocationRaw): string {
  if (typeof location === 'string') return location
  
  let path = location.path || '/'
  
  // 添加 query
  if (location.query) {
    const params = new URLSearchParams()
    Object.entries(location.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else if (value != null) {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    if (queryString) {
      path += '?' + queryString
    }
  }
  
  // 添加 hash
  if (location.hash) {
    path += location.hash.startsWith('#') 
      ? location.hash 
      : '#' + location.hash
  }
  
  return path
}
```

## 本章小结

路由匹配器的核心逻辑：

1. **路径解析**：把路径模式转换成正则表达式
2. **参数提取**：从匹配结果中提取动态参数
3. **路由存储**：维护路由记录的树形结构
4. **解析方法**：支持路径、名称、参数等多种解析方式
5. **matched 构建**：从叶子节点向上构建完整的匹配链

匹配器是纯粹的数据处理层，不涉及任何 Vue 或浏览器相关的逻辑。这种分离让它易于测试和复用。下一章我们实现路径解析的细节。
