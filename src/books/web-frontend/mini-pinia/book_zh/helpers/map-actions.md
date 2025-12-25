---
sidebar_position: 54
title: mapActions 实现：Action 映射
---

# mapActions 实现：Action 映射

`mapActions` 将 Store 的 actions 映射为组件的 methods。本章详细实现这个函数。

## 为什么需要 mapActions

在 Options API 中调用 Store action：

```javascript
export default {
  methods: {
    handleIncrement() {
      const store = useCounterStore()
      store.increment()
    },
    handleFetch() {
      const store = useCounterStore()
      store.fetchData()
    }
  }
}
```

使用 mapActions 简化：

```javascript
import { mapActions } from 'pinia'

export default {
  methods: {
    ...mapActions(useCounterStore, ['increment', 'fetchData'])
  }
}
```

## 与 mapState 的区别

```javascript
// mapState 返回计算属性（getter）
mapState(useStore, ['count'])
// { count: { get() { return store.count } } }

// mapActions 返回方法
mapActions(useStore, ['increment'])
// { increment(...args) { return store.increment(...args) } }
```

## 基础实现

```javascript
function mapActions(useStore, keysOrMapper) {
  const result = {}
  
  if (Array.isArray(keysOrMapper)) {
    keysOrMapper.forEach(key => {
      result[key] = function(...args) {
        const store = useStore(this.$pinia)
        return store[key](...args)
      }
    })
  } else {
    Object.keys(keysOrMapper).forEach(alias => {
      const actionName = keysOrMapper[alias]
      
      result[alias] = function(...args) {
        const store = useStore(this.$pinia)
        return store[actionName](...args)
      }
    })
  }
  
  return result
}
```

## 完整实现

```javascript
function mapActions(useStore, keysOrMapper) {
  // 验证参数
  if (__DEV__) {
    if (typeof useStore !== 'function' || !useStore.$id) {
      console.warn(
        'mapActions() expects a store definition created with defineStore()'
      )
    }
  }
  
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((result, key) => {
        result[key] = function(...args) {
          return useStore(this.$pinia)[key](...args)
        }
        return result
      }, {})
    : Object.keys(keysOrMapper).reduce((result, alias) => {
        const actionName = keysOrMapper[alias]
        
        result[alias] = function(...args) {
          return useStore(this.$pinia)[actionName](...args)
        }
        return result
      }, {})
}

export { mapActions }
```

## 调用形式

### 数组形式

```javascript
export default {
  methods: {
    ...mapActions(useCounterStore, [
      'increment',   // this.increment() => store.increment()
      'decrement',   // this.decrement() => store.decrement()
      'fetchData'    // this.fetchData() => store.fetchData()
    ])
  },
  
  mounted() {
    this.increment()
    this.fetchData()
  }
}
```

### 对象别名形式

```javascript
export default {
  methods: {
    ...mapActions(useCounterStore, {
      add: 'increment',         // this.add() => store.increment()
      subtract: 'decrement',    // this.subtract() => store.decrement()
      loadData: 'fetchData'     // this.loadData() => store.fetchData()
    })
  }
}
```

## 传递参数

mapActions 会透传所有参数：

```javascript
// Store 定义
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    add(n) {
      this.count += n
    },
    addMany(a, b, c) {
      this.count += a + b + c
    }
  }
})

// 组件
export default {
  methods: {
    ...mapActions(useCounterStore, ['add', 'addMany'])
  },
  
  mounted() {
    this.add(5)           // store.add(5)
    this.addMany(1, 2, 3) // store.addMany(1, 2, 3)
  }
}
```

## 处理返回值

action 的返回值会被正确传递：

```javascript
// Store 定义
const useApiStore = defineStore('api', {
  actions: {
    async fetchUser(id) {
      const response = await fetch(`/api/users/${id}`)
      return response.json()
    }
  }
})

// 组件
export default {
  methods: {
    ...mapActions(useApiStore, ['fetchUser'])
  },
  
  async mounted() {
    const user = await this.fetchUser(1)
    console.log(user)
  }
}
```

## 处理异步 actions

```javascript
// Store 定义
const useDataStore = defineStore('data', {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),
  actions: {
    async loadItems() {
      this.loading = true
      try {
        const res = await fetch('/api/items')
        this.items = await res.json()
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    }
  }
})

// 组件
export default {
  computed: {
    ...mapState(useDataStore, ['items', 'loading', 'error'])
  },
  
  methods: {
    ...mapActions(useDataStore, ['loadItems'])
  },
  
  mounted() {
    this.loadItems()
  }
}
```

模板中使用：

```vue
<template>
  <div>
    <p v-if="loading">加载中...</p>
    <p v-else-if="error">{{ error }}</p>
    <ul v-else>
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
      </li>
    </ul>
    <button @click="loadItems">刷新</button>
  </div>
</template>
```

## 组合多个 Store

```javascript
import { mapActions, mapState } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useNotificationStore } from '@/stores/notification'

export default {
  computed: {
    ...mapState(useAuthStore, ['user']),
    ...mapState(useCartStore, ['items', 'total'])
  },
  
  methods: {
    ...mapActions(useAuthStore, ['login', 'logout']),
    ...mapActions(useCartStore, ['addItem', 'removeItem', 'checkout']),
    ...mapActions(useNotificationStore, ['showMessage']),
    
    async handleCheckout() {
      try {
        await this.checkout()
        this.showMessage('订单提交成功')
      } catch (e) {
        this.showMessage('订单提交失败')
      }
    }
  }
}
```

## 事件处理

```vue
<template>
  <div>
    <!-- 直接绑定 -->
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
    
    <!-- 带参数 -->
    <button @click="add(5)">+5</button>
    <button @click="add(10)">+10</button>
    
    <!-- 带事件对象 -->
    <form @submit.prevent="handleSubmit">
      <button type="submit">提交</button>
    </form>
  </div>
</template>

<script>
export default {
  methods: {
    ...mapActions(useCounterStore, ['increment', 'decrement', 'add']),
    ...mapActions(useFormStore, ['submit']),
    
    handleSubmit(event) {
      this.submit({ timestamp: Date.now() })
    }
  }
}
</script>
```

## this 绑定

mapActions 返回的方法中，`this` 指向组件实例：

```javascript
export default {
  data() {
    return { localValue: 100 }
  },
  
  methods: {
    ...mapActions(useCounterStore, ['increment']),
    
    customMethod() {
      // this 是组件实例
      console.log(this.localValue)
      this.increment()
    }
  }
}
```

## 类型定义

```typescript
type KeysOrMapper<A> = 
  | Array<keyof A>
  | Record<string, keyof A>

function mapActions<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: KeysOrMapper<A>
): Record<string, (...args: any[]) => any>
```

## 与 Vuex mapActions 对比

### Vuex 3

```javascript
import { mapActions } from 'vuex'

export default {
  methods: {
    ...mapActions(['increment']),
    ...mapActions('moduleName', ['increment'])
  }
}
```

### Pinia

```javascript
import { mapActions } from 'pinia'

export default {
  methods: {
    ...mapActions(useCounterStore, ['increment'])
  }
}
```

## 测试用例

```javascript
describe('mapActions', () => {
  let pinia
  let useCounterStore
  
  beforeEach(() => {
    pinia = createPinia()
    useCounterStore = defineStore('counter', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        },
        add(n) {
          this.count += n
        },
        async asyncAction() {
          return 'done'
        }
      }
    })
  })
  
  test('maps action with array', () => {
    const mapped = mapActions(useCounterStore, ['increment'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.increment.call(component)
    
    expect(store.count).toBe(1)
  })
  
  test('maps action with alias', () => {
    const mapped = mapActions(useCounterStore, {
      myIncrement: 'increment'
    })
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.myIncrement.call(component)
    
    expect(store.count).toBe(1)
  })
  
  test('passes arguments', () => {
    const mapped = mapActions(useCounterStore, ['add'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.add.call(component, 5)
    
    expect(store.count).toBe(5)
  })
  
  test('returns action result', async () => {
    const mapped = mapActions(useCounterStore, ['asyncAction'])
    const component = { $pinia: pinia }
    
    const result = await mapped.asyncAction.call(component)
    
    expect(result).toBe('done')
  })
  
  test('maps multiple actions', () => {
    const mapped = mapActions(useCounterStore, ['increment', 'add'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.increment.call(component)
    mapped.add.call(component, 10)
    
    expect(store.count).toBe(11)
  })
})
```

## 本章小结

本章实现了 mapActions：

- **核心功能**：将 Store actions 映射为组件 methods
- **调用形式**：数组形式和对象别名形式
- **参数透传**：正确传递所有参数
- **返回值**：正确返回 action 结果（包括 Promise）
- **典型场景**：事件处理、异步操作

下一章实现 mapGetters。
