# Composition API 风格设计

Pinia 与 Vue 3 的 Composition API 是天生的搭档。这不是事后的适配，而是从设计之初就将 Composition API 的理念融入其中。这一章我们将探讨 Pinia 如何在 API 层面与 Composition API 深度融合，以及这种设计带来的实际收益。

## Composition API 的核心理念

在深入 Pinia 之前，让我们回顾 Composition API 解决的核心问题。

Vue 2 的 Options API 按照选项类型（data、computed、methods、watch）来组织代码。当组件功能变得复杂时，一个功能的相关代码会分散在不同的选项中。比如一个搜索功能，搜索词可能在 data 中，搜索结果在 computed 中，搜索方法在 methods 中，搜索词变化的监听在 watch 中。阅读代码时需要在这些选项之间来回跳转。

Composition API 改变了这种组织方式。它允许我们按照功能来组织代码：一个 `useSearch` 函数可以包含搜索相关的所有逻辑——状态、计算属性、方法、监听器。这种"组合函数"（composable）可以在多个组件中复用，也使得代码更容易阅读和维护。

```typescript
// 按功能组织的组合函数
function useSearch() {
  const keyword = ref('')
  const results = ref([])
  const isLoading = ref(false)
  
  const hasResults = computed(() => results.value.length > 0)
  
  async function search() {
    isLoading.value = true
    results.value = await api.search(keyword.value)
    isLoading.value = false
  }
  
  watch(keyword, debounce(search, 300))
  
  return { keyword, results, isLoading, hasResults, search }
}
```

Pinia 的设计目标之一就是让状态管理与这种编程模式保持一致。

## 在组件中使用 Pinia

Pinia 的使用方式与普通的 composable 完全一致。`useStore` 函数返回一个响应式对象，可以直接在 setup 函数中使用：

```typescript
import { useUserStore } from '@/stores/user'

export default {
  setup() {
    const userStore = useUserStore()
    
    // 直接访问状态和方法
    console.log(userStore.name)
    userStore.login(credentials)
    
    // 可以在计算属性中使用
    const greeting = computed(() => `Hello, ${userStore.name}!`)
    
    // 可以在 watch 中使用
    watch(() => userStore.isLoggedIn, (loggedIn) => {
      if (!loggedIn) router.push('/login')
    })
    
    return { userStore, greeting }
  }
}
```

Store 实例是响应式的，当其中的状态变化时，依赖它的计算属性和模板会自动更新。这与 Composition API 的 reactive/ref 行为完全一致，没有任何心智负担。

需要注意的一点是解构的处理。直接解构 store 会丢失响应性：

```typescript
const { name, age } = useUserStore()
// name 和 age 现在是普通值，不会响应状态变化
```

Pinia 提供了 `storeToRefs` 工具函数来解决这个问题：

```typescript
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { name, age } = storeToRefs(userStore)
// name 和 age 现在是 ref，保持响应性

// actions 可以直接解构，因为它们不需要响应性
const { login, logout } = userStore
```

这与 Vue 的 toRefs 函数行为类似，熟悉 Composition API 的开发者可以立即理解。

## Setup Store：与 Composition API 统一的定义方式

Pinia 提供了两种定义 Store 的方式。Options Store 使用类似 Vuex 的结构，对于从 Vuex 迁移或习惯 Options API 的开发者更友好。Setup Store 则完全采用 Composition API 的风格，是更加原生的写法。

```typescript
// Setup Store 定义
export const useCounterStore = defineStore('counter', () => {
  // state 使用 ref
  const count = ref(0)
  const name = ref('Counter')
  
  // getters 使用 computed
  const doubleCount = computed(() => count.value * 2)
  const normalizedName = computed(() => name.value.toLowerCase())
  
  // actions 就是普通函数
  function increment() {
    count.value++
  }
  
  function setName(newName: string) {
    name.value = newName
  }
  
  // 可以使用 watch
  watch(count, (newCount) => {
    console.log(`Count changed to ${newCount}`)
  })
  
  // 可以使用生命周期钩子（在 SSR 场景有用）
  onUnmounted(() => {
    console.log('Store instance is being destroyed')
  })
  
  // 返回需要暴露的内容
  return {
    count,
    name,
    doubleCount,
    normalizedName,
    increment,
    setName
  }
})
```

Setup Store 的写法与组件的 setup 函数完全一致。ref 定义状态，computed 定义派生数据，普通函数定义方法。你甚至可以使用 watch、watchEffect、生命周期钩子等所有 Composition API 的能力。

这种一致性带来的好处是巨大的。首先，不需要学习新的概念——如果你会写 Composition API 组件，你就会定义 Pinia Store。其次，组件中的逻辑可以无缝抽取到 Store 中。当你发现一段组件逻辑需要在多处复用，或者需要持久化和 DevTools 支持时，可以直接把它移到 Store 中，几乎不需要修改代码结构。

## 与 Composables 的协作

Pinia Store 可以与普通的 composables 自由组合。Store 内部可以使用 composables，composables 内部也可以使用 Store。

```typescript
// composables/useNotification.ts
export function useNotification() {
  const show = (message: string) => {
    // 显示通知的逻辑
  }
  return { show }
}

// stores/user.ts
import { useNotification } from '@/composables/useNotification'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const notification = useNotification()
  
  async function login(credentials: Credentials) {
    try {
      user.value = await api.login(credentials)
      notification.show('登录成功')
    } catch (error) {
      notification.show('登录失败')
      throw error
    }
  }
  
  return { user, login }
})
```

反过来，composables 也可以使用 Store：

```typescript
// composables/useAuth.ts
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

export function useAuth() {
  const userStore = useUserStore()
  const router = useRouter()
  
  const isAuthenticated = computed(() => userStore.isLoggedIn)
  
  async function requireAuth() {
    if (!isAuthenticated.value) {
      await router.push('/login')
      return false
    }
    return true
  }
  
  return { isAuthenticated, requireAuth }
}
```

这种组合能力使得代码组织非常灵活。Store 负责核心的状态管理逻辑，composables 负责与具体场景相关的封装，两者可以自由搭配使用。

## 在 Store 之间共享逻辑

Setup Store 的另一个优势是可以在 Store 之间共享逻辑。你可以定义一个 composable，然后在多个 Store 中使用：

```typescript
// composables/useLoadingState.ts
export function useLoadingState() {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  
  async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    isLoading.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  return { isLoading, error, withLoading }
}

// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const { isLoading, error, withLoading } = useLoadingState()
  const user = ref<User | null>(null)
  
  async function fetchUser(id: string) {
    user.value = await withLoading(() => api.getUser(id))
  }
  
  return { user, isLoading, error, fetchUser }
})

// stores/product.ts
export const useProductStore = defineStore('product', () => {
  const { isLoading, error, withLoading } = useLoadingState()
  const products = ref<Product[]>([])
  
  async function fetchProducts() {
    products.value = await withLoading(() => api.getProducts())
  }
  
  return { products, isLoading, error, fetchProducts }
})
```

每个 Store 都有自己独立的 loading 和 error 状态，但处理逻辑是共享的。这种模式在 Options Store 中很难实现，你需要复制粘贴代码或者使用复杂的 mixin。

## TypeScript 与 Composition API

Setup Store 对 TypeScript 的支持尤其出色。因为每个变量和函数都有明确的类型，TypeScript 可以自动推导出 Store 的完整类型：

```typescript
// 复杂类型的 Setup Store
interface Todo {
  id: number
  title: string
  completed: boolean
}

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([])
  const filter = ref<'all' | 'active' | 'completed'>('all')
  
  const filteredTodos = computed(() => {
    switch (filter.value) {
      case 'active':
        return todos.value.filter(t => !t.completed)
      case 'completed':
        return todos.value.filter(t => t.completed)
      default:
        return todos.value
    }
  })
  
  function addTodo(title: string) {
    todos.value.push({
      id: Date.now(),
      title,
      completed: false
    })
  }
  
  function toggleTodo(id: number) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = !todo.completed
    }
  }
  
  return {
    todos,
    filter,
    filteredTodos,
    addTodo,
    toggleTodo
  }
})

// 使用时，类型完全自动推导
const todoStore = useTodoStore()
todoStore.todos        // 类型: Todo[]
todoStore.filter       // 类型: 'all' | 'active' | 'completed'
todoStore.filteredTodos // 类型: ComputedRef<Todo[]>
todoStore.addTodo('new todo') // 参数类型检查
todoStore.toggleTodo('wrong') // 错误：参数类型不匹配
```

不需要手动声明 Store 的类型，TypeScript 从你的代码中推导出所有信息。这种"类型自然流动"的体验是 Pinia 与 Composition API 结合后的最大收益之一。

## Options Store vs Setup Store

两种定义方式各有适用场景。Options Store 结构更清晰，state、getters、actions 分区明确。对于简单的 Store 或者习惯 Options API 的团队，这种方式更容易上手。

Setup Store 更灵活，可以使用所有 Composition API 的能力，可以共享逻辑，类型推导更自然。对于复杂的业务逻辑或者深度使用 TypeScript 的项目，这种方式更有优势。

两种方式定义的 Store 使用起来完全一样，可以在同一个项目中混用。选择哪种取决于团队习惯和具体场景。

下一章，我们将详细比较 Setup Store 和 Options Store 的差异，帮助你在实际项目中做出选择。
