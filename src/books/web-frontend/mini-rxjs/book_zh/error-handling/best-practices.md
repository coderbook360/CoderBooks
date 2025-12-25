---
sidebar_position: 71
title: "错误处理最佳实践"
---

# 错误处理最佳实践

总结 RxJS 中错误处理的常用模式和最佳实践。

## 错误处理层次

### 层次一：内部处理

在内部 Observable 中处理错误，不影响外部流：

```javascript
source$.pipe(
  switchMap(id => 
    fetchData(id).pipe(
      catchError(err => {
        console.warn(`Failed for ${id}:`, err)
        return of(null)  // 返回默认值
      })
    )
  )
)
// 单个请求失败不会终止流
```

### 层次二：重试层

在重试后再处理错误：

```javascript
source$.pipe(
  switchMap(id =>
    fetchData(id).pipe(
      retry(3),
      catchError(err => of({ id, error: err }))
    )
  )
)
```

### 层次三：全局处理

在最外层统一处理未捕获的错误：

```javascript
source$.pipe(
  switchMap(id => fetchData(id).pipe(retry(3))),
  catchError(err => {
    showErrorNotification(err)
    return EMPTY
  })
)
```

## 错误恢复策略

### 策略一：默认值

```javascript
function fetchUserWithDefault(id) {
  return fetchUser(id).pipe(
    catchError(() => of({
      id,
      name: 'Unknown',
      status: 'offline'
    }))
  )
}
```

### 策略二：备用数据源

```javascript
function fetchWithFallback(primaryUrl, fallbackUrl) {
  return ajax(primaryUrl).pipe(
    catchError(() => {
      console.log('Primary failed, trying fallback')
      return ajax(fallbackUrl)
    })
  )
}
```

### 策略三：缓存回退

```javascript
function fetchWithCache(url) {
  return ajax(url).pipe(
    tap(data => cache.set(url, data)),
    catchError(() => {
      const cached = cache.get(url)
      if (cached) {
        console.log('Using cached data')
        return of(cached)
      }
      return throwError(() => new Error('No cached data'))
    })
  )
}
```

### 策略四：部分成功

```javascript
function fetchMultiple(urls) {
  return forkJoin(
    urls.map(url =>
      ajax(url).pipe(
        map(res => ({ url, data: res.response, success: true })),
        catchError(err => of({ url, error: err, success: false }))
      )
    )
  )
}

// 使用
fetchMultiple(['/api/a', '/api/b', '/api/c']).subscribe(results => {
  const successes = results.filter(r => r.success)
  const failures = results.filter(r => !r.success)
  
  if (failures.length > 0) {
    showPartialError(failures)
  }
  processData(successes)
})
```

## 重试模式

### 简单重试

```javascript
const withRetry = () => retry(3)

ajax('/api/data').pipe(withRetry())
```

### 延迟重试

```javascript
const withDelayedRetry = (count = 3, delay = 1000) =>
  retry({
    count,
    delay
  })
```

### 指数退避

```javascript
function exponentialBackoff(maxRetries = 3, initialDelay = 1000) {
  return retryWhen(errors$ =>
    errors$.pipe(
      mergeMap((err, i) => {
        const retryAttempt = i + 1
        if (retryAttempt > maxRetries) {
          return throwError(() => err)
        }
        const delay = initialDelay * Math.pow(2, retryAttempt - 1)
        return timer(delay)
      })
    )
  )
}
```

### 条件重试

```javascript
function retryOnCondition(shouldRetry, maxRetries = 3) {
  return retryWhen(errors$ =>
    errors$.pipe(
      mergeMap((err, i) => {
        if (i >= maxRetries || !shouldRetry(err)) {
          return throwError(() => err)
        }
        return timer(1000)
      })
    )
  )
}

// 使用：只重试网络错误
ajax('/api/data').pipe(
  retryOnCondition(err => err.name === 'NetworkError')
)
```

## 错误分类处理

```javascript
function handleError(err) {
  if (err.status === 401) {
    return handleUnauthorized()
  }
  if (err.status === 404) {
    return of(null)
  }
  if (err.status >= 500) {
    return handleServerError(err)
  }
  return throwError(() => err)
}

function handleUnauthorized() {
  logout()
  return EMPTY
}

function handleServerError(err) {
  logToServer(err)
  showErrorNotification('服务器错误，请稍后重试')
  return EMPTY
}

// 使用
ajax('/api/data').pipe(
  catchError(handleError)
)
```

## 超时处理

```javascript
function fetchWithTimeout(url, timeoutMs = 5000) {
  return ajax(url).pipe(
    timeout({
      each: timeoutMs,
      with: () => throwError(() => new Error('Request timeout'))
    }),
    catchError(err => {
      if (err.message === 'Request timeout') {
        return fetchWithTimeout(url, timeoutMs)  // 重试
      }
      return throwError(() => err)
    })
  )
}
```

## 错误边界模式

类似 React Error Boundary：

```javascript
function errorBoundary(fallback$) {
  return (source) => source.pipe(
    catchError(err => {
      console.error('Error caught by boundary:', err)
      return fallback$ || EMPTY
    })
  )
}

// 使用
riskyStream$.pipe(
  errorBoundary(of({ error: true }))
)
```

## 组合错误处理

```javascript
function createRobustRequest(url, options = {}) {
  const {
    retries = 3,
    timeout = 5000,
    fallbackValue = null,
    onError = console.error
  } = options

  return ajax(url).pipe(
    // 超时
    timeout(timeout),
    
    // 重试
    retry({
      count: retries,
      delay: (err, count) => timer(Math.pow(2, count) * 1000)
    }),
    
    // 错误处理
    catchError(err => {
      onError(err)
      if (fallbackValue !== undefined) {
        return of(fallbackValue)
      }
      return throwError(() => err)
    }),
    
    // 清理
    finalize(() => {
      console.log('Request completed')
    })
  )
}

// 使用
createRobustRequest('/api/data', {
  retries: 3,
  timeout: 10000,
  fallbackValue: [],
  onError: err => logError('API failed:', err)
})
```

## 调试技巧

### 添加日志

```javascript
source$.pipe(
  tap({
    next: v => console.log('Value:', v),
    error: e => console.log('Error:', e),
    complete: () => console.log('Complete')
  }),
  catchError(err => {
    console.error('Caught:', err)
    return of(fallback)
  })
)
```

### 错误堆栈保留

```javascript
catchError(err => {
  // 保留原始错误作为 cause
  const enhancedError = new Error('Enhanced error message')
  enhancedError.cause = err
  return throwError(() => enhancedError)
})
```

## 测试错误处理

```javascript
it('should handle errors gracefully', () => {
  const source$ = cold('--a--#', { a: 1 })
  const expected$ = cold('--a--(b|)', { a: 1, b: 'fallback' })
  
  const result$ = source$.pipe(
    catchError(() => of('fallback'))
  )
  
  expect(result$).toBeObservable(expected$)
})
```

## 常见错误

### 吞掉错误

```javascript
// 错误：错误被静默忽略
source$.pipe(
  catchError(() => EMPTY)
)

// 正确：至少记录
source$.pipe(
  catchError(err => {
    console.error(err)
    return EMPTY
  })
)
```

### 错误处理位置

```javascript
// 错误：整个流会终止
source$.pipe(
  mergeMap(x => failableRequest(x)),
  catchError(() => of('fallback'))
)

// 正确：单个失败不影响流
source$.pipe(
  mergeMap(x => 
    failableRequest(x).pipe(
      catchError(() => of('fallback'))
    )
  )
)
```

## 本章小结

- 分层处理：内部 → 重试 → 全局
- 恢复策略：默认值、备用源、缓存
- 重试模式：简单、延迟、指数退避、条件
- 始终记录错误，不要静默吞掉
- 在正确的位置处理错误

下一章开始实用操作符部分，实现 `tap` 和 `delay` 操作符。
