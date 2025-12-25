---
sidebar_position: 22
title: Getters 实现：计算属性封装
---

# Getters 实现：计算属性封装

Getters 是 Store 中的计算属性，它们基于 state 派生数据，具有缓存特性。本章我们将实现 Getters 的核心逻辑，理解如何将 getter 函数转换为 Vue 的 `computed`。

## Getters 的本质

首先问一个问题：Getters 和直接在组件中写 computed 有什么区别？

```javascript
// 方式一：Store 中定义 getter
const useStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  }
})

// 方式二：组件中定义 computed
const store = useCounterStore()
const double = computed(() => store.count * 2)
```

区别在于：

1. **复用性**：Store 中的 getter 可以在任何组件中使用，无需重复定义
2. **封装性**：派生逻辑封装在 Store 中，组件只关心使用
3. **缓存共享**：多个组件使用同一个 getter，共享缓存

本质上，Pinia 的 getter 就是 Vue 的 computed，只是做了封装。

## Getter 函数签名

Pinia 支持两种 getter 写法：

```javascript
getters: {
  // 写法一：接收 state 参数
  double(state) {
    return state.count * 2
  },
  
  // 写法二：使用 this
  triple() {
    return this.count * 3
  },
  
  // 写法三：访问其他 getter
  quadruple() {
    return this.double * 2
  },
  
  // 写法四：返回函数（带参数的 getter）
  multiplyBy(state) {
    return (n) => state.count * n
  }
}
```

这些写法背后的类型定义：

```typescript
type GettersTree<S> = Record<
  string,
  ((state: S) => any) | (() => any)
>
```

## 实现 Getters 转换

核心思路是将每个 getter 函数转换为 `computed`：

```javascript
function setupGetters(getters, id, pinia) {
  if (!getters) return {}
  
  const computedGetters = {}
  
  for (const name in getters) {
    const getter = getters[name]
    
    computedGetters[name] = computed(() => {
      // 获取 store 实例（用于 this 绑定）
      const store = pinia._s.get(id)
      
      // 获取 state（用于第一个参数）
      const state = pinia.state.value[id]
      
      // 调用 getter，同时传入 state 和绑定 this
      return getter.call(store, state)
    })
  }
  
  return computedGetters
}
```

但这个实现有个问题：`computed` 返回的是 ref，访问时需要 `.value`：

```javascript
const store = useStore()
store.double.value  // ❌ 不是我们想要的
store.double        // ✅ 这才是期望的用法
```

### 使用 getter 属性描述符

解决方案是使用 `Object.defineProperty` 定义 getter：

```javascript
function setupGetters(getters, id, pinia, store) {
  if (!getters) return
  
  for (const name in getters) {
    const getter = getters[name]
    
    // 创建 computed
    const computedRef = computed(() => {
      const state = pinia.state.value[id]
      return getter.call(store, state)
    })
    
    // 使用 defineProperty 让访问更自然
    Object.defineProperty(store, name, {
      get: () => computedRef.value,
      enumerable: true
    })
  }
}
```

现在可以直接访问：

```javascript
store.double  // 自动获取 computed 的值
```

### markRaw 优化

Pinia 源码中对 computed 使用了 `markRaw`：

```javascript
const computedRef = markRaw(
  computed(() => {
    return getter.call(store, store.$state)
  })
)
```

为什么使用 `markRaw`？

`markRaw` 标记对象不应被转换为响应式。computed ref 已经是响应式的，如果 store 再次被 reactive 包装，会导致重复响应式化，影响性能。

## 处理 Getter 的 this 上下文

Getter 中的 `this` 应该指向 Store 实例，这样才能：

```javascript
getters: {
  // 通过 this 访问 state
  double() {
    return this.count * 2
  },
  
  // 通过 this 访问其他 getter
  quadruple() {
    return this.double * 2
  },
  
  // 通过 this 调用 action（虽然不常见）
  formattedCount() {
    return `Count: ${this.count}`
  }
}
```

实现关键是 `getter.call(store, state)`：

```javascript
// call 的第一个参数是 this 值
getter.call(store, state)

// 等价于
// this = store
// 第一个参数 = state
```

## 处理返回函数的 Getter

Getter 可以返回函数，实现带参数的派生数据：

```javascript
getters: {
  getUserById(state) {
    return (id) => state.users.find(u => u.id === id)
  },
  
  filterItems(state) {
    return (keyword) => state.items.filter(i => 
      i.name.includes(keyword)
    )
  }
}
```

使用方式：

```javascript
const store = useStore()
const user = store.getUserById(123)
const filtered = store.filterItems('test')
```

这种 getter 有一个特点：**没有缓存**。

因为返回的是函数，每次调用都会执行过滤逻辑。如果需要缓存，应该使用 Map：

```javascript
getters: {
  getUserById(state) {
    // 使用 Map 缓存结果
    const cache = new Map()
    
    return (id) => {
      if (cache.has(id)) {
        return cache.get(id)
      }
      const user = state.users.find(u => u.id === id)
      cache.set(id, user)
      return user
    }
  }
}
```

但要注意：这种手动缓存不会自动失效，需要在数据变化时清理。

## 完整的 Getters 实现

整合上述逻辑：

```javascript
import { computed, markRaw } from 'vue'

export function setupGetters(getters, store, pinia, id) {
  if (!getters) return
  
  for (const getterName in getters) {
    const getter = getters[getterName]
    
    // 创建 computed，使用 markRaw 避免重复响应式化
    const computedGetter = markRaw(
      computed(() => {
        // 确保 store 已注册
        const currentStore = pinia._s.get(id)
        if (!currentStore) {
          throw new Error(`Store "${id}" not found`)
        }
        
        // 调用 getter，绑定 this，传入 state
        return getter.call(currentStore, currentStore.$state)
      })
    )
    
    // 定义属性，直接访问值
    Object.defineProperty(store, getterName, {
      get: () => computedGetter.value,
      enumerable: true,
      configurable: true
    })
  }
}
```

## Getter 的响应式特性

Getter 继承了 computed 的所有特性：

### 惰性求值

Getter 在第一次访问时才计算：

```javascript
const useStore = defineStore('test', {
  state: () => ({ count: 0 }),
  getters: {
    expensive() {
      console.log('Computing...')
      return heavyComputation(this.count)
    }
  }
})

const store = useStore()
// 此时还没有计算

console.log(store.expensive)  // 输出 "Computing..."，第一次计算
console.log(store.expensive)  // 不输出，使用缓存
```

### 依赖追踪

Getter 自动追踪依赖，只在依赖变化时重新计算：

```javascript
getters: {
  fullName(state) {
    return `${state.firstName} ${state.lastName}`
  }
}

// 修改 firstName 或 lastName 会触发重新计算
// 修改其他属性不会
store.firstName = 'Alice'  // fullName 重新计算
store.age = 25             // fullName 不重新计算
```

### 缓存

Getter 的值被缓存，多次访问不会重复计算：

```javascript
// 假设有 100 个组件使用 store.total
// total 只计算一次，所有组件共享结果
getters: {
  total(state) {
    return state.items.reduce((sum, i) => sum + i.price, 0)
  }
}
```

## TypeScript 类型推断

Getter 的类型推断是 Pinia 类型系统的重要部分：

```typescript
const useStore = defineStore('user', {
  state: () => ({
    firstName: '',
    lastName: ''
  }),
  getters: {
    // 返回类型自动推断为 string
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    
    // 使用 this 时需要显式标注返回类型
    greeting(): string {
      return `Hello, ${this.fullName}!`
    }
  }
})

const store = useStore()
store.fullName  // string
store.greeting  // string
```

当 getter 使用 `this` 访问其他 getter 时，TypeScript 需要知道返回类型才能正确推断 `this` 的类型。这是一个循环依赖问题，Pinia 通过复杂的类型体操解决。

## 测试验证

```javascript
describe('Getters', () => {
  test('basic getter', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
  })
  
  test('getter with this', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double() {
          return this.count * 2
        }
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
  })
  
  test('getter accessing other getter', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2,
        quadruple() {
          return this.double * 2
        }
      }
    })
    
    const store = useStore()
    expect(store.quadruple).toBe(8)
  })
  
  test('getter reactivity', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(0)
    
    store.count = 5
    expect(store.double).toBe(10)
  })
  
  test('getter with function return', () => {
    const useStore = defineStore('test', {
      state: () => ({ items: [1, 2, 3, 4, 5] }),
      getters: {
        getGreaterThan: (state) => (n) => 
          state.items.filter(i => i > n)
      }
    })
    
    const store = useStore()
    expect(store.getGreaterThan(3)).toEqual([4, 5])
  })
})
```

## 性能考量

### 避免昂贵计算

Getter 应该避免过于复杂的计算：

```javascript
// ❌ 避免：在 getter 中做复杂计算
getters: {
  processedData(state) {
    return state.items
      .filter(...)
      .map(...)
      .sort(...)
      .reduce(...)
  }
}

// ✅ 更好：拆分计算，利用多级缓存
getters: {
  filteredItems: (state) => state.items.filter(...),
  sortedItems() {
    return [...this.filteredItems].sort(...)
  },
  processedData() {
    return this.sortedItems.reduce(...)
  }
}
```

拆分后，如果只有 filter 条件变化，sort 和 reduce 不会重新执行。

### 避免副作用

Getter 应该是纯函数，不应有副作用：

```javascript
// ❌ 错误：getter 中有副作用
getters: {
  total(state) {
    console.log('Computing total')  // 副作用
    localStorage.setItem('lastComputed', Date.now())  // 副作用
    return state.items.reduce((sum, i) => sum + i.price, 0)
  }
}

// ✅ 正确：纯函数
getters: {
  total: (state) => state.items.reduce((sum, i) => sum + i.price, 0)
}
```

## 本章小结

本章我们实现了 Getters 的核心逻辑：

- **本质理解**：Getter 就是封装的 computed
- **转换实现**：使用 computed + defineProperty 实现自然的访问方式
- **this 绑定**：通过 call 绑定 Store 实例
- **markRaw 优化**：避免重复响应式化
- **响应式特性**：惰性求值、依赖追踪、缓存
- **性能考量**：拆分计算、避免副作用

下一章，我们将深入 Getter 之间的相互访问和依赖关系处理。
