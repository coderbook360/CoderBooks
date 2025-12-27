# 调试技巧与常见问题排查

RxJS 调试需要特殊技巧。本章介绍常用的调试方法和问题排查策略。

## 基本调试技巧

### 使用 tap 打印值

```typescript
source$.pipe(
  tap(value => console.log('值:', value)),
  map(transform),
  tap(value => console.log('转换后:', value))
).subscribe()
```

### 打印完整流程

```typescript
source$.pipe(
  tap({
    next: v => console.log('next:', v),
    error: e => console.error('error:', e),
    complete: () => console.log('complete')
  })
).subscribe()
```

### 标记流

```typescript
const debug = (label: string) => tap({
  next: v => console.log(`[${label}] next:`, v),
  error: e => console.error(`[${label}] error:`, e),
  complete: () => console.log(`[${label}] complete`)
})

source$.pipe(
  debug('step1'),
  map(transform),
  debug('step2')
).subscribe()
```

## rxjs-spy

强大的 RxJS 调试工具：

```typescript
import { create } from 'rxjs-spy'

const spy = create()

// 标记 Observable
source$.pipe(
  tag('my-stream')
).subscribe()

// 查看所有标记的流
spy.show()

// 日志特定流
spy.log('my-stream')

// 暂停特定流
spy.pause('my-stream')
```

## Chrome DevTools

### 使用断点

```typescript
source$.pipe(
  tap(value => {
    debugger  // 触发断点
  })
).subscribe()
```

### Performance 分析

1. 打开 Performance 标签
2. 录制
3. 执行 RxJS 代码
4. 停止录制
5. 分析时间线

## 常见问题排查

### 问题1：订阅没有触发

```typescript
// ❌ 忘记订阅
const result$ = source$.pipe(
  map(transform)
)
// 没有 subscribe()，不会执行

// ✅ 需要订阅
result$.subscribe()
```

### 问题2：内存泄漏

```typescript
// ❌ 忘记取消订阅
interval(1000).subscribe(console.log)

// ✅ 保存订阅并取消
const sub = interval(1000).subscribe(console.log)
// 稍后：
sub.unsubscribe()
```

检测内存泄漏：

```typescript
let count = 0

const track = () => {
  count++
  console.log('活动订阅:', count)
  return () => {
    count--
    console.log('活动订阅:', count)
  }
}

const sub = source$.subscribe()
sub.add(track())
```

### 问题3：冷 vs 热 Observable

```typescript
// 冷 Observable：每次订阅都重新执行
const cold$ = ajax('/api/data')

cold$.subscribe() // 请求1
cold$.subscribe() // 请求2

// 热 Observable：共享执行
const hot$ = cold$.pipe(share())

hot$.subscribe() // 请求1
hot$.subscribe() // 共享请求1
```

### 问题4：操作符顺序

```typescript
// ❌ 顺序错误
source$.pipe(
  take(5),
  filter(x => x > 10) // 可能永远不会有5个值
)

// ✅ 正确顺序
source$.pipe(
  filter(x => x > 10),
  take(5)
)
```

### 问题5：错误处理

```typescript
// ❌ 错误后流终止
source$.pipe(
  map(riskyTransform)
).subscribe(
  value => console.log(value),
  error => console.error(error)
  // 错误后不再接收值
)

// ✅ 捕获错误继续
source$.pipe(
  map(riskyTransform),
  catchError(error => {
    console.error(error)
    return of(defaultValue)
  })
).subscribe()
```

## 性能分析

### 测量执行时间

```typescript
const measureTime = (label: string) => {
  const start = performance.now()
  
  return finalize(() => {
    const duration = performance.now() - start
    console.log(`${label}: ${duration}ms`)
  })
}

source$.pipe(
  measureTime('total'),
  map(transform),
  measureTime('after-transform')
).subscribe()
```

### 检测慢操作

```typescript
const detectSlow = (threshold: number) => tap(value => {
  const start = performance.now()
  
  // 同步操作
  const result = transform(value)
  
  const duration = performance.now() - start
  if (duration > threshold) {
    console.warn(`慢操作: ${duration}ms`)
  }
  
  return result
})

source$.pipe(
  detectSlow(100) // 超过100ms警告
).subscribe()
```

## 单元测试

### 使用 TestScheduler

```typescript
import { TestScheduler } from 'rxjs/testing'

it('should work', () => {
  const scheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected)
  })
  
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('--a--b--c--|')
    const expected =    '--a--b--c--|'
    
    expectObservable(source).toBe(expected)
  })
})
```

### Mock HTTP 请求

```typescript
const mockAjax = (data: any) => {
  return new Observable(subscriber => {
    setTimeout(() => {
      subscriber.next(data)
      subscriber.complete()
    }, 0)
  })
}
```

## 调试清单

**订阅检查**：
- [ ] 是否忘记 subscribe()
- [ ] 是否保存了 Subscription
- [ ] 是否在适当时机 unsubscribe()

**操作符检查**：
- [ ] 操作符顺序是否正确
- [ ] 是否使用了正确的操作符
- [ ] 是否处理了错误情况

**性能检查**：
- [ ] 是否有不必要的重复订阅
- [ ] 是否共享了应该共享的流
- [ ] 是否有内存泄漏

## 总结

- 使用 tap 打印调试信息
- rxjs-spy 提供强大的调试能力
- Chrome DevTools 进行性能分析
- 理解冷热 Observable 的区别
- 正确处理错误和取消订阅
- 使用 TestScheduler 编写测试
