---
sidebar_position: 55
title: mapGetters 实现：Getter 映射
---

# mapGetters 实现：Getter 映射

Pinia 官方没有单独的 `mapGetters`，而是使用 `mapState` 同时映射 state 和 getters。本章解释这一设计决策并实现兼容版本。

## 为什么没有独立的 mapGetters

### Pinia 的设计理念

在 Pinia 中，state 和 getters 的访问方式完全相同：

```javascript
const store = useCounterStore()

// 访问 state
console.log(store.count)

// 访问 getter（同样的语法）
console.log(store.doubleCount)
```

因此 `mapState` 可以同时处理两者：

```javascript
export default {
  computed: {
    ...mapState(useCounterStore, [
      'count',       // state
      'doubleCount'  // getter
    ])
  }
}
```

### 与 Vuex 的对比

Vuex 需要分开处理：

```javascript
// Vuex
export default {
  computed: {
    ...mapState(['count']),
    ...mapGetters(['doubleCount'])
  }
}

// Pinia（统一使用 mapState）
export default {
  computed: {
    ...mapState(useCounterStore, ['count', 'doubleCount'])
  }
}
```

## 实现兼容版 mapGetters

为了帮助 Vuex 用户迁移，可以提供一个别名：

```javascript
// 最简单的实现：直接使用 mapState
const mapGetters = mapState

export { mapGetters }
```

或者提供更明确的实现：

```javascript
function mapGetters(useStore, keysOrMapper) {
  // 内部实现与 mapState 完全相同
  return mapState(useStore, keysOrMapper)
}

export { mapGetters }
```

## 完整实现

```javascript
function mapGetters(useStore, keysOrMapper) {
  if (__DEV__) {
    console.warn(
      '[Pinia] mapGetters is deprecated, use mapState instead. ' +
      'In Pinia, mapState handles both state and getters.'
    )
  }
  
  return mapState(useStore, keysOrMapper)
}

export { mapGetters }
```

## 使用示例

### 基本用法

```javascript
// Store 定义
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: state => state.count * 2,
    quadrupleCount: state => state.count * 4
  }
})

// 组件（两种方式等效）
export default {
  computed: {
    // 方式 1：使用 mapState（推荐）
    ...mapState(useCounterStore, ['doubleCount', 'quadrupleCount']),
    
    // 方式 2：使用 mapGetters（兼容）
    ...mapGetters(useCounterStore, ['doubleCount', 'quadrupleCount'])
  }
}
```

### 别名映射

```javascript
export default {
  computed: {
    ...mapGetters(useCounterStore, {
      doubled: 'doubleCount',
      quadrupled: 'quadrupleCount'
    })
  },
  
  mounted() {
    console.log(this.doubled)
    console.log(this.quadrupled)
  }
}
```

### 函数形式

```javascript
export default {
  computed: {
    ...mapGetters(useCounterStore, {
      // 自定义计算
      countInfo: store => `Count is ${store.count}, double is ${store.doubleCount}`
    })
  }
}
```

## 迁移指南

### 从 Vuex 迁移

```javascript
// Vuex 代码
import { mapState, mapGetters } from 'vuex'

export default {
  computed: {
    ...mapState(['count']),
    ...mapGetters(['doubleCount'])
  }
}

// 迁移到 Pinia
import { mapState } from 'pinia'
import { useCounterStore } from '@/stores/counter'

export default {
  computed: {
    // 统一使用 mapState
    ...mapState(useCounterStore, ['count', 'doubleCount'])
  }
}
```

### 批量迁移技巧

如果有大量 Vuex 代码需要迁移，可以先创建兼容层：

```javascript
// utils/pinia-compat.js
import { mapState as piniaMapState } from 'pinia'

// 提供 Vuex 风格的 API
export function mapGetters(useStore, keys) {
  return piniaMapState(useStore, keys)
}

export { piniaMapState as mapState }
```

## 与 mapState 的区别总结

| 特性 | mapState | mapGetters |
|------|----------|------------|
| 映射 state | ✅ | ✅ |
| 映射 getters | ✅ | ✅ |
| 数组形式 | ✅ | ✅ |
| 对象形式 | ✅ | ✅ |
| 函数形式 | ✅ | ✅ |
| 推荐使用 | ✅ | ⚠️ 兼容用途 |

## 最佳实践

### 1. 始终使用 mapState

```javascript
// ✅ 推荐
...mapState(useStore, ['count', 'doubleCount'])

// ⚠️ 仅用于迁移过渡
...mapGetters(useStore, ['doubleCount'])
```

### 2. 明确区分来源

如果需要明确标识哪些是 getters：

```javascript
export default {
  computed: {
    // 状态
    ...mapState(useCounterStore, ['count', 'name']),
    
    // Getters（使用别名区分）
    ...mapState(useCounterStore, {
      calculatedDouble: 'doubleCount',
      calculatedQuadruple: 'quadrupleCount'
    })
  }
}
```

### 3. 使用注释标注

```javascript
export default {
  computed: {
    // === State ===
    ...mapState(useCounterStore, ['count', 'name']),
    
    // === Getters ===
    ...mapState(useCounterStore, ['doubleCount', 'isPositive']),
    
    // === Local Computed ===
    localComputed() {
      return this.count + 100
    }
  }
}
```

## 测试用例

```javascript
describe('mapGetters', () => {
  let pinia
  let useCounterStore
  
  beforeEach(() => {
    pinia = createPinia()
    useCounterStore = defineStore('counter', {
      state: () => ({ count: 5 }),
      getters: {
        doubleCount: state => state.count * 2,
        quadrupleCount: state => state.count * 4
      }
    })
  })
  
  test('maps getters with array', () => {
    const mapped = mapGetters(useCounterStore, ['doubleCount'])
    const component = { $pinia: pinia }
    
    const value = mapped.doubleCount.get.call(component)
    expect(value).toBe(10)
  })
  
  test('maps getters with alias', () => {
    const mapped = mapGetters(useCounterStore, {
      doubled: 'doubleCount'
    })
    const component = { $pinia: pinia }
    
    const value = mapped.doubled.get.call(component)
    expect(value).toBe(10)
  })
  
  test('is equivalent to mapState', () => {
    const fromMapState = mapState(useCounterStore, ['doubleCount'])
    const fromMapGetters = mapGetters(useCounterStore, ['doubleCount'])
    const component = { $pinia: pinia }
    
    const stateValue = fromMapState.doubleCount.get.call(component)
    const getterValue = fromMapGetters.doubleCount.get.call(component)
    
    expect(stateValue).toBe(getterValue)
  })
  
  test('reactive to state changes', () => {
    const mapped = mapGetters(useCounterStore, ['doubleCount'])
    const component = { $pinia: pinia }
    const store = useCounterStore(pinia)
    
    expect(mapped.doubleCount.get.call(component)).toBe(10)
    
    store.count = 20
    expect(mapped.doubleCount.get.call(component)).toBe(40)
  })
})
```

## 本章小结

本章讲解了 mapGetters：

- **设计理念**：Pinia 统一使用 mapState 处理 state 和 getters
- **兼容实现**：mapGetters 是 mapState 的别名
- **迁移建议**：新项目直接使用 mapState
- **最佳实践**：使用注释或命名约定区分来源

下一章实现辅助工具函数。
