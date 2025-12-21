# 异步守卫与错误处理

本章处理异步守卫和各种错误情况。

## 异步守卫支持

```typescript
async function runGuard(
  guard: NavigationGuard,
  to,
  from
): Promise<NavigationGuardReturn> {
  try {
    // 守卫可能返回 Promise
    const result = await guard(to, from);
    return result;
  } catch (error) {
    // 捕获守卫中的错误
    if (error instanceof NavigationError) {
      throw error;
    }
    // 包装为导航错误
    throw new NavigationError(error.message);
  }
}
```

## 超时处理

```typescript
function withTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Guard timeout')), timeout)
    )
  ]);
}

// 使用
await withTimeout(runGuard(guard, to, from), 5000);
```

## 重试机制

```typescript
async function runGuardWithRetry(
  guard: NavigationGuard,
  to,
  from,
  maxRetries = 3
) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await runGuard(guard, to, from);
    } catch (error) {
      lastError = error;
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw lastError;
}
```

## 错误恢复

```typescript
router.onError((error) => {
  if (error instanceof NavigationCancelled) {
    console.log('导航被取消');
  } else if (error instanceof NavigationRedirect) {
    router.push(error.to);
  } else {
    console.error('导航错误:', error);
    router.push('/error');
  }
});
```

## 总结

实现了健壮的异步守卫系统：
- 异步守卫支持
- 超时处理
- 重试机制
- 错误恢复

至此，导航守卫系统（第16-21章）全部完成。下一部分实现核心 Router 实例（第22-27章）。
