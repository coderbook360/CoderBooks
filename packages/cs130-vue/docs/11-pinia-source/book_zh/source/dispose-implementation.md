# $dispose 实现

$dispose 用于销毁 Store 实例。这一章分析其实现和使用场景。

## 基本用法

```typescript
const store = useCounterStore()

// 销毁 Store
store.$dispose()

// Store 已被销毁，后续调用会重新创建
const newStore = useCounterStore()  // 新实例
```

## 实现分析

```typescript
function $dispose() {
  // 停止 effectScope
  scope.stop()
  
  // 清空订阅列表
  subscriptions.splice(0)
  actionSubscriptions.splice(0)
  
  // 从 Pinia 中移除
  pinia._s.delete($id)
}
```

$dispose 做了三件事：停止响应式副作用、清空订阅、从 Store 注册表中移除。

## scope.stop()

每个 Store 都有自己的 effectScope：

```typescript
const setupStore = pinia._e.run(() => 
  (scope = effectScope()).run(setup)!
)
```

scope 管理 Store 中所有的 computed 和 watcher。stop() 会：

1. 停止所有 computed 的追踪
2. 停止所有 watcher
3. 释放相关资源

```typescript
// Store 内部
const double = computed(() => count.value * 2)

// $dispose 后
// double 不再追踪 count 的变化
```

## 清空订阅

```typescript
subscriptions.splice(0)
actionSubscriptions.splice(0)
```

使用 splice(0) 而不是赋值新数组，确保清空原数组。所有 $subscribe 和 $onAction 的回调都被移除。

## 从 Pinia 移除

```typescript
pinia._s.delete($id)
```

从 Store Map 中删除，下次 useStore 会创建新实例。

## 销毁后的行为

销毁后，Store 实例仍然存在，但：

```typescript
const store = useCounterStore()
store.$dispose()

// 状态仍可访问，但不再响应式更新
console.log(store.count)  // 仍有值

// computed 不再更新
store.count = 10
console.log(store.double)  // 可能是旧值

// 订阅不再触发
// $onAction 回调不再执行
```

不建议继续使用已销毁的 Store。

## 重新创建

销毁后再次调用 useStore 会创建新实例：

```typescript
const store1 = useCounterStore()
store1.count = 100

store1.$dispose()

const store2 = useCounterStore()
console.log(store2.count)  // 0（初始值），不是 100
```

新实例是全新的，状态不会保留。

## 使用场景

测试清理：

```typescript
afterEach(() => {
  const pinia = getActivePinia()
  pinia._s.forEach((store) => {
    store.$dispose()
  })
})
```

动态 Store：

```typescript
// 创建临时 Store
function useTempStore(id: string) {
  const useStore = defineStore(`temp-${id}`, { ... })
  const store = useStore()
  
  // 使用完毕后销毁
  onUnmounted(() => {
    store.$dispose()
  })
  
  return store
}
```

用户登出：

```typescript
function logout() {
  // 销毁所有 Store
  userStore.$dispose()
  cartStore.$dispose()
  preferencesStore.$dispose()
  
  router.push('/login')
}
```

## 与 $reset 的区别

$reset 重置状态但保留 Store：

```typescript
store.$reset()
// Store 仍然存在，只是状态变为初始值
// 订阅仍然有效
```

$dispose 销毁整个 Store：

```typescript
store.$dispose()
// Store 被移除
// 订阅被清空
// 下次 useStore 创建新实例
```

## 销毁所有 Store

```typescript
function disposeAllStores(pinia: Pinia) {
  pinia._s.forEach((store) => {
    store.$dispose()
  })
}
```

或者直接创建新的 Pinia 实例（如果可以）：

```typescript
app.use(createPinia())  // 替换旧的 Pinia
```

## 内存清理

$dispose 有助于防止内存泄漏：

```typescript
// 不再需要的 Store
const tempStore = useTempStore()

// 明确销毁
tempStore.$dispose()

// Store 相关的 watcher 和 computed 被清理
// 可以被垃圾回收
```

## 订阅的自动清理

$dispose 会清理订阅，但 detached 订阅的引用可能仍存在：

```typescript
const callback = () => { ... }

store.$subscribe(callback, { detached: true })

store.$dispose()
// 订阅被移除，但 callback 函数本身不会被销毁
// 如果 callback 捕获了大对象，需要注意
```

## 开发环境的热更新

热更新时不会调用 $dispose，而是更新 Store 内容：

```typescript
// 热更新逻辑
if (hot) {
  hot._hotUpdate(newStore)
  // 不调用 $dispose，保留状态
}
```

这确保了开发时状态不会丢失。

## 错误处理

$dispose 本身不会抛出错误：

```typescript
// 即使 Store 状态异常，$dispose 也会执行
try {
  store.$dispose()
} catch (e) {
  // 通常不会进入这里
}
```

## 类型定义

```typescript
interface StoreGeneric {
  $dispose(): void
}
```

$dispose 不接受参数，不返回值。

## 最佳实践

明确所有权：

```typescript
// 谁创建谁销毁
function createFeature() {
  const store = useFeatureStore()
  
  return {
    store,
    destroy() {
      store.$dispose()
    }
  }
}
```

避免销毁共享 Store：

```typescript
// ❌ 可能影响其他组件
store.$dispose()

// ✅ 只在确定不再需要时销毁
onUnmounted(() => {
  if (isLastConsumer()) {
    store.$dispose()
  }
})
```

测试中使用 fresh Pinia：

```typescript
beforeEach(() => {
  setActivePinia(createPinia())  // 每个测试新的 Pinia
})

// 而不是手动 $dispose 每个 Store
```

下一章我们将分析订阅清理机制。
