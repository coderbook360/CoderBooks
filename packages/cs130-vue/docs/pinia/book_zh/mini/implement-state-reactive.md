# 实现 State 响应式

State 是 Store 的核心，需要保持响应式。这一章详细分析 State 的响应式处理。

## 响应式基础

Vue 3 提供的响应式 API：

```typescript
import { ref, reactive, toRaw, isRef, isReactive } from 'vue'
```

## Options Store 的 State

```typescript
// 用户定义
state: () => ({ count: 0, name: 'John' })

// 内部处理
const initialState = stateFn()  // { count: 0, name: 'John' }
const state = reactive(initialState)  // 响应式化
```

## 同步到全局状态

```typescript
// pinia.state.value 是所有 Store 状态的容器
pinia.state.value[id] = initialState

// 结构：
// pinia.state.value = {
//   'counter': { count: 0 },
//   'user': { name: 'John' }
// }
```

## State 属性代理

Store 上的属性代理到 state：

```typescript
// 创建代理
for (const key in state) {
  Object.defineProperty(store, key, {
    get() {
      return state[key]
    },
    set(value) {
      state[key] = value
    },
    enumerable: true
  })
}

// 使用时
store.count = 10    // 实际设置 state.count = 10
console.log(store.count)  // 实际读取 state.count
```

## $state 访问器

```typescript
Object.defineProperty(store, '$state', {
  get() {
    return pinia.state.value[id]
  },
  set(newState) {
    // 替换整个状态
    store.$patch(newState)
  }
})

// 使用
store.$state  // 获取整个状态对象
store.$state = { count: 100 }  // 替换状态
```

## Setup Store 的 State

Setup Store 使用 ref：

```typescript
// 用户定义
const count = ref(0)
const name = ref('John')

// 返回
return { count, name }
```

处理 ref 的自动解包：

```typescript
if (isRef(value)) {
  Object.defineProperty(store, key, {
    get: () => value.value,        // 自动解包
    set: (newValue) => {
      value.value = newValue       // 设置到 .value
    },
    enumerable: true
  })
}
```

## 响应式追踪

在模板或 computed 中使用 Store，会自动建立依赖：

```typescript
// 模板
<template>{{ store.count }}</template>  // 追踪 count

// computed
const double = computed(() => store.count * 2)  // 追踪 count

// watch
watch(() => store.count, (newVal) => {
  console.log('count changed:', newVal)
})
```

## 深层响应式

reactive 默认是深层响应的：

```typescript
state: () => ({
  user: {
    profile: {
      name: 'John'
    }
  }
})

// 深层属性也是响应式
store.user.profile.name = 'Jane'  // 触发更新
```

## 响应式丢失问题

解构会丢失响应式：

```typescript
// ❌ 丢失响应式
const { count } = store
count++  // 不会更新 store

// ✅ 使用 storeToRefs
const { count } = storeToRefs(store)
count.value++  // 更新 store
```

## 完整的 State 处理代码

```typescript
// src/state.ts
import { reactive, toRaw } from 'vue'
import type { StateTree, Pinia, Store } from './types'

/**
 * 初始化 Options Store 的 State
 */
export function initOptionsState<S extends StateTree>(
  id: string,
  stateFn: () => S,
  pinia: Pinia
): S {
  // 获取初始状态
  const initialState = stateFn()
  
  // 保存到全局（保持引用）
  pinia.state.value[id] = initialState
  
  // 创建响应式
  return reactive(initialState) as S
}

/**
 * 将 State 属性代理到 Store
 */
export function proxyStateToStore<S extends StateTree>(
  store: Store,
  state: S
): void {
  for (const key in state) {
    if (key.startsWith('$') || key.startsWith('_')) {
      // 跳过内部属性
      continue
    }
    
    Object.defineProperty(store, key, {
      get() {
        return state[key]
      },
      set(value) {
        state[key] = value
      },
      enumerable: true,
      configurable: true
    })
  }
}

/**
 * 设置 $state 访问器
 */
export function setupStateAccessor(
  store: Store,
  id: string,
  pinia: Pinia
): void {
  Object.defineProperty(store, '$state', {
    get() {
      return pinia.state.value[id]
    },
    set(newState) {
      (store as any).$patch(newState)
    },
    enumerable: false
  })
}

/**
 * 获取原始状态（用于序列化等）
 */
export function getUnwrappedState<S extends StateTree>(state: S): S {
  return toRaw(state) as S
}
```

## 使用示例

```typescript
// 创建 Store 时使用
function createOptionsStore(id, options, pinia) {
  const { state: stateFn } = options
  
  // 初始化 State
  const state = initOptionsState(id, stateFn, pinia)
  
  // 创建 Store
  const store = reactive({ $id: id }) as Store
  
  // 代理 State 到 Store
  proxyStateToStore(store, state)
  
  // 设置 $state 访问器
  setupStateAccessor(store, id, pinia)
  
  return store
}
```

## 测试

```typescript
// tests/state.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { watch, nextTick } from 'vue'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('State Reactivity', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should be reactive', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    let watchedValue = 0
    
    watch(
      () => store.count,
      (value) => { watchedValue = value }
    )
    
    store.count = 10
    await nextTick()
    
    expect(watchedValue).toBe(10)
  })
  
  it('should have deep reactivity', async () => {
    const useStore = defineStore('test', {
      state: () => ({
        nested: { value: 1 }
      })
    })
    
    const store = useStore()
    let watchedValue = 0
    
    watch(
      () => store.nested.value,
      (value) => { watchedValue = value },
      { deep: true }
    )
    
    store.nested.value = 100
    await nextTick()
    
    expect(watchedValue).toBe(100)
  })
  
  it('should sync with $state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.count = 50
    
    expect(store.$state.count).toBe(50)
  })
})
```

## 性能考虑

避免不必要的响应式：

```typescript
// 大型静态数据可以用 markRaw
import { markRaw } from 'vue'

state: () => ({
  // 大型静态配置，不需要响应式
  config: markRaw(LARGE_CONFIG_OBJECT)
})
```

下一章我们实现 Getters。
