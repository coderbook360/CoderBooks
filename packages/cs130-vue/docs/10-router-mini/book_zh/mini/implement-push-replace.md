# 实现 push 和 replace

push 和 replace 是路由导航的两个核心方法。它们的区别在于是否在历史记录中创建新条目：push 添加新记录，replace 替换当前记录。

## 导航流程概述

一次完整的导航包含多个阶段：解析目标路由、检查重复导航、执行守卫链、更新 URL、更新响应式状态、执行后置钩子、处理滚动行为。每个阶段都可能中断导航。

## 解析目标位置

导航的第一步是把用户传入的目标转换成完整的 RouteLocation：

```typescript
// router/navigation.ts
import type { RouteLocation, RouteLocationRaw } from '../types'
import type { RouterMatcher } from '../matcher'

export function resolveLocation(
  to: RouteLocationRaw,
  currentRoute: RouteLocation,
  matcher: RouterMatcher
): RouteLocation {
  // 字符串形式
  if (typeof to === 'string') {
    return matcher.resolve(to, currentRoute)
  }
  
  // 对象形式
  const { path, name, params, query, hash } = to
  
  if (name) {
    // 命名路由
    return matcher.resolve({ name, params }, currentRoute)
  }
  
  if (path) {
    // 路径形式
    const resolved = matcher.resolve(path, currentRoute)
    
    // 合并 query 和 hash
    return {
      ...resolved,
      query: query || resolved.query,
      hash: hash || resolved.hash,
      fullPath: buildFullPath(resolved.path, query, hash)
    }
  }
  
  // 只传了 params，使用当前路由
  if (params) {
    return matcher.resolve(
      { name: currentRoute.name, params: { ...currentRoute.params, ...params } },
      currentRoute
    )
  }
  
  // 默认当前路由
  return currentRoute
}

function buildFullPath(
  path: string,
  query?: Record<string, string | string[]>,
  hash?: string
): string {
  let fullPath = path
  
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else if (value != null) {
        params.append(key, value)
      }
    })
    fullPath += '?' + params.toString()
  }
  
  if (hash) {
    fullPath += hash.startsWith('#') ? hash : '#' + hash
  }
  
  return fullPath
}
```

resolveLocation 处理了多种导航方式：字符串路径、命名路由、路径对象、只传参数等。这种灵活性是 Vue Router API 的特点。

## 重复导航检测

导航到当前位置是一种特殊情况：

```typescript
export function isSameRouteLocation(
  a: RouteLocation,
  b: RouteLocation
): boolean {
  // 路径必须相同
  if (a.path !== b.path) return false
  
  // hash 必须相同
  if (a.hash !== b.hash) return false
  
  // query 必须相同
  if (!isSameQuery(a.query, b.query)) return false
  
  // params 必须相同（对于命名路由）
  if (a.name && !isSameParams(a.params, b.params)) return false
  
  return true
}

function isSameQuery(
  a: Record<string, string | string[]>,
  b: Record<string, string | string[]>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  
  if (aKeys.length !== bKeys.length) return false
  
  return aKeys.every(key => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      return aVal.length === bVal.length && 
        aVal.every((v, i) => v === bVal[i])
    }
    
    return aVal === bVal
  })
}

function isSameParams(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  
  if (aKeys.length !== bKeys.length) return false
  
  return aKeys.every(key => a[key] === b[key])
}
```

检测重复导航可以避免不必要的操作和可能的无限循环。

## 导航状态管理

使用 pendingLocation 跟踪进行中的导航：

```typescript
interface NavigationState {
  pendingLocation: RouteLocation | null
  currentLocation: RouteLocation
}

export function createNavigationState(
  initial: RouteLocation
): NavigationState {
  return {
    pendingLocation: null,
    currentLocation: initial
  }
}

export function startNavigation(
  state: NavigationState,
  to: RouteLocation
): void {
  state.pendingLocation = to
}

export function finishNavigation(
  state: NavigationState,
  to: RouteLocation
): void {
  if (state.pendingLocation === to) {
    state.currentLocation = to
    state.pendingLocation = null
  }
}

export function isNavigationCancelled(
  state: NavigationState,
  to: RouteLocation
): boolean {
  return state.pendingLocation !== to
}
```

pendingLocation 的作用是检测导航是否被新的导航覆盖。如果在守卫执行期间发起了新导航，旧的导航应该被取消。

## 导航失败类型

```typescript
export enum NavigationFailureType {
  aborted = 1,      // 被守卫阻止
  cancelled = 2,    // 被新导航覆盖
  duplicated = 4    // 重复导航
}

export interface NavigationFailure extends Error {
  type: NavigationFailureType
  from: RouteLocation
  to: RouteLocation
}

export function createNavigationFailure(
  type: NavigationFailureType,
  from: RouteLocation,
  to: RouteLocation
): NavigationFailure {
  const messages = {
    [NavigationFailureType.aborted]: 'Navigation aborted',
    [NavigationFailureType.cancelled]: 'Navigation cancelled',
    [NavigationFailureType.duplicated]: 'Avoided redundant navigation'
  }
  
  const error = new Error(messages[type]) as NavigationFailure
  error.type = type
  error.from = from
  error.to = to
  
  return error
}

export function isNavigationFailure(
  error: any,
  type?: NavigationFailureType
): error is NavigationFailure {
  if (!(error instanceof Error) || !('type' in error)) {
    return false
  }
  
  if (type !== undefined) {
    return error.type === type
  }
  
  return true
}
```

区分不同类型的导航失败很重要：aborted 表示被主动阻止，开发者可能想显示提示；cancelled 是正常的并发导航；duplicated 通常可以静默忽略。

## 完整的 push 实现

```typescript
export async function push(
  to: RouteLocationRaw,
  options: {
    matcher: RouterMatcher
    history: RouterHistory
    currentRoute: Ref<RouteLocation>
    beforeGuards: NavigationGuard[]
    beforeResolveGuards: NavigationGuard[]
    afterHooks: NavigationHookAfter[]
    scrollBehavior?: ScrollBehavior
    state: NavigationState
  }
): Promise<NavigationFailure | void> {
  const {
    matcher,
    history,
    currentRoute,
    beforeGuards,
    beforeResolveGuards,
    afterHooks,
    scrollBehavior,
    state
  } = options
  
  // 1. 解析目标
  const targetLocation = resolveLocation(to, currentRoute.value, matcher)
  const from = currentRoute.value
  
  // 2. 检查重复
  if (isSameRouteLocation(targetLocation, from)) {
    return createNavigationFailure(
      NavigationFailureType.duplicated,
      from,
      targetLocation
    )
  }
  
  // 3. 开始导航
  startNavigation(state, targetLocation)
  
  try {
    // 4. 执行 beforeEach 守卫
    for (const guard of beforeGuards) {
      const result = await executeGuard(guard, targetLocation, from)
      
      // 检查是否被取消
      if (isNavigationCancelled(state, targetLocation)) {
        return createNavigationFailure(
          NavigationFailureType.cancelled,
          from,
          targetLocation
        )
      }
      
      // 处理守卫返回值
      if (result === false) {
        return createNavigationFailure(
          NavigationFailureType.aborted,
          from,
          targetLocation
        )
      }
      
      if (isRouteLocation(result)) {
        // 重定向
        return push(result, options)
      }
    }
    
    // 5. 执行组件守卫（简化版省略）
    
    // 6. 执行 beforeResolve 守卫
    for (const guard of beforeResolveGuards) {
      const result = await executeGuard(guard, targetLocation, from)
      
      if (isNavigationCancelled(state, targetLocation)) {
        return createNavigationFailure(
          NavigationFailureType.cancelled,
          from,
          targetLocation
        )
      }
      
      if (result === false) {
        return createNavigationFailure(
          NavigationFailureType.aborted,
          from,
          targetLocation
        )
      }
    }
    
    // 7. 更新 URL
    history.push(targetLocation.fullPath)
    
    // 8. 更新响应式状态
    finishNavigation(state, targetLocation)
    currentRoute.value = targetLocation
    
    // 9. 执行后置钩子
    for (const hook of afterHooks) {
      hook(targetLocation, from)
    }
    
    // 10. 处理滚动
    if (scrollBehavior) {
      await handleScroll(scrollBehavior, targetLocation, from)
    }
    
  } catch (error) {
    if (isNavigationFailure(error)) {
      return error
    }
    throw error
  }
}

async function executeGuard(
  guard: NavigationGuard,
  to: RouteLocation,
  from: RouteLocation
): Promise<boolean | RouteLocationRaw | void> {
  return new Promise((resolve, reject) => {
    const next = (arg?: any) => {
      if (arg === undefined || arg === true) {
        resolve()
      } else if (arg === false) {
        resolve(false)
      } else if (typeof arg === 'string' || typeof arg === 'object') {
        resolve(arg)
      } else if (arg instanceof Error) {
        reject(arg)
      }
    }
    
    try {
      const result = guard(to, from, next)
      
      // Promise 返回值
      if (result instanceof Promise) {
        result.then(resolve).catch(reject)
      } else if (result !== undefined) {
        resolve(result)
      }
    } catch (e) {
      reject(e)
    }
  })
}
```

## replace 实现

replace 与 push 几乎相同，只是调用 history.replace 而非 history.push：

```typescript
export async function replace(
  to: RouteLocationRaw,
  options: Parameters<typeof push>[1]
): Promise<NavigationFailure | void> {
  // 复用 push 的大部分逻辑
  const { history, ...rest } = options
  
  // 创建一个 replace 版本的 history
  const replaceHistory = {
    ...history,
    push: history.replace
  }
  
  return push(to, { ...rest, history: replaceHistory })
}
```

或者更直接地，在 push 函数中添加 replace 参数：

```typescript
export async function navigate(
  to: RouteLocationRaw,
  replace: boolean,
  options: NavigateOptions
): Promise<NavigationFailure | void> {
  // ... 前面的逻辑
  
  // 更新 URL
  if (replace) {
    history.replace(targetLocation.fullPath)
  } else {
    history.push(targetLocation.fullPath)
  }
  
  // ... 后面的逻辑
}

export function push(to: RouteLocationRaw, options: NavigateOptions) {
  return navigate(to, false, options)
}

export function replace(to: RouteLocationRaw, options: NavigateOptions) {
  return navigate(to, true, options)
}
```

## 滚动行为处理

```typescript
async function handleScroll(
  scrollBehavior: ScrollBehavior,
  to: RouteLocation,
  from: RouteLocation
): Promise<void> {
  // 获取保存的滚动位置
  const savedPosition = getSavedScrollPosition(to)
  
  const position = await scrollBehavior(to, from, savedPosition)
  
  if (!position) return
  
  // 等待 DOM 更新
  await nextTick()
  
  // 处理元素选择器
  if ('el' in position && position.el) {
    const el = typeof position.el === 'string'
      ? document.querySelector(position.el)
      : position.el
    
    if (el) {
      el.scrollIntoView({ behavior: position.behavior || 'auto' })
      return
    }
  }
  
  // 滚动到指定位置
  window.scrollTo({
    left: position.left || 0,
    top: position.top || 0,
    behavior: position.behavior || 'auto'
  })
}

function getSavedScrollPosition(
  route: RouteLocation
): { left: number; top: number } | null {
  const key = `scroll-${route.fullPath}`
  const saved = sessionStorage.getItem(key)
  return saved ? JSON.parse(saved) : null
}
```

## 本章小结

push 和 replace 的实现要点：

1. **解析目标**：支持多种导航形式
2. **重复检测**：避免冗余导航
3. **守卫执行**：按顺序执行，支持中断和重定向
4. **状态追踪**：用 pendingLocation 检测取消
5. **失败类型**：区分 aborted、cancelled、duplicated
6. **滚动处理**：支持保存和恢复滚动位置

这两个方法是用户与路由交互的主要入口，理解它们的实现有助于正确使用导航守卫和处理导航结果。
