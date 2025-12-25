---
sidebar_position: 52
title: mapState 实现：状态映射
---

# mapState 实现：状态映射

`mapState` 将 Store 的 state 和 getters 映射为组件的计算属性。本章详细实现这个函数。

## 为什么需要 mapState

在 Options API 中直接使用 Store 不够便利：

```javascript
export default {
  computed: {
    count() {
      return this.counterStore.count
    },
    doubleCount() {
      return this.counterStore.doubleCount
    }
  }
}
```

使用 mapState 简化：

```javascript
import { mapState } from 'pinia'

export default {
  computed: {
    ...mapState(useCounterStore, ['count', 'doubleCount'])
  }
}
```

## 三种调用形式

### 1. 数组形式

```javascript
mapState(useStore, ['state1', 'getter1'])
// 返回 { state1: computed, getter1: computed }
```

### 2. 对象别名形式

```javascript
mapState(useStore, {
  myCount: 'count',
  myDouble: 'doubleCount'
})
// 返回 { myCount: computed, myDouble: computed }
```

### 3. 对象函数形式

```javascript
mapState(useStore, {
  countPlusTen: store => store.count + 10,
  greeting: store => `Hello, ${store.name}!`
})
// 返回 { countPlusTen: computed, greeting: computed }
```

## 基础实现

```javascript
function mapState(useStore, keysOrMapper) {
  const result = {}
  
  // 数组形式
  if (Array.isArray(keysOrMapper)) {
    keysOrMapper.forEach(key => {
      result[key] = {
        get() {
          const store = useStore(this.$pinia)
          return store[key]
        }
      }
    })
  } else {
    // 对象形式
    Object.keys(keysOrMapper).forEach(alias => {
      const value = keysOrMapper[alias]
      
      result[alias] = {
        get() {
          const store = useStore(this.$pinia)
          
          // 字符串：别名映射
          if (typeof value === 'string') {
            return store[value]
          }
          
          // 函数：自定义计算
          return value(store)
        }
      }
    })
  }
  
  return result
}
```

## 完整实现

```javascript
function mapState(useStore, keysOrMapper) {
  // 验证参数
  if (__DEV__) {
    if (typeof useStore !== 'function' || !useStore.$id) {
      console.warn(
        'mapState() expects a store definition created with defineStore()'
      )
    }
  }
  
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((result, key) => {
        result[key] = {
          get() {
            return useStore(this.$pinia)[key]
          },
          // 可枚举，支持 spread 操作
          enumerable: true
        }
        return result
      }, {})
    : Object.keys(keysOrMapper).reduce((result, alias) => {
        const value = keysOrMapper[alias]
        
        result[alias] = {
          get() {
            const store = useStore(this.$pinia)
            return typeof value === 'function'
              ? value(store)
              : store[value]
          },
          enumerable: true
        }
        return result
      }, {})
}

export { mapState }
```

## 使用示例

### 数组形式

```javascript
import { mapState } from 'pinia'
import { useCounterStore } from '@/stores/counter'

export default {
  computed: {
    ...mapState(useCounterStore, [
      'count',      // this.count => store.count
      'doubleCount' // this.doubleCount => store.doubleCount
    ])
  },
  
  mounted() {
    console.log(this.count)
    console.log(this.doubleCount)
  }
}
```

### 对象别名形式

```javascript
export default {
  computed: {
    ...mapState(useCounterStore, {
      // 重命名属性
      currentCount: 'count',
      doubled: 'doubleCount'
    })
  },
  
  mounted() {
    console.log(this.currentCount)  // store.count
    console.log(this.doubled)        // store.doubleCount
  }
}
```

### 对象函数形式

```javascript
export default {
  computed: {
    ...mapState(useCounterStore, {
      // 自定义计算
      countPlusLocal: store => store.count + 100,
      
      // 访问多个属性
      summary: store => `Count: ${store.count}, Double: ${store.doubleCount}`,
      
      // 条件逻辑
      status: store => store.count > 10 ? 'high' : 'low'
    })
  }
}
```

### 混合使用

```javascript
export default {
  computed: {
    // Store 映射
    ...mapState(useCounterStore, ['count']),
    ...mapState(useUserStore, {
      userName: 'name'
    }),
    
    // 本地计算属性
    localComputed() {
      return this.count * 2 + this.userName.length
    }
  }
}
```

## 在模板中使用

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubleCount }}</p>
    <p>Status: {{ status }}</p>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import { useCounterStore } from '@/stores/counter'

export default {
  computed: {
    ...mapState(useCounterStore, {
      count: 'count',
      doubleCount: 'doubleCount',
      status: store => store.count > 10 ? 'High' : 'Low'
    })
  }
}
</script>
```

## 只读特性

mapState 返回的是只读计算属性：

```javascript
export default {
  computed: {
    ...mapState(useCounterStore, ['count'])
  },
  
  methods: {
    tryModify() {
      // ❌ 这会失败或产生警告
      this.count = 100
    }
  }
}
```

如需可写，请使用 `mapWritableState`（下一章介绍）。

## 类型定义

```typescript
type KeysOrMapper<S, G> = 
  | Array<keyof S | keyof G>
  | {
      [alias: string]: keyof S | keyof G | ((store: Store<S, G>) => any)
    }

function mapState<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: KeysOrMapper<S, G>
): Record<string, ComputedGetter<any>>
```

## 与 Vuex mapState 对比

### Vuex 3

```javascript
import { mapState } from 'vuex'

export default {
  computed: {
    ...mapState(['count']),
    ...mapState('moduleName', ['count'])
  }
}
```

### Pinia

```javascript
import { mapState } from 'pinia'

export default {
  computed: {
    ...mapState(useCounterStore, ['count'])
  }
}
```

主要区别：
- Pinia 直接传入 Store 定义函数
- 不需要模块命名空间
- 类型推导更完善

## 测试用例

```javascript
describe('mapState', () => {
  let pinia
  let useCounterStore
  
  beforeEach(() => {
    pinia = createPinia()
    useCounterStore = defineStore('counter', {
      state: () => ({ count: 5 }),
      getters: {
        doubleCount: state => state.count * 2
      }
    })
  })
  
  test('maps state with array', () => {
    const mapped = mapState(useCounterStore, ['count'])
    const component = { $pinia: pinia }
    
    const value = mapped.count.get.call(component)
    expect(value).toBe(5)
  })
  
  test('maps getter with array', () => {
    const mapped = mapState(useCounterStore, ['doubleCount'])
    const component = { $pinia: pinia }
    
    const value = mapped.doubleCount.get.call(component)
    expect(value).toBe(10)
  })
  
  test('maps with object alias', () => {
    const mapped = mapState(useCounterStore, {
      myCount: 'count'
    })
    const component = { $pinia: pinia }
    
    const value = mapped.myCount.get.call(component)
    expect(value).toBe(5)
  })
  
  test('maps with function', () => {
    const mapped = mapState(useCounterStore, {
      countPlusTen: store => store.count + 10
    })
    const component = { $pinia: pinia }
    
    const value = mapped.countPlusTen.get.call(component)
    expect(value).toBe(15)
  })
  
  test('reactive to state changes', () => {
    const mapped = mapState(useCounterStore, ['count'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    expect(mapped.count.get.call(component)).toBe(5)
    
    store.count = 20
    expect(mapped.count.get.call(component)).toBe(20)
  })
})
```

## 本章小结

本章实现了 mapState：

- **三种形式**：数组、对象别名、对象函数
- **只读特性**：返回只读计算属性
- **灵活映射**：支持重命名和自定义计算
- **响应式**：自动跟踪 Store 变化

下一章实现可写版本 mapWritableState。
