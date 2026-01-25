# getters 缓存机制

computed 的核心价值在于缓存——依赖不变时不重新计算。这一章深入分析这个机制在 Pinia getters 中的表现。

## 缓存的基本原理

Vue 的 computed 实现了懒计算和缓存：

```typescript
const count = ref(0)
const double = computed(() => {
  console.log('calculating...')
  return count.value * 2
})

// 首次访问，触发计算
console.log(double.value)  // 输出：calculating... 0

// 再次访问，使用缓存
console.log(double.value)  // 无输出，直接返回 0

// 依赖变化
count.value = 5

// 再次访问，重新计算
console.log(double.value)  // 输出：calculating... 10
```

这个特性对性能至关重要，尤其是计算开销大的场景。

## Pinia getters 的缓存

Pinia 的 getters 完全继承了 computed 的缓存行为：

```typescript
const useStore = defineStore('demo', {
  state: () => ({
    items: [] as Item[]
  }),
  getters: {
    expensiveResult: (state) => {
      console.log('expensive computation...')
      return state.items.reduce((acc, item) => {
        // 复杂计算
        return acc + heavyProcess(item)
      }, 0)
    }
  }
})

const store = useStore()

// 多次访问只计算一次
store.expensiveResult  // 输出：expensive computation...
store.expensiveResult  // 无输出
store.expensiveResult  // 无输出
```

## 依赖追踪的精确性

computed 只追踪实际访问的依赖：

```typescript
const useStore = defineStore('demo', {
  state: () => ({
    a: 1,
    b: 2,
    useA: true
  }),
  getters: {
    result(state) {
      // 根据条件访问不同的状态
      if (state.useA) {
        return state.a * 2
      } else {
        return state.b * 2
      }
    }
  }
})

const store = useStore()

// useA 为 true，只追踪 useA 和 a
console.log(store.result)  // 2

// 修改 b 不会触发重算（因为没被访问）
store.b = 100
console.log(store.result)  // 还是 2，没有重算

// 修改 a 会触发重算
store.a = 5
console.log(store.result)  // 10
```

这意味着 getter 的依赖是动态的，取决于每次执行时实际访问了什么。

## 脏检查机制

computed 使用脏标记来跟踪是否需要重算：

```typescript
// Vue 内部实现简化
class ComputedRefImpl {
  private _dirty = true
  private _value: any
  
  get value() {
    if (this._dirty) {
      this._value = this.effect.run()
      this._dirty = false
    }
    return this._value
  }
  
  // 依赖变化时调用
  scheduler() {
    this._dirty = true
    triggerRefValue(this)
  }
}
```

依赖变化时，computed 被标记为 dirty，但不立即重算。只有下次访问时才真正计算。

## 多层 getter 的缓存

getter 可以依赖其他 getter，缓存层层生效：

```typescript
getters: {
  filteredItems: (state) => {
    console.log('filtering...')
    return state.items.filter(i => i.active)
  },
  totalPrice() {
    console.log('totaling...')
    return this.filteredItems.reduce((sum, i) => sum + i.price, 0)
  },
  formattedPrice() {
    console.log('formatting...')
    return `$${this.totalPrice.toFixed(2)}`
  }
}

// 访问 formattedPrice
store.formattedPrice
// 输出：filtering... totaling... formatting...

// 再次访问，全部使用缓存
store.formattedPrice
// 无输出

// items 变化
store.items.push(newItem)

// 再次访问，整个链条重算
store.formattedPrice
// 输出：filtering... totaling... formatting...
```

## 缓存失效的时机

以下情况会使缓存失效：

依赖的状态变化：

```typescript
store.count = 10  // 所有依赖 count 的 getter 失效
```

依赖的 getter 失效：

```typescript
// 如果 A 依赖 B，B 失效会导致 A 也失效
```

嵌套对象的修改：

```typescript
store.user.profile.age = 25  // 依赖 user 的 getter 可能失效
```

## 数组操作的注意事项

数组操作可能意外触发大量重算：

```typescript
getters: {
  sortedItems: (state) => {
    console.log('sorting...')
    return [...state.items].sort((a, b) => a.name.localeCompare(b.name))
  }
}

// 每次修改 items 都触发重算
store.items.push(item1)  // sorting...
store.items.push(item2)  // sorting...
store.items.push(item3)  // sorting...
```

批量操作可以减少重算次数：

```typescript
// 只触发一次
store.$patch(state => {
  state.items.push(item1, item2, item3)
})
// sorting...
```

## 缓存与组件更新

getter 的缓存影响组件更新：

```typescript
// 组件中
const store = useStore()

// 模板中使用 getter
// <div>{{ store.expensiveResult }}</div>

// 如果 expensiveResult 的依赖没变，组件更新时不会重算
```

这是 Vue 响应式系统的优化，不必担心频繁渲染导致的重复计算。

## 避免缓存失效的陷阱

不稳定的依赖会破坏缓存：

```typescript
// ❌ 错误：每次访问都返回新数组，看似相同但引用不同
getters: {
  items: (state) => state.list.filter(i => i.active)
}

// 上游使用
getters: {
  count() {
    return this.items.length  // 每次 items 都是新数组
  }
}
```

这本身不会导致 count 重算（length 是原始值），但如果下游依赖 items 数组引用，就会出问题。

## 强制重算

通常不需要强制重算，但如果确实需要：

```typescript
// 方法一：修改依赖
store.items = [...store.items]

// 方法二：使用 ref 的 trigger（不推荐）
// 这需要访问内部实现，一般不建议
```

更好的做法是审视为什么需要强制重算，可能是设计问题。

## 与 watch 的区别

computed 和 watch 都响应变化，但用途不同：

```typescript
// computed：派生状态，有缓存
const double = computed(() => count.value * 2)

// watch：副作用，无缓存
watch(() => store.count, (newVal) => {
  console.log('count changed to', newVal)
})
```

getter 用于派生状态，watch 用于执行副作用（如日志、持久化、同步外部系统）。

## 调试缓存行为

开发时可以添加日志观察缓存：

```typescript
getters: {
  result(state) {
    if (__DEV__) {
      console.log('result getter executed')
    }
    return state.data.process()
  }
}
```

Vue DevTools 也可以查看 computed 的重算情况。

理解缓存机制有助于编写高性能的 getter，避免不必要的计算。下一章我们将分析带参数的 getters。
