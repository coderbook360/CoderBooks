---
sidebar_position: 41
title: $patch 实现：对象模式
---

# $patch 实现：对象模式

`$patch` 是批量更新状态的核心方法。本章详细实现 $patch 的对象模式。

## $patch 对象模式的用法

```javascript
const store = useCounterStore()

// 对象模式：传入部分状态
store.$patch({
  count: 10,
  name: 'New Name'
})

// 嵌套对象
store.$patch({
  user: {
    profile: {
      avatar: 'new-avatar.png'
    }
  }
})
```

## 为什么需要 $patch？

直接修改 vs $patch：

```javascript
// 直接修改：每次修改都触发订阅
store.count = 10        // 触发一次
store.name = 'Test'     // 再触发一次
store.items = []        // 再触发一次
// 共 3 次订阅回调

// $patch：批量修改只触发一次
store.$patch({
  count: 10,
  name: 'Test',
  items: []
})  // 只触发一次订阅回调
```

$patch 的优势：
- **性能**：减少订阅回调次数
- **原子性**：多个属性同时更新
- **语义**：明确表示"这是一次批量操作"

## 基本实现

```javascript
function createPatch(store, pinia, id) {
  return function $patch(partialState) {
    // 对象模式
    if (typeof partialState === 'object') {
      // 合并到全局 state
      mergeReactiveObjects(pinia.state.value[id], partialState)
      
      // 触发订阅
      triggerSubscriptions({
        type: 'patch object',
        storeId: id,
        payload: partialState
      })
    }
  }
}
```

## mergeReactiveObjects 实现

合并对象需要考虑响应式：

```javascript
function mergeReactiveObjects(target, source) {
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = target[key]
    
    // 如果两边都是普通对象，递归合并
    if (
      isPlainObject(targetValue) &&
      isPlainObject(sourceValue) &&
      !isRef(targetValue) &&
      !isReactive(targetValue)
    ) {
      target[key] = mergeReactiveObjects(targetValue, sourceValue)
    } else {
      // 直接赋值
      target[key] = sourceValue
    }
  }
  
  return target
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}
```

## 处理不同数据类型

### 基本类型

```javascript
store.$patch({ count: 10 })  // 直接赋值
```

### 数组

```javascript
// 整体替换数组
store.$patch({ items: [1, 2, 3] })

// 注意：这会替换整个数组，不是 push
// 如果需要 push，使用函数模式
```

### 嵌套对象

```javascript
// 深度合并
store.$patch({
  user: {
    profile: {
      name: 'New Name'
      // avatar 保持不变
    }
  }
})
```

### ref 值

对于 Setup Store 中的 ref：

```javascript
defineStore('test', () => {
  const count = ref(0)
  return { count }
})

// $patch 需要正确处理
store.$patch({ count: 10 })  // 应该设置 count.value = 10
```

实现：

```javascript
function mergeReactiveObjects(target, source) {
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = target[key]
    
    // 处理 ref
    if (isRef(targetValue) && !isRef(sourceValue)) {
      targetValue.value = sourceValue
    }
    // 递归合并对象
    else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      mergeReactiveObjects(targetValue, sourceValue)
    }
    // 直接赋值
    else {
      target[key] = sourceValue
    }
  }
  
  return target
}
```

## 订阅通知

$patch 后需要通知订阅者：

```javascript
function $patch(partialState) {
  if (typeof partialState === 'object') {
    mergeReactiveObjects(pinia.state.value[id], partialState)
    
    // 通知所有订阅者
    subscriptions.slice().forEach(({ callback }) => {
      callback(
        {
          type: 'patch object',
          storeId: id,
          payload: partialState
        },
        pinia.state.value[id]
      )
    })
  }
}
```

为什么使用 `.slice()`？

```javascript
// 复制数组，防止回调中添加/删除订阅影响遍历
subscriptions.slice().forEach(...)
```

## 完整实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const subscriptions = []
  
  function $patch(partialStateOrMutator) {
    let subscriptionMutation
    
    // 判断是对象模式还是函数模式
    if (typeof partialStateOrMutator === 'function') {
      // 函数模式（下一章实现）
      partialStateOrMutator(pinia.state.value[id])
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
    
    // 触发订阅
    const mySubscriptionCallbacks = subscriptions.slice()
    mySubscriptionCallbacks.forEach(({ callback }) => {
      callback(subscriptionMutation, pinia.state.value[id])
    })
  }
  
  // 绑定 $patch 到 store
  const store = reactive({})
  
  Object.defineProperty(store, '$patch', {
    value: $patch,
    writable: false,
    enumerable: false
  })
  
  return store
}
```

## 边界情况处理

### 新增属性

```javascript
store.$patch({
  newProp: 'value'  // state 中原本没有这个属性
})

// mergeReactiveObjects 会添加新属性
// Vue 的响应式系统会自动追踪
```

### null 和 undefined

```javascript
store.$patch({ count: null })      // 设置为 null
store.$patch({ count: undefined }) // 设置为 undefined

// 实现时需要区分：
// - 值为 undefined：不操作（跳过）
// - 值为 null：设置为 null
```

改进的实现：

```javascript
function mergeReactiveObjects(target, source) {
  for (const key in source) {
    // 跳过 undefined
    if (source[key] === undefined) continue
    
    const sourceValue = source[key]
    const targetValue = target[key]
    
    // ... 其他逻辑
  }
}
```

### 删除属性

$patch 不支持删除属性，如果需要删除：

```javascript
// 方案 1：设置为 undefined/null
store.$patch({ obsoleteProp: undefined })

// 方案 2：使用函数模式
store.$patch(state => {
  delete state.obsoleteProp
})

// 方案 3：直接操作
delete store.$state.obsoleteProp
```

## 测试用例

```javascript
describe('$patch object mode', () => {
  test('patches basic values', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0, name: '' })
    })
    
    const store = useStore()
    store.$patch({ count: 10, name: 'Test' })
    
    expect(store.count).toBe(10)
    expect(store.name).toBe('Test')
  })
  
  test('patches nested objects', () => {
    const useStore = defineStore('test', {
      state: () => ({
        user: { profile: { name: '', avatar: '' } }
      })
    })
    
    const store = useStore()
    store.$patch({
      user: { profile: { name: 'John' } }
    })
    
    expect(store.user.profile.name).toBe('John')
    expect(store.user.profile.avatar).toBe('')  // 保持不变
  })
  
  test('triggers subscription once', () => {
    const useStore = defineStore('test', {
      state: () => ({ a: 0, b: 0, c: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.$patch({ a: 1, b: 2, c: 3 })
    
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'patch object' }),
      expect.anything()
    )
  })
  
  test('patches arrays by replacement', () => {
    const useStore = defineStore('test', {
      state: () => ({ items: [1, 2, 3] })
    })
    
    const store = useStore()
    store.$patch({ items: [4, 5] })
    
    expect(store.items).toEqual([4, 5])
  })
  
  test('patches ref values in setup store', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore()
    store.$patch({ count: 10 })
    
    expect(store.count).toBe(10)
  })
  
  test('adds new properties', () => {
    const useStore = defineStore('test', {
      state: () => ({ existing: 'value' })
    })
    
    const store = useStore()
    store.$patch({ newProp: 'new value' })
    
    expect(store.newProp).toBe('new value')
  })
})
```

## 性能考量

### 大对象 patch

```javascript
// 避免 patch 整个大对象
store.$patch({
  hugeArray: newHugeArray  // 会触发大量响应式更新
})

// 更好的做法：精确更新
store.$patch({
  'hugeArray.0.name': 'New Name'  // 只更新需要的部分
})
```

### 批量操作优化

```javascript
// 多次 patch 合并为一次
store.$patch({
  count: 10,
  name: 'Test',
  items: [1, 2, 3]
})

// 而不是
store.$patch({ count: 10 })
store.$patch({ name: 'Test' })
store.$patch({ items: [1, 2, 3] })
```

## 本章小结

本章实现了 $patch 的对象模式：

- **基本原理**：合并对象到 state
- **mergeReactiveObjects**：递归合并，处理嵌套对象
- **ref 处理**：Setup Store 中正确设置 ref.value
- **订阅通知**：合并完成后触发一次订阅
- **边界情况**：新属性、null/undefined、数组

下一章实现 $patch 的函数模式。
