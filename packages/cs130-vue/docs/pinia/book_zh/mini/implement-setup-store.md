# 实现 Setup Store

Setup Store 使用 Composition API 风格定义，更加灵活。这一章实现它。

## Setup Store 结构

```typescript
defineStore('counter', () => {
  // State
  const count = ref(0)
  
  // Getters
  const double = computed(() => count.value * 2)
  
  // Actions
  function increment() {
    count.value++
  }
  
  return { count, double, increment }
})
```

## 与 Options Store 的区别

Setup Store：
- 手动创建 ref/reactive
- 手动创建 computed
- 普通函数作为 action
- 更接近 Composition API 用法

## 基础实现

```typescript
// src/store.ts
import { reactive, isRef, isReactive, toRaw, effectScope } from 'vue'
import type { Pinia, Store, StateTree } from './types'

export function createSetupStore<Id extends string>(
  id: Id,
  setup: () => Record<string, any>,
  pinia: Pinia
): Store<Id> {
  // 创建 effect scope
  const scope = effectScope()
  
  let store: Store<Id>
  
  scope.run(() => {
    // 执行 setup 函数
    const setupResult = setup()
    
    // 分类处理返回值
    const state: StateTree = {}
    const actions: Record<string, Function> = {}
    
    for (const key in setupResult) {
      const value = setupResult[key]
      
      if (typeof value === 'function') {
        // 函数 → Action
        actions[key] = value
      } else {
        // ref/reactive/computed → State/Getter
        state[key] = value
      }
    }
    
    // 创建 Store
    store = reactive({
      $id: id,
      _scope: scope
    }) as Store<Id>
    
    // 合并 state/getters
    for (const key in setupResult) {
      const value = setupResult[key]
      
      if (typeof value === 'function') {
        // Action
        (store as any)[key] = value
      } else if (isRef(value)) {
        // Ref（包括 computed）
        Object.defineProperty(store, key, {
          get: () => value.value,
          set: (newValue) => { value.value = newValue },
          enumerable: true
        })
      } else if (isReactive(value)) {
        // Reactive 对象
        Object.defineProperty(store, key, {
          get: () => value,
          enumerable: true
        })
      } else {
        // 普通值
        (store as any)[key] = value
      }
    }
    
    // 同步到全局状态
    syncStateToGlobal(id, setupResult, pinia)
  })
  
  // 添加核心方法
  addStoreMethods(store!, id, pinia, scope)
  
  // 执行插件
  pinia._p.forEach(plugin => {
    const extensions = plugin({
      pinia,
      app: pinia._a!,
      store: store!,
      options: { id } as any
    })
    
    if (extensions) {
      Object.assign(store!, extensions)
    }
  })
  
  // 注册到 Pinia
  pinia._s.set(id, store!)
  
  return store!
}
```

## Setup 结果处理

区分不同类型的返回值：

```typescript
for (const key in setupResult) {
  const value = setupResult[key]
  
  if (typeof value === 'function') {
    // 函数是 Action
  } else if (isRef(value)) {
    // ref 或 computed
    if (value.effect) {
      // computed
    } else {
      // 普通 ref
    }
  } else if (isReactive(value)) {
    // reactive 对象
  }
}
```

## Ref 处理

ref 需要自动解包：

```typescript
if (isRef(value)) {
  Object.defineProperty(store, key, {
    get: () => value.value,        // 解包
    set: (newValue) => {
      value.value = newValue       // 设置到 .value
    },
    enumerable: true
  })
}
```

使用时不需要 .value：

```typescript
const store = useStore()
store.count         // 自动解包，不是 store.count.value
store.count = 10    // 自动设置
```

## Computed 处理

computed 也是 ref，同样处理：

```typescript
const double = computed(() => count.value * 2)

// computed 是只读的
Object.defineProperty(store, 'double', {
  get: () => double.value,
  // 没有 setter，只读
  enumerable: true
})
```

## 同步到全局状态

```typescript
function syncStateToGlobal(
  id: string,
  setupResult: Record<string, any>,
  pinia: Pinia
) {
  const stateValues: StateTree = {}
  
  for (const key in setupResult) {
    const value = setupResult[key]
    
    // 只同步状态，不同步函数
    if (typeof value !== 'function') {
      if (isRef(value)) {
        stateValues[key] = value.value
      } else {
        stateValues[key] = value
      }
    }
  }
  
  pinia.state.value[id] = stateValues
}
```

## 添加核心方法

```typescript
function addStoreMethods(
  store: Store,
  id: string,
  pinia: Pinia,
  scope: any
) {
  // $state
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      store.$patch(newState)
    }
  })
  
  // $patch
  (store as any).$patch = function(partialStateOrMutator: any) {
    if (typeof partialStateOrMutator === 'function') {
      partialStateOrMutator(this.$state)
    } else {
      Object.assign(this.$state, partialStateOrMutator)
      // 同步到 Store 属性
      for (const key in partialStateOrMutator) {
        if (key in this) {
          this[key] = partialStateOrMutator[key]
        }
      }
    }
  }
  
  // $reset - Setup Store 不支持
  (store as any).$reset = function() {
    throw new Error(
      '[Mini Pinia] Setup stores do not support $reset. ' +
      'Use Options stores or implement your own reset logic.'
    )
  }
  
  // $dispose
  (store as any).$dispose = function() {
    scope.stop()
    pinia._s.delete(id)
  }
}
```

## 完整实现

```typescript
// src/store.ts（Setup Store 部分）
import { 
  reactive, 
  isRef, 
  isReactive, 
  isComputed,
  effectScope,
  type EffectScope
} from 'vue'
import type { Pinia, Store, StateTree } from './types'

export function createSetupStore<Id extends string>(
  id: Id,
  setup: () => Record<string, any>,
  pinia: Pinia
): Store<Id> {
  const scope = effectScope()
  
  let store: Store<Id>
  let setupResult: Record<string, any>
  
  scope.run(() => {
    setupResult = setup()
    
    // 创建 Store 基础
    store = reactive({
      $id: id,
      _scope: scope,
      _setupResult: setupResult
    }) as Store<Id>
    
    // 处理 setup 返回值
    for (const key in setupResult) {
      const value = setupResult[key]
      
      if (typeof value === 'function') {
        // Action：直接赋值
        (store as any)[key] = value
      } else if (isRef(value)) {
        // Ref 或 Computed：自动解包
        Object.defineProperty(store, key, {
          get: () => value.value,
          set: isComputed(value) 
            ? undefined 
            : (newValue) => { value.value = newValue },
          enumerable: true
        })
      } else if (isReactive(value)) {
        // Reactive：直接暴露
        Object.defineProperty(store, key, {
          get: () => value,
          enumerable: true
        })
      } else {
        // 普通值
        (store as any)[key] = value
      }
    }
    
    // 同步状态
    const initialState: StateTree = {}
    for (const key in setupResult) {
      const value = setupResult[key]
      if (typeof value !== 'function') {
        initialState[key] = isRef(value) ? value.value : value
      }
    }
    pinia.state.value[id] = initialState
  })
  
  // $state
  Object.defineProperty(store!, '$state', {
    get: () => pinia.state.value[id]
  })
  
  // $patch
  ;(store! as any).$patch = function(mutator: any) {
    if (typeof mutator === 'function') {
      mutator(setupResult!)
    } else {
      for (const key in mutator) {
        if (key in setupResult!) {
          const target = setupResult![key]
          if (isRef(target)) {
            target.value = mutator[key]
          }
        }
      }
    }
  }
  
  // $reset
  ;(store! as any).$reset = function() {
    throw new Error('[Mini Pinia] Setup stores do not support $reset')
  }
  
  // $subscribe
  ;(store! as any).$subscribe = function() {
    return () => {}
  }
  
  // $onAction
  ;(store! as any).$onAction = function() {
    return () => {}
  }
  
  // $dispose
  ;(store! as any).$dispose = function() {
    scope.stop()
    pinia._s.delete(id)
  }
  
  // 执行插件
  pinia._p.forEach(plugin => {
    const extensions = plugin({
      pinia,
      app: pinia._a!,
      store: store!,
      options: { id } as any
    })
    if (extensions) {
      Object.assign(store!, extensions)
    }
  })
  
  pinia._s.set(id, store!)
  
  return store!
}
```

## 测试

```typescript
// tests/setupStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Setup Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should create state with ref', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore()
    expect(store.count).toBe(0)
    
    store.count++
    expect(store.count).toBe(1)
  })
  
  it('should create getters with computed', () => {
    const useStore = defineStore('test', () => {
      const count = ref(2)
      const double = computed(() => count.value * 2)
      return { count, double }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
    
    store.count = 5
    expect(store.double).toBe(10)
  })
  
  it('should create actions', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      function increment() {
        count.value++
      }
      return { count, increment }
    })
    
    const store = useStore()
    store.increment()
    expect(store.count).toBe(1)
  })
})
```

下一章我们实现 State 响应式。
