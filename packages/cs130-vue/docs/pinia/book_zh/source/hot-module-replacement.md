# 热模块替换

Pinia 支持 HMR（Hot Module Replacement），允许修改 Store 后无需刷新页面。这一章分析其实现。

## HMR 的挑战

Store 热更新需要解决：

- 保留现有状态
- 更新 getters 和 actions
- 保持组件绑定
- 处理依赖关系

## 基本用法

```typescript
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({ name: 'John' }),
  getters: {
    upperName: (state) => state.name.toUpperCase()
  },
  actions: {
    setName(name: string) {
      this.name = name
    }
  }
})

// 启用 HMR
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
```

## acceptHMRUpdate 实现

```typescript
export function acceptHMRUpdate(
  initialUseStore: StoreDefinition,
  hot: any
) {
  return (newModule: any) => {
    // 获取新的 Store 定义
    const newUseStore = getNewStoreFromModule(newModule, initialUseStore.$id)
    
    if (!newUseStore) return
    
    // 获取 Pinia 实例
    const pinia = initialUseStore._pinia
    if (!pinia) return
    
    // 获取现有 Store 实例
    const existingStore = pinia._s.get(initialUseStore.$id)
    if (!existingStore) return
    
    // 热替换 Store
    pinia._s.set(
      initialUseStore.$id,
      createHotStore(existingStore, newUseStore, pinia)
    )
  }
}

function getNewStoreFromModule(module: any, id: string) {
  // 在模块中查找对应的 Store 定义
  for (const key in module) {
    const exported = module[key]
    if (exported?.$id === id) {
      return exported
    }
  }
  return null
}
```

## 热替换核心逻辑

```typescript
function createHotStore(
  existingStore: Store,
  newUseStore: StoreDefinition,
  pinia: Pinia
) {
  // 保存当前状态
  const currentState = JSON.parse(JSON.stringify(existingStore.$state))
  
  // 销毁旧 Store 的订阅
  existingStore.$dispose()
  
  // 创建新 Store
  const newStore = newUseStore(pinia)
  
  // 恢复状态
  newStore.$patch(currentState)
  
  return newStore
}
```

## 保持状态不变

HMR 的关键是保留状态：

```typescript
// 修改前
const store = useUserStore()
store.name = 'Modified Name'

// 修改 Store 代码后，name 保持 'Modified Name'
```

实现：

```typescript
function hotReplace(oldStore: Store, newStore: Store) {
  // 遍历旧状态
  for (const key in oldStore.$state) {
    if (key in newStore.$state) {
      // 保留旧值
      newStore.$state[key] = oldStore.$state[key]
    }
  }
}
```

## 更新 Getters

Getters 自动使用新定义：

```typescript
// 旧定义
getters: {
  formatted: (state) => `Name: ${state.name}`
}

// 新定义
getters: {
  formatted: (state) => `User: ${state.name.toUpperCase()}`
}

// HMR 后自动使用新的 getter 实现
```

因为 getter 是 computed，基于新的函数重新创建。

## 更新 Actions

Actions 同样自动更新：

```typescript
// 旧定义
actions: {
  greet() {
    console.log('Hello')
  }
}

// 新定义
actions: {
  greet() {
    console.log('Hello, ' + this.name)
  }
}

// 调用 store.greet() 使用新实现
```

## 处理新增/删除属性

```typescript
function mergeStates(oldState: any, newState: any) {
  const result: any = {}
  
  // 保留共有属性的旧值
  for (const key in newState) {
    if (key in oldState) {
      result[key] = oldState[key]
    } else {
      // 新属性使用新值
      result[key] = newState[key]
    }
  }
  
  // 删除的属性不会出现在 result 中
  
  return result
}
```

## Options Store 的 HMR

```typescript
// options-store.ts
export const useOptionsStore = defineStore('options', {
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

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useOptionsStore, import.meta.hot))
}
```

## Setup Store 的 HMR

```typescript
// setup-store.ts
export const useSetupStore = defineStore('setup', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  function increment() {
    count.value++
  }
  
  return { count, double, increment }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSetupStore, import.meta.hot))
}
```

## 保持订阅

HMR 后需要重新建立订阅：

```typescript
function hotReplace(oldStore: Store, newStore: Store) {
  // 保存旧的订阅回调
  const subscribers = oldStore._subscribers
  const actionSubscribers = oldStore._actionSubscribers
  
  // 在新 Store 上重新注册
  subscribers.forEach(callback => {
    newStore.$subscribe(callback)
  })
  
  actionSubscribers.forEach(callback => {
    newStore.$onAction(callback)
  })
}
```

实际上 Pinia 使用更复杂的机制确保订阅延续。

## 组件绑定

组件自动使用更新后的 Store：

```typescript
// 组件中
setup() {
  const store = useUserStore()
  // HMR 后，store 引用的对象被更新
  // 响应式绑定自动生效
}
```

因为 Store 实例被替换到同一个 Map 位置，组件通过 useStore 获取的是新实例。

## Vite 配置

Vite 项目中 HMR 默认可用：

```typescript
// vite.config.ts
export default {
  // 无需特殊配置
}

// Store 文件中
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStore, import.meta.hot))
}
```

## Webpack 配置

Webpack 项目：

```typescript
// Store 文件中
if (module.hot) {
  module.hot.accept(acceptHMRUpdate(useStore, module.hot))
}
```

## 条件 HMR

开发环境才需要 HMR：

```typescript
if (__DEV__ && import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStore, import.meta.hot))
}
```

生产构建时这段代码会被移除。

## 多 Store 文件

每个 Store 文件都需要添加 HMR 代码：

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', { /* ... */ })

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}

// stores/cart.ts
export const useCartStore = defineStore('cart', { /* ... */ })

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCartStore, import.meta.hot))
}
```

## 同一文件多个 Store

```typescript
// stores/index.ts
export const useUserStore = defineStore('user', { /* ... */ })
export const useCartStore = defineStore('cart', { /* ... */ })

if (import.meta.hot) {
  import.meta.hot.accept((module) => {
    acceptHMRUpdate(useUserStore, import.meta.hot)(module)
    acceptHMRUpdate(useCartStore, import.meta.hot)(module)
  })
}
```

## 调试 HMR

```typescript
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
  
  // 调试日志
  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('Store about to update')
  })
  
  import.meta.hot.on('vite:afterUpdate', () => {
    console.log('Store updated')
  })
}
```

## HMR 失败处理

某些修改可能导致 HMR 失败：

```typescript
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
  
  // 处理失败
  import.meta.hot.dispose(() => {
    console.log('Store disposed, might need full reload')
  })
}
```

## 限制

HMR 不能处理所有情况：

- Store ID 改变需要刷新
- 初始状态结构大幅改变可能有问题
- 某些复杂的响应式结构可能不更新

遇到问题时手动刷新页面。

## 完整模板

```typescript
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useExampleStore = defineStore('example', {
  state: () => ({
    // ...
  }),
  getters: {
    // ...
  },
  actions: {
    // ...
  }
})

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useExampleStore, import.meta.hot))
}
```

每个 Store 文件都使用这个模板。

下一章我们将分析 SSR 支持的实现。
