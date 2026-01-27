# mapActions 辅助函数

mapActions 将 Store 的 actions 映射到组件的 methods。这一章分析其实现。

## 基本用法

```typescript
import { mapActions } from 'pinia'

export default {
  methods: {
    ...mapActions(useUserStore, ['login', 'logout'])
  }
}
```

模板中直接调用：

```html
<button @click="login(credentials)">登录</button>
<button @click="logout">登出</button>
```

## 实现分析

```typescript
export function mapActions<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: Array<keyof A> | Record<string, keyof A>
): _MapActionsReturn<A> | _MapActionsObjectReturn<A> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key as string] = function (
          this: ComponentPublicInstance,
          ...args: any[]
        ) {
          return useStore(this.$pinia)[key](...args)
        }
        return reduced
      }, {} as _MapActionsReturn<A>)
    : Object.keys(keysOrMapper).reduce((reduced, key) => {
        reduced[key] = function (
          this: ComponentPublicInstance,
          ...args: any[]
        ) {
          return useStore(this.$pinia)[keysOrMapper[key]](...args)
        }
        return reduced
      }, {} as _MapActionsObjectReturn<A>)
}
```

与 mapState 类似，但返回的是方法而非计算属性。

## 数组形式

```typescript
mapActions(useUserStore, ['login', 'logout', 'updateProfile'])
```

生成：

```typescript
{
  login(...args) {
    return useStore(this.$pinia).login(...args)
  },
  logout(...args) {
    return useStore(this.$pinia).logout(...args)
  },
  updateProfile(...args) {
    return useStore(this.$pinia).updateProfile(...args)
  }
}
```

## 对象形式

支持重命名：

```typescript
mapActions(useUserStore, {
  userLogin: 'login',      // 重命名
  userLogout: 'logout'
})
```

生成：

```typescript
{
  userLogin(...args) {
    return useStore(this.$pinia).login(...args)
  },
  userLogout(...args) {
    return useStore(this.$pinia).logout(...args)
  }
}
```

## 参数传递

映射的方法会正确传递参数：

```typescript
const useUserStore = defineStore('user', {
  actions: {
    login(email: string, password: string) {
      // 登录逻辑
    }
  }
})

// 组件中
methods: {
  ...mapActions(useUserStore, ['login'])
}

// 调用时参数正确传递
this.login('user@example.com', '123456')
```

## 返回值

映射的方法保留返回值：

```typescript
const useUserStore = defineStore('user', {
  actions: {
    async login(email: string, password: string) {
      const user = await api.login(email, password)
      return user
    }
  }
})

// 组件中
methods: {
  ...mapActions(useUserStore, ['login']),
  
  async handleLogin() {
    const user = await this.login(email, password)
    console.log('登录成功', user)
  }
}
```

## 异步 Action

异步 action 的映射与同步相同：

```typescript
const useOrderStore = defineStore('order', {
  actions: {
    async createOrder(items: CartItem[]) {
      const order = await api.createOrder(items)
      this.orders.push(order)
      return order
    }
  }
})

// 组件中
methods: {
  ...mapActions(useOrderStore, ['createOrder']),
  
  async checkout() {
    try {
      const order = await this.createOrder(this.cartItems)
      this.$router.push(`/order/${order.id}`)
    } catch (error) {
      this.showError(error)
    }
  }
}
```

## 类型推断

TypeScript 能正确推断参数和返回类型：

```typescript
const useUserStore = defineStore('user', {
  actions: {
    login(email: string, password: string): Promise<User> {
      // ...
    }
  }
})

export default {
  methods: {
    ...mapActions(useUserStore, ['login']),
    
    async handleLogin() {
      // 类型正确：(email: string, password: string) => Promise<User>
      const user = await this.login('a@b.com', '123')
      user.name  // 类型正确
    }
  }
}
```

## 与 Vuex 的差异

Vuex 使用模块路径：

```typescript
// Vuex
mapActions('user', ['login'])
// 或
mapActions(['user/login'])
```

Pinia 使用 Store 函数：

```typescript
// Pinia
mapActions(useUserStore, ['login'])
```

## this 绑定

映射的 action 内部 this 指向 Store：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++  // this 是 Store
    }
  }
})

// 组件中
methods: {
  ...mapActions(useCounterStore, ['increment'])
}

// 调用
this.increment()  // 组件的 this
// action 内部的 this 是 Store
```

## 实际应用

购物车组件：

```typescript
import { mapState, mapActions } from 'pinia'
import { useCartStore } from '@/stores/cart'

export default {
  name: 'ShoppingCart',
  
  computed: {
    ...mapState(useCartStore, ['items', 'total'])
  },
  
  methods: {
    ...mapActions(useCartStore, {
      add: 'addItem',
      remove: 'removeItem',
      clear: 'clearCart',
      checkout: 'processCheckout'
    }),
    
    async handleCheckout() {
      if (this.items.length === 0) {
        this.showMessage('购物车为空')
        return
      }
      
      try {
        await this.checkout()
        this.$router.push('/order-success')
      } catch (error) {
        this.showError(error)
      }
    }
  },
  
  template: `
    <div class="cart">
      <div v-for="item in items" :key="item.id">
        {{ item.name }}
        <button @click="remove(item.id)">删除</button>
      </div>
      <p>总计：{{ total }}</p>
      <button @click="clear">清空</button>
      <button @click="handleCheckout">结算</button>
    </div>
  `
}
```

## 与其他辅助函数配合

```typescript
import { mapState, mapGetters, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useUserStore, ['name']),
    ...mapGetters(useUserStore, ['isLoggedIn'])
  },
  methods: {
    ...mapActions(useUserStore, ['login', 'logout'])
  }
}
```

## 组合式 API 中的替代

在 Composition API 中直接解构 actions：

```typescript
setup() {
  const store = useUserStore()
  
  // actions 可以直接解构
  const { login, logout } = store
  
  return { login, logout }
}
```

不需要 storeToRefs，因为 actions 是方法不是响应式数据。

## 错误处理

映射的 action 可以正常抛出错误：

```typescript
const useUserStore = defineStore('user', {
  actions: {
    async login(email: string, password: string) {
      const response = await api.login(email, password)
      if (!response.ok) {
        throw new Error('登录失败')
      }
      return response.data
    }
  }
})

// 组件中
methods: {
  ...mapActions(useUserStore, ['login']),
  
  async handleLogin() {
    try {
      await this.login(this.email, this.password)
    } catch (error) {
      // 捕获 action 抛出的错误
      this.errorMessage = error.message
    }
  }
}
```

## 命名冲突

避免与组件方法冲突：

```typescript
export default {
  methods: {
    login() {
      // 组件自己的登录方法
    },
    ...mapActions(useUserStore, ['login'])  // ❌ 覆盖
  }
}
```

使用对象形式重命名：

```typescript
methods: {
  login() {
    // 组件自己的登录方法
  },
  ...mapActions(useUserStore, {
    storeLogin: 'login'  // ✅ 重命名
  })
}
```

## 注意事项

只映射存在的 action：

```typescript
// TypeScript 会检查
mapActions(useUserStore, ['nonExistent'])  // 类型错误
```

不要映射 state 或 getter：

```typescript
// ❌ name 是 state，不是 action
mapActions(useUserStore, ['name'])

// ✅ 使用 mapState
mapState(useUserStore, ['name'])
```

下一章我们将分析 mapWritableState 辅助函数。
