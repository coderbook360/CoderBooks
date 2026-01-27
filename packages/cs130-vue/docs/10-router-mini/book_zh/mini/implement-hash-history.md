# 实现 HashHistory

HashHistory 使用 URL 的 hash 部分（#后面的内容）来管理路由。这种模式兼容性好，不需要服务器配置，但 URL 中会有一个 # 符号。

## Hash 模式的特点

在 Hash 模式下，路由信息存储在 URL 的 hash 部分。比如 `http://example.com/#/users/123`，路由路径是 `/users/123`。当 hash 变化时，浏览器不会向服务器发送请求，但会触发 hashchange 事件。

这种模式的优势是简单可靠：静态服务器不需要任何配置，刷新页面也不会 404。缺点是 URL 不够美观，而且 hash 部分不会发送给服务器，对 SEO 不友好。

## 基础实现

```typescript
// history/hash.ts
import type { RouterHistory, HistoryState, NavigationInfo } from '../types'
import { 
  buildState, 
  computeScrollPosition,
  normalizeURL 
} from './common'

export function createWebHashHistory(base = ''): RouterHistory {
  // 解析当前 hash
  function parseURL(): string {
    let path = window.location.hash.slice(1) || '/'
    return normalizeURL(path)
  }
  
  // 构建完整的 hash URL
  function createHref(path: string): string {
    const baseWithHash = base + '#'
    return baseWithHash + path
  }
  
  // 状态管理
  let currentState: HistoryState = window.history.state || 
    buildState(null, parseURL(), null)
  
  // 如果没有初始状态，创建一个
  if (!window.history.state) {
    window.history.replaceState(currentState, '', createHref(parseURL()))
  }
  
  // 监听器列表
  const listeners: Array<(to: string, from: string, info: NavigationInfo) => void> = []
  
  // hashchange 和 popstate 事件处理
  function handlePopState(event: PopStateEvent) {
    const from = currentState.current
    const to = parseURL()
    const fromState = currentState
    const toState = event.state as HistoryState | null
    
    // 计算导航方向
    let delta = 0
    let direction: NavigationInfo['direction'] = ''
    
    if (toState && fromState) {
      delta = toState.position - fromState.position
      direction = delta < 0 ? 'back' : delta > 0 ? 'forward' : ''
    }
    
    // 更新状态
    currentState = toState || buildState(null, to, null)
    
    // 通知监听器
    listeners.forEach(listener => {
      listener(to, from, {
        delta,
        type: 'pop',
        direction
      })
    })
  }
  
  window.addEventListener('popstate', handlePopState)
  
  // push 导航
  function push(path: string, data?: Partial<HistoryState>) {
    // 保存当前滚动位置
    const currentPos = currentState.position
    
    // 构建新状态
    const state: HistoryState = {
      ...buildState(currentState.current, path, null),
      position: currentPos + 1,
      ...data
    }
    
    try {
      window.history.pushState(state, '', createHref(path))
    } catch (e) {
      // 降级处理
      window.location.hash = path
    }
    
    currentState = state
  }
  
  // replace 导航
  function replace(path: string, data?: Partial<HistoryState>) {
    const state: HistoryState = {
      ...buildState(currentState.back, path, currentState.forward, true),
      position: currentState.position,
      ...data
    }
    
    try {
      window.history.replaceState(state, '', createHref(path))
    } catch (e) {
      window.location.replace(createHref(path))
    }
    
    currentState = state
  }
  
  // go 导航
  function go(delta: number) {
    window.history.go(delta)
  }
  
  // 添加监听器
  function listen(callback: (to: string, from: string, info: NavigationInfo) => void) {
    listeners.push(callback)
    
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
  
  // 销毁
  function destroy() {
    window.removeEventListener('popstate', handlePopState)
    listeners.length = 0
  }
  
  return {
    get location() {
      return parseURL()
    },
    get state() {
      return currentState
    },
    push,
    replace,
    go,
    listen,
    destroy
  }
}
```

实现的核心在于正确处理 hash 的解析和构建。parseURL 从 `window.location.hash` 提取路径，去掉开头的 # 号。createHref 则把路径转换回完整的 hash URL。

## 处理 base 路径

有时候应用不是部署在根路径，需要处理 base：

```typescript
export function createWebHashHistory(base = ''): RouterHistory {
  // 规范化 base
  base = normalizeBase(base)
  
  function normalizeBase(base: string): string {
    // 移除末尾的 /
    if (base.endsWith('/')) {
      base = base.slice(0, -1)
    }
    // 移除末尾的 #
    if (base.endsWith('#')) {
      base = base.slice(0, -1)
    }
    return base
  }
  
  // 检查当前 URL 是否有正确的 base
  function ensureBase() {
    const { pathname } = window.location
    
    // 如果设置了 base 但当前路径不匹配
    if (base && !pathname.startsWith(base)) {
      // 重定向到正确的 base
      window.location.replace(base + window.location.hash)
      return false
    }
    
    return true
  }
  
  // 初始化时检查
  if (!ensureBase()) {
    return null as any // 页面会重定向
  }
  
  // ... 其余实现
}
```

base 处理确保了应用在子路径下也能正常工作。比如应用部署在 `/app/` 下，访问 `/app/#/users` 就能正确识别路由为 `/users`。

## 滚动位置管理

Hash 模式下需要特别处理滚动位置：

```typescript
// 滚动位置存储 key
function getScrollKey(path: string, position: number): string {
  return `scroll-${path}-${position}`
}

export function createWebHashHistory(base = ''): RouterHistory {
  // ... 之前的代码
  
  // 保存滚动位置
  function saveScrollPosition() {
    const key = getScrollKey(currentState.current, currentState.position)
    const position = computeScrollPosition()
    sessionStorage.setItem(key, JSON.stringify(position))
  }
  
  // 导航前保存滚动
  function push(path: string, data?: Partial<HistoryState>) {
    // 保存当前页面的滚动位置
    saveScrollPosition()
    
    const currentPos = currentState.position
    const state: HistoryState = {
      ...buildState(currentState.current, path, null),
      position: currentPos + 1,
      ...data
    }
    
    try {
      window.history.pushState(state, '', createHref(path))
    } catch (e) {
      window.location.hash = path
    }
    
    currentState = state
  }
  
  function handlePopState(event: PopStateEvent) {
    // 保存离开页面的滚动位置
    saveScrollPosition()
    
    // ... 其余处理
  }
}
```

滚动位置用 sessionStorage 保存，key 由路径和历史位置组成。这样即使同一个路径被访问多次，也能恢复到正确的滚动位置。

## 处理初始 hash

有些用户可能直接访问带 hash 的 URL，需要正确初始化：

```typescript
export function createWebHashHistory(base = ''): RouterHistory {
  // 确保有正确的初始 hash
  function setupInitialState() {
    const { hash } = window.location
    
    // 如果没有 hash 或只有 #，设置为根路径
    if (!hash || hash === '#') {
      window.history.replaceState(
        buildState(null, '/', null),
        '',
        createHref('/')
      )
    }
    
    // 返回当前路径
    return parseURL()
  }
  
  const initialPath = setupInitialState()
  
  let currentState: HistoryState = window.history.state || 
    buildState(null, initialPath, null)
  
  // ... 其余实现
}
```

## 完整实现

```typescript
// history/hash.ts
import type { RouterHistory, HistoryState, NavigationInfo } from '../types'
import { buildState, computeScrollPosition, normalizeURL } from './common'

function getScrollKey(path: string, position: number): string {
  return `scroll-${path}-${position}`
}

export function createWebHashHistory(base = ''): RouterHistory {
  // 规范化 base
  if (base.endsWith('/')) base = base.slice(0, -1)
  if (base.endsWith('#')) base = base.slice(0, -1)
  
  function parseURL(): string {
    let path = window.location.hash.slice(1) || '/'
    return normalizeURL(path)
  }
  
  function createHref(path: string): string {
    return base + '#' + path
  }
  
  // 初始化
  const initialPath = parseURL()
  if (!window.history.state) {
    window.history.replaceState(
      buildState(null, initialPath, null),
      '',
      createHref(initialPath)
    )
  }
  
  let currentState: HistoryState = window.history.state
  const listeners: Array<(to: string, from: string, info: NavigationInfo) => void> = []
  
  function saveScrollPosition() {
    const key = getScrollKey(currentState.current, currentState.position)
    sessionStorage.setItem(key, JSON.stringify(computeScrollPosition()))
  }
  
  function handlePopState(event: PopStateEvent) {
    saveScrollPosition()
    
    const from = currentState.current
    const to = parseURL()
    const toState = event.state as HistoryState | null
    
    let delta = 0
    let direction: NavigationInfo['direction'] = ''
    
    if (toState) {
      delta = toState.position - currentState.position
      direction = delta < 0 ? 'back' : delta > 0 ? 'forward' : ''
    }
    
    currentState = toState || buildState(null, to, null)
    
    listeners.forEach(listener => {
      listener(to, from, { delta, type: 'pop', direction })
    })
  }
  
  window.addEventListener('popstate', handlePopState)
  
  function push(path: string, data?: Partial<HistoryState>) {
    saveScrollPosition()
    
    const state: HistoryState = {
      ...buildState(currentState.current, path, null),
      position: currentState.position + 1,
      ...data
    }
    
    try {
      window.history.pushState(state, '', createHref(path))
    } catch (e) {
      window.location.hash = path
    }
    
    currentState = state
  }
  
  function replace(path: string, data?: Partial<HistoryState>) {
    const state: HistoryState = {
      ...buildState(currentState.back, path, currentState.forward, true),
      position: currentState.position,
      ...data
    }
    
    try {
      window.history.replaceState(state, '', createHref(path))
    } catch (e) {
      window.location.replace(createHref(path))
    }
    
    currentState = state
  }
  
  function go(delta: number) {
    window.history.go(delta)
  }
  
  function listen(callback: (to: string, from: string, info: NavigationInfo) => void) {
    listeners.push(callback)
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  }
  
  function destroy() {
    window.removeEventListener('popstate', handlePopState)
    listeners.length = 0
  }
  
  return {
    get location() { return parseURL() },
    get state() { return currentState },
    push,
    replace,
    go,
    listen,
    destroy
  }
}
```

## 本章小结

HashHistory 的实现围绕几个核心点展开：

1. **URL 解析**：从 `location.hash` 提取路径
2. **状态管理**：使用 `history.state` 存储路由状态
3. **事件监听**：监听 popstate 处理前进后退
4. **滚动保存**：用 sessionStorage 保存滚动位置

Hash 模式虽然简单，但足以应对大多数 SPA 场景。下一章我们实现 HTML5History，它使用更现代的 History API，URL 更加美观。
