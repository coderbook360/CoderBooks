---
sidebar_position: 31
title: State 自动识别与提取
---

# State 自动识别与提取

Setup Store 的一个关键挑战是从 setup 函数的返回值中自动识别哪些是 state。本章探讨 State 识别的策略和实现细节。

## State 识别规则

在 Setup Store 中，以下内容被识别为 State：

```javascript
defineStore('store', () => {
  // ✅ ref → state
  const count = ref(0)
  
  // ✅ shallowRef → state
  const items = shallowRef([])
  
  // ✅ reactive → state
  const user = reactive({ name: '', age: 0 })
  
  // ✅ shallowReactive → state
  const config = shallowReactive({ theme: 'light' })
  
  // ❌ computed → getter，不是 state
  const double = computed(() => count.value * 2)
  
  // ❌ function → action，不是 state
  function increment() {}
  
  // ❌ 普通值 → 其他，不是 state
  const MAX = 100
  
  return { count, items, user, config, double, increment, MAX }
})
```

## 识别算法实现

```javascript
import { isRef, isReactive } from 'vue'

function isState(value) {
  // ref（包括 shallowRef）但不是 computed
  if (isRef(value)) {
    // computed 有 effect 属性
    return !('effect' in value)
  }
  
  // reactive（包括 shallowReactive）
  if (isReactive(value)) {
    return true
  }
  
  return false
}

function extractState(setupResult) {
  const stateKeys = []
  
  for (const key in setupResult) {
    if (isState(setupResult[key])) {
      stateKeys.push(key)
    }
  }
  
  return stateKeys
}
```

## 构建 $state 对象

识别出 state 后，需要构建 `$state` 对象并注册到全局状态树：

```javascript
function buildStateObject(setupResult, stateKeys) {
  const stateObj = {}
  
  for (const key of stateKeys) {
    const value = setupResult[key]
    
    if (isRef(value)) {
      // ref 需要解包
      Object.defineProperty(stateObj, key, {
        get: () => value.value,
        set: (v) => { value.value = v },
        enumerable: true
      })
    } else {
      // reactive 直接引用
      stateObj[key] = value
    }
  }
  
  return stateObj
}
```

## 与全局状态树同步

State 需要同步到 `pinia.state.value[id]`：

```javascript
function syncWithGlobalState(pinia, id, setupResult, stateKeys) {
  // 初始化全局 state
  if (!(id in pinia.state.value)) {
    pinia.state.value[id] = {}
  }
  
  const globalState = pinia.state.value[id]
  
  for (const key of stateKeys) {
    const value = setupResult[key]
    
    if (isRef(value)) {
      // 双向同步：store.count ↔ pinia.state.value.store.count
      Object.defineProperty(globalState, key, {
        get: () => value.value,
        set: (v) => { value.value = v },
        enumerable: true
      })
    } else {
      // reactive 直接赋值
      globalState[key] = value
    }
  }
}
```

### 双向同步验证

```javascript
const useStore = defineStore('test', () => {
  const count = ref(0)
  return { count }
})

const store = useStore()

// 修改 store
store.count = 5
console.log(pinia.state.value.test.count)  // 5

// 修改全局 state
pinia.state.value.test.count = 10
console.log(store.count)  // 10
```

## SSR 状态恢复

在 SSR 场景下，全局 state 可能已预填充：

```javascript
// 服务端渲染后，客户端接收到状态
pinia.state.value = {
  test: { count: 42 }
}

// 创建 Store 时需要恢复状态
const useStore = defineStore('test', () => {
  const count = ref(0)  // 默认 0，但应该是 42
  return { count }
})
```

实现状态恢复：

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 检查是否有预存状态
  const initialState = pinia.state.value[id]
  const hasInitialState = initialState !== undefined
  
  // 执行 setup
  const setupResult = scope.run(() => setup())
  
  // 如果有预存状态，恢复它
  if (hasInitialState) {
    for (const key in initialState) {
      const value = setupResult[key]
      if (isRef(value)) {
        value.value = initialState[key]
      } else if (isReactive(value)) {
        Object.assign(value, initialState[key])
      }
    }
  }
  
  // 继续正常流程...
}
```

## 嵌套 State 处理

State 可能有嵌套结构：

```javascript
defineStore('store', () => {
  const user = reactive({
    profile: {
      name: '',
      avatar: ''
    },
    settings: reactive({
      theme: 'light',
      notifications: true
    })
  })
  
  return { user }
})
```

嵌套 reactive 的特点：

- 外层 `user` 是 reactive
- `user.settings` 也是 reactive（嵌套）
- 修改 `user.settings.theme` 是响应式的

处理时只需识别顶层：

```javascript
// 只有 'user' 被识别为 state
// user.settings 是 user 的一部分，不单独处理
```

## 特殊情况

### ref 包含对象

```javascript
const items = ref([{ id: 1, name: 'Item 1' }])
```

这是 state，整个 items 是一个 ref。修改 `items.value` 或 `items.value.push()` 都是响应式的。

### readonly 包装

```javascript
const _count = ref(0)
const count = readonly(_count)

return { count }  // count 是只读的
```

`readonly` 包装的值不应该被修改，但仍被识别为 state。

### customRef

```javascript
const count = customRef((track, trigger) => ({
  get() {
    track()
    return value
  },
  set(newValue) {
    value = newValue
    trigger()
  }
}))
```

`customRef` 返回的是 ref，被识别为 state。

## 测试用例

```javascript
describe('State Identification', () => {
  test('ref is state', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore()
    expect('count' in store.$state).toBe(true)
  })
  
  test('reactive is state', () => {
    const useStore = defineStore('test', () => {
      const user = reactive({ name: '' })
      return { user }
    })
    
    const store = useStore()
    expect('user' in store.$state).toBe(true)
  })
  
  test('computed is NOT state', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      return { count, double }
    })
    
    const store = useStore()
    expect('count' in store.$state).toBe(true)
    expect('double' in store.$state).toBe(false)
  })
  
  test('function is NOT state', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      function increment() {
        count.value++
      }
      return { count, increment }
    })
    
    const store = useStore()
    expect('increment' in store.$state).toBe(false)
  })
  
  test('SSR hydration', () => {
    const pinia = createPinia()
    pinia.state.value.test = { count: 42 }
    
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore(pinia)
    expect(store.count).toBe(42)  // 恢复了服务端状态
  })
})
```

## 本章小结

本章探讨了 State 的自动识别与提取：

- **识别规则**：ref/reactive 是 state，computed/function 不是
- **构建 $state**：通过 getter/setter 代理实现双向同步
- **全局同步**：与 pinia.state.value[id] 保持同步
- **SSR 恢复**：检测预存状态并恢复到 ref/reactive
- **特殊情况**：嵌套、readonly、customRef

下一章深入 ref 与 reactive 的识别差异。
