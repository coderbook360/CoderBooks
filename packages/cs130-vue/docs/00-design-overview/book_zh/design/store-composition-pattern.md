# Store 组合模式设计

Pinia 的一个核心设计理念是 store 之间的组合。相比 Vuex 的模块嵌套，Pinia 采用了更灵活的组合模式。

## 从模块到组合

Vuex 的模块是树状结构。子模块嵌套在父模块中，通过 rootState 和 rootGetters 访问其他模块：

```javascript
// Vuex 模块访问其他模块
const cartModule = {
  namespaced: true,
  actions: {
    checkout({ state, rootState, rootGetters }) {
      if (!rootGetters['user/isLoggedIn']) {
        throw new Error('请先登录')
      }
      // ...
    }
  }
}
```

这种设计有几个问题。字符串路径容易写错，没有类型检查。模块间的依赖是隐式的，不易追踪。循环依赖难以处理。

Pinia 的 store 是扁平的，通过函数调用组合：

```javascript
// Pinia store 组合
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  actions: {
    checkout() {
      const user = useUserStore()
      if (!user.isLoggedIn) {
        throw new Error('请先登录')
      }
      // ...
    }
  }
})
```

依赖通过 import 声明，是显式的。TypeScript 提供完整的类型检查。循环依赖由 JavaScript 模块系统处理。

## setup 风格的组合

使用 setup 语法定义的 store 可以更自然地组合逻辑：

```javascript
export const useCartStore = defineStore('cart', () => {
  const user = useUserStore()
  
  const items = ref([])
  const total = computed(() => 
    items.value.reduce((sum, item) => sum + item.price, 0)
  )
  
  async function checkout() {
    if (!user.isLoggedIn) {
      throw new Error('请先登录')
    }
    await api.checkout(items.value)
    items.value = []
  }
  
  return { items, total, checkout }
})
```

这种风格与组件的 setup 函数完全一致。可以使用任何 Composition API 特性，包括 watch、watchEffect、生命周期钩子等。

## 共享逻辑的 Composables

有些逻辑是多个 store 共用的。可以提取为 composables，在 store 中复用：

```javascript
// composables/useAsyncState.js
export function useAsyncState(fetcher) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  async function execute(...args) {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher(...args)
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }
  
  return { data, loading, error, execute }
}

// 在 store 中使用
export const useProductStore = defineStore('product', () => {
  const { 
    data: products, 
    loading, 
    error, 
    execute: fetchProducts 
  } = useAsyncState(api.getProducts)
  
  return { products, loading, error, fetchProducts }
})
```

这种组合方式让代码复用更加灵活。composables 不仅可以在组件中使用，也可以在 store 中使用。

## 跨 Store 的响应式连接

Pinia store 返回的是响应式对象。可以在一个 store 中 watch 另一个 store 的状态变化：

```javascript
export const useNotificationStore = defineStore('notification', () => {
  const messages = ref([])
  
  const user = useUserStore()
  
  // 监听用户登录状态变化
  watch(
    () => user.isLoggedIn,
    (isLoggedIn) => {
      if (isLoggedIn) {
        messages.value.push({
          type: 'success',
          text: `欢迎回来，${user.name}！`
        })
      }
    }
  )
  
  return { messages }
})
```

这种响应式连接让 store 之间可以自动协调。不需要在 actions 中显式调用其他 store 的方法。

## Store 工厂模式

有时候需要创建多个相似的 store 实例。可以使用工厂函数：

```javascript
// 创建带参数的 store 工厂
function createItemStore(name, api) {
  return defineStore(name, () => {
    const items = ref([])
    const loading = ref(false)
    
    async function fetch() {
      loading.value = true
      items.value = await api.getAll()
      loading.value = false
    }
    
    return { items, loading, fetch }
  })
}

// 创建具体的 store
export const useProductStore = createItemStore('product', productApi)
export const useOrderStore = createItemStore('order', orderApi)
```

这种模式避免了重复代码，同时保持了每个 store 的独立性。

## 依赖注入的考量

在 store 中使用其他 store 时，需要注意调用时机。store 的 getter 和 action 是在运行时执行的，此时其他 store 已经可用。

```javascript
// 正确：在 action 中获取其他 store
export const useCartStore = defineStore('cart', {
  actions: {
    checkout() {
      const user = useUserStore()  // 运行时获取
      // ...
    }
  }
})

// setup 语法中也是安全的
export const useCartStore = defineStore('cart', () => {
  const user = useUserStore()  // store 初始化时获取
  // ...
})
```

但要避免循环依赖。如果 A store 依赖 B store，B store 又依赖 A store，需要重新审视设计。可能需要提取共享逻辑到第三个 store 或 composable。

## 组合的边界

并非所有逻辑都应该放在 store 中。以下是一些判断标准：

**适合放在 store 中**：
- 需要在多个组件间共享的状态
- 需要持久化或与后端同步的数据
- 应用级的业务逻辑

**适合放在 composable 中**：
- 可复用但不需要共享状态的逻辑
- 与 UI 交互紧密相关的逻辑
- 纯工具性的函数

**适合放在组件中**：
- 只在单个组件使用的局部状态
- 与组件生命周期紧密相关的逻辑

这种分层让代码组织更清晰。store 处理全局状态，composable 处理可复用逻辑，组件处理 UI 逻辑。

## 测试的便利性

组合模式让 store 更容易测试。可以单独测试每个 store，也可以 mock 依赖的 store：

```javascript
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart'
import { useUserStore } from './user'

describe('CartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('checkout requires login', () => {
    const cart = useCartStore()
    const user = useUserStore()
    
    user.isLoggedIn = false  // 直接修改状态
    
    expect(() => cart.checkout()).toThrow('请先登录')
  })
})
```

扁平化的 store 结构和直接的状态访问让测试代码更简洁，不需要复杂的 mock 设置。
