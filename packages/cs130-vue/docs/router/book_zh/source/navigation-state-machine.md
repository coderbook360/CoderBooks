# 导航流程状态机

Vue Router 的导航是一个复杂的异步流程，涉及多个状态和转换。理解这个状态机有助于调试导航问题。

## 导航状态

```typescript
enum NavigationState {
  IDLE,           // 空闲，等待导航
  RESOLVING,      // 解析目标路由
  GUARDS,         // 执行守卫
  REDIRECTING,    // 处理重定向
  FINALIZING,     // 更新 URL 和状态
  COMPLETED,      // 完成
  FAILED          // 失败
}
```

## 状态转换图

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  push()/replace()                                       │
│       ↓                                                 │
│  ┌─────────┐                                            │
│  │  IDLE   │←───────────────────────────────────────────┤
│  └────┬────┘                                            │
│       ↓                                                 │
│  ┌─────────────┐                                        │
│  │ RESOLVING   │── 找不到匹配 ──→ FAILED ───┐           │
│  └──────┬──────┘                            │           │
│         ↓                                   ↓           │
│  ┌─────────────┐     有重定向      ┌─────────┐          │
│  │   GUARDS    │←────────────────←│REDIRECTING│         │
│  │             │── 守卫 redirect ─→└─────────┘          │
│  └──────┬──────┘                            │           │
│         │                                   │           │
│    守卫 false ──────────────────→ FAILED ───┤           │
│         │                                   │           │
│    守卫通过                                 │           │
│         ↓                                   ↓           │
│  ┌─────────────┐                   ┌────────────┐       │
│  │ FINALIZING  │──────────────────→│ COMPLETED  │───────┤
│  └─────────────┘                   └────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 代码中的状态管理

Vue Router 没有显式的状态机，但通过变量和 Promise 链隐式管理状态：

```typescript
// 当前导航状态（隐式）
let pendingLocation: RouteLocation = START_LOCATION_NORMALIZED

function pushWithRedirect(to, redirectedFrom) {
  // RESOLVING 阶段
  const targetLocation = (pendingLocation = resolve(to))
  
  // 检查重定向
  const shouldRedirect = handleRedirectRecord(targetLocation)
  
  if (shouldRedirect) {
    // REDIRECTING 阶段
    return pushWithRedirect(shouldRedirect, redirectedFrom || targetLocation)
  }

  // GUARDS 阶段
  return navigate(toLocation, from)
    .then((failure) => {
      if (failure) {
        if (isNavigationFailure(failure, ErrorTypes.NAVIGATION_GUARD_REDIRECT)) {
          // 守卫重定向
          return pushWithRedirect(failure.to, redirectedFrom || toLocation)
        }
        // FAILED
      } else {
        // FINALIZING 阶段
        finalizeNavigation(toLocation, from, true, replace)
        // COMPLETED
      }
      triggerAfterEach(toLocation, from, failure)
      return failure
    })
}
```

## 守卫阶段的子状态

守卫阶段内部也有明确的顺序：

```
beforeRouteLeave (组件)
        ↓
  beforeEach (全局)
        ↓
beforeRouteUpdate (组件)
        ↓
  beforeEnter (路由)
        ↓
解析异步组件
        ↓
beforeRouteEnter (组件)
        ↓
beforeResolve (全局)
```

每个阶段都可能：
- 返回 `false` → FAILED
- 返回新位置 → REDIRECTING
- 抛出错误 → FAILED
- 正常通过 → 下一阶段

## 取消导航

快速连续导航时，旧导航会被取消：

```typescript
// 用户快速点击
router.push('/a')  // 导航 1
router.push('/b')  // 导航 2

// 导航 1 在守卫阶段
// 导航 2 开始，pendingLocation 变为 /b
// 导航 1 守卫完成后检查：
if (to !== pendingLocation) {
  // 返回 CANCELLED
  return createRouterError(ErrorTypes.NAVIGATION_CANCELLED)
}
```

## 取消检查点

在守卫链中多次检查：

```typescript
function navigate(to, from) {
  const canceledNavigationCheck = checkCanceledNavigationAndReject.bind(null, to, from)

  return runGuardQueue(leaveGuards)
    .then(() => {
      guards.push(canceledNavigationCheck)  // 检查点 1
      return runGuardQueue(beforeEachGuards)
    })
    .then(() => {
      guards.push(canceledNavigationCheck)  // 检查点 2
      return runGuardQueue(updateGuards)
    })
    // ...每个阶段后都检查
}

function checkCanceledNavigationAndReject(to, from) {
  if (pendingLocation !== to) {
    return Promise.reject(
      createRouterError(ErrorTypes.NAVIGATION_CANCELLED, { from, to })
    )
  }
}
```

## popstate 导航的状态

历史导航（后退/前进）的状态略有不同：

```
浏览器移动历史 → popstate 事件
                     ↓
                RESOLVING
                     ↓
                  GUARDS
                     ↓
         ┌──── 守卫通过 ────┬─── 守卫阻止 ───┐
         ↓                 ↓                ↓
    FINALIZING        恢复历史位置        FAILED
         ↓                 ↓                │
    COMPLETED            IDLE              │
         └────────────────┴────────────────┘
```

守卫阻止时需要恢复历史位置：

```typescript
routerHistory.listen((to, from, info) => {
  navigate(toLocation, from)
    .catch((error) => {
      if (isNavigationFailure(error, ErrorTypes.NAVIGATION_ABORTED)) {
        // 恢复历史位置
        routerHistory.go(-info.delta, false)
      }
    })
})
```

## 错误状态

不同类型的导航失败：

```typescript
enum ErrorTypes {
  MATCHER_NOT_FOUND = 1,      // 找不到匹配路由
  NAVIGATION_GUARD_REDIRECT,  // 守卫重定向
  NAVIGATION_ABORTED,         // 守卫返回 false
  NAVIGATION_CANCELLED,       // 被新导航取消
  NAVIGATION_DUPLICATED       // 重复导航到当前路由
}
```

每种错误的处理方式不同：

```typescript
// REDIRECT: 递归调用 pushWithRedirect
// ABORTED: 直接返回失败
// CANCELLED: 静默忽略
// DUPLICATED: 返回失败但触发 afterEach
```

## 调试导航状态

```typescript
router.beforeEach((to, from) => {
  console.log('[beforeEach] from:', from.path, 'to:', to.path)
})

router.afterEach((to, from, failure) => {
  if (failure) {
    console.log('[afterEach] failed:', failure.type, failure.message)
  } else {
    console.log('[afterEach] success:', to.path)
  }
})
```

## 本章小结

导航状态机帮助理解 Vue Router 的工作流程：

1. **主要状态**：IDLE → RESOLVING → GUARDS → FINALIZING → COMPLETED
2. **分支状态**：REDIRECTING、FAILED
3. **取消机制**：通过 `pendingLocation` 检测
4. **popstate 特殊性**：URL 先变，守卫后执行，失败需恢复

理解状态机有助于调试复杂的导航场景和守卫逻辑。
