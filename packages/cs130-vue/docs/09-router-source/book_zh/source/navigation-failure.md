# NavigationFailure 错误类型

Vue Router 使用 `NavigationFailure` 表示导航失败。它不是真正的错误，而是预期内的导航结果。

## NavigationFailure 类型

```typescript
interface NavigationFailure extends Error {
  type: NavigationFailureType
  from: RouteLocationNormalized
  to: RouteLocationNormalized
}

enum NavigationFailureType {
  aborted = 4,     // 守卫返回 false
  cancelled = 8,   // 被新导航取消
  duplicated = 16  // 重复导航到当前位置
}
```

## 创建 NavigationFailure

```typescript
// errors.ts
export const enum ErrorTypes {
  MATCHER_NOT_FOUND = 1,
  NAVIGATION_GUARD_REDIRECT = 2,
  NAVIGATION_ABORTED = 4,
  NAVIGATION_CANCELLED = 8,
  NAVIGATION_DUPLICATED = 16
}

export function createRouterError<E extends RouterError>(
  type: ErrorTypes,
  params: Omit<E, 'type' | 'message'>
): E {
  const error = Object.assign(
    new Error(ErrorMessages[type](params as any)),
    { type, ...params }
  ) as E
  
  return error
}
```

## 各类型的触发场景

**ABORTED**：守卫返回 false

```typescript
router.beforeEach(() => {
  return false  // 触发 ABORTED
})

// 创建
createRouterError(ErrorTypes.NAVIGATION_ABORTED, {
  from: currentRoute,
  to: targetRoute
})
```

**CANCELLED**：被新导航取消

```typescript
router.push('/a')
router.push('/b')  // /a 导航被取消

// 在 navigate 中
if (pendingLocation !== to) {
  return createRouterError(ErrorTypes.NAVIGATION_CANCELLED, {
    from,
    to
  })
}
```

**DUPLICATED**：重复导航

```typescript
// 当前在 /users
router.push('/users')  // 触发 DUPLICATED

// 在 pushWithRedirect 中
if (!force && isSameRouteLocation(from, targetLocation)) {
  return createRouterError(ErrorTypes.NAVIGATION_DUPLICATED, {
    to: targetLocation,
    from
  })
}
```

## 检测 NavigationFailure

```typescript
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

router.push('/somewhere').catch(failure => {
  if (isNavigationFailure(failure)) {
    // 这是一个导航失败
    
    if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
      console.log('Navigation was aborted by guard')
    }
    
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      // 重复导航通常可以忽略
    }
  } else {
    // 这是一个真正的错误
    console.error('Navigation error:', failure)
  }
})
```

## isNavigationFailure 实现

```typescript
export function isNavigationFailure(
  error: any,
  type?: NavigationFailureType
): error is NavigationFailure {
  return (
    error instanceof Error &&
    'type' in error &&
    // 位运算检查类型
    (type == null || (error.type & type) !== 0)
  )
}
```

使用位运算支持检查多种类型：

```typescript
// 检查是否是 aborted 或 cancelled
isNavigationFailure(
  failure, 
  NavigationFailureType.aborted | NavigationFailureType.cancelled
)
```

## 错误消息

```typescript
const ErrorMessages = {
  [ErrorTypes.MATCHER_NOT_FOUND]({ location, currentLocation }) {
    return `No match for ${JSON.stringify(location)}${
      currentLocation ? ' while being at ' + JSON.stringify(currentLocation) : ''
    }`
  },
  [ErrorTypes.NAVIGATION_GUARD_REDIRECT]({ from, to }) {
    return `Redirected from "${from.fullPath}" to "${stringifyRoute(to)}" via a navigation guard.`
  },
  [ErrorTypes.NAVIGATION_ABORTED]({ from, to }) {
    return `Navigation aborted from "${from.fullPath}" to "${to.fullPath}" via a navigation guard.`
  },
  [ErrorTypes.NAVIGATION_CANCELLED]({ from, to }) {
    return `Navigation cancelled from "${from.fullPath}" to "${to.fullPath}" with a new navigation.`
  },
  [ErrorTypes.NAVIGATION_DUPLICATED]({ from, to }) {
    return `Avoided redundant navigation to current location: "${from.fullPath}".`
  }
}
```

## afterEach 中的 failure

```typescript
router.afterEach((to, from, failure) => {
  if (failure) {
    // 导航失败
    if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
      // 被守卫阻止
      analytics.track('navigation_blocked', {
        from: from.path,
        to: to.path
      })
    }
  }
})
```

## 处理策略

**DUPLICATED：通常忽略**

```typescript
router.push('/current').catch(failure => {
  if (!isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    // 只处理非重复导航的失败
    throw failure
  }
})
```

**CANCELLED：静默处理**

```typescript
// 被取消的导航通常不需要处理
// 用户只关心最终到达的位置
```

**ABORTED：可能需要反馈**

```typescript
router.push('/protected').catch(failure => {
  if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    showMessage('访问被拒绝')
  }
})
```

## 与 try-catch 的配合

```typescript
async function navigateTo(path: string) {
  try {
    await router.push(path)
    // 导航成功
  } catch (error) {
    if (isNavigationFailure(error)) {
      // NavigationFailure 不是真正的错误
      if (isNavigationFailure(error, NavigationFailureType.duplicated)) {
        // 已经在目标位置，忽略
        return
      }
      // 其他类型的导航失败
      console.log('Navigation failed:', error.message)
    } else {
      // 真正的错误（如网络错误、守卫抛出的异常）
      throw error
    }
  }
}
```

## 本章小结

NavigationFailure 表示预期内的导航结果：

1. **三种类型**：aborted、cancelled、duplicated
2. **检测方法**：`isNavigationFailure(error, type?)`
3. **位运算**：支持检查多种类型
4. **afterEach**：第三个参数是 failure
5. **处理策略**：duplicated 忽略，cancelled 静默，aborted 按需反馈

理解 NavigationFailure 有助于正确处理导航结果。
