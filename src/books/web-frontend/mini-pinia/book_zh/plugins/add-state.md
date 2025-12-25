---
sidebar_position: 66
title: 添加 State 的正确方式
---

# 添加 State 的正确方式

插件可以向 Store 添加状态，但需要正确处理响应式和 SSR。本章讲解最佳实践。

## 为什么需要特殊处理

直接添加 ref 会有问题：

```javascript
// ❌ 问题：状态不会被 pinia.state 追踪
function badPlugin({ store }) {
  store.myState = ref(0)
  // SSR 时状态不会被序列化
  // DevTools 看不到这个状态
}
```

## 正确添加 State

### 方式 1：使用 store.$state

```javascript
function plugin({ store }) {
  // 检查状态是否已存在（SSR hydration）
  if (!store.$state.hasOwnProperty('pluginState')) {
    store.$state.pluginState = 'initial value'
  }
  
  // 创建响应式引用
  const pluginStateRef = toRef(store.$state, 'pluginState')
  
  // 可以通过 store.$state.pluginState 或 pluginStateRef 访问
}
```

### 方式 2：使用 store.$patch

```javascript
function plugin({ store, pinia }) {
  // 通过 $patch 添加状态
  store.$patch({
    _pluginCount: 0,
    _pluginData: null
  })
  
  // 状态会自动被追踪
}
```

### 方式 3：同时更新 pinia.state

```javascript
function plugin({ store, pinia }) {
  const storeId = store.$id
  
  // 确保 pinia.state 中有对应的条目
  if (!pinia.state.value[storeId]) {
    pinia.state.value[storeId] = {}
  }
  
  // 添加插件状态
  pinia.state.value[storeId].pluginState = ref('value')
}
```

## 完整示例

```javascript
function statePlugin({ store, pinia }) {
  const storeId = store.$id
  
  // 1. 定义要添加的状态
  const pluginState = {
    lastUpdated: null,
    updateCount: 0
  }
  
  // 2. 检查 SSR hydration
  if (pinia.state.value[storeId]?.lastUpdated === undefined) {
    // 首次初始化
    store.$patch(pluginState)
  }
  
  // 3. 订阅变化，更新插件状态
  store.$subscribe(() => {
    store.$patch({
      lastUpdated: Date.now(),
      updateCount: store.updateCount + 1
    })
  })
  
  // 4. 添加方法访问这些状态
  store.$getStats = () => ({
    lastUpdated: store.lastUpdated,
    updateCount: store.updateCount
  })
}
```

## SSR 考虑

### 处理 Hydration

```javascript
function ssrAwarePlugin({ store, pinia }) {
  // 检查是否已 hydrate
  const isHydrating = pinia.state.value[store.$id]?.hasOwnProperty('pluginData')
  
  if (!isHydrating) {
    // 服务端或首次客户端渲染
    store.$state.pluginData = fetchInitialData()
  }
  
  // 客户端会使用 hydrated 的数据
}
```

### 跳过 Hydration

使用 `skipHydrate` 标记不需要 hydrate 的状态：

```javascript
import { skipHydrate } from 'pinia'

function localStatePlugin({ store }) {
  // 这个状态不会从服务端 hydrate
  store.localState = skipHydrate(ref('local only'))
}
```

## 响应式考虑

### ref vs reactive

```javascript
function plugin({ store }) {
  // 使用 ref
  store.pluginRef = ref(0)
  
  // 在模板中需要 .value
  // {{ store.pluginRef }}  → 自动解包
  
  // 使用 reactive（对象类型）
  store.pluginReactive = reactive({
    count: 0,
    items: []
  })
  
  // 直接访问属性
  // {{ store.pluginReactive.count }}
}
```

### toRef 从 $state 提取

```javascript
function plugin({ store }) {
  // 先添加到 $state
  if (!store.$state.hasOwnProperty('counter')) {
    store.$state.counter = 0
  }
  
  // 创建 ref 引用
  const counterRef = toRef(store.$state, 'counter')
  
  // 通过 ref 修改会更新 $state
  store.increment = () => {
    counterRef.value++
  }
}
```

## DevTools 集成

正确添加的状态会在 DevTools 中显示：

```javascript
function visiblePlugin({ store, pinia }) {
  // ✅ 会在 DevTools 中显示
  if (!store.$state.hasOwnProperty('pluginVisible')) {
    store.$patch({ pluginVisible: 'visible in devtools' })
  }
  
  // ❌ 不会在 DevTools 的 state 中显示
  store.pluginInvisible = 'not in state tree'
}
```

## 命名空间

避免与用户 state 冲突：

```javascript
function plugin({ store }) {
  // 使用前缀避免冲突
  const PREFIX = '_plugin_'
  
  if (!store.$state.hasOwnProperty(`${PREFIX}data`)) {
    store.$patch({
      [`${PREFIX}data`]: {},
      [`${PREFIX}meta`]: {
        createdAt: Date.now()
      }
    })
  }
}
```

或使用 Symbol：

```javascript
const PLUGIN_STATE = Symbol('pluginState')

function plugin({ store }) {
  // Symbol 作为属性名不会与字符串键冲突
  store[PLUGIN_STATE] = reactive({
    internal: 'data'
  })
}
```

## 类型安全

```typescript
// 声明插件添加的状态类型
declare module 'pinia' {
  interface PiniaCustomStateProperties<S> {
    _pluginLastUpdated: number | null
    _pluginUpdateCount: number
  }
}

function typedPlugin({ store }: PiniaPluginContext) {
  if (!store.$state.hasOwnProperty('_pluginLastUpdated')) {
    store.$patch({
      _pluginLastUpdated: null,
      _pluginUpdateCount: 0
    })
  }
}
```

## 测试添加的状态

```javascript
describe('State Plugin', () => {
  test('adds state correctly', () => {
    const pinia = createPinia()
    
    pinia.use(({ store }) => {
      if (!store.$state.hasOwnProperty('pluginCounter')) {
        store.$patch({ pluginCounter: 0 })
      }
    })
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ value: 1 })
    })
    
    const store = useStore()
    
    // 验证状态存在
    expect(store.pluginCounter).toBe(0)
    expect(store.$state.pluginCounter).toBe(0)
    
    // 验证响应式
    store.$patch({ pluginCounter: 1 })
    expect(store.pluginCounter).toBe(1)
  })
  
  test('persists in pinia.state', () => {
    const pinia = createPinia()
    
    pinia.use(({ store, pinia: p }) => {
      store.$patch({ pluginData: 'test' })
    })
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({})
    })
    
    useStore()
    
    // 验证在全局 state 中
    expect(pinia.state.value.test.pluginData).toBe('test')
  })
})
```

## 本章小结

本章讲解了添加 State 的正确方式：

- **使用 $state 或 $patch**：确保状态被正确追踪
- **处理 SSR**：检查 hydration 状态
- **响应式**：正确使用 ref/reactive/toRef
- **DevTools**：通过 $state 添加的状态可见
- **命名空间**：使用前缀或 Symbol 避免冲突
- **类型安全**：扩展 PiniaCustomStateProperties

下一章讲解添加自定义选项。
