---
sidebar_position: 32
title: ref vs reactive 状态识别
---

# ref vs reactive 状态识别

Vue 3 提供了 `ref` 和 `reactive` 两种创建响应式数据的方式。在 Setup Store 中，两者都被识别为 State，但处理方式有差异。本章深入分析这种差异。

## ref 与 reactive 的本质区别

```javascript
// ref：值的容器
const count = ref(0)
console.log(count)        // { value: 0 }
console.log(count.value)  // 0

// reactive：对象的代理
const user = reactive({ name: 'Vue' })
console.log(user)       // Proxy { name: 'Vue' }
console.log(user.name)  // 'Vue'
```

关键差异：

| 特性 | ref | reactive |
|------|-----|----------|
| 数据类型 | 任意 | 仅对象/数组 |
| 访问方式 | `.value` | 直接访问 |
| 整体替换 | ✅ 可以 | ❌ 不可以 |
| 模板自动解包 | ✅ | ✅ |
| 响应式追踪 | 包装器级别 | 属性级别 |

## 为什么 Store 需要区分？

考虑以下场景：

```javascript
// 场景 1：ref
const count = ref(0)
store.count = 5  // 期望：count.value = 5

// 场景 2：reactive
const user = reactive({ name: '' })
store.user.name = 'Vue'  // 期望：user.name = 'Vue'
```

Store 需要代理访问，但两种类型的代理逻辑不同：

```javascript
// ref 需要代理 .value
Object.defineProperty(store, 'count', {
  get: () => count.value,
  set: (v) => { count.value = v }
})

// reactive 直接返回原对象
store.user = user  // 不需要特殊处理
```

## 识别算法

```javascript
import { isRef, isReactive, isProxy } from 'vue'

function identifyStateType(value) {
  // computed 是特殊的 ref，但不是 state
  if (isRef(value) && 'effect' in value) {
    return 'computed'
  }
  
  if (isRef(value)) {
    return 'ref'
  }
  
  if (isReactive(value)) {
    return 'reactive'
  }
  
  if (typeof value === 'function') {
    return 'action'
  }
  
  return 'other'
}

// 使用示例
const setupResult = {
  count: ref(0),
  user: reactive({ name: '' }),
  double: computed(() => 0),
  increment: () => {}
}

Object.entries(setupResult).forEach(([key, value]) => {
  console.log(`${key}: ${identifyStateType(value)}`)
})
// count: ref
// user: reactive
// double: computed
// increment: action
```

## Store 代理实现

基于识别结果，为 Store 创建正确的访问代理：

```javascript
function setupStoreProxy(store, setupResult) {
  for (const key in setupResult) {
    const value = setupResult[key]
    const type = identifyStateType(value)
    
    switch (type) {
      case 'ref':
        setupRefProxy(store, key, value)
        break
      case 'reactive':
        setupReactiveProxy(store, key, value)
        break
      case 'computed':
        setupComputedProxy(store, key, value)
        break
      case 'action':
        setupActionProxy(store, key, value)
        break
    }
  }
}

function setupRefProxy(store, key, refValue) {
  Object.defineProperty(store, key, {
    get: () => refValue.value,
    set: (newValue) => {
      refValue.value = newValue
    },
    enumerable: true,
    configurable: true
  })
}

function setupReactiveProxy(store, key, reactiveValue) {
  // reactive 不需要解包，直接赋值
  store[key] = reactiveValue
}
```

## shallowRef 与 shallowReactive

浅层响应式也需要正确识别：

```javascript
import { shallowRef, shallowReactive, isRef, isReactive } from 'vue'

const shallow1 = shallowRef({ deep: { value: 1 } })
const shallow2 = shallowReactive({ deep: { value: 1 } })

// shallowRef 仍然是 ref
console.log(isRef(shallow1))  // true

// shallowReactive 仍然是 reactive
console.log(isReactive(shallow2))  // true
```

因此，识别算法无需修改，`isRef` 和 `isReactive` 能正确处理浅层版本。

## 响应式转换情况

有些值会被 Vue 自动转换：

```javascript
const user = reactive({
  profile: { name: '' }  // 嵌套对象自动转为 reactive
})

const items = ref([1, 2, 3])  // 数组被包装在 ref 中
```

Store 只需关心顶层类型，嵌套部分由 Vue 自动处理。

## 边界情况处理

### toRef 与 toRefs

```javascript
const state = reactive({ count: 0, name: '' })

// toRef 创建的 ref 连接原对象
const countRef = toRef(state, 'count')

// toRefs 转换整个对象
const { count, name } = toRefs(state)
```

这些都是 ref，会被正确识别：

```javascript
isRef(toRef(state, 'count'))  // true
isRef(toRefs(state).count)    // true
```

### readonly 包装

```javascript
const _state = reactive({ count: 0 })
const state = readonly(_state)
```

`readonly` 返回的是原对象的只读代理：

```javascript
isReactive(readonly(reactive({})))  // false，因为是只读代理
isReadonly(readonly(reactive({})))  // true
isProxy(readonly(reactive({})))     // true
```

需要特殊处理：

```javascript
function identifyStateType(value) {
  if (isRef(value) && !('effect' in value)) {
    return 'ref'
  }
  
  if (isReactive(value)) {
    return 'reactive'
  }
  
  // readonly 包装的也是 state
  if (isReadonly(value) && isProxy(value)) {
    return 'readonly'
  }
  
  if (typeof value === 'function') {
    return 'action'
  }
  
  return 'other'
}
```

### markRaw

被 `markRaw` 标记的对象不应该成为 state：

```javascript
const rawObj = markRaw({ count: 0 })

defineStore('store', () => {
  const config = rawObj  // 非响应式，不是 state
  return { config }
})
```

检测方式：

```javascript
import { isProxy } from 'vue'

function isState(value) {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  
  // markRaw 的对象不是 Proxy
  if (!isProxy(value) && !isRef(value)) {
    return false
  }
  
  // ... 其他判断
}
```

## 完整实现

```javascript
import {
  isRef,
  isReactive,
  isReadonly,
  isProxy
} from 'vue'

function classifySetupResult(setupResult) {
  const state = {}
  const getters = {}
  const actions = {}
  const others = {}
  
  for (const key in setupResult) {
    const value = setupResult[key]
    
    // 函数 → action
    if (typeof value === 'function') {
      actions[key] = value
      continue
    }
    
    // computed → getter
    if (isRef(value) && 'effect' in value) {
      getters[key] = value
      continue
    }
    
    // ref → state
    if (isRef(value)) {
      state[key] = { type: 'ref', value }
      continue
    }
    
    // reactive → state
    if (isReactive(value)) {
      state[key] = { type: 'reactive', value }
      continue
    }
    
    // readonly reactive → state (只读)
    if (isReadonly(value) && isProxy(value)) {
      state[key] = { type: 'readonly', value }
      continue
    }
    
    // 其他（普通值、markRaw 等）
    others[key] = value
  }
  
  return { state, getters, actions, others }
}
```

## 实际应用示例

```javascript
const useUserStore = defineStore('user', () => {
  // ref - 简单值
  const id = ref(null)
  const isLoading = ref(false)
  
  // reactive - 复杂对象
  const profile = reactive({
    name: '',
    email: '',
    avatar: ''
  })
  
  // shallowRef - 大数据，避免深层响应式
  const permissions = shallowRef([])
  
  // computed - getter
  const isLoggedIn = computed(() => id.value !== null)
  const displayName = computed(() => profile.name || 'Guest')
  
  // function - action
  async function login(credentials) {
    isLoading.value = true
    try {
      const user = await api.login(credentials)
      id.value = user.id
      Object.assign(profile, user.profile)
      permissions.value = user.permissions
    } finally {
      isLoading.value = false
    }
  }
  
  function logout() {
    id.value = null
    profile.name = ''
    profile.email = ''
    profile.avatar = ''
    permissions.value = []
  }
  
  return {
    // state
    id, isLoading, profile, permissions,
    // getters
    isLoggedIn, displayName,
    // actions
    login, logout
  }
})

// 分类结果：
// state: { id, isLoading, profile, permissions }
// getters: { isLoggedIn, displayName }
// actions: { login, logout }
```

## 本章小结

本章深入分析了 ref 与 reactive 的识别：

- **本质差异**：ref 是值容器需要 `.value`，reactive 是对象代理
- **代理策略**：ref 需要 getter/setter 解包，reactive 直接引用
- **浅层响应式**：shallowRef/shallowReactive 无需特殊处理
- **边界情况**：toRef、toRefs、readonly、markRaw
- **完整分类**：state、getters、actions、others

下一章探讨 computed 与 Getters 的对应关系。
