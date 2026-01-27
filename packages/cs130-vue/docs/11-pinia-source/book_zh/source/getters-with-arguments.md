# 带参数的 getters

标准的 getter 不接受参数，但有时我们需要根据参数返回不同的值。这一章分析实现带参数 getter 的方法。

## 问题场景

假设需要根据 ID 获取特定项：

```typescript
// 我们想这样用
const item = store.getItemById(123)
```

但标准 getter 是计算属性，不能传参：

```typescript
getters: {
  // ❌ 这不是合法的 getter 定义
  getItemById(state, id) {
    return state.items.find(i => i.id === id)
  }
}
```

## 返回函数的模式

解决方案是让 getter 返回一个函数：

```typescript
const useStore = defineStore('demo', {
  state: () => ({
    items: [] as Item[]
  }),
  getters: {
    getItemById: (state) => {
      // 返回一个接受参数的函数
      return (id: number) => {
        return state.items.find(i => i.id === id)
      }
    }
  }
})

const store = useStore()
const item = store.getItemById(123)
```

## 缓存的丢失

返回函数的 getter 有个重要特性——每次调用都会执行函数体：

```typescript
getters: {
  getItemById: (state) => {
    console.log('getter accessed')
    return (id: number) => {
      console.log('function called with', id)
      return state.items.find(i => i.id === id)
    }
  }
}

store.getItemById(1)
// getter accessed
// function called with 1

store.getItemById(2)
// function called with 2  (getter 不重新执行，但返回的函数每次都调用)

store.items.push(newItem)  // 依赖变化

store.getItemById(1)
// getter accessed  (依赖变化，getter 重新执行)
// function called with 1
```

返回的函数本身没有缓存——每次调用都执行 find。这与普通 getter 的缓存行为不同。

## 实现缓存

如果需要缓存，可以在 getter 内部实现：

```typescript
getters: {
  getItemById: (state) => {
    // 创建一个 Map 缓存结果
    const cache = new Map<number, Item | undefined>()
    
    return (id: number) => {
      if (!cache.has(id)) {
        cache.set(id, state.items.find(i => i.id === id))
      }
      return cache.get(id)
    }
  }
}
```

但这个缓存有问题——当 items 变化时，缓存不会自动失效。

## 使用 computed + Map

更好的方案是预先计算一个 Map：

```typescript
getters: {
  // 先用普通 getter 创建索引 Map
  itemsById: (state) => {
    const map = new Map<number, Item>()
    state.items.forEach(i => map.set(i.id, i))
    return map
  },
  
  // 带参数的 getter 使用索引
  getItemById() {
    return (id: number) => this.itemsById.get(id)
  }
}
```

itemsById 是缓存的，items 变化时才重建。getItemById 只是简单的 Map 查找。

## Setup Store 的实现

Setup Store 可以更灵活地实现：

```typescript
const useStore = defineStore('demo', () => {
  const items = ref<Item[]>([])
  
  // 索引 Map，items 变化时自动重建
  const itemsById = computed(() => {
    const map = new Map<number, Item>()
    items.value.forEach(i => map.set(i.id, i))
    return map
  })
  
  // 带参数的 getter
  function getItemById(id: number) {
    return itemsById.value.get(id)
  }
  
  return { items, getItemById }
})
```

这里 getItemById 是一个普通函数，不是 getter。itemsById 是 computed，提供缓存。

## 区分 getter 和 action

从使用者角度：

```typescript
const store = useStore()

// getter：属性访问
store.allItems      // 无括号
store.activeCount   // 无括号

// 带参数的 getter：函数调用
store.getItemById(123)  // 有括号

// action：函数调用（通常有副作用）
store.addItem(item)     // 有括号
```

技术上，带参数的 getter 和 action 都是函数。区别在于语义：

- 带参数的 getter：查询，不修改状态
- action：操作，可能修改状态

## 类型定义

TypeScript 需要正确推断返回函数的类型：

```typescript
// Options Store
getters: {
  getItemById: (state): ((id: number) => Item | undefined) => {
    return (id) => state.items.find(i => i.id === id)
  }
}

// 或者让 TS 自动推断
getters: {
  getItemById: (state) => (id: number) => {
    return state.items.find(i => i.id === id)
  }
}
```

使用时类型正确：

```typescript
const store = useStore()
const item = store.getItemById(123)  // Item | undefined
```

## 多参数的情况

支持多个参数：

```typescript
getters: {
  filterItems: (state) => (active: boolean, category: string) => {
    return state.items.filter(i => 
      i.active === active && i.category === category
    )
  }
}

const items = store.filterItems(true, 'electronics')
```

## 与 lodash memoize 结合

对于复杂计算，可以使用 memoize：

```typescript
import { memoize } from 'lodash-es'

getters: {
  computeExpensive: (state) => {
    return memoize((param: string) => {
      return expensiveComputation(state.data, param)
    })
  }
}
```

注意：memoize 缓存基于参数，不感知 state 变化。state 变化后可能返回过期结果。

## 最佳实践

简单查询用普通函数：

```typescript
function getItemById(id: number) {
  return store.items.find(i => i.id === id)
}
```

频繁查询用索引 + getter：

```typescript
const itemsById = computed(() => new Map(store.items.map(i => [i.id, i])))
function getItemById(id: number) {
  return itemsById.value.get(id)
}
```

复杂场景用 action：

```typescript
actions: {
  async fetchItemById(id: number) {
    if (!this.items.find(i => i.id === id)) {
      const item = await api.getItem(id)
      this.items.push(item)
    }
    return this.items.find(i => i.id === id)
  }
}
```

## 常见用法

按 ID 查找：

```typescript
getItemById: (state) => (id: number) => 
  state.items.find(i => i.id === id)
```

过滤列表：

```typescript
filterByStatus: (state) => (status: string) =>
  state.items.filter(i => i.status === status)
```

格式化输出：

```typescript
formatPrice: () => (price: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
```

下一章我们将分析跨 Store 的 getters。
