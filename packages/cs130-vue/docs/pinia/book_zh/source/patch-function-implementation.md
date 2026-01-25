# $patch 函数模式

函数模式的 $patch 提供了完全的灵活性，可以执行任意状态操作。这一章分析其实现和使用场景。

## 基本用法

函数模式接受一个回调函数，回调参数是当前状态：

```typescript
const store = useCartStore()

store.$patch(state => {
  state.items.push({ id: 1, name: 'Product' })
  state.total += 100
  state.lastUpdated = Date.now()
})
```

## 实现分析

```typescript
function $patch(partialStateOrMutator) {
  let subscriptionMutation: SubscriptionCallbackMutation<S>
  
  isListening = isSyncListening = false
  
  if (typeof partialStateOrMutator === 'function') {
    // 函数模式
    partialStateOrMutator(pinia.state.value[$id] as UnwrapRef<S>)
    
    subscriptionMutation = {
      type: MutationType.patchFunction,
      storeId: $id,
      events: debuggerEvents as DebuggerEvent[]
    }
  } else {
    // 对象模式，上一章已分析
  }
  
  // 恢复监听并触发订阅...
}
```

函数模式的实现非常直接：调用传入的函数，将状态对象作为参数传递。

## 与对象模式的区别

对象模式创建的 mutation 包含 payload：

```typescript
{
  type: MutationType.patchObject,
  storeId: $id,
  payload: partialStateOrMutator,  // 有 payload
  events: debuggerEvents
}
```

函数模式没有 payload：

```typescript
{
  type: MutationType.patchFunction,
  storeId: $id,
  events: debuggerEvents  // 没有 payload
}
```

这是因为函数的执行过程无法序列化。DevTools 只能显示"执行了一个函数"，无法显示具体内容。

## 使用场景

函数模式适合需要复杂操作的场景：

数组操作：

```typescript
store.$patch(state => {
  // 删除特定项
  const index = state.items.findIndex(i => i.id === itemId)
  if (index > -1) {
    state.items.splice(index, 1)
  }
})
```

条件更新：

```typescript
store.$patch(state => {
  if (state.count > 10) {
    state.count = 10
    state.capped = true
  }
})
```

计算属性更新：

```typescript
store.$patch(state => {
  state.items.push(newItem)
  // 同步更新依赖的统计数据
  state.total = state.items.reduce((sum, i) => sum + i.price, 0)
  state.count = state.items.length
})
```

## 状态的直接访问

传入函数的 state 参数是 `pinia.state.value[$id]`，即直接的响应式对象：

```typescript
store.$patch(state => {
  // state 是 reactive 对象
  // 对于 ref 属性，已经被解包
  state.count = 10  // 直接赋值
  
  // 嵌套对象也是响应式的
  state.user.profile.age = 25
})
```

## 类型安全

TypeScript 能正确推断 state 类型：

```typescript
interface CartState {
  items: CartItem[]
  total: number
}

const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    total: 0
  })
})

store.$patch(state => {
  // state 被推断为 CartState
  state.items.push({ id: 1, name: 'A', price: 100 })
  // state.nonExistent  // 类型错误
})
```

## 异步操作的陷阱

$patch 回调应该是同步的：

```typescript
// ❌ 错误：异步操作
store.$patch(async state => {
  const data = await fetchData()
  state.data = data  // 此时订阅已触发，状态变化不会被正确追踪
})

// ✅ 正确：在 action 中处理
async function loadData() {
  const data = await fetchData()
  store.$patch({ data })
}
```

$patch 在调用回调后立即触发订阅，不会等待异步操作。

## 错误处理

回调中的错误会冒泡：

```typescript
try {
  store.$patch(state => {
    state.items.push(newItem)
    if (state.items.length > 100) {
      throw new Error('Too many items')
    }
  })
} catch (e) {
  console.error('Patch failed:', e)
  // 注意：错误之前的修改可能已经应用
}
```

由于状态修改是立即生效的，错误抛出前的修改不会回滚。如果需要事务性操作，考虑先验证再修改：

```typescript
store.$patch(state => {
  // 先验证
  if (state.items.length >= 100) {
    throw new Error('Too many items')
  }
  // 验证通过后再修改
  state.items.push(newItem)
})
```

## 批量操作的性能

函数模式自然支持批量操作：

```typescript
store.$patch(state => {
  // 100 次操作只触发一次订阅
  for (let i = 0; i < 100; i++) {
    state.items.push({ id: i, value: i * 2 })
  }
})
```

相比循环调用直接修改，这样只触发一次订阅和一次 DOM 更新。

## 与 immer 的对比

$patch 的函数模式让人想起 immer：

```typescript
// immer 风格
produce(state, draft => {
  draft.items.push(item)
})

// Pinia 风格
store.$patch(state => {
  state.items.push(item)
})
```

不同之处在于：

- immer 创建新的不可变状态，Pinia 直接修改响应式状态
- immer 需要返回修改后的状态，Pinia 直接在原地修改
- immer 可以跟踪所有修改生成补丁，Pinia 依赖 Vue 的响应式追踪

## debuggerEvents

开发环境下，Vue 的响应式系统会追踪所有修改：

```typescript
if (__DEV__) {
  debuggerEvents = []
  // Vue 会将所有触发的事件记录到 debuggerEvents
}
```

这些事件会被传递给订阅回调和 DevTools，用于显示变化详情。

## 何时选择函数模式

优先使用函数模式的场景：

1. 数组操作：push、splice、filter 等
2. 条件修改：需要根据当前状态决定修改内容
3. 多步骤操作：一个操作需要修改多个相互依赖的属性
4. 复杂计算：需要基于当前值计算新值

优先使用对象模式的场景：

1. 简单的属性更新
2. 需要在 DevTools 中查看 payload
3. 批量设置已知的新值
4. API 响应的直接合并

```typescript
// 对象模式：直接设置新值
store.$patch({ user: apiResponse.user })

// 函数模式：基于当前值操作
store.$patch(state => {
  state.count++
  state.lastOperation = 'increment'
})
```

理解两种模式的区别和适用场景，能让你写出更清晰、更高效的状态更新代码。下一章我们将分析 $reset 的实现。
