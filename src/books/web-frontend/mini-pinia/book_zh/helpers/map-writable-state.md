---
sidebar_position: 53
title: mapWritableState 实现：可写状态映射
---

# mapWritableState 实现：可写状态映射

`mapWritableState` 与 `mapState` 类似，但返回可写的计算属性。本章详细实现这个函数。

## 为什么需要 mapWritableState

`mapState` 返回只读属性：

```javascript
export default {
  computed: {
    ...mapState(useCounterStore, ['count'])
  },
  methods: {
    increment() {
      // ❌ 无法直接修改
      this.count++
    }
  }
}
```

`mapWritableState` 允许直接修改：

```javascript
export default {
  computed: {
    ...mapWritableState(useCounterStore, ['count'])
  },
  methods: {
    increment() {
      // ✅ 可以直接修改
      this.count++
    }
  }
}
```

## 核心区别

```javascript
// mapState 返回
{
  count: {
    get() { return store.count }
    // 没有 setter
  }
}

// mapWritableState 返回
{
  count: {
    get() { return store.count },
    set(value) { store.count = value }  // 有 setter
  }
}
```

## 基础实现

```javascript
function mapWritableState(useStore, keysOrMapper) {
  const result = {}
  
  if (Array.isArray(keysOrMapper)) {
    keysOrMapper.forEach(key => {
      result[key] = {
        get() {
          return useStore(this.$pinia)[key]
        },
        set(value) {
          useStore(this.$pinia)[key] = value
        }
      }
    })
  } else {
    Object.keys(keysOrMapper).forEach(alias => {
      const storeKey = keysOrMapper[alias]
      
      result[alias] = {
        get() {
          return useStore(this.$pinia)[storeKey]
        },
        set(value) {
          useStore(this.$pinia)[storeKey] = value
        }
      }
    })
  }
  
  return result
}
```

## 完整实现

```javascript
function mapWritableState(useStore, keysOrMapper) {
  // 验证参数
  if (__DEV__) {
    if (typeof useStore !== 'function' || !useStore.$id) {
      console.warn(
        'mapWritableState() expects a store definition created with defineStore()'
      )
    }
  }
  
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((result, key) => {
        result[key] = {
          get() {
            return useStore(this.$pinia)[key]
          },
          set(value) {
            return useStore(this.$pinia)[key] = value
          },
          enumerable: true
        }
        return result
      }, {})
    : Object.keys(keysOrMapper).reduce((result, alias) => {
        const storeKey = keysOrMapper[alias]
        
        // 只支持字符串映射，不支持函数
        if (__DEV__ && typeof storeKey !== 'string') {
          console.warn(
            `mapWritableState() only accepts string values, got "${typeof storeKey}" for key "${alias}"`
          )
        }
        
        result[alias] = {
          get() {
            return useStore(this.$pinia)[storeKey]
          },
          set(value) {
            return useStore(this.$pinia)[storeKey] = value
          },
          enumerable: true
        }
        return result
      }, {})
}

export { mapWritableState }
```

## 调用形式

### 数组形式

```javascript
export default {
  computed: {
    ...mapWritableState(useCounterStore, ['count', 'name'])
  },
  
  methods: {
    updateCount() {
      this.count = 100  // 直接赋值
    },
    updateName() {
      this.name = 'New Name'
    }
  }
}
```

### 对象别名形式

```javascript
export default {
  computed: {
    ...mapWritableState(useCounterStore, {
      localCount: 'count',
      localName: 'name'
    })
  },
  
  methods: {
    update() {
      this.localCount = 100
      this.localName = 'Updated'
    }
  }
}
```

## 不支持函数形式

与 mapState 不同，mapWritableState 不支持函数映射：

```javascript
// ❌ 不支持
mapWritableState(useStore, {
  doubled: store => store.count * 2
})

// 原因：无法知道如何写回 store
// doubled = 10 应该设置 store.count = 5？
```

## 在表单中使用

### 绑定表单输入

```vue
<template>
  <form>
    <input v-model="username" placeholder="用户名">
    <input v-model="email" type="email" placeholder="邮箱">
    <textarea v-model="bio" placeholder="个人简介"></textarea>
  </form>
</template>

<script>
import { mapWritableState } from 'pinia'
import { useUserStore } from '@/stores/user'

export default {
  computed: {
    ...mapWritableState(useUserStore, [
      'username',
      'email',
      'bio'
    ])
  }
}
</script>
```

### 复选框和选择框

```vue
<template>
  <div>
    <input type="checkbox" v-model="isActive">
    <select v-model="status">
      <option value="pending">待处理</option>
      <option value="approved">已批准</option>
      <option value="rejected">已拒绝</option>
    </select>
  </div>
</template>

<script>
export default {
  computed: {
    ...mapWritableState(useSettingsStore, ['isActive', 'status'])
  }
}
</script>
```

## 与 v-model 配合

```vue
<template>
  <div>
    <!-- 直接使用 v-model -->
    <input v-model="count" type="number">
    
    <!-- 显示计算值 -->
    <p>Double: {{ doubleCount }}</p>
  </div>
</template>

<script>
import { mapState, mapWritableState } from 'pinia'
import { useCounterStore } from '@/stores/counter'

export default {
  computed: {
    // 只读属性（getter）
    ...mapState(useCounterStore, ['doubleCount']),
    
    // 可写属性（state）
    ...mapWritableState(useCounterStore, ['count'])
  }
}
</script>
```

## 注意事项

### 仅限 state，不适用于 getters

```javascript
const useStore = defineStore('demo', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount: state => state.count * 2
  }
})

// ✅ 正确：映射 state
mapWritableState(useStore, ['count'])

// ❌ 错误：getter 是只读的
mapWritableState(useStore, ['doubleCount'])
```

### 对象类型的 state

```javascript
const useStore = defineStore('demo', {
  state: () => ({
    user: { name: 'John', age: 25 }
  })
})

export default {
  computed: {
    ...mapWritableState(useStore, ['user'])
  },
  
  methods: {
    // 替换整个对象
    replaceUser() {
      this.user = { name: 'Jane', age: 30 }
    },
    
    // 修改属性（响应式）
    updateName() {
      this.user.name = 'Updated'
    }
  }
}
```

## 类型定义

```typescript
type KeysOrMapper<S> = 
  | Array<keyof S>
  | Record<string, keyof S>

function mapWritableState<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: KeysOrMapper<S>
): Record<string, WritableComputedRef<any>>
```

## 对比 mapState 和 mapWritableState

| 特性 | mapState | mapWritableState |
|------|----------|------------------|
| 读取值 | ✅ | ✅ |
| 修改值 | ❌ | ✅ |
| 映射 state | ✅ | ✅ |
| 映射 getters | ✅ | ❌ |
| 函数形式 | ✅ | ❌ |
| v-model 绑定 | ❌ | ✅ |

## 测试用例

```javascript
describe('mapWritableState', () => {
  let pinia
  let useCounterStore
  
  beforeEach(() => {
    pinia = createPinia()
    useCounterStore = defineStore('counter', {
      state: () => ({ count: 5, name: 'test' })
    })
  })
  
  test('reads state', () => {
    const mapped = mapWritableState(useCounterStore, ['count'])
    const component = { $pinia: pinia }
    
    const value = mapped.count.get.call(component)
    expect(value).toBe(5)
  })
  
  test('writes state', () => {
    const mapped = mapWritableState(useCounterStore, ['count'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.count.set.call(component, 100)
    
    expect(store.count).toBe(100)
  })
  
  test('maps with alias', () => {
    const mapped = mapWritableState(useCounterStore, {
      myCount: 'count'
    })
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.myCount.set.call(component, 50)
    
    expect(store.count).toBe(50)
  })
  
  test('reactive to changes', () => {
    const mapped = mapWritableState(useCounterStore, ['count'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    expect(mapped.count.get.call(component)).toBe(5)
    
    store.count = 20
    expect(mapped.count.get.call(component)).toBe(20)
    
    mapped.count.set.call(component, 30)
    expect(store.count).toBe(30)
  })
  
  test('multiple properties', () => {
    const mapped = mapWritableState(useCounterStore, ['count', 'name'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    mapped.count.set.call(component, 10)
    mapped.name.set.call(component, 'updated')
    
    expect(store.count).toBe(10)
    expect(store.name).toBe('updated')
  })
})
```

## 本章小结

本章实现了 mapWritableState：

- **核心功能**：创建可读写的计算属性
- **调用形式**：数组形式和对象别名形式
- **限制**：只支持 state，不支持 getters 和函数形式
- **典型场景**：表单双向绑定

下一章实现 mapActions。
