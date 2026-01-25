# Setup Store vs Options Store

Pinia 提供两种定义 Store 的方式，它们在语法风格和能力边界上有明显差异。这一章我们将深入对比两种方式，帮助你理解各自的优劣，从而在实际项目中做出合适的选择。

## 语法结构对比

Options Store 采用对象配置的方式，通过 state、getters、actions 三个属性来组织代码。这种结构与 Vuex 和 Vue 的 Options API 风格一致：

```typescript
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  
  getters: {
    doubleCount: (state) => state.count * 2,
    
    // 使用 this 访问其他 getter
    quadrupleCount(): number {
      return this.doubleCount * 2
    }
  },
  
  actions: {
    increment() {
      this.count++
    },
    
    async fetchAndSet(id: number) {
      const data = await api.fetch(id)
      this.count = data.count
    }
  }
})
```

Setup Store 采用函数的方式，函数体内使用 Composition API 的原语。这种结构与 Vue 3 的 `<script setup>` 风格一致：

```typescript
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const name = ref('Counter')
  
  const doubleCount = computed(() => count.value * 2)
  const quadrupleCount = computed(() => doubleCount.value * 2)
  
  function increment() {
    count.value++
  }
  
  async function fetchAndSet(id: number) {
    const data = await api.fetch(id)
    count.value = data.count
  }
  
  return { count, name, doubleCount, quadrupleCount, increment, fetchAndSet }
})
```

两段代码实现的功能完全相同，使用方式也完全相同。区别仅在于定义的语法风格。

## 状态定义的差异

Options Store 的 state 必须是一个返回对象的函数。这个设计是为了确保每个 Store 实例有独立的状态副本，避免状态在多个组件间意外共享：

```typescript
// Options Store：state 必须是函数
state: () => ({
  count: 0,
  items: []
})
```

Setup Store 使用 ref 或 reactive 定义状态。因为整个 setup 函数每次调用都会执行，状态自然是独立的：

```typescript
// Setup Store：使用 ref 或 reactive
const count = ref(0)
const items = ref<string[]>([])

// 也可以使用 reactive
const state = reactive({
  count: 0,
  items: [] as string[]
})
```

Setup Store 在状态定义上更灵活。你可以选择 ref 还是 reactive，可以将相关状态分组，可以使用更复杂的初始化逻辑。

## Getters 与 Computed 的映射

Options Store 的 getters 会自动获得缓存能力，它们在内部被转换为 computed：

```typescript
getters: {
  // 基础 getter，接收 state 作为参数
  doubleCount: (state) => state.count * 2,
  
  // 使用 this 访问其他 getter 或 state
  // 注意：使用 this 时必须显式声明返回类型
  message(): string {
    return `Count is ${this.count}, double is ${this.doubleCount}`
  },
  
  // getter 返回函数（用于接收参数的场景）
  getItemById: (state) => {
    return (id: number) => state.items.find(item => item.id === id)
  }
}
```

Setup Store 直接使用 computed，语义更加直接：

```typescript
const doubleCount = computed(() => count.value * 2)

const message = computed(() => 
  `Count is ${count.value}, double is ${doubleCount.value}`
)

// 接收参数的"getter"，实际上就是一个返回计算属性或函数的 computed
const getItemById = computed(() => {
  // 如果需要缓存查找结果，可以在这里构建索引
  const itemMap = new Map(items.value.map(item => [item.id, item]))
  return (id: number) => itemMap.get(id)
})
```

Setup Store 的优势在于你可以在 computed 内部执行任何逻辑，比如构建索引、进行预处理等。Options Store 的 getter 函数虽然也能做到，但语法上不太自然。

## Actions 的实现差异

Options Store 的 actions 通过 this 访问 state 和其他 actions。this 在运行时会被正确绑定：

```typescript
actions: {
  increment() {
    this.count++
  },
  
  async loadData() {
    this.isLoading = true
    try {
      const data = await api.fetch()
      this.items = data.items
    } finally {
      this.isLoading = false
    }
  },
  
  // 调用其他 action
  reset() {
    this.count = 0
    this.loadData()
  }
}
```

Setup Store 的 actions 就是普通函数，直接操作 ref 的 value：

```typescript
function increment() {
  count.value++
}

async function loadData() {
  isLoading.value = true
  try {
    const data = await api.fetch()
    items.value = data.items
  } finally {
    isLoading.value = false
  }
}

function reset() {
  count.value = 0
  loadData()
}
```

Setup Store 的函数更容易测试，因为它们不依赖 this 绑定。你可以直接调用函数，不需要关心上下文。

## TypeScript 类型推导的差异

这是两种方式差异最大的地方。

Options Store 的类型推导需要一些技巧。最明显的问题是 getters 中使用 this 时必须显式声明返回类型，否则 TypeScript 无法推导：

```typescript
getters: {
  // 不使用 this，类型自动推导
  doubleCount: (state) => state.count * 2,  // 推导为 number
  
  // 使用 this，必须手动声明返回类型
  tripleCount(): number {  // 必须写 : number
    return this.count * 3
  },
  
  // 如果不写返回类型，TypeScript 会报错或推导为 any
  broken() {
    return this.count * 3  // 可能出现类型问题
  }
}
```

Setup Store 的类型推导完全自动。每个变量和函数的类型由 TypeScript 从代码中推导：

```typescript
const count = ref(0)  // 推导为 Ref<number>
const doubleCount = computed(() => count.value * 2)  // 推导为 ComputedRef<number>

function increment() {  // 推导为 () => void
  count.value++
}

// 返回类型自动推导，无需手动声明
return { count, doubleCount, increment }
```

对于深度使用 TypeScript 的项目，Setup Store 的类型体验明显更好。

## 使用 Watch 和生命周期钩子

Options Store 无法直接使用 watch 和生命周期钩子。如果需要监听状态变化，必须在组件中或者通过 $subscribe 实现：

```typescript
// Options Store 无法在定义时使用 watch
// 需要在组件中监听
const store = useCounterStore()
watch(() => store.count, (newVal) => {
  console.log('count changed:', newVal)
})

// 或使用 $subscribe
store.$subscribe((mutation, state) => {
  console.log('state changed:', state)
})
```

Setup Store 可以直接使用所有 Composition API：

```typescript
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  
  // 直接使用 watch
  watch(count, (newVal, oldVal) => {
    console.log(`count changed from ${oldVal} to ${newVal}`)
  })
  
  // 使用 watchEffect
  watchEffect(() => {
    localStorage.setItem('counter', String(count.value))
  })
  
  // 使用生命周期钩子（在 SSR 场景特别有用）
  onMounted(() => {
    console.log('Store mounted in component')
  })
  
  return { count }
})
```

这种能力使得 Setup Store 可以实现更复杂的响应式逻辑，比如自动同步到 localStorage、防抖处理、依赖其他异步资源等。

## 逻辑复用的差异

Options Store 的逻辑复用比较困难。虽然可以将公共配置抽取为函数，但语法不太自然：

```typescript
// 尝试复用 loading 逻辑（不太优雅）
function createLoadingActions(fetchFn: () => Promise<any>) {
  return {
    isLoading: false,
    error: null as Error | null,
    async load() {
      this.isLoading = true
      try {
        return await fetchFn()
      } catch (e) {
        this.error = e as Error
      } finally {
        this.isLoading = false
      }
    }
  }
}

// 使用时需要合并
const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    ...createLoadingActions(() => api.getUser()).state  // 行不通
  })
})
```

Setup Store 可以直接使用 composables：

```typescript
// 可复用的 composable
function useAsyncData<T>(fetchFn: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  
  async function load() {
    isLoading.value = true
    error.value = null
    try {
      data.value = await fetchFn()
    } catch (e) {
      error.value = e as Error
    } finally {
      isLoading.value = false
    }
  }
  
  return { data, isLoading, error, load }
}

// 在 Store 中使用
export const useUserStore = defineStore('user', () => {
  const { data: user, isLoading, error, load: fetchUser } = useAsyncData(
    () => api.getUser()
  )
  
  return { user, isLoading, error, fetchUser }
})

export const useProductStore = defineStore('product', () => {
  const { data: products, isLoading, error, load: fetchProducts } = useAsyncData(
    () => api.getProducts()
  )
  
  return { products, isLoading, error, fetchProducts }
})
```

这种复用模式是 Composition API 的核心优势，Setup Store 完美继承了这一点。

## 如何选择

两种方式各有适用场景。Options Store 适合以下情况：结构简单的 Store，主要是状态和一些基础方法；团队习惯 Options API 或从 Vuex 迁移；不需要复杂的响应式逻辑和类型推导。

Setup Store 适合以下情况：需要使用 watch、watchEffect 等高级响应式特性；需要在多个 Store 间复用逻辑；深度使用 TypeScript，需要完美的类型推导；Store 逻辑复杂，需要灵活的代码组织。

两种方式可以在同一个项目中混用，Pinia 对此没有限制。你可以对简单的 Store 使用 Options 风格，对复杂的 Store 使用 Setup 风格。随着项目发展，也可以逐步将 Options Store 迁移为 Setup Store。

下一章，我们将探讨 Pinia 的 TypeScript 类型推导设计，深入理解它是如何实现"零配置类型安全"的。
