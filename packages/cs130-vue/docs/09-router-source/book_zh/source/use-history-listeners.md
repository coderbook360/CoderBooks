# useHistoryListeners 监听器

`useHistoryListeners` 是 `createWebHistory` 内部使用的组合函数，负责监听浏览器的前进后退事件。它将底层的 `popstate` 事件转换为 Vue Router 可以处理的回调。

## 函数签名

```typescript
function useHistoryListeners(
  base: string,
  historyState: { value: HistoryState },
  currentLocation: { value: HistoryLocation },
  replace: RouterHistory['replace']
): {
  pauseListeners: () => void
  listen: (callback: NavigationCallback) => () => void
  destroy: () => void
}
```

参数说明：

- `base`：基础路径，用于从 URL 提取相对路径
- `historyState`：当前的历史状态引用
- `currentLocation`：当前位置的引用
- `replace`：replace 方法的引用，用于更新状态

## 核心结构

```typescript
function useHistoryListeners(base, historyState, currentLocation, replace) {
  // 监听器列表
  let listeners: NavigationCallback[] = []
  
  // 清理函数列表
  let teardowns: (() => void)[] = []
  
  // 暂停标志
  let pauseState: HistoryLocation | null = null

  // ... 方法定义

  // 注册 popstate 事件
  window.addEventListener('popstate', popStateHandler)
  
  // 处理 beforeunload
  window.addEventListener('beforeunload', beforeUnloadHandler)

  return {
    pauseListeners,
    listen,
    destroy
  }
}
```

这个函数维护了监听器列表，并注册了浏览器事件处理器。

## popstate 事件处理

`popstate` 事件在用户点击前进/后退按钮时触发：

```typescript
function popStateHandler({ state }: PopStateEvent) {
  // 计算新的位置
  const to = createCurrentLocation(base, location)
  const from = currentLocation.value
  const fromState = historyState.value

  // 更新引用
  currentLocation.value = to
  historyState.value = state

  // 如果处于暂停状态，跳过监听器
  if (pauseState && pauseState === from) {
    pauseState = null
    return
  }

  // 计算导航方向和距离
  const delta = fromState 
    ? state.position - fromState.position 
    : 0

  // 通知所有监听器
  listeners.forEach(listener => {
    listener(to, from, {
      delta,
      type: NavigationType.pop,
      direction: delta > 0 
        ? NavigationDirection.forward 
        : NavigationDirection.back
    })
  })
}
```

关键步骤：

1. **获取新位置**：使用 `createCurrentLocation` 从 `window.location` 提取路径
2. **保存旧状态**：在更新引用前保存，用于传给监听器
3. **更新引用**：同步 `currentLocation` 和 `historyState`
4. **暂停检查**：如果 `pauseState` 匹配当前位置，跳过监听器
5. **计算导航信息**：通过比较 position 确定方向和距离
6. **通知监听器**：调用所有注册的回调

## createCurrentLocation

这个辅助函数从浏览器 location 对象提取路径：

```typescript
function createCurrentLocation(
  base: string,
  location: Location
): HistoryLocation {
  const { pathname, search, hash } = location
  
  // hash 模式处理
  const hashPos = base.indexOf('#')
  if (hashPos > -1) {
    let pathFromHash = hash.includes(base.slice(hashPos))
      ? hash.slice(base.length - hashPos)
      : hash.slice(1)
    return pathFromHash + search
  }

  // 普通模式：从 pathname 移除 base
  const path = stripBase(pathname, base)
  return path + search + hash
}
```

它处理两种情况：

1. **Hash 模式**（base 包含 `#`）：从 `location.hash` 提取路径
2. **普通模式**：从 `location.pathname` 移除 base 前缀

## 暂停机制

暂停机制用于避免在编程式导航时重复触发回调：

```typescript
function pauseListeners() {
  pauseState = currentLocation.value
}
```

当 Router 调用 `history.push()` 后，可能会触发 `popstate`（在某些边界情况下）。通过设置 `pauseState`，可以跳过这次事件。

```typescript
// popStateHandler 中的暂停检查
if (pauseState && pauseState === from) {
  pauseState = null
  return
}
```

如果 `pauseState` 等于事件触发前的位置，说明这次 popstate 应该被忽略。

## listen 方法

注册导航回调：

```typescript
function listen(callback: NavigationCallback) {
  listeners.push(callback)

  const teardown = () => {
    const index = listeners.indexOf(callback)
    if (index > -1) listeners.splice(index, 1)
  }

  teardowns.push(teardown)
  return teardown
}
```

返回一个取消函数，调用它可以移除这个监听器。这种模式在 Vue 生态中很常见。

## beforeunload 处理

```typescript
function beforeUnloadHandler() {
  const { history } = window
  if (!history.state) return
  
  // 保存当前滚动位置
  history.replaceState(
    {
      ...history.state,
      scroll: computeScrollPosition()
    },
    ''
  )
}

window.addEventListener('beforeunload', beforeUnloadHandler, { passive: true })
```

当用户关闭页面或刷新时，保存当前的滚动位置到 history state。这样返回时可以恢复滚动位置。

`{ passive: true }` 告诉浏览器这个处理器不会调用 `preventDefault()`，允许浏览器优化。

## destroy 方法

清理所有资源：

```typescript
function destroy() {
  // 移除所有监听器
  for (const teardown of teardowns) {
    teardown()
  }

  // 清空数组
  listeners = []
  teardowns = []

  // 移除事件处理器
  window.removeEventListener('popstate', popStateHandler)
  window.removeEventListener('beforeunload', beforeUnloadHandler)
}
```

在 Router 销毁时调用，避免内存泄漏。

## 与 Router 的集成

在 `createRouter` 中，Router 会调用 `listen`：

```typescript
// router.ts
routerHistory.listen((to, _from, info) => {
  // 解析新位置
  const toLocation = resolve(to)

  // 检查是否应该继续
  pendingLocation = toLocation
  
  // 执行导航
  navigate(toLocation, from)
    .catch((error) => {
      // 处理错误，可能需要回退
      if (isNavigationFailure(error, ErrorTypes.NAVIGATION_ABORTED)) {
        routerHistory.go(-info.delta, false)
      }
    })
    .then(() => {
      // 完成导航
    })
})
```

当浏览器前进/后退时，这个回调被触发，Router 执行完整的导航流程（包括守卫）。

如果守卫中止了导航，Router 会调用 `go(-delta)` 回到原来的位置，并传入 `false` 跳过监听器，避免无限循环。

## NavigationCallback 类型

```typescript
type NavigationCallback = (
  to: HistoryLocation,
  from: HistoryLocation,
  information: NavigationInformation
) => void

interface NavigationInformation {
  type: NavigationType
  direction: NavigationDirection
  delta: number
}

enum NavigationType {
  pop = 'pop',
  push = 'push'
}

enum NavigationDirection {
  back = 'back',
  forward = 'forward',
  unknown = ''
}
```

回调接收三个参数：目标位置、来源位置、导航信息。导航信息包括类型（popstate 都是 pop）、方向、移动距离。

## 本章小结

`useHistoryListeners` 封装了浏览器的 `popstate` 事件监听：

1. **监听 popstate**：用户前进/后退时触发
2. **计算导航信息**：提取方向和距离
3. **通知回调**：调用所有注册的监听器
4. **暂停机制**：避免编程式导航时重复触发
5. **保存滚动**：在 beforeunload 时保存滚动位置

它与 `useHistoryStateNavigation` 配合，一个负责主动操作 URL，一个负责被动响应 URL 变化。Router 通过 `listen` 注册回调，将 URL 变化转换为应用内的导航流程。
