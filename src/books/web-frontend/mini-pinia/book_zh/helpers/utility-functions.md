---
sidebar_position: 56
title: 辅助工具函数
---

# 辅助工具函数

除了核心的 map 系列函数，Pinia 还提供了一些实用的辅助函数。本章实现这些工具函数。

## acceptHMRUpdate

热模块替换（HMR）支持函数：

```javascript
// store/counter.js
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// HMR 支持
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}
```

### 实现

```javascript
function acceptHMRUpdate(initialUseStore, hot) {
  return (newModule) => {
    const pinia = getActivePinia()
    
    if (!pinia) {
      return
    }
    
    // 找到新模块中的 store 定义
    const newStore = Object.values(newModule).find(
      exported => exported.$id === initialUseStore.$id
    )
    
    if (!newStore) {
      console.warn(`[Pinia HMR] Could not find store with id "${initialUseStore.$id}"`)
      return
    }
    
    // 获取当前 store 实例
    const id = initialUseStore.$id
    const existingStore = pinia._s.get(id)
    
    if (!existingStore) {
      return
    }
    
    // 热更新 state
    if (newStore._hmrPayload) {
      // Setup Store
      const { state, actions, getters } = newStore._hmrPayload
      
      // 更新 state
      Object.keys(state).forEach(key => {
        existingStore.$state[key] = state[key]
      })
      
      // 更新 actions 和 getters
      Object.keys(actions).forEach(key => {
        existingStore[key] = actions[key]
      })
      
      Object.keys(getters).forEach(key => {
        // 重新计算 getters
      })
    }
  }
}

export { acceptHMRUpdate }
```

## getActivePinia

获取当前活跃的 Pinia 实例：

```javascript
let activePinia

function setActivePinia(pinia) {
  activePinia = pinia
}

function getActivePinia() {
  // 优先从 Vue 实例获取
  const vm = getCurrentInstance()
  if (vm) {
    const pinia = vm.appContext.config.globalProperties.$pinia
    if (pinia) {
      return pinia
    }
  }
  
  // 回退到全局变量
  return activePinia
}

export { getActivePinia, setActivePinia }
```

### 使用场景

```javascript
// 在组件外使用 store
import { getActivePinia } from 'pinia'

export function someUtilFunction() {
  const pinia = getActivePinia()
  
  if (!pinia) {
    throw new Error('Pinia is not initialized')
  }
  
  const store = useCounterStore(pinia)
  store.increment()
}
```

## skipHydrate

SSR 场景下跳过 hydration：

```javascript
import { skipHydrate } from 'pinia'

const useStore = defineStore('demo', () => {
  // 这个 ref 不会从服务端 state 恢复
  const localOnly = skipHydrate(ref(0))
  
  return { localOnly }
})
```

### 实现

```javascript
const skipHydrateSymbol = Symbol('skipHydrate')

function skipHydrate(value) {
  // 标记为跳过 hydration
  return markRaw({
    [skipHydrateSymbol]: true,
    value
  })
}

function shouldHydrate(value) {
  return !(value && value[skipHydrateSymbol])
}

export { skipHydrate, shouldHydrate, skipHydrateSymbol }
```

## disposePinia

清理整个 Pinia 实例：

```javascript
function disposePinia(pinia) {
  // 清理所有 stores
  pinia._s.forEach((store, id) => {
    store.$dispose()
    pinia._s.delete(id)
  })
  
  // 停止所有副作用
  pinia._e.stop()
  
  // 清空状态
  pinia.state.value = {}
}

export { disposePinia }
```

### 使用场景

```javascript
// 测试清理
afterEach(() => {
  const pinia = getActivePinia()
  if (pinia) {
    disposePinia(pinia)
  }
})
```

## createTestingPinia

创建测试用 Pinia：

```javascript
function createTestingPinia(options = {}) {
  const {
    initialState = {},
    plugins = [],
    stubActions = true,
    fakeApp = false
  } = options
  
  const pinia = createPinia()
  
  // 应用插件
  plugins.forEach(plugin => pinia.use(plugin))
  
  // 设置初始状态
  pinia.state.value = initialState
  
  // Mock actions
  if (stubActions) {
    const originalUse = pinia.use.bind(pinia)
    pinia.use = (plugin) => {
      // 包装 action 为 mock
      return originalUse((context) => {
        plugin(context)
        
        // Stub actions
        if (context.options.actions) {
          Object.keys(context.options.actions).forEach(actionName => {
            context.store[actionName] = vi.fn()
          })
        }
      })
    }
  }
  
  // 创建 fake app
  if (fakeApp) {
    const app = {
      config: {
        globalProperties: {}
      },
      provide: () => {},
      use: () => app
    }
    pinia.install(app)
  }
  
  return pinia
}

export { createTestingPinia }
```

### 使用示例

```javascript
import { createTestingPinia } from '@pinia/testing'

describe('Component', () => {
  test('uses mocked store', () => {
    const pinia = createTestingPinia({
      initialState: {
        counter: { count: 100 }
      }
    })
    
    const store = useCounterStore(pinia)
    expect(store.count).toBe(100)
    
    // actions 被 stub
    store.increment()
    expect(store.increment).toHaveBeenCalled()
  })
})
```

## MutationType 常量

定义 mutation 类型：

```javascript
const MutationType = {
  direct: 'direct',
  patchObject: 'patch object',
  patchFunction: 'patch function'
}

Object.freeze(MutationType)

export { MutationType }
```

## 类型工具函数

### storeToRefs

将 store 的响应式属性提取为 refs（已在前面章节实现）：

```javascript
export { storeToRefs } from './store-to-refs'
```

### extractPlainObject

从响应式对象提取普通对象：

```javascript
function extractPlainObject(store) {
  const plainState = {}
  
  for (const key in store.$state) {
    plainState[key] = toRaw(store.$state[key])
  }
  
  return plainState
}

export { extractPlainObject }
```

## 完整导出

```javascript
// helpers/index.js
export { mapStores, setMapStoreSuffix } from './map-stores'
export { mapState } from './map-state'
export { mapWritableState } from './map-writable-state'
export { mapActions } from './map-actions'
export { mapGetters } from './map-getters'
export { storeToRefs } from './store-to-refs'

export { acceptHMRUpdate } from './hmr'
export { getActivePinia, setActivePinia } from './active-pinia'
export { skipHydrate, shouldHydrate } from './hydration'
export { disposePinia } from './dispose'
export { createTestingPinia } from './testing'
export { MutationType } from './mutation-type'
```

## 辅助函数使用场景总结

| 函数 | 场景 |
|------|------|
| `mapStores` | Options API 映射整个 Store |
| `mapState` | Options API 映射 state/getters |
| `mapWritableState` | Options API 可写状态映射 |
| `mapActions` | Options API 映射 actions |
| `storeToRefs` | Composition API 解构响应式属性 |
| `acceptHMRUpdate` | 开发时热更新 |
| `getActivePinia` | 组件外访问 Pinia |
| `skipHydrate` | SSR 跳过状态恢复 |
| `createTestingPinia` | 单元测试 |

## 测试用例

```javascript
describe('utility functions', () => {
  describe('getActivePinia', () => {
    test('returns active pinia', () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      
      expect(getActivePinia()).toBe(pinia)
    })
  })
  
  describe('skipHydrate', () => {
    test('marks value for skip', () => {
      const skipped = skipHydrate(ref(0))
      
      expect(shouldHydrate(skipped)).toBe(false)
    })
    
    test('normal values should hydrate', () => {
      const normal = ref(0)
      
      expect(shouldHydrate(normal)).toBe(true)
    })
  })
  
  describe('disposePinia', () => {
    test('clears all stores', () => {
      const pinia = createPinia()
      const useStore = defineStore('test', {
        state: () => ({ value: 1 })
      })
      
      useStore(pinia)
      expect(pinia._s.size).toBe(1)
      
      disposePinia(pinia)
      expect(pinia._s.size).toBe(0)
    })
  })
  
  describe('MutationType', () => {
    test('has correct values', () => {
      expect(MutationType.direct).toBe('direct')
      expect(MutationType.patchObject).toBe('patch object')
      expect(MutationType.patchFunction).toBe('patch function')
    })
    
    test('is frozen', () => {
      expect(Object.isFrozen(MutationType)).toBe(true)
    })
  })
})
```

## 本章小结

本章实现了辅助工具函数：

- **HMR 支持**：acceptHMRUpdate 处理热更新
- **Pinia 实例**：getActivePinia/setActivePinia 管理全局实例
- **SSR 支持**：skipHydrate 控制状态恢复
- **测试支持**：createTestingPinia 创建测试环境
- **类型常量**：MutationType 定义 mutation 类型

至此，辅助函数模块全部完成。下一部分进入跨 Store 协作。
