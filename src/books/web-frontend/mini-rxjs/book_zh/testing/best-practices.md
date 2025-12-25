---
sidebar_position: 94
title: "测试最佳实践"
---

# 测试最佳实践

本章总结 RxJS 测试的最佳实践和常见问题解决方案。

## 测试组织

### 测试文件结构

```
src/
├── operators/
│   ├── map.ts
│   ├── map.spec.ts      # 单元测试
│   └── map.test.ts      # 集成测试
├── test/
│   ├── helpers/         # 测试辅助
│   ├── mocks/           # Mock 对象
│   └── fixtures/        # 测试数据
```

### 测试套件组织

```javascript
describe('map operator', () => {
  // 基本功能
  describe('basic functionality', () => {
    it('should transform values', () => { })
    it('should pass index to project function', () => { })
  })
  
  // 错误处理
  describe('error handling', () => {
    it('should propagate source errors', () => { })
    it('should handle project errors', () => { })
  })
  
  // 边界情况
  describe('edge cases', () => {
    it('should handle empty source', () => { })
    it('should handle immediate complete', () => { })
  })
  
  // 资源清理
  describe('cleanup', () => {
    it('should unsubscribe on source error', () => { })
    it('should unsubscribe on complete', () => { })
  })
})
```

## 测试辅助工具

### 创建测试辅助函数

```javascript
// test/helpers/observable.ts

export function collectValues(observable$) {
  return new Promise((resolve, reject) => {
    const values = []
    observable$.subscribe({
      next: v => values.push(v),
      error: reject,
      complete: () => resolve(values)
    })
  })
}

export function expectComplete(observable$) {
  return new Promise((resolve, reject) => {
    let completed = false
    observable$.subscribe({
      error: reject,
      complete: () => {
        completed = true
        resolve(true)
      }
    })
    
    setTimeout(() => {
      if (!completed) reject(new Error('Did not complete'))
    }, 5000)
  })
}

export function expectError(observable$, expectedMessage) {
  return new Promise((resolve, reject) => {
    observable$.subscribe({
      error: err => {
        if (err.message === expectedMessage) {
          resolve(true)
        } else {
          reject(new Error(`Expected "${expectedMessage}", got "${err.message}"`))
        }
      },
      complete: () => reject(new Error('Expected error, got complete'))
    })
  })
}
```

### 订阅追踪器

```javascript
class SubscriptionTracker {
  private subscriptions = []
  private unsubscribed = []
  
  track(subscription) {
    const id = this.subscriptions.length
    this.subscriptions.push(subscription)
    
    const originalUnsubscribe = subscription.unsubscribe.bind(subscription)
    subscription.unsubscribe = () => {
      this.unsubscribed.push(id)
      originalUnsubscribe()
    }
    
    return subscription
  }
  
  get activeCount() {
    return this.subscriptions.length - this.unsubscribed.length
  }
  
  get allUnsubscribed() {
    return this.unsubscribed.length === this.subscriptions.length
  }
  
  clear() {
    // 清理所有活跃订阅
    this.subscriptions.forEach((sub, i) => {
      if (!this.unsubscribed.includes(i) && !sub.closed) {
        sub.unsubscribe()
      }
    })
    this.subscriptions = []
    this.unsubscribed = []
  }
}

// 使用
const tracker = new SubscriptionTracker()

afterEach(() => {
  expect(tracker.allUnsubscribed).toBe(true)
  tracker.clear()
})

it('should clean up subscriptions', () => {
  const sub = source$.subscribe()
  tracker.track(sub)
  
  // 测试逻辑...
  
  sub.unsubscribe()
})
```

## 异步测试模式

### 使用 done 回调

```javascript
it('should emit values', (done) => {
  const values = []
  
  of(1, 2, 3).pipe(
    map(x => x * 2)
  ).subscribe({
    next: v => values.push(v),
    complete: () => {
      expect(values).toEqual([2, 4, 6])
      done()
    }
  })
})
```

### 使用 async/await

```javascript
it('should emit values', async () => {
  const result = await firstValueFrom(
    of(1, 2, 3).pipe(
      map(x => x * 2),
      toArray()
    )
  )
  
  expect(result).toEqual([2, 4, 6])
})
```

### 超时处理

```javascript
it('should complete in time', async () => {
  const result = await Promise.race([
    firstValueFrom(longRunningObservable$),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
  ])
  
  expect(result).toBeDefined()
})

// 或使用 Jest timeout
it('should complete quickly', async () => {
  await expect(
    firstValueFrom(source$)
  ).resolves.toBeDefined()
}, 1000)  // 1 秒超时
```

## 同步测试模式

### TestScheduler 同步模式

```javascript
const testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected)
})

it('should work synchronously', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('a-b-c|')
    const expected =    'a-b-c|'
    
    expectObservable(source).toBe(expected)
  })
})
```

### 同步 Observable 测试

```javascript
it('should emit synchronously', () => {
  const values = []
  
  of(1, 2, 3).subscribe(v => values.push(v))
  
  // 同步完成，无需 async
  expect(values).toEqual([1, 2, 3])
})
```

## 内存泄漏检测

### 订阅泄漏检测

```javascript
function detectLeaks(observableFactory, iterations = 100) {
  const subscriptions = []
  
  for (let i = 0; i < iterations; i++) {
    const sub = observableFactory().subscribe()
    subscriptions.push(sub)
  }
  
  // 检查是否全部取消
  const leaked = subscriptions.filter(s => !s.closed)
  
  // 清理
  subscriptions.forEach(s => s.unsubscribe())
  
  return leaked.length
}

it('should not leak subscriptions', () => {
  const leaks = detectLeaks(() => 
    interval(100).pipe(take(5))
  )
  
  expect(leaks).toBe(0)
})
```

### 取消订阅测试

```javascript
it('should clean up on unsubscribe', () => {
  const cleanupCalled = { value: false }
  
  const source$ = new Observable(subscriber => {
    const id = setInterval(() => subscriber.next(1), 100)
    
    return () => {
      clearInterval(id)
      cleanupCalled.value = true
    }
  })
  
  const sub = source$.subscribe()
  sub.unsubscribe()
  
  expect(cleanupCalled.value).toBe(true)
})
```

## 竞态条件测试

### 模拟竞态

```javascript
it('should handle race condition with switchMap', async () => {
  const responses = [
    timer(100).pipe(mapTo('slow')),
    timer(50).pipe(mapTo('fast'))
  ]
  
  let index = 0
  const mockApi = () => responses[index++]
  
  const source = new Subject()
  const results = []
  
  source.pipe(
    switchMap(() => mockApi())
  ).subscribe(v => results.push(v))
  
  source.next('first')   // 触发慢请求
  source.next('second')  // 触发快请求，取消慢请求
  
  await delay(150)
  
  // 只有快请求的结果
  expect(results).toEqual(['fast'])
})
```

### 并发控制测试

```javascript
it('should limit concurrency', async () => {
  let concurrent = 0
  let maxConcurrent = 0
  
  const task = (id) => defer(() => {
    concurrent++
    maxConcurrent = Math.max(maxConcurrent, concurrent)
    
    return timer(50).pipe(
      tap(() => concurrent--),
      mapTo(id)
    )
  })
  
  const results = await firstValueFrom(
    from([1, 2, 3, 4, 5]).pipe(
      mergeMap(id => task(id), 2),  // 最大并发 2
      toArray()
    )
  )
  
  expect(results).toHaveLength(5)
  expect(maxConcurrent).toBe(2)
})
```

## 错误边界测试

### 错误恢复

```javascript
it('should recover from errors', async () => {
  let attempts = 0
  
  const flaky$ = defer(() => {
    attempts++
    if (attempts < 3) {
      return throwError(() => new Error('fail'))
    }
    return of('success')
  })
  
  const result = await firstValueFrom(
    flaky$.pipe(retry(3))
  )
  
  expect(result).toBe('success')
  expect(attempts).toBe(3)
})
```

### 错误传播

```javascript
it('should propagate errors correctly', async () => {
  const error = new Error('test error')
  
  await expect(
    firstValueFrom(
      of(1, 2, 3).pipe(
        map(x => {
          if (x === 2) throw error
          return x
        })
      )
    )
  ).rejects.toThrow('test error')
})
```

## 状态管理测试

### BehaviorSubject 测试

```javascript
describe('state store', () => {
  let store: BehaviorSubject<State>
  
  beforeEach(() => {
    store = new BehaviorSubject({ count: 0 })
  })
  
  it('should have initial value', () => {
    expect(store.getValue()).toEqual({ count: 0 })
  })
  
  it('should update state', () => {
    store.next({ count: 1 })
    expect(store.getValue()).toEqual({ count: 1 })
  })
  
  it('should notify subscribers', () => {
    const values = []
    store.subscribe(v => values.push(v))
    
    store.next({ count: 1 })
    store.next({ count: 2 })
    
    expect(values).toEqual([
      { count: 0 },  // 初始值
      { count: 1 },
      { count: 2 }
    ])
  })
})
```

### 选择器测试

```javascript
it('should select derived state', () => {
  const state$ = new BehaviorSubject({
    users: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    selectedId: 1
  })
  
  const selectedUser$ = state$.pipe(
    map(s => s.users.find(u => u.id === s.selectedId)),
    distinctUntilChanged()
  )
  
  const values = []
  selectedUser$.subscribe(v => values.push(v))
  
  // 更新选中
  state$.next({ ...state$.getValue(), selectedId: 2 })
  
  expect(values).toEqual([
    { id: 1, name: 'A' },
    { id: 2, name: 'B' }
  ])
})
```

## 性能测试

### 吞吐量测试

```javascript
it('should handle high throughput', async () => {
  const count = 100000
  let received = 0
  
  const start = Date.now()
  
  await new Promise(resolve => {
    range(1, count).pipe(
      map(x => x * 2)
    ).subscribe({
      next: () => received++,
      complete: resolve
    })
  })
  
  const duration = Date.now() - start
  const throughput = count / duration * 1000
  
  expect(received).toBe(count)
  console.log(`Throughput: ${throughput.toFixed(0)} ops/sec`)
})
```

### 内存使用测试

```javascript
it('should have bounded memory usage', () => {
  const subject = new ReplaySubject(10)  // 限制缓存
  
  // 发送大量数据
  for (let i = 0; i < 1000; i++) {
    subject.next({ data: 'x'.repeat(1000) })
  }
  
  // 只保留最近 10 个
  const values = []
  subject.subscribe(v => values.push(v))
  
  expect(values.length).toBe(10)
})
```

## 常见错误与解决

### 1. 忘记取消订阅

```javascript
// ❌ 错误：可能导致内存泄漏
it('should work', () => {
  interval(100).subscribe(console.log)
  // 测试结束但 interval 还在运行
})

// ✅ 正确：使用 takeUntil 或手动取消
it('should work', () => {
  const sub = interval(100).pipe(
    take(5)
  ).subscribe(console.log)
  
  // 或手动取消
  sub.unsubscribe()
})
```

### 2. 异步测试未等待

```javascript
// ❌ 错误：测试可能在异步完成前结束
it('should emit', () => {
  const values = []
  timer(100).subscribe(v => values.push(v))
  expect(values).toEqual([0])  // 可能失败
})

// ✅ 正确：等待完成
it('should emit', async () => {
  const result = await firstValueFrom(timer(100))
  expect(result).toBe(0)
})
```

### 3. Mock 状态污染

```javascript
// ❌ 错误：测试间共享状态
const mockService = { data: [] }

// ✅ 正确：每次重置
beforeEach(() => {
  mockService.data = []
  jest.clearAllMocks()
})
```

## 检查清单

每个测试应检查：

- [ ] 正常路径是否正确
- [ ] 错误是否正确传播
- [ ] 空输入是否处理
- [ ] 边界条件是否覆盖
- [ ] 资源是否正确清理
- [ ] 异步操作是否正确等待
- [ ] Mock 是否正确重置

## 本章小结

- 组织测试为基本功能、错误处理、边界情况
- 使用辅助函数简化常见测试模式
- 正确处理异步测试和超时
- 检测内存泄漏和订阅泄漏
- 测试竞态条件和并发控制
- 遵循检查清单确保测试质量

下一章开始实战项目部分。
