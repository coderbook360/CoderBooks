---
sidebar_position: 42
title: $patch 实现：函数模式
---

# $patch 实现：函数模式

$patch 的函数模式提供了更灵活的状态更新方式。本章详细实现函数模式及其应用场景。

## 函数模式的用法

```javascript
const store = useCounterStore()

// 函数模式：接收 state，直接修改
store.$patch(state => {
  state.count++
  state.items.push('new item')
  delete state.obsoleteField
})
```

## 函数模式 vs 对象模式

| 特性 | 对象模式 | 函数模式 |
|------|---------|---------|
| 语法 | `$patch({ key: value })` | `$patch(state => { ... })` |
| 修改方式 | 合并对象 | 直接操作 |
| 数组操作 | 整体替换 | 可以 push/splice |
| 删除属性 | 不支持 | 支持 delete |
| 条件逻辑 | 不支持 | 支持 if/else |

## 函数模式的优势

### 1. 数组操作

```javascript
// 对象模式：整体替换数组
store.$patch({
  items: [...store.items, 'new item']  // 创建新数组
})

// 函数模式：直接 push
store.$patch(state => {
  state.items.push('new item')  // 原地修改
})
```

### 2. 条件更新

```javascript
store.$patch(state => {
  if (state.count > 10) {
    state.status = 'high'
  } else {
    state.status = 'low'
  }
})
```

### 3. 复杂计算

```javascript
store.$patch(state => {
  const total = state.items.reduce((sum, item) => sum + item.price, 0)
  state.total = total
  state.tax = total * 0.1
  state.grandTotal = total + state.tax
})
```

### 4. 删除属性

```javascript
store.$patch(state => {
  delete state.temporaryField
})
```

## 基本实现

```javascript
function $patch(partialStateOrMutator) {
  if (typeof partialStateOrMutator === 'function') {
    // 函数模式
    partialStateOrMutator(pinia.state.value[id])
    
    // 触发订阅
    triggerSubscriptions({
      type: 'patch function',
      storeId: id
    })
  } else {
    // 对象模式（上一章）
    mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
    
    triggerSubscriptions({
      type: 'patch object',
      storeId: id,
      payload: partialStateOrMutator
    })
  }
}
```

## Setup Store 中的函数模式

Setup Store 的 state 是 ref/reactive，需要正确传递：

```javascript
defineStore('test', () => {
  const count = ref(0)
  const user = reactive({ name: '' })
  
  return { count, user }
})

// $patch 需要传递解包后的 state
store.$patch(state => {
  state.count = 10      // 应该修改 ref.value
  state.user.name = 'John'  // 应该修改 reactive
})
```

实现时，确保 `pinia.state.value[id]` 是正确的代理：

```javascript
// 在创建 Store 时设置 state 代理
for (const key in setupResult) {
  const value = setupResult[key]
  
  if (isRef(value) && !isComputed(value)) {
    Object.defineProperty(pinia.state.value[id], key, {
      get: () => value.value,
      set: (v) => { value.value = v }
    })
  } else if (isReactive(value)) {
    pinia.state.value[id][key] = value
  }
}
```

## 错误处理

函数模式中的错误需要妥善处理：

```javascript
function $patch(partialStateOrMutator) {
  if (typeof partialStateOrMutator === 'function') {
    try {
      partialStateOrMutator(pinia.state.value[id])
    } catch (error) {
      if (__DEV__) {
        console.error(`Error in $patch function for store "${id}":`, error)
      }
      throw error  // 重新抛出，让调用者处理
    }
    
    triggerSubscriptions({
      type: 'patch function',
      storeId: id
    })
  }
}
```

## 订阅中的 mutation 信息

函数模式的 mutation 没有 payload：

```javascript
store.$subscribe((mutation, state) => {
  if (mutation.type === 'patch function') {
    // 函数模式没有 payload
    console.log('State patched via function')
  } else if (mutation.type === 'patch object') {
    // 对象模式有 payload
    console.log('Patched with:', mutation.payload)
  }
})
```

这是设计决策：函数的操作难以序列化描述。

## 与 Vue 响应式的交互

函数模式直接操作响应式对象：

```javascript
store.$patch(state => {
  // 这些修改都是响应式的
  state.count++                    // 触发响应式更新
  state.items.push('item')         // 数组方法被拦截
  state.user.name = 'New Name'     // 嵌套属性也是响应式的
})
```

Vue 的响应式系统会追踪所有修改。

## 异步操作（不推荐）

函数模式内不应该有异步操作：

```javascript
// ❌ 不推荐：异步操作
store.$patch(async (state) => {
  const data = await fetchData()  // 异步操作
  state.data = data
})

// ✅ 推荐：在 action 中处理异步
actions: {
  async loadData() {
    const data = await fetchData()
    this.$patch({ data })
  }
}
```

为什么？
- 订阅在 $patch 调用后立即触发
- 异步操作完成时，订阅早已触发
- 状态变化时机不可预测

## 完整实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const subscriptions = []
  
  function $patch(partialStateOrMutator) {
    let subscriptionMutation
    
    if (typeof partialStateOrMutator === 'function') {
      // 函数模式
      try {
        partialStateOrMutator(pinia.state.value[id])
      } catch (error) {
        // 错误发生时不触发订阅
        throw error
      }
      
      subscriptionMutation = {
        type: 'patch function',
        storeId: id
      }
    } else {
      // 对象模式
      mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
      
      subscriptionMutation = {
        type: 'patch object',
        storeId: id,
        payload: partialStateOrMutator
      }
    }
    
    // 触发订阅（复制数组防止回调中修改）
    subscriptions.slice().forEach(({ callback, options: subOptions }) => {
      callback(subscriptionMutation, pinia.state.value[id])
    })
  }
  
  return { $patch }
}
```

## 实际应用示例

### 购物车操作

```javascript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    total: 0
  }),
  actions: {
    addItem(item) {
      this.$patch(state => {
        const existing = state.items.find(i => i.id === item.id)
        if (existing) {
          existing.quantity++
        } else {
          state.items.push({ ...item, quantity: 1 })
        }
        state.total = state.items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        )
      })
    },
    
    removeItem(itemId) {
      this.$patch(state => {
        const index = state.items.findIndex(i => i.id === itemId)
        if (index > -1) {
          state.items.splice(index, 1)
        }
        state.total = state.items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        )
      })
    },
    
    clearCart() {
      this.$patch(state => {
        state.items.length = 0  // 清空数组
        state.total = 0
      })
    }
  }
})
```

### 表单状态管理

```javascript
const useFormStore = defineStore('form', {
  state: () => ({
    fields: {},
    errors: {},
    dirty: false
  }),
  actions: {
    setField(name, value) {
      this.$patch(state => {
        state.fields[name] = value
        state.dirty = true
        // 清除该字段的错误
        delete state.errors[name]
      })
    },
    
    setErrors(errors) {
      this.$patch(state => {
        Object.assign(state.errors, errors)
      })
    },
    
    reset(initialValues = {}) {
      this.$patch(state => {
        state.fields = { ...initialValues }
        state.errors = {}
        state.dirty = false
      })
    }
  }
})
```

## 测试用例

```javascript
describe('$patch function mode', () => {
  test('patches via function', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$patch(state => {
      state.count = 10
    })
    
    expect(store.count).toBe(10)
  })
  
  test('allows array mutations', () => {
    const useStore = defineStore('test', {
      state: () => ({ items: [1, 2, 3] })
    })
    
    const store = useStore()
    store.$patch(state => {
      state.items.push(4)
      state.items.splice(0, 1)
    })
    
    expect(store.items).toEqual([2, 3, 4])
  })
  
  test('allows property deletion', () => {
    const useStore = defineStore('test', {
      state: () => ({ a: 1, b: 2 })
    })
    
    const store = useStore()
    store.$patch(state => {
      delete state.b
    })
    
    expect('b' in store.$state).toBe(false)
  })
  
  test('triggers subscription with function type', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.$patch(state => { state.count++ })
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'patch function' }),
      expect.anything()
    )
  })
  
  test('handles errors in patch function', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(() => {
      store.$patch(() => {
        throw new Error('Patch error')
      })
    }).toThrow('Patch error')
  })
  
  test('conditional logic in patch', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0, status: '' })
    })
    
    const store = useStore()
    
    store.$patch(state => {
      state.count = 15
      state.status = state.count > 10 ? 'high' : 'low'
    })
    
    expect(store.status).toBe('high')
  })
})
```

## 本章小结

本章实现了 $patch 的函数模式：

- **灵活性**：直接操作 state，支持复杂逻辑
- **数组操作**：可以使用 push、splice 等方法
- **删除属性**：支持 delete 操作
- **条件逻辑**：可以在函数内使用 if/else
- **错误处理**：捕获错误，不触发订阅
- **同步执行**：不推荐异步操作

下一章定义 MutationType 类型。
