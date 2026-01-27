# 实现 History 管理

History 模块是路由系统的底层基础，它抽象了浏览器历史记录操作，为上层提供统一的接口。

## 基础结构设计

所有 History 实现都需要满足 RouterHistory 接口。我们先定义一个基础的抽象层：

```typescript
// history/common.ts
import type { RouterHistory, HistoryState, NavigationInfo } from '../types'

// 创建历史状态
export function buildState(
  back: string | null,
  current: string,
  forward: string | null,
  replaced = false,
  computeScroll = false
): HistoryState {
  return {
    back,
    current,
    forward,
    replaced,
    position: window.history.length - 1,
    scroll: computeScroll ? computeScrollPosition() : null
  }
}

// 计算滚动位置
export function computeScrollPosition() {
  return {
    left: window.pageXOffset,
    top: window.pageYOffset
  }
}

// 保存滚动位置到 history.state
export function saveScrollPosition(
  key: string,
  scrollPosition: { left: number; top: number }
) {
  sessionStorage.setItem(
    key,
    JSON.stringify(scrollPosition)
  )
}

// 恢复滚动位置
export function getSavedScrollPosition(key: string) {
  const saved = sessionStorage.getItem(key)
  return saved ? JSON.parse(saved) : null
}
```

这些工具函数处理了历史状态的创建和滚动位置的保存。buildState 函数构建了一个完整的状态对象，包含前进后退的路径信息和当前位置。滚动位置使用 sessionStorage 保存，这样刷新页面后还能恢复。

## 监听器管理

History 需要监听浏览器的前进后退事件，并通知上层：

```typescript
// history/common.ts

export function useHistoryListeners(
  parseURL: () => string,
  state: { value: HistoryState },
  replace: (url: string, state: HistoryState) => void
) {
  const listeners: Array<(to: string, from: string, info: NavigationInfo) => void> = []
  let teardowns: Array<() => void> = []
  
  // popstate 事件处理
  function popStateHandler(event: PopStateEvent) {
    const from = state.value.current
    const to = parseURL()
    const fromState = state.value
    const toState = event.state as HistoryState | null
    
    // 计算方向
    let delta = 0
    let direction: NavigationInfo['direction'] = ''
    
    if (toState) {
      delta = toState.position - fromState.position
      direction = delta < 0 ? 'back' : delta > 0 ? 'forward' : ''
    }
    
    // 更新当前状态
    state.value = toState || buildState(null, to, null)
    
    // 通知监听器
    listeners.forEach(listener => {
      listener(to, from, {
        delta,
        type: 'pop',
        direction
      })
    })
  }
  
  // 添加监听
  window.addEventListener('popstate', popStateHandler)
  teardowns.push(() => window.removeEventListener('popstate', popStateHandler))
  
  function listen(callback: (to: string, from: string, info: NavigationInfo) => void) {
    listeners.push(callback)
    
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
  
  function destroy() {
    teardowns.forEach(teardown => teardown())
    teardowns = []
    listeners.length = 0
  }
  
  return {
    listen,
    destroy
  }
}
```

这个函数封装了 popstate 事件的监听逻辑。它维护了一个监听器列表，当浏览器前进后退时，计算出导航的方向和距离，然后通知所有监听器。listen 方法返回取消函数，这是一个常见的资源管理模式。

## 导航状态管理

接下来实现导航相关的状态管理：

```typescript
// history/common.ts

export function useHistoryStateNavigation(parseURL: () => string) {
  const { history, location } = window
  
  // 当前状态
  const currentState: { value: HistoryState } = {
    value: history.state || buildState(null, parseURL(), null)
  }
  
  // 如果没有初始状态，创建一个
  if (!history.state) {
    changeLocation(
      parseURL(),
      buildState(null, parseURL(), null),
      true
    )
  }
  
  function changeLocation(
    url: string,
    state: HistoryState,
    replace: boolean
  ) {
    // 计算完整 URL
    const fullUrl = url.startsWith('http')
      ? url
      : location.protocol + '//' + location.host + url
    
    try {
      if (replace) {
        history.replaceState(state, '', fullUrl)
      } else {
        history.pushState(state, '', fullUrl)
      }
    } catch (e) {
      // 某些情况下 pushState 可能失败
      // 退回到 location.assign/replace
      if (replace) {
        location.replace(fullUrl)
      } else {
        location.assign(fullUrl)
      }
    }
    
    currentState.value = state
  }
  
  function push(url: string, data?: Partial<HistoryState>) {
    const currentPos = currentState.value.position
    const state = buildState(
      currentState.value.current,
      url,
      null,
      false
    )
    state.position = currentPos + 1
    
    if (data) {
      Object.assign(state, data)
    }
    
    changeLocation(url, state, false)
  }
  
  function replace(url: string, data?: Partial<HistoryState>) {
    const state = {
      ...buildState(
        currentState.value.back,
        url,
        currentState.value.forward,
        true
      ),
      position: currentState.value.position
    }
    
    if (data) {
      Object.assign(state, data)
    }
    
    changeLocation(url, state, true)
  }
  
  return {
    state: currentState,
    push,
    replace
  }
}
```

这部分代码处理 pushState 和 replaceState 的调用。关键是维护好状态对象中的 back、current、forward 和 position 字段。push 时会更新 back 为当前路径，replace 时保持 back 不变。

## History 工厂函数

现在把这些部分组合起来，创建一个基础的 History 工厂：

```typescript
// history/common.ts

export function createBaseHistory(parseURL: () => string): RouterHistory {
  const { state, push, replace } = useHistoryStateNavigation(parseURL)
  const { listen, destroy } = useHistoryListeners(parseURL, state, replace)
  
  function go(delta: number) {
    window.history.go(delta)
  }
  
  return {
    get location() {
      return parseURL()
    },
    get state() {
      return state.value
    },
    push,
    replace,
    go,
    listen,
    destroy
  }
}
```

这个工厂函数组合了导航和监听两个部分，返回一个完整的 RouterHistory 对象。location 和 state 使用 getter，确保每次访问都是最新值。

## URL 解析工具

不同的 History 模式需要不同的 URL 解析方式：

```typescript
// history/common.ts

// 解析 path + query + hash
export function parseURL(base = '') {
  const { pathname, search, hash } = window.location
  
  // 移除 base 前缀
  let path = pathname
  if (base && pathname.startsWith(base)) {
    path = pathname.slice(base.length) || '/'
  }
  
  return {
    path,
    query: parseQuery(search),
    hash: hash.slice(1)
  }
}

// 解析查询字符串
export function parseQuery(query: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  
  if (!query || query === '?') {
    return result
  }
  
  const searchParams = new URLSearchParams(
    query.startsWith('?') ? query.slice(1) : query
  )
  
  searchParams.forEach((value, key) => {
    if (key in result) {
      const existing = result[key]
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[key] = [existing, value]
      }
    } else {
      result[key] = value
    }
  })
  
  return result
}

// 序列化查询对象
export function stringifyQuery(query: Record<string, string | string[]>): string {
  const params = new URLSearchParams()
  
  Object.keys(query).forEach(key => {
    const value = query[key]
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v))
    } else if (value != null) {
      params.append(key, value)
    }
  })
  
  const result = params.toString()
  return result ? '?' + result : ''
}

// 规范化路径
export function normalizeURL(url: string): string {
  // 确保以 / 开头
  if (!url.startsWith('/')) {
    url = '/' + url
  }
  
  // 移除多余的 /
  url = url.replace(/\/+/g, '/')
  
  // 移除末尾的 / (除了根路径)
  if (url.length > 1 && url.endsWith('/')) {
    url = url.slice(0, -1)
  }
  
  return url
}
```

这些工具函数处理 URL 的解析和序列化。parseQuery 使用浏览器原生的 URLSearchParams，处理了同名参数变成数组的情况。normalizeURL 确保路径格式一致。

## 本章小结

这一章我们搭建了 History 模块的基础设施。核心思想是把浏览器的 History API 抽象成统一的接口：

1. **状态管理**：通过 history.state 保存路由状态
2. **事件监听**：监听 popstate 处理前进后退
3. **导航方法**：封装 pushState 和 replaceState
4. **URL 工具**：解析和序列化 URL

这些基础代码会被具体的 History 实现复用。下一章我们实现 HashHistory，它使用 URL 的 hash 部分来管理路由。
