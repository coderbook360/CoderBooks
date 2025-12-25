---
sidebar_position: 92
title: "弹珠测试详解"
---

# 弹珠测试详解

弹珠测试是 RxJS 测试的核心技术——用文本图直观表达时间序列。

## 弹珠图语法

### 基本符号

```
-    1 帧（时间单位）
|    complete
#    error
a-z  发射值
()   同步分组
^    订阅点（热 Observable）
!    取消订阅点
空格  忽略，用于对齐
```

### 帧时间

默认每帧代表特定时间（通常 1ms 或 10ms）：

```javascript
'-a-b-c|'
// 帧 0: 无
// 帧 1: 发射 a
// 帧 2: 无
// 帧 3: 发射 b
// 帧 4: 无
// 帧 5: 发射 c
// 帧 6: complete
```

### 同步分组

括号内的事件在同一帧发生：

```javascript
'(abc|)'
// 帧 0: 发射 a, b, c，然后 complete
// 所有事件同步发生

'-a-(bc)-d|'
// 帧 1: a
// 帧 3: b 和 c 同步
// 帧 5: d
// 帧 6: complete
```

### 时间语法

RxJS 7+ 支持显式时间：

```javascript
'a 100ms b 200ms c|'
// a 后等待 100ms
// b 后等待 200ms
// 然后 c 和 complete
```

## TestScheduler API

### 创建 TestScheduler

```javascript
const testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected)
})
```

### run 方法

```javascript
testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions, flush }) => {
  // cold: 创建冷 Observable
  // hot: 创建热 Observable
  // expectObservable: 断言 Observable 输出
  // expectSubscriptions: 断言订阅
  // flush: 手动执行所有调度任务
})
```

### 创建冷 Observable

```javascript
testScheduler.run(({ cold, expectObservable }) => {
  // 简单值
  const a$ = cold('-a-b-c|')
  
  // 自定义值
  const b$ = cold('-a-b-c|', { a: 1, b: 2, c: 3 })
  
  // 带错误
  const c$ = cold('-a-#', { a: 1 }, new Error('oops'))
})
```

### 创建热 Observable

```javascript
testScheduler.run(({ hot, expectObservable }) => {
  // ^ 表示订阅点，之前的值不会被接收
  const source = hot('--a-^-b-c-d|')
  
  expectObservable(source).toBe('--b-c-d|')
})
```

## 实战示例

### 测试 map

```javascript
it('should double values', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source =   cold('-a-b-c|', { a: 1, b: 2, c: 3 })
    const expected =      '-a-b-c|'
    
    expectObservable(source.pipe(
      map(x => x * 2)
    )).toBe(expected, { a: 2, b: 4, c: 6 })
  })
})
```

### 测试 filter

```javascript
it('should filter odd numbers', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source =   cold('-1-2-3-4-5|', { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 })
    const expected =      '---2---4--|'
    
    expectObservable(source.pipe(
      filter(x => x % 2 === 0)
    )).toBe(expected, { 2: 2, 4: 4 })
  })
})
```

### 测试 debounceTime

```javascript
it('should debounce rapid emissions', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    // 3 帧静默期
    const source =   cold('-a-b-c------d|')
    const expected =      '-------c-----d|'
    //                     ^--^--^------^
    //                     a  b  c      d
    //                     重置 重置 发射  发射
    
    expectObservable(source.pipe(
      debounceTime(3)
    )).toBe(expected)
  })
})
```

### 测试 switchMap

```javascript
it('should switch to new inner observable', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const outer =   cold('-a------b------|')
    const inner1 =  cold('--x-y-z|')
    const inner2 =  cold('--1-2-3|')
    const expected =     '---x-y---1-2-3-|'
    //                    ^a      ^b
    //                      inner1  inner2
    
    let count = 0
    const project = () => ++count === 1 ? inner1 : inner2
    
    expectObservable(outer.pipe(
      switchMap(project)
    )).toBe(expected)
  })
})
```

### 测试 merge

```javascript
it('should merge multiple streams', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const a$ = cold('-a-----c-|')
    const b$ = cold('---b-----d|')
    const expected = '-a-b---c-d|'
    
    expectObservable(merge(a$, b$)).toBe(expected)
  })
})
```

### 测试 combineLatest

```javascript
it('should combine latest values', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const a$ = cold('-a----b---|')
    const b$ = cold('---1----2-|')
    const expected = '---x--y-z-|'
    
    expectObservable(combineLatest([a$, b$]).pipe(
      map(([a, b]) => a + b)
    )).toBe(expected, { x: 'a1', y: 'b1', z: 'b2' })
  })
})
```

### 测试 catchError

```javascript
it('should catch and recover', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source =   cold('-a-b-#', { a: 1, b: 2 }, new Error())
    const recovery = cold('-----(c|)', { c: 99 })
    const expected =      '-a-b-----(c|)'
    
    expectObservable(source.pipe(
      catchError(() => recovery)
    )).toBe(expected, { a: 1, b: 2, c: 99 })
  })
})
```

### 测试 retry

```javascript
it('should retry on error', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    let attempts = 0
    
    const source = defer(() => {
      attempts++
      if (attempts < 3) {
        return cold('-#')
      }
      return cold('-a|')
    })
    
    // 第一次尝试：-#
    // 第二次尝试：-#
    // 第三次尝试：-a|
    const expected = '---a|'
    
    expectObservable(source.pipe(
      retry(3)
    )).toBe(expected)
  })
})
```

## 订阅断言

### 基本用法

```javascript
it('should track subscriptions', () => {
  testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
    const source = cold('-a-b-c-d-e|')
    const subs =        '^----!'  // 订阅到取消
    const expected =    '-a-b-'
    
    expectObservable(source.pipe(take(2))).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})
```

### 多个订阅

```javascript
it('should track multiple subscriptions', () => {
  testScheduler.run(({ cold, expectSubscriptions }) => {
    const source = cold('-a-b-c|')
    
    // 第一个订阅：完整订阅
    const sub1 = '^-----!'
    
    // 第二个订阅：延迟订阅
    const sub2 = '--^---!'
    
    const shared = source.pipe(share())
    
    // 模拟两个订阅
    shared.subscribe()
    setTimeout(() => shared.subscribe(), 2)
    
    expectSubscriptions(source.subscriptions).toBe([sub1, sub2])
  })
})
```

## 热 Observable 测试

### 订阅点

```javascript
it('should work with hot observable', () => {
  testScheduler.run(({ hot, expectObservable }) => {
    // ^ 之前的值不会被测试接收
    const source = hot('--a--b-^-c-d-e|')
    const expected =          '--c-d-e|'
    
    expectObservable(source).toBe(expected)
  })
})
```

### BehaviorSubject 模拟

```javascript
it('should replay current value', () => {
  testScheduler.run(({ hot, expectObservable }) => {
    // a 在订阅点之前，但 BehaviorSubject 会重放
    const source = hot('-a-^-b-c|')
    
    // 使用 BehaviorSubject 实现
    const behavior = new BehaviorSubject()
    source.subscribe(behavior)
    
    expectObservable(behavior).toBe('a-b-c|')
  })
})
```

## 自定义订阅时机

```javascript
it('should test with custom subscription', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c-d-e|')
    
    // ^---! 表示在帧 0 订阅，帧 4 取消
    const subscription = '^---!'
    const expected =     '-a-b'
    
    expectObservable(source, subscription).toBe(expected)
  })
})
```

## 调试技巧

### 打印中间值

```javascript
it('debug test', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c|')
    
    const debug$ = source.pipe(
      tap({
        next: v => console.log(`Value: ${v}`),
        complete: () => console.log('Complete')
      })
    )
    
    expectObservable(debug$).toBe('-a-b-c|')
  })
})
```

### 可视化帧

```javascript
function visualizeMarbles(marbles) {
  console.log('Frame: ' + marbles.split('').map((_, i) => i % 10).join(''))
  console.log('Value: ' + marbles)
}

visualizeMarbles('-a-b-c-----d|')
// Frame: 0123456789012
// Value: -a-b-c-----d|
```

## 常见陷阱

### 同步分组的完成

```javascript
// 错误理解
'(abc|)'  // a, b, c, complete 都在帧 0

// 不是
'-a-b-c-|'  // 这是不同的时间序列
```

### 帧计算

```javascript
'-a-b-|'
// 帧 0: -
// 帧 1: a
// 帧 2: -
// 帧 3: b
// 帧 4: -
// 帧 5: |

// 总共 6 帧（0-5）
```

### 热 Observable 的订阅点

```javascript
// ^ 是订阅点，不占帧
hot('--a-^-b-c|')
//   帧: 01234567
//   订阅点在帧 4
//   测试从帧 4 开始，b 在帧 5
```

## 高级用法

### 时间放大

```javascript
// 使用 ms 语法
testScheduler.run(({ cold, expectObservable }) => {
  const source = cold('a 500ms b 500ms c|')
  const expected =    '501ms b 500ms c|'  // a 被 debounce 掉
  
  expectObservable(source.pipe(
    debounceTime(100)
  )).toBe(expected)
})
```

### 多个期望

```javascript
testScheduler.run(({ cold, expectObservable }) => {
  const source = cold('-a-b-c|')
  const filtered = source.pipe(filter(x => x !== 'b'))
  const mapped = source.pipe(map(x => x.toUpperCase()))
  
  expectObservable(filtered).toBe('-a---c|')
  expectObservable(mapped).toBe('-A-B-C|')
})
```

## 本章小结

- 弹珠图用符号表示时间序列
- `-` 表示帧，`|` 表示完成，`#` 表示错误
- `()` 表示同步分组
- `^` 表示热 Observable 的订阅点
- 使用 expectSubscriptions 断言订阅生命周期

下一章学习 Mock 和 Stub 技术。
