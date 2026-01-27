# setActivePinia 设置活跃实例

在理解 Pinia 如何管理"当前活跃的 Pinia 实例"之前，需要先理解一个问题：当你在组件中调用 `useUserStore()` 时，它如何知道应该使用哪个 Pinia 实例？

## 问题的来源

考虑这个常见的使用场景：

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', {
  state: () => ({ name: '' })
})

// SomeComponent.vue
import { useUserStore } from '@/stores/user'

export default {
  setup() {
    const userStore = useUserStore()  // 这里没有传入 pinia
    return { userStore }
  }
}
```

调用 `useUserStore()` 时没有传入任何参数，但它仍然能正确工作。这是因为 Pinia 内部维护了一个"活跃实例"的概念。

## activePinia 变量

Pinia 使用一个模块级变量来存储当前活跃的 Pinia 实例：

```typescript
// packages/pinia/src/rootStore.ts
import { Pinia } from './types'

/**
 * 当前活跃的 pinia 实例
 */
let activePinia: Pinia | undefined
```

这是一个简单的全局变量（更准确地说是模块级变量）。当需要获取 Pinia 实例时，如果没有显式传入，就会使用这个变量。

## setActivePinia 实现

setActivePinia 函数用于设置活跃实例：

```typescript
export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined {
  activePinia = pinia
  return pinia
}
```

实现非常简单，就是给 activePinia 变量赋值。这个函数在几个地方被调用。

首先是在 Pinia 安装时。当调用 `app.use(pinia)` 时，install 方法内部会调用 setActivePinia：

```typescript
install(app) {
  setActivePinia(pinia)
  pinia._a = app
  // ...
}
```

这确保了安装后，这个 Pinia 实例成为活跃实例。

其次是在测试环境中。测试库可能需要在每个测试用例中设置不同的 Pinia 实例：

```typescript
beforeEach(() => {
  const pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  setActivePinia(undefined)
})
```

第三是在 SSR 场景中。每个请求需要独立的 Pinia 实例，在处理请求时设置该请求的 Pinia 为活跃实例：

```typescript
async function renderApp() {
  const pinia = createPinia()
  setActivePinia(pinia)
  
  // 渲染应用...
}
```

## 活跃实例的使用场景

activePinia 主要在以下场景使用。

在组件 setup 中调用 useStore 时，如果没有传入 pinia 参数，会尝试获取活跃实例：

```typescript
function useStore(pinia?: Pinia) {
  // 如果在组件中，先尝试 inject
  const hasContext = hasInjectionContext()
  pinia = pinia || (hasContext ? inject(piniaSymbol) : undefined)
  
  // 使用活跃实例作为后备
  if (pinia) setActivePinia(pinia)
  pinia = getActivePinia()
  
  // ...
}
```

在 Store 定义内部访问其他 Store 时，活跃实例确保了使用正确的 Pinia：

```typescript
const useOrderStore = defineStore('order', {
  actions: {
    checkout() {
      // 这里调用时没有传入 pinia
      // 依赖 activePinia 来确定使用哪个实例
      const cartStore = useCartStore()
    }
  }
})
```

## 与 Vue inject 的关系

在组件中，Pinia 优先使用 Vue 的 inject 来获取实例，而不是直接使用 activePinia。这是因为 inject 更可靠，它与组件树绑定，确保每个组件获取的是正确的 Pinia 实例。

```typescript
function useStore(pinia?: Pinia) {
  // 首先尝试 inject
  pinia = pinia || (hasInjectionContext() ? inject(piniaSymbol) : undefined)
  
  // inject 成功后设置为活跃实例
  if (pinia) setActivePinia(pinia)
  
  // 使用活跃实例
  pinia = getActivePinia()
}
```

这种设计有几个好处。在组件上下文中，使用 inject 确保获取的是该 app 的 Pinia 实例（支持多 app 场景）。获取后设置为 activePinia，使后续的 Store 访问可以使用这个实例。

## 组件外使用的问题

activePinia 机制使得在组件外使用 Store 成为可能，但需要谨慎。

在应用启动阶段（router guard、axios interceptor 等），只要 Pinia 已安装，activePinia 就是有效的：

```typescript
// 在 router guard 中
router.beforeEach((to) => {
  const authStore = useAuthStore()  // 可以工作，使用 activePinia
  if (!authStore.isLoggedIn && to.meta.requiresAuth) {
    return '/login'
  }
})
```

但在模块初始化时（模块顶层代码），可能 Pinia 还没安装：

```typescript
// stores/user.ts
import { useSettingsStore } from './settings'

// ❌ 错误：此时 activePinia 可能是 undefined
const settings = useSettingsStore()

export const useUserStore = defineStore('user', {
  // ...
})
```

这种情况下需要延迟到运行时获取：

```typescript
export const useUserStore = defineStore('user', {
  getters: {
    // ✅ 正确：在 getter 内部获取，此时 activePinia 已设置
    theme(): string {
      return useSettingsStore().theme
    }
  }
})
```

## 测试中的隔离

在测试环境中，activePinia 的管理尤其重要。每个测试用例应该使用独立的 Pinia 实例，避免测试间的状态污染：

```typescript
import { setActivePinia, createPinia } from 'pinia'

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should have initial name', () => {
    const store = useUserStore()
    expect(store.name).toBe('')
  })
  
  it('should set name', () => {
    const store = useUserStore()
    store.name = 'Alice'
    expect(store.name).toBe('Alice')
  })
})
```

每个 `beforeEach` 创建新的 Pinia 实例并设置为活跃，确保测试用例之间隔离。

## 源码中的完整实现

完整的源码还包含开发环境的警告：

```typescript
export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined {
  activePinia = pinia
  return pinia
}

export function getActivePinia(): Pinia | undefined {
  // 尝试通过 getCurrentInstance 获取
  if (typeof getCurrentInstance === 'function') {
    const instance = getCurrentInstance()
    const provides = instance?.provides
    if (provides && piniaSymbol in provides) {
      return provides[piniaSymbol] as Pinia
    }
  }
  
  // 返回活跃实例
  return activePinia
}
```

getActivePinia 不仅返回 activePinia，还会尝试通过当前组件实例的 provides 获取。这确保了在组件上下文中总是能获取正确的 Pinia 实例。

下一章我们将详细分析 getActivePinia 的实现和使用场景。
