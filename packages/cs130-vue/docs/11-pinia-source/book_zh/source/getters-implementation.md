# getters 实现机制

Getters 是 Store 的计算属性，基于 Vue 的 computed 实现。这一章分析 getters 的内部实现。

## 两种定义方式

Options Store 中定义 getters：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    double: (state) => state.count * 2,
    quadruple() {
      return this.double * 2
    }
  }
})
```

Setup Store 中直接使用 computed：

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  
  const double = computed(() => count.value * 2)
  const quadruple = computed(() => double.value * 2)
  
  return { count, double, quadruple }
})
```

两种方式最终都基于 Vue 的 computed。

## Options Store 的 getters 转换

createOptionsStore 将 getters 转换为 computed：

```typescript
function setup() {
  const localState = toRefs(pinia.state.value[id])

  return assign(
    localState,
    actions,
    Object.keys(getters || {}).reduce((computedGetters, name) => {
      computedGetters[name] = markRaw(
        computed(() => {
          setActivePinia(pinia)
          const store = pinia._s.get(id)!
          return getters![name].call(store, store)
        })
      )
      return computedGetters
    }, {} as Record<string, ComputedRef>)
  )
}
```

遍历 getters 对象，为每个 getter 创建一个 computed。

## this 和 state 参数

Options Store 的 getter 有两种访问状态的方式：

```typescript
getters: {
  // 通过参数访问（TypeScript 友好）
  double: (state) => state.count * 2,
  
  // 通过 this 访问（可以访问其他 getters）
  quadruple() {
    return this.double * 2
  }
}
```

这是通过 call 实现的：

```typescript
getters![name].call(store, store)
// this = store, 第一个参数 = store
```

store 既作为 this 上下文，也作为第一个参数传入。

## markRaw 的作用

computed 被 markRaw 标记：

```typescript
computedGetters[name] = markRaw(computed(...))
```

markRaw 告诉 Vue 不要对这个值进行响应式代理。这避免了 computed 被包裹在额外的 Proxy 中，减少不必要的开销。

## setActivePinia 调用

getter 执行前设置 activePinia：

```typescript
computed(() => {
  setActivePinia(pinia)
  const store = pinia._s.get(id)!
  return getters![name].call(store, store)
})
```

这确保了 getter 内部如果调用其他 useStore，能正确获取到 pinia 实例。

## Setup Store 的 getters

Setup Store 直接返回 computed：

```typescript
const useStore = defineStore('demo', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  return { count, double }
})
```

createSetupStore 识别 computed 类型：

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]

  if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
    // 状态，同步到 pinia.state.value
  } else if (typeof prop === 'function') {
    // action，包装
  }
  // computed 不需要特殊处理，直接合并到 store
}
```

computed 既不是普通状态，也不是函数，直接被合并到 Store 对象。

## 自动解包

Store 被 reactive 包装后，computed 自动解包：

```typescript
const store = useStore()

// computed 自动解包
console.log(store.double)  // 数字，不是 ComputedRef

// 内部实际是
console.log(store._double.value)
```

## 依赖追踪

computed 的依赖追踪由 Vue 处理：

```typescript
const double = computed(() => count.value * 2)

count.value = 5
// double 自动更新为 10
```

访问 double 时，Vue 追踪到它依赖 count。当 count 变化时，标记 double 需要重新计算。

## 访问其他 getters

getters 可以互相访问：

```typescript
// Options Store
getters: {
  double: (state) => state.count * 2,
  quadruple() {
    return this.double * 2  // 通过 this 访问
  }
}

// Setup Store
const double = computed(() => count.value * 2)
const quadruple = computed(() => double.value * 2)  // 直接引用
```

依赖链自动建立，任一环节变化会触发整个链条更新。

## 访问其他 Store 的 getters

getter 可以访问其他 Store：

```typescript
// Options Store
getters: {
  combinedValue() {
    const otherStore = useOtherStore()
    return this.value + otherStore.value
  }
}

// Setup Store
const useStore = defineStore('demo', () => {
  const otherStore = useOtherStore()
  
  const combinedValue = computed(() => {
    return value.value + otherStore.value
  })
  
  return { combinedValue }
})
```

Setup Store 中更推荐在 setup 顶层获取其他 Store，而不是在 computed 内部。

## DevTools 集成

DevTools 可以显示 getters 的值和依赖：

```typescript
// createSetupStore 内部
if (__DEV__) {
  store._hmrPayload = {
    getters: {},
    // ...
  }
}
```

_hmrPayload 存储了 getter 信息，供 DevTools 读取。

## 性能考量

computed 有惰性求值特性：

```typescript
const expensive = computed(() => {
  console.log('computing...')
  return heavyCalculation(state.data)
})

// 不访问就不计算
const store = useStore()

// 访问时才计算
console.log(store.expensive)  // 输出：computing...

// 依赖未变化，不重新计算
console.log(store.expensive)  // 不输出 computing...
```

这种惰性特性意味着未使用的 getter 不会产生计算开销。

## 类型推断

TypeScript 能从 getter 定义推断返回类型：

```typescript
// Options Store
getters: {
  double: (state) => state.count * 2  // number
}

// Setup Store
const double = computed(() => count.value * 2)  // ComputedRef<number>

// 使用时
const store = useStore()
store.double  // number（自动解包）
```

Options Store 的类型推断依赖于 TypeScript 对 getter 函数返回值的分析。

## 常见模式

过滤和映射：

```typescript
getters: {
  activeItems: (state) => state.items.filter(i => i.active),
  itemNames: (state) => state.items.map(i => i.name)
}
```

聚合计算：

```typescript
getters: {
  total: (state) => state.items.reduce((sum, i) => sum + i.price, 0),
  averagePrice() {
    return this.total / this.items.length
  }
}
```

条件值：

```typescript
getters: {
  status: (state) => {
    if (state.count > 100) return 'high'
    if (state.count > 50) return 'medium'
    return 'low'
  }
}
```

下一章我们将深入分析 getters 的缓存机制。
