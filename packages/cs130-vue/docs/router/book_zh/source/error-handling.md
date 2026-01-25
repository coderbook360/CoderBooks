# 导航错误处理

Vue Router 提供多层错误处理机制，包括 Promise catch、onError 回调和导航失败类型。

## 错误来源

路由导航中可能产生的错误：

1. **NavigationFailure**：预期内的导航结果（不是真正的错误）
2. **组件加载失败**：懒加载组件网络错误
3. **守卫抛出异常**：守卫中的代码错误
4. **守卫返回 Error**：显式抛出的错误

## Promise 级别处理

```typescript
router.push('/somewhere')
  .then(() => {
    console.log('Navigation succeeded')
  })
  .catch(error => {
    if (isNavigationFailure(error)) {
      // 导航失败，不是真正的错误
      console.log('Navigation failure:', error.type)
    } else {
      // 真正的错误
      console.error('Navigation error:', error)
    }
  })
```

## router.onError

全局错误处理器：

```typescript
router.onError((error, to, from) => {
  // error: 错误对象
  // to: 目标路由
  // from: 来源路由
  
  console.error('Router error:', error)
  
  // 报告错误
  errorReporter.report({
    error,
    context: {
      from: from.fullPath,
      to: to.fullPath
    }
  })
})
```

## onError 实现

```typescript
// createRouter.ts
const errorHandlers = useCallbacks<_ErrorHandler>()

function onError(handler: _ErrorHandler): () => void {
  return errorHandlers.add(handler)
}

function triggerError(error: any, to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded) {
  // 调用所有错误处理器
  for (const handler of errorHandlers.list()) {
    handler(error, to, from)
  }
  
  // 仍然抛出错误
  return Promise.reject(error)
}
```

在 navigate 中调用：

```typescript
function navigate(to, from) {
  return runGuardQueue(guards)
    .then(() => {
      // ...
    })
    .catch(err => {
      if (isNavigationFailure(err)) {
        // NavigationFailure 不触发 onError
        return err
      }
      // 真正的错误
      return triggerError(err, to, from)
    })
}
```

## 组件加载错误

```typescript
router.onError((error, to) => {
  // 检测动态导入失败
  if (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Failed to load')
  ) {
    // 提示用户刷新
    showNotification('页面加载失败，请刷新重试')
    
    // 或者直接刷新
    // window.location.href = to.fullPath
  }
})
```

## 守卫错误处理

守卫中的错误会中断导航并触发 onError：

```typescript
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    throw new Error('Authentication required')  // 触发 onError
  }
})

router.onError((error) => {
  if (error.message === 'Authentication required') {
    router.push('/login')
  }
})
```

## 区分错误类型

```typescript
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

router.onError((error, to, from) => {
  // 1. 检查是否是 NavigationFailure（通常不会进入 onError）
  if (isNavigationFailure(error)) {
    console.log('Navigation failure in onError')
    return
  }
  
  // 2. 检查是否是网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    handleNetworkError(to)
    return
  }
  
  // 3. 其他错误
  handleGenericError(error)
})
```

## 完整错误处理策略

```typescript
// 全局错误处理
router.onError((error, to, from) => {
  // 记录错误
  console.error('[Router Error]', error)
  
  // 上报
  trackError(error, { to: to.fullPath, from: from.fullPath })
  
  // 用户提示
  if (isDynamicImportError(error)) {
    showToast('页面加载失败，请检查网络')
  }
})

// Promise 级别处理
async function navigateTo(path: string) {
  try {
    await router.push(path)
  } catch (error) {
    if (isNavigationFailure(error, NavigationFailureType.duplicated)) {
      // 忽略重复导航
      return
    }
    if (isNavigationFailure(error, NavigationFailureType.aborted)) {
      // 被守卫阻止
      console.log('Navigation blocked')
      return
    }
    // 重新抛出其他错误
    throw error
  }
}

// 辅助函数
function isDynamicImportError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk')
  )
}
```

## afterEach 中的 failure

```typescript
router.afterEach((to, from, failure) => {
  if (failure) {
    // 这是 NavigationFailure，不是错误
    if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
      trackEvent('navigation_blocked', { to: to.path })
    }
  }
})
```

## 错误恢复

```typescript
router.onError((error, to) => {
  // 保存目标路径
  sessionStorage.setItem('failedNavigation', to.fullPath)
  
  // 跳转到错误页
  router.push({
    name: 'error',
    query: { type: 'load_failed' }
  })
})

// 错误页中重试
function retry() {
  const target = sessionStorage.getItem('failedNavigation')
  if (target) {
    sessionStorage.removeItem('failedNavigation')
    window.location.href = target  // 完整刷新
  }
}
```

## 本章小结

导航错误处理的层次：

1. **Promise catch**：单次导航的错误处理
2. **onError**：全局错误处理器
3. **afterEach failure**：处理 NavigationFailure
4. **错误类型**：区分 NavigationFailure 和真正的错误

完善的错误处理可以提升用户体验，避免页面崩溃。
