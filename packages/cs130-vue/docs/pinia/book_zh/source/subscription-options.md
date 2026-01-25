# 订阅选项详解

$subscribe 接受多个选项控制订阅行为。这一章详细分析每个选项的作用和使用场景。

## 选项类型定义

```typescript
interface SubscribeOptions {
  detached?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
  immediate?: boolean
}
```

## detached 选项

默认情况下，订阅与组件生命周期绑定：

```typescript
// 组件 setup 中
export default {
  setup() {
    const store = useStore()
    
    // 组件卸载时自动取消订阅
    store.$subscribe((mutation, state) => {
      console.log('State changed')
    })
  }
}
```

这是通过 Vue 的 onScopeDispose 实现的：

```typescript
if (!detached && getCurrentScope()) {
  onScopeDispose(removeSubscription)
}
```

如果当前有活跃的 effectScope（组件 setup 中有），在 scope 销毁时自动取消订阅。

detached: true 时，订阅独立于组件：

```typescript
// 即使组件卸载，订阅仍然有效
store.$subscribe(
  (mutation, state) => {
    localStorage.setItem('state', JSON.stringify(state))
  },
  { detached: true }
)
```

这适用于全局订阅（如持久化），但必须手动管理取消。

## deep 选项

控制是否深度监听嵌套对象：

```typescript
const useStore = defineStore('demo', {
  state: () => ({
    user: {
      profile: {
        name: 'Alice',
        settings: {
          theme: 'dark'
        }
      }
    }
  })
})

const store = useStore()

// 深度监听（默认）
store.$subscribe(callback, { deep: true })

store.user.profile.settings.theme = 'light'
// 触发回调 ✅

// 浅监听
store.$subscribe(callback, { deep: false })

store.user.profile.settings.theme = 'light'
// 不触发回调 ❌（只监听顶层）

store.user = { ... }
// 触发回调 ✅（顶层变化）
```

deep: false 提供更好的性能，但可能错过嵌套变化。

## flush 选项

控制回调执行的时机：

### flush: 'pre'（默认）

```typescript
store.$subscribe(callback, { flush: 'pre' })
```

在组件更新之前执行。这是默认值，大多数场景适用。

### flush: 'post'

```typescript
store.$subscribe(callback, { flush: 'post' })
```

在组件更新之后执行。适用于需要访问更新后的 DOM 的场景。

### flush: 'sync'

```typescript
store.$subscribe(callback, { flush: 'sync' })
```

同步执行，状态变化后立即调用。谨慎使用，因为：

1. 可能在一个 tick 内触发多次
2. 可能影响性能
3. 可能在状态不一致时触发

### 时机对比

```typescript
const store = useStore()

store.$subscribe(() => console.log('pre'), { flush: 'pre' })
store.$subscribe(() => console.log('post'), { flush: 'post' })
store.$subscribe(() => console.log('sync'), { flush: 'sync' })

store.count = 1
store.count = 2

// 输出顺序：
// sync（count=1 后立即）
// sync（count=2 后立即）
// pre（下一个 tick 前）
// post（组件更新后）
```

## immediate 选项

是否立即执行回调：

```typescript
// 立即执行一次
store.$subscribe(
  (mutation, state) => {
    console.log('Initial state:', state)
  },
  { immediate: true }
)
```

注意：immediate 执行时，mutation 对象是空的或有默认值。

## 选项组合

选项可以组合使用：

```typescript
// 深度监听，同步执行，独立于组件
store.$subscribe(
  (mutation, state) => {
    // 紧急状态同步
  },
  { 
    deep: true, 
    flush: 'sync', 
    detached: true 
  }
)
```

## 常见场景对应的选项

状态持久化：

```typescript
store.$subscribe(
  (mutation, state) => {
    localStorage.setItem('state', JSON.stringify(state))
  },
  { 
    detached: true,  // 全局生效
    deep: true       // 捕获所有变化
  }
)
```

调试日志：

```typescript
store.$subscribe(
  (mutation, state) => {
    console.log('[DEBUG]', mutation.type, mutation.storeId)
  },
  { 
    flush: 'sync'  // 立即记录
  }
)
```

状态同步到服务器（防抖）：

```typescript
store.$subscribe(
  debounce((mutation, state) => {
    api.syncState(state)
  }, 1000),
  { 
    detached: true,
    deep: true
  }
)
```

DOM 操作：

```typescript
store.$subscribe(
  (mutation, state) => {
    // 需要访问更新后的 DOM
    document.querySelector('.count').classList.add('changed')
  },
  { flush: 'post' }
)
```

## 性能优化

shallow + flush: pre 组合最高效：

```typescript
store.$subscribe(
  callback,
  { 
    deep: false,   // 只监听顶层
    flush: 'pre'   // 批量处理
  }
)
```

如果只关心特定状态，用 watch 代替：

```typescript
// 更高效
watch(
  () => store.specificProperty,
  (newVal) => { ... }
)
```

## 多订阅管理

多个订阅的执行顺序：

```typescript
store.$subscribe((m, s) => console.log('A'))
store.$subscribe((m, s) => console.log('B'))
store.$subscribe((m, s) => console.log('C'))

store.count++

// 输出顺序：A, B, C（添加顺序）
```

## 取消订阅的时机

detached 订阅必须手动取消：

```typescript
const unsubscribes: Array<() => void> = []

// 应用初始化时
function setupSubscriptions() {
  unsubscribes.push(
    store.$subscribe(callback, { detached: true })
  )
}

// 应用销毁时
function cleanupSubscriptions() {
  unsubscribes.forEach(unsub => unsub())
}
```

## 动态选项

选项在订阅创建时固定，不能动态修改：

```typescript
// ❌ 错误：不能修改已创建订阅的选项
const unsub = store.$subscribe(callback, { flush: 'pre' })
// 无法改为 'post'

// ✅ 正确：取消后重新订阅
unsub()
store.$subscribe(callback, { flush: 'post' })
```

## 类型安全

TypeScript 提供选项的类型检查：

```typescript
store.$subscribe(callback, {
  flush: 'invalid'  // 类型错误
})

store.$subscribe(callback, {
  deep: 'true'  // 类型错误，应为 boolean
})
```

理解这些选项有助于根据具体需求配置订阅行为。下一章我们将分析 $onAction 的实现。
