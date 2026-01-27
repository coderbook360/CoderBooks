# 实现 Options Store

Options Store 是 Pinia 的传统定义方式，类似 Vuex。这一章实现它。

## Options Store 结构

```typescript
defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})
```

## 创建流程

```
解析 state → 创建响应式状态
        ↓
解析 getters → 创建 computed
        ↓
解析 actions → 绑定 this
        ↓
组合成 Store 对象
        ↓
添加 $patch, $reset 等方法
        ↓
执行插件
        ↓
注册到 Pinia
```

## 基础实现

```typescript
// src/store.ts
import { reactive, computed, toRaw } from 'vue'
import type { Pinia, Store, StoreOptions, StateTree } from './types'

export function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  id: Id,
  options: StoreOptions<Id, S, G, A>,
  pinia: Pinia
): Store<Id, S, G, A> {
  const { state: stateFn, getters, actions } = options
  
  // 创建初始状态
  const initialState = stateFn ? stateFn() : {}
  
  // 保存到全局状态
  pinia.state.value[id] = initialState
  
  // 创建响应式状态
  const state = reactive(initialState) as S
  
  // 创建 getters
  const computedGetters: Record<string, any> = {}
  if (getters) {
    for (const key in getters) {
      const getter = getters[key as keyof typeof getters]
      computedGetters[key] = computed(() => {
        return (getter as Function)(state)
      })
    }
  }
  
  // 创建 Store 基础对象
  const store = reactive({
    $id: id,
    ...state,
    ...computedGetters
  }) as Store<Id, S, G, A>
  
  // 绑定 actions
  if (actions) {
    for (const key in actions) {
      const action = actions[key as keyof typeof actions]
      ;(store as any)[key] = function(...args: any[]) {
        return (action as Function).apply(store, args)
      }
    }
  }
  
  // 注册到 Pinia
  pinia._s.set(id, store)
  
  return store
}
```

## State 处理

```typescript
// 获取初始状态
const initialState = stateFn ? stateFn() : {}

// 保存到 Pinia 全局状态
pinia.state.value[id] = initialState

// 创建响应式
const state = reactive(initialState)
```

state 函数必须返回新对象，避免共享状态：

```typescript
// ✅ 正确
state: () => ({ count: 0 })

// ❌ 错误：共享状态
const shared = { count: 0 }
state: () => shared
```

## Getters 处理

```typescript
const computedGetters: Record<string, any> = {}

for (const key in getters) {
  const getter = getters[key]
  
  // 使用 computed 实现缓存
  computedGetters[key] = computed(() => {
    return getter(state)
  })
}
```

getter 接收 state 作为参数：

```typescript
getters: {
  double: (state) => state.count * 2,
  
  // 访问其他 getter
  quadruple(state) {
    return this.double * 2  // 通过 this 访问
  }
}
```

## Actions 处理

```typescript
for (const key in actions) {
  const action = actions[key]
  
  // 绑定 this 到 Store
  store[key] = function(...args) {
    return action.apply(store, args)
  }
}
```

action 中的 this 指向 Store：

```typescript
actions: {
  increment() {
    this.count++  // this 是 Store
  },
  
  async fetchData() {
    this.loading = true
    const data = await api.fetch()
    this.data = data
    this.loading = false
  }
}
```

## 添加核心方法

```typescript
// $patch 方法
store.$patch = function(partialStateOrMutator) {
  if (typeof partialStateOrMutator === 'function') {
    partialStateOrMutator(state)
  } else {
    Object.assign(state, partialStateOrMutator)
  }
}

// $reset 方法
store.$reset = function() {
  const newState = stateFn ? stateFn() : {}
  this.$patch(newState)
}

// $state 属性
Object.defineProperty(store, '$state', {
  get: () => state,
  set: (newState) => {
    store.$patch(newState)
  }
})
```

## 完整实现

```typescript
// src/store.ts
import { reactive, computed, toRaw, effectScope } from 'vue'
import type { Pinia, Store, StoreOptions, StateTree, MutationInfo } from './types'

export function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  id: Id,
  options: StoreOptions<Id, S, G, A>,
  pinia: Pinia
): Store<Id, S, G, A> {
  const { state: stateFn, getters, actions } = options
  
  // 创建 effect scope
  const scope = effectScope()
  
  let store: Store<Id, S, G, A>
  
  scope.run(() => {
    // 初始状态
    const initialState = stateFn ? stateFn() : ({} as S)
    
    // 保存初始状态副本（用于 $reset）
    const initialStateCopy = JSON.parse(JSON.stringify(initialState))
    
    // 保存到全局状态
    pinia.state.value[id] = initialState
    
    // 响应式状态
    const state = reactive(initialState) as S
    
    // Getters
    const computedGetters: Record<string, any> = {}
    if (getters) {
      for (const key in getters) {
        const getter = getters[key as keyof typeof getters]
        computedGetters[key] = computed(() => {
          return (getter as Function).call(store, state)
        })
      }
    }
    
    // 创建 Store
    store = reactive({
      $id: id,
      $state: state,
      _initialState: initialStateCopy,
      _scope: scope
    }) as Store<Id, S, G, A>
    
    // 合并 State
    for (const key in state) {
      Object.defineProperty(store, key, {
        get: () => state[key],
        set: (value) => { state[key] = value },
        enumerable: true
      })
    }
    
    // 合并 Getters
    for (const key in computedGetters) {
      Object.defineProperty(store, key, {
        get: () => computedGetters[key].value,
        enumerable: true
      })
    }
    
    // 合并 Actions
    if (actions) {
      for (const key in actions) {
        const action = actions[key as keyof typeof actions]
        ;(store as any)[key] = function(...args: any[]) {
          return (action as Function).apply(store, args)
        }
      }
    }
    
    // $patch
    ;(store as any).$patch = function(
      partialStateOrMutator: Partial<S> | ((state: S) => void)
    ) {
      if (typeof partialStateOrMutator === 'function') {
        partialStateOrMutator(state)
      } else {
        for (const key in partialStateOrMutator) {
          state[key] = partialStateOrMutator[key] as any
        }
      }
    }
    
    // $reset
    ;(store as any).$reset = function() {
      const newState = JSON.parse(JSON.stringify(initialStateCopy))
      this.$patch(newState)
    }
    
    // $subscribe（简化版，后续章节详细实现）
    ;(store as any).$subscribe = function() {
      return () => {}
    }
    
    // $onAction（简化版）
    ;(store as any).$onAction = function() {
      return () => {}
    }
    
    // $dispose
    ;(store as any).$dispose = function() {
      scope.stop()
      pinia._s.delete(id)
    }
  })
  
  // 执行插件
  pinia._p.forEach(plugin => {
    const extensions = plugin({
      pinia,
      app: pinia._a!,
      store: store!,
      options
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

## 测试

```typescript
// tests/optionsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Options Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should create state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    expect(store.count).toBe(0)
  })
  
  it('should create getters', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
  })
  
  it('should create actions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    store.increment()
    expect(store.count).toBe(1)
  })
})
```

下一章我们实现 Setup Store。
