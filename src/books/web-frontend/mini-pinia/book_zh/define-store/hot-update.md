---
sidebar_position: 18
title: 热更新支持
---

# 热更新支持

热更新（Hot Module Replacement，HMR）是现代开发工具的标配功能。本章将探讨 Pinia 如何支持热更新，确保开发体验的流畅性。

## 什么是热更新？

热更新允许在不刷新页面的情况下更新代码：

```typescript
// 修改 Store 代码
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { 
      this.count++  // 改为 this.count += 2
    }
  }
})

// 保存文件后：
// 1. 代码更新
// 2. 页面不刷新
// 3. 状态保留（count 保持原值）
// 4. 行为更新（increment 现在加 2）
```

## HMR 面临的挑战

Store 的热更新有几个挑战：

### 挑战一：状态保留

```typescript
// 用户已经操作过
const counter = useCounterStore()
counter.count = 10

// 代码更新后
// 期望：count 仍然是 10
// 不期望：count 被重置为 0
```

### 挑战二：行为更新

```typescript
// 修改前
actions: {
  increment() { this.count++ }
}

// 修改后
actions: {
  increment() { this.count += 2 }
}

// 期望：调用 increment 时加 2
// 不期望：仍然加 1
```

### 挑战三：结构变化

```typescript
// 修改前
state: () => ({ count: 0 })

// 修改后
state: () => ({ count: 0, name: 'Counter' })

// 期望：保留 count，添加 name
```

## Pinia 的 HMR 实现

Pinia 提供了 `acceptHMRUpdate` 函数：

```typescript
// stores/counter.ts
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ }
  }
})

// HMR 支持
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}
```

## acceptHMRUpdate 实现

让我们实现这个函数：

```typescript
// src/pinia/hmr.ts
import type { StoreDefinition, Pinia } from './types'
import { getActivePinia } from './rootStore'

export function acceptHMRUpdate(
  initialUseStore: StoreDefinition,
  hot: any
) {
  // 返回一个处理函数给 Vite/Webpack HMR API
  return (newModule: any) => {
    const pinia = getActivePinia()
    
    if (!pinia) {
      // 还没有 Pinia 实例，不需要处理
      return
    }
    
    const id = initialUseStore.$id
    
    // 检查 Store 是否存在
    if (!pinia._s.has(id)) {
      // Store 还没创建，不需要处理
      return
    }
    
    // 获取新的 Store 定义
    const newUseStore = newModule[initialUseStore.$id] ||
                       Object.values(newModule).find(
                         (e: any) => e.$id === id
                       )
    
    if (!newUseStore) {
      console.warn(
        `[Pinia HMR]: Could not find store ${id} in the new module`
      )
      return
    }
    
    // 执行热更新
    hotUpdate(pinia, id, newUseStore)
  }
}

function hotUpdate(
  pinia: Pinia,
  id: string,
  newUseStore: StoreDefinition
) {
  const oldStore = pinia._s.get(id)
  
  if (!oldStore) return
  
  // 保存旧状态
  const oldState = { ...oldStore.$state }
  
  // 删除旧 Store
  oldStore.$dispose()
  
  // 创建新 Store
  const newStore = newUseStore(pinia)
  
  // 恢复旧状态（合并）
  newStore.$patch(oldState)
  
  // 标记为热更新
  newStore._hotUpdating = true
  
  // 更新完成
  delete newStore._hotUpdating
}
```

## 更精细的热更新

上面的实现比较简单，Pinia 官方的实现更精细：

```typescript
// 官方实现思路（简化）
function hotUpdate(pinia: Pinia, id: string, newUseStore: StoreDefinition) {
  const oldStore = pinia._s.get(id)
  
  // 创建新的 setup 结果，但不替换 store
  pinia._s.delete(id)
  
  // 重新创建 store
  const newStore = newUseStore(pinia)
  
  // 恢复状态（只恢复 oldStore 中存在的属性）
  for (const key in oldStore.$state) {
    if (key in newStore.$state) {
      newStore.$state[key] = oldStore.$state[key]
    }
  }
  
  // 处理被删除的 state 属性（不恢复）
  // 处理新增的 state 属性（使用新的初始值）
}
```

## 处理结构变化

当 Store 结构变化时：

```typescript
// 修改前
state: () => ({ 
  count: 0,
  oldProp: 'old'
})

// 修改后
state: () => ({ 
  count: 0,
  newProp: 'new'
})
```

热更新策略：

```typescript
function mergeState(oldState: any, newState: any) {
  const merged = { ...newState }  // 以新结构为基础
  
  // 恢复新旧都有的属性
  for (const key in newState) {
    if (key in oldState) {
      merged[key] = oldState[key]
    }
  }
  
  // oldProp 被丢弃（新结构中没有）
  // newProp 使用新的初始值
  // count 恢复旧值
  
  return merged
}
```

## Getters 和 Actions 的更新

Getters 和 Actions 的更新相对简单，因为它们是函数：

```typescript
// 修改前
actions: {
  increment() { this.count++ }
}

// 修改后
actions: {
  increment() { this.count += 2 }
}
```

当 Store 重新创建时，新的 actions 自然生效。关键是确保旧 Store 的引用被正确更新：

```typescript
function hotUpdate(pinia, id, newUseStore) {
  const hotStores = new Set()
  
  // 获取所有持有旧 store 引用的地方
  // 这通常由框架处理（如 Vue 的响应式系统）
  
  // 创建新 store
  const newStore = newUseStore(pinia)
  
  // 由于 store 是 reactive 的
  // 修改会自动传播到所有使用者
}
```

## Setup Store 的 HMR

Setup Store 的热更新更复杂，因为无法区分 state 和 action：

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  
  function increment() {
    count.value++
  }
  
  return { count, increment }
})
```

解决方案：重新运行 setup 函数，保留 ref 值：

```typescript
function hotUpdateSetupStore(oldStore, newSetup) {
  // 保存旧的 ref 值
  const oldRefs = {}
  for (const key in oldStore) {
    if (isRef(oldStore[key])) {
      oldRefs[key] = oldStore[key].value
    }
  }
  
  // 运行新的 setup
  const newResult = newSetup()
  
  // 恢复 ref 值
  for (const key in oldRefs) {
    if (isRef(newResult[key])) {
      newResult[key].value = oldRefs[key]
    }
  }
  
  return newResult
}
```

## 测试 HMR

```typescript
// tests/hmr.test.ts
import { describe, it, expect } from 'vitest'
import { createPinia, defineStore, acceptHMRUpdate, setActivePinia } from '@pinia'

describe('HMR', () => {
  it('should preserve state after hot update', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    
    // 初始定义
    const useCounterStore = defineStore('counter', {
      state: () => ({ count: 0 })
    })
    
    // 使用并修改状态
    const store1 = useCounterStore()
    store1.count = 10
    
    // 模拟热更新
    const newUseCounterStore = defineStore('counter', {
      state: () => ({ count: 0 }),  // 初始值是 0
      actions: {
        double() { this.count *= 2 }  // 新增 action
      }
    })
    
    // 执行热更新
    acceptHMRUpdate(useCounterStore, {})({
      counter: newUseCounterStore
    })
    
    // 验证
    const store2 = useCounterStore()
    expect(store2.count).toBe(10)  // 状态保留
    expect(store2.double).toBeDefined()  // 新 action 可用
  })
})
```

## 最佳实践

### 1. 始终添加 HMR 代码

```typescript
// stores/counter.ts
export const useCounterStore = defineStore('counter', {
  // ...
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}
```

### 2. 一个文件一个 Store

```typescript
// ✅ 推荐：每个文件一个 Store
// stores/counter.ts
export const useCounterStore = defineStore('counter', ...)

// stores/user.ts
export const useUserStore = defineStore('user', ...)
```

```typescript
// ❌ 不推荐：一个文件多个 Store
// stores/index.ts
export const useCounterStore = defineStore('counter', ...)
export const useUserStore = defineStore('user', ...)
// HMR 时可能有问题
```

### 3. 使用 Pinia 插件自动添加

Vite 插件可以自动添加 HMR 代码：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    // Pinia 没有官方 Vite 插件，但可以自己写
    piniaHMR()
  ]
})
```

## 本章小结

本章我们探讨了 Pinia 的热更新支持：

1. **HMR 挑战**：状态保留、行为更新、结构变化

2. **acceptHMRUpdate**：处理 Store 热更新的核心函数

3. **实现策略**：
   - 保存旧状态
   - 重新创建 Store
   - 恢复兼容的状态

4. **Setup Store 处理**：保留 ref 值，重新运行 setup

5. **最佳实践**：始终添加 HMR 代码，一个文件一个 Store

至此，我们完成了 defineStore 核心部分。下一部分将实现 Options Store。

---

**下一章**：[Options Store 设计理念](../options-store/design-philosophy.md)
