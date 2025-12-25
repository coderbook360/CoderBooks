---
sidebar_position: 36
title: $reset 方法实现
---

# $reset 方法实现

`$reset` 方法将 Store 状态重置为初始值。本章探讨其设计和实现，包括 Options Store 与 Setup Store 的差异。

## $reset 的用途

```javascript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, name: 'Counter' })
})

const store = useCounterStore()

store.count = 100
store.name = 'Modified'

console.log(store.count)  // 100

// 重置到初始状态
store.$reset()

console.log(store.count)  // 0
console.log(store.name)   // 'Counter'
```

典型使用场景：
- 用户登出后清除状态
- 表单重置
- 测试用例的状态清理

## Options Store 的 $reset

Options Store 的 `state` 是一个工厂函数，可以重新调用获取初始值：

```javascript
function createOptionsStore(id, options, pinia) {
  const { state, getters, actions } = options
  
  function $reset() {
    // 重新调用 state 工厂函数获取初始值
    const initialState = state ? state() : {}
    
    // 使用 $patch 替换当前状态
    this.$patch(($state) => {
      Object.assign($state, initialState)
    })
  }
  
  // 将 $reset 添加到 store
  store.$reset = $reset
}
```

关键点：
- `state()` 是工厂函数，每次调用返回新的初始对象
- 使用 `$patch` 确保触发订阅
- `$reset` 不是真正的"回退"，而是"重置为初始值"

### 为什么 state 要是工厂函数？

```javascript
// ✅ 正确：工厂函数
state: () => ({ items: [] })

// ❌ 错误：直接对象
state: { items: [] }  // 所有实例共享同一数组
```

工厂函数确保每次调用得到新的对象，避免多个 Store 实例共享状态。

## Setup Store 的 $reset 困境

Setup Store 没有 `state` 工厂函数：

```javascript
defineStore('counter', () => {
  const count = ref(0)  // 初始值在闭包中
  return { count }
})
```

问题：初始值 `0` 只在 setup 执行时存在，之后无法获取。

Pinia 官方的处理：**Setup Store 默认不支持 $reset**。

```javascript
const useStore = defineStore('test', () => {
  const count = ref(0)
  return { count }
})

const store = useStore()
store.$reset()  // ❌ 警告：Setup Store 不支持 $reset
```

## 为 Setup Store 手动实现 $reset

如果需要 `$reset`，可以手动实现：

### 方案 1：暴露 reset 函数

```javascript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const name = ref('Counter')
  
  // 手动定义 reset
  function $reset() {
    count.value = 0
    name.value = 'Counter'
  }
  
  return { count, name, $reset }
})
```

### 方案 2：保存初始快照

```javascript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const name = ref('Counter')
  
  // 保存初始值
  const initialState = {
    count: 0,
    name: 'Counter'
  }
  
  function $reset() {
    count.value = initialState.count
    name.value = initialState.name
  }
  
  return { count, name, $reset }
})
```

### 方案 3：使用 Options 语法扩展

```javascript
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  actions: {
    // 可以在 action 中调用 $reset
    resetAndLog() {
      this.$reset()
      console.log('Store has been reset')
    }
  }
})
```

## $reset 实现细节

完整的 `$reset` 实现：

```javascript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn } = options
  
  const $reset = stateFn
    ? function $reset() {
        const newState = stateFn()
        
        this.$patch(($state) => {
          // 清除不在初始状态中的属性
          const currentKeys = Object.keys($state)
          const initialKeys = Object.keys(newState)
          
          currentKeys.forEach(key => {
            if (!initialKeys.includes(key)) {
              delete $state[key]
            }
          })
          
          // 合并初始状态
          Object.assign($state, newState)
        })
      }
    : function $reset() {
        if (__DEV__) {
          console.warn(
            `Store "${id}" is a setup store and doesn't implement $reset().`
          )
        }
      }
  
  store.$reset = $reset.bind(store)
}
```

## 嵌套状态的重置

对于嵌套对象，需要深度重置：

```javascript
defineStore('user', {
  state: () => ({
    profile: {
      name: '',
      settings: {
        theme: 'light',
        notifications: true
      }
    }
  })
})

store.profile.settings.theme = 'dark'
store.$reset()

// 嵌套属性也被重置
console.log(store.profile.settings.theme)  // 'light'
```

这依赖于 `Object.assign` 的浅拷贝特性：

```javascript
const initial = {
  profile: {
    settings: { theme: 'light' }
  }
}

// Object.assign 会替换整个 profile 对象
Object.assign($state, initial)
// 结果：$state.profile 是新对象，包含正确的嵌套值
```

## 响应式与重置

重置后，响应式连接需要保持：

```javascript
const store = useCounterStore()

// 在组件中使用
const { count } = storeToRefs(store)

// 修改
store.count = 100
console.log(count.value)  // 100

// 重置
store.$reset()
console.log(count.value)  // 0 - storeToRefs 的 ref 仍然有效
```

这是因为 `$patch` 修改的是同一个响应式对象，而不是替换它。

## 重置时触发订阅

`$reset` 通过 `$patch` 实现，所以会触发订阅：

```javascript
store.$subscribe((mutation, state) => {
  console.log('State changed:', mutation.type)
  // mutation.type === 'patch function'
})

store.$reset()  // 触发订阅
```

可以在订阅中判断是否是重置操作：

```javascript
store.$subscribe((mutation, state) => {
  // 没有直接的方式判断是否是 $reset
  // 但可以通过状态变化推断
})
```

## 测试用例

```javascript
describe('$reset method', () => {
  describe('Options Store', () => {
    test('$reset restores initial state', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0, name: 'Test' })
      })
      
      const store = useStore()
      
      store.count = 100
      store.name = 'Modified'
      
      store.$reset()
      
      expect(store.count).toBe(0)
      expect(store.name).toBe('Test')
    })
    
    test('$reset handles nested state', () => {
      const useStore = defineStore('test', {
        state: () => ({
          user: {
            profile: { name: '' }
          }
        })
      })
      
      const store = useStore()
      
      store.user.profile.name = 'John'
      store.$reset()
      
      expect(store.user.profile.name).toBe('')
    })
    
    test('$reset triggers $subscribe', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store = useStore()
      const callback = vi.fn()
      
      store.$subscribe(callback)
      store.count = 10
      store.$reset()
      
      expect(callback).toHaveBeenCalledTimes(2)
    })
    
    test('$reset removes extra properties', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store = useStore()
      
      // 添加额外属性
      store.$state.extra = 'value'
      
      store.$reset()
      
      expect('extra' in store.$state).toBe(false)
    })
  })
  
  describe('Setup Store', () => {
    test('Setup Store warns when calling $reset', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      
      const useStore = defineStore('test', () => {
        const count = ref(0)
        return { count }
      })
      
      const store = useStore()
      store.$reset()
      
      expect(warnSpy).toHaveBeenCalled()
    })
    
    test('manual $reset implementation', () => {
      const useStore = defineStore('test', () => {
        const count = ref(0)
        
        function $reset() {
          count.value = 0
        }
        
        return { count, $reset }
      })
      
      const store = useStore()
      
      store.count = 100
      store.$reset()
      
      expect(store.count).toBe(0)
    })
  })
})
```

## 最佳实践

```javascript
// 1. Options Store：直接使用 $reset
const useOptionsStore = defineStore('options', {
  state: () => ({
    items: [],
    filter: '',
    page: 1
  }),
  actions: {
    clear() {
      this.$reset()  // 简单直接
    }
  }
})

// 2. Setup Store：手动实现
const useSetupStore = defineStore('setup', () => {
  const items = ref([])
  const filter = ref('')
  const page = ref(1)
  
  // 保存初始值便于重置
  const initialState = { items: [], filter: '', page: 1 }
  
  function reset() {
    items.value = [...initialState.items]
    filter.value = initialState.filter
    page.value = initialState.page
  }
  
  return { items, filter, page, reset }
})

// 3. 部分重置
const useUserStore = defineStore('user', {
  state: () => ({
    profile: { name: '', avatar: '' },
    settings: { theme: 'light' },
    session: { token: '', expires: null }
  }),
  actions: {
    // 只重置 session，保留 profile 和 settings
    clearSession() {
      this.session = { token: '', expires: null }
    },
    // 完全重置
    logout() {
      this.$reset()
    }
  }
})
```

## 本章小结

本章实现了 `$reset` 方法：

- **Options Store**：通过重新调用 `state()` 获取初始值
- **Setup Store**：默认不支持，需要手动实现
- **触发订阅**：通过 `$patch` 实现，会触发订阅回调
- **嵌套状态**：通过 `Object.assign` 正确重置
- **响应式保持**：`storeToRefs` 的引用在重置后仍有效

下一章实现 `$dispose` 方法。
