# beforeEach 全局守卫

`beforeEach` 是最常用的全局守卫，在每次导航开始时触发。它用于权限验证、日志记录、进度条等全局逻辑。

## 基本用法

```typescript
router.beforeEach((to, from) => {
  // 返回 false 阻止导航
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login'
  }
})
```

## 注册机制

```typescript
// createRouter.ts
const beforeGuards = useCallbacks<NavigationGuardWithThis<undefined>>()

function beforeEach(guard: NavigationGuardWithThis<undefined>): () => void {
  return beforeGuards.add(guard)
}
```

`useCallbacks` 是一个简单的订阅系统：

```typescript
function useCallbacks<T>() {
  let handlers: T[] = []

  function add(handler: T): () => void {
    handlers.push(handler)
    
    // 返回移除函数
    return () => {
      const i = handlers.indexOf(handler)
      if (i > -1) handlers.splice(i, 1)
    }
  }

  function list(): T[] {
    return handlers
  }

  function reset() {
    handlers = []
  }

  return { add, list, reset }
}
```

## 执行时机

在导航流程中，`beforeEach` 在组件 `beforeRouteLeave` 之后执行：

```typescript
function navigate(to, from) {
  // 1. beforeRouteLeave
  return runGuardQueue(leaveGuards)
    .then(() => {
      // 2. beforeEach
      const guards = []
      for (const guard of beforeGuards.list()) {
        guards.push(guardToPromiseFn(guard, to, from))
      }
      return runGuardQueue(guards)
    })
    // ...后续守卫
}
```

## 返回值语义

```typescript
// 继续导航
router.beforeEach(() => {
  // 不返回值，或返回 true
  return true
})

// 阻止导航
router.beforeEach(() => {
  return false
})

// 重定向
router.beforeEach((to) => {
  if (!auth.check()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

// 抛出错误
router.beforeEach(() => {
  throw new Error('Something went wrong')
})
```

## guardToPromiseFn 处理

```typescript
function guardToPromiseFn(guard, to, from) {
  return () => new Promise((resolve, reject) => {
    const next = (valid) => {
      if (valid === false) {
        reject(createRouterError(ErrorTypes.NAVIGATION_ABORTED))
      } else if (isRouteLocation(valid)) {
        reject(createRouterError(ErrorTypes.NAVIGATION_GUARD_REDIRECT, { to: valid }))
      } else if (valid instanceof Error) {
        reject(valid)
      } else {
        resolve()
      }
    }

    const guardReturn = guard(to, from, next)

    // 支持 Promise 返回值
    Promise.resolve(guardReturn).then((result) => {
      if (guard.length < 3) {
        // 没有使用 next 参数
        next(result)
      }
    }).catch(reject)
  })
}
```

## 典型使用场景

**权限验证**：

```typescript
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !store.getters.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath }
    }
  }
})
```

**角色验证**：

```typescript
router.beforeEach((to) => {
  if (to.meta.roles) {
    const userRole = store.getters.userRole
    if (!to.meta.roles.includes(userRole)) {
      return '/403'
    }
  }
})
```

**页面标题**：

```typescript
router.beforeEach((to) => {
  document.title = to.meta.title || 'My App'
})
```

**进度条**：

```typescript
import NProgress from 'nprogress'

router.beforeEach(() => {
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})
```

## 异步守卫

支持异步操作：

```typescript
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    // 异步检查 token 有效性
    const isValid = await authService.validateToken()
    if (!isValid) {
      return '/login'
    }
  }
})
```

## 移除守卫

`beforeEach` 返回一个移除函数：

```typescript
const removeGuard = router.beforeEach((to, from) => {
  console.log('Navigation:', from.path, '->', to.path)
})

// 不再需要时移除
removeGuard()
```

## 多个守卫的执行顺序

```typescript
router.beforeEach(() => {
  console.log('Guard 1')
})

router.beforeEach(() => {
  console.log('Guard 2')
})

router.beforeEach(() => {
  console.log('Guard 3')
})

// 输出：Guard 1, Guard 2, Guard 3
```

按注册顺序执行，任何一个返回 `false` 或重定向，后续守卫不再执行。

## 与 beforeResolve 的区别

| 特性 | beforeEach | beforeResolve |
|------|------------|---------------|
| 执行时机 | 导航开始 | 组件解析后 |
| 组件加载 | 未加载 | 已加载 |
| 使用场景 | 权限验证 | 数据预取确认 |

## 本章小结

`beforeEach` 是最常用的全局守卫：

1. **注册机制**：使用 `useCallbacks` 管理守卫列表
2. **执行时机**：在 `beforeRouteLeave` 之后
3. **返回值**：支持 `false`、路由对象、Promise
4. **异步支持**：可以使用 `async/await`
5. **移除函数**：返回值可用于移除守卫

理解 `beforeEach` 的实现，有助于正确使用守卫进行权限控制。
