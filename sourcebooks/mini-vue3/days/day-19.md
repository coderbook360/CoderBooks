# Day 19: 响应式系统性能优化

> 学习日期: 2025-12-11  
> 预计用时: 1小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标
- [ ] 实现调度器（Scheduler）优化
- [ ] 实现批量更新（Batch Update）
- [ ] 实现依赖去重
- [ ] 理解事件循环和微任务

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. 调度器优化的必要性

#### 1.1 问题场景

**问题：同步更新导致的性能问题**

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

// 短时间内多次修改
state.count++  // 打印 1
state.count++  // 打印 2
state.count++  // 打印 3
// effect 执行了 4 次（初始 + 3次更新）

// 但实际上，我们只需要最后的结果 3
```

**性能问题**：
1. **重复渲染**：组件会被渲染多次
2. **DOM 操作浪费**：每次渲染都操作 DOM
3. **计算资源浪费**：执行不必要的计算

**解决方案：批量更新**
```javascript
// 理想情况：合并多次更新
state.count++
state.count++
state.count++
// 只在最后执行一次 effect，打印 3
```

#### 1.2 调度器（Scheduler）原理

**调度器的作用**：
1. **控制执行时机**：何时执行 effect
2. **合并更新**：多次触发合并为一次执行
3. **优先级管理**：控制 effect 的执行顺序

**Vue 3 的调度策略**：

```javascript
// 任务队列
const queue: Set<EffectFunction> = new Set()
let isFlushing = false
let isFlushPending = false

function queueJob(job: EffectFunction) {
  // 添加到队列
  queue.add(job)
  
  // 如果还没有开始刷新，安排刷新
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    // 在下一个微任务中执行
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  isFlushPending = false
  isFlushing = true
  
  // 执行所有任务
  queue.forEach(job => job())
  queue.clear()
  
  isFlushing = false
}
```

**执行流程**：

```
同步代码执行:
  state.count++  -> 将 effect 加入队列
  state.count++  -> effect 已在队列，跳过
  state.count++  -> effect 已在队列，跳过
  安排微任务：Promise.resolve().then(flushJobs)

同步代码执行完毕

微任务执行:
  flushJobs() -> 执行队列中的所有 effect
  清空队列
```

#### 1.3 事件循环和微任务

**JavaScript 事件循环**：

```
┌───────────────────────────┐
│     调用栈（Call Stack）     │
│                           │
│  当前正在执行的代码          │
└───────────────────────────┘
           ↓
┌───────────────────────────┐
│     微任务队列（Microtask）   │
│                           │
│  Promise.then, queueMicrotask │
└───────────────────────────┘
           ↓
┌───────────────────────────┐
│     宏任务队列（Macrotask）   │
│                           │
│  setTimeout, setInterval   │
└───────────────────────────┘
```

**执行顺序**：
1. 执行同步代码（调用栈）
2. 清空微任务队列
3. 执行一个宏任务
4. 重复 2-3

```javascript
console.log('1. 同步代码')

setTimeout(() => {
  console.log('4. 宏任务')
}, 0)

Promise.resolve().then(() => {
  console.log('3. 微任务')
})

console.log('2. 同步代码')

// 输出顺序: 1 -> 2 -> 3 -> 4
```

**为什么使用微任务？**
- 比宏任务更快执行
- 在下一次渲染前执行
- 可以合并多次状态更新

---

## 💻 实践任务

### 任务目标
实现调度器系统，支持批量更新和依赖去重。

### 测试用例

```typescript
describe('scheduler', () => {
  it('应该批量执行更新', async () => {
    const state = reactive({ count: 0 })
    let dummy
    let runCount = 0
    
    effect(() => {
      dummy = state.count
      runCount++
    })
    
    expect(dummy).toBe(0)
    expect(runCount).toBe(1)
    
    // 同步修改多次
    state.count++
    state.count++
    state.count++
    
    // 同步代码执行完，effect 还没执行
    expect(runCount).toBe(1)
    
    // 等待微任务
    await nextTick()
    
    // 只执行一次，得到最终结果
    expect(dummy).toBe(3)
    expect(runCount).toBe(2)
  })
  
  it('应该去除重复的 effect', async () => {
    const state = reactive({ count: 0 })
    const fn = vi.fn(() => {
      state.count
    })
    
    effect(fn)
    
    // 多次触发同一个 effect
    state.count++
    state.count++
    
    await nextTick()
    
    // 只执行一次
    expect(fn).toHaveBeenCalledTimes(2)  // 初始 + 批量更新
  })
  
  it('effect 嵌套时应该正确处理', async () => {
    const state = reactive({ count: 0, double: 0 })
    
    effect(() => {
      state.double = state.count * 2
    })
    
    let dummy
    effect(() => {
      dummy = state.double
    })
    
    state.count = 1
    
    await nextTick()
    
    expect(state.double).toBe(2)
    expect(dummy).toBe(2)
  })
})
```

### 实现步骤

#### 步骤1: 创建调度器模块 (预估10分钟)

创建 `src/reactivity/scheduler.ts`:

```typescript
// 任务队列（使用 Set 自动去重）
const queue: Set<EffectFunction> = new Set()

// 标记
let isFlushing = false  // 正在刷新队列
let isFlushPending = false  // 已安排刷新

type EffectFunction = () => void

/**
 * 将任务加入队列
 */
export function queueJob(job: EffectFunction) {
  // 添加到队列（Set 自动去重）
  queue.add(job)
  
  // 安排刷新
  queueFlush()
}

/**
 * 安排刷新队列
 */
function queueFlush() {
  if (isFlushing || isFlushPending) {
    return
  }
  
  isFlushPending = true
  
  // 在微任务中执行
  Promise.resolve().then(flushJobs)
}

/**
 * 刷新队列
 */
function flushJobs() {
  isFlushPending = false
  isFlushing = true
  
  try {
    // 执行所有任务
    queue.forEach(job => {
      job()
    })
  } finally {
    // 清空队列
    queue.clear()
    isFlushing = false
    
    // 如果在执行过程中又有新任务，继续刷新
    if (queue.size > 0) {
      queueFlush()
    }
  }
}

/**
 * 等待下一次队列刷新
 */
export function nextTick(fn?: () => void): Promise<void> {
  const p = Promise.resolve()
  return fn ? p.then(fn) : p
}
```

#### 步骤2: 修改 effect，使用调度器 (预估10分钟)

修改 `src/reactivity/effect.ts`:

```typescript
import { queueJob } from './scheduler'

export interface EffectOptions {
  scheduler?: (effect: ReactiveEffect) => void
  lazy?: boolean
}

export function effect<T = any>(fn: () => T, options: EffectOptions = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  
  // 非 lazy 立即执行
  if (!options.lazy) {
    _effect.run()
  }
  
  const runner = _effect.run.bind(_effect) as any
  runner.effect = _effect
  
  return runner
}

// 修改 trigger，使用默认的调度器
export function trigger(target: object, key: string | symbol, type?: 'set' | 'add') {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  const effects = depsMap.get(key)
  if (effects) {
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effect => {
      // 如果有调度器，使用调度器
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        // 默认使用批量更新调度器
        queueJob(() => effect.run())
      }
    })
  }
}
```

#### 步骤3: 修改 computed 和 watch (预估5分钟)

computed 不使用批量更新（立即更新）：

```typescript
// src/reactivity/computed.ts
class ComputedRefImpl<T> {
  constructor(getter: () => T) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        // computed 立即触发，不使用批量更新
        trigger(this, 'value')
      }
    })
  }
}
```

watch 可以选择调度策略：

```typescript
// src/reactivity/watch.ts
export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'  // 执行时机
}

function doWatch(/* ... */) {
  const effectFn = new ReactiveEffect(getter, () => {
    if (options.flush === 'sync') {
      // 同步执行
      job()
    } else {
      // 批量更新
      queueJob(job)
    }
  })
  
  // ...
}
```

#### 步骤4: 导出 API (预估2分钟)

修改 `src/reactivity/index.ts`:

```typescript
export { reactive, isReactive, toRaw } from './reactive'
export { ref, isRef } from './ref'
export { effect } from './effect'
export { computed } from './computed'
export { watch, watchEffect } from './watch'
export { nextTick } from './scheduler'
```

### 性能对比测试

```typescript
describe('性能测试', () => {
  it('批量更新应该减少执行次数', async () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    
    effect(() => {
      state.count
      runCount++
    })
    
    const start = performance.now()
    
    // 修改 1000 次
    for (let i = 0; i < 1000; i++) {
      state.count++
    }
    
    await nextTick()
    
    const end = performance.now()
    
    console.log(`执行次数: ${runCount}`)  // 应该是 2（初始 + 1次批量更新）
    console.log(`耗时: ${end - start}ms`)
    
    expect(runCount).toBe(2)
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么使用微任务而不是宏任务（setTimeout）？
**提示**: 考虑执行时机和页面渲染的关系。

### 问题2: 如果在 effect 中修改响应式数据，会发生什么？
**提示**: 考虑无限递归的问题和如何避免。

### 问题3: Vue 3 的调度器如何处理 effect 的优先级？
**提示**: 查看源码中的 pre/post flush。

---

## 📝 学习总结

完成今天的学习后，请回答以下问题：

1. **今天学到的核心知识点是什么？**
   - 

2. **遇到了哪些困难？如何解决的？**
   - 

3. **有哪些新的思考和疑问？**
   - 

4. **如何将今天的知识应用到实际项目中？**
   - 

---

## 📖 扩展阅读

- [事件循环和微任务](https://javascript.info/event-loop) - 阅读时间: 20分钟
- [Vue 3 源码 - scheduler.ts](../../.book_refe/core/packages/runtime-core/src/scheduler.ts) - 阅读时间: 40分钟
- [异步更新策略](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html#深层响应性) - 阅读时间: 15分钟

---

## ⏭️ 明日预告

明天我们将学习: **第二周总结和 Code Review**

主要内容:
- 响应式系统完整回顾
- 与官方源码对比
- 性能测试和优化
- 准备下周的 computed 和 watch 进阶

建议预习: 整理本周笔记
