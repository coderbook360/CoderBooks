---
sidebar_position: 15
title: Store 注册表设计
---

# Store 注册表设计

Store 注册表是 Pinia 管理所有 Store 实例的核心数据结构。本章将深入分析其设计和实现。

## 注册表结构

Pinia 使用 Map 作为 Store 注册表：

```typescript
interface Pinia {
  _s: Map<string, StoreGeneric>
  // ...
}
```

为什么选择 Map？

```typescript
// 对比 Object 和 Map

// Object 方式
const stores: Record<string, Store> = {}
stores['counter'] = counterStore
const counter = stores['counter']

// Map 方式
const stores = new Map<string, Store>()
stores.set('counter', counterStore)
const counter = stores.get('counter')
```

Map 的优势：

1. **键类型灵活**：虽然目前用字符串，但 Map 可以用任意类型作键
2. **语义清晰**：`has`、`get`、`set`、`delete` 方法语义明确
3. **迭代性能**：Map 的迭代比 Object 更高效
4. **size 属性**：直接获取 Store 数量

## 注册流程

Store 的注册发生在 `useStore` 首次调用时：

```typescript
function useStore(pinia: Pinia): Store {
  const id = useStore.$id
  
  // 1. 检查是否已注册
  if (!pinia._s.has(id)) {
    // 2. 创建 Store
    const store = createStore(id, options, pinia)
    
    // 3. 注册到注册表
    pinia._s.set(id, store)
  }
  
  // 4. 返回已注册的 Store
  return pinia._s.get(id)!
}
```

这个流程保证了：

1. **单例性**：同一个 ID 只创建一次 Store
2. **延迟创建**：只有使用时才创建
3. **共享访问**：所有组件共享同一个 Store 实例

## 完整的创建流程

让我们看看从 `defineStore` 到 Store 注册的完整流程：

```typescript
// 步骤 1: 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ }
  }
})
// 此时只是创建了 useStore 函数，还没有 Store 实例

// 步骤 2: 首次调用 useStore
const counter = useCounterStore()
// 内部流程：
// - 获取/确定 pinia 实例
// - 检查 pinia._s.has('counter') → false
// - 调用 createOptionsStore('counter', options, pinia)
// - pinia._s.set('counter', store)
// - 返回 store

// 步骤 3: 再次调用 useStore
const counter2 = useCounterStore()
// 内部流程：
// - 检查 pinia._s.has('counter') → true
// - 直接返回 pinia._s.get('counter')
// counter === counter2
```

## 注册表的操作

### 查询 Store

```typescript
// 检查是否存在
if (pinia._s.has('counter')) {
  // Store 已创建
}

// 获取 Store
const store = pinia._s.get('counter')
if (store) {
  console.log(store.$state)
}

// 获取所有 Store ID
const storeIds = Array.from(pinia._s.keys())
console.log(storeIds) // ['counter', 'user', 'cart']

// 获取所有 Store 实例
const stores = Array.from(pinia._s.values())

// 获取 Store 数量
console.log(pinia._s.size)
```

### 删除 Store

当 Store 被 dispose 时，需要从注册表中删除：

```typescript
function createStore(id: string, options: any, pinia: Pinia) {
  // ... 创建 store
  
  const store = {
    $id: id,
    // ...
    $dispose() {
      // 停止所有副作用
      scope.stop()
      
      // 清理订阅
      subscriptions.length = 0
      actionSubscriptions.length = 0
      
      // 从注册表中删除
      pinia._s.delete(id)
      
      // 从状态树中删除
      delete pinia.state.value[id]
    }
  }
  
  return store
}
```

### 清空注册表

在测试或重置场景，可能需要清空所有 Store：

```typescript
function resetPinia(pinia: Pinia) {
  // 先 dispose 所有 Store
  pinia._s.forEach(store => {
    store.$dispose()
  })
  
  // 清空注册表（$dispose 会删除，但确保干净）
  pinia._s.clear()
  
  // 清空状态树
  pinia.state.value = {}
}
```

## 注册表与状态树的关系

注册表（`_s`）和状态树（`state`）存储不同的东西：

```typescript
// _s：存储 Store 实例（包含方法和属性）
pinia._s.get('counter')
// → { $id, $state, count, increment, $patch, $subscribe, ... }

// state.value：只存储状态数据
pinia.state.value.counter
// → { count: 0 }
```

它们的关系：

```typescript
const store = pinia._s.get('counter')

// store.$state 是 state.value.counter 的代理或引用
console.log(store.$state === pinia.state.value.counter) // true 或代理关系
```

## 插件访问注册表

插件可以通过上下文访问 Pinia 实例，从而访问注册表：

```typescript
function myPlugin({ pinia, store }) {
  // 访问其他 Store
  const userStore = pinia._s.get('user')
  
  // 等待某个 Store 创建
  function waitForStore(id: string): Promise<Store> {
    return new Promise(resolve => {
      if (pinia._s.has(id)) {
        resolve(pinia._s.get(id)!)
        return
      }
      
      // 轮询检查（简化实现）
      const interval = setInterval(() => {
        if (pinia._s.has(id)) {
          clearInterval(interval)
          resolve(pinia._s.get(id)!)
        }
      }, 100)
    })
  }
}
```

## 并发安全

在大多数情况下，Store 的创建和访问是同步的，不需要担心并发问题。但在某些边缘情况下需要注意：

```typescript
// 可能的问题：同时创建同一个 Store
async function problematicCode() {
  // 两个异步操作同时触发 Store 创建
  const [storeA, storeB] = await Promise.all([
    asyncOperationA(), // 内部调用 useStore()
    asyncOperationB()  // 内部调用 useStore()
  ])
  
  // 这通常没问题，因为 JavaScript 是单线程的
  // 但要注意 async 边界
}
```

Pinia 的检查-创建逻辑是同步的：

```typescript
function useStore(pinia: Pinia): Store {
  // 这个检查是同步的
  if (!pinia._s.has(id)) {
    // 创建也是同步的
    const store = createStore(id, options, pinia)
    pinia._s.set(id, store)
  }
  
  return pinia._s.get(id)!
}
```

只要 `createStore` 是同步的，就不会有并发问题。

## 调试工具

实现一些调试工具函数：

```typescript
// src/pinia/devtools.ts

export function getRegisteredStores(pinia: Pinia): string[] {
  return Array.from(pinia._s.keys())
}

export function inspectStore(pinia: Pinia, id: string) {
  const store = pinia._s.get(id)
  
  if (!store) {
    console.warn(`[Pinia Debug]: Store "${id}" not found`)
    return null
  }
  
  return {
    id: store.$id,
    state: JSON.parse(JSON.stringify(store.$state)),
    getters: Object.keys(store).filter(key => 
      !key.startsWith('$') && typeof store[key] !== 'function'
    ),
    actions: Object.keys(store).filter(key => 
      !key.startsWith('$') && typeof store[key] === 'function'
    )
  }
}

export function dumpAllStores(pinia: Pinia) {
  const dump: Record<string, any> = {}
  
  pinia._s.forEach((store, id) => {
    dump[id] = {
      state: JSON.parse(JSON.stringify(store.$state)),
      // 可以添加更多信息
    }
  })
  
  return dump
}
```

## 本章小结

本章我们分析了 Store 注册表的设计：

1. **数据结构**：使用 Map 存储 Store 实例，ID 为键

2. **注册流程**：首次调用 `useStore` 时创建并注册

3. **单例模式**：同一 ID 只有一个 Store 实例

4. **操作方法**：has、get、set、delete、clear 等

5. **与状态树关系**：注册表存 Store 实例，状态树存纯数据

6. **插件访问**：插件可以访问和操作注册表

下一章我们将实现 `useStore` 函数的完整逻辑。

---

**下一章**：[useStore 函数实现](use-store.md)
