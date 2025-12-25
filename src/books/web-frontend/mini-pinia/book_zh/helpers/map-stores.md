---
sidebar_position: 51
title: mapStores 实现：Store 映射
---

# mapStores 实现：Store 映射

`mapStores` 是为 Options API 设计的辅助函数，将多个 Store 映射为计算属性。本章详细实现这个函数。

## Options API 中的需求

```javascript
// 不使用 mapStores
export default {
  computed: {
    counterStore() {
      return useCounterStore()
    },
    userStore() {
      return useUserStore()
    }
  },
  methods: {
    doSomething() {
      this.counterStore.increment()
      console.log(this.userStore.name)
    }
  }
}
```

使用 `mapStores` 简化：

```javascript
import { mapStores } from 'pinia'

export default {
  computed: {
    ...mapStores(useCounterStore, useUserStore)
  },
  methods: {
    doSomething() {
      this.counterStore.increment()
      console.log(this.userStore.name)
    }
  }
}
```

## 命名约定

Store 名称 + "Store" 后缀：

```javascript
const useCounter = defineStore('counter', { ... })
const useUserProfile = defineStore('userProfile', { ... })

mapStores(useCounter, useUserProfile)
// 返回 { counterStore, userProfileStore }
```

## 基本实现

```javascript
function mapStores(...stores) {
  const result = {}
  
  stores.forEach(useStore => {
    // 获取 Store ID
    const id = useStore.$id
    
    // 生成属性名：id + 'Store'
    const name = id + 'Store'
    
    // 创建计算属性
    result[name] = function() {
      // 获取当前组件关联的 Pinia
      const pinia = getActivePinia()
      
      // 返回 Store 实例
      return useStore(pinia)
    }
  })
  
  return result
}
```

## 获取 Store ID

`defineStore` 返回的函数包含 `$id` 属性：

```javascript
function defineStore(id, options) {
  function useStore(pinia) {
    // ... Store 创建逻辑
  }
  
  // 附加 $id 属性
  useStore.$id = id
  
  return useStore
}

// 使用
const useCounter = defineStore('counter', { ... })
console.log(useCounter.$id)  // 'counter'
```

## 处理自定义后缀

Pinia 允许配置后缀：

```javascript
import { setMapStoreSuffix } from 'pinia'

// 修改默认后缀
setMapStoreSuffix('')  // 无后缀
// 或
setMapStoreSuffix('_store')  // 下划线后缀

// 使用 mapStores 后的名称
mapStores(useCounter)
// 默认：{ counterStore }
// 无后缀：{ counter }
// 下划线：{ counter_store }
```

实现：

```javascript
let mapStoreSuffix = 'Store'

function setMapStoreSuffix(suffix) {
  mapStoreSuffix = suffix
}

function mapStores(...stores) {
  const result = {}
  
  stores.forEach(useStore => {
    const id = useStore.$id
    const name = id + mapStoreSuffix
    
    result[name] = function() {
      return useStore(getActivePinia())
    }
  })
  
  return result
}

export { mapStores, setMapStoreSuffix }
```

## 获取 Pinia 实例

在 Options API 中获取 Pinia：

```javascript
function getActivePinia() {
  // 从 Vue 实例获取
  const vm = getCurrentInstance()
  if (vm) {
    return vm.appContext.config.globalProperties.$pinia
  }
  
  // 或从全局变量
  return activePinia
}
```

在计算属性中，可以通过 `this` 访问：

```javascript
result[name] = function() {
  // this 是 Vue 组件实例
  const pinia = this.$pinia
  return useStore(pinia)
}
```

## 完整实现

```javascript
let mapStoreSuffix = 'Store'

function setMapStoreSuffix(suffix) {
  mapStoreSuffix = suffix
}

function mapStores(...stores) {
  // 验证参数
  if (__DEV__) {
    stores.forEach(useStore => {
      if (typeof useStore !== 'function' || !useStore.$id) {
        console.warn(
          'mapStores() expects store definitions created with defineStore()'
        )
      }
    })
  }
  
  return stores.reduce((result, useStore) => {
    const id = useStore.$id
    const name = id + mapStoreSuffix
    
    result[name] = {
      get() {
        // this 是 Vue 组件实例
        return useStore(this.$pinia)
      }
    }
    
    return result
  }, {})
}

export { mapStores, setMapStoreSuffix }
```

## 使用示例

### 基本用法

```javascript
import { mapStores } from 'pinia'
import { useCounterStore } from '@/stores/counter'
import { useUserStore } from '@/stores/user'

export default {
  computed: {
    ...mapStores(useCounterStore, useUserStore)
  },
  
  mounted() {
    console.log(this.counterStore.count)
    console.log(this.userStore.name)
  },
  
  methods: {
    incrementAndLog() {
      this.counterStore.increment()
      console.log('Count:', this.counterStore.count)
    }
  }
}
```

### 与其他计算属性共存

```javascript
export default {
  computed: {
    ...mapStores(useCounterStore),
    
    // 自定义计算属性
    doubleCount() {
      return this.counterStore.count * 2
    }
  }
}
```

### 在模板中使用

```vue
<template>
  <div>
    <p>Count: {{ counterStore.count }}</p>
    <p>User: {{ userStore.name }}</p>
    <button @click="counterStore.increment()">+1</button>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import { useCounterStore } from '@/stores/counter'
import { useUserStore } from '@/stores/user'

export default {
  computed: {
    ...mapStores(useCounterStore, useUserStore)
  }
}
</script>
```

## 与 Composition API 的对比

```javascript
// Options API with mapStores
export default {
  computed: {
    ...mapStores(useCounterStore)
  },
  methods: {
    handle() {
      this.counterStore.increment()
    }
  }
}

// Composition API（推荐）
export default {
  setup() {
    const counterStore = useCounterStore()
    
    const handle = () => {
      counterStore.increment()
    }
    
    return { counterStore, handle }
  }
}
```

## 测试用例

```javascript
describe('mapStores', () => {
  test('maps single store', () => {
    const useCounter = defineStore('counter', {
      state: () => ({ count: 0 })
    })
    
    const mapped = mapStores(useCounter)
    
    expect('counterStore' in mapped).toBe(true)
  })
  
  test('maps multiple stores', () => {
    const useCounter = defineStore('counter', {
      state: () => ({ count: 0 })
    })
    const useUser = defineStore('user', {
      state: () => ({ name: '' })
    })
    
    const mapped = mapStores(useCounter, useUser)
    
    expect('counterStore' in mapped).toBe(true)
    expect('userStore' in mapped).toBe(true)
  })
  
  test('uses custom suffix', () => {
    const useCounter = defineStore('counter', {
      state: () => ({ count: 0 })
    })
    
    setMapStoreSuffix('_store')
    const mapped = mapStores(useCounter)
    setMapStoreSuffix('Store')  // 恢复默认
    
    expect('counter_store' in mapped).toBe(true)
  })
  
  test('computed returns store instance', () => {
    const pinia = createPinia()
    const useCounter = defineStore('counter', {
      state: () => ({ count: 0 })
    })
    
    const mapped = mapStores(useCounter)
    
    // 模拟组件上下文
    const component = {
      $pinia: pinia
    }
    
    const store = mapped.counterStore.get.call(component)
    
    expect(store.$id).toBe('counter')
    expect(store.count).toBe(0)
  })
})
```

## 本章小结

本章实现了 mapStores：

- **核心功能**：将多个 Store 映射为计算属性
- **命名约定**：Store ID + 后缀（默认 "Store"）
- **自定义后缀**：通过 setMapStoreSuffix 配置
- **使用场景**：Options API 组件
- **实现细节**：返回 getter 函数对象

下一章实现 mapState。
