---
sidebar_position: 33
title: computed 与 Getters 对应关系
---

# computed 与 Getters 对应关系

在 Setup Store 中，Vue 的 `computed` 自然对应 Options Store 的 `getters`。本章探讨这种对应关系的实现细节。

## 概念对应

```javascript
// Options Store
defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
    quadruple() {
      return this.double * 2
    }
  }
})

// Setup Store - 等价写法
defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  const quadruple = computed(() => double.value * 2)
  
  return { count, double, quadruple }
})
```

两者行为完全一致：
- 惰性计算
- 缓存结果
- 依赖追踪
- 响应式更新

## computed 识别

computed 是特殊的 ref，它有一个 `effect` 属性：

```javascript
import { computed, isRef } from 'vue'

function isComputed(value) {
  return isRef(value) && 'effect' in value
}

// 验证
const count = ref(0)
const double = computed(() => count.value * 2)

console.log(isRef(count))       // true
console.log(isRef(double))      // true
console.log('effect' in count)  // false
console.log('effect' in double) // true

console.log(isComputed(count))  // false
console.log(isComputed(double)) // true
```

## Store 中的 computed 处理

computed 在 Store 中需要特殊代理：

```javascript
function setupComputedProxy(store, key, computedRef) {
  Object.defineProperty(store, key, {
    get: () => computedRef.value,
    set: (value) => {
      // computed 默认只读，set 会警告
      if (__DEV__) {
        console.warn(`Computed "${key}" is readonly`)
      }
    },
    enumerable: true,
    configurable: true
  })
}
```

与普通 ref 的区别：computed 默认不可写，尝试写入应该发出警告。

### 可写 computed

Vue 支持可写 computed：

```javascript
const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value) => {
    const [first, last] = value.split(' ')
    firstName.value = first
    lastName.value = last
  }
})
```

Store 中也应该支持：

```javascript
function setupComputedProxy(store, key, computedRef) {
  // 检查是否可写
  const desc = Object.getOwnPropertyDescriptor(computedRef, 'value')
  const writable = desc && typeof desc.set === 'function'
  
  Object.defineProperty(store, key, {
    get: () => computedRef.value,
    set: writable
      ? (value) => { computedRef.value = value }
      : () => {
          if (__DEV__) {
            console.warn(`Computed "${key}" is readonly`)
          }
        },
    enumerable: true,
    configurable: true
  })
}
```

## computed 与 $state 的关系

重要区别：**computed 不属于 $state**。

```javascript
const useStore = defineStore('test', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  return { count, double }
})

const store = useStore()

console.log('count' in store.$state)   // true
console.log('double' in store.$state)  // false
```

为什么？
- `$state` 代表可持久化的状态
- computed 是派生值，不需要持久化
- computed 可以从 state 重新计算

这在 SSR/持久化场景很重要：

```javascript
// SSR：只传输 state，不传输 computed
const hydratedState = {
  count: 42  // double 不需要传输，可以重新计算
}

// 持久化：只存储 state
localStorage.setItem('store', JSON.stringify({
  count: store.count  // double 不存储
}))
```

## computed 依赖追踪

在 Store 中，computed 可以依赖：
- 同 Store 的 state
- 同 Store 的其他 computed
- 其他 Store 的 state/computed

```javascript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  return { count, double }
})

const useDisplayStore = defineStore('display', () => {
  const counter = useCounterStore()
  
  // 依赖另一个 Store
  const message = computed(() => 
    `Count is ${counter.count}, double is ${counter.double}`
  )
  
  return { message }
})
```

Vue 的响应式系统会自动处理跨 Store 依赖。

## 缓存验证

确保 computed 正确缓存：

```javascript
let computeCount = 0

const useStore = defineStore('test', () => {
  const count = ref(0)
  const double = computed(() => {
    computeCount++
    return count.value * 2
  })
  
  return { count, double }
})

const store = useStore()

// 首次访问，触发计算
console.log(store.double)  // 0
console.log(computeCount)  // 1

// 再次访问，使用缓存
console.log(store.double)  // 0
console.log(computeCount)  // 1（没有增加）

// 修改依赖
store.count = 5

// 访问时重新计算
console.log(store.double)  // 10
console.log(computeCount)  // 2
```

## Options 与 Setup 的 Getter 差异

虽然概念对应，但有细微差异：

### 1. 访问方式

```javascript
// Options Store
getters: {
  double(state) {
    // 通过参数访问 state
    return state.count * 2
  },
  quadruple() {
    // 通过 this 访问其他 getter
    return this.double * 2
  }
}

// Setup Store
const double = computed(() => count.value)  // 直接访问闭包变量
const quadruple = computed(() => double.value * 2)  // 直接访问
```

Setup Store 更直观，不需要 `state` 参数或 `this`。

### 2. 类型推断

```javascript
// Options Store - TypeScript 类型推断复杂
getters: {
  // 需要手动标注返回类型，否则可能推断错误
  double(state): number {
    return state.count * 2
  }
}

// Setup Store - 类型自动推断
const double = computed(() => count.value * 2)
// TypeScript 自动推断 double 为 ComputedRef<number>
```

### 3. 组合能力

```javascript
// Setup Store 可以轻松组合逻辑
function useDoubleValue(valueRef) {
  return computed(() => valueRef.value * 2)
}

const useStore = defineStore('test', () => {
  const count = ref(0)
  const price = ref(100)
  
  // 复用组合逻辑
  const doubleCount = useDoubleValue(count)
  const doublePrice = useDoubleValue(price)
  
  return { count, price, doubleCount, doublePrice }
})
```

## 测试用例

```javascript
describe('Computed as Getters', () => {
  test('computed is identified correctly', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      return { count, double }
    })
    
    const store = useStore()
    
    // double 是可访问的
    expect(store.double).toBe(0)
    
    // double 不在 $state 中
    expect('double' in store.$state).toBe(false)
  })
  
  test('computed is reactive', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      return { count, double }
    })
    
    const store = useStore()
    expect(store.double).toBe(0)
    
    store.count = 5
    expect(store.double).toBe(10)
  })
  
  test('computed is cached', () => {
    let computeCount = 0
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => {
        computeCount++
        return count.value * 2
      })
      return { count, double }
    })
    
    const store = useStore()
    
    store.double
    store.double
    store.double
    
    expect(computeCount).toBe(1)
  })
  
  test('writable computed', () => {
    const useStore = defineStore('test', () => {
      const firstName = ref('John')
      const lastName = ref('Doe')
      
      const fullName = computed({
        get: () => `${firstName.value} ${lastName.value}`,
        set: (value) => {
          const [first, last] = value.split(' ')
          firstName.value = first
          lastName.value = last
        }
      })
      
      return { firstName, lastName, fullName }
    })
    
    const store = useStore()
    expect(store.fullName).toBe('John Doe')
    
    store.fullName = 'Jane Smith'
    expect(store.firstName).toBe('Jane')
    expect(store.lastName).toBe('Smith')
  })
  
  test('cross-store computed dependency', () => {
    const useCounterStore = defineStore('counter', () => {
      const count = ref(0)
      return { count }
    })
    
    const useDisplayStore = defineStore('display', () => {
      const counter = useCounterStore()
      const message = computed(() => `Count: ${counter.count}`)
      return { message }
    })
    
    const counter = useCounterStore()
    const display = useDisplayStore()
    
    expect(display.message).toBe('Count: 0')
    
    counter.count = 42
    expect(display.message).toBe('Count: 42')
  })
})
```

## 完整实现整合

将 computed 处理整合到 Setup Store：

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  
  const setupResult = scope.run(() => setup())
  
  // 分类处理
  for (const key in setupResult) {
    const value = setupResult[key]
    
    if (isComputed(value)) {
      // Getter：computed
      Object.defineProperty(store, key, {
        get: () => value.value,
        enumerable: true
      })
    } else if (isRef(value)) {
      // State：ref
      Object.defineProperty(store, key, {
        get: () => value.value,
        set: (v) => { value.value = v },
        enumerable: true
      })
    } else if (isReactive(value)) {
      // State：reactive
      store[key] = value
    } else if (typeof value === 'function') {
      // Action：function
      store[key] = wrapAction(value)
    }
  }
  
  return store
}

function isComputed(value) {
  return isRef(value) && 'effect' in value
}
```

## 本章小结

本章探讨了 computed 与 Getters 的对应：

- **概念对应**：computed 自然映射为 getter
- **识别方式**：通过 `effect` 属性区分 computed 和普通 ref
- **与 $state 的关系**：computed 不属于 $state
- **可写 computed**：Store 中支持可写 computed
- **依赖追踪**：支持跨 Store 依赖
- **缓存机制**：computed 正确缓存计算结果

完成 Setup Store 部分，下一章进入 Store API 实现。
