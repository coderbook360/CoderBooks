# useHistoryStateNavigation 导航

`useHistoryStateNavigation` 是 `createWebHistory` 内部使用的另一个组合函数，负责主动操作浏览器的 URL 和状态。它封装了 `history.pushState` 和 `history.replaceState` 的调用。

## 函数签名

```typescript
function useHistoryStateNavigation(base: string): {
  location: Ref<HistoryLocation>
  state: Ref<HistoryState>
  push: (to: HistoryLocation, data?: HistoryState) => void
  replace: (to: HistoryLocation, data?: HistoryState) => void
}
```

返回当前位置和状态的引用，以及 push/replace 方法。

## 初始化

```typescript
function useHistoryStateNavigation(base: string) {
  const { history, location } = window

  // 计算当前位置（从 URL 提取，移除 base）
  const currentLocation: ValueContainer<HistoryLocation> = {
    value: createCurrentLocation(base, location)
  }

  // 当前状态
  const historyState: ValueContainer<HistoryState> = {
    value: history.state
  }

  // 如果是首次访问（state 为 null），初始化状态
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
      true
    )
  }

  // ...
}
```

关键点：

1. **提取当前位置**：从 `window.location` 读取完整 URL，使用 `createCurrentLocation` 移除 base 前缀
2. **读取当前状态**：直接读取 `history.state`
3. **初始化状态**：如果 state 为 null（用户直接访问 URL，没有通过应用导航），创建初始状态

## 状态结构

Vue Router 在 history state 中存储的数据结构：

```typescript
interface HistoryState {
  back: HistoryLocation | null    // 上一个位置
  current: HistoryLocation        // 当前位置
  forward: HistoryLocation | null // 下一个位置
  position: number                // 在历史栈中的位置
  replaced: boolean               // 是否是 replace 操作
  scroll: ScrollPositionCoordinates | null  // 滚动位置
}
```

这个结构让 Router 可以追踪导航历史，计算方向和距离。

为什么不直接用 `history.length`？因为 `history.length` 只能获取总长度，不知道当前在第几个位置。通过维护 `position`，可以准确知道当前位置。

## changeLocation

核心方法，封装对 History API 的调用：

```typescript
function changeLocation(
  to: HistoryLocation,
  state: HistoryState,
  replace: boolean
): void {
  // 构建完整 URL
  const hashIndex = base.indexOf('#')
  const url = hashIndex > -1
    ? (location.host && document.querySelector('base')
        ? base
        : base.slice(hashIndex)) + to
    : createBaseLocation() + base + to

  try {
    // 调用 History API
    history[replace ? 'replaceState' : 'pushState'](state, '', url)
    historyState.value = state
  } catch (err) {
    // Safari 私密模式可能抛出异常
    if (__DEV__) {
      console.error(err)
    }
    // 回退到 location API
    location[replace ? 'replace' : 'assign'](url)
  }
}
```

关键点：

1. **URL 构建**：根据是否是 hash 模式，构建不同格式的 URL
2. **异常处理**：`pushState` 可能失败（如 Safari 私密模式），回退到 `location.assign`
3. **更新引用**：成功后更新 `historyState.value`

`location.assign` 会导致页面刷新，但至少保证了导航能完成。这是优雅降级。

## push 方法

```typescript
function push(to: HistoryLocation, data?: HistoryState): void {
  // 构建新状态，包含当前位置作为 back
  const currentState = Object.assign(
    {},
    historyState.value,
    history.state as Partial<HistoryState> | null,
    {
      forward: to,
      scroll: computeScrollPosition()
    }
  )

  // 先 replace 当前位置（保存滚动位置和 forward 信息）
  changeLocation(currentState.current, currentState, true)

  // 构建目标位置的状态
  const state: HistoryState = Object.assign(
    {},
    buildState(currentLocation.value, to, null),
    { position: currentState.position + 1 },
    data
  )

  // 再 push 新位置
  changeLocation(to, state, false)
  currentLocation.value = to
}
```

push 操作分两步：

1. **Replace 当前位置**：保存滚动位置和 forward 指针
2. **Push 新位置**：添加新的历史记录

为什么需要两步？因为滚动位置只有在离开当前页面时才能确定。先 replace 保存当前状态，再 push 新位置。

## replace 方法

```typescript
function replace(to: HistoryLocation, data?: HistoryState): void {
  const state: HistoryState = Object.assign(
    {},
    history.state,
    buildState(
      historyState.value.back,
      to,
      historyState.value.forward,
      true  // replaced
    ),
    data
  )

  changeLocation(to, state, true)
  currentLocation.value = to
}
```

replace 更简单——直接替换当前位置，保留 back 和 forward 指针。

## buildState

构建状态对象的辅助函数：

```typescript
function buildState(
  back: HistoryLocation | null,
  current: HistoryLocation,
  forward: HistoryLocation | null,
  replaced: boolean = false,
  computeScroll: boolean = false
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
```

## computeScrollPosition

获取当前滚动位置：

```typescript
function computeScrollPosition(): ScrollPositionCoordinates {
  return {
    left: window.pageXOffset,
    top: window.pageYOffset
  }
}
```

这个值会被保存到 history state，在返回时用于恢复滚动位置。

## 与 useHistoryListeners 的配合

这两个函数各司其职：

- `useHistoryStateNavigation`：主动操作（push/replace）
- `useHistoryListeners`：被动响应（popstate）

它们共享 `historyState` 和 `currentLocation` 引用：

```typescript
const historyNavigation = useHistoryStateNavigation(base)
const historyListeners = useHistoryListeners(
  base,
  historyNavigation.state,     // 共享
  historyNavigation.location,  // 共享
  historyNavigation.replace
)
```

当 `useHistoryStateNavigation.push()` 被调用时：

1. 更新 URL 和 state
2. 更新共享的引用

当用户点击后退按钮时：

1. 浏览器触发 popstate
2. `useHistoryListeners` 处理事件
3. 更新共享的引用
4. 通知 Router

## 边界情况处理

**浏览器兼容性**：

```typescript
// 某些旧浏览器 history.state 可能返回 undefined
history.state as Partial<HistoryState> | null
```

使用类型断言处理可能的 undefined。

**Base 标签**：

```typescript
const url = hashIndex > -1
  ? (location.host && document.querySelector('base')
      ? base
      : base.slice(hashIndex)) + to
  : createBaseLocation() + base + to
```

如果页面有 `<base>` 标签且是 hash 模式，需要特殊处理 URL 构建。

**Safari 私密模式**：

```typescript
try {
  history.pushState(state, '', url)
} catch (err) {
  location.assign(url)
}
```

Safari 私密模式下 pushState 可能抛出 QuotaExceededError，回退到 location.assign。

## 本章小结

`useHistoryStateNavigation` 封装了对 History API 的操作：

1. **初始化状态**：首次访问时创建初始 state
2. **push**：两步操作——先保存当前滚动，再添加新记录
3. **replace**：直接替换当前记录
4. **状态结构**：维护 back、current、forward、position、scroll

它与 `useHistoryListeners` 配合，一个负责主动导航，一个负责响应浏览器事件。两者共享状态引用，确保数据一致。

这种分离让每个函数的职责清晰：navigation 管理"往哪去"，listeners 管理"从哪来"。
