---
sidebar_position: 26
title: Options Store 配置选项
---

# Options Store 配置选项

Options Store 除了基本的 state、getters、actions 外，还支持一些配置选项来自定义 Store 的行为。本章探讨这些配置选项的设计与实现。

## DefineStoreOptions 类型

完整的 Options Store 配置类型定义：

```typescript
interface DefineStoreOptions<Id, S, G, A> {
  // 必选：Store 唯一标识
  id: Id
  
  // 可选：状态工厂函数
  state?: () => S
  
  // 可选：计算属性
  getters?: G & ThisType<StateWithGetters<S, G>>
  
  // 可选：方法
  actions?: A & ThisType<StateWithGettersAndActions<S, G, A>>
  
  // 可选：是否开启 SSR 水合
  hydrate?: (store: Store<Id, S, G, A>, initialState: S) => void
}
```

## hydrate 配置

`hydrate` 用于 SSR 场景下自定义状态恢复逻辑：

```javascript
const useStore = defineStore('store', {
  state: () => ({
    // 普通数据
    count: 0,
    // 特殊类型数据（Map、Set、Date 等）
    userMap: new Map(),
    createdAt: new Date()
  }),
  
  hydrate(store, initialState) {
    // 自定义水合逻辑
    // initialState 是 JSON 解析后的原始对象
    
    // 恢复 Map
    store.userMap = new Map(Object.entries(initialState.userMap || {}))
    
    // 恢复 Date
    store.createdAt = new Date(initialState.createdAt)
    
    // 普通数据直接赋值
    store.count = initialState.count
  }
})
```

### 为什么需要 hydrate？

JSON 序列化有局限性：

```javascript
// 服务端状态
const state = {
  count: 1,
  userMap: new Map([['alice', { name: 'Alice' }]]),
  createdAt: new Date('2024-01-01')
}

// JSON.stringify 后
// {"count":1,"userMap":{},"createdAt":"2024-01-01T00:00:00.000Z"}

// JSON.parse 后
// { count: 1, userMap: {}, createdAt: "2024-01-01T00:00:00.000Z" }
// Map 丢失内容！Date 变成字符串！
```

`hydrate` 让开发者自定义恢复逻辑，正确处理特殊类型。

### 实现 hydrate 支持

```javascript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn, hydrate } = options
  
  // 检查是否需要水合
  const initialState = pinia.state.value[id]
  const needsHydration = initialState !== undefined
  
  // 初始化 state
  if (!needsHydration && stateFn) {
    pinia.state.value[id] = stateFn()
  }
  
  // 创建 store...
  const store = /* ... */
  
  // 执行水合
  if (needsHydration) {
    if (hydrate) {
      // 使用自定义水合函数
      hydrate(store, initialState)
    } else {
      // 默认水合：直接赋值
      Object.assign(store.$state, initialState)
    }
  }
  
  return store
}
```

## 运行时配置

`defineStore` 的第三个参数可以传入运行时配置：

```javascript
const useStore = defineStore('store', {
  state: () => ({ count: 0 })
}, {
  // 运行时选项
})
```

目前 Pinia 的运行时选项主要用于 Setup Store，但架构上支持扩展。

## 插件扩展配置

插件可以读取和扩展配置选项：

```javascript
// 定义 Store 时添加自定义选项
const useStore = defineStore('store', {
  state: () => ({ data: null }),
  // 自定义选项
  debounce: {
    fetchData: 300  // fetchData action 防抖 300ms
  },
  actions: {
    async fetchData() {
      this.data = await api.getData()
    }
  }
})

// 插件读取并处理自定义选项
function debouncePlugin({ options, store }) {
  if (options.debounce) {
    for (const actionName in options.debounce) {
      const delay = options.debounce[actionName]
      const originalAction = store[actionName]
      
      // 用防抖版本替换原 action
      store[actionName] = debounce(originalAction, delay)
    }
  }
}
```

### 类型安全的自定义选项

使用 TypeScript 模块扩展定义自定义选项类型：

```typescript
// 扩展 Pinia 类型
declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    // 添加 debounce 选项
    debounce?: Partial<Record<keyof Store, number>>
    
    // 添加 persist 选项
    persist?: boolean | PersistOptions
  }
}

// 现在可以类型安全地使用自定义选项
const useStore = defineStore('store', {
  state: () => ({ count: 0 }),
  debounce: {
    increment: 100  // TypeScript 知道这是有效的选项
  },
  persist: true,
  actions: {
    increment() {
      this.count++
    }
  }
})
```

## 持久化配置示例

一个实用的持久化配置实现：

```javascript
// persist 选项类型
interface PersistOptions {
  enabled: boolean
  key?: string
  storage?: Storage
  paths?: string[]
}

// 持久化插件
function persistPlugin({ options, store }) {
  const persist = options.persist
  if (!persist) return
  
  const {
    enabled = true,
    key = `pinia-${store.$id}`,
    storage = localStorage,
    paths = null
  } = typeof persist === 'object' ? persist : { enabled: persist }
  
  if (!enabled) return
  
  // 恢复状态
  const savedState = storage.getItem(key)
  if (savedState) {
    store.$patch(JSON.parse(savedState))
  }
  
  // 监听变化并保存
  store.$subscribe((mutation, state) => {
    let toSave = state
    
    // 只保存指定路径
    if (paths) {
      toSave = paths.reduce((obj, path) => {
        obj[path] = state[path]
        return obj
      }, {})
    }
    
    storage.setItem(key, JSON.stringify(toSave))
  })
}

// 使用
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    preferences: {}
  }),
  persist: {
    enabled: true,
    storage: localStorage,
    paths: ['token']  // 只持久化 token
  }
})
```

## 配置选项验证

在开发模式下验证配置选项：

```javascript
function validateOptions(options) {
  if (process.env.NODE_ENV !== 'production') {
    // 验证 state 是函数
    if (options.state && typeof options.state !== 'function') {
      console.warn('[Pinia] state should be a function')
    }
    
    // 验证 getters 中没有箭头函数使用 this
    if (options.getters) {
      for (const name in options.getters) {
        const getter = options.getters[name]
        // 箭头函数没有 prototype
        if (!getter.prototype) {
          // 检查源码是否使用了 this
          const source = getter.toString()
          if (source.includes('this.')) {
            console.warn(
              `[Pinia] Getter "${name}" uses \`this\` but is an arrow function. ` +
              `Arrow functions don't have their own \`this\` binding.`
            )
          }
        }
      }
    }
    
    // 验证 actions 中没有箭头函数
    if (options.actions) {
      for (const name in options.actions) {
        const action = options.actions[name]
        if (!action.prototype) {
          console.warn(
            `[Pinia] Action "${name}" is an arrow function. ` +
            `This might cause issues with \`this\` binding.`
          )
        }
      }
    }
  }
}
```

## 配置合并策略

当使用 `defineStore` 的不同重载形式时，需要合并配置：

```javascript
// 形式一：ID + options
defineStore('id', { state: () => ({}) })

// 形式二：options with id
defineStore({ id: 'id', state: () => ({}) })

// 形式三：ID + setup + options
defineStore('id', () => {}, { /* options */ })
```

内部实现统一处理：

```javascript
function defineStore(idOrOptions, setup, setupOptions) {
  let id
  let options
  
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    if (typeof setup === 'function') {
      // Setup Store
      options = setupOptions || {}
    } else {
      // Options Store
      options = setup
    }
  } else {
    // Options with id
    options = idOrOptions
    id = idOrOptions.id
  }
  
  // 现在 id 和 options 已统一
  return createStore(id, options)
}
```

## 测试验证

```javascript
describe('Store Configuration', () => {
  test('hydrate option', () => {
    const pinia = createPinia()
    
    // 模拟 SSR 预注入状态
    pinia.state.value.test = {
      count: 5,
      createdAt: '2024-01-01T00:00:00.000Z'
    }
    
    const useStore = defineStore('test', {
      state: () => ({
        count: 0,
        createdAt: new Date()
      }),
      hydrate(store, initialState) {
        store.count = initialState.count
        store.createdAt = new Date(initialState.createdAt)
      }
    })
    
    const store = useStore(pinia)
    
    expect(store.count).toBe(5)
    expect(store.createdAt).toBeInstanceOf(Date)
    expect(store.createdAt.getFullYear()).toBe(2024)
  })
  
  test('custom options available to plugins', () => {
    const pinia = createPinia()
    const capturedOptions = []
    
    pinia.use(({ options }) => {
      capturedOptions.push(options)
    })
    
    const useStore = defineStore('test', {
      state: () => ({}),
      customOption: 'test-value'
    })
    
    useStore(pinia)
    
    expect(capturedOptions[0].customOption).toBe('test-value')
  })
})
```

## 本章小结

本章探讨了 Options Store 的配置选项：

- **hydrate**：SSR 场景下自定义状态恢复
- **运行时配置**：支持扩展的配置架构
- **插件扩展**：自定义选项和插件配合
- **类型扩展**：TypeScript 模块扩展自定义选项
- **配置验证**：开发模式下的配置检查
- **配置合并**：处理不同 defineStore 重载形式

至此，第四部分 Options Store 实现全部完成。接下来进入第五部分 Setup Store 实现。
