---
sidebar_position: 11
title: activePinia 与上下文注入
---

# activePinia 与上下文注入

在组件内部使用 Store 时，Pinia 可以通过 `inject` 获取实例。但在组件外部呢？本章将探讨 `activePinia` 机制，理解 Pinia 如何在各种上下文中工作。

## 问题：组件外部的 Store 访问

考虑这个场景：

```typescript
// stores/counter.ts
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// router/index.ts
import { useCounterStore } from '@/stores/counter'

router.beforeEach((to, from) => {
  const counter = useCounterStore()  // 这里能工作吗？
  console.log(counter.count)
})
```

在路由守卫中，我们不在组件的 `setup` 函数内，没有 `getCurrentInstance()`。`inject` 不可用，那 `useCounterStore()` 如何获取 Pinia 实例？

答案是 **activePinia** 机制。

## activePinia 设计

Pinia 维护一个模块级别的变量 `activePinia`，存储当前活动的 Pinia 实例：

```typescript
// src/pinia/rootStore.ts
import type { Pinia } from './types'

// 当前活动的 Pinia 实例
export let activePinia: Pinia | undefined

/**
 * 设置活动的 Pinia 实例
 */
export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined {
  activePinia = pinia
  return pinia
}

/**
 * 获取活动的 Pinia 实例
 */
export function getActivePinia(): Pinia | undefined {
  return activePinia
}
```

## useStore 中的获取逻辑

`useStore` 函数内部按以下优先级获取 Pinia 实例：

```typescript
function useStore(pinia?: Pinia | null): Store {
  // 1. 检查是否显式传递了 pinia 参数
  // 2. 尝试从组件上下文 inject
  // 3. 使用 activePinia
  
  const currentInstance = getCurrentInstance()
  
  pinia = pinia ||
         (currentInstance && inject(piniaSymbol, null)) ||
         activePinia
  
  if (!pinia) {
    throw new Error(
      '[Pinia]: "useStore()" was called without an active Pinia instance.'
    )
  }
  
  // 设置当前 pinia 为 active
  setActivePinia(pinia)
  
  // ... 创建或获取 Store
}
```

这个设计的优雅之处：

1. **灵活性**：支持多种获取方式
2. **自动设置**：使用后自动设置为 active，方便后续使用
3. **明确的错误信息**：找不到时抛出有意义的错误

## activePinia 的使用场景

### 场景一：路由守卫

```typescript
// main.ts
import { createPinia, setActivePinia } from '@pinia'

const pinia = createPinia()
setActivePinia(pinia)  // 设置全局活动实例

app.use(pinia)
app.use(router)

// router/index.ts
import { useAuthStore } from '@/stores/auth'

router.beforeEach((to) => {
  // 现在可以工作了，会使用 activePinia
  const auth = useAuthStore()
  
  if (!auth.isLoggedIn && to.meta.requiresAuth) {
    return '/login'
  }
})
```

### 场景二：Axios 拦截器

```typescript
// api/axios.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: '/api'
})

api.interceptors.request.use(config => {
  // 在拦截器中使用 Store
  const auth = useAuthStore()
  
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  
  return config
})
```

### 场景三：独立的工具函数

```typescript
// utils/analytics.ts
import { useUserStore } from '@/stores/user'

export function trackEvent(event: string) {
  const user = useUserStore()
  
  analytics.track(event, {
    userId: user.id,
    timestamp: Date.now()
  })
}
```

## 自动激活机制

除了手动调用 `setActivePinia`，Pinia 还提供了自动激活机制：

```typescript
// install 方法中
install(app: App) {
  // ... 其他逻辑
  
  // 自动设置为 activePinia
  setActivePinia(pinia)
}
```

这意味着在 `app.use(pinia)` 之后，`activePinia` 自动被设置。大多数情况下不需要手动调用 `setActivePinia`。

## 多个 Pinia 实例

当存在多个 Pinia 实例时（如微前端），`activePinia` 可能不是你期望的那个：

```typescript
// 主应用
const mainPinia = createPinia()
mainApp.use(mainPinia)  // activePinia = mainPinia

// 子应用
const subPinia = createPinia()
subApp.use(subPinia)    // activePinia = subPinia

// 现在 activePinia 是 subPinia
// 如果在主应用的 Store 中调用 useStore，会使用 subPinia！
```

解决方案：显式传递 pinia 实例：

```typescript
// 主应用
const mainStore = useMainStore(mainPinia)  // 显式指定

// 子应用
const subStore = useSubStore(subPinia)     // 显式指定
```

或者在组件内使用，依赖 `inject` 获取正确的实例。

## 完整实现

让我们完善 `rootStore.ts` 的实现：

```typescript
// src/pinia/rootStore.ts
import { getCurrentInstance, inject } from 'vue'
import type { Pinia } from './types'
import { piniaSymbol } from './createPinia'

/**
 * 当前活动的 Pinia 实例
 */
export let activePinia: Pinia | undefined

/**
 * 设置活动的 Pinia 实例
 */
export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined {
  activePinia = pinia
  return pinia
}

/**
 * 获取活动的 Pinia 实例
 */
export function getActivePinia(): Pinia | undefined {
  // 如果在组件内，优先从 inject 获取
  const instance = getCurrentInstance()
  
  if (instance) {
    const injected = inject(piniaSymbol, null) as Pinia | null
    if (injected) {
      return injected
    }
  }
  
  // 否则返回全局 activePinia
  return activePinia
}
```

## 与 effectScope 的配合

在 Store 创建时，`activePinia` 也被用于 `effectScope` 内部：

```typescript
function createSetupStore(id, setup, pinia) {
  const scope = effectScope(true)
  
  const setupStore = scope.run(() => {
    // 在 scope 中设置 activePinia
    // 确保 setup 函数内部的嵌套 useStore 调用能正常工作
    setActivePinia(pinia)
    return setup()
  })
  
  // ...
}
```

这确保了 Store 的 setup 函数中可以访问其他 Store：

```typescript
const useCartStore = defineStore('cart', () => {
  // 在 cart store 的 setup 中访问 user store
  const userStore = useUserStore()  // 使用 activePinia
  
  // ...
})
```

## 调试技巧

当遇到 "Pinia not found" 错误时，可以按以下步骤排查：

1. **检查是否调用了 `app.use(pinia)`**
2. **检查 useStore 的调用位置**：是在组件内还是组件外
3. **检查调用时机**：是否在 `app.use(pinia)` 之后
4. **手动设置 activePinia**：作为临时解决方案

```typescript
// 调试代码
import { getActivePinia } from '@pinia'

console.log('activePinia:', getActivePinia())
```

## 本章小结

本章我们探讨了 `activePinia` 机制：

1. **设计目的**：支持在组件外部使用 Store

2. **获取优先级**：
   - 显式传递的 pinia 参数
   - 组件上下文的 inject
   - 全局 activePinia

3. **自动激活**：`app.use(pinia)` 后自动设置

4. **多实例注意**：存在多个 Pinia 实例时需显式指定

5. **与 effectScope 配合**：确保嵌套 Store 访问正常

下一章我们将深入 `setActivePinia` 和 `getActivePinia` 的实现细节。

---

**下一章**：[setActivePinia 与 getActivePinia](active-pinia-helpers.md)
