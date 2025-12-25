---
sidebar_position: 29
title: Setup 函数执行与返回值处理
---

# Setup 函数执行与返回值处理

本章深入探讨 Setup Store 中 setup 函数的执行机制，以及如何正确处理其返回值。

## Setup 函数的执行时机

Setup 函数的执行遵循「首次使用时执行」的原则：

```javascript
const useStore = defineStore('store', () => {
  console.log('Setup executing...')
  const count = ref(0)
  return { count }
})

// 此时 setup 还未执行
console.log('Store defined')

// 第一次调用时执行 setup
const store1 = useStore()  // 输出 "Setup executing..."

// 后续调用复用实例
const store2 = useStore()  // 不输出，返回缓存的实例
```

### 为什么是懒执行？

1. **性能优化**：未使用的 Store 不会初始化
2. **避免循环依赖**：Store 之间可以互相引用
3. **Pinia 实例可用**：确保执行时 Pinia 已挂载

## 执行上下文

Setup 函数执行时的上下文：

```javascript
const useStore = defineStore('store', () => {
  // 可以访问的内容
  const pinia = getActivePinia()  // 当前 Pinia 实例
  const app = pinia._a            // Vue 应用实例
  
  // 可以使用其他 Store
  const userStore = useUserStore()
  
  // 可以使用 Vue 的响应式 API
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  // 可以使用 watch
  watch(count, (newVal) => {
    console.log('count changed:', newVal)
  })
  
  return { count, double }
})
```

### 访问其他 Store

Setup 函数内可以安全地调用其他 Store：

```javascript
const useCartStore = defineStore('cart', () => {
  const items = ref([])
  
  // 在 setup 中访问其他 Store
  const userStore = useUserStore()
  
  const discount = computed(() => {
    // 根据用户等级计算折扣
    return userStore.vipLevel * 0.05
  })
  
  return { items, discount }
})
```

注意：避免循环依赖。如果 A 依赖 B，B 又依赖 A，会导致问题。

## 返回值要求

Setup 函数必须返回一个对象：

```javascript
// ✅ 正确：返回对象
defineStore('store', () => {
  const count = ref(0)
  return { count }
})

// ❌ 错误：返回非对象
defineStore('store', () => {
  return 123  // Error!
})

// ❌ 错误：不返回
defineStore('store', () => {
  const count = ref(0)
  // 没有 return
})

// ❌ 错误：返回 null/undefined
defineStore('store', () => {
  return null
})
```

验证逻辑：

```javascript
const setupResult = setup()

if (!setupResult || typeof setupResult !== 'object' || Array.isArray(setupResult)) {
  throw new Error(
    `[Pinia] The setup function must return a plain object. ` +
    `Received: ${setupResult === null ? 'null' : typeof setupResult}`
  )
}
```

## 返回值的分类处理

返回对象的每个属性需要被正确分类：

```javascript
function categorizeSetupResult(setupResult) {
  const state = {}
  const getters = {}
  const actions = {}
  const others = {}
  
  for (const key in setupResult) {
    const value = setupResult[key]
    
    if (isRef(value)) {
      if (isComputed(value)) {
        getters[key] = value
      } else {
        state[key] = value
      }
    } else if (isReactive(value)) {
      state[key] = value
    } else if (typeof value === 'function') {
      actions[key] = value
    } else {
      others[key] = value
    }
  }
  
  return { state, getters, actions, others }
}

// 辅助函数
function isComputed(v) {
  return isRef(v) && typeof v.effect === 'object'
}
```

### State 识别

State 是 `ref` 或 `reactive` 但不是 `computed`：

```javascript
// ref → state
const count = ref(0)

// reactive → state  
const user = reactive({ name: '' })

// shallowRef → state
const items = shallowRef([])

// computed 不是 state！
const double = computed(() => count.value * 2)  // → getter
```

### Getter 识别

Getter 是 `computed`：

```javascript
// computed → getter
const double = computed(() => count.value * 2)

// readonly computed → getter
const readonlyDouble = computed(() => count.value * 2)

// writable computed → getter
const writableComputed = computed({
  get: () => count.value * 2,
  set: (v) => { count.value = v / 2 }
})
```

### Action 识别

Action 是普通函数：

```javascript
// function → action
function increment() {
  count.value++
}

// async function → action
async function fetchData() {
  data.value = await api.getData()
}

// arrow function → action
const decrement = () => {
  count.value--
}
```

## 特殊情况处理

### 内部属性

以 `$` 或 `_` 开头的属性被视为内部属性：

```javascript
defineStore('store', () => {
  const count = ref(0)
  const _cache = new Map()     // 内部使用
  const $customReset = () => { // 自定义 API
    count.value = 0
  }
  
  return { count, _cache, $customReset }
})
```

处理方式：

```javascript
for (const key in setupResult) {
  if (key.startsWith('$') || key.startsWith('_')) {
    // 直接赋值，不做特殊处理
    store[key] = setupResult[key]
    continue
  }
  // 正常分类...
}
```

### 常量和静态值

非响应式的值直接暴露：

```javascript
defineStore('store', () => {
  const count = ref(0)
  const MAX_COUNT = 100        // 常量
  const config = { theme: 'dark' }  // 静态配置
  
  return { count, MAX_COUNT, config }
})

// 使用
store.count        // 响应式
store.MAX_COUNT    // 100
store.config       // { theme: 'dark' }
```

### 嵌套响应式

```javascript
defineStore('store', () => {
  // 嵌套 ref
  const nested = reactive({
    count: ref(0),  // ref 在 reactive 中会自动解包
    user: reactive({ name: '' })
  })
  
  return { nested }
})
```

## 返回值代理

为了保持响应性，需要正确处理返回值的代理：

```javascript
function processSetupResult(store, setupResult) {
  for (const key in setupResult) {
    const value = setupResult[key]
    
    if (isRef(value) && !isComputed(value)) {
      // ref 需要保持原始引用
      // 这样外部修改 store.count 就是修改原 ref
      Object.defineProperty(store, key, {
        get: () => value.value,
        set: (v) => { value.value = v },
        enumerable: true
      })
    } else {
      // 其他直接赋值
      store[key] = value
    }
  }
}
```

## 测试用例

```javascript
describe('Setup Result Processing', () => {
  test('ref is treated as state', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore()
    expect(store.$state.count).toBe(0)
    
    store.count = 5
    expect(store.$state.count).toBe(5)
  })
  
  test('computed is treated as getter', () => {
    const useStore = defineStore('test', () => {
      const count = ref(2)
      const double = computed(() => count.value * 2)
      return { count, double }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
    
    // double 不在 $state 中
    expect('double' in store.$state).toBe(false)
  })
  
  test('function is treated as action', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      function increment() {
        count.value++
      }
      return { count, increment }
    })
    
    const store = useStore()
    store.increment()
    expect(store.count).toBe(1)
  })
  
  test('reactive object as state', () => {
    const useStore = defineStore('test', () => {
      const user = reactive({ name: '', age: 0 })
      return { user }
    })
    
    const store = useStore()
    store.user.name = 'Alice'
    expect(store.$state.user.name).toBe('Alice')
  })
})
```

## 本章小结

本章深入探讨了 Setup 函数的执行和返回值处理：

- **执行时机**：首次使用时懒执行
- **执行上下文**：可访问 Pinia、其他 Store、Vue API
- **返回值要求**：必须是普通对象
- **分类逻辑**：ref→state，computed→getter，function→action
- **特殊处理**：内部属性、常量、嵌套响应式

下一章探讨 effectScope 在 Store 中的核心作用。
