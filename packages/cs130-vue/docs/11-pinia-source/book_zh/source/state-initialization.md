# state 初始化流程

状态初始化是 Store 创建的关键步骤。这一章我们追踪状态从定义到可用的完整流程。

## Options Store 的初始化

Options Store 通过 state 函数定义初始状态：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    age: 0,
    profile: null
  })
})
```

createOptionsStore 处理这个 state 函数：

```typescript
function createOptionsStore(id, options, pinia, hot) {
  const { state, actions, getters } = options
  
  // 读取可能已存在的状态（SSR hydration）
  const initialState = pinia.state.value[id]

  function setup() {
    // 初始化状态到 pinia.state.value
    if (!initialState && (!__DEV__ || !hot)) {
      pinia.state.value[id] = state ? state() : {}
    }

    // 创建对 pinia.state.value[id] 的 ref 引用
    const localState = toRefs(pinia.state.value[id])
    
    return assign(localState, actions, /* getters */)
  }

  return createSetupStore(id, setup, options, pinia, hot, true)
}
```

流程是：先将状态存入全局状态树，然后用 toRefs 创建各属性的引用。

## toRefs 的作用

toRefs 将 reactive 对象转换为包含 ref 的普通对象：

```typescript
const state = reactive({ name: 'Alice', age: 25 })
const refs = toRefs(state)

// refs = { name: Ref<string>, age: Ref<number> }

// 修改 ref 会同步到原 reactive
refs.name.value = 'Bob'
console.log(state.name)  // 'Bob'

// 修改原 reactive 也会同步到 ref
state.age = 30
console.log(refs.age.value)  // 30
```

这确保了 setup 返回的状态引用与 `pinia.state.value[id]` 保持同步。

## Setup Store 的初始化

Setup Store 直接返回响应式值：

```typescript
const useUserStore = defineStore('user', () => {
  const name = ref('')
  const age = ref(0)
  const profile = reactive({ avatar: '', bio: '' })
  
  return { name, age, profile }
})
```

createSetupStore 处理这些值：

```typescript
function createSetupStore(id, setup, options, pinia, hot, isOptionsStore) {
  // 为 Setup Store 创建状态占位
  if (!isOptionsStore && !pinia.state.value[id]) {
    pinia.state.value[id] = {}
  }

  // 运行 setup
  const setupStore = scope.run(setup)

  // 同步状态到 pinia.state.value
  for (const key in setupStore) {
    const prop = setupStore[key]

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      if (!isOptionsStore) {
        // SSR hydration
        if (initialState && shouldHydrate(prop)) {
          if (isRef(prop)) {
            prop.value = initialState[key]
          } else {
            mergeReactiveObjects(prop, initialState[key])
          }
        }
        
        // 同步到全局状态树
        pinia.state.value[id][key] = prop
      }
    }
  }
}
```

## 区分状态和其他返回值

createSetupStore 需要区分 setup 返回的不同类型：

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]

  if (isRef(prop) && !isComputed(prop)) {
    // ref 类型的状态
  } else if (isReactive(prop)) {
    // reactive 类型的状态
  } else if (typeof prop === 'function') {
    // action
  } else if (isComputed(prop)) {
    // getter (computed)
  }
}
```

computed 虽然也是 ref，但不应该被当作状态处理，所以用 `!isComputed(prop)` 排除。

## 初始化时机

状态初始化发生在 useStore 首次调用时：

```typescript
function useStore(pinia) {
  if (!pinia._s.has(id)) {
    // Store 不存在，创建它
    if (isSetupStore) {
      createSetupStore(id, setup, options, pinia)
    } else {
      createOptionsStore(id, options, pinia)
    }
  }
  
  return pinia._s.get(id)
}
```

这意味着：

应用启动时，没有任何 Store 被创建。只有当组件首次调用 useStore 时，该 Store 才会初始化。

```typescript
// main.ts
const app = createApp(App)
app.use(pinia)  // 此时没有 Store 被创建

// UserProfile.vue
const userStore = useUserStore()  // 此时 user Store 被创建

// OrderList.vue  
const userStore = useUserStore()  // 返回已存在的 Store
```

## 多个 Store 的初始化顺序

Store 之间可能存在依赖：

```typescript
const useUserStore = defineStore('user', () => {
  const name = ref('')
  return { name }
})

const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()  // 依赖 user Store
  
  const orders = ref([])
  
  return { orders, userName: userStore.name }
})
```

当 useOrderStore 首次调用时：

1. 检查 order Store 是否存在，不存在
2. 运行 order 的 setup 函数
3. setup 中调用 useUserStore
4. 检查 user Store 是否存在，不存在
5. 创建并初始化 user Store
6. useUserStore 返回 user Store
7. 继续 order 的 setup
8. 创建并初始化 order Store

依赖的 Store 会被自动初始化。

## 循环依赖处理

如果两个 Store 互相依赖：

```typescript
const useStoreA = defineStore('a', () => {
  const storeB = useStoreB()  // 依赖 B
  return { fromB: storeB.value }
})

const useStoreB = defineStore('b', () => {
  const storeA = useStoreA()  // 依赖 A
  return { fromA: storeA.value }
})
```

这会导致无限循环。Pinia 的解决方式是要求在 actions 或 getters 中延迟访问：

```typescript
const useStoreA = defineStore('a', () => {
  const value = ref(0)
  
  function doSomething() {
    // 在 action 中访问，此时 B 已初始化
    const storeB = useStoreB()
    return storeB.value
  }
  
  return { value, doSomething }
})
```

## 状态的类型推断

TypeScript 从初始化值推断状态类型：

```typescript
// Options Store
const useStore = defineStore('demo', {
  state: () => ({
    count: 0,           // number
    name: '',           // string
    items: [] as Item[] // Item[]，需要类型断言
  })
})

// Setup Store
const useStore = defineStore('demo', () => {
  const count = ref(0)                    // Ref<number>
  const name = ref<string>('')            // Ref<string>
  const items = ref<Item[]>([])           // Ref<Item[]>
  
  return { count, name, items }
})
```

Setup Store 的类型推断通常更精确，因为可以直接使用泛型参数。

## 初始化的错误处理

setup 函数中的错误会导致 Store 创建失败：

```typescript
const useStore = defineStore('demo', () => {
  // 如果这里抛出错误
  const data = someRiskyOperation()  // 可能抛错
  
  return { data }
})

try {
  const store = useStore()
} catch (e) {
  // Store 创建失败
}
```

失败的 Store 不会被注册到 `pinia._s`，下次调用会重新尝试创建。

## 惰性初始化模式

如果某些状态初始化代价很高，可以使用惰性初始化：

```typescript
const useStore = defineStore('demo', () => {
  // 惰性初始化
  const heavyData = shallowRef(null)
  
  async function loadHeavyData() {
    if (!heavyData.value) {
      heavyData.value = await fetchHeavyData()
    }
    return heavyData.value
  }
  
  return { heavyData, loadHeavyData }
})
```

shallowRef 确保大数据对象不被深层代理，loadHeavyData 仅在需要时加载。

理解初始化流程对于控制 Store 的生命周期和优化性能非常重要。下一章我们将分析状态属性的访问机制。
