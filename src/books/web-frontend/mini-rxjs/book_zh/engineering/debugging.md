---
sidebar_position: 103
title: "调试技巧"
---

# 调试技巧

本章介绍 RxJS 应用的调试方法。

## 使用 tap 调试

### 基础调试

```javascript
source$.pipe(
  tap(x => console.log('Before map:', x)),
  map(x => x * 2),
  tap(x => console.log('After map:', x)),
  filter(x => x > 5),
  tap(x => console.log('After filter:', x))
).subscribe()
```

### 完整生命周期调试

```javascript
source$.pipe(
  tap({
    next: x => console.log('Next:', x),
    error: err => console.log('Error:', err),
    complete: () => console.log('Complete'),
    subscribe: () => console.log('Subscribed'),
    unsubscribe: () => console.log('Unsubscribed'),
    finalize: () => console.log('Finalized')
  })
).subscribe()
```

### 创建调试操作符

```javascript
function debug(tag) {
  return tap({
    next: value => console.log(`[${tag}] next:`, value),
    error: err => console.error(`[${tag}] error:`, err),
    complete: () => console.log(`[${tag}] complete`),
    subscribe: () => console.log(`[${tag}] subscribe`),
    unsubscribe: () => console.log(`[${tag}] unsubscribe`)
  })
}

// 使用
source$.pipe(
  debug('source'),
  map(x => x * 2),
  debug('after-map'),
  filter(x => x > 5),
  debug('after-filter')
).subscribe()
```

### 条件调试

```javascript
const DEBUG = process.env.NODE_ENV === 'development'

function debugIf(tag, condition = DEBUG) {
  if (!condition) {
    return tap()  // 空操作符
  }
  
  return tap({
    next: v => console.log(`[${tag}]`, v),
    error: e => console.error(`[${tag}] Error:`, e),
    complete: () => console.log(`[${tag}] Complete`)
  })
}

// 只在开发环境调试
source$.pipe(
  debugIf('data'),
  map(process),
  debugIf('processed')
)
```

## 可视化调试

### 时间线日志

```javascript
function timeline(tag) {
  const start = Date.now()
  
  return tap({
    next: value => {
      const elapsed = Date.now() - start
      console.log(`[${tag}] +${elapsed}ms:`, value)
    },
    error: err => {
      const elapsed = Date.now() - start
      console.error(`[${tag}] +${elapsed}ms ERROR:`, err)
    },
    complete: () => {
      const elapsed = Date.now() - start
      console.log(`[${tag}] +${elapsed}ms COMPLETE`)
    }
  })
}

// 使用
interval(100).pipe(
  take(5),
  timeline('interval'),
  debounceTime(150),
  timeline('debounced')
).subscribe()

// 输出：
// [interval] +100ms: 0
// [interval] +200ms: 1
// [debounced] +250ms: 1
// ...
```

### 流程图日志

```javascript
function flowLog(tag, indent = 0) {
  const prefix = '  '.repeat(indent) + '├─'
  
  return tap({
    next: v => console.log(`${prefix} [${tag}] →`, v),
    error: e => console.log(`${prefix} [${tag}] ✗`, e.message),
    complete: () => console.log(`${prefix} [${tag}] ✓`)
  })
}

// 使用
of(1, 2, 3).pipe(
  flowLog('source', 0),
  mergeMap(x => of(x, x * 10).pipe(
    flowLog(`inner-${x}`, 1)
  )),
  flowLog('result', 0)
).subscribe()

// 输出：
// ├─ [source] → 1
//   ├─ [inner-1] → 1
// ├─ [result] → 1
//   ├─ [inner-1] → 10
// ├─ [result] → 10
// ...
```

## 浏览器 DevTools

### 断点调试

```javascript
source$.pipe(
  tap(x => {
    debugger  // 在此暂停
    return x
  }),
  map(x => x * 2)
).subscribe()
```

### 性能分析

```javascript
source$.pipe(
  tap({
    subscribe: () => console.time('stream'),
    complete: () => console.timeEnd('stream')
  }),
  // ... 操作符
).subscribe()
```

### 使用 console.trace

```javascript
source$.pipe(
  tap(x => {
    if (x > 100) {
      console.trace('Unexpected value:', x)
    }
  })
).subscribe()
```

## 错误追踪

### 错误上下文

```javascript
function withErrorContext(context) {
  return catchError(err => {
    console.error(`Error in ${context}:`, err)
    console.error('Stack:', err.stack)
    throw err  // 重新抛出
  })
}

// 使用
source$.pipe(
  map(transform),
  withErrorContext('transform phase'),
  switchMap(fetch),
  withErrorContext('fetch phase')
).subscribe()
```

### 错误边界

```javascript
function errorBoundary(tag, fallback = EMPTY) {
  return catchError((err, caught) => {
    console.error(`[${tag}] Error caught:`, err)
    console.error(`[${tag}] Source:`, caught)
    return fallback
  })
}

// 使用
source$.pipe(
  map(riskyOperation),
  errorBoundary('risky-op', of(defaultValue))
).subscribe()
```

## 订阅追踪

### 订阅计数器

```javascript
let subscriptionCount = 0

function trackSubscription(tag) {
  return (source) => new Observable(subscriber => {
    const id = ++subscriptionCount
    console.log(`[${tag}] #${id} subscribed`)
    
    const subscription = source.subscribe(subscriber)
    
    return () => {
      console.log(`[${tag}] #${id} unsubscribed`)
      subscription.unsubscribe()
    }
  })
}

// 使用
source$.pipe(
  trackSubscription('source'),
  switchMap(x => inner$.pipe(
    trackSubscription('inner')
  ))
).subscribe()
```

### 活跃订阅监控

```javascript
const activeSubscriptions = new Map()

function monitorSubscription(tag) {
  return (source) => new Observable(subscriber => {
    const id = Symbol(tag)
    activeSubscriptions.set(id, {
      tag,
      createdAt: new Date(),
      stack: new Error().stack
    })
    
    const subscription = source.subscribe(subscriber)
    
    return () => {
      activeSubscriptions.delete(id)
      subscription.unsubscribe()
    }
  })
}

// 检查活跃订阅
function logActiveSubscriptions() {
  console.log('Active subscriptions:')
  activeSubscriptions.forEach((info, id) => {
    console.log(`  ${info.tag} (created: ${info.createdAt})`)
  })
}

// 定期检查
setInterval(logActiveSubscriptions, 5000)
```

## RxJS DevTools

### 自定义 DevTools 扩展

```javascript
class RxDevTools {
  private streams = new Map()
  private events = []
  
  register(name, observable$) {
    const wrapped$ = observable$.pipe(
      tap({
        subscribe: () => this.log(name, 'subscribe'),
        next: v => this.log(name, 'next', v),
        error: e => this.log(name, 'error', e),
        complete: () => this.log(name, 'complete'),
        unsubscribe: () => this.log(name, 'unsubscribe')
      })
    )
    
    this.streams.set(name, wrapped$)
    return wrapped$
  }
  
  log(stream, type, value) {
    const event = {
      stream,
      type,
      value,
      timestamp: Date.now()
    }
    
    this.events.push(event)
    
    // 发送到 DevTools
    if (window.__RX_DEVTOOLS__) {
      window.__RX_DEVTOOLS__.postMessage(event)
    }
  }
  
  getEvents(filter) {
    if (!filter) return this.events
    return this.events.filter(e => e.stream === filter)
  }
  
  clear() {
    this.events = []
  }
}

// 全局实例
window.rxDevTools = new RxDevTools()

// 使用
const data$ = rxDevTools.register('user-data', 
  fetchUser().pipe(
    map(transform)
  )
)
```

## 常见问题诊断

### 诊断无数据发出

```javascript
// 添加检查点
source$.pipe(
  tap({
    subscribe: () => console.log('✅ Subscribed'),
    next: () => console.log('✅ Got value'),
    complete: () => console.log('✅ Completed'),
    error: e => console.log('❌ Error:', e)
  }),
  // 检查是否有数据
  isEmpty(),
  tap(empty => {
    if (empty) console.log('⚠️ No data emitted!')
  })
).subscribe()
```

### 诊断内存泄漏

```javascript
// 监控订阅生命周期
const subscriptionLog = []

source$.pipe(
  tap({
    subscribe: () => {
      subscriptionLog.push({
        action: 'subscribe',
        time: Date.now(),
        stack: new Error().stack
      })
    },
    unsubscribe: () => {
      subscriptionLog.push({
        action: 'unsubscribe',
        time: Date.now()
      })
    }
  })
)

// 检查未清理的订阅
function checkLeaks() {
  const subscribes = subscriptionLog.filter(l => l.action === 'subscribe')
  const unsubscribes = subscriptionLog.filter(l => l.action === 'unsubscribe')
  
  if (subscribes.length !== unsubscribes.length) {
    console.warn(`Potential leak: ${subscribes.length} subscribes, ${unsubscribes.length} unsubscribes`)
    subscribes.slice(unsubscribes.length).forEach(s => {
      console.log('Leaking subscription created at:', s.stack)
    })
  }
}
```

### 诊断竞态条件

```javascript
let requestId = 0

source$.pipe(
  tap(() => console.log(`Request ${++requestId} started`)),
  switchMap(x => {
    const id = requestId
    return fetchData(x).pipe(
      tap({
        next: () => console.log(`Request ${id} completed`),
        error: () => console.log(`Request ${id} failed`)
      }),
      // 检查是否被取消
      finalize(() => {
        if (id !== requestId) {
          console.log(`Request ${id} was cancelled`)
        }
      })
    )
  })
)
```

## 调试最佳实践

### 1. 分层调试

```javascript
// 从外到内逐层添加调试
outerSource$.pipe(
  debug('outer'),  // 先调试外层
  switchMap(x => 
    innerSource$.pipe(
      debug('inner')  // 再调试内层
    )
  )
)
```

### 2. 隔离问题

```javascript
// 单独测试可疑部分
const isolated$ = suspiciousSource$.pipe(
  // 移除其他操作符，只保留可疑的
  suspiciousOperator()
)

isolated$.subscribe({
  next: v => console.log('Value:', v),
  error: e => console.error('Error:', e),
  complete: () => console.log('Complete')
})
```

### 3. 添加超时

```javascript
// 检测是否卡住
source$.pipe(
  timeout(5000),
  catchError(err => {
    if (err.name === 'TimeoutError') {
      console.error('Stream timed out - might be stuck')
      console.trace()
    }
    throw err
  })
)
```

## 本章小结

- `tap` 是最基本的调试工具
- 创建自定义调试操作符简化重复工作
- 时间线日志帮助理解异步流程
- 订阅追踪发现内存泄漏
- 浏览器 DevTools 配合断点调试
- 分层隔离定位问题根源

下一章学习版本迁移策略。
