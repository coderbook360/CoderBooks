# Day 16: computed 的惰性计算和缓存机制

> 学习日期: 2025-12-08  
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 理解 computed 的惰性计算原理
- [ ] 实现 computed 的缓存机制
- [ ] 实现 dirty 标记优化
- [ ] 理解 computed 和 effect 的关系

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. 计算属性的惰性计算

#### 1.1 核心概念

**什么是惰性计算（Lazy Evaluation）？**

惰性计算是一种求值策略，它会延迟表达式的求值，直到真正需要它的值时才计算。这与急切求值（Eager Evaluation）相对。

```javascript
// 急切求值 - 立即计算
const sum = arr.reduce((a, b) => a + b, 0)  // 立即遍历数组

// 惰性求值 - 延迟计算
const sum = computed(() => arr.reduce((a, b) => a + b, 0))  // 只在访问 sum.value 时计算
```

**computed 的惰性特点**：

1. **延迟计算**：只在读取 `.value` 时才执行 getter 函数
2. **缓存结果**：如果依赖没有变化，返回缓存的值而不重新计算
3. **自动更新**：依赖变化时标记为 dirty，下次读取时重新计算

```javascript
const count = ref(0)
const double = computed(() => {
  console.log('计算中...')
  return count.value * 2
})

// 不会打印"计算中..."，因为没有访问 double.value
console.log('创建了 computed')

// 第一次访问，打印"计算中..."并计算
console.log(double.value)  // 0

// 再次访问，不打印"计算中..."，直接返回缓存值
console.log(double.value)  // 0

// 修改依赖
count.value = 1

// 访问时才重新计算，打印"计算中..."
console.log(double.value)  // 2
```

#### 1.2 技术细节

**dirty 标记机制**

Vue 3 使用 dirty 标记来实现缓存和惰性计算：

```javascript
class ComputedRefImpl {
  private _value: any
  private _dirty = true  // dirty 标记，true 表示需要重新计算
  private effect: ReactiveEffect
  
  constructor(getter) {
    // 创建一个特殊的 effect，不立即执行
    this.effect = new ReactiveEffect(getter, () => {
      // 调度器：当依赖变化时，只标记为 dirty，不立即计算
      if (!this._dirty) {
        this._dirty = true
        // 触发 computed 的依赖（可能被其他 effect 使用）
        trigger(this, 'value')
      }
    })
  }
  
  get value() {
    // 如果是 dirty，重新计算
    if (this._dirty) {
      this._value = this.effect.run()  // 执行 getter
      this._dirty = false  // 标记为 clean
    }
    // 追踪 computed 的依赖
    track(this, 'value')
    return this._value
  }
}
```

**计算流程**：

```
1. 创建 computed
   └─> 创建 effect（不立即执行）
   └─> 设置 _dirty = true

2. 首次访问 .value
   └─> 检查 _dirty (true)
   └─> 执行 effect.run()
       └─> 收集依赖
       └─> 返回计算结果
   └─> 缓存结果到 _value
   └─> 设置 _dirty = false
   └─> 追踪 computed 本身的依赖

3. 再次访问 .value（依赖未变）
   └─> 检查 _dirty (false)
   └─> 直接返回 _value（缓存）
   └─> 追踪 computed 本身的依赖

4. 依赖变化
   └─> 触发 effect 的调度器
   └─> 设置 _dirty = true
   └─> 触发 computed 的依赖

5. 依赖变化后访问 .value
   └─> 检查 _dirty (true)
   └─> 重新计算...
```

#### 1.3 computed 和 effect 的关系

computed 本质上是一个特殊的 effect：

| 特性 | effect | computed |
|------|--------|----------|
| 执行时机 | 立即执行 | 惰性执行（访问时） |
| 返回值 | 无 | 有返回值（.value） |
| 缓存 | 无 | 有缓存 |
| 调度器 | 可选 | 必须有（设置 dirty） |
| 用途 | 副作用 | 计算值 |

```javascript
// effect - 立即执行，无返回值
effect(() => {
  console.log(count.value)  // 立即打印
})

// computed - 惰性执行，有返回值
const double = computed(() => {
  return count.value * 2  // 不立即执行
})
console.log(double.value)  // 访问时才执行
```

**computed 的嵌套使用**：

```javascript
const count = ref(1)
const double = computed(() => count.value * 2)
const quadruple = computed(() => double.value * 2)

// 依赖链：quadruple -> double -> count
// 当 count 变化时：
// 1. count 触发 double 的 effect 调度器
// 2. double 设置 _dirty = true 并触发自己的依赖
// 3. quadruple 的 effect 调度器被触发
// 4. quadruple 设置 _dirty = true
```

#### 1.4 实际应用场景

**场景 1：过滤和排序列表**

```javascript
import { ref, computed } from 'vue'

const todos = ref([
  { id: 1, text: '学习 Vue', done: false },
  { id: 2, text: '写代码', done: true },
  { id: 3, text: '锻炼', done: false }
])

const filter = ref('all')  // 'all' | 'active' | 'done'

// 使用 computed 缓存过滤结果
const filteredTodos = computed(() => {
  console.log('过滤列表...')  // 只在必要时执行
  
  switch (filter.value) {
    case 'active':
      return todos.value.filter(t => !t.done)
    case 'done':
      return todos.value.filter(t => t.done)
    default:
      return todos.value
  }
})

// 如果使用普通函数，每次访问都会重新计算
function getFilteredTodos() {
  console.log('过滤列表...')  // 每次调用都执行
  // ...
}
```

**场景 2：复杂计算的优化**

```javascript
const items = ref([...])  // 大量数据

// 复杂计算，使用 computed 缓存
const summary = computed(() => {
  console.log('计算统计...')  // 只在 items 变化时执行
  
  return {
    total: items.value.length,
    sum: items.value.reduce((a, b) => a + b.price, 0),
    average: items.value.reduce((a, b) => a + b.price, 0) / items.value.length
  }
})

// 多次访问不会重复计算
console.log(summary.value.total)
console.log(summary.value.sum)
console.log(summary.value.average)
// 只打印一次"计算统计..."
```

---

## 💻 实践任务

### 任务目标
实现 computed 的 dirty 标记和缓存机制，支持惰性计算。

### 前置准备
- 已完成 Day 15 的 computed 基础实现
- 理解 effect 的调度器机制
- 理解 track 和 trigger 的工作原理

### 测试用例

在 `test/reactivity/computed.spec.ts` 中添加：

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from '../../src/reactivity'

describe('computed - 惰性计算和缓存', () => {
  it('应该是惰性计算的', () => {
    const value = ref(1)
    const getter = vi.fn(() => value.value)
    const cValue = computed(getter)
    
    // 创建 computed 不执行 getter
    expect(getter).not.toHaveBeenCalled()
    
    // 访问 value 才执行 getter
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)
  })
  
  it('应该缓存计算结果', () => {
    const value = ref(1)
    const getter = vi.fn(() => value.value)
    const cValue = computed(getter)
    
    // 首次访问
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)
    
    // 再次访问，使用缓存
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)
    
    // 依赖变化
    value.value = 2
    
    // 访问时重新计算
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)
    
    // 再次访问，使用缓存
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)
  })
  
  it('依赖变化时不应该立即计算', () => {
    const value = ref(1)
    const getter = vi.fn(() => value.value)
    const cValue = computed(getter)
    
    // 首次访问
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)
    
    // 依赖变化，不立即计算
    value.value = 2
    expect(getter).toHaveBeenCalledTimes(1)
    
    // 访问时才计算
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })
  
  it('computed 嵌套应该正常工作', () => {
    const value = ref(1)
    const c1 = computed(() => value.value * 2)
    const c2 = computed(() => c1.value * 2)
    
    expect(c2.value).toBe(4)
    
    value.value = 2
    expect(c2.value).toBe(8)
  })
  
  it('computed 作为 effect 的依赖应该正常工作', () => {
    const value = ref(1)
    const double = computed(() => value.value * 2)
    let dummy
    
    effect(() => {
      dummy = double.value
    })
    
    expect(dummy).toBe(2)
    
    value.value = 2
    expect(dummy).toBe(4)
  })
})
```

### 实现步骤

#### 步骤1: 添加 dirty 标记 (预估10分钟)

**要做什么:**
在 ComputedRefImpl 类中添加 _dirty 标记和缓存机制。

**如何操作:**

修改 `src/reactivity/computed.ts`:

```typescript
import { ReactiveEffect } from './effect'
import { track, trigger } from './effect'

class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true  // dirty 标记
  private effect: ReactiveEffect<T>
  
  constructor(getter: () => T) {
    // 创建 effect，传入调度器
    this.effect = new ReactiveEffect(getter, () => {
      // 调度器：依赖变化时，只标记为 dirty
      if (!this._dirty) {
        this._dirty = true
        // 触发 computed 自己的依赖
        trigger(this, 'value')
      }
    })
  }
  
  get value() {
    // 追踪 computed 的依赖
    track(this, 'value')
    
    // 如果是 dirty，重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    
    return this._value
  }
}

export function computed<T>(getter: () => T) {
  return new ComputedRefImpl(getter)
}
```

**为什么这样做:**
1. `_dirty = true`：初始状态是 dirty，首次访问时需要计算
2. 调度器：依赖变化时只设置 dirty，不立即计算
3. `get value()`：检查 dirty，如果是 dirty 才重新计算

#### 步骤2: 修改 ReactiveEffect 支持调度器 (预估10分钟)

**要做什么:**
修改 ReactiveEffect 类，支持调度器参数。

**如何操作:**

修改 `src/reactivity/effect.ts`:

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: () => T,
    public scheduler?: (effect: ReactiveEffect<T>) => void  // 调度器
  ) {}
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    activeEffect = this
    const result = this.fn()
    activeEffect = undefined
    
    return result
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      this.active = false
    }
  }
}

// 修改 trigger 函数，使用调度器
export function trigger(target: object, key: string | symbol, type?: 'set' | 'add') {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  const effects = depsMap.get(key)
  if (effects) {
    // 创建新的 Set 避免无限循环
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effect => {
      // 如果有调度器，使用调度器执行
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        effect.run()
      }
    })
  }
}

// 修改 effect 函数
export function effect<T = any>(fn: () => T) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
  
  const runner = _effect.run.bind(_effect) as any
  runner.effect = _effect
  
  return runner
}
```

**为什么这样做:**
1. **调度器参数**：允许自定义 effect 的执行时机
2. **computed 使用调度器**：依赖变化时只设置 dirty，不立即执行 getter
3. **普通 effect**：没有调度器，依赖变化时立即执行

#### 步骤3: 处理 computed 的依赖追踪 (预估5分钟)

**要做什么:**
确保 computed 自己也能被追踪为依赖。

**测试验证:**

```typescript
it('computed 作为其他 computed 的依赖', () => {
  const value = ref(1)
  const c1 = computed(() => value.value * 2)
  const c2 = computed(() => c1.value * 2)
  
  // 依赖链：c2 -> c1 -> value
  expect(c2.value).toBe(4)
  
  value.value = 2
  expect(c2.value).toBe(8)
})
```

**为什么已经可以工作:**
因为在 `ComputedRefImpl.value` 的 getter 中调用了 `track(this, 'value')`，所以 computed 可以被其他 effect 追踪。

#### 步骤4: 添加性能测试 (预估5分钟)

**测试用例:**

```typescript
it('缓存应该带来性能提升', () => {
  const value = ref(1)
  let computeCount = 0
  
  const double = computed(() => {
    computeCount++
    return value.value * 2
  })
  
  // 访问 1000 次，只计算 1 次
  for (let i = 0; i < 1000; i++) {
    double.value
  }
  expect(computeCount).toBe(1)
  
  // 修改依赖
  value.value = 2
  
  // 再访问 1000 次，只计算 1 次
  for (let i = 0; i < 1000; i++) {
    double.value
  }
  expect(computeCount).toBe(2)
})
```

### 完整代码参考

<details>
<summary>点击查看 src/reactivity/computed.ts 完整代码</summary>

```typescript
import { ReactiveEffect } from './effect'
import { track, trigger } from './effect'

class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private effect: ReactiveEffect<T>
  
  public readonly __v_isRef = true
  
  constructor(getter: () => T) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        trigger(this, 'value')
      }
    })
  }
  
  get value() {
    track(this, 'value')
    
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    
    return this._value
  }
}

export function computed<T>(getter: () => T) {
  return new ComputedRefImpl(getter)
}
```
</details>

---

## 🤔 思考题

### 问题1: 为什么 computed 需要惰性计算？直接在依赖变化时重新计算不行吗？
**提示**: 考虑性能和使用场景。

### 问题2: 如果 computed 的 getter 函数很耗时，如何优化？
**提示**: 考虑防抖、节流、Web Worker 等方案。

### 问题3: computed 和 watch 的区别是什么？什么时候用 computed，什么时候用 watch？
**提示**: 考虑返回值、使用场景和性能。

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

- [惰性求值（Lazy Evaluation）](https://en.wikipedia.org/wiki/Lazy_evaluation) - 阅读时间: 15分钟
- [Vue 3 Computed 源码解析](../../.book_refe/core/packages/reactivity/src/computed.ts) - 阅读时间: 30分钟
- [调度器模式（Scheduler Pattern）](https://refactoring.guru/design-patterns/scheduler) - 阅读时间: 20分钟

---

## ⏭️ 明日预告

明天我们将学习: **watch 监听器实现**

主要内容:
- watch 的基本原理
- 深度监听
- immediate 和 flush 选项
- cleanup 函数

建议预习: watch 的使用场景和 API
