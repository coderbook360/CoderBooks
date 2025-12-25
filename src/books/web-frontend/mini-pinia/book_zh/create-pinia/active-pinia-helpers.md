---
sidebar_position: 12
title: setActivePinia 与 getActivePinia
---

# setActivePinia 与 getActivePinia

上一章我们介绍了 `activePinia` 的设计理念。本章将深入这两个辅助函数的实现细节和使用模式。

## 函数签名

```typescript
// 设置活动的 Pinia 实例
export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined

// 获取活动的 Pinia 实例
export function getActivePinia(): Pinia | undefined
```

两个函数都返回 `Pinia | undefined`，处理可能不存在的情况。

## setActivePinia 实现

```typescript
// src/pinia/rootStore.ts

// 模块级变量，存储当前活动的 Pinia 实例
let activePinia: Pinia | undefined

export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined {
  activePinia = pinia
  return pinia
}
```

实现非常简单：赋值并返回。返回值的设计允许链式使用：

```typescript
// 创建并立即激活
const pinia = setActivePinia(createPinia())

// 或者在条件语句中使用
if (setActivePinia(pinia)) {
  // pinia 被设置并且是真值
}
```

### 何时调用 setActivePinia

**场景一：install 方法中**

```typescript
install(app: App) {
  pinia._a = app
  app.provide(piniaSymbol, pinia)
  setActivePinia(pinia)  // 安装后激活
}
```

**场景二：useStore 中**

```typescript
function useStore(pinia?: Pinia | null): Store {
  pinia = pinia || inject(piniaSymbol, null) || activePinia
  
  if (pinia) {
    setActivePinia(pinia)  // 使用时更新
  }
  
  // ...
}
```

**场景三：手动调用**

```typescript
// main.ts
import { createPinia, setActivePinia } from '@pinia'

const pinia = createPinia()
setActivePinia(pinia)  // 在 app.use 之前手动设置

app.use(pinia)
```

## getActivePinia 实现

```typescript
export function getActivePinia(): Pinia | undefined {
  return activePinia
}
```

同样简单，直接返回模块变量。

### 增强版本

官方 Pinia 的实现稍微复杂一些，会尝试从组件上下文获取：

```typescript
import { getCurrentInstance, inject } from 'vue'

export function getActivePinia(): Pinia | undefined {
  // 如果在组件上下文中，优先使用 inject
  const instance = getCurrentInstance()
  
  if (instance) {
    const injected = inject(piniaSymbol, null) as Pinia | null
    if (injected) {
      return injected
    }
  }
  
  // 回退到全局 activePinia
  return activePinia
}
```

这个增强版本的好处：
- 在组件内自动使用正确的 Pinia 实例
- 支持多 Pinia 实例场景
- 更符合 Vue 的依赖注入模式

## 使用模式

### 模式一：应用初始化

```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia, setActivePinia } from '@pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// 在路由守卫之前设置 activePinia
setActivePinia(pinia)

app.use(pinia)
app.use(router)

app.mount('#app')
```

### 模式二：测试环境

```typescript
// tests/setup.ts
import { setActivePinia, createPinia } from '@pinia'
import { beforeEach } from 'vitest'

beforeEach(() => {
  // 每个测试前创建新的 pinia 实例
  setActivePinia(createPinia())
})
```

```typescript
// tests/counter.test.ts
import { useCounterStore } from '@/stores/counter'

describe('counter store', () => {
  it('should increment', () => {
    // 由于 beforeEach 中设置了 activePinia
    // 这里可以直接使用
    const counter = useCounterStore()
    
    counter.increment()
    
    expect(counter.count).toBe(1)
  })
})
```

### 模式三：SSR 上下文

```typescript
// server.ts
import { createPinia, setActivePinia } from '@pinia'

export async function render(url: string) {
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  // 每个请求使用独立的 pinia 实例
  setActivePinia(pinia)
  
  app.use(pinia)
  app.use(router)
  
  // 渲染页面
  const html = await renderToString(app)
  
  // 获取序列化的状态
  const state = JSON.stringify(pinia.state.value)
  
  return { html, state }
}
```

## 注意事项

### 注意一：异步操作

在异步操作中，`activePinia` 可能已经变化：

```typescript
async function someAsyncOperation() {
  const currentPinia = getActivePinia()  // 保存当前实例
  
  await someAsyncTask()
  
  // 此时 activePinia 可能已经变化
  // 使用之前保存的 currentPinia
  const store = useStore(currentPinia)
}
```

### 注意二：模块初始化顺序

```typescript
// ❌ 错误：在 pinia 创建之前使用
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()  // activePinia 还是 undefined

// ✅ 正确：确保 pinia 已设置
import { createPinia, setActivePinia } from '@pinia'

setActivePinia(createPinia())
const counter = useCounterStore()  // 现在可以工作
```

### 注意三：清理

在测试或 SSR 场景，记得清理：

```typescript
afterEach(() => {
  // 清理 activePinia，避免测试污染
  setActivePinia(undefined)
})
```

## 与 Vue 响应式系统的关系

`activePinia` 不是响应式的，它只是一个普通变量。这是有意为之：

1. **不需要响应式**：`activePinia` 不会频繁变化
2. **避免开销**：响应式有性能成本
3. **简化实现**：简单的赋值足以满足需求

如果需要响应式的 pinia 引用，可以使用 `inject`：

```typescript
setup() {
  // 这是响应式的，如果 pinia 变化会更新
  const pinia = inject(piniaSymbol)
  
  return { pinia }
}
```

## 完整实现

让我们整合 `rootStore.ts` 的完整实现：

```typescript
// src/pinia/rootStore.ts
import { getCurrentInstance, inject } from 'vue'
import type { Pinia } from './types'
import { piniaSymbol } from './createPinia'

/**
 * 当前活动的 Pinia 实例
 * 用于在组件外部访问 Store
 */
let activePinia: Pinia | undefined

/**
 * 设置活动的 Pinia 实例
 * 
 * @param pinia - Pinia 实例或 undefined
 * @returns 设置的 Pinia 实例
 * 
 * @example
 * ```ts
 * import { createPinia, setActivePinia } from 'pinia'
 * 
 * const pinia = createPinia()
 * setActivePinia(pinia)
 * ```
 */
export function setActivePinia(pinia: Pinia | undefined): Pinia | undefined {
  activePinia = pinia
  return pinia
}

/**
 * 获取活动的 Pinia 实例
 * 
 * 获取逻辑：
 * 1. 如果在组件上下文中，优先使用 inject 获取
 * 2. 否则返回全局 activePinia
 * 
 * @returns 当前活动的 Pinia 实例，如果不存在则返回 undefined
 * 
 * @example
 * ```ts
 * import { getActivePinia } from 'pinia'
 * 
 * const pinia = getActivePinia()
 * if (pinia) {
 *   // 使用 pinia
 * }
 * ```
 */
export function getActivePinia(): Pinia | undefined {
  // 检查是否在组件上下文中
  const instance = getCurrentInstance()
  
  // 如果在组件中，优先使用 inject
  if (instance) {
    const injected = inject(piniaSymbol, null) as Pinia | null
    if (injected) {
      return injected
    }
  }
  
  // 返回全局 activePinia
  return activePinia
}

/**
 * 内部使用：获取 activePinia 的原始引用
 * 不通过 inject 获取，用于性能敏感场景
 */
export function getActivePiniaRaw(): Pinia | undefined {
  return activePinia
}
```

## 导出到公共 API

在 `index.ts` 中导出这些函数：

```typescript
// src/pinia/index.ts
export { setActivePinia, getActivePinia } from './rootStore'
```

## 本章小结

本章我们详细分析了 `setActivePinia` 和 `getActivePinia`：

1. **setActivePinia**：设置全局活动的 Pinia 实例
   - 在 install 时自动调用
   - 可手动调用以支持组件外使用

2. **getActivePinia**：获取当前活动的 Pinia 实例
   - 优先从组件上下文 inject
   - 回退到全局 activePinia

3. **使用模式**：
   - 应用初始化时设置
   - 测试环境中隔离
   - SSR 场景中请求隔离

4. **注意事项**：
   - 异步操作中保存引用
   - 注意模块初始化顺序
   - 测试后清理

至此，我们完成了 `createPinia` 相关的所有内容。下一部分将进入 `defineStore` 的核心实现。

---

**下一章**：[defineStore 函数签名解析](../define-store/function-signature.md)
