---
sidebar_position: 23
title: Getters 相互访问与依赖
---

# Getters 相互访问与依赖

在实际项目中，Getter 往往需要访问其他 Getter 来构建复杂的派生数据。本章深入探讨 Getter 之间的相互访问机制、依赖追踪原理，以及可能遇到的循环依赖问题。

## Getter 相互访问的场景

考虑一个电商购物车的例子：

```javascript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    discount: 0.1  // 10% 折扣
  }),
  getters: {
    // 基础 getter：商品总数
    totalCount: (state) => state.items.reduce((sum, i) => sum + i.quantity, 0),
    
    // 基础 getter：原价总计
    subtotal: (state) => state.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    
    // 依赖其他 getter：折扣金额
    discountAmount() {
      return this.subtotal * this.discount
    },
    
    // 依赖多个 getter：最终价格
    total() {
      return this.subtotal - this.discountAmount
    },
    
    // 依赖 getter 和 state：格式化输出
    summary() {
      return `${this.totalCount} items, Total: $${this.total.toFixed(2)}`
    }
  }
})
```

这里的依赖关系：

```
totalCount ← state.items
subtotal ← state.items
discountAmount ← subtotal, state.discount
total ← subtotal, discountAmount
summary ← totalCount, total
```

## 依赖追踪原理

Vue 的 computed 自动追踪依赖，Getter 继承了这个特性。让我们理解其工作原理。

### 响应式依赖收集

当访问响应式数据时，Vue 会收集当前的"副作用"（effect）作为依赖：

```javascript
// 简化的依赖收集原理
let activeEffect = null

function track(target, key) {
  if (activeEffect) {
    // 记录：target[key] 被 activeEffect 依赖
    addDep(target, key, activeEffect)
  }
}

function trigger(target, key) {
  // 获取依赖 target[key] 的所有 effect
  const effects = getDeps(target, key)
  // 重新执行它们
  effects.forEach(effect => effect())
}
```

### Getter 作为 Computed

Getter 被转换为 computed，本质上是一个带缓存的 effect：

```javascript
const computedGetter = computed(() => {
  // 执行时，Vue 会追踪这里访问的所有响应式数据
  return getter.call(store, store.$state)
})
```

当 getter 内部访问 `this.count` 或 `state.items` 时，这些访问会被 track，建立依赖关系。

### Getter 依赖 Getter

当一个 getter 访问另一个 getter 时：

```javascript
getters: {
  double: (state) => state.count * 2,
  quadruple() {
    return this.double * 2  // 访问另一个 getter
  }
}
```

`quadruple` 访问 `this.double` 实际上是访问一个 computed 的值。Computed 也是响应式的，所以 `quadruple` 会自动依赖 `double`。

当 `state.count` 变化：

1. `double`（computed）失效，重新计算
2. `quadruple` 依赖 `double`，也失效，重新计算

这就是 getter 链式更新的原理。

## 实现 Getter 相互访问

关键在于确保 getter 执行时能正确访问其他 getter：

```javascript
function setupGetters(getters, store, pinia, id) {
  // 第一步：创建所有 computed（但不立即求值）
  const computedGetters = {}
  
  for (const name in getters) {
    const getter = getters[name]
    
    computedGetters[name] = computed(() => {
      // 此时 store 上已经有所有 getter
      return getter.call(store, store.$state)
    })
  }
  
  // 第二步：将 computed 添加到 store
  for (const name in computedGetters) {
    Object.defineProperty(store, name, {
      get: () => computedGetters[name].value,
      enumerable: true
    })
  }
}
```

因为 computed 是惰性的，创建时不会立即执行 getter 函数。只有访问时才执行，此时所有 getter 都已添加到 store，相互访问不会有问题。

## 循环依赖问题

### 什么是循环依赖？

```javascript
getters: {
  a() {
    return this.b + 1  // a 依赖 b
  },
  b() {
    return this.a + 1  // b 依赖 a
  }
}
```

这形成了循环：a → b → a → ...

### Vue Computed 的循环依赖处理

Vue 的 computed 对循环依赖有保护：

```javascript
const a = computed(() => b.value + 1)
const b = computed(() => a.value + 1)

console.log(a.value)  // 警告：Circular dependency detected
```

会触发警告并返回 undefined，避免无限循环。

### Pinia 的处理

Pinia getter 继承了 Vue computed 的行为，循环依赖会导致警告和未定义值：

```javascript
const store = useStore()
console.log(store.a)  // undefined + 警告
```

### 避免循环依赖

重构代码结构，打破循环：

```javascript
// ❌ 循环依赖
getters: {
  a() { return this.b + 1 },
  b() { return this.a + 1 }
}

// ✅ 提取共同依赖
getters: {
  base: (state) => state.value,  // 基础值
  a() { return this.base + 1 },
  b() { return this.base + 2 }
}
```

## 跨 Store 访问 Getter

Getter 还可以访问其他 Store 的 getter：

```javascript
// user.js
const useUserStore = defineStore('user', {
  state: () => ({ name: '', vipLevel: 0 })
})

// cart.js
const useCartStore = defineStore('cart', {
  state: () => ({ items: [] }),
  getters: {
    // 访问其他 Store
    discountRate() {
      const userStore = useUserStore()
      return userStore.vipLevel * 0.05  // VIP 等级越高折扣越多
    },
    
    total() {
      const subtotal = this.items.reduce((sum, i) => sum + i.price, 0)
      return subtotal * (1 - this.discountRate)
    }
  }
})
```

注意：在 getter 中调用 `useUserStore()` 是安全的，因为：

1. Getter 只在 Pinia 安装后才会被访问
2. 其他 Store 的 getter 也是响应式的，会正确建立依赖

## 依赖图可视化

对于复杂的 Store，可以绘制依赖图帮助理解：

```
        ┌─────────────┐
        │  state.items │
        └──────┬──────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐      ┌──────────┐
│totalCount│      │ subtotal │
└──────────┘      └─────┬────┘
      │                 │
      │        ┌────────┼────────┐
      │        ▼        ▼        │
      │   ┌────────┐  ┌─────────┐│
      │   │discount│  │discount ││
      │   │ Amount │  │  Rate   ││
      │   └────┬───┘  └─────────┘│
      │        │                 │
      │        ▼                 │
      │   ┌─────────┐           │
      │   │  total  │◄──────────┘
      │   └────┬────┘
      │        │
      ▼        ▼
  ┌───────────────┐
  │    summary    │
  └───────────────┘
```

## 性能优化策略

### 细粒度拆分

将大 getter 拆分为多个小 getter，提高缓存效率：

```javascript
// ❌ 粗粒度：任何变化都要重算全部
getters: {
  report(state) {
    const total = state.items.reduce(...)
    const average = total / state.items.length
    const max = Math.max(...state.items.map(i => i.price))
    const min = Math.min(...state.items.map(i => i.price))
    return { total, average, max, min }
  }
}

// ✅ 细粒度：只重算变化的部分
getters: {
  total: (state) => state.items.reduce(...),
  average() { return this.total / this.items.length },
  max: (state) => Math.max(...state.items.map(i => i.price)),
  min: (state) => Math.min(...state.items.map(i => i.price)),
  report() {
    return {
      total: this.total,
      average: this.average,
      max: this.max,
      min: this.min
    }
  }
}
```

### 避免不必要的依赖

```javascript
// ❌ 依赖整个 items 数组
getters: {
  itemCount(state) {
    return state.items.length
  }
}

// ✅ 更好：单独存储长度（如果频繁访问）
state: () => ({
  items: [],
  itemCount: 0  // 在 action 中维护
})
```

### 使用 shallowRef 优化大型数据

```javascript
import { shallowRef } from 'vue'

state: () => ({
  // 大型数据使用 shallowRef
  bigData: shallowRef([]),
})
```

## TypeScript 类型支持

Getter 相互访问的类型推断比较复杂：

```typescript
interface State {
  count: number
}

interface Getters {
  double: (state: State) => number
  quadruple: () => number  // 使用 this
}

// Pinia 的类型体操确保：
// - this.double 是 number（不是函数）
// - this.count 是 number
// - this.quadruple 是 number
```

当 getter 使用 `this` 时，TypeScript 需要知道 `this` 的完整类型，包括：

- 所有 state 属性
- 所有 getter 的返回类型
- 所有 action

这需要复杂的类型推导，Pinia 源码中有大量类型定义来支持这一特性。

## 调试技巧

### Vue DevTools

Vue DevTools 可以查看 computed 的依赖：

1. 打开 DevTools → Vue → Components
2. 选择使用 Store 的组件
3. 查看 computed 标签页
4. 可以看到每个 getter 的依赖和值

### 手动追踪

在开发时可以添加日志：

```javascript
getters: {
  total() {
    console.log('Computing total, dependencies:', {
      subtotal: this.subtotal,
      discount: this.discountAmount
    })
    return this.subtotal - this.discountAmount
  }
}
```

## 测试策略

```javascript
describe('Getter Dependencies', () => {
  test('getter can access other getters', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: 2 }),
      getters: {
        double: (state) => state.value * 2,
        quadruple() { return this.double * 2 }
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
    expect(store.quadruple).toBe(8)
  })
  
  test('getter chain updates correctly', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: 1 }),
      getters: {
        a: (state) => state.value + 1,
        b() { return this.a + 1 },
        c() { return this.b + 1 }
      }
    })
    
    const store = useStore()
    expect(store.c).toBe(4)  // 1 + 1 + 1 + 1
    
    store.value = 10
    expect(store.c).toBe(13)  // 10 + 1 + 1 + 1
  })
  
  test('only affected getters recompute', () => {
    let computeCountA = 0
    let computeCountB = 0
    
    const useStore = defineStore('test', {
      state: () => ({ a: 1, b: 1 }),
      getters: {
        doubleA(state) {
          computeCountA++
          return state.a * 2
        },
        doubleB(state) {
          computeCountB++
          return state.b * 2
        }
      }
    })
    
    const store = useStore()
    
    // 初始访问
    store.doubleA
    store.doubleB
    expect(computeCountA).toBe(1)
    expect(computeCountB).toBe(1)
    
    // 修改 a，只有 doubleA 重算
    store.a = 2
    store.doubleA
    store.doubleB
    expect(computeCountA).toBe(2)
    expect(computeCountB).toBe(1)  // 没有重算
  })
})
```

## 本章小结

本章深入探讨了 Getter 相互访问的机制：

- **依赖追踪原理**：Vue computed 自动追踪响应式依赖
- **链式更新**：getter 访问 getter 会建立依赖链
- **循环依赖**：Vue computed 有保护机制，但应该避免
- **跨 Store 访问**：可以在 getter 中访问其他 Store
- **性能优化**：细粒度拆分、避免不必要依赖
- **调试技巧**：使用 DevTools 和日志

下一章，我们将实现 Actions，包括 this 绑定和异步处理。
