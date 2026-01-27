# mapWritableState 辅助函数

mapWritableState 用于映射可写的 state 到组件。与 mapState 不同，它支持直接修改状态。这一章分析其实现。

## 问题场景

mapState 映射的是只读属性：

```typescript
export default {
  computed: {
    ...mapState(useUserStore, ['name'])
  },
  methods: {
    updateName(newName: string) {
      this.name = newName  // ❌ 计算属性是只读的
    }
  }
}
```

## 解决方案

使用 mapWritableState：

```typescript
import { mapWritableState } from 'pinia'

export default {
  computed: {
    ...mapWritableState(useUserStore, ['name'])
  },
  methods: {
    updateName(newName: string) {
      this.name = newName  // ✅ 可以写入
    }
  }
}
```

## 实现分析

```typescript
export function mapWritableState<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: Array<keyof S> | Record<string, keyof S>
): _MapWritableStateReturn<S> | _MapWritableStateObjectReturn<S> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key as string] = {
          get(this: ComponentPublicInstance) {
            return useStore(this.$pinia)[key]
          },
          set(this: ComponentPublicInstance, value) {
            return useStore(this.$pinia)[key] = value
          }
        }
        return reduced
      }, {} as _MapWritableStateReturn<S>)
    : Object.keys(keysOrMapper).reduce((reduced, key) => {
        reduced[key] = {
          get(this: ComponentPublicInstance) {
            return useStore(this.$pinia)[keysOrMapper[key]]
          },
          set(this: ComponentPublicInstance, value) {
            return useStore(this.$pinia)[keysOrMapper[key]] = value
          }
        }
        return reduced
      }, {} as _MapWritableStateObjectReturn<S>)
}
```

关键区别：返回带有 getter 和 setter 的计算属性。

## 与 mapState 的对比

mapState 只有 getter：

```typescript
// mapState 返回
{
  name: function() {
    return useStore(this.$pinia).name
  }
}
```

mapWritableState 有 getter 和 setter：

```typescript
// mapWritableState 返回
{
  name: {
    get() {
      return useStore(this.$pinia).name
    },
    set(value) {
      useStore(this.$pinia).name = value
    }
  }
}
```

## 数组形式

```typescript
mapWritableState(useUserStore, ['name', 'age', 'email'])
```

每个属性都可读可写：

```typescript
this.name = 'John'
this.age = 25
this.email = 'john@example.com'
```

## 对象形式

支持重命名：

```typescript
mapWritableState(useUserStore, {
  userName: 'name',
  userAge: 'age'
})

// 使用
this.userName = 'John'  // 写入 store.name
this.userAge = 25       // 写入 store.age
```

## 只能映射 state

mapWritableState 只能映射 state，不能映射 getters：

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

// ✅ 可以映射 state
mapWritableState(useUserStore, ['firstName', 'lastName'])

// ❌ 不能映射 getter（TypeScript 会报错）
mapWritableState(useUserStore, ['fullName'])
```

Getters 是计算出来的，不能直接写入。

## v-model 绑定

mapWritableState 最常用于表单的 v-model：

```typescript
export default {
  computed: {
    ...mapWritableState(useUserStore, ['name', 'email'])
  },
  template: `
    <form>
      <input v-model="name" placeholder="姓名" />
      <input v-model="email" placeholder="邮箱" />
    </form>
  `
}
```

表单输入直接更新 Store 状态。

## 类型安全

TypeScript 会验证属性是否存在：

```typescript
// ❌ 类型错误：nonExistent 不存在
mapWritableState(useUserStore, ['nonExistent'])

// ❌ 类型错误：fullName 是 getter，不是 state
mapWritableState(useUserStore, ['fullName'])
```

## 实际应用

用户设置表单：

```typescript
import { mapWritableState, mapActions } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

export default {
  name: 'SettingsForm',
  
  computed: {
    ...mapWritableState(useSettingsStore, [
      'theme',
      'language',
      'notifications',
      'fontSize'
    ])
  },
  
  methods: {
    ...mapActions(useSettingsStore, ['saveSettings']),
    
    async handleSave() {
      try {
        await this.saveSettings()
        this.showMessage('设置已保存')
      } catch (error) {
        this.showError(error)
      }
    }
  },
  
  template: `
    <form @submit.prevent="handleSave">
      <select v-model="theme">
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
      
      <select v-model="language">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
      
      <label>
        <input type="checkbox" v-model="notifications" />
        启用通知
      </label>
      
      <input type="range" v-model.number="fontSize" min="12" max="24" />
      
      <button type="submit">保存</button>
    </form>
  `
}
```

## 响应性

写入时自动触发响应式更新：

```typescript
export default {
  computed: {
    ...mapWritableState(useCounterStore, ['count'])
  },
  template: `
    <div>
      <p>{{ count }}</p>
      <button @click="count++">+1</button>
    </div>
  `
}
```

点击按钮时，count 更新，视图自动更新。

## 与 $patch 的关系

mapWritableState 直接赋值：

```typescript
this.name = 'John'  // 直接赋值
```

等同于：

```typescript
store.name = 'John'
```

如果需要批量更新，使用 $patch：

```typescript
methods: {
  updateAll() {
    // 直接赋值
    this.name = 'John'
    this.age = 25
    
    // 或使用 $patch 批量更新（需要访问 store）
    useUserStore().$patch({
      name: 'John',
      age: 25
    })
  }
}
```

## 嵌套对象

对于嵌套对象，需要注意响应性：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    profile: {
      name: 'John',
      address: {
        city: 'Beijing'
      }
    }
  })
})

// 映射整个 profile
mapWritableState(useUserStore, ['profile'])

// 修改嵌套属性
this.profile.name = 'Jane'  // ✅ 响应式
this.profile.address.city = 'Shanghai'  // ✅ 响应式

// 替换整个对象
this.profile = { name: 'Bob', address: { city: 'Shenzhen' } }  // ✅ 响应式
```

## 数组操作

映射数组状态：

```typescript
const useTodoStore = defineStore('todo', {
  state: () => ({
    items: [] as string[]
  })
})

// 组件中
computed: {
  ...mapWritableState(useTodoStore, ['items'])
}

methods: {
  addItem(item: string) {
    this.items.push(item)  // ✅ 响应式
  },
  removeItem(index: number) {
    this.items.splice(index, 1)  // ✅ 响应式
  },
  replaceAll(newItems: string[]) {
    this.items = newItems  // ✅ 响应式
  }
}
```

## 组合式 API 中的替代

在 Composition API 中使用 storeToRefs：

```typescript
setup() {
  const store = useUserStore()
  const { name, age } = storeToRefs(store)
  
  // 可以直接修改
  name.value = 'John'
  age.value = 25
  
  return { name, age }
}
```

或使用 computed 的 get/set：

```typescript
setup() {
  const store = useUserStore()
  
  const name = computed({
    get: () => store.name,
    set: (value) => store.name = value
  })
  
  return { name }
}
```

## 注意事项

只用于 Options API：

```typescript
// ❌ 组合式 API 中不需要
setup() {
  return mapWritableState(useUserStore, ['name'])
}

// ✅ 使用 storeToRefs
setup() {
  const { name } = storeToRefs(useUserStore())
  return { name }
}
```

避免在 action 中直接修改：

```typescript
// 不推荐
methods: {
  save() {
    this.name = 'John'  // 分散的状态修改
    this.age = 25
  }
}

// 推荐
methods: {
  save() {
    useUserStore().updateProfile({ name: 'John', age: 25 })
  }
}
```

使用 action 封装状态修改逻辑更好维护。

下一章我们将分析插件机制的实现。
