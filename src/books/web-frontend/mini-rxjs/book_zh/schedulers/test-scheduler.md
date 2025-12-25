---
sidebar_position: 88
title: "TestScheduler 实现"
---

# TestScheduler 实现

TestScheduler 是测试异步 RxJS 代码的核心工具——让时间可控。

## 为什么需要 TestScheduler

异步代码测试的难题：

```javascript
// 这个测试需要等待真实的 3 秒
it('should debounce', async () => {
  const values = []
  
  source$.pipe(
    debounceTime(3000)
  ).subscribe(v => values.push(v))
  
  source$.next('a')
  await delay(3000)  // 实际等待 3 秒！
  
  expect(values).toEqual(['a'])
})

// 使用 TestScheduler，瞬间完成
it('should debounce', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c---|')
    const expected =    '------c--|'
    
    expectObservable(source.pipe(debounceTime(30))).toBe(expected)
  })
})
```

## 完整的 TestScheduler 实现

```javascript
class TestScheduler {
  constructor(assertDeepEqual = (a, b) => expect(a).toEqual(b)) {
    this.assertDeepEqual = assertDeepEqual
    this.frame = 0
    this.maxFrames = 750
    this.actions = []
    this.flushTests = []
  }
  
  now() {
    return this.frame
  }
  
  schedule(work, delay = 0, state) {
    const action = {
      work,
      state,
      time: this.frame + delay,
      cancelled: false
    }
    
    // 按时间排序插入
    this.insertAction(action)
    
    return {
      unsubscribe: () => {
        action.cancelled = true
      }
    }
  }
  
  insertAction(action) {
    const index = this.actions.findIndex(a => a.time > action.time)
    if (index === -1) {
      this.actions.push(action)
    } else {
      this.actions.splice(index, 0, action)
    }
  }
  
  // 解析弹珠图
  parseMarbles(marbles, values = {}, error) {
    const chars = marbles.split('')
    const events = []
    let frame = 0
    let groupStart = null
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      
      switch (char) {
        case ' ':
          // 空格忽略
          break
        case '-':
          frame += 1
          break
        case '(':
          groupStart = frame
          break
        case ')':
          groupStart = null
          break
        case '|':
          events.push({
            frame: groupStart ?? frame,
            notification: { kind: 'C' }
          })
          break
        case '#':
          events.push({
            frame: groupStart ?? frame,
            notification: { kind: 'E', error: error || new Error() }
          })
          break
        case '^':
          // 热 Observable 的订阅点
          break
        default:
          const value = values.hasOwnProperty(char) ? values[char] : char
          events.push({
            frame: groupStart ?? frame,
            notification: { kind: 'N', value }
          })
          if (groupStart === null) {
            frame += 1
          }
      }
    }
    
    return events
  }
  
  // 创建冷 Observable
  createColdObservable(marbles, values, error) {
    const events = this.parseMarbles(marbles, values, error)
    
    return new Observable(subscriber => {
      events.forEach(event => {
        this.schedule(() => {
          switch (event.notification.kind) {
            case 'N':
              subscriber.next(event.notification.value)
              break
            case 'E':
              subscriber.error(event.notification.error)
              break
            case 'C':
              subscriber.complete()
              break
          }
        }, event.frame)
      })
    })
  }
  
  // 创建热 Observable
  createHotObservable(marbles, values, error) {
    const events = this.parseMarbles(marbles, values, error)
    const subject = new Subject()
    
    events.forEach(event => {
      this.schedule(() => {
        switch (event.notification.kind) {
          case 'N':
            subject.next(event.notification.value)
            break
          case 'E':
            subject.error(event.notification.error)
            break
          case 'C':
            subject.complete()
            break
        }
      }, event.frame)
    })
    
    return subject.asObservable()
  }
  
  // 期望 Observable 匹配
  expectObservable(observable, subscriptionMarbles) {
    const actual = []
    let subscription
    
    // 解析订阅时机
    let subscribeFrame = 0
    let unsubscribeFrame = Infinity
    
    if (subscriptionMarbles) {
      const subChars = subscriptionMarbles.split('')
      for (let i = 0; i < subChars.length; i++) {
        if (subChars[i] === '^') {
          subscribeFrame = i
        } else if (subChars[i] === '!') {
          unsubscribeFrame = i
        }
      }
    }
    
    // 在订阅帧订阅
    this.schedule(() => {
      subscription = observable.subscribe({
        next: value => {
          actual.push({
            frame: this.frame,
            notification: { kind: 'N', value }
          })
        },
        error: error => {
          actual.push({
            frame: this.frame,
            notification: { kind: 'E', error }
          })
        },
        complete: () => {
          actual.push({
            frame: this.frame,
            notification: { kind: 'C' }
          })
        }
      })
    }, subscribeFrame)
    
    // 在取消订阅帧取消
    if (unsubscribeFrame < Infinity) {
      this.schedule(() => {
        subscription?.unsubscribe()
      }, unsubscribeFrame)
    }
    
    // 返回断言方法
    return {
      toBe: (marbles, values, error) => {
        const expected = this.parseMarbles(marbles, values, error)
        
        this.flushTests.push(() => {
          this.assertDeepEqual(actual, expected)
        })
      }
    }
  }
  
  // 期望订阅
  expectSubscriptions(subscriptions) {
    return {
      toBe: (marbles) => {
        // 解析订阅弹珠图
        const expected = this.parseSubscriptionMarbles(marbles)
        
        this.flushTests.push(() => {
          this.assertDeepEqual(subscriptions, expected)
        })
      }
    }
  }
  
  parseSubscriptionMarbles(marbles) {
    let subscribeFrame = null
    let unsubscribeFrame = Infinity
    
    const chars = marbles.split('')
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === '^') {
        subscribeFrame = i
      } else if (chars[i] === '!') {
        unsubscribeFrame = i
      }
    }
    
    return [{
      subscribedFrame: subscribeFrame,
      unsubscribedFrame: unsubscribeFrame
    }]
  }
  
  // 执行所有调度任务
  flush() {
    while (this.actions.length > 0 && this.frame < this.maxFrames) {
      const action = this.actions.shift()
      
      if (action.cancelled) continue
      
      this.frame = action.time
      
      const context = {
        schedule: (s, d) => this.schedule(action.work, d, s)
      }
      
      action.work.call(context, action.state)
    }
    
    // 运行所有断言
    this.flushTests.forEach(test => test())
    this.flushTests = []
  }
  
  // 运行测试的便捷方法
  run(callback) {
    const helpers = {
      cold: (m, v, e) => this.createColdObservable(m, v, e),
      hot: (m, v, e) => this.createHotObservable(m, v, e),
      expectObservable: (o, s) => this.expectObservable(o, s),
      expectSubscriptions: (s) => this.expectSubscriptions(s),
      flush: () => this.flush()
    }
    
    callback(helpers)
    this.flush()
    
    // 重置状态
    this.frame = 0
    this.actions = []
  }
}
```

## 弹珠图语法

```
-   : 1 帧时间（通常 10ms）
|   : complete
#   : error
a-z : 发射值
()  : 同步分组
^   : 订阅点（热 Observable）
!   : 取消订阅点
```

### 示例

```javascript
'-a-b-c|'
// 帧 0: 无
// 帧 1: a
// 帧 3: b
// 帧 5: c
// 帧 6: complete

'--a--b--#'
// 帧 2: a
// 帧 5: b
// 帧 8: error

'(ab|)'
// 帧 0: a, b, complete（同步）

'-a-^-b-!'
// 帧 0: a（订阅前）
// 帧 2: 订阅点
// 帧 4: b
// 帧 6: 取消订阅
```

## 实战测试示例

### 测试 map

```javascript
it('should map values', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable }) => {
    const source =   cold('-a-b-c|', { a: 1, b: 2, c: 3 })
    const expected =      '-a-b-c|', { a: 2, b: 4, c: 6 }
    
    expectObservable(source.pipe(
      map(x => x * 2)
    )).toBe('-a-b-c|', { a: 2, b: 4, c: 6 })
  })
})
```

### 测试 filter

```javascript
it('should filter values', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('-1-2-3-4-5|', {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5
    })
    
    expectObservable(source.pipe(
      filter(x => x % 2 === 0)
    )).toBe('---2---4--|', { 2: 2, 4: 4 })
  })
})
```

### 测试 debounceTime

```javascript
it('should debounce', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable }) => {
    // 每帧 1ms，debounce 3ms
    const source =   cold('-a-b-c-----d|')
    const expected =      '------c----d|'
    
    expectObservable(source.pipe(
      debounceTime(3, scheduler)
    )).toBe(expected)
  })
})
```

### 测试 mergeMap

```javascript
it('should flatten with mergeMap', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b|')
    const inner =  cold('--x-y|')
    
    // a 在帧1，产生 x(帧3) y(帧4)
    // b 在帧3，产生 x(帧5) y(帧6)
    const expected =    '---x(xy)y|'
    
    expectObservable(source.pipe(
      mergeMap(() => inner)
    )).toBe(expected)
  })
})
```

### 测试热 Observable

```javascript
it('should work with hot observable', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ hot, expectObservable }) => {
    // ^ 之前的值不会被接收
    const source = hot('--a-^-b-c-d|')
    const expected =       '--b-c-d|'
    
    expectObservable(source).toBe(expected)
  })
})
```

### 测试订阅生命周期

```javascript
it('should track subscriptions', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
    const source = cold('-a-b-c-|')
    const result = source.pipe(take(2))
    
    expectObservable(result).toBe('-a-(b|)')
    expectSubscriptions(source.subscriptions).toBe('^--!')
  })
})
```

### 测试错误场景

```javascript
it('should handle errors', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-#', { a: 1 }, new Error('oops'))
    
    expectObservable(source.pipe(
      catchError(() => of('recovered'))
    )).toBe('-a-(b|)', { a: 1, b: 'recovered' })
  })
})
```

### 测试取消订阅

```javascript
it('should handle unsubscription', () => {
  const scheduler = new TestScheduler()
  
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c-d-e|')
    
    // 在帧5取消订阅
    expectObservable(source, '^----!').toBe('-a-b-')
  })
})
```

## 测试技巧

### 自定义帧时间

```javascript
class TestScheduler {
  // 设置每帧代表的时间（毫秒）
  static frameTimeFactor = 10
  
  parseTime(marbles) {
    return marbles.length * TestScheduler.frameTimeFactor
  }
}
```

### 调试输出

```javascript
it('debug test', () => {
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c|')
    
    const debug$ = source.pipe(
      tap(v => console.log(`Frame ${scheduler.frame}: ${v}`))
    )
    
    expectObservable(debug$).toBe('-a-b-c|')
  })
})
```

### 比较复杂对象

```javascript
const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected)
})

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('-a-b|', {
    a: { id: 1, name: 'Alice' },
    b: { id: 2, name: 'Bob' }
  })
  
  expectObservable(source).toBe('-a-b|', {
    a: { id: 1, name: 'Alice' },
    b: { id: 2, name: 'Bob' }
  })
})
```

## 本章小结

- TestScheduler 让异步测试变成同步
- 弹珠图语法简洁表达时间序列
- `cold` 创建冷 Observable，`hot` 创建热 Observable
- `expectObservable` 断言输出，`expectSubscriptions` 断言订阅
- 可以测试 debounce、throttle 等时间相关操作符

下一章学习 RxJS 最佳实践。
