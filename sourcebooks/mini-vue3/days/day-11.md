# Day 11: stop 功能完善与生命周期

> 学习日期: 2025年12月01日  
> 预计用时: 2小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 深入理解 effect 的生命周期
- [ ] 完善 stop 功能的实现
- [ ] 实现 onStop 回调机制
- [ ] 处理 stop 的边界情况
- [ ] 通过 12+ 测试用例

## ⏰ 时间规划

- 理论学习: 30分钟
- 编码实践: 1小时
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. effect 的生命周期

#### 1.1 完整生命周期

```
创建 → 激活 → 执行 → 更新 → 停止 → 销毁
```

```javascript
// 1. 创建
const runner = effect(() => {
  console.log(state.count)
})

// 2. 激活（自动）
// effect.active = true

// 3. 执行（自动）
// 立即执行一次

// 4. 更新（自动）
state.count = 1  // 触发重新执行

// 5. 停止（手动）
runner.effect.stop()

// 6. 销毁
// effect 实例被垃圾回收
```

---

#### 1.2 状态转换

```typescript
class ReactiveEffect {
  active = true  // 初始状态：激活
  
  run() {
    if (!this.active) {
      // 状态：已停止
      // 行为：直接执行，不收集依赖
      return this.fn()
    }
    
    // 状态：激活
    // 行为：执行并收集依赖
    // ...
  }
  
  stop() {
    if (this.active) {
      // 转换状态：激活 → 停止
      this.active = false
      
      // 清理依赖
      cleanupEffect(this)
      
      // 触发回调
      if (this.onStop) {
        this.onStop()
      }
    }
  }
}
```

---

### 2. stop 的作用

#### 2.1 停止响应式更新

```javascript
const state = reactive({ count: 0 })
let dummy

const runner = effect(() => {
  dummy = state.count
})

console.log(dummy) // 0

state.count = 1
console.log(dummy) // 1 ← 自动更新

// 停止 effect
runner.effect.stop()

state.count = 2
console.log(dummy) // 1 ← 不再更新！

// 但可以手动执行
runner()
console.log(dummy) // 2 ← 手动更新
```

---

#### 2.2 清理副作用

```javascript
// 场景：定时器
const state = reactive({ enabled: true })

const runner = effect(() => {
  if (state.enabled) {
    const timer = setInterval(() => {
      console.log('tick')
    }, 1000)
    
    // 问题：如何清理定时器？
    // 答案：onStop 回调！
  }
})
```

---

### 3. onStop 回调

#### 3.1 为什么需要 onStop？

**问题**：effect 中创建了资源（定时器、事件监听、网络请求），停止时如何清理？

```javascript
// 错误方式：无法清理
const runner = effect(() => {
  const timer = setInterval(() => {
    console.log(state.count)
  }, 1000)
  
  // timer 无法被外部访问！
})

runner.effect.stop() // 停止了 effect，但定时器仍在运行！
```

**解决方案**：onStop 回调

```javascript
let timer

const runner = effect(
  () => {
    timer = setInterval(() => {
      console.log(state.count)
    }, 1000)
  },
  {
    onStop: () => {
      clearInterval(timer)  // 清理定时器
      console.log('Effect stopped, timer cleared')
    }
  }
)

runner.effect.stop() // 触发 onStop，清理定时器
```

---

#### 3.2 onStop 的典型用例

```javascript
// 用例1：清理定时器
effect(() => {
  const timer = setInterval(() => {}, 1000)
}, {
  onStop: () => clearInterval(timer)
})

// 用例2：移除事件监听
effect(() => {
  const handler = () => console.log('click')
  document.addEventListener('click', handler)
}, {
  onStop: () => document.removeEventListener('click', handler)
})

// 用例3：取消网络请求
effect(() => {
  const controller = new AbortController()
  fetch('/api', { signal: controller.signal })
}, {
  onStop: () => controller.abort()
})

// 用例4：清理 DOM
effect(() => {
  const div = document.createElement('div')
  document.body.appendChild(div)
}, {
  onStop: () => div.remove()
})
```

---

### 4. stop 的边界情况

#### 4.1 重复 stop

```javascript
const runner = effect(() => {
  console.log(state.count)
})

runner.effect.stop()
runner.effect.stop() // ← 应该安全（幂等）
runner.effect.stop() // ← 应该安全
```

**实现**：

```typescript
stop() {
  if (this.active) {  // ← 检查状态
    cleanupEffect(this)
    
    if (this.onStop) {
      this.onStop()
    }
    
    this.active = false
  }
  // 已经 stop 了，不做任何事
}
```

---

#### 4.2 stop 后手动执行

```javascript
const state = reactive({ count: 0 })
let dummy

const runner = effect(() => {
  dummy = state.count
})

runner.effect.stop()

// 手动执行应该可以
runner()
console.log(dummy) // 应该是最新值

// 但不应该收集依赖
state.count = 1
console.log(dummy) // 不应该更新
```

**实现**：

```typescript
run() {
  if (!this.active) {
    // 未激活：执行但不收集依赖
    return this.fn()
  }
  
  // 激活：执行并收集依赖
  // ...
}
```

---

#### 4.3 嵌套 effect 中的 stop

```javascript
effect(() => {
  // 外层 effect
  
  const runner = effect(() => {
    // 内层 effect
  })
  
  runner.effect.stop() // ← 只停止内层
})

// 外层 effect 应该继续工作
```

---

## 💻 实践任务

### 任务目标
完善 stop 功能，实现 onStop 回调，处理边界情况。

---

### 步骤1：修改 ReactiveEffect 类（15分钟）

```typescript
// src/reactivity/effect.ts

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  allowRecurse?: boolean
}

export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  parent: ReactiveEffect | undefined = undefined
  
  // 回调函数
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  // 高级选项
  allowRecurse?: boolean
  
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}
  
  run(): T {
    if (!this.active) {
      // 未激活：直接执行，不收集依赖
      return this.fn()
    }
    
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true
      
      // 清理旧依赖
      cleanupEffect(this)
      
      // 执行函数
      return this.fn()
    } finally {
      activeEffect = this.parent
      shouldTrack = this.parent !== undefined
      this.parent = undefined
    }
  }
  
  stop() {
    if (this.active) {
      // 清理依赖
      cleanupEffect(this)
      
      // 调用 onStop 回调
      if (this.onStop) {
        this.onStop()
      }
      
      // 标记为未激活
      this.active = false
    }
  }
}
```

---

### 步骤2：修改 effect 函数（15分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 创建 effect
 */
export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): EffectRunner<T> {
  // 创建 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn)
  
  // 应用选项
  if (options) {
    Object.assign(_effect, options)
  }
  
  // 如果不是 lazy，立即执行
  if (!options || !options.lazy) {
    _effect.run()
  }
  
  // 创建 runner
  const runner = _effect.run.bind(_effect) as EffectRunner<T>
  runner.effect = _effect
  
  return runner
}
```

---

### 步骤3：添加辅助函数（10分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 停止 effect
 * 
 * @param runner - effect runner
 */
export function stop(runner: EffectRunner) {
  runner.effect.stop()
}
```

---

### 步骤4：编写测试用例（30分钟）

```typescript
// test/reactivity/effect-stop.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive, effect, stop } from '../../src/reactivity'

describe('effect stop', () => {
  it('stop 应该停止响应式更新', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    const runner = effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
    
    state.count = 1
    expect(dummy).toBe(1)
    
    // 停止
    runner.effect.stop()
    
    state.count = 2
    expect(dummy).toBe(1) // 不更新
  })
  
  it('stop 后可以手动执行 runner', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    const runner = effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
    
    runner.effect.stop()
    
    state.count = 1
    expect(dummy).toBe(0) // 不自动更新
    
    // 手动执行
    runner()
    expect(dummy).toBe(1) // 手动更新
    
    // 修改后仍不自动更新
    state.count = 2
    expect(dummy).toBe(1)
  })
  
  it('应该调用 onStop 回调', () => {
    const state = reactive({ count: 0 })
    const onStop = vi.fn()
    
    const runner = effect(
      () => {
        state.count
      },
      { onStop }
    )
    
    expect(onStop).not.toHaveBeenCalled()
    
    runner.effect.stop()
    expect(onStop).toHaveBeenCalledTimes(1)
  })
  
  it('onStop 应该在清理依赖后调用', () => {
    const state = reactive({ count: 0 })
    let dummy
    const calls: string[] = []
    
    const runner = effect(
      () => {
        dummy = state.count
      },
      {
        onStop: () => {
          calls.push('onStop')
          // 此时依赖已清理
        }
      }
    )
    
    expect(dummy).toBe(0)
    
    state.count = 1
    expect(dummy).toBe(1)
    
    runner.effect.stop()
    expect(calls).toEqual(['onStop'])
    
    // stop 后不应触发
    state.count = 2
    expect(dummy).toBe(1)
  })
  
  it('重复 stop 应该安全', () => {
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
    
    runner.effect.stop()
    expect(onStop).toHaveBeenCalledTimes(1) // 不重复调用
    
    runner.effect.stop()
    expect(onStop).toHaveBeenCalledTimes(1)
  })
  
  it('stop 工具函数应该工作', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    const runner = effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
    
    stop(runner)
    
    state.count = 1
    expect(dummy).toBe(0)
  })
  
  it('嵌套 effect 中 stop 应该独立', () => {
    const state = reactive({ a: 1, b: 2 })
    let outer, inner
    let innerRunner
    
    effect(() => {
      outer = state.a
      
      innerRunner = effect(() => {
        inner = state.b
      })
    })
    
    expect(outer).toBe(1)
    expect(inner).toBe(2)
    
    // 停止内层
    innerRunner.effect.stop()
    
    // 修改 b 不应触发内层
    state.b = 20
    expect(inner).toBe(2)
    
    // 修改 a 仍应触发外层
    state.a = 10
    expect(outer).toBe(10)
    
    // 外层重新执行，会创建新的内层
    state.b = 30
    expect(inner).toBe(30) // 新的内层生效
  })
  
  it('onStop 中可以访问闭包变量', () => {
    const state = reactive({ count: 0 })
    let cleanupValue
    
    const runner = effect(
      () => {
        const localValue = state.count * 2
        
        return localValue
      },
      {
        onStop: () => {
          cleanupValue = runner() // 可以手动执行
        }
      }
    )
    
    state.count = 5
    runner.effect.stop()
    
    expect(cleanupValue).toBe(10)
  })
  
  it('stop 应该清理所有依赖', () => {
    const state = reactive({ a: 1, b: 2, c: 3 })
    let sum
    const fn = vi.fn(() => {
      sum = state.a + state.b + state.c
    })
    
    const runner = effect(fn)
    
    expect(sum).toBe(6)
    expect(fn).toHaveBeenCalledTimes(1)
    
    runner.effect.stop()
    
    // 修改任何属性都不应触发
    state.a = 10
    expect(sum).toBe(6)
    expect(fn).toHaveBeenCalledTimes(1)
    
    state.b = 20
    expect(sum).toBe(6)
    expect(fn).toHaveBeenCalledTimes(1)
    
    state.c = 30
    expect(sum).toBe(6)
    expect(fn).toHaveBeenCalledTimes(1)
  })
  
  it('stop + scheduler 应该正确工作', () => {
    const state = reactive({ count: 0 })
    let dummy
    const scheduler = vi.fn(() => {
      dummy = state.count
    })
    
    const runner = effect(
      () => {
        state.count
      },
      { scheduler }
    )
    
    expect(scheduler).not.toHaveBeenCalled()
    
    state.count = 1
    expect(scheduler).toHaveBeenCalledTimes(1)
    
    runner.effect.stop()
    
    state.count = 2
    expect(scheduler).toHaveBeenCalledTimes(1) // 不再调用
  })
  
  it('实际用例：清理定时器', () => {
    vi.useFakeTimers()
    
    const state = reactive({ count: 0 })
    const logs: number[] = []
    let timer: any
    
    const runner = effect(
      () => {
        timer = setInterval(() => {
          logs.push(state.count)
        }, 1000)
      },
      {
        onStop: () => {
          clearInterval(timer)
        }
      }
    )
    
    vi.advanceTimersByTime(3000)
    expect(logs).toEqual([0, 0, 0])
    
    // 停止并清理定时器
    runner.effect.stop()
    
    state.count = 10
    vi.advanceTimersByTime(3000)
    expect(logs).toEqual([0, 0, 0]) // 不再增加
    
    vi.useRealTimers()
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么 stop 后手动执行 runner 不收集依赖？

**提示**: 
- active 标志
- run 方法的逻辑

---

### 问题2: onStop 回调的调用时机为什么在 cleanupEffect 之后？

**提示**: 
- 依赖已清理
- 回调中可能需要访问状态

---

### 问题3: 如果在 onStop 中修改响应式数据会发生什么？

**提示**: 
- effect 已停止
- 不会触发自己

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **effect 的完整生命周期是什么？**

2. **stop 的作用和实现原理？**

3. **onStop 回调的典型使用场景？**

4. **stop 的边界情况有哪些？**

---

## 📖 扩展阅读

- [Vue 3 源码：effect stop 实现](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)
- [响应式系统的生命周期管理](https://vuejs.org/api/reactivity-core.html#effectscope)

---

## ⏭️ 明日预告

### Day 12: 数组的响应式处理

明天我们将学习：
- 数组的特殊性
- 数组方法的拦截
- length 属性的处理
- 索引操作的优化

**核心任务**: 实现数组的完整响应式支持

---

**stop 是 effect 生命周期管理的关键，掌握它能写出更健壮的代码！** 🎯
