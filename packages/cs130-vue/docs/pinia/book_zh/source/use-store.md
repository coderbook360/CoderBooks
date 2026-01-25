# useStore 获取实例

上一章我们分析了 defineStore 返回的 useStore 函数的入口逻辑。这一章将深入分析 useStore 获取 Store 实例的完整流程，包括 Pinia 实例的获取、Store 的创建与缓存。

## useStore 的完整流程

当调用 `useUserStore()` 时，实际执行的是 defineStore 返回的 useStore 函数。这个函数的完整逻辑如下：

```typescript
function useStore(pinia?: Pinia | null, hot?: StoreGeneric): StoreGeneric {
  // 1. 检查是否有注入上下文
  const hasContext = hasInjectionContext()
  
  // 2. 获取 pinia 实例
  pinia = pinia || (hasContext ? inject(piniaSymbol, null) : null)
  
  // 3. 设置活跃 pinia
  if (pinia) setActivePinia(pinia)
  
  // 4. 确保有可用的 pinia
  pinia = getActivePinia()
  
  if (__DEV__ && !pinia) {
    throw new Error(
      `[🍍]: "getActivePinia()" was called but there was no active Pinia. ` +
      `Did you forget to install pinia?\n` +
      `\tconst pinia = createPinia()\n` +
      `\tapp.use(pinia)\n` +
      `This will fail in production.`
    )
  }

  // 5. 检查是否已存在该 Store
  if (!pinia._s.has(id)) {
    // 6. 创建新 Store
    if (isSetupStore) {
      createSetupStore(id, setup, options, pinia)
    } else {
      createOptionsStore(id, options as any, pinia)
    }

    if (__DEV__) {
      useStore._pinia = pinia
    }
  }

  // 7. 获取 Store 实例
  const store: StoreGeneric = pinia._s.get(id)!

  // 8. 开发环境热更新处理
  if (__DEV__ && hot) {
    const hotId = '__hot:' + id
    const newStore = isSetupStore
      ? createSetupStore(hotId, setup, options, pinia, true)
      : createOptionsStore(hotId, assign({}, options) as any, pinia, true)

    hot._hotUpdate(newStore)

    delete pinia.state.value[hotId]
    pinia._s.delete(hotId)
  }

  // 9. 返回 Store
  return store
}
```

让我们逐步分析每个阶段。

## 阶段一：获取 Pinia 实例

```typescript
const hasContext = hasInjectionContext()
pinia = pinia || (hasContext ? inject(piniaSymbol, null) : null)
if (pinia) setActivePinia(pinia)
pinia = getActivePinia()
```

这段代码实现了 Pinia 实例的多来源获取策略。

首先检查是否有传入 pinia 参数。如果显式传入了，直接使用：

```typescript
const store = useUserStore(myPinia)
```

如果没有传入，检查是否在可以 inject 的上下文中。如果是，从组件的 provide/inject 链中获取：

```typescript
pinia = hasContext ? inject(piniaSymbol, null) : null
```

获取到 pinia 后，将其设置为活跃实例。这确保了后续的 Store 调用（比如一个 Store 内访问另一个 Store）能使用同一个 Pinia 实例。

最后调用 getActivePinia 获取最终的 Pinia 实例。这是一道保险，确保即使之前的步骤都失败了，还有 activePinia 作为后备。

## 阶段二：Store 存在性检查

```typescript
if (!pinia._s.has(id)) {
  // 创建 Store
}
```

`pinia._s` 是一个 Map，存储已创建的 Store 实例。键是 Store ID，值是 Store 实例。

这个检查是 Store 单例模式的关键。如果 Map 中已存在该 ID 的 Store，不会重复创建，直接跳到获取阶段。

## 阶段三：创建 Store

```typescript
if (isSetupStore) {
  createSetupStore(id, setup, options, pinia)
} else {
  createOptionsStore(id, options, pinia)
}
```

根据 defineStore 时确定的 isSetupStore 标志，调用对应的创建函数。

createOptionsStore 处理 Options Store，它会将 options 中的 state、getters、actions 转换为 Setup Store 的形式，然后调用 createSetupStore。

createSetupStore 是最核心的创建逻辑，所有 Store 最终都通过它创建。我们将在后续章节详细分析。

创建完成后，Store 实例会被注册到 `pinia._s`：

```typescript
// createSetupStore 内部
pinia._s.set(id, store)
```

## 阶段四：获取并返回 Store

```typescript
const store: StoreGeneric = pinia._s.get(id)!
return store
```

从 Map 中获取 Store 实例并返回。这里使用 `!` 断言，因为前面的逻辑保证了 Store 一定存在（要么已存在，要么刚创建）。

## 热更新处理

在开发环境中，当 Store 的代码改变时，需要更新 Store 而保留状态：

```typescript
if (__DEV__ && hot) {
  const hotId = '__hot:' + id
  
  // 创建一个临时的新 Store，id 带 __hot: 前缀
  const newStore = isSetupStore
    ? createSetupStore(hotId, setup, options, pinia, true)
    : createOptionsStore(hotId, assign({}, options) as any, pinia, true)

  // 用新 Store 的逻辑更新旧 Store
  hot._hotUpdate(newStore)

  // 清理临时 Store
  delete pinia.state.value[hotId]
  pinia._s.delete(hotId)
}
```

热更新的原理是：创建一个带有新代码的临时 Store，用它的 getters 和 actions 替换原 Store 的对应部分，但保留原 Store 的 state。这样用户看到的是最新的代码逻辑，但数据没有丢失。

## 组件外使用

useStore 可以在组件外使用，但需要注意时机：

```typescript
// router/index.ts
import { useUserStore } from '@/stores/user'

router.beforeEach((to) => {
  // ✅ 可以工作，因为 pinia 已安装
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return '/login'
  }
})
```

这能工作是因为 router guard 在应用初始化后才执行，此时 Pinia 已安装，activePinia 有效。

但在模块初始化时调用会失败：

```typescript
// stores/order.ts
import { useUserStore } from './user'

// ❌ 错误：模块加载时 pinia 可能还没安装
const userStore = useUserStore()

export const useOrderStore = defineStore('order', { ... })
```

解决方法是将调用延迟到运行时：

```typescript
export const useOrderStore = defineStore('order', {
  actions: {
    checkout() {
      // ✅ 运行时调用，pinia 已安装
      const userStore = useUserStore()
    }
  }
})
```

## 错误处理

useStore 在开发环境提供详细的错误信息：

```typescript
if (__DEV__ && !pinia) {
  throw new Error(
    `[🍍]: "getActivePinia()" was called but there was no active Pinia. ` +
    `Did you forget to install pinia?\n` +
    `\tconst pinia = createPinia()\n` +
    `\tapp.use(pinia)\n` +
    `This will fail in production.`
  )
}
```

这个错误信息非常友好，直接告诉开发者问题所在和解决方法。

在生产环境，错误检查可能被移除（取决于构建配置），代码会尝试继续执行。这时如果 pinia 真的是 undefined，会在后续操作中抛出不那么明确的错误。

## 多次调用的行为

useStore 可以被多次调用，返回的始终是同一个实例：

```typescript
const store1 = useUserStore()
const store2 = useUserStore()

console.log(store1 === store2)  // true
```

这是因为第二次调用时，`pinia._s.has(id)` 返回 true，直接从 Map 获取已存在的实例。

这个单例行为使得不同组件可以共享同一份状态，这正是状态管理的核心价值。

下一章我们将分析 createOptionsStore，了解 Options Store 是如何被创建的。
