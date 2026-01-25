# createWebHistory 实现

`createWebHistory` 创建基于 HTML5 History API 的路由历史管理器。这是最常用的 history 模式，产生干净的 URL 如 `/users/123`。

## 函数签名

```typescript
function createWebHistory(base?: string): RouterHistory
```

接受一个可选的 base 路径，返回符合 `RouterHistory` 接口的对象。

## RouterHistory 接口

所有 history 实现都遵循这个接口：

```typescript
interface RouterHistory {
  readonly base: string
  readonly location: HistoryLocation
  readonly state: HistoryState

  push(to: HistoryLocation, data?: HistoryState): void
  replace(to: HistoryLocation, data?: HistoryState): void
  go(delta: number, triggerListeners?: boolean): void

  listen(callback: NavigationCallback): () => void
  createHref(location: HistoryLocation): string
  destroy(): void
}
```

## 基础路径处理

首先是 base 的处理：

```typescript
export function createWebHistory(base?: string): RouterHistory {
  // 规范化 base 路径
  base = normalizeBase(base)
  
  // ...
}

function normalizeBase(base?: string): string {
  if (!base) {
    // 从 <base> 标签获取，或者默认 '/'
    if (typeof document !== 'undefined') {
      const baseEl = document.querySelector('base')
      base = (baseEl && baseEl.getAttribute('href')) || '/'
      // 移除协议和域名部分
      base = base.replace(/^\w+:\/\/[^\/]+/, '')
    } else {
      base = '/'
    }
  }

  // 确保以 / 开头，不以 / 结尾
  if (base[0] !== '/') base = '/' + base
  
  return removeTrailingSlash(base)
}
```

base 处理了几种情况：

1. 如果未指定，尝试从 HTML 的 `<base>` 标签读取
2. 默认为 `/`
3. 确保格式统一（以 `/` 开头，不以 `/` 结尾）

## 位置和状态管理

`createWebHistory` 内部使用两个组合函数：

```typescript
const historyNavigation = useHistoryStateNavigation(base)
const historyListeners = useHistoryListeners(
  base,
  historyNavigation.state,
  historyNavigation.location,
  historyNavigation.replace
)
```

`useHistoryStateNavigation` 负责读写 URL 和状态，`useHistoryListeners` 负责监听 URL 变化。

## useHistoryStateNavigation

这个函数封装了对 `history.pushState` 和 `history.replaceState` 的操作：

```typescript
function useHistoryStateNavigation(base: string) {
  const { history, location } = window

  // 获取当前位置（去除 base 前缀）
  const currentLocation = computed(() => {
    return createCurrentLocation(base, location)
  })

  // 当前状态
  const historyState = { value: history.state }

  // 初始化状态（如果是首次访问）
  if (!historyState.value) {
    changeLocation(
      currentLocation.value,
      {
        back: null,
        current: currentLocation.value,
        forward: null,
        position: history.length - 1,
        replaced: true,
        scroll: null
      },
      true  // replace 模式
    )
  }

  function changeLocation(to, state, replace) {
    // 构建完整 URL
    const url = createBaseLocation() + 
      (base.startsWith('#') ? '' : base) + 
      to

    try {
      // 调用 History API
      history[replace ? 'replaceState' : 'pushState'](state, '', url)
      historyState.value = state
    } catch (err) {
      // Safari 在私密模式下可能抛出异常
      location[replace ? 'replace' : 'assign'](url)
    }
  }

  function push(to, data) {
    const currentState = Object.assign(
      {},
      historyState.value,
      // 保存当前滚动位置
      { scroll: computeScrollPosition() }
    )

    // 先保存当前状态
    changeLocation(currentState.current, currentState, true)

    // 构建新状态
    const state = Object.assign(
      {},
      buildState(historyState.value.back, to, null, historyState.value.position + 1),
      { position: historyState.value.position + 1 },
      data
    )

    // 推入新状态
    changeLocation(to, state, false)
  }

  function replace(to, data) {
    const state = Object.assign(
      {},
      buildState(historyState.value.back, to, historyState.value.forward, historyState.value.position),
      data
    )

    changeLocation(to, state, true)
  }

  return {
    location: currentLocation,
    state: historyState,
    push,
    replace
  }
}
```

关键点：

1. **状态结构**：每个历史记录保存 `back`（上一个位置）、`current`（当前位置）、`forward`（下一个位置）、`position`（在历史栈中的位置）、`scroll`（滚动位置）

2. **push 的两步操作**：先 replaceState 保存当前滚动位置，再 pushState 添加新记录

3. **异常处理**：Safari 私密模式可能拒绝 pushState，回退到 location.assign

## useHistoryListeners

这个函数负责监听浏览器的前进后退：

```typescript
function useHistoryListeners(
  base: string,
  historyState: { value: HistoryState },
  currentLocation: { value: HistoryLocation },
  replace: RouterHistory['replace']
) {
  let listeners: NavigationCallback[] = []
  let teardowns: (() => void)[] = []

  // 防止重复触发
  let pauseState: HistoryLocation | null = null

  function pauseListeners() {
    pauseState = currentLocation.value
  }

  function listen(callback: NavigationCallback) {
    listeners.push(callback)

    const teardown = () => {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }

    teardowns.push(teardown)
    return teardown
  }

  function popStateHandler({ state }: PopStateEvent) {
    const to = createCurrentLocation(base, location)
    const from = currentLocation.value
    const fromState = historyState.value

    // 更新状态
    currentLocation.value = to
    historyState.value = state

    // 如果处于暂停状态，忽略
    if (pauseState && pauseState === from) {
      pauseState = null
      return
    }

    // 计算导航方向
    const delta = fromState 
      ? state.position - fromState.position 
      : 0

    // 通知所有监听器
    listeners.forEach(listener => {
      listener(currentLocation.value, from, { delta, type: 'pop', direction: delta > 0 ? 'forward' : 'back' })
    })
  }

  window.addEventListener('popstate', popStateHandler)

  function destroy() {
    listeners = []
    window.removeEventListener('popstate', popStateHandler)
    teardowns.forEach(fn => fn())
  }

  return {
    pauseListeners,
    listen,
    destroy
  }
}
```

关键点：

1. **popstate 事件**：只在浏览器前进/后退时触发，pushState/replaceState 不触发

2. **暂停机制**：`pauseListeners` 用于避免在编程式导航时重复触发回调

3. **方向计算**：通过比较 position 判断是前进还是后退

## 组合返回

`createWebHistory` 将两个组合函数的结果合并：

```typescript
export function createWebHistory(base?: string): RouterHistory {
  base = normalizeBase(base)

  const historyNavigation = useHistoryStateNavigation(base)
  const historyListeners = useHistoryListeners(
    base,
    historyNavigation.state,
    historyNavigation.location,
    historyNavigation.replace
  )

  function go(delta: number, triggerListeners = true) {
    if (!triggerListeners) {
      historyListeners.pauseListeners()
    }
    history.go(delta)
  }

  const routerHistory: RouterHistory = Object.assign(
    {
      // 当前位置和状态
      location: '',
      base,
      go,
      createHref: createHref.bind(null, base)
    },
    historyNavigation,
    historyListeners
  )

  // 使用 getter 确保获取最新值
  Object.defineProperty(routerHistory, 'location', {
    enumerable: true,
    get: () => historyNavigation.location.value
  })

  Object.defineProperty(routerHistory, 'state', {
    enumerable: true,
    get: () => historyNavigation.state.value
  })

  return routerHistory
}
```

`location` 和 `state` 使用 getter 而不是直接赋值，确保每次访问都获取最新值。

## createHref

生成完整的 href 字符串：

```typescript
function createHref(base: string, location: HistoryLocation): string {
  return base.startsWith('#') 
    ? base + location 
    : stripBase(base + location, base)
}
```

对于普通的 web history，这通常返回 base + location。

## 与 Router 的集成

在 `createRouter` 中，history 被这样使用：

```typescript
// 监听 URL 变化
routerHistory.listen((to, from, info) => {
  // 解析新位置
  const targetLocation = resolve(to)
  
  // 执行导航
  navigate(targetLocation, from).then(...)
})

// 编程式导航
function push(to) {
  // ... 处理守卫等
  routerHistory.push(finalLocation.fullPath, { state: ... })
}
```

history 向上提供统一的接口，屏蔽了底层 API 的差异。Router 不需要关心是 hash 模式还是 history 模式。

## 本章小结

`createWebHistory` 实现了基于 HTML5 History API 的路由历史管理：

1. 规范化 base 路径
2. 使用 `pushState`/`replaceState` 操作 URL
3. 监听 `popstate` 事件响应浏览器导航
4. 维护自定义的状态结构（back、current、forward、position、scroll）

它遵循 `RouterHistory` 接口，与 `createWebHashHistory` 和 `createMemoryHistory` 可互换。Router 通过这个统一接口操作 URL，不需要了解底层细节。
