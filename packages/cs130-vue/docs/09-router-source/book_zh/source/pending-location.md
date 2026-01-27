# pendingLocation 与导航取消

当用户快速连续点击不同链接时，会产生多个导航请求。`pendingLocation` 是 Vue Router 处理这种场景的核心机制。

## 问题场景

```typescript
// 用户快速点击
router.push('/a')  // 导航 1，耗时 100ms（异步组件）
router.push('/b')  // 导航 2，10ms 后触发
router.push('/c')  // 导航 3，20ms 后触发
```

如果不处理，最终会按顺序完成所有导航，用户看到页面闪烁：`/a → /b → /c`。

期望行为：只完成最后一次导航，用户只看到 `/c`。

## pendingLocation 的定义

```typescript
// createRouter.ts
let pendingLocation: RouteLocation = START_LOCATION_NORMALIZED
```

记录当前正在进行的导航目标。

## 设置时机

每次导航开始时更新：

```typescript
function pushWithRedirect(to, redirectedFrom) {
  // 更新 pendingLocation
  const targetLocation = (pendingLocation = resolve(to))
  
  // ...后续流程
}
```

这意味着：
- 导航 1 开始：`pendingLocation = /a`
- 导航 2 开始：`pendingLocation = /b`（覆盖）
- 导航 3 开始：`pendingLocation = /c`（再次覆盖）

## 检查时机

在守卫链的关键节点检查：

```typescript
function navigate(to, from) {
  const canceledNavigationCheck = checkCanceledNavigationAndReject.bind(null, to, from)

  guards.push(canceledNavigationCheck)  // 每阶段后检查
  
  return runGuardQueue(guards)
    .then(() => {
      guards.push(canceledNavigationCheck)
      return runGuardQueue(nextGuards)
    })
    // ...
}
```

## 检查逻辑

```typescript
function checkCanceledNavigationAndReject(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): Promise<void> {
  const error = checkCanceledNavigation(to, from)
  return error ? Promise.reject(error) : Promise.resolve()
}

function checkCanceledNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): NavigationFailure | void {
  if (pendingLocation !== to) {
    return createRouterError(
      ErrorTypes.NAVIGATION_CANCELLED,
      { from, to }
    )
  }
}
```

如果当前导航的目标不再是 `pendingLocation`，说明有更新的导航，当前导航应该取消。

## 取消后的处理

```typescript
return navigate(toLocation, from)
  .then((failure) => {
    // 导航被取消时，failure 是 NAVIGATION_CANCELLED
    if (isNavigationFailure(failure, ErrorTypes.NAVIGATION_CANCELLED)) {
      // 静默处理，不报错
      return failure
    }
    // ...
  })
```

取消的导航不会触发错误回调，只是静默结束。

## 完整流程示例

```
t=0ms:   push('/a')
         pendingLocation = /a
         开始执行守卫

t=10ms:  push('/b')
         pendingLocation = /b（覆盖）
         开始执行守卫

t=20ms:  push('/c')
         pendingLocation = /c（覆盖）
         开始执行守卫

t=50ms:  导航 1 守卫阶段检查
         pendingLocation=/c ≠ /a
         返回 NAVIGATION_CANCELLED

t=60ms:  导航 2 守卫阶段检查
         pendingLocation=/c ≠ /b
         返回 NAVIGATION_CANCELLED

t=100ms: 导航 3 守卫完成
         pendingLocation=/c === /c
         继续 finalizeNavigation
         用户看到 /c
```

## finalizeNavigation 中的最终检查

导航最后一步也要检查：

```typescript
function finalizeNavigation(toLocation, from, isPush, replace) {
  if (from !== pendingLocation) {
    return createRouterError(ErrorTypes.NAVIGATION_CANCELLED, {
      from,
      to: toLocation
    })
  }
  
  // 更新 URL 和 currentRoute
  // ...
}
```

这是双重保险，防止守卫执行完到 finalize 之间又有新导航。

## afterEach 的行为

取消的导航仍会触发 `afterEach`：

```typescript
.then((failure) => {
  // 无论成功失败，都触发 afterEach
  triggerAfterEach(toLocation, from, failure)
  return failure
})
```

在 `afterEach` 中可以检测取消：

```typescript
router.afterEach((to, from, failure) => {
  if (isNavigationFailure(failure, NavigationFailureType.cancelled)) {
    console.log('导航被取消:', from.path, '→', to.path)
  }
})
```

## popstate 导航的特殊性

历史导航（后退/前进）的取消处理不同：

```typescript
routerHistory.listen((to, from, info) => {
  const toLocation = resolve(to)
  
  // 注意：这里没有更新 pendingLocation
  // 因为 URL 已经变了，需要特殊处理
  
  navigate(toLocation, from)
    .catch((error) => {
      if (isNavigationFailure(error, ErrorTypes.NAVIGATION_CANCELLED)) {
        // 恢复历史位置
        routerHistory.go(-info.delta, false)
      }
    })
})
```

popstate 导航被取消时，需要恢复历史位置，因为浏览器已经移动了。

## 与重复导航的区别

```typescript
// NAVIGATION_DUPLICATED: 导航到当前位置
router.push('/current')  // 当前就在 /current

// NAVIGATION_CANCELLED: 被新导航取消
router.push('/a')
router.push('/b')  // /a 被取消
```

两者处理方式不同：

```typescript
if (!force && isSameRouteLocation(from, targetLocation)) {
  // DUPLICATED: 同一位置，直接返回失败
  const failure = createRouterError(ErrorTypes.NAVIGATION_DUPLICATED, { to, from })
  triggerAfterEach(from, from, failure)
  return Promise.reject(failure)
}
```

## 本章小结

`pendingLocation` 是处理连续导航的核心：

1. **记录目标**：每次导航开始时更新
2. **检查取消**：在守卫链和 finalize 中检查
3. **静默处理**：取消的导航不报错，只返回失败
4. **popstate 特殊**：需要恢复历史位置

这个机制确保了快速连续点击时，用户只看到最终目的地，不会出现页面闪烁。
