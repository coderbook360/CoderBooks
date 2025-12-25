---
sidebar_position: 28
title: createSetupStore 函数实现
---

# createSetupStore 函数实现

本章实现 Setup Store 的核心函数 `createSetupStore`，它负责执行 setup 函数、分析返回值、构建完整的 Store 实例。

## 函数签名

```typescript
function createSetupStore<Id extends string, SS>(
  id: Id,
  setup: () => SS,
  options: DefineSetupStoreOptions<Id, SS>,
  pinia: Pinia,
  hot?: boolean
): Store<Id, SS>
```

参数说明：

- `id`：Store 唯一标识
- `setup`：用户定义的 setup 函数
- `options`：额外配置（如 actions、hydrate 等）
- `pinia`：Pinia 实例
- `hot`：是否热更新模式

## 整体实现框架

```javascript
function createSetupStore(id, setup, options, pinia, hot) {
  // 1. 创建 effectScope
  let scope
  
  // 2. 初始化 state（用于 $state 和 DevTools）
  const initialState = pinia.state.value[id]
  
  // 3. 准备 Store 基础属性
  const store = reactive({
    _p: pinia,
    $id: id,
    _scope: null,
    _actionSubscribers: []
  })
  
  // 4. 执行 setup 并处理返回值
  scope = effectScope()
  const setupResult = scope.run(() => setup())
  
  // 5. 处理 setup 返回值
  processSetupResult(store, setupResult, pinia, id)
  
  // 6. 添加 Store API
  addStoreAPI(store, pinia, id, options)
  
  // 7. 注册到 Pinia
  store._scope = scope
  pinia._s.set(id, store)
  
  return store
}
```

## 详细实现

### Step 1: 创建 effectScope

```javascript
const scope = effectScope(true)  // true 表示 detached，独立于组件

// effectScope 的作用：
// 1. 收集 setup 中创建的所有响应式副作用（computed、watch 等）
// 2. 统一管理，方便 $dispose 时一次性清理
```

### Step 2: 执行 Setup 函数

```javascript
let setupResult

const setupContext = {
  // 可以传入额外上下文，但 Pinia 通常不需要
}

scope.run(() => {
  // 在 scope 内执行 setup
  // 这样 setup 中的 computed、watch 都会被 scope 收集
  setupResult = setup()
})

// 验证返回值
if (!setupResult || typeof setupResult !== 'object') {
  throw new Error(
    `[Pinia] Setup function must return an object, got ${typeof setupResult}`
  )
}
```

### Step 3: 分析返回值类型

```javascript
function processSetupResult(store, setupResult, pinia, id) {
  // 用于收集 state
  const stateKeys = []
  
  for (const key in setupResult) {
    const value = setupResult[key]
    
    // 判断类型
    if (isRef(value) || isReactive(value)) {
      // State
      if (!isComputed(value)) {
        stateKeys.push(key)
        // 如果是 ref，需要特殊处理
        if (isRef(value)) {
          // 保持 ref 的响应性
          store[key] = value
        } else {
          // reactive 对象直接赋值
          store[key] = value
        }
      } else {
        // Computed (Getter)
        store[key] = value
      }
    } else if (typeof value === 'function') {
      // Action
      store[key] = wrapAction(key, value, store)
    } else {
      // 其他值直接赋值
      store[key] = value
    }
  }
  
  // 构建 state 对象并注册
  if (!pinia.state.value[id]) {
    const state = {}
    for (const key of stateKeys) {
      const value = setupResult[key]
      state[key] = isRef(value) ? value.value : value
    }
    pinia.state.value[id] = state
  }
}
```

### Step 4: 同步 State 到全局状态树

Setup Store 的 state 需要与全局状态树保持同步：

```javascript
function syncStateToGlobal(store, setupResult, pinia, id) {
  const stateRef = pinia.state.value[id] || (pinia.state.value[id] = {})
  
  for (const key in setupResult) {
    const value = setupResult[key]
    
    if (isRef(value) && !isComputed(value)) {
      // 对于 ref，使用 computed 实现双向同步
      Object.defineProperty(stateRef, key, {
        get: () => value.value,
        set: (newValue) => { value.value = newValue },
        enumerable: true
      })
    } else if (isReactive(value) && !isComputed(value)) {
      // 对于 reactive，直接引用
      stateRef[key] = value
    }
  }
}
```

### Step 5: 添加 Store API

```javascript
function addStoreAPI(store, pinia, id, options) {
  // $state 属性
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      store.$patch(($state) => {
        Object.assign($state, newState)
      })
    }
  })
  
  // $patch
  store.$patch = createPatch(pinia, id)
  
  // $reset - Setup Store 需要用户自己实现
  store.$reset = () => {
    if (options.$reset) {
      options.$reset.call(store)
    } else {
      console.warn(
        `[Pinia] Store "${id}" doesn't have a $reset method. ` +
        `Please provide one in the setup function.`
      )
    }
  }
  
  // $subscribe
  store.$subscribe = createSubscribe(store)
  
  // $onAction
  store.$onAction = createOnAction(store)
  
  // $dispose
  store.$dispose = () => {
    scope.stop()
    store._actionSubscribers = []
    pinia._s.delete(id)
  }
}
```

## 完整实现

```javascript
import { 
  reactive, 
  effectScope, 
  isRef, 
  isReactive, 
  computed,
  toRaw 
} from 'vue'

export function createSetupStore(id, setup, options = {}, pinia, hot) {
  // 创建 scope
  const scope = effectScope(true)
  
  // 检查已有状态（SSR hydration）
  const hasInitialState = id in pinia.state.value
  
  // Store 基础属性
  const actionSubscribers = []
  
  // 创建 store
  const store = reactive({})
  
  // 内部属性
  Object.defineProperties(store, {
    _p: { value: pinia },
    $id: { value: id },
    _scope: { value: scope, writable: true },
    _actionSubscribers: { value: actionSubscribers }
  })
  
  // 执行 setup
  let setupResult
  scope.run(() => {
    setupResult = setup()
  })
  
  // 处理返回值
  const stateKeys = []
  
  for (const key in setupResult) {
    const value = setupResult[key]
    
    // 跳过内部属性
    if (key.startsWith('$') || key.startsWith('_')) {
      store[key] = value
      continue
    }
    
    if (isRef(value)) {
      if (isComputed(value)) {
        // Computed ref → getter
        store[key] = value
      } else {
        // Plain ref → state
        stateKeys.push(key)
        store[key] = value
      }
    } else if (isReactive(value)) {
      // Reactive → state
      stateKeys.push(key)
      store[key] = value
    } else if (typeof value === 'function') {
      // Function → action
      store[key] = wrapAction(key, value, store)
    } else {
      // Other → direct property
      store[key] = value
    }
  }
  
  // 初始化/同步全局 state
  if (!hasInitialState) {
    pinia.state.value[id] = {}
  }
  
  // 同步到全局 state
  for (const key of stateKeys) {
    const value = setupResult[key]
    if (isRef(value)) {
      Object.defineProperty(pinia.state.value[id], key, {
        get: () => value.value,
        set: (v) => { value.value = v },
        enumerable: true
      })
    } else {
      pinia.state.value[id][key] = value
    }
  }
  
  // 添加 $state
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      store.$patch(($state) => {
        Object.assign($state, newState)
      })
    }
  })
  
  // 添加其他 API
  store.$patch = createPatch(pinia, id, store)
  store.$subscribe = createSubscribe(store)
  store.$onAction = createOnAction(store)
  store.$dispose = createDispose(scope, pinia, id)
  
  // $reset 特殊处理
  if (options.$reset) {
    store.$reset = options.$reset.bind(store)
  } else {
    store.$reset = () => {
      console.warn(`[Pinia] Store "${id}" doesn't implement $reset`)
    }
  }
  
  // 注册到 pinia
  pinia._s.set(id, store)
  
  return store
}

// 判断是否为 computed
function isComputed(value) {
  return isRef(value) && 'effect' in value
}

// 包装 action
function wrapAction(name, action, store) {
  return function (...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    store._actionSubscribers.forEach((sub) => {
      sub({
        name,
        store,
        args,
        after: (cb) => afterCallbacks.push(cb),
        onError: (cb) => errorCallbacks.push(cb)
      })
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

## 测试验证

```javascript
describe('createSetupStore', () => {
  test('basic setup store', () => {
    const pinia = createPinia()
    
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      
      function increment() {
        count.value++
      }
      
      return { count, double, increment }
    })
    
    const store = useStore(pinia)
    
    expect(store.count).toBe(0)
    expect(store.double).toBe(0)
    
    store.increment()
    expect(store.count).toBe(1)
    expect(store.double).toBe(2)
  })
  
  test('reactive state', () => {
    const pinia = createPinia()
    
    const useStore = defineStore('test', () => {
      const user = reactive({ name: '', age: 0 })
      return { user }
    })
    
    const store = useStore(pinia)
    
    store.user.name = 'Alice'
    expect(store.user.name).toBe('Alice')
    expect(pinia.state.value.test.user.name).toBe('Alice')
  })
  
  test('state syncs with global', () => {
    const pinia = createPinia()
    
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore(pinia)
    
    // 修改 store
    store.count = 5
    expect(pinia.state.value.test.count).toBe(5)
    
    // 修改全局 state
    pinia.state.value.test.count = 10
    expect(store.count).toBe(10)
  })
})
```

## 本章小结

本章实现了 `createSetupStore` 的核心逻辑：

- **effectScope**：隔离和管理响应式副作用
- **Setup 执行**：在 scope 内运行用户的 setup 函数
- **返回值分析**：识别 ref/reactive/computed/function
- **State 同步**：与全局状态树保持双向同步
- **API 添加**：$state、$patch、$subscribe 等

下一章深入 setup 函数的执行细节和返回值处理。
