# 实现 HTML5History

HTML5History 使用浏览器的 History API，URL 更加干净美观。这是现代 Web 应用的首选方案。

## HTML5 History API 基础

HTML5 引入了 `history.pushState` 和 `history.replaceState` 方法，可以在不刷新页面的情况下修改 URL。与 Hash 模式不同，这里的路径是真实的 URL 路径，比如 `http://example.com/users/123`。

这种模式的优势是 URL 干净、对 SEO 友好、可以利用服务端渲染。缺点是需要服务器配置支持：所有路由都要返回同一个 HTML 文件，否则刷新页面会 404。

## 核心实现

```typescript
// history/html5.ts
import type { RouterHistory, HistoryState, NavigationInfo } from '../types'
import { buildState, computeScrollPosition, normalizeURL } from './common'

export function createWebHistory(base = ''): RouterHistory {
  // 规范化 base
  base = normalizeBase(base)
  
  function normalizeBase(base: string): string {
    if (!base) return ''
    if (!base.startsWith('/')) base = '/' + base
    if (base.endsWith('/')) base = base.slice(0, -1)
    return base
  }
  
  // 解析当前 URL
  function parseURL(): string {
    const { pathname, search, hash } = window.location
    
    // 移除 base 前缀
    let path = pathname
    if (base && pathname.toLowerCase().startsWith(base.toLowerCase())) {
      path = pathname.slice(base.length) || '/'
    }
    
    return normalizeURL(path) + search + hash
  }
  
  // 提取纯路径（不含 query 和 hash）
  function extractPath(url: string): string {
    const queryIndex = url.indexOf('?')
    const hashIndex = url.indexOf('#')
    
    let end = url.length
    if (queryIndex > -1) end = Math.min(end, queryIndex)
    if (hashIndex > -1) end = Math.min(end, hashIndex)
    
    return url.slice(0, end)
  }
  
  // 构建完整 URL
  function createHref(path: string): string {
    return base + path
  }
  
  // 初始化状态
  let currentState: HistoryState = window.history.state ||
    buildState(null, parseURL(), null)
  
  if (!window.history.state) {
    window.history.replaceState(currentState, '', createHref(parseURL()))
  }
  
  const listeners: Array<(to: string, from: string, info: NavigationInfo) => void> = []
  
  // popstate 事件处理
  function handlePopState(event: PopStateEvent) {
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
  
  // push 导航
  function push(path: string, data?: Partial<HistoryState>) {
    const state: HistoryState = {
      ...buildState(currentState.current, path, null),
      position: currentState.position + 1,
      ...data
    }
    
    try {
      window.history.pushState(state, '', createHref(path))
    } catch (e) {
      // 某些情况下 pushState 可能失败
      window.location.assign(createHref(path))
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

实现结构与 HashHistory 类似，主要区别在于 URL 的解析和构建方式。这里使用 `pathname` 而不是 `hash`，需要处理 base 前缀的移除和添加。

## Base 路径处理

当应用部署在子路径下时，base 的处理非常重要：

```typescript
function normalizeBase(base: string): string {
  // 空 base
  if (!base) {
    return ''
  }
  
  // 确保以 / 开头
  if (!base.startsWith('/')) {
    base = '/' + base
  }
  
  // 移除末尾的 /
  if (base.endsWith('/')) {
    base = base.slice(0, -1)
  }
  
  return base
}

// 自动检测 base（可选功能）
function detectBase(): string {
  // 从 <base> 标签获取
  const baseEl = document.querySelector('base')
  if (baseEl) {
    let href = baseEl.getAttribute('href') || '/'
    // 只取路径部分
    return new URL(href, window.location.origin).pathname
  }
  
  return ''
}
```

base 的规范化确保了一致性：总是以 `/` 开头，但不以 `/` 结尾。这样拼接路径时只需要简单地 `base + path`。

## 处理查询字符串和 Hash

HTML5History 需要正确处理 URL 的各个部分：

```typescript
function parseURL(): string {
  const { pathname, search, hash } = window.location
  
  let path = pathname
  if (base && pathname.toLowerCase().startsWith(base.toLowerCase())) {
    path = pathname.slice(base.length) || '/'
  }
  
  // 返回完整的相对 URL
  return normalizeURL(path) + search + hash
}

// 分解 URL 各部分
function splitURL(url: string): { path: string; query: string; hash: string } {
  let path = url
  let query = ''
  let hash = ''
  
  const hashIndex = url.indexOf('#')
  if (hashIndex > -1) {
    hash = url.slice(hashIndex)
    path = url.slice(0, hashIndex)
  }
  
  const queryIndex = path.indexOf('?')
  if (queryIndex > -1) {
    query = path.slice(queryIndex)
    path = path.slice(0, queryIndex)
  }
  
  return { path: normalizeURL(path), query, hash }
}
```

## 滚动行为集成

HTML5History 支持更完善的滚动行为：

```typescript
function getScrollKey(path: string, position: number): string {
  return `scroll-${position}`
}

export function createWebHistory(base = ''): RouterHistory {
  // ... 之前的代码
  
  function saveScrollPosition() {
    const key = getScrollKey(currentState.current, currentState.position)
    const position = computeScrollPosition()
    
    // 同时保存到 history.state 和 sessionStorage
    const newState = {
      ...currentState,
      scroll: position
    }
    
    try {
      window.history.replaceState(newState, '')
      sessionStorage.setItem(key, JSON.stringify(position))
    } catch (e) {
      console.warn('Failed to save scroll position', e)
    }
    
    currentState = newState
  }
  
  // 获取保存的滚动位置
  function getSavedScrollPosition(): { left: number; top: number } | null {
    // 优先从 state 获取
    if (currentState.scroll) {
      return currentState.scroll
    }
    
    // 备选从 sessionStorage 获取
    const key = getScrollKey(currentState.current, currentState.position)
    const saved = sessionStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  }
  
  // 在 push 前保存滚动
  function push(path: string, data?: Partial<HistoryState>) {
    saveScrollPosition()
    // ... 其余代码
  }
}
```

## 服务器配置说明

使用 HTML5History 需要服务器正确配置。所有路由请求都应该返回同一个 HTML 文件：

```nginx
# Nginx 配置
location / {
  try_files $uri $uri/ /index.html;
}
```

```apache
# Apache .htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

如果服务器没有正确配置，用户直接访问或刷新 `/users/123` 这样的 URL 会得到 404。

## 完整实现

```typescript
// history/html5.ts
import type { RouterHistory, HistoryState, NavigationInfo } from '../types'
import { buildState, computeScrollPosition, normalizeURL } from './common'

function getScrollKey(path: string, position: number): string {
  return `scroll-${position}`
}

export function createWebHistory(base = ''): RouterHistory {
  // 规范化 base
  if (base) {
    if (!base.startsWith('/')) base = '/' + base
    if (base.endsWith('/')) base = base.slice(0, -1)
  }
  
  function parseURL(): string {
    const { pathname, search, hash } = window.location
    
    let path = pathname
    if (base && pathname.toLowerCase().startsWith(base.toLowerCase())) {
      path = pathname.slice(base.length) || '/'
    }
    
    return normalizeURL(path) + search + hash
  }
  
  function createHref(path: string): string {
    return base + path
  }
  
  // 初始化
  let currentState: HistoryState = window.history.state ||
    buildState(null, parseURL(), null)
  
  if (!window.history.state) {
    window.history.replaceState(currentState, '', createHref(parseURL()))
  }
  
  const listeners: Array<(to: string, from: string, info: NavigationInfo) => void> = []
  
  function saveScrollPosition() {
    const key = getScrollKey(currentState.current, currentState.position)
    const position = computeScrollPosition()
    const newState = { ...currentState, scroll: position }
    
    try {
      window.history.replaceState(newState, '')
      sessionStorage.setItem(key, JSON.stringify(position))
    } catch (e) {}
    
    currentState = newState
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
      window.location.assign(createHref(path))
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

HTML5History 与 HashHistory 共享大部分实现逻辑，核心差异在于：

1. **URL 格式**：使用真实路径而非 hash
2. **Base 处理**：需要正确处理路径前缀
3. **服务器要求**：需要配置回退到 index.html

两种 History 实现了相同的接口，上层代码可以透明切换。下一章我们实现路由匹配器，处理路径到组件的映射。
