---
sidebar_position: 102
title: "单元测试策略"
---

# 单元测试策略

本章介绍 Mini RxJS 的测试策略和最佳实践。

## 测试框架配置

### Jest 配置

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### 测试辅助工具

```typescript
// test/helpers.ts
import { Observable } from '../src'

export function collectValues<T>(observable$: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const values: T[] = []
    observable$.subscribe({
      next: v => values.push(v),
      error: reject,
      complete: () => resolve(values)
    })
  })
}

export function expectComplete<T>(observable$: Observable<T>): Promise<void> {
  return new Promise((resolve, reject) => {
    observable$.subscribe({
      error: reject,
      complete: resolve
    })
  })
}

export function expectError<T>(
  observable$: Observable<T>,
  expectedError?: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    observable$.subscribe({
      next: () => reject(new Error('Should not emit')),
      error: (err) => {
        if (expectedError && err.message !== expectedError.message) {
          reject(new Error(`Expected "${expectedError.message}", got "${err.message}"`))
        } else {
          resolve()
        }
      },
      complete: () => reject(new Error('Should not complete'))
    })
  })
}
```

## Observable 核心测试

### 构造函数测试

```typescript
describe('Observable', () => {
  describe('constructor', () => {
    it('should create Observable with subscribe function', () => {
      const observable = new Observable(subscriber => {
        subscriber.next(1)
        subscriber.complete()
      })
      
      expect(observable).toBeInstanceOf(Observable)
    })
    
    it('should not execute until subscribed', () => {
      const spy = jest.fn()
      
      new Observable(() => {
        spy()
      })
      
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
```

### subscribe 测试

```typescript
describe('subscribe', () => {
  it('should accept observer object', async () => {
    const values = await collectValues(of(1, 2, 3))
    expect(values).toEqual([1, 2, 3])
  })
  
  it('should accept next function', (done) => {
    let received = 0
    of(42).subscribe(value => {
      received = value
    })
    
    setTimeout(() => {
      expect(received).toBe(42)
      done()
    }, 0)
  })
  
  it('should return Subscription', () => {
    const sub = of(1).subscribe()
    expect(sub.unsubscribe).toBeDefined()
  })
})
```

## 操作符测试

### map 测试

```typescript
describe('map', () => {
  it('should transform values', async () => {
    const result = await collectValues(
      of(1, 2, 3).pipe(map(x => x * 2))
    )
    expect(result).toEqual([2, 4, 6])
  })
  
  it('should pass index', async () => {
    const indices: number[] = []
    
    await collectValues(
      of('a', 'b', 'c').pipe(
        map((_, i) => {
          indices.push(i)
          return i
        })
      )
    )
    
    expect(indices).toEqual([0, 1, 2])
  })
  
  it('should propagate errors from source', async () => {
    const error = new Error('test')
    const source = new Observable(sub => sub.error(error))
    
    await expectError(source.pipe(map(x => x)), error)
  })
  
  it('should handle project errors', async () => {
    const source = of(1, 2, 3).pipe(
      map(x => {
        if (x === 2) throw new Error('boom')
        return x
      })
    )
    
    await expectError(source, new Error('boom'))
  })
})
```

### filter 测试

```typescript
describe('filter', () => {
  it('should filter values', async () => {
    const result = await collectValues(
      of(1, 2, 3, 4).pipe(filter(x => x % 2 === 0))
    )
    expect(result).toEqual([2, 4])
  })
  
  it('should complete when source completes', async () => {
    await expectComplete(
      of(1, 2).pipe(filter(() => false))
    )
  })
})
```

### switchMap 测试

```typescript
describe('switchMap', () => {
  it('should switch to inner observable', async () => {
    const result = await collectValues(
      of(1, 2).pipe(
        switchMap(x => of(x, x * 10))
      )
    )
    // 只有最后一个 2 的结果
    expect(result).toContain(2)
    expect(result).toContain(20)
  })
  
  it('should cancel previous inner', (done) => {
    const cancelled: number[] = []
    
    of(1, 2, 3).pipe(
      switchMap(x => new Observable(sub => {
        sub.next(x)
        return () => cancelled.push(x)
      }))
    ).subscribe({
      complete: () => {
        expect(cancelled).toEqual([1, 2])
        done()
      }
    })
  })
})
```

## Subject 测试

```typescript
describe('Subject', () => {
  it('should multicast values', () => {
    const subject = new Subject<number>()
    const results1: number[] = []
    const results2: number[] = []
    
    subject.subscribe(x => results1.push(x))
    subject.subscribe(x => results2.push(x))
    
    subject.next(1)
    subject.next(2)
    
    expect(results1).toEqual([1, 2])
    expect(results2).toEqual([1, 2])
  })
})

describe('BehaviorSubject', () => {
  it('should emit initial value', () => {
    const subject = new BehaviorSubject(42)
    let received: number | undefined
    
    subject.subscribe(x => received = x)
    
    expect(received).toBe(42)
  })
  
  it('should return current value', () => {
    const subject = new BehaviorSubject(1)
    subject.next(2)
    
    expect(subject.getValue()).toBe(2)
  })
})

describe('ReplaySubject', () => {
  it('should replay values to late subscriber', () => {
    const subject = new ReplaySubject<number>(2)
    
    subject.next(1)
    subject.next(2)
    subject.next(3)
    
    const results: number[] = []
    subject.subscribe(x => results.push(x))
    
    expect(results).toEqual([2, 3])  // 只重放最后 2 个
  })
})
```

## 异步测试

### 使用 done 回调

```typescript
it('should emit after delay', (done) => {
  timer(100).subscribe({
    next: (value) => {
      expect(value).toBe(0)
      done()
    }
  })
})
```

### 使用 async/await

```typescript
it('should emit after delay', async () => {
  const result = await firstValueFrom(timer(100))
  expect(result).toBe(0)
})
```

### 使用 fake timers

```typescript
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

it('should emit on interval', () => {
  const values: number[] = []
  
  interval(100).pipe(take(3)).subscribe(x => values.push(x))
  
  jest.advanceTimersByTime(300)
  
  expect(values).toEqual([0, 1, 2])
})
```

## Marble 测试

```typescript
import { TestScheduler } from '../src/testing'

describe('marble testing', () => {
  let testScheduler: TestScheduler
  
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })
  
  it('should map values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source = cold('a-b-c|', { a: 1, b: 2, c: 3 })
      const expected =    'x-y-z|'
      
      expectObservable(source.pipe(map(x => x * 2))).toBe(
        expected,
        { x: 2, y: 4, z: 6 }
      )
    })
  })
  
  it('should debounce', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source = cold('a-b---c|')
      const expected =    '--b-----c|'
      
      expectObservable(source.pipe(debounceTime(2))).toBe(expected)
    })
  })
})
```

## 覆盖率目标

### 边界情况

```typescript
describe('edge cases', () => {
  it('should handle empty source', async () => {
    const result = await collectValues(EMPTY.pipe(map(x => x)))
    expect(result).toEqual([])
  })
  
  it('should handle immediate error', async () => {
    await expectError(
      throwError(() => new Error('boom')).pipe(map(x => x))
    )
  })
  
  it('should handle immediate complete', async () => {
    await expectComplete(of<number>())
  })
})
```

### 取消订阅

```typescript
describe('unsubscription', () => {
  it('should call cleanup on unsubscribe', () => {
    const cleanup = jest.fn()
    
    const source = new Observable(() => cleanup)
    const sub = source.subscribe()
    
    sub.unsubscribe()
    
    expect(cleanup).toHaveBeenCalled()
  })
  
  it('should not emit after unsubscribe', () => {
    const values: number[] = []
    
    const sub = interval(100).subscribe(x => values.push(x))
    
    jest.advanceTimersByTime(250)
    sub.unsubscribe()
    jest.advanceTimersByTime(200)
    
    expect(values).toEqual([0, 1])
  })
})
```

## 本章小结

- Jest 配置 TypeScript 和覆盖率
- 使用辅助函数简化测试
- 测试各类操作符行为
- 异步测试使用 fake timers
- Marble 测试验证时间行为
- 覆盖边界情况和取消订阅

下一章学习 Tree-shaking 和模块设计。
