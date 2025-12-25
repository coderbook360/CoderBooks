---
sidebar_position: 20
title: createOptionsStore 函数实现
---

# createOptionsStore 函数实现

上一章我们理解了 Options Store 的设计理念，本章进入实现阶段。`createOptionsStore` 是 Options Store 的核心函数，负责将配置对象转换为可用的 Store 实例。

## 函数签名设计

首先定义 `createOptionsStore` 的函数签名：

```typescript
function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G extends GettersTree<S>,
  A extends ActionsTree
>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
  pinia: Pinia,
  hot?: boolean
): Store<Id, S, G, A>
```

参数解释：

- `id`：Store 的唯一标识符
- `options`：包含 state、getters、actions 的配置对象
- `pinia`：Pinia 实例，用于全局状态管理
- `hot`：是否为热更新模式（开发环境）

## 整体实现框架

让我们先搭建 `createOptionsStore` 的骨架：

```javascript
function createOptionsStore(id, options, pinia, hot) {
  const { state, getters, actions } = options
  
  // 1. 初始化 state
  const initialState = initializeState(id, state, pinia)
  
  // 2. 处理 getters
  const computedGetters = setupGetters(getters, id, pinia)
  
  // 3. 处理 actions
  const boundActions = setupActions(actions)
  
  // 4. 组装 Store
  const store = createStore(id, initialState, computedGetters, boundActions, pinia)
  
  // 5. 注册到 Pinia
  pinia._s.set(id, store)
  
  return store
}
```

现在让我们逐步实现每个部分。

## 第一步：初始化 State

State 初始化的关键是**创建响应式状态并注册到全局状态树**：

```javascript
function initializeState(id, stateFn, pinia) {
  // 获取全局状态树
  const stateTree = pinia.state.value
  
  // 检查是否已存在（SSR 或热更新场景）
  if (id in stateTree) {
    // 已存在，直接复用
    return stateTree[id]
  }
  
  // 调用 state 工厂函数获取初始状态
  const initialState = stateFn ? stateFn() : {}
  
  // 注册到全局状态树
  stateTree[id] = initialState
  
  return initialState
}
```

为什么要注册到全局状态树？

1. **SSR 支持**：服务端渲染时，状态需要序列化传递到客户端
2. **DevTools 支持**：开发工具需要统一管理所有 Store 的状态
3. **状态持久化**：插件可以统一处理状态的存储和恢复

## 第二步：处理 Getters

Getters 需要转换为 `computed` 属性，并正确绑定 `this` 上下文：

```javascript
function setupGetters(getters, id, pinia) {
  if (!getters) return {}
  
  const computedGetters = {}
  
  for (const getterName in getters) {
    const getter = getters[getterName]
    
    // 将每个 getter 转换为 computed
    computedGetters[getterName] = computed(() => {
      // 获取当前 Store 实例
      const store = pinia._s.get(id)
      
      // 调用原始 getter，绑定 this 为 store
      return getter.call(store, store.$state)
    })
  }
  
  return computedGetters
}
```

这里有一个细节：getter 函数接收 `state` 作为第一个参数，同时 `this` 也指向 Store。这是为了兼容两种写法：

```javascript
getters: {
  // 写法一：使用 state 参数
  doubleCount(state) {
    return state.count * 2
  },
  
  // 写法二：使用 this
  tripleCount() {
    return this.count * 3
  }
}
```

## 第三步：处理 Actions

Actions 需要绑定正确的 `this` 上下文，并支持 `$onAction` 订阅：

```javascript
function setupActions(actions, store) {
  if (!actions) return {}
  
  const boundActions = {}
  
  for (const actionName in actions) {
    const action = actions[actionName]
    
    // 包装 action
    boundActions[actionName] = function (...args) {
      // 触发 $onAction 订阅（action 开始前）
      const afterCallbackList = []
      const onErrorCallbackList = []
      
      function after(callback) {
        afterCallbackList.push(callback)
      }
      
      function onError(callback) {
        onErrorCallbackList.push(callback)
      }
      
      // 通知订阅者
      triggerSubscriptions(store._actionSubscribers, {
        name: actionName,
        store,
        args,
        after,
        onError
      })
      
      let result
      try {
        // 调用原始 action，绑定 this 为 store
        result = action.apply(store, args)
      } catch (error) {
        // 同步错误处理
        triggerSubscriptions(onErrorCallbackList, error)
        throw error
      }
      
      // 处理返回值（可能是 Promise）
      if (result instanceof Promise) {
        return result
          .then(value => {
            triggerSubscriptions(afterCallbackList, value)
            return value
          })
          .catch(error => {
            triggerSubscriptions(onErrorCallbackList, error)
            throw error
          })
      }
      
      // 同步 action 完成
      triggerSubscriptions(afterCallbackList, result)
      return result
    }
  }
  
  return boundActions
}
```

这个实现看起来复杂，但核心逻辑是：

1. 在 action 执行前通知订阅者
2. 绑定正确的 `this` 执行原始 action
3. 处理同步和异步的完成/错误情况

## 第四步：组装 Store

现在我们有了 state、getters、actions，需要将它们组装成完整的 Store：

```javascript
function createStore(id, initialState, computedGetters, boundActions, pinia) {
  // 创建响应式 Store 对象
  const store = reactive({
    // Store 标识
    $id: id,
    
    // 内部状态引用
    _p: pinia,
    _s: new Map(),  // 子 Store 缓存
    _actionSubscribers: [],
    _stateSubscribers: [],
  })
  
  // 定义 $state 属性（可读写）
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      // 使用 $patch 确保触发订阅
      store.$patch(($state) => {
        Object.assign($state, newState)
      })
    }
  })
  
  // 展开 state 属性到 store
  const stateRefs = toRefs(pinia.state.value[id])
  for (const key in stateRefs) {
    store[key] = stateRefs[key]
  }
  
  // 添加 getters
  for (const key in computedGetters) {
    store[key] = computedGetters[key]
  }
  
  // 添加 actions
  for (const key in boundActions) {
    store[key] = boundActions[key]
  }
  
  // 添加 Store API
  store.$patch = createPatch(id, pinia, store)
  store.$reset = createReset(id, options.state, pinia)
  store.$subscribe = createSubscribe(store)
  store.$onAction = createOnAction(store)
  store.$dispose = createDispose(id, pinia, store)
  
  return store
}
```

## 完整实现

将上述各部分整合，得到完整的 `createOptionsStore`：

```javascript
import { reactive, computed, toRefs, toRaw } from 'vue'

export function createOptionsStore(id, options, pinia, hot) {
  const { state: stateFn, getters, actions } = options
  
  // 创建 effectScope 隔离副作用
  const scope = effectScope()
  
  let store
  
  scope.run(() => {
    // 初始化 state
    if (!(id in pinia.state.value)) {
      const initialState = stateFn ? stateFn() : {}
      pinia.state.value[id] = initialState
    }
    
    // 创建 state refs
    const localState = toRefs(pinia.state.value[id])
    
    // 处理 getters
    const computedGetters = Object.keys(getters || {}).reduce(
      (computed, name) => {
        computed[name] = markRaw(
          computed(() => {
            const store = pinia._s.get(id)
            return getters[name].call(store, store.$state)
          })
        )
        return computed
      },
      {}
    )
    
    // 组装 store 属性
    const storeProperties = Object.assign(
      localState,
      computedGetters,
      // actions 稍后处理
    )
    
    // 创建 store 实例
    store = reactive(storeProperties)
    
    // 处理 actions（需要 store 引用）
    for (const actionName in actions) {
      const action = actions[actionName]
      store[actionName] = wrapAction(actionName, action, store)
    }
    
    // 添加内部属性
    const setupStore = {
      $id: id,
      $state: computed({
        get: () => pinia.state.value[id],
        set: (newState) => {
          store.$patch(($state) => {
            Object.assign($state, newState)
          })
        }
      }),
      _p: pinia,
      _scope: scope,
      _actionSubscribers: [],
    }
    
    // 合并到 store
    Object.assign(store, setupStore)
    
    // 添加 Store API
    Object.assign(store, {
      $patch: createPatch(pinia, id),
      $reset: createReset(stateFn, pinia, id),
      $subscribe: createSubscribe(store),
      $onAction: createOnAction(store),
      $dispose: createDispose(scope, pinia, id),
    })
  })
  
  // 注册到 Pinia
  pinia._s.set(id, store)
  
  return store
}

// 包装 action
function wrapAction(name, action, store) {
  return function (...args) {
    // 收集订阅回调
    const afterCallbacks = []
    const errorCallbacks = []
    
    function after(cb) {
      afterCallbacks.push(cb)
    }
    
    function onError(cb) {
      errorCallbacks.push(cb)
    }
    
    // 触发 action 订阅
    store._actionSubscribers.forEach((sub) => {
      sub({ name, store, args, after, onError })
    })
    
    let result
    try {
      result = action.apply(store, args)
    } catch (error) {
      errorCallbacks.forEach((cb) => cb(error))
      throw error
    }
    
    if (result instanceof Promise) {
      return result
        .then((value) => {
          afterCallbacks.forEach((cb) => cb(value))
          return value
        })
        .catch((error) => {
          errorCallbacks.forEach((cb) => cb(error))
          throw error
        })
    }
    
    afterCallbacks.forEach((cb) => cb(result))
    return result
  }
}
```

## 关键设计决策

### 为什么使用 effectScope？

`effectScope` 是 Vue 3.2 引入的 API，用于隔离和管理响应式副作用：

```javascript
const scope = effectScope()

scope.run(() => {
  // 这里创建的 computed、watch 都会被 scope 管理
  const doubled = computed(() => count.value * 2)
})

// 一次性清理所有副作用
scope.stop()
```

在 Store 中使用 `effectScope` 可以：

1. **统一管理**：所有 getters（computed）都在同一个 scope 中
2. **优雅销毁**：调用 `$dispose` 时可以一次性清理所有副作用
3. **避免内存泄漏**：确保组件销毁时相关的响应式依赖被清理

### 为什么使用 toRefs？

`toRefs` 将响应式对象的每个属性转换为独立的 ref：

```javascript
const state = reactive({ count: 0, name: 'Alice' })
const refs = toRefs(state)

// refs.count 是一个 ref，但与 state.count 保持同步
refs.count.value++  // state.count 也会变成 1
```

在 Store 中使用 `toRefs` 的原因：

1. **保持响应性**：展开到 store 对象时不丢失响应性
2. **双向同步**：修改 store.count 实际修改的是全局状态树

## 测试验证

让我们编写测试验证实现：

```javascript
import { createPinia, defineStore } from './pinia'
import { createApp, nextTick } from 'vue'

describe('Options Store', () => {
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
  })
  
  test('state initialization', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore(pinia)
    
    expect(store.count).toBe(0)
    expect(store.$state.count).toBe(0)
    expect(pinia.state.value.test.count).toBe(0)
  })
  
  test('getters', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2,
        quadruple() {
          return this.double * 2
        }
      }
    })
    
    const store = useStore(pinia)
    
    expect(store.double).toBe(4)
    expect(store.quadruple).toBe(8)
    
    store.count = 3
    expect(store.double).toBe(6)
    expect(store.quadruple).toBe(12)
  })
  
  test('actions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore(pinia)
    store.increment()
    
    expect(store.count).toBe(1)
  })
  
  test('actions with this context', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      getters: {
        double: (state) => state.count * 2
      },
      actions: {
        incrementByDouble() {
          this.count += this.double
        }
      }
    })
    
    const store = useStore(pinia)
    store.count = 5
    store.incrementByDouble()
    
    expect(store.count).toBe(15)  // 5 + 10
  })
})
```

## 本章小结

本章我们实现了 `createOptionsStore` 函数的核心逻辑：

- **State 初始化**：调用工厂函数，注册到全局状态树
- **Getters 处理**：转换为 computed，绑定正确的 this
- **Actions 处理**：包装函数，支持订阅和错误处理
- **Store 组装**：使用 reactive 和 toRefs 保持响应性

下一章，我们将深入 State 初始化的细节，包括类型推断和边界情况处理。
