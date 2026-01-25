# afterEach 守卫

`afterEach` 在导航完成后触发，无论成功还是失败。它不能阻止或修改导航，只用于副作用操作。

## 基本用法

```typescript
router.afterEach((to, from, failure) => {
  if (failure) {
    console.log('Navigation failed:', failure.type)
  } else {
    console.log('Navigated to:', to.path)
  }
})
```

## 源码实现

```typescript
// createRouter.ts
const afterGuards = useCallbacks<NavigationHookAfter>()

function afterEach(guard: NavigationHookAfter): () => void {
  return afterGuards.add(guard)
}
```

## 触发时机

在 `pushWithRedirect` 最后调用：

```typescript
function pushWithRedirect(to, redirectedFrom) {
  return navigate(toLocation, from)
    .then((failure) => {
      if (!failure) {
        // 导航成功
        finalizeNavigation(toLocation, from, true, replace)
      }
      
      // 无论成功失败都触发 afterEach
      triggerAfterEach(toLocation, from, failure)
      
      return failure
    })
}
```

## triggerAfterEach

```typescript
function triggerAfterEach(
  to: RouteLocationNormalizedLoaded,
  from: RouteLocationNormalizedLoaded,
  failure?: NavigationFailure | void
): void {
  for (const guard of afterGuards.list()) {
    guard(to, from, failure)
  }
}
```

与其他守卫不同，`afterEach` 是同步执行的，不返回 Promise。

## failure 参数

第三个参数包含失败信息：

```typescript
router.afterEach((to, from, failure) => {
  if (!failure) {
    // 导航成功
    return
  }

  // 检查失败类型
  if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    console.log('Navigation aborted by guard')
  }
  
  if (isNavigationFailure(failure, NavigationFailureType.cancelled)) {
    console.log('Navigation cancelled by new navigation')
  }
  
  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    console.log('Already at target location')
  }
})
```

## NavigationFailureType

```typescript
enum NavigationFailureType {
  aborted = 4,     // 守卫返回 false
  cancelled = 8,   // 被新导航取消
  duplicated = 16  // 重复导航到当前位置
}

// isNavigationFailure 工具函数
function isNavigationFailure(
  error: any,
  type?: NavigationFailureType
): error is NavigationFailure {
  return error instanceof Error && 
    'type' in error && 
    (type == null || (error.type & type) !== 0)
}
```

## 典型使用场景

**页面追踪**：

```typescript
router.afterEach((to, from, failure) => {
  if (!failure) {
    // 发送页面浏览事件
    analytics.trackPageView({
      path: to.path,
      title: to.meta.title,
      referrer: from.path
    })
  }
})
```

**进度条结束**：

```typescript
import NProgress from 'nprogress'

router.beforeEach(() => {
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})
```

**滚动位置记录**：

```typescript
const scrollPositions = new Map<string, { x: number; y: number }>()

router.beforeEach((to, from) => {
  // 保存当前滚动位置
  scrollPositions.set(from.fullPath, {
    x: window.scrollX,
    y: window.scrollY
  })
})

router.afterEach((to) => {
  // 恢复或滚动到顶部
  const pos = scrollPositions.get(to.fullPath) || { x: 0, y: 0 }
  window.scrollTo(pos.x, pos.y)
})
```

**错误监控**：

```typescript
router.afterEach((to, from, failure) => {
  if (failure) {
    errorMonitor.report({
      type: 'navigation_failure',
      from: from.path,
      to: to.path,
      failureType: failure.type,
      message: failure.message
    })
  }
})
```

## 与 beforeEach 的配合

```typescript
// 计算导航耗时
const navStartTimes = new Map<string, number>()

router.beforeEach((to) => {
  navStartTimes.set(to.fullPath, Date.now())
})

router.afterEach((to, from, failure) => {
  const startTime = navStartTimes.get(to.fullPath)
  if (startTime) {
    const duration = Date.now() - startTime
    console.log(`Navigation to ${to.path} took ${duration}ms`)
    navStartTimes.delete(to.fullPath)
  }
})
```

## 注意事项

**不能阻止导航**：

```typescript
router.afterEach((to) => {
  // ❌ 这不会阻止导航，导航已完成
  return false
  
  // ❌ 这不会重定向
  return '/other'
})
```

**不是异步**：

```typescript
router.afterEach(async (to) => {
  // ✅ 可以执行异步操作
  await saveAnalytics(to)
  // 但导航不会等待这个完成
})
```

**失败时 to 的含义**：

```typescript
router.afterEach((to, from, failure) => {
  if (failure) {
    // to 是目标位置（未到达）
    // from 是当前位置（实际还在这里）
    console.log('Tried to go to:', to.path)
    console.log('Still at:', from.path)
  }
})
```

## 本章小结

`afterEach` 是导航完成后的回调：

1. **始终触发**：无论导航成功还是失败
2. **failure 参数**：包含失败原因和类型
3. **不能干预**：无法阻止或修改导航
4. **同步执行**：不等待异步操作
5. **使用场景**：追踪、日志、进度条、错误监控

理解 `afterEach` 有助于实现导航相关的副作用逻辑。
