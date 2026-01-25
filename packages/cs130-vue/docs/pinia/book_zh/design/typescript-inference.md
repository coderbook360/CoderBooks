# TypeScript 类型推导设计

Pinia 对 TypeScript 的支持不是事后添加的补丁，而是从 API 设计之初就将类型推导作为核心考量。这一章我们将探讨 Pinia 是如何实现"零配置类型安全"的，以及在复杂场景下如何处理类型问题。

## 类型推导的基本原理

Pinia 能够自动推导 Store 类型，依赖于 TypeScript 的泛型推导能力。当你调用 defineStore 时，TypeScript 分析传入的配置对象，从中提取出所有类型信息。

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    age: 0,
    isAdmin: false
  }),
  
  getters: {
    isAdult: (state) => state.age >= 18
  },
  
  actions: {
    setName(newName: string) {
      this.name = newName
    }
  }
})
```

TypeScript 从这段代码中推导出以下信息：state 函数返回的对象类型，包含 name（string）、age（number）、isAdmin（boolean）；getters 对象的每个属性的返回类型，isAdult 是 boolean；actions 对象的每个函数的参数和返回类型，setName 接收 string 参数返回 void。

当你调用 `useUserStore()` 时，返回的对象类型是这些信息的组合。IDE 可以提供精确的自动补全，错误的属性访问或参数类型会在编译时报错。

## State 类型推导

state 函数的返回值类型决定了整个 Store 的状态结构。TypeScript 会自动推导基础类型：

```typescript
state: () => ({
  count: 0,          // 推导为 number
  name: 'default',   // 推导为 string
  isActive: true,    // 推导为 boolean
  items: [],         // 推导为 never[]（空数组）
  user: null         // 推导为 null
})
```

这里有两个常见的类型问题。首先是空数组，`[]` 会被推导为 `never[]`，无法向其中添加任何元素。其次是 null 值，单独的 `null` 不包含任何结构信息。

解决方法是使用类型断言或显式类型声明：

```typescript
interface User {
  id: number
  name: string
}

interface Item {
  id: number
  title: string
}

state: () => ({
  items: [] as Item[],           // 类型断言
  user: null as User | null,     // 联合类型
  config: undefined as Config | undefined
})

// 或者使用泛型方式
state: (): {
  items: Item[]
  user: User | null
  config: Config | undefined
} => ({
  items: [],
  user: null,
  config: undefined
})
```

第二种方式（返回类型注解）在类型复杂时更清晰，也更容易维护。

## Getters 类型推导

getters 的类型推导有一个特殊情况：当使用 this 访问其他 getter 或 state 时，必须显式声明返回类型。

```typescript
getters: {
  // 只使用 state 参数，类型自动推导
  doubleCount: (state) => state.count * 2,  // 推导为 number
  
  // 使用 this，必须声明返回类型
  tripleCount(): number {
    return this.count * 3
  },
  
  // 不声明会导致类型问题
  brokenGetter() {
    return this.count * 4  // this 的类型不完整，可能报错
  }
}
```

这个限制源于 TypeScript 的类型推导机制。在推导 getters 对象的类型时，TypeScript 需要知道 this 的类型，但 this 的类型又依赖于 getters 的类型——这形成了循环依赖。显式声明返回类型打破了这个循环。

在 Setup Store 中没有这个问题，因为不存在 this 的类型循环：

```typescript
defineStore('counter', () => {
  const count = ref(0)
  
  // 类型完全自动推导，无需手动声明
  const doubleCount = computed(() => count.value * 2)
  const tripleCount = computed(() => count.value * 3)
  const sum = computed(() => doubleCount.value + tripleCount.value)
  
  return { count, doubleCount, tripleCount, sum }
})
```

## Actions 类型推导

actions 的类型推导相对简单。每个 action 函数的参数类型和返回类型都可以被 TypeScript 自动推导或通过类型注解声明：

```typescript
actions: {
  // 参数类型注解，返回类型自动推导
  setName(newName: string) {
    this.name = newName
  },
  
  // 异步函数，返回 Promise 类型自动推导
  async fetchUser(id: number) {
    const response = await fetch(`/api/users/${id}`)
    this.user = await response.json()
    return this.user  // 返回类型推导为 Promise<User>
  },
  
  // 显式声明返回类型
  getFormattedName(): string {
    return this.name.toUpperCase()
  }
}
```

actions 中的 this 类型包含了完整的 state 和 getters，以及其他 actions。这使得在 action 内部可以安全地访问 Store 的所有成员。

## 跨 Store 访问的类型

当一个 Store 需要访问另一个 Store 时，类型推导依然有效：

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', {
  state: () => ({
    userId: '',
    name: ''
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.userId
  }
})

// stores/cart.ts
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[]
  }),
  
  actions: {
    checkout() {
      const userStore = useUserStore()
      
      // 完整的类型推导
      if (!userStore.isLoggedIn) {  // boolean
        throw new Error('Please login first')
      }
      
      return {
        userId: userStore.userId,  // string
        items: this.items
      }
    }
  }
})
```

TypeScript 知道 `useUserStore()` 返回的对象包含 userId（string）、name（string）、isLoggedIn（boolean）等成员，因此在 cartStore 的 action 中可以安全地访问它们。

## 插件扩展的类型

Pinia 插件可以给 Store 添加新的属性和方法。为了让这些扩展获得类型支持，需要使用模块扩展（Module Augmentation）：

```typescript
// plugins/persistence.ts
import { PiniaPluginContext } from 'pinia'

declare module 'pinia' {
  export interface PiniaCustomProperties {
    $persist: () => void
    $hydrate: () => void
  }
}

export function persistencePlugin({ store }: PiniaPluginContext) {
  store.$persist = () => {
    localStorage.setItem(store.$id, JSON.stringify(store.$state))
  }
  
  store.$hydrate = () => {
    const saved = localStorage.getItem(store.$id)
    if (saved) {
      store.$patch(JSON.parse(saved))
    }
  }
}
```

通过声明 `PiniaCustomProperties` 接口，所有 Store 实例都会获得 `$persist` 和 `$hydrate` 方法的类型信息。

如果插件需要基于 Store 的配置来决定行为，可以使用 `PiniaCustomStateProperties`：

```typescript
declare module 'pinia' {
  export interface PiniaCustomStateProperties<S> {
    // S 是 Store 的 state 类型
    $reset: () => void
  }
  
  export interface DefineStoreOptionsBase<S, Store> {
    // 添加自定义选项
    persist?: boolean | { key?: string; paths?: (keyof S)[] }
  }
}
```

## Setup Store 的类型优势

Setup Store 在类型方面有明显优势。因为它使用 Composition API 的原语，每个变量和函数的类型都是独立推导的，不存在 Options Store 中 this 类型循环的问题：

```typescript
export const useAdvancedStore = defineStore('advanced', () => {
  // 复杂类型完全自动推导
  const items = ref<Map<string, Item>>(new Map())
  
  const sortedItems = computed(() => {
    return Array.from(items.value.values())
      .sort((a, b) => a.order - b.order)
  })
  
  // 泛型函数
  function getItem<K extends string>(key: K) {
    return items.value.get(key)
  }
  
  // 高阶函数
  function createAction(prefix: string) {
    return (id: number) => `${prefix}-${id}`
  }
  
  // 返回的类型完全正确
  return { items, sortedItems, getItem, createAction }
})

// 使用时
const store = useAdvancedStore()
store.items           // Map<string, Item>
store.sortedItems     // Item[]
store.getItem('key')  // Item | undefined
store.createAction('test')  // (id: number) => string
```

这种类型灵活性在 Options Store 中很难实现。

## 处理类型问题的技巧

在实际开发中，有时会遇到类型推导不够精确的情况。这里是一些处理技巧。

当类型过于宽泛时，使用 as const 收窄：

```typescript
state: () => ({
  status: 'idle' as const,  // 'idle' 而非 string
  type: 'primary' as 'primary' | 'secondary'  // 联合类型
})
```

当需要复杂的初始状态类型时，单独定义接口：

```typescript
interface StoreState {
  user: User | null
  permissions: Set<string>
  cache: Map<string, CacheEntry>
}

const useMyStore = defineStore('my', {
  state: (): StoreState => ({
    user: null,
    permissions: new Set(),
    cache: new Map()
  })
})
```

当从外部数据源获取数据时，使用类型守卫确保安全：

```typescript
actions: {
  async fetchData() {
    const response = await fetch('/api/data')
    const data: unknown = await response.json()
    
    // 类型守卫确保数据结构正确
    if (isValidData(data)) {
      this.data = data
    } else {
      throw new Error('Invalid data format')
    }
  }
}

function isValidData(data: unknown): data is ExpectedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  )
}
```

Pinia 的类型系统设计使得在大多数场景下不需要手动类型声明，同时在复杂场景下保留了完全的类型控制能力。这种平衡是经过精心设计的，体现了 Pinia "简单场景简单处理，复杂场景保留灵活性" 的设计哲学。

下一章，我们将探讨 Pinia 的模块化 Store 设计，看看它如何用扁平化的方式解决大型应用的状态组织问题。
