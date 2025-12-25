---
sidebar_position: 89
title: "Scheduler 最佳实践"
---

# Scheduler 最佳实践

本章总结 Scheduler 的使用模式和最佳实践。

## 何时使用 Scheduler

### 默认情况：不需要指定

```javascript
// 大多数情况下，默认行为就是正确的
of(1, 2, 3).pipe(
  map(x => x * 2),
  filter(x => x > 2)
).subscribe(console.log)

// 不需要显式指定 Scheduler
```

### 需要 Scheduler 的场景

1. **避免 UI 阻塞**
```javascript
// 处理大量数据时
from(bigArray, asyncScheduler).pipe(
  map(heavyComputation)
)
```

2. **动画和视觉更新**
```javascript
// 需要平滑渲染
source$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(updateUI)
```

3. **测试时间相关代码**
```javascript
// 可控的时间测试
debounceTime(300, testScheduler)
```

4. **控制执行优先级**
```javascript
// 低优先级任务
analytics$.pipe(observeOn(idleScheduler))

// 高优先级任务
userInput$.pipe(observeOn(asapScheduler))
```

## 选择正确的 Scheduler

### 决策流程

```
需要同步执行吗？
├── 是 → 不指定 Scheduler 或用 queueScheduler
└── 否 → 需要与渲染同步吗？
    ├── 是 → animationFrameScheduler
    └── 否 → 需要尽快执行吗？
        ├── 是 → asapScheduler
        └── 否 → asyncScheduler
```

### 场景对应

```javascript
// 同步递归，避免栈溢出
queueScheduler

// DOM 事件处理后立即响应
asapScheduler

// 定时器、延迟
asyncScheduler

// 动画、canvas 绑定、滚动
animationFrameScheduler
```

## 性能优化

### 减少调度开销

```javascript
// ❌ 多次切换
source$.pipe(
  observeOn(asyncScheduler),
  map(x => x * 2),
  observeOn(asyncScheduler),  // 不必要
  filter(x => x > 0),
  observeOn(asyncScheduler)   // 不必要
)

// ✅ 只在需要时切换
source$.pipe(
  map(x => x * 2),
  filter(x => x > 0),
  observeOn(asyncScheduler)  // 一次足够
)
```

### 批量处理

```javascript
// ❌ 每个值单独调度
source$.pipe(
  observeOn(asyncScheduler)  // 每个值一次 setTimeout
)

// ✅ 批量处理
source$.pipe(
  bufferTime(16),  // 收集 16ms 内的值
  observeOn(animationFrameScheduler),  // 一次性处理
  mergeMap(batch => from(batch))
)
```

### 合并同步操作

```javascript
// ❌ 分散的操作
const a$ = source$.pipe(observeOn(asyncScheduler), map(x => x.a))
const b$ = source$.pipe(observeOn(asyncScheduler), map(x => x.b))

// ✅ 集中处理
const shared$ = source$.pipe(
  observeOn(asyncScheduler),
  share()
)
const a$ = shared$.pipe(map(x => x.a))
const b$ = shared$.pipe(map(x => x.b))
```

## 可测试性设计

### 注入 Scheduler

```javascript
// ❌ 硬编码 Scheduler
class SearchService {
  search(query) {
    return of(query).pipe(
      debounceTime(300)  // 使用默认 Scheduler
    )
  }
}

// ✅ 可注入 Scheduler
class SearchService {
  constructor(private scheduler = asyncScheduler) {}
  
  search(query) {
    return of(query).pipe(
      debounceTime(300, this.scheduler)
    )
  }
}

// 测试时
const testScheduler = new TestScheduler()
const service = new SearchService(testScheduler)
```

### 工厂函数

```javascript
// 可配置的操作符工厂
function createDebounce(scheduler = asyncScheduler) {
  return (time) => debounceTime(time, scheduler)
}

// 生产环境
const debounce = createDebounce()

// 测试环境
const debounce = createDebounce(testScheduler)
```

### 配置对象

```javascript
// 集中管理 Scheduler 配置
const schedulerConfig = {
  async: asyncScheduler,
  animation: animationFrameScheduler,
  test: null  // 测试时替换
}

function getScheduler(type) {
  return schedulerConfig[type] || asyncScheduler
}

// 使用
source$.pipe(
  observeOn(getScheduler('async'))
)

// 测试时
schedulerConfig.async = testScheduler
```

## 常见陷阱

### 1. subscribeOn 不影响后续操作

```javascript
// subscribeOn 只影响订阅时机
source$.pipe(
  subscribeOn(asyncScheduler),  // 异步订阅
  map(x => x * 2)  // 但 map 还是同步执行
)

// 如果需要异步处理，用 observeOn
source$.pipe(
  observeOn(asyncScheduler),
  map(x => x * 2)
)
```

### 2. 多个 subscribeOn 只有第一个生效

```javascript
source$.pipe(
  subscribeOn(asyncScheduler),   // 生效
  subscribeOn(asapScheduler)     // 无效
)
```

### 3. 忘记在测试中使用 TestScheduler

```javascript
// ❌ 测试会真的等待
it('debounces', async () => {
  const values = []
  source$.pipe(debounceTime(1000)).subscribe(v => values.push(v))
  await delay(1000)
  expect(values).toEqual([...])
})

// ✅ 使用 TestScheduler
it('debounces', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a-b-c|')
    expectObservable(source.pipe(
      debounceTime(20, testScheduler)
    )).toBe('------c|')
  })
})
```

### 4. 动画帧中执行过多操作

```javascript
// ❌ 每帧执行太多操作
source$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(data => {
  heavyComputation(data)  // 可能导致掉帧
  updateDOM(data)
})

// ✅ 分离计算和渲染
source$.pipe(
  observeOn(asyncScheduler),
  map(heavyComputation),
  observeOn(animationFrameScheduler)
).subscribe(updateDOM)
```

### 5. 混淆同步和异步错误处理

```javascript
// 同步错误
try {
  of(1).pipe(
    map(() => { throw new Error('sync') })
  ).subscribe()
} catch (e) {
  // 能捕获
}

// 异步错误
try {
  of(1, asyncScheduler).pipe(
    map(() => { throw new Error('async') })
  ).subscribe()
} catch (e) {
  // 捕获不到！
}

// 正确处理异步错误
of(1, asyncScheduler).pipe(
  map(() => { throw new Error('async') })
).subscribe({
  error: e => console.error(e)  // 正确捕获
})
```

## 模式：Scheduler 抽象层

```javascript
// 创建 Scheduler 抽象层
class SchedulerService {
  constructor() {
    this.isTestMode = false
    this.testScheduler = null
  }
  
  enableTestMode(testScheduler) {
    this.isTestMode = true
    this.testScheduler = testScheduler
  }
  
  disableTestMode() {
    this.isTestMode = false
    this.testScheduler = null
  }
  
  get async() {
    return this.isTestMode ? this.testScheduler : asyncScheduler
  }
  
  get asap() {
    return this.isTestMode ? this.testScheduler : asapScheduler
  }
  
  get animationFrame() {
    return this.isTestMode ? this.testScheduler : animationFrameScheduler
  }
  
  get queue() {
    return this.isTestMode ? this.testScheduler : queueScheduler
  }
  
  // 便捷方法
  delay(ms) {
    return delay(ms, this.async)
  }
  
  debounce(ms) {
    return debounceTime(ms, this.async)
  }
  
  throttle(ms) {
    return throttleTime(ms, this.async)
  }
}

// 全局单例
export const schedulers = new SchedulerService()

// 使用
import { schedulers } from './scheduler-service'

source$.pipe(
  schedulers.debounce(300),
  observeOn(schedulers.async)
)

// 测试
const testScheduler = new TestScheduler()
schedulers.enableTestMode(testScheduler)
// 运行测试
schedulers.disableTestMode()
```

## 检查清单

使用 Scheduler 时的检查清单：

```markdown
- [ ] 是否真的需要 Scheduler？默认行为是否足够？
- [ ] 选择了正确的 Scheduler 类型？
- [ ] 是否过度使用了 observeOn？
- [ ] Scheduler 是否可注入用于测试？
- [ ] 动画帧内的操作是否足够轻量？
- [ ] 是否正确处理了异步错误？
- [ ] 是否考虑了批量处理优化？
```

## 本章小结

- 大多数情况不需要显式指定 Scheduler
- 根据场景选择合适的 Scheduler
- 减少不必要的 Scheduler 切换
- 设计可测试的代码，注入 Scheduler
- 注意同步/异步错误处理的区别

下一章进入测试主题——如何测试 RxJS 代码。
