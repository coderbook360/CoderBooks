---
sidebar_position: 34
title: $id 属性与 Store 标识
---

# $id 属性与 Store 标识

每个 Pinia Store 都有一个唯一的 `$id` 属性，用于标识和管理 Store。本章探讨 `$id` 的设计意图和实现。

## $id 的作用

```javascript
const useCounterStore = defineStore('counter', { /* ... */ })
const store = useCounterStore()

console.log(store.$id)  // 'counter'
```

`$id` 的核心用途：

1. **Store 注册**：在 pinia.state.value 中作为 key
2. **Store 缓存**：判断 Store 是否已创建
3. **调试标识**：DevTools 中区分不同 Store
4. **插件上下文**：告诉插件正在处理哪个 Store

## 标识命名规范

Pinia 对 Store ID 没有强制约束，但推荐：

```javascript
// ✅ 推荐：小写，描述性
defineStore('user', { ... })
defineStore('shopping-cart', { ... })
defineStore('auth', { ... })

// ✅ 可接受：驼峰式
defineStore('userProfile', { ... })
defineStore('shoppingCart', { ... })

// ❌ 避免：太笼统
defineStore('store', { ... })
defineStore('data', { ... })

// ❌ 避免：与内部属性冲突
defineStore('$id', { ... })      // 可能引起混淆
defineStore('_p', { ... })       // 可能引起混淆
```

## $id 的实现

在 `createSetupStore` 中设置 `$id`：

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 创建 Store 对象
  const store = reactive({})
  
  // 设置 $id（只读）
  Object.defineProperty(store, '$id', {
    value: id,
    writable: false,
    enumerable: false,  // 遍历时不显示
    configurable: false
  })
  
  // ... 其他逻辑
  
  return store
}
```

关键设计：

- **只读**：`writable: false`，防止意外修改
- **不可枚举**：`enumerable: false`，不干扰 `Object.keys()`
- **不可配置**：`configurable: false`，防止被删除或重新定义

### 为什么设为不可枚举？

```javascript
const store = useCounterStore()

// 遍历 Store 时，$id 不应该出现
console.log(Object.keys(store))
// ['count', 'double', 'increment'] - 没有 $id

// 但直接访问是可以的
console.log(store.$id)  // 'counter'
```

这样设计的原因：

- 遍历得到的是业务相关的 state/getters/actions
- 内部属性（`$id`、`$state` 等）通过直接访问获取
- 序列化时自动忽略这些内部属性

## Store 注册表

`$id` 用于在 Pinia 中注册 Store：

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 检查是否已注册
  if (pinia._s.has(id)) {
    return pinia._s.get(id)
  }
  
  // 创建新 Store
  const store = reactive({})
  store.$id = id
  
  // 注册到 Pinia
  pinia._s.set(id, store)
  
  // 初始化全局 state
  if (!(id in pinia.state.value)) {
    pinia.state.value[id] = {}
  }
  
  return store
}
```

访问注册表：

```javascript
const pinia = usePinia()

// 获取所有已注册的 Store ID
const storeIds = Array.from(pinia._s.keys())
console.log(storeIds)  // ['counter', 'user', 'cart']

// 根据 ID 获取 Store 实例
const counterStore = pinia._s.get('counter')
```

## 唯一性保证

每个 ID 只能对应一个 Store 定义：

```javascript
// ⚠️ 错误：同一 ID 定义两个 Store
const useStoreA = defineStore('shared', {
  state: () => ({ a: 1 })
})

const useStoreB = defineStore('shared', {
  state: () => ({ b: 2 })
})

// 实际效果：后定义的覆盖先定义的
// 这是一个常见错误，应该避免
```

在开发环境，可以添加警告：

```javascript
function defineStore(id, options) {
  // 开发环境检查重复定义
  if (__DEV__ && definedStores.has(id)) {
    console.warn(`Store "${id}" is already defined. Make sure each store has a unique ID.`)
  }
  definedStores.add(id)
  
  // ... 其他逻辑
}
```

## DevTools 集成

`$id` 在 Vue DevTools 中用于标识 Store：

```javascript
// DevTools 会显示类似结构：
// Pinia
//   └─ counter (id: 'counter')
//       ├─ state
//       │   └─ count: 0
//       ├─ getters
//       │   └─ double: 0
//       └─ actions
//           └─ increment
```

实现 DevTools 支持的简化版本：

```javascript
function registerStoreInDevtools(store, pinia) {
  if (!__DEV__) return
  
  const devtools = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (!devtools) return
  
  devtools.emit('pinia:store', {
    id: store.$id,
    state: store.$state,
    getters: extractGetters(store),
    actions: extractActions(store)
  })
}
```

## 插件中的 $id 使用

插件通过 context 获取 `$id`：

```javascript
pinia.use(({ store }) => {
  console.log(`Plugin processing store: ${store.$id}`)
  
  // 根据 ID 做不同处理
  if (store.$id === 'user') {
    // 用户 Store 特殊处理
    store.isAdmin = computed(() => store.role === 'admin')
  }
})
```

实际应用：持久化插件

```javascript
const persistPlugin = ({ store }) => {
  // 用 $id 作为存储 key
  const storageKey = `pinia_${store.$id}`
  
  // 恢复状态
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 监听变化并保存
  store.$subscribe((mutation, state) => {
    localStorage.setItem(storageKey, JSON.stringify(state))
  })
}
```

## 动态 Store ID

有时需要动态生成 Store ID：

```javascript
// 每个用户有独立的 Store
function useUserStore(userId) {
  return defineStore(`user-${userId}`, {
    state: () => ({
      id: userId,
      profile: null
    }),
    actions: {
      async fetchProfile() {
        this.profile = await api.getUser(userId)
      }
    }
  })()
}

// 使用
const user1Store = useUserStore('user-1')
const user2Store = useUserStore('user-2')

console.log(user1Store.$id)  // 'user-user-1'
console.log(user2Store.$id)  // 'user-user-2'
```

注意：动态 ID 的 Store 会一直存在于 `pinia._s` 中，可能需要手动清理。

## 测试用例

```javascript
describe('$id property', () => {
  test('$id is set correctly', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    expect(store.$id).toBe('test')
  })
  
  test('$id is read-only', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(() => {
      store.$id = 'new-id'
    }).toThrow()
  })
  
  test('$id is not enumerable', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(Object.keys(store)).not.toContain('$id')
    expect(store.$id).toBe('test')  // 但可以直接访问
  })
  
  test('store is registered with $id', () => {
    const pinia = createPinia()
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    useStore(pinia)
    
    expect(pinia._s.has('test')).toBe(true)
  })
})
```

## 本章小结

本章探讨了 `$id` 属性：

- **核心作用**：Store 的唯一标识符
- **实现方式**：只读、不可枚举、不可配置
- **使用场景**：注册表、DevTools、插件、持久化
- **命名规范**：小写描述性，避免冲突
- **唯一性**：每个 ID 对应唯一 Store 定义

下一章实现 `$state` 属性。
