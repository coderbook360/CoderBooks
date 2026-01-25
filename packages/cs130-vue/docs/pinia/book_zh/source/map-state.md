# mapState 辅助函数

mapState 用于在 Options API 组件中映射 Store 的状态属性。这一章分析其实现原理。

## 使用场景

在模板中使用 Store 状态：

```typescript
export default {
  computed: {
    name() {
      return useUserStore().name
    },
    age() {
      return useUserStore().age
    }
  }
}
```

mapState 简化这个过程：

```typescript
import { mapState } from 'pinia'

export default {
  computed: {
    ...mapState(useUserStore, ['name', 'age'])
  }
}
```

## 两种调用方式

数组形式：

```typescript
mapState(useUserStore, ['name', 'age'])
```

对象形式：

```typescript
mapState(useUserStore, {
  userName: 'name',  // 重命名
  userAge: 'age',
  doubleAge: (store) => store.age * 2  // 自定义函数
})
```

## 实现分析

```typescript
export function mapState<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: Array<keyof S | keyof G> | Record<string, keyof S | keyof G | ((store: Store<Id, S, G, A>) => any)>
): _MapStateReturn<S, G> | _MapStateObjectReturn<Id, S, G, A> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key as string] = function (this: ComponentPublicInstance) {
          return useStore(this.$pinia)[key]
        }
        return reduced
      }, {} as _MapStateReturn<S, G>)
    : Object.keys(keysOrMapper).reduce((reduced, key) => {
        reduced[key] = function (this: ComponentPublicInstance) {
          const store = useStore(this.$pinia)
          const storeKey = keysOrMapper[key]
          
          // 函数形式
          if (typeof storeKey === 'function') {
            return storeKey.call(this, store)
          }
          
          // 字符串形式
          return store[storeKey as keyof typeof store]
        }
        return reduced
      }, {} as _MapStateObjectReturn<Id, S, G, A>)
}
```

根据参数类型选择不同的处理逻辑。

## 数组形式处理

当传入数组时：

```typescript
mapState(useUserStore, ['name', 'age'])
```

生成：

```typescript
{
  name: function() {
    return useStore(this.$pinia).name
  },
  age: function() {
    return useStore(this.$pinia).age
  }
}
```

属性名与 Store 中的名称相同。

## 对象形式处理

对象形式支持重命名和自定义函数：

```typescript
mapState(useUserStore, {
  userName: 'name',      // 重命名
  userAge: 'age',
  fullInfo: (store) => `${store.name}, ${store.age}`
})
```

生成：

```typescript
{
  userName: function() {
    return useStore(this.$pinia).name
  },
  userAge: function() {
    return useStore(this.$pinia).age
  },
  fullInfo: function() {
    const store = useStore(this.$pinia)
    return `${store.name}, ${store.age}`
  }
}
```

## 同时映射 State 和 Getters

mapState 可以映射 state 和 getters：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    firstName: 'John',
    lastName: 'Doe'
  }),
  getters: {
    fullName: (state) => `${state.firstName} ${state.lastName}`
  }
})

// 两者都可以映射
mapState(useUserStore, ['firstName', 'fullName'])
```

因为在 Store 实例上，state 和 getters 都是属性。

## 类型推断

TypeScript 能正确推断映射后的类型：

```typescript
export default {
  computed: {
    ...mapState(useUserStore, ['name', 'age'])
  },
  methods: {
    example() {
      this.name  // string
      this.age   // number
    }
  }
}
```

对象形式的类型推断：

```typescript
mapState(useUserStore, {
  userName: 'name',  // 推断为 string
  doubleAge: (store) => store.age * 2  // 推断为 number
})
```

## 与 Vuex 的区别

Vuex 的 mapState 需要模块路径：

```typescript
// Vuex
mapState('user', ['name', 'age'])
// 或
mapState({ name: state => state.user.name })
```

Pinia 传入的是 Store 函数：

```typescript
// Pinia
mapState(useUserStore, ['name', 'age'])
```

更加类型安全，因为 useUserStore 携带完整类型信息。

## 函数形式的妙用

函数形式可以实现复杂逻辑：

```typescript
mapState(useUserStore, {
  // 格式化
  formattedAge: (store) => `${store.age} 岁`,
  
  // 条件判断
  isAdult: (store) => store.age >= 18,
  
  // 组合多个属性
  displayName: (store) => {
    if (store.nickname) return store.nickname
    return `${store.firstName} ${store.lastName}`
  },
  
  // 使用其他 Store
  withCart: (store) => ({
    user: store,
    cart: useCartStore()
  })
})
```

## 响应性

mapState 返回的是计算属性，自动具有响应性：

```typescript
export default {
  computed: {
    ...mapState(useUserStore, ['count'])
  },
  template: `<div>{{ count }}</div>`  // 自动更新
}
```

当 Store 中的 count 变化时，视图自动更新。

## 只读性

通过 mapState 映射的属性是只读的：

```typescript
export default {
  computed: {
    ...mapState(useUserStore, ['count'])
  },
  methods: {
    increment() {
      this.count++  // ❌ 这是只读的
      
      // ✅ 应该调用 Store 的方法
      useUserStore().count++
    }
  }
}
```

如果需要可写的映射，使用 mapWritableState。

## 实际应用

表单组件中显示用户信息：

```typescript
import { mapState } from 'pinia'
import { useUserStore } from '@/stores/user'

export default {
  name: 'UserProfile',
  
  computed: {
    ...mapState(useUserStore, {
      name: 'name',
      email: 'email',
      isVip: 'isPremiumMember',
      memberSince: (store) => {
        return new Date(store.createdAt).toLocaleDateString()
      }
    })
  },
  
  template: `
    <div class="profile">
      <h2>{{ name }}</h2>
      <p>{{ email }}</p>
      <span v-if="isVip" class="badge">VIP</span>
      <p>加入时间：{{ memberSince }}</p>
    </div>
  `
}
```

## 与其他辅助函数配合

```typescript
import { mapState, mapGetters, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useUserStore, ['name', 'age']),
    ...mapGetters(useUserStore, ['fullName', 'isAdult'])
  },
  methods: {
    ...mapActions(useUserStore, ['updateProfile', 'logout'])
  }
}
```

实际上 mapGetters 是 mapState 的别名：

```typescript
export const mapGetters = mapState
```

## 性能考虑

每次访问都会调用 useStore：

```typescript
// 内部实现
{
  name: function() {
    return useStore(this.$pinia).name  // 每次访问都调用
  }
}
```

由于 useStore 只是从 Map 获取 Store 实例，开销很小。

## 注意事项

确保 Store 中存在对应属性：

```typescript
// ❌ 属性不存在会报错
mapState(useUserStore, ['nonExistent'])

// TypeScript 会提示错误
```

在 Options API 中使用：

```typescript
// ❌ 组合式 API 中不需要
setup() {
  const { name } = mapState(useUserStore, ['name'])  // 不是这样用
  
  // ✅ 直接解构
  const { name } = storeToRefs(useUserStore())
}
```

下一章我们将分析 mapGetters 辅助函数。
