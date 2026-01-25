# router.push 实现

`push` 是最常用的导航方法，将新路由推入历史栈。它是异步的，返回 Promise，支持完整的导航守卫流程。

## 基本用法

```typescript
// 字符串路径
await router.push('/users/123')

// 对象形式
await router.push({ path: '/users/123', query: { tab: 'posts' } })

// 命名路由
await router.push({ name: 'user', params: { id: '123' } })
```

## 源码结构

```typescript
function push(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined> {
  return pushWithRedirect(to)
}

function pushWithRedirect(
  to: RouteLocationRaw | RouteLocation,
  redirectedFrom?: RouteLocation
): Promise<NavigationFailure | void | undefined> {
  // 解析目标路由
  const targetLocation = (pendingLocation = resolve(to))
  
  // 当前路由
  const from = currentRoute.value
  
  // 获取 state 数据
  const data: HistoryState | undefined = (to as RouteLocationOptions).state
  
  // 是否强制导航
  const force: boolean | undefined = (to as RouteLocationOptions).force
  
  // 是否替换而非推入
  const replace = (to as RouteLocationOptions).replace === true

  // 处理重定向
  const shouldRedirect = handleRedirectRecord(targetLocation)
  
  if (shouldRedirect) {
    return pushWithRedirect(
      Object.assign(shouldRedirect, { state: data, force, replace }),
      redirectedFrom || targetLocation
    )
  }

  // 实际执行导航
  const toLocation = targetLocation as RouteLocationNormalized

  // 设置重定向来源
  toLocation.redirectedFrom = redirectedFrom

  // 检查是否同一路由
  if (!force && isSameRouteLocation(from, targetLocation)) {
    const failure = createRouterError<NavigationFailure>(
      ErrorTypes.NAVIGATION_DUPLICATED,
      { to: toLocation, from }
    )
    // 触发 afterEach 守卫
    triggerAfterEach(from, from, failure)
    return Promise.reject(failure)
  }

  // 执行导航
  return navigate(toLocation, from)
    .then((failure) => {
      if (failure) {
        // 处理重定向
        if (isNavigationFailure(failure, ErrorTypes.NAVIGATION_GUARD_REDIRECT)) {
          return pushWithRedirect(
            Object.assign((failure as any).to, { state: data, force, replace }),
            redirectedFrom || toLocation
          )
        }
      } else {
        // 成功：更新 URL
        failure = finalizeNavigation(
          toLocation,
          from,
          true, // isPush
          replace
        )
      }
      // 触发 afterEach
      triggerAfterEach(toLocation, from, failure)
      return failure
    })
}
```

## 核心流程

整个导航分为几个阶段：

```
push(to)
    ↓
resolve(to)           // 解析目标路由
    ↓
handleRedirectRecord  // 处理重定向
    ↓
navigate()            // 执行导航守卫
    ↓
finalizeNavigation()  // 更新 URL 和 currentRoute
    ↓
triggerAfterEach()    // 触发 afterEach
```

## pendingLocation

`pendingLocation` 记录正在进行的导航目标：

```typescript
let pendingLocation: RouteLocation = START_LOCATION_NORMALIZED

const targetLocation = (pendingLocation = resolve(to))
```

用于处理快速连续导航：

```typescript
// 快速点击
router.push('/a')  // pendingLocation = /a
router.push('/b')  // pendingLocation = /b

// 第一次导航完成时，检查
if (from !== pendingLocation) {
  // 已经有新的导航，取消当前
  return createRouterError(ErrorTypes.NAVIGATION_CANCELLED)
}
```

## 重定向处理

```typescript
function handleRedirectRecord(to: RouteLocation): RouteLocationRaw | void {
  const lastMatched = to.matched[to.matched.length - 1]
  
  if (lastMatched && lastMatched.redirect) {
    const { redirect } = lastMatched
    
    // 函数形式
    let newTargetLocation = typeof redirect === 'function' 
      ? redirect(to) 
      : redirect

    return newTargetLocation
  }
}
```

重定向会递归调用 `pushWithRedirect`：

```typescript
// 路由配置
{ path: '/home', redirect: '/dashboard' }

// push('/home')
// → handleRedirectRecord 返回 '/dashboard'
// → pushWithRedirect('/dashboard', 原始位置)
```

## navigate 函数

执行完整的守卫流程：

```typescript
function navigate(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): Promise<NavigationFailure | void> {
  // 提取守卫
  const [
    leavingRecords,
    updatingRecords,
    enteringRecords
  ] = extractChangingRecords(to, from)

  // 构建守卫队列
  let guards: NavigationGuard[] = extractComponentsGuards(
    leavingRecords.reverse(),
    'beforeRouteLeave',
    to,
    from
  )

  // 添加离开组件的守卫
  for (const record of leavingRecords) {
    for (const guard of record.leaveGuards) {
      guards.push(guardToPromiseFn(guard, to, from))
    }
  }

  // 检查是否被取消
  const canceledNavigationCheck = checkCanceledNavigationAndReject.bind(null, to, from)

  guards.push(canceledNavigationCheck)

  // 链式执行守卫
  return runGuardQueue(guards)
    .then(() => {
      // beforeEach 守卫
      guards = []
      for (const guard of beforeGuards.list()) {
        guards.push(guardToPromiseFn(guard, to, from))
      }
      guards.push(canceledNavigationCheck)
      return runGuardQueue(guards)
    })
    .then(() => {
      // beforeRouteUpdate 守卫
      guards = extractComponentsGuards(
        updatingRecords,
        'beforeRouteUpdate',
        to,
        from
      )
      for (const record of updatingRecords) {
        for (const guard of record.updateGuards) {
          guards.push(guardToPromiseFn(guard, to, from))
        }
      }
      guards.push(canceledNavigationCheck)
      return runGuardQueue(guards)
    })
    .then(() => {
      // beforeEnter 守卫
      guards = []
      for (const record of to.matched) {
        if (record.beforeEnter && !from.matched.includes(record)) {
          if (Array.isArray(record.beforeEnter)) {
            for (const beforeEnter of record.beforeEnter) {
              guards.push(guardToPromiseFn(beforeEnter, to, from))
            }
          } else {
            guards.push(guardToPromiseFn(record.beforeEnter, to, from))
          }
        }
      }
      guards.push(canceledNavigationCheck)
      return runGuardQueue(guards)
    })
    .then(() => {
      // 解析异步组件
      to.matched.forEach(record => {
        record.enterCallbacks = {}
      })
      guards = extractComponentsGuards(
        enteringRecords,
        'beforeRouteEnter',
        to,
        from
      )
      guards.push(canceledNavigationCheck)
      return runGuardQueue(guards)
    })
    .then(() => {
      // beforeResolve 守卫
      guards = []
      for (const guard of beforeResolveGuards.list()) {
        guards.push(guardToPromiseFn(guard, to, from))
      }
      guards.push(canceledNavigationCheck)
      return runGuardQueue(guards)
    })
    .catch(err => {
      if (isNavigationFailure(err, ErrorTypes.NAVIGATION_ABORTED)) {
        return err as NavigationFailure
      }
      if (isNavigationFailure(err, ErrorTypes.NAVIGATION_GUARD_REDIRECT)) {
        return err
      }
      // 其他错误传给 onError
      return triggerError(err, to, from)
    })
}
```

## finalizeNavigation

导航成功后更新状态：

```typescript
function finalizeNavigation(
  toLocation: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  isPush: boolean,
  replace?: boolean
): NavigationFailure | void {
  // 检查是否已取消
  if (from !== pendingLocation) {
    return createRouterError(ErrorTypes.NAVIGATION_CANCELLED, {
      from,
      to: toLocation
    })
  }

  // 判断是否使用 replace
  const isFirstNavigation = from === START_LOCATION_NORMALIZED
  const state = !isBrowser ? {} : history.state

  if (isPush) {
    if (replace || isFirstNavigation) {
      routerHistory.replace(toLocation.fullPath, {
        ...state,
        ...toLocation.state,
        ...buildState(
          null,
          toLocation,
          null,
          true // 替换
        )
      })
    } else {
      routerHistory.push(toLocation.fullPath, {
        ...state,
        ...toLocation.state,
        ...buildState(
          state.current,
          toLocation,
          state.forward,
          true
        )
      })
    }
  }

  // 更新 currentRoute
  currentRoute.value = toLocation as RouteLocationNormalizedLoaded

  // 处理滚动
  handleScroll(toLocation, from, isPush, isFirstNavigation)
}
```

## 返回值

```typescript
// 成功
const result = await router.push('/dashboard')
result === undefined

// 失败：重复导航
try {
  await router.push('/current-page')
} catch (failure) {
  failure.type === NavigationFailureType.duplicated
}

// 失败：被守卫取消
try {
  await router.push('/protected')
} catch (failure) {
  failure.type === NavigationFailureType.aborted
}
```

## 与 replace 的区别

```typescript
function replace(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined> {
  return push(Object.assign({}, typeof to === 'string' ? { path: to } : to, { replace: true }))
}
```

`replace` 只是带 `replace: true` 的 `push`。

## 本章小结

`push` 是完整导航流程的入口：

1. **解析目标**：resolve 获取目标路由
2. **处理重定向**：递归调用直到无重定向
3. **执行守卫**：按顺序执行所有守卫
4. **更新状态**：修改 URL 和 currentRoute
5. **触发回调**：执行 afterEach 守卫

理解 push 的实现，有助于调试导航问题和正确使用导航守卫。
