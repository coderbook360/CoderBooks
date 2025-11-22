# Day 7: effect 选项和优化

> 学习日期: 2025年11月28日  
> 预计用时: 2小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 实现 effect 的 lazy 选项
- [ ] 实现 scheduler 调度器
- [ ] 实现 onStop 回调
- [ ] 掌握 effect 的高级用法
- [ ] 通过 10+ 测试用例

## ⏰ 时间规划

- 理论学习: 40分钟
- 编码实践: 1小时
- 测试调试: 20分钟

---

## 📚 理论知识详解

### 1. effect 选项概览

#### 1.1 完整的选项接口

```typescript
interface EffectOptions {
  lazy?: boolean                    // 延迟执行
  scheduler?: EffectScheduler       // 自定义调度器
  onStop?: () => void               // 停止时的回调
  onTrack?: (event: DebuggerEvent) => void  // 依赖收集时的回调
  onTrigger?: (event: DebuggerEvent) => void // 触发更新时的回调
  allowRecurse?: boolean            // 允许递归
}

type EffectScheduler = (effect: ReactiveEffect) => void
```

#### 1.2 选项的作用

```javascript
// 1. lazy: 延迟执行
const runner = effect(
  () => {
    console.log('effect 执行')
  },
  { lazy: true }
)
// 此时不会立即执行
runner() // 手动执行

// 2. scheduler: 自定义调度
effect(
  () => {
    console.log(state.count)
  },
  {
    scheduler: (effect) => {
      // 自定义何时执行 effect
      setTimeout(() => {
        effect.run()
      }, 1000)
    }
  }
)

// 3. onStop: 停止回调
const runner = effect(
  () => {
    console.log(state.count)
  },
  {
    onStop: () => {
      console.log('effect 已停止')
    }
  }
)
runner.effect.stop() // 输出: effect 已停止
```

---

### 2. lazy 延迟执行

#### 2.1 为什么需要 lazy？

```javascript
// 场景1：computed 的实现
// computed 不应该立即执行，只在访问时才执行
const doubled = computed(() => {
  console.log('计算中...')
  return state.count * 2
})
// 此时不应该输出 "计算中..."

console.log(doubled.value) // 访问时才执行

// 场景2：条件执行
const runner = effect(
  () => {
    // 这个 effect 可能不需要立即执行
    console.log('Effect')
  },
  { lazy: true }
)

if (someCondition) {
  runner() // 只在特定条件下执行
}
```

#### 2.2 实现原理

```typescript
function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn)
  
  if (options) {
    Object.assign(_effect, options)
  }
  
  if (!options || !options.lazy) {
    // 默认立即执行
    _effect.run()
  }
  
  const runner = _effect.run.bind(_effect)
  runner.effect = _effect
  
  return runner
}
```

---

### 3. scheduler 调度器

#### 3.1 调度器的威力

**场景1：异步更新**

```javascript
const state = reactive({ count: 0 })

effect(
  () => {
    console.log('Count:', state.count)
  },
  {
    scheduler: (effect) => {
      // 使用 Promise 异步执行
      Promise.resolve().then(() => {
        effect.run()
      })
    }
  }
)

state.count = 1
state.count = 2
state.count = 3
console.log('同步代码结束')

// 输出顺序：
// Count: 0 (初始执行)
// 同步代码结束
// Count: 3 (微任务执行，只执行一次)
```

**场景2：批量更新**

```javascript
const queue = []
let isFlushing = false

function queueJob(effect) {
  if (!queue.includes(effect)) {
    queue.push(effect)
  }
  
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(() => {
      isFlushing = false
      queue.forEach(e => e.run())
      queue.length = 0
    })
  }
}

// 使用
effect(
  () => {
    console.log(state.count)
  },
  { scheduler: queueJob }
)

state.count = 1
state.count = 2
state.count = 3
// 只输出一次最新的值
```

**场景3：computed 的实现**

```javascript
class ComputedRefImpl {
  constructor(getter) {
    this._effect = new ReactiveEffect(getter, () => {
      // scheduler: 依赖变化时，不立即计算，只标记为脏
      if (!this._dirty) {
        this._dirty = true
        trigger(this, 'value')
      }
    })
  }
}
```

---

### 4. onStop 回调

#### 4.1 使用场景

```javascript
// 场景1：清理定时器
const runner = effect(
  () => {
    const timer = setInterval(() => {
      console.log(state.count)
    }, 1000)
    
    // 如何在 stop 时清理定时器？
  },
  {
    onStop: () => {
      clearInterval(timer)
    }
  }
)

// 稍后停止
runner.effect.stop()

// 场景2：清理事件监听
effect(
  () => {
    const handler = () => console.log(state.count)
    window.addEventListener('click', handler)
  },
  {
    onStop: () => {
      window.removeEventListener('click', handler)
    }
  }
)

// 场景3：清理订阅
effect(
  () => {
    const subscription = someObservable.subscribe(() => {
      console.log(state.count)
    })
  },
  {
    onStop: () => {
      subscription.unsubscribe()
    }
  }
)
```

---

### 5. 调试选项

#### 5.1 onTrack 和 onTrigger

```javascript
effect(
  () => {
    console.log(state.count)
  },
  {
    // 依赖收集时触发
    onTrack: (event) => {
      console.log('Tracked:', event)
      // {
      //   target: { count: 0 },
      //   type: 'get',
      //   key: 'count'
      // }
    },
    
    // 触发更新时触发
    onTrigger: (event) => {
      console.log('Triggered:', event)
      // {
      //   target: { count: 0 },
      //   type: 'set',
      //   key: 'count',
      //   newValue: 1,
      //   oldValue: 0
      // }
    }
  }
)

state.count = 1
```

---

## 💻 实践任务

### 任务目标
实现 effect 的所有选项功能。

---

### 步骤1：更新 ReactiveEffect 类（20分钟）

```typescript
// src/reactivity/effect.ts

export interface EffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  allowRecurse?: boolean
}

export type EffectScheduler = (effect: ReactiveEffect) => void

export interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: 'get' | 'set' | 'add' | 'delete' | 'clear'
  key: any
  newValue?: any
  oldValue?: any
}

export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  
  // 选项
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    try {
      enableTracking()
      activeEffect = this
      cleanupEffect(this)
      return this.fn()
    } finally {
      activeEffect = undefined
      resetTracking()
    }
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      
      // 调用 onStop 回调
      if (this.onStop) {
        this.onStop()
      }
      
      this.active = false
    }
  }
}
```

---

### 步骤2：更新 effect 函数（15分钟）

```typescript
// src/reactivity/effect.ts

export interface EffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export function effect<T = any>(
  fn: () => T,
  options?: EffectOptions
): EffectRunner {
  // 创建 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn)
  
  // 合并选项
  if (options) {
    Object.assign(_effect, options)
  }
  
  // 如果不是 lazy，立即执行
  if (!options || !options.lazy) {
    _effect.run()
  }
  
  // 返回 runner
  const runner = _effect.run.bind(_effect) as EffectRunner
  runner.effect = _effect
  
  return runner
}
```

---

### 步骤3：更新 track 支持 onTrack（10分钟）

```typescript
// src/reactivity/effect.ts

export function track(target: object, key: unknown) {
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  trackEffect(dep)
  
  // 触发 onTrack 回调
  if (activeEffect.onTrack) {
    activeEffect.onTrack({
      effect: activeEffect,
      target,
      type: 'get',
      key
    })
  }
}
```

---

### 步骤4：更新 trigger 支持 onTrigger（10分钟）

```typescript
// src/reactivity/effect.ts

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  // ... 收集 effects 的代码 ...
  
  // 执行 effects
  effects.forEach(effect => {
    // 触发 onTrigger 回调
    if (effect.onTrigger) {
      effect.onTrigger({
        effect,
        target,
        type,
        key,
        newValue,
        oldValue
      })
    }
    
    // 执行 effect
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  })
}
```

---

### 步骤5：编写测试用例（30分钟）

```typescript
// test/reactivity/effect.spec.ts

describe('effect options', () => {
  describe('lazy', () => {
    it('应该支持 lazy 选项', () => {
      const state = reactive({ count: 0 })
      const fn = vi.fn(() => state.count)
      
      const runner = effect(fn, { lazy: true })
      
      // 不应该立即执行
      expect(fn).not.toHaveBeenCalled()
      
      // 手动执行
      const result = runner()
      expect(fn).toHaveBeenCalled()
      expect(result).toBe(0)
    })
    
    it('lazy effect 应该响应式更新', () => {
      const state = reactive({ count: 0 })
      let dummy
      
      const runner = effect(
        () => {
          dummy = state.count
        },
        { lazy: true }
      )
      
      expect(dummy).toBeUndefined()
      
      runner()
      expect(dummy).toBe(0)
      
      state.count = 1
      expect(dummy).toBe(1)
    })
  })
  
  describe('scheduler', () => {
    it('应该支持 scheduler', () => {
      const state = reactive({ count: 0 })
      let dummy
      const scheduler = vi.fn(() => {})
      
      effect(
        () => {
          dummy = state.count
        },
        { scheduler }
      )
      
      expect(dummy).toBe(0)
      expect(scheduler).not.toHaveBeenCalled()
      
      state.count = 1
      expect(scheduler).toHaveBeenCalledTimes(1)
      expect(dummy).toBe(0) // scheduler 不执行，值不变
    })
    
    it('scheduler 可以控制执行时机', () => {
      const state = reactive({ count: 0 })
      let dummy
      let runCount = 0
      
      const scheduler = vi.fn((effect) => {
        runCount++
        effect.run()
      })
      
      effect(
        () => {
          dummy = state.count
        },
        { scheduler }
      )
      
      expect(dummy).toBe(0)
      expect(runCount).toBe(0)
      
      state.count = 1
      expect(scheduler).toHaveBeenCalledTimes(1)
      expect(runCount).toBe(1)
      expect(dummy).toBe(1)
    })
    
    it('应该支持批量更新', async () => {
      const state = reactive({ count: 0 })
      let dummy
      let runCount = 0
      
      const queue: any[] = []
      let isFlushing = false
      
      const scheduler = (effect: any) => {
        if (!queue.includes(effect)) {
          queue.push(effect)
        }
        if (!isFlushing) {
          isFlushing = true
          Promise.resolve().then(() => {
            isFlushing = false
            queue.forEach(e => e.run())
            queue.length = 0
          })
        }
      }
      
      effect(
        () => {
          runCount++
          dummy = state.count
        },
        { scheduler }
      )
      
      expect(dummy).toBe(0)
      expect(runCount).toBe(1)
      
      state.count = 1
      state.count = 2
      state.count = 3
      
      expect(dummy).toBe(0) // 还没执行
      expect(runCount).toBe(1)
      
      await Promise.resolve()
      
      expect(dummy).toBe(3) // 批量执行，只执行一次
      expect(runCount).toBe(2)
    })
  })
  
  describe('onStop', () => {
    it('应该支持 onStop 回调', () => {
      const state = reactive({ count: 0 })
      const onStop = vi.fn()
      
      const runner = effect(
        () => {
          state.count
        },
        { onStop }
      )
      
      runner.effect.stop()
      
      expect(onStop).toHaveBeenCalledTimes(1)
    })
    
    it('onStop 应该在清理依赖后执行', () => {
      const state = reactive({ count: 0 })
      const events: string[] = []
      
      const runner = effect(
        () => {
          state.count
        },
        {
          onStop: () => {
            events.push('onStop')
          }
        }
      )
      
      runner.effect.stop()
      
      state.count = 1
      
      expect(events).toEqual(['onStop'])
    })
  })
  
  describe('onTrack', () => {
    it('应该在依赖收集时触发 onTrack', () => {
      const state = reactive({ count: 0 })
      const onTrack = vi.fn()
      
      effect(
        () => {
          state.count
        },
        { onTrack }
      )
      
      expect(onTrack).toHaveBeenCalledTimes(1)
      expect(onTrack).toHaveBeenCalledWith({
        effect: expect.any(ReactiveEffect),
        target: state,
        type: 'get',
        key: 'count'
      })
    })
  })
  
  describe('onTrigger', () => {
    it('应该在触发更新时触发 onTrigger', () => {
      const state = reactive({ count: 0 })
      const onTrigger = vi.fn()
      
      effect(
        () => {
          state.count
        },
        { onTrigger }
      )
      
      state.count = 1
      
      expect(onTrigger).toHaveBeenCalledTimes(1)
      expect(onTrigger).toHaveBeenCalledWith({
        effect: expect.any(ReactiveEffect),
        target: state,
        type: 'set',
        key: 'count',
        newValue: 1,
        oldValue: 0
      })
    })
  })
})
```

---

## 🤔 思考题

### 问题1: scheduler 和 lazy 有什么区别？

**提示**: 
- lazy 控制初始执行
- scheduler 控制后续执行

### 问题2: 如何用 scheduler 实现 Vue 的异步更新队列？

**提示**: 
- Promise.resolve()
- 去重
- 批量执行

### 问题3: onStop 回调有哪些实际应用场景？

**提示**: 
- 清理定时器
- 取消订阅
- 移除监听器

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **effect 有哪些选项？各自的作用是什么？**

2. **scheduler 如何实现批量更新？**

3. **onTrack 和 onTrigger 如何帮助调试？**

---

## 📖 扩展阅读

- [Vue 3 源码：effect.ts 选项实现](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)

---

## ⏭️ 明日预告

### Day 8: 实现 track 依赖收集函数

明天我们将学习：
- track 的完整实现
- WeakMap → Map → Set 的三层结构
- activeEffect 和 shouldTrack 的作用

**核心任务**: 完整实现依赖收集机制

---

**掌握 effect 的选项，才能灵活运用响应式系统！** 🚀
