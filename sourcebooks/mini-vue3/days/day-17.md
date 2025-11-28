# Day 17: watch 监听器实现

> 学习日期: 2025-12-09  
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 理解 watch 的工作原理
- [ ] 实现基础的 watch 函数
- [ ] 支持监听 ref 和 reactive 对象
- [ ] 实现 immediate 选项

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. watch 监听器的核心原理

#### 1.1 核心概念

**什么是 watch？**

watch 是 Vue 3 提供的侦听器 API，用于在响应式数据变化时执行副作用。与 computed 不同：

| 特性 | watch | computed |
|------|-------|----------|
| 目的 | 执行副作用 | 计算派生值 |
| 返回值 | 停止函数 | 计算结果 |
| 执行时机 | 数据变化时 | 访问时（惰性） |
| 使用场景 | 异步操作、复杂逻辑 | 同步计算、模板使用 |

```javascript
// computed - 计算派生值
const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`
})

// watch - 执行副作用
watch(fullName, (newValue, oldValue) => {
  console.log(`名字从 ${oldValue} 变为 ${newValue}`)
  // 可以执行异步操作
  saveToServer(newValue)
})
```

**watch 的典型使用场景**：

1. **异步操作**
```javascript
const searchText = ref('')

watch(searchText, async (newText) => {
  if (newText.length > 2) {
    const results = await fetch(`/api/search?q=${newText}`)
    // 处理结果...
  }
})
```

2. **复杂的副作用逻辑**
```javascript
watch(route, (newRoute, oldRoute) => {
  // 路由变化时的逻辑
  trackPageView(newRoute.path)
  loadPageData(newRoute.params)
})
```

3. **数据持久化**
```javascript
watch(userSettings, (settings) => {
  localStorage.setItem('settings', JSON.stringify(settings))
}, { deep: true })
```

#### 1.2 watch 的技术实现

**基本实现思路**：

```javascript
function watch(source, cb, options) {
  let getter
  
  // 1. 规范化 source 为 getter 函数
  if (typeof source === 'function') {
    getter = source
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => traverse(source)  // 深度遍历收集依赖
  }
  
  let oldValue
  
  // 2. 创建 effect，使用调度器在变化时执行回调
  const effect = new ReactiveEffect(getter, () => {
    const newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  })
  
  // 3. 立即执行一次，收集依赖
  oldValue = effect.run()
  
  // 4. 返回停止函数
  return () => effect.stop()
}
```

**watch 的执行流程**：

```
1. 创建 watch
   └─> 规范化 source 为 getter
   └─> 创建 effect（带调度器）
   └─> 执行 effect.run() 收集依赖
   └─> 保存 oldValue

2. 响应式数据变化
   └─> 触发 effect 的调度器
   └─> 执行 effect.run() 获取 newValue
   └─> 调用 cb(newValue, oldValue)
   └─> 更新 oldValue

3. 调用停止函数
   └─> 执行 effect.stop()
   └─> 清理依赖
```

#### 1.3 不同类型的 source

**1. 监听 ref**

```javascript
const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(`count: ${oldValue} -> ${newValue}`)
})

// 实现：getter = () => count.value
```

**2. 监听 reactive 对象**

```javascript
const state = reactive({ count: 0 })

watch(state, (newValue, oldValue) => {
  console.log('state 变化了')
  // 注意：newValue 和 oldValue 指向同一个对象
})

// 实现：getter = () => traverse(state)
// traverse 递归访问所有属性，收集依赖
```

**3. 监听 getter 函数**

```javascript
const state = reactive({ count: 0, name: 'Vue' })

// 只监听 count
watch(
  () => state.count,
  (newValue, oldValue) => {
    console.log(`count: ${oldValue} -> ${newValue}`)
  }
)
```

**4. 监听多个源**

```javascript
const firstName = ref('张')
const lastName = ref('三')

watch(
  [firstName, lastName],
  ([newFirst, newLast], [oldFirst, oldLast]) => {
    console.log(`名字变化了`)
  }
)
```

#### 1.4 immediate 选项

**immediate: true** - 立即执行一次回调

```javascript
const count = ref(0)

watch(
  count,
  (newValue, oldValue) => {
    console.log(`count: ${oldValue} -> ${newValue}`)
  },
  { immediate: true }
)
// 立即打印：count: undefined -> 0

// 实现原理
if (options.immediate) {
  cb(oldValue, undefined)  // 首次执行，oldValue 为 undefined
}
```

---

## 💻 实践任务

### 任务目标
实现基础的 watch 函数，支持监听 ref、reactive 和 getter 函数。

### 测试用例

创建 `test/reactivity/watch.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ref, reactive, watch } from '../../src/reactivity'

describe('watch', () => {
  it('应该监听 ref 的变化', () => {
    const count = ref(0)
    const fn = vi.fn()
    
    watch(count, fn)
    
    count.value = 1
    expect(fn).toHaveBeenCalledWith(1, 0)
    
    count.value = 2
    expect(fn).toHaveBeenCalledWith(2, 1)
  })
  
  it('应该监听 reactive 对象的变化', () => {
    const state = reactive({ count: 0 })
    const fn = vi.fn()
    
    watch(state, fn)
    
    state.count = 1
    expect(fn).toHaveBeenCalledTimes(1)
  })
  
  it('应该监听 getter 函数', () => {
    const state = reactive({ count: 0, name: 'Vue' })
    const fn = vi.fn()
    
    watch(() => state.count, fn)
    
    // 只有 count 变化才触发
    state.count = 1
    expect(fn).toHaveBeenCalledWith(1, 0)
    
    // name 变化不触发
    state.name = 'React'
    expect(fn).toHaveBeenCalledTimes(1)
  })
  
  it('应该支持 immediate 选项', () => {
    const count = ref(0)
    const fn = vi.fn()
    
    watch(count, fn, { immediate: true })
    
    // 立即执行一次
    expect(fn).toHaveBeenCalledWith(0, undefined)
    
    count.value = 1
    expect(fn).toHaveBeenCalledWith(1, 0)
  })
  
  it('应该返回停止函数', () => {
    const count = ref(0)
    const fn = vi.fn()
    
    const stop = watch(count, fn)
    
    count.value = 1
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 停止监听
    stop()
    
    count.value = 2
    expect(fn).toHaveBeenCalledTimes(1)  // 不再触发
  })
})
```

### 实现步骤

#### 步骤1: 创建 watch 文件并实现基础结构 (预估10分钟)

创建 `src/reactivity/watch.ts`:

```typescript
import { ReactiveEffect } from './effect'
import { isRef, isReactive } from './reactive'

export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
}

export type WatchSource<T = any> = () => T | { value: T }

export function watch<T>(
  source: WatchSource<T>,
  cb: (newValue: T, oldValue: T | undefined) => void,
  options: WatchOptions = {}
) {
  let getter: () => T
  
  // 规范化 source
  if (typeof source === 'function') {
    getter = source as () => T
  } else if (isRef(source)) {
    getter = () => (source as any).value
  } else if (isReactive(source)) {
    getter = () => traverse(source)
    options.deep = true  // reactive 对象默认深度监听
  } else {
    console.warn('watch source 类型不正确')
    getter = () => source as any
  }
  
  let oldValue: T | undefined
  
  // 创建 effect
  const job = () => {
    const newValue = effectFn.run()
    
    // 调用回调
    cb(newValue, oldValue)
    
    // 更新 oldValue
    oldValue = newValue
  }
  
  const effectFn = new ReactiveEffect(getter, job)
  
  // immediate 选项
  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn.run()
  }
  
  // 返回停止函数
  return () => {
    effectFn.stop()
  }
}

// 深度遍历对象，收集所有属性的依赖
function traverse(value: unknown, seen = new Set<any>()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value
  }
  
  seen.add(value)
  
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else {
    for (const key in value) {
      traverse((value as any)[key], seen)
    }
  }
  
  return value
}
```

#### 步骤2: 添加辅助函数 isRef 和 isReactive (预估5分钟)

修改 `src/reactivity/reactive.ts`，添加类型检查函数：

```typescript
export function isReactive(value: unknown): boolean {
  return !!(value && (value as any).__v_isReactive)
}

export function isRef(value: unknown): boolean {
  return !!(value && (value as any).__v_isRef)
}
```

修改 `src/reactivity/ref.ts`，添加标识：

```typescript
class RefImpl<T> {
  private _value: T
  public readonly __v_isRef = true  // 添加标识
  
  // ... 其他代码
}
```

#### 步骤3: 修改 ReactiveEffect 支持 stop (预估5分钟)

修改 `src/reactivity/effect.ts`：

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: () => T,
    public scheduler?: (effect: ReactiveEffect<T>) => void
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

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

// 修改 track，记录 deps
export function track(target: object, key: string | symbol) {
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 记录依赖，用于 stop
    activeEffect.deps.push(dep)
  }
}
```

#### 步骤4: 导出 watch 函数 (预估2分钟)

修改 `src/reactivity/index.ts`:

```typescript
export { reactive, isReactive, toRaw } from './reactive'
export { ref, isRef } from './ref'
export { effect } from './effect'
export { computed } from './computed'
export { watch } from './watch'
```

### 调试技巧

1. **追踪 watch 的执行**
```typescript
const job = () => {
  console.log('watch 触发')
  const newValue = effectFn.run()
  console.log('newValue:', newValue, 'oldValue:', oldValue)
  cb(newValue, oldValue)
  oldValue = newValue
}
```

2. **验证依赖收集**
```typescript
watch(source, () => {
  console.log('effectFn.deps:', effectFn.deps.length)
})
```

---

## 🤔 思考题

### 问题1: watch 和 watchEffect 的区别是什么？
**提示**: watchEffect 不需要指定 source，自动追踪函数中使用的响应式数据。

### 问题2: 为什么监听 reactive 对象时，newValue 和 oldValue 指向同一个对象？
**提示**: 考虑 Proxy 的特性和对象引用。

### 问题3: 如何实现防抖的 watch？
**提示**: 可以结合调度器和 setTimeout。

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

- [Vue 3 watch API 文档](https://cn.vuejs.org/api/reactivity-core.html#watch) - 阅读时间: 15分钟
- [Vue 3 源码 - watch.ts](../../.book_refe/core/packages/runtime-core/src/apiWatch.ts) - 阅读时间: 30分钟

---

## ⏭️ 明日预告

明天我们将学习: **watchEffect 和 watch 的高级选项**

主要内容:
- watchEffect 实现
- deep 深度监听
- flush 执行时机
- onInvalidate 清理函数

建议预习: watchEffect 的使用场景
