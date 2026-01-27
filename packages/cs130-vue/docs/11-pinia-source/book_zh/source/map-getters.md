# mapGetters 辅助函数

mapGetters 用于映射 Store 中的 getters 到组件的计算属性。这一章分析其实现，以及它与 mapState 的关系。

## 基本用法

```typescript
import { mapGetters } from 'pinia'

export default {
  computed: {
    ...mapGetters(useUserStore, ['fullName', 'isAdult'])
  }
}
```

## 实现真相

查看 Pinia 源码会发现：

```typescript
export const mapGetters = mapState
```

mapGetters 就是 mapState 的别名。这是因为在 Store 实例上，state 和 getters 都是属性，访问方式相同。

## 为什么需要别名

虽然实现相同，但语义不同：

```typescript
export default {
  computed: {
    // 语义清晰：这些是状态
    ...mapState(useUserStore, ['name', 'age']),
    
    // 语义清晰：这些是计算属性
    ...mapGetters(useUserStore, ['fullName', 'isAdult'])
  }
}
```

提供 mapGetters 是为了代码可读性和与 Vuex 的兼容性。

## 数组形式

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    firstName: 'John',
    lastName: 'Doe'
  }),
  getters: {
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    initials: (state) => `${state.firstName[0]}${state.lastName[0]}`
  }
})

// 映射 getters
mapGetters(useUserStore, ['fullName', 'initials'])
```

## 对象形式

```typescript
mapGetters(useUserStore, {
  // 重命名
  userName: 'fullName',
  
  // 自定义函数
  greetings: (store) => `Hello, ${store.fullName}!`
})
```

## 混合使用

由于实现相同，可以混合映射 state 和 getters：

```typescript
// 这样是合法的
mapState(useUserStore, ['name', 'fullName'])  // name 是 state，fullName 是 getter

// 等同于
mapGetters(useUserStore, ['name', 'fullName'])
```

但为了语义清晰，建议分开使用：

```typescript
computed: {
  ...mapState(useUserStore, ['name', 'age']),
  ...mapGetters(useUserStore, ['fullName', 'isAdult'])
}
```

## 类型推断

TypeScript 能正确推断 getter 类型：

```typescript
const useUserStore = defineStore('user', {
  getters: {
    fullName(): string { return 'John Doe' },
    age(): number { return 25 }
  }
})

export default {
  computed: {
    ...mapGetters(useUserStore, ['fullName', 'age'])
  },
  methods: {
    example() {
      this.fullName  // string
      this.age       // number
    }
  }
}
```

## 与 Vuex 的差异

Vuex 的 mapGetters 需要模块路径：

```typescript
// Vuex
mapGetters('user', ['fullName'])
// 或全局
mapGetters(['user/fullName'])
```

Pinia 直接传入 Store 函数：

```typescript
// Pinia
mapGetters(useUserStore, ['fullName'])
```

更加类型安全。

## 带参数的 Getter

如果 getter 返回函数：

```typescript
const useUserStore = defineStore('user', {
  getters: {
    getUserById: (state) => (id: number) => {
      return state.users.find(u => u.id === id)
    }
  }
})
```

映射后需要调用：

```typescript
export default {
  computed: {
    ...mapGetters(useUserStore, ['getUserById'])
  },
  methods: {
    findUser(id: number) {
      return this.getUserById(id)  // 调用返回的函数
    }
  }
}
```

## 跨 Store Getter

映射使用其他 Store 的 getter：

```typescript
const useCartStore = defineStore('cart', {
  getters: {
    totalWithDiscount() {
      const userStore = useUserStore()
      const discount = userStore.isVip ? 0.9 : 1
      return this.total * discount
    }
  }
})

// 映射时会自动处理依赖
mapGetters(useCartStore, ['totalWithDiscount'])
```

## 实际应用

商品列表组件：

```typescript
import { mapState, mapGetters } from 'pinia'
import { useProductStore } from '@/stores/product'

export default {
  name: 'ProductList',
  
  computed: {
    ...mapState(useProductStore, ['loading', 'error']),
    ...mapGetters(useProductStore, {
      products: 'filteredProducts',
      count: 'productCount',
      hasProducts: (store) => store.products.length > 0
    })
  },
  
  template: `
    <div v-if="loading">加载中...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="!hasProducts">暂无商品</div>
    <div v-else>
      <p>共 {{ count }} 件商品</p>
      <div v-for="product in products" :key="product.id">
        {{ product.name }}
      </div>
    </div>
  `
}
```

## 响应性

映射的 getter 保持响应性：

```typescript
export default {
  computed: {
    ...mapGetters(useCartStore, ['total'])
  }
}
```

当 cart 中的商品变化时，total 自动更新。

## 性能

getter 的缓存特性通过 computed 保持：

```typescript
const useStore = defineStore('test', {
  getters: {
    expensiveCalculation: (state) => {
      // 复杂计算
      return state.items.reduce((sum, item) => sum + item.value, 0)
    }
  }
})

// 映射后同样具有缓存
computed: {
  ...mapGetters(useStore, ['expensiveCalculation'])
}

// 多次访问只计算一次
this.expensiveCalculation  // 计算
this.expensiveCalculation  // 缓存
```

## 命名冲突

避免与组件自有属性冲突：

```typescript
export default {
  data() {
    return {
      fullName: 'local'  // ❌ 与 getter 冲突
    }
  },
  computed: {
    ...mapGetters(useUserStore, ['fullName'])  // 覆盖 data
  }
}
```

使用对象形式重命名：

```typescript
computed: {
  ...mapGetters(useUserStore, {
    storeFullName: 'fullName'  // ✅ 避免冲突
  })
}
```

## 组合式 API 中的替代

在 Composition API 中使用 storeToRefs：

```typescript
setup() {
  const store = useUserStore()
  
  // 解构 getters
  const { fullName, isAdult } = storeToRefs(store)
  
  return { fullName, isAdult }
}
```

或直接使用 computed：

```typescript
setup() {
  const store = useUserStore()
  
  const fullName = computed(() => store.fullName)
  
  return { fullName }
}
```

## 注意事项

只映射存在的 getter：

```typescript
// TypeScript 会检查
mapGetters(useUserStore, ['nonExistent'])  // 类型错误
```

在 setup 中不需要：

```typescript
// ❌
setup() {
  const getters = mapGetters(useUserStore, ['fullName'])
}

// ✅
setup() {
  const store = useUserStore()
  return { fullName: store.fullName }
}
```

下一章我们将分析 mapActions 辅助函数。
