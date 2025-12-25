---
sidebar_position: 14
title: Store ID 与唯一标识机制
---

# Store ID 与唯一标识机制

每个 Store 都有一个唯一的 ID，这个 ID 在 Pinia 的架构中扮演着关键角色。本章将探讨 Store ID 的设计和应用。

## Store ID 的作用

Store ID 在多个地方被使用：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// ID 'counter' 被用于：
// 1. Store 注册表的键
// 2. 状态树中的键
// 3. DevTools 中的标识
// 4. 持久化存储的键
// 5. 日志和调试信息
```

让我们逐一分析每个用途。

## 注册表中的键

Pinia 使用 Map 存储所有 Store，ID 是键：

```typescript
// pinia._s 的结构
Map {
  'counter' => Store { $id: 'counter', count: 0, ... },
  'user' => Store { $id: 'user', name: '', ... },
  'cart' => Store { $id: 'cart', items: [], ... }
}
```

通过 ID 可以快速查找 Store：

```typescript
function useStore(pinia: Pinia): Store {
  const id = 'counter'
  
  // 检查是否已存在
  if (pinia._s.has(id)) {
    return pinia._s.get(id)!
  }
  
  // 不存在则创建
  const store = createStore(id, options, pinia)
  pinia._s.set(id, store)
  
  return store
}
```

## 状态树中的键

全局状态树以 ID 组织状态：

```typescript
// pinia.state.value 的结构
{
  'counter': { count: 0 },
  'user': { name: '', age: 0 },
  'cart': { items: [] }
}
```

这个结构使得：

1. **状态序列化**：可以轻松序列化整个状态树
2. **状态恢复**：可以按 ID 恢复特定 Store 的状态
3. **DevTools 展示**：清晰展示所有 Store 的状态

```typescript
// 序列化状态
const serialized = JSON.stringify(pinia.state.value)
localStorage.setItem('app-state', serialized)

// 恢复状态
const saved = localStorage.getItem('app-state')
if (saved) {
  pinia.state.value = JSON.parse(saved)
}
```

## ID 的唯一性要求

思考一下，如果两个 Store 使用相同的 ID 会发生什么？

```typescript
// Store A
const useStoreA = defineStore('shared', {
  state: () => ({ valueA: 1 })
})

// Store B（相同 ID）
const useStoreB = defineStore('shared', {
  state: () => ({ valueB: 2 })
})

// 使用时
const storeA = useStoreA()
const storeB = useStoreB()

// storeA === storeB，因为它们共享同一个 ID
// 但状态是 A 还是 B 的？取决于哪个先被调用
```

这会导致不可预期的行为！因此，**Store ID 必须全局唯一**。

### ID 冲突检测

在开发环境，我们可以添加冲突检测：

```typescript
function createStore(id: string, options: any, pinia: Pinia) {
  // 开发环境检测
  if (__DEV__ && pinia._s.has(id)) {
    console.warn(
      `[Pinia]: Store "${id}" is already registered.` +
      ` Are you trying to define the same store twice?`
    )
  }
  
  // ...
}
```

## ID 命名规范

虽然 Pinia 不强制命名规范，但有一些最佳实践：

### 推荐的命名方式

```typescript
// 1. 功能域命名
defineStore('counter', ...)
defineStore('user', ...)
defineStore('cart', ...)

// 2. 模块/功能 命名
defineStore('auth/user', ...)
defineStore('shop/cart', ...)
defineStore('shop/products', ...)

// 3. 描述性命名
defineStore('userProfile', ...)
defineStore('shoppingCart', ...)
defineStore('productCatalog', ...)
```

### 不推荐的命名方式

```typescript
// ❌ 太短，含义不明
defineStore('u', ...)
defineStore('c', ...)

// ❌ 与 $ 开头的内部属性冲突
defineStore('$internal', ...)

// ❌ 使用保留字
defineStore('state', ...)
defineStore('store', ...)
```

## $id 属性

Store 实例上的 `$id` 属性存储其 ID：

```typescript
const counter = useCounterStore()

console.log(counter.$id) // 'counter'
```

实现很简单：

```typescript
function createSetupStore(id: string, setup: () => any, pinia: Pinia) {
  const store = reactive({
    $id: id,  // 直接赋值
    // ...其他属性
  })
  
  return store
}
```

### $id 的不可变性

`$id` 应该是只读的：

```typescript
const counter = useCounterStore()

counter.$id = 'newId'  // ❌ 不应该被修改

// 在开发环境可以添加警告
if (__DEV__) {
  Object.defineProperty(store, '$id', {
    value: id,
    writable: false,
    configurable: false
  })
}
```

## ID 在插件中的应用

插件经常使用 ID 来实现条件逻辑：

```typescript
// 持久化插件：只持久化特定 Store
function persistencePlugin({ store }) {
  const persistKeys = ['user', 'settings']
  
  if (!persistKeys.includes(store.$id)) {
    return // 跳过不需要持久化的 Store
  }
  
  // 持久化逻辑...
}
```

```typescript
// 日志插件：使用 ID 作为日志前缀
function loggerPlugin({ store }) {
  store.$subscribe((mutation) => {
    console.log(`[${store.$id}]`, mutation.type, mutation.payload)
  })
}
```

```typescript
// 权限插件：根据 ID 应用不同权限
function permissionPlugin({ store }) {
  const adminOnlyStores = ['admin-settings', 'user-management']
  
  if (adminOnlyStores.includes(store.$id)) {
    // 添加权限检查
    wrapActionsWithPermissionCheck(store)
  }
}
```

## 动态 Store ID

有时需要动态生成 Store ID：

```typescript
// 为每个实体创建独立的 Store
function createEntityStore(entityId: string) {
  return defineStore(`entity-${entityId}`, {
    state: () => ({
      data: null,
      loading: false
    }),
    actions: {
      async fetch() {
        this.loading = true
        this.data = await api.getEntity(entityId)
        this.loading = false
      }
    }
  })
}

// 使用
const useUserStore = createEntityStore('user-123')
const usePostStore = createEntityStore('post-456')
```

注意：这种模式会创建大量 Store，需要考虑内存管理。

## ID 与 HMR

在热更新时，ID 用于识别需要更新的 Store：

```typescript
// HMR 支持
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // 通过 ID 找到旧 Store 并替换
    const oldStore = pinia._s.get('counter')
    if (oldStore) {
      // 保留旧状态，更新行为
      pinia._s.set('counter', {
        ...newModule.useCounterStore(),
        $state: oldStore.$state
      })
    }
  })
}
```

## 实现 ID 验证

让我们实现一个 ID 验证函数：

```typescript
// src/pinia/utils.ts

const RESERVED_IDS = ['state', 'store', 'pinia', '_']
const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_/-]*$/

export function validateStoreId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error('[Pinia]: Store id must be a non-empty string')
  }
  
  if (id.startsWith('$')) {
    throw new Error(
      `[Pinia]: Store id "${id}" cannot start with '$' as it's reserved for internal properties`
    )
  }
  
  if (RESERVED_IDS.includes(id)) {
    throw new Error(
      `[Pinia]: Store id "${id}" is reserved and cannot be used`
    )
  }
  
  if (!ID_PATTERN.test(id)) {
    console.warn(
      `[Pinia]: Store id "${id}" contains invalid characters. ` +
      `It's recommended to use only alphanumeric characters, underscores, and slashes.`
    )
  }
}
```

在 `defineStore` 中使用：

```typescript
export function defineStore(idOrOptions: any, setup?: any) {
  let id: string
  // ... 参数解析
  
  if (__DEV__) {
    validateStoreId(id)
  }
  
  // ... 后续逻辑
}
```

## 本章小结

本章我们探讨了 Store ID 的设计：

1. **ID 的作用**：
   - Store 注册表的键
   - 状态树中的键
   - DevTools 和调试标识
   - 插件条件逻辑

2. **唯一性要求**：ID 必须全局唯一，重复会导致问题

3. **$id 属性**：Store 实例的只读属性

4. **命名规范**：功能域命名，避免保留字

5. **动态 ID**：支持动态生成，但需注意内存管理

下一章我们将讨论 Store 注册表的设计。

---

**下一章**：[Store 注册表设计](store-registry.md)
