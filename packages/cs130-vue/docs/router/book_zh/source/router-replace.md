# router.replace 实现

`replace` 与 `push` 功能相似，但不会在历史记录中添加新条目。它替换当前条目，用户无法通过后退按钮返回。

## 基本用法

```typescript
// 替换当前路由
await router.replace('/login')

// 对象形式
await router.replace({ 
  name: 'search', 
  query: { q: 'vue' } 
})
```

## 源码实现

```typescript
function replace(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined> {
  return push(
    Object.assign({}, typeof to === 'string' ? { path: to } : to, { replace: true })
  )
}
```

实现非常简洁：在目标对象上添加 `replace: true`，然后调用 `push`。

## 在 push 中的处理

`pushWithRedirect` 检查 replace 标志：

```typescript
function pushWithRedirect(to: RouteLocationRaw | RouteLocation) {
  // 提取 replace 标志
  const replace = (to as RouteLocationOptions).replace === true
  
  // ...守卫流程
  
  return navigate(toLocation, from)
    .then((failure) => {
      if (!failure) {
        // 传递 replace 给 finalizeNavigation
        failure = finalizeNavigation(
          toLocation,
          from,
          true,    // isPush
          replace  // 是否替换
        )
      }
      return failure
    })
}
```

## finalizeNavigation 中的区别

```typescript
function finalizeNavigation(
  toLocation: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  isPush: boolean,
  replace?: boolean
) {
  if (isPush) {
    if (replace || isFirstNavigation) {
      // 使用 replace：不创建新历史条目
      routerHistory.replace(toLocation.fullPath, state)
    } else {
      // 使用 push：创建新历史条目
      routerHistory.push(toLocation.fullPath, state)
    }
  }
}
```

## History API 层面

```typescript
// routerHistory.push
function push(to: string, data?: HistoryState) {
  history.pushState(data, '', to)
}

// routerHistory.replace
function replace(to: string, data?: HistoryState) {
  history.replaceState(data, '', to)
}
```

`pushState` 创建新条目，`replaceState` 替换当前条目。

## 典型使用场景

**登录后替换**：

```typescript
async function login() {
  await authenticate()
  // 用户不应该后退到登录页
  router.replace('/dashboard')
}
```

**搜索参数更新**：

```typescript
function updateSearch(query: string) {
  // 每次搜索不应该创建历史条目
  router.replace({ query: { q: query } })
}
```

**路由守卫重定向**：

```typescript
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn) {
    // 内部自动使用 replace
    return '/login'
  }
})
```

**404 页面**：

```typescript
router.beforeEach((to) => {
  if (!to.matched.length) {
    // 替换到 404，保持 URL 不变
    return { name: '404', replace: true }
  }
})
```

## 首次导航总是 replace

```typescript
function finalizeNavigation() {
  const isFirstNavigation = from === START_LOCATION_NORMALIZED

  if (isPush) {
    if (replace || isFirstNavigation) {
      routerHistory.replace(...)
    } else {
      routerHistory.push(...)
    }
  }
}
```

首次导航（从 `START_LOCATION_NORMALIZED`）始终使用 replace，避免创建无效的历史条目。

## 与 push 的对比

| 特性 | push | replace |
|------|------|---------|
| 历史记录 | 新增条目 | 替换当前条目 |
| 后退按钮 | 可返回 | 无法返回到被替换的页面 |
| API 方法 | pushState | replaceState |
| 适用场景 | 常规导航 | 登录、搜索、重定向 |

## 本章小结

`replace` 的实现非常简洁，它只是带 `replace: true` 的 `push`：

1. 在底层调用 `replaceState` 而非 `pushState`
2. 不创建新的历史条目
3. 首次导航默认使用 replace
4. 适用于登录、搜索参数更新等场景

理解这个区别有助于在正确场景选择正确的导航方法。
