# router.go/back/forward 实现

除了 `push` 和 `replace`，Vue Router 还提供了历史导航方法：`go`、`back`、`forward`。它们操作浏览器历史栈，而不是添加新条目。

## 基本用法

```typescript
// 后退一步
router.back()

// 前进一步
router.forward()

// 指定步数
router.go(-2)  // 后退两步
router.go(1)   // 前进一步
router.go(0)   // 刷新当前路由
```

## 源码实现

```typescript
function go(delta: number): void {
  routerHistory.go(delta)
}

function back(): ReturnType<Router['back']> {
  go(-1)
}

function forward(): ReturnType<Router['forward']> {
  go(1)
}
```

实现非常直接，委托给 `routerHistory`。

## routerHistory.go

```typescript
// useHistoryStateNavigation.ts
function go(delta: number, triggerListeners = true): void {
  if (!triggerListeners) {
    pauseListeners()
  }
  history.go(delta)
}
```

直接调用 `history.go()`。`triggerListeners` 参数控制是否触发 `popstate` 监听器。

## 工作原理

历史导航的工作方式与 `push` 不同：

```
用户点击后退按钮 或调用 router.back()
              ↓
        history.go(-1)
              ↓
      浏览器移动历史指针
              ↓
      触发 popstate 事件
              ↓
    routerHistory 监听器处理
              ↓
         navigate()
              ↓
      更新 currentRoute
```

关键区别：`push`/`replace` 先执行守卫再更新 URL，而历史导航先触发 `popstate`，再执行守卫。

## popstate 监听

```typescript
// useHistoryListeners.ts
function setupListeners(callback: NavigationCallback): void {
  window.addEventListener('popstate', popStateHandler)
}

function popStateHandler({ state }: PopStateEvent): void {
  const to = createCurrentLocation(base, location)
  const from = currentLocation.value
  const fromState = historyState.value

  // 更新当前位置
  currentLocation.value = to
  historyState.value = state

  // 判断方向
  const delta = state
    ? state.position - fromState.position
    : 0

  // 通知 Router
  listeners.forEach(callback => {
    callback(to, from, { delta, type: NavigationType.pop, direction: delta > 0 ? 'forward' : 'back' })
  })
}
```

## Router 中的处理

```typescript
// createRouter.ts
routerHistory.listen((to, from, info) => {
  // 解析目标路由
  const toLocation = resolve(to)
  
  // 执行导航
  navigate(toLocation, from)
    .catch((error) => {
      if (isNavigationFailure(error, ErrorTypes.NAVIGATION_ABORTED)) {
        // 守卫阻止：恢复历史位置
        routerHistory.go(-info.delta, false)
      }
      return error
    })
    .then((failure) => {
      if (!failure) {
        // 成功：更新状态
        finalizeNavigation(toLocation, from, false, false)
      }
      triggerAfterEach(toLocation, from, failure)
    })
})
```

## 守卫阻止时的处理

如果守卫返回 `false`，需要恢复历史位置：

```typescript
router.beforeEach((to, from) => {
  if (to.path === '/protected') {
    return false  // 阻止导航
  }
})

// 用户点击后退，要去 /protected
// → 守卫返回 false
// → 调用 routerHistory.go(-info.delta, false) 恢复位置
// → false 参数避免再次触发 popstate 监听
```

## pauseListeners

临时暂停监听器：

```typescript
function go(delta: number, triggerListeners = true): void {
  if (!triggerListeners) {
    pauseListeners()
  }
  history.go(delta)
}

function pauseListeners(): void {
  pauseState = currentLocation.value
}

function popStateHandler({ state }: PopStateEvent): void {
  // 检查是否暂停
  if (pauseState && pauseState === currentLocation.value) {
    pauseState = null
    return  // 不触发回调
  }
  // ...正常处理
}
```

恢复历史位置时使用 `triggerListeners = false`，避免无限循环。

## go(0) 的特殊情况

```typescript
router.go(0)
```

相当于刷新当前路由，会触发完整的守卫流程：

```typescript
// 当前在 /dashboard
router.go(0)

// → popstate 触发
// → from: /dashboard
// → to: /dashboard
// → 执行 beforeRouteUpdate（因为同一组件）
// → afterEach
```

## 与 push 的区别

| 特性 | push/replace | go/back/forward |
|------|--------------|-----------------|
| 触发方式 | 主动调用 | popstate 事件 |
| URL 更新时机 | 守卫后 | 守卫前（浏览器已移动） |
| 阻止后处理 | 不改变 URL | 需要恢复历史位置 |
| 返回值 | Promise | void |

## 本章小结

`go`、`back`、`forward` 是历史导航方法：

1. **直接委托**：调用 `history.go()`
2. **popstate 驱动**：浏览器先移动，再触发事件
3. **守卫阻止**：需要用 `go(-delta)` 恢复位置
4. **pauseListeners**：避免恢复时的无限循环

理解历史导航与普通导航的区别，有助于正确处理守卫中的复杂场景。
