# Day 6: 处理嵌套 effect

> 学习日期: 2025年11月27日  
> 预计用时: 2.5小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标

- [ ] 理解嵌套 effect 的问题
- [ ] 实现 effect 栈机制
- [ ] 修复依赖收集错误
- [ ] 掌握 parent 指针方案
- [ ] 通过 10+ 测试用例

## ⏰ 时间规划

- 理论学习: 45分钟
- 编码实践: 1小时15分钟
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. 嵌套 effect 的问题

#### 1.1 什么是嵌套 effect？

```javascript
const state = reactive({ foo: 1, bar: 2 })

// 外层 effect
effect(() => {
  console.log('外层:', state.foo)
  
  // 内层 effect
  effect(() => {
    console.log('内层:', state.bar)
  })
})

// 输出:
// 外层: 1
// 内层: 2
```

**嵌套场景的实际应用**：
- **组件渲染**：父组件 effect 中渲染子组件（子组件有自己的 effect）
- **computed 嵌套**：computed 中使用另一个 computed
- **watch 嵌套**：watch 中创建新的 watch

---

#### 1.2 当前实现的 Bug

```javascript
// 当前的实现
let activeEffect = undefined

class ReactiveEffect {
  run() {
    activeEffect = this    // ← 问题所在！
    const result = this.fn()
    activeEffect = undefined
    return result
  }
}
```

**问题分析**：

```javascript
const state = reactive({ foo: 1, bar: 2 })
let temp1, temp2

// 外层 effect
const e1 = effect(() => {
  console.log('e1 start')
  temp1 = state.foo  // 应该收集 e1
  
  // 内层 effect
  effect(() => {
    console.log('e2 start')
    temp2 = state.bar  // 应该收集 e2
  })
  
  temp1 = state.foo  // 应该收集 e1，但实际收集的是 e2！
  console.log('e1 end')
})

// 执行流程：
// 1. activeEffect = e1
// 2. 访问 state.foo → 收集 e1 ✓
// 3. 进入内层 effect
// 4. activeEffect = e2  ← 覆盖了 e1！
// 5. 访问 state.bar → 收集 e2 ✓
// 6. activeEffect = undefined
// 7. 回到外层 effect
// 8. 访问 state.foo → activeEffect 是 undefined！收集失败 ✗
```

---

### 2. 解决方案：effect 栈

#### 2.1 栈的思想

用**栈**来管理 activeEffect，保证正确的嵌套关系：

```
外层 effect 开始 → push(e1) → activeEffect = e1
  │
  ├─ 访问 state.foo → 收集 e1 ✓
  │
  ├─ 内层 effect 开始 → push(e2) → activeEffect = e2
  │   │
  │   ├─ 访问 state.bar → 收集 e2 ✓
  │   │
  │   └─ 内层 effect 结束 → pop() → activeEffect = e1 (恢复！)
  │
  ├─ 访问 state.foo → 收集 e1 ✓
  │
  └─ 外层 effect 结束 → pop() → activeEffect = undefined
```

---

#### 2.2 栈实现方案

```typescript
// 方案1：使用数组实现栈
const effectStack: ReactiveEffect[] = []
let activeEffect: ReactiveEffect | undefined

class ReactiveEffect {
  run() {
    try {
      // 入栈
      effectStack.push(this)
      activeEffect = this
      
      return this.fn()
    } finally {
      // 出栈
      effectStack.pop()
      // 恢复上一个 effect
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
}
```

---

#### 2.3 parent 指针方案（Vue 3 官方）

Vue 3 使用更高效的 **parent 指针** 方案：

```typescript
class ReactiveEffect {
  parent: ReactiveEffect | undefined = undefined
  
  run() {
    try {
      // 记录父 effect
      this.parent = activeEffect
      
      // 设置当前 effect
      activeEffect = this
      
      return this.fn()
    } finally {
      // 恢复父 effect
      activeEffect = this.parent
      
      // 清理引用
      this.parent = undefined
    }
  }
}
```

**优势**：
- 不需要额外的数组
- 内存占用更小
- 性能更好

---

### 3. 完整的执行流程

```javascript
const state = reactive({ foo: 1, bar: 2 })

effect(() => {
  console.log('outer start')
  state.foo  // 1
  
  effect(() => {
    console.log('inner start')
    state.bar  // 2
    console.log('inner end')
  })
  
  state.foo  // 3
  console.log('outer end')
})
```

**执行流程**：

```
1. 创建 outerEffect
2. outerEffect.run()
   ├─ outerEffect.parent = undefined
   ├─ activeEffect = outerEffect
   │
   ├─ console.log('outer start')
   │
   ├─ 访问 state.foo (1)
   │  └─ track(state, 'foo') → 收集 outerEffect ✓
   │
   ├─ 创建 innerEffect
   ├─ innerEffect.run()
   │  ├─ innerEffect.parent = outerEffect  ← 记住父节点
   │  ├─ activeEffect = innerEffect
   │  │
   │  ├─ console.log('inner start')
   │  │
   │  ├─ 访问 state.bar (2)
   │  │  └─ track(state, 'bar') → 收集 innerEffect ✓
   │  │
   │  ├─ console.log('inner end')
   │  │
   │  ├─ activeEffect = innerEffect.parent  ← 恢复
   │  └─ activeEffect = outerEffect  ← 已恢复
   │
   ├─ 访问 state.foo (3)
   │  └─ track(state, 'foo') → 收集 outerEffect ✓
   │
   ├─ console.log('outer end')
   │
   └─ activeEffect = outerEffect.parent = undefined
```

---

### 4. 为什么需要 shouldTrack？

```typescript
class ReactiveEffect {
  run() {
    // 如果未激活（已 stop），不收集依赖
    if (!this.active) {
      shouldTrack = false  // ← 禁用依赖收集
      return this.fn()
    }
    
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true  // ← 启用依赖收集
      
      return this.fn()
    } finally {
      activeEffect = this.parent
      shouldTrack = false  // ← 默认禁用
      this.parent = undefined
    }
  }
}
```

**shouldTrack 的作用**：
1. **控制是否收集依赖**
2. **避免在 stop 后收集依赖**
3. **支持 pauseTracking/resetTracking**

---

## 💻 实践任务

### 任务目标
修复嵌套 effect 的依赖收集问题，使用 parent 指针方案。

---

### 步骤1：添加 parent 属性（5分钟）

```typescript
// src/reactivity/effect.ts

export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  
  // 新增：父 effect
  parent: ReactiveEffect | undefined = undefined
  
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}
  
  // ... 其他代码
}
```

---

### 步骤2：修改 run 方法（15分钟）

```typescript
// src/reactivity/effect.ts

export class ReactiveEffect<T = any> {
  // ... 属性定义
  
  run(): T {
    // 如果未激活，直接执行，不收集依赖
    if (!this.active) {
      return this.fn()
    }
    
    // 激活状态下，处理嵌套
    try {
      // 1. 记录父 effect
      this.parent = activeEffect
      
      // 2. 设置当前 effect
      activeEffect = this
      
      // 3. 启用依赖收集
      shouldTrack = true
      
      // 4. 清理上次的依赖（后续会详细讲）
      cleanupEffect(this)
      
      // 5. 执行函数
      return this.fn()
    } finally {
      // 6. 恢复父 effect
      activeEffect = this.parent
      
      // 7. 恢复 shouldTrack 状态
      shouldTrack = this.parent !== undefined
      
      // 8. 清理引用
      this.parent = undefined
    }
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      this.active = false
    }
  }
}
```

**关键点解析**：

```typescript
// finally 块中的 shouldTrack 恢复逻辑
shouldTrack = this.parent !== undefined

// 如果有父 effect，说明还在嵌套中，应该继续收集
// 如果没有父 effect，说明所有 effect 执行完毕，停止收集
```

---

### 步骤3：优化 track 函数（10分钟）

```typescript
// src/reactivity/effect.ts

export function track(target: object, key: unknown) {
  // 检查是否应该收集依赖
  if (!shouldTrack || !activeEffect) {
    return
  }
  
  // 获取或创建 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  // 获取或创建 dep
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  // 收集依赖（追踪）
  trackEffects(dep)
}

/**
 * 将 activeEffect 添加到 dep
 */
export function trackEffects(dep: Dep) {
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  // 避免重复收集
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    
    // 双向记录
    activeEffect.deps.push(dep)
  }
}
```

---

### 步骤4：优化 trigger 函数（10分钟）

```typescript
// src/reactivity/effect.ts

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  const dep = depsMap.get(key)
  if (!dep) {
    return
  }
  
  // 触发依赖
  triggerEffects(dep)
}

/**
 * 执行 dep 中的所有 effect
 */
export function triggerEffects(dep: Dep) {
  // 创建副本，避免在迭代中修改集合
  const effects = [...dep]
  
  effects.forEach(effect => {
    // 避免无限递归：不触发自己
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        effect.run()
      }
    }
  })
}
```

**为什么要避免触发自己？**

```javascript
const state = reactive({ count: 0 })

effect(() => {
  state.count++  // 既读又写
  // 如果触发自己 → 无限递归！
})
```

---

### 步骤5：完善 cleanupEffect（10分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 清理 effect 的所有依赖
 * 
 * 为什么需要清理？
 * effect(() => {
 *   if (state.flag) {
 *     console.log(state.a)  // 当 flag=true 时依赖 a
 *   } else {
 *     console.log(state.b)  // 当 flag=false 时依赖 b
 *   }
 * })
 * 
 * 当 flag 从 true 变为 false 时：
 * - 不再需要 a 的依赖
 * - 需要添加 b 的依赖
 * 
 * 解决方案：每次执行前清理依赖，重新收集
 */
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      // 从 dep 中删除 effect
      deps[i].delete(effect)
    }
    
    // 清空 deps 数组
    deps.length = 0
  }
}
```

---

### 步骤6：编写测试用例（40分钟）

```typescript
// test/reactivity/effect.spec.ts

describe('嵌套 effect', () => {
  it('应该支持嵌套 effect', () => {
    const state = reactive({ foo: 1, bar: 2 })
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    
    effect(() => {
      fn1()
      state.foo
      
      effect(() => {
        fn2()
        state.bar
      })
      
      state.foo
    })
    
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    
    // 修改 foo，只触发外层 effect
    state.foo = 2
    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2) // 因为外层 effect 重新执行，会创建新的内层 effect
    
    // 修改 bar，不触发外层 effect
    state.bar = 3
    expect(fn1).toHaveBeenCalledTimes(2) // 不变
    expect(fn2).toHaveBeenCalledTimes(3) // 增加
  })
  
  it('嵌套 effect 的依赖收集应该独立', () => {
    const state = reactive({ a: 1, b: 2, c: 3 })
    let outer, inner
    
    effect(() => {
      outer = state.a
      
      effect(() => {
        inner = state.b
      })
      
      outer = state.a + state.c
    })
    
    expect(outer).toBe(4) // 1 + 3
    expect(inner).toBe(2)
    
    // 修改 a，只更新 outer
    state.a = 10
    expect(outer).toBe(13) // 10 + 3
    expect(inner).toBe(2)
    
    // 修改 b，只更新 inner
    state.b = 20
    expect(outer).toBe(13)
    expect(inner).toBe(20)
    
    // 修改 c，只更新 outer
    state.c = 30
    expect(outer).toBe(40) // 10 + 30
    expect(inner).toBe(20)
  })
  
  it('应该支持深层嵌套', () => {
    const state = reactive({ a: 1, b: 2, c: 3 })
    const calls: string[] = []
    
    effect(() => {
      calls.push('e1')
      state.a
      
      effect(() => {
        calls.push('e2')
        state.b
        
        effect(() => {
          calls.push('e3')
          state.c
        })
      })
    })
    
    expect(calls).toEqual(['e1', 'e2', 'e3'])
    
    calls.length = 0
    state.a = 10
    expect(calls).toEqual(['e1', 'e2', 'e3'])
    
    calls.length = 0
    state.b = 20
    expect(calls).toEqual(['e2', 'e3'])
    
    calls.length = 0
    state.c = 30
    expect(calls).toEqual(['e3'])
  })
  
  it('嵌套 effect 中修改依赖应该正确触发', () => {
    const state = reactive({ foo: 1 })
    let dummy
    
    effect(() => {
      effect(() => {
        dummy = state.foo
      })
      
      state.foo = 2  // 在 effect 中修改
    })
    
    expect(dummy).toBe(2)
  })
  
  it('应该避免无限递归', () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    
    effect(() => {
      runCount++
      state.count++  // 既读又写
    })
    
    // 应该只执行一次，不会无限递归
    expect(runCount).toBe(1)
    expect(state.count).toBe(1)
  })
  
  it('条件分支切换应该清理旧依赖', () => {
    const state = reactive({ flag: true, a: 1, b: 2 })
    let dummy
    
    effect(() => {
      dummy = state.flag ? state.a : state.b
    })
    
    expect(dummy).toBe(1)
    
    // 修改 a，应该更新
    state.a = 10
    expect(dummy).toBe(10)
    
    // 修改 b，不应该更新（未依赖）
    state.b = 20
    expect(dummy).toBe(10)
    
    // 切换分支
    state.flag = false
    expect(dummy).toBe(20)
    
    // 修改 a，不应该更新（已切换分支）
    state.a = 100
    expect(dummy).toBe(20)
    
    // 修改 b，应该更新
    state.b = 200
    expect(dummy).toBe(200)
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么不能用简单的 activeEffect = undefined 来恢复？

```javascript
// 错误方案
effect(() => {
  effect(() => {
    // ...
  })
  activeEffect = undefined  // ← 问题
})
```

**提示**: 外层 effect 的后续代码还需要收集依赖

---

### 问题2: 为什么需要在 run 方法中调用 cleanupEffect？

**提示**: 
- 条件分支切换
- 依赖动态变化
- 避免内存泄漏

---

### 问题3: triggerEffects 中为什么要创建副本数组？

```javascript
const effects = [...dep]  // 为什么？
```

**提示**: 
- 迭代过程中集合可能被修改
- effect 执行可能触发新的 effect

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **嵌套 effect 的依赖收集问题是什么？**

2. **parent 指针方案是如何解决嵌套问题的？**

3. **cleanupEffect 的作用和时机？**

4. **shouldTrack 的必要性？**

---

## 📖 扩展阅读

- [Vue 3 源码：effect 嵌套处理](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts#L195)
- [为什么需要清理依赖？](https://github.com/vuejs/core/issues/910)

---

## ⏭️ 明日预告

### Day 7: effect 选项和优化

明天我们将学习：
- lazy 选项（延迟执行）
- scheduler 选项（调度器）
- onStop 回调
- onTrack / onTrigger 调试选项

**核心任务**: 实现 effect 的高级功能

---

**嵌套 effect 是响应式系统最复杂的部分，理解它需要耐心和反复思考！** 🧠
