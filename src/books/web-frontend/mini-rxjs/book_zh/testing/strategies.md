---
sidebar_position: 91
title: "RxJS 测试策略"
---

# RxJS 测试策略

本章介绍 RxJS 代码的测试方法和最佳实践。

## 测试挑战

### 异步性

```javascript
// 需要等待异步完成
const result$ = source$.pipe(
  delay(1000),
  map(x => x * 2)
)

// 如何测试？等待真实的 1 秒？
```

### 时间依赖

```javascript
// 依赖时间的操作符
source$.pipe(
  debounceTime(300),
  throttleTime(100)
)

// 如何快速、确定性地测试？
```

### 订阅生命周期

```javascript
// 需要验证正确的订阅和取消订阅
const shared$ = source$.pipe(share())

// 如何验证订阅计数和清理？
```

## 测试方法

### 方法一：直接订阅

适合简单的同步测试：

```javascript
it('should map values', (done) => {
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

### 方法二：toArray

收集所有值后断言：

```javascript
it('should filter even numbers', async () => {
  const result = await of(1, 2, 3, 4, 5).pipe(
    filter(x => x % 2 === 0),
    toArray()
  ).toPromise()
  
  expect(result).toEqual([2, 4])
})
```

### 方法三：firstValueFrom / lastValueFrom

RxJS 7+ 的 Promise 转换：

```javascript
import { firstValueFrom, lastValueFrom } from 'rxjs'

it('should get first value', async () => {
  const value = await firstValueFrom(of(1, 2, 3))
  expect(value).toBe(1)
})

it('should get last value', async () => {
  const value = await lastValueFrom(of(1, 2, 3))
  expect(value).toBe(3)
})
```

### 方法四：弹珠测试

适合复杂的时间依赖测试：

```javascript
it('should debounce', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source =   cold('-a-b-c-----d|')
    const expected =      '------c----d|'
    
    expectObservable(source.pipe(
      debounceTime(30, testScheduler)
    )).toBe(expected)
  })
})
```

## 测试辅助工具

### 创建 Mock Observable

```javascript
function mockObservable(values, delay = 0) {
  return new Observable(subscriber => {
    let index = 0
    
    const emit = () => {
      if (index < values.length) {
        subscriber.next(values[index])
        index++
        setTimeout(emit, delay)
      } else {
        subscriber.complete()
      }
    }
    
    emit()
  })
}

// 使用
const mock$ = mockObservable([1, 2, 3], 100)
```

### 创建可控 Subject

```javascript
function createTestSubject() {
  const subject = new Subject()
  
  return {
    source$: subject.asObservable(),
    emit: (value) => subject.next(value),
    error: (err) => subject.error(err),
    complete: () => subject.complete()
  }
}

// 测试
it('should handle events', () => {
  const { source$, emit, complete } = createTestSubject()
  const values = []
  
  source$.pipe(
    map(x => x * 2)
  ).subscribe(v => values.push(v))
  
  emit(1)
  emit(2)
  emit(3)
  complete()
  
  expect(values).toEqual([2, 4, 6])
})
```

### 订阅追踪

```javascript
function trackSubscriptions(source$) {
  const subscriptions = []
  let subscriptionId = 0
  
  const tracked$ = new Observable(subscriber => {
    const id = subscriptionId++
    subscriptions.push({ id, subscribedAt: Date.now(), unsubscribedAt: null })
    
    const subscription = source$.subscribe(subscriber)
    
    return () => {
      subscription.unsubscribe()
      const record = subscriptions.find(s => s.id === id)
      if (record) {
        record.unsubscribedAt = Date.now()
      }
    }
  })
  
  return { tracked$, subscriptions }
}

// 测试
it('should cleanup subscriptions', () => {
  const source$ = interval(100)
  const { tracked$, subscriptions } = trackSubscriptions(source$)
  
  const sub = tracked$.pipe(take(3)).subscribe()
  
  // 等待完成
  setTimeout(() => {
    expect(subscriptions[0].unsubscribedAt).not.toBeNull()
  }, 500)
})
```

## 测试场景

### 测试转换操作符

```javascript
describe('transform operators', () => {
  it('should map values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source =   cold('-a-b-c|', { a: 1, b: 2, c: 3 })
      const expected =      '-a-b-c|', { a: 2, b: 4, c: 6 }
      
      expectObservable(source.pipe(
        map(x => x * 2)
      )).toBe(expected, { a: 2, b: 4, c: 6 })
    })
  })
  
  it('should scan accumulate', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source =   cold('-a-b-c|', { a: 1, b: 2, c: 3 })
      const expected =      '-a-b-c|', { a: 1, b: 3, c: 6 }
      
      expectObservable(source.pipe(
        scan((acc, v) => acc + v, 0)
      )).toBe(expected, { a: 1, b: 3, c: 6 })
    })
  })
})
```

### 测试过滤操作符

```javascript
describe('filter operators', () => {
  it('should filter values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source =   cold('-1-2-3-4-5|')
      const expected =      '---2---4--|'
      
      expectObservable(source.pipe(
        filter(x => x % 2 === 0)
      )).toBe(expected)
    })
  })
  
  it('should take first N', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source =   cold('-a-b-c-d-e|')
      const expected =      '-a-b-(c|)'
      
      expectObservable(source.pipe(
        take(3)
      )).toBe(expected)
    })
  })
})
```

### 测试组合操作符

```javascript
describe('combination operators', () => {
  it('should merge streams', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('-a---c-|')
      const b$ = cold('--b---d|')
      const expected = '-ab-cd-|'
      
      expectObservable(merge(a$, b$)).toBe(expected)
    })
  })
  
  it('should combineLatest', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('-a----c-|', { a: 'a', c: 'c' })
      const b$ = cold('---b----|', { b: 'b' })
      const expected = '---x--y-|'
      
      expectObservable(combineLatest([a$, b$]).pipe(
        map(([a, b]) => a + b)
      )).toBe(expected, { x: 'ab', y: 'cb' })
    })
  })
})
```

### 测试错误处理

```javascript
describe('error handling', () => {
  it('should catch error and recover', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source =   cold('-a-#', { a: 1 }, new Error())
      const recovery = cold('---b|', { b: 99 })
      const expected =      '-a----b|'
      
      expectObservable(source.pipe(
        catchError(() => recovery)
      )).toBe(expected, { a: 1, b: 99 })
    })
  })
  
  it('should retry on error', () => {
    let attempts = 0
    
    const source$ = defer(() => {
      attempts++
      if (attempts < 3) {
        return throwError(() => new Error())
      }
      return of('success')
    })
    
    source$.pipe(
      retry(3)
    ).subscribe(value => {
      expect(value).toBe('success')
      expect(attempts).toBe(3)
    })
  })
})
```

### 测试高阶操作符

```javascript
describe('higher-order operators', () => {
  it('should switchMap', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outer =  cold('-a-----b-----|')
      const inner1 = cold('--x-y-|')
      const inner2 = cold('--z---|')
      const expected =    '---x-y---z---|'
      
      let innerCount = 0
      const project = () => ++innerCount === 1 ? inner1 : inner2
      
      expectObservable(outer.pipe(
        switchMap(project)
      )).toBe(expected)
    })
  })
  
  it('should mergeMap with concurrency', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outer =  cold('-ab|')
      const inner =  cold('--x|')
      const expected =    '---x(x|)'  // 并发 1，串行执行
      
      expectObservable(outer.pipe(
        mergeMap(() => inner, 1)
      )).toBe(expected)
    })
  })
})
```

### 测试订阅生命周期

```javascript
describe('subscription lifecycle', () => {
  it('should track subscriptions', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('-a-b-c-|')
      const expected =    '-a-(b|)'
      const subs =        '^--!'
      
      expectObservable(source.pipe(take(2))).toBe(expected)
      expectSubscriptions(source.subscriptions).toBe(subs)
    })
  })
  
  it('should share subscription', () => {
    const source$ = new Subject()
    let subscriptionCount = 0
    
    const tracked$ = new Observable(subscriber => {
      subscriptionCount++
      return source$.subscribe(subscriber)
    })
    
    const shared$ = tracked$.pipe(share())
    
    shared$.subscribe()
    shared$.subscribe()
    
    expect(subscriptionCount).toBe(1)  // 只订阅一次
  })
})
```

## 异步测试技巧

### 使用 fakeAsync（Angular）

```javascript
it('should debounce', fakeAsync(() => {
  const values = []
  
  source$.pipe(
    debounceTime(300)
  ).subscribe(v => values.push(v))
  
  source.next('a')
  tick(100)  // 前进 100ms
  
  source.next('b')
  tick(100)  // 前进 100ms
  
  source.next('c')
  tick(300)  // 前进 300ms
  
  expect(values).toEqual(['c'])  // 只有最后一个通过
}))
```

### 使用 Jest Fake Timers

```javascript
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

it('should delay', async () => {
  const values = []
  
  of(1).pipe(delay(1000)).subscribe(v => values.push(v))
  
  expect(values).toEqual([])
  
  jest.advanceTimersByTime(1000)
  
  expect(values).toEqual([1])
})
```

## 测试最佳实践

### 1. 隔离测试

```javascript
// 每个测试独立的 Scheduler
let testScheduler

beforeEach(() => {
  testScheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected)
  })
})
```

### 2. 测试边界情况

```javascript
describe('edge cases', () => {
  it('should handle empty source', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source = cold('|')
      const expected =    '|'
      
      expectObservable(source.pipe(
        map(x => x * 2)
      )).toBe(expected)
    })
  })
  
  it('should handle immediate error', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source = cold('#')
      const expected =    '#'
      
      expectObservable(source).toBe(expected)
    })
  })
})
```

### 3. 文档化测试

```javascript
/**
 * debounceTime 的行为：
 * 
 * 源:      -a-b-c-----d-e|
 * 输出:    ------c------e|
 * 
 * 每次值后等待静默期，只发射最后一个
 */
it('should debounce as documented', () => {
  // 测试代码...
})
```

## 本章小结

- 使用 toArray/firstValueFrom 进行简单测试
- 使用 TestScheduler 进行时间相关测试
- 弹珠图直观表达时间序列
- 测试边界情况和错误处理
- 追踪订阅生命周期

下一章学习弹珠测试的高级用法。
