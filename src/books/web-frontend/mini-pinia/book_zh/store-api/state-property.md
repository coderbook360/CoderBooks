---
sidebar_position: 35
title: $state 属性实现
---

# $state 属性实现

`$state` 是访问 Store 原始状态的入口，用于整体替换或批量读取状态。本章深入实现 `$state` 属性。

## $state 的用途

```javascript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, name: 'Counter' })
})

const store = useCounterStore()

// 读取整个 state
console.log(store.$state)  // { count: 0, name: 'Counter' }

// 整体替换 state
store.$state = { count: 10, name: 'New Counter' }

// 与直接修改的区别
store.count = 5           // 修改单个属性
store.$state.count = 5    // 也可以这样
store.$state = { ... }    // 整体替换
```

## 基本实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const store = reactive({})
  
  // 初始化全局 state
  if (!(id in pinia.state.value)) {
    pinia.state.value[id] = {}
  }
  
  // 定义 $state 访问器
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      $patch(($state) => {
        Object.assign($state, newState)
      })
    },
    enumerable: false
  })
  
  // ... 其他逻辑
  
  return store
}
```

关键点：
- **getter**：返回 `pinia.state.value[id]`
- **setter**：通过 `$patch` 更新，确保触发订阅
- **enumerable: false**：遍历时不显示

## $state 与 pinia.state 的关系

```javascript
const pinia = createPinia()
const store = useCounterStore(pinia)

// $state 指向全局 state 中的对应项
console.log(store.$state === pinia.state.value.counter)  // true

// 修改任一方，另一方同步更新
store.$state.count = 10
console.log(pinia.state.value.counter.count)  // 10

pinia.state.value.counter.count = 20
console.log(store.$state.count)  // 20
```

这种设计支持：
- SSR 状态注入
- 热更新状态保持
- DevTools 状态查看和修改

## Options Store 的 $state

对于 Options Store，`$state` 包含 `state()` 返回的所有属性：

```javascript
defineStore('user', {
  state: () => ({
    name: '',
    age: 0,
    profile: {
      avatar: '',
      bio: ''
    }
  })
})

// $state 的结构
store.$state = {
  name: '',
  age: 0,
  profile: {
    avatar: '',
    bio: ''
  }
}
```

## Setup Store 的 $state

对于 Setup Store，`$state` 包含所有被识别为 state 的值：

```javascript
defineStore('user', () => {
  const name = ref('')
  const age = ref(0)
  const profile = reactive({ avatar: '', bio: '' })
  const fullInfo = computed(() => `${name.value}, ${age.value}`)
  
  function updateName(n) { name.value = n }
  
  return { name, age, profile, fullInfo, updateName }
})

// $state 只包含 ref 和 reactive，不包含 computed 和 function
store.$state = {
  name: '',
  age: 0,
  profile: { avatar: '', bio: '' }
}
```

## 整体替换的实现

设置 `$state` 时使用 `$patch`：

```javascript
Object.defineProperty(store, '$state', {
  get: () => pinia.state.value[id],
  set: (newState) => {
    // 使用 $patch 确保触发订阅
    $patch(($state) => {
      // 清除旧属性（可选）
      // Object.keys($state).forEach(key => delete $state[key])
      
      // 合并新状态
      Object.assign($state, newState)
    })
  }
})
```

为什么用 `$patch` 而不是直接赋值？

```javascript
// ❌ 直接替换会断开响应式
pinia.state.value[id] = newState  // 新对象，旧的响应式连接断开

// ✅ 使用 $patch 保持响应式
$patch(($state) => {
  Object.assign($state, newState)  // 修改现有对象
})
```

## $state 的响应式特性

`$state` 是响应式的，可以用于 watch：

```javascript
import { watch } from 'vue'

const store = useCounterStore()

// 监听整个 $state
watch(
  () => store.$state,
  (newState) => {
    console.log('State changed:', newState)
  },
  { deep: true }
)

// 监听特定属性
watch(
  () => store.$state.count,
  (newCount) => {
    console.log('Count changed:', newCount)
  }
)
```

## $state 在序列化中的应用

`$state` 便于状态的序列化和恢复：

```javascript
// 序列化
const savedState = JSON.stringify(store.$state)
localStorage.setItem('counter', savedState)

// 恢复
const loaded = localStorage.getItem('counter')
if (loaded) {
  store.$state = JSON.parse(loaded)
}
```

注意事项：
- 确保 state 中没有不可序列化的值（如函数、Symbol）
- 嵌套的 reactive 对象会被正确处理

## 部分更新 vs 完全替换

```javascript
const store = useUserStore()

// 部分更新（保留其他属性）
store.$patch({ name: 'New Name' })

// 完全替换（可能丢失属性）
store.$state = { name: 'New Name' }
// ⚠️ 如果原来有 age、email 等属性，这样会丢失

// 正确的完全替换
store.$state = {
  name: 'New Name',
  age: 0,      // 需要包含所有属性
  email: ''
}
```

## ref 解包问题

在 Setup Store 中，ref 需要正确解包：

```javascript
defineStore('test', () => {
  const count = ref(0)
  return { count }
})

// $state 中 count 应该是解包后的值
console.log(store.$state.count)  // 0，不是 { value: 0 }

// 设置时也是直接值
store.$state.count = 10  // 正确
store.$state.count = ref(10)  // ❌ 错误
```

实现解包逻辑：

```javascript
function setupStateForSetupStore(pinia, id, setupResult) {
  for (const key in setupResult) {
    const value = setupResult[key]
    
    if (isRef(value) && !isComputed(value)) {
      // ref 需要解包
      Object.defineProperty(pinia.state.value[id], key, {
        get: () => value.value,
        set: (v) => { value.value = v },
        enumerable: true
      })
    } else if (isReactive(value)) {
      // reactive 直接引用
      pinia.state.value[id][key] = value
    }
  }
}
```

## 嵌套状态处理

嵌套对象的处理：

```javascript
const store = useStore()

// 嵌套对象也是响应式的
store.$state.user.profile.avatar = 'new-avatar.png'

// 整体替换嵌套对象
store.$state.user = {
  name: 'New User',
  profile: {
    avatar: '',
    bio: ''
  }
}
```

使用 `mergeReactiveObjects` 正确合并：

```javascript
function mergeReactiveObjects(target, source) {
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = target[key]
    
    if (
      isPlainObject(sourceValue) &&
      isPlainObject(targetValue) &&
      !isRef(targetValue) &&
      !isReactive(targetValue)
    ) {
      // 递归合并普通对象
      target[key] = mergeReactiveObjects(targetValue, sourceValue)
    } else {
      // 直接赋值
      target[key] = sourceValue
    }
  }
  
  return target
}
```

## 测试用例

```javascript
describe('$state property', () => {
  test('$state returns current state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0, name: 'Test' })
    })
    
    const store = useStore()
    
    expect(store.$state).toEqual({ count: 0, name: 'Test' })
  })
  
  test('$state is same as pinia.state.value[id]', () => {
    const pinia = createPinia()
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore(pinia)
    
    expect(store.$state).toBe(pinia.state.value.test)
  })
  
  test('setting $state updates state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0, name: 'Test' })
    })
    
    const store = useStore()
    
    store.$state = { count: 10, name: 'New' }
    
    expect(store.count).toBe(10)
    expect(store.name).toBe('New')
  })
  
  test('$state is reactive', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    let changed = false
    
    watch(() => store.$state.count, () => {
      changed = true
    })
    
    store.count = 5
    
    // nextTick 后检查
    expect(changed).toBe(true)
  })
  
  test('Setup Store $state only includes ref and reactive', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      const increment = () => { count.value++ }
      
      return { count, double, increment }
    })
    
    const store = useStore()
    
    expect('count' in store.$state).toBe(true)
    expect('double' in store.$state).toBe(false)
    expect('increment' in store.$state).toBe(false)
  })
  
  test('$state refs are unwrapped', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore()
    
    expect(store.$state.count).toBe(0)
    expect(isRef(store.$state.count)).toBe(false)
  })
})
```

## 本章小结

本章实现了 `$state` 属性：

- **核心作用**：访问和替换整个状态
- **实现方式**：getter 返回全局 state，setter 使用 $patch
- **响应式特性**：完全响应式，支持 watch
- **ref 解包**：Setup Store 中 ref 自动解包
- **序列化支持**：便于状态持久化和 SSR

下一章实现 `$reset` 方法。
