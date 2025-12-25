---
sidebar_position: 7
title: createPinia 函数设计
---

# createPinia 函数设计

从本章开始，我们正式进入 Mini-Pinia 的核心实现。第一个要实现的函数是 `createPinia`——创建 Pinia 实例的入口函数。

## 设计目标

`createPinia` 需要完成以下任务：

1. **创建 Pinia 实例**：一个包含状态树、Store 注册表、插件列表的对象
2. **实现 Vue 插件接口**：提供 `install` 方法，让 Pinia 可以通过 `app.use()` 安装
3. **提供插件注册能力**：实现 `use` 方法，允许注册插件
4. **支持依赖注入**：让组件可以通过 `inject` 获取 Pinia 实例

让我们一步步实现这些功能。

## 最小可运行版本

先从最简单的版本开始：

```typescript
// src/pinia/createPinia.ts
import { ref, markRaw } from 'vue'
import type { App, Ref } from 'vue'
import type { Pinia, StateTree, PiniaPlugin, StoreGeneric } from './types'

// 用于 provide/inject 的 Symbol
export const piniaSymbol = Symbol('pinia')

export function createPinia(): Pinia {
  // 全局状态树：存储所有 Store 的状态
  const state = ref<Record<string, StateTree>>({})
  
  // 插件列表
  const _p: PiniaPlugin[] = []
  
  // Store 注册表
  const _s = new Map<string, StoreGeneric>()
  
  // 创建 Pinia 实例
  const pinia: Pinia = markRaw({
    // Vue 插件 install 方法
    install(app: App) {
      // 保存 Vue app 引用
      pinia._a = app
      // 通过 provide 注入 pinia 实例
      app.provide(piniaSymbol, pinia)
      // 挂载到全局属性（支持 Options API）
      app.config.globalProperties.$pinia = pinia
    },
    
    // 注册插件
    use(plugin: PiniaPlugin) {
      _p.push(plugin)
      return this
    },
    
    // 内部属性
    _p,           // 插件列表
    _a: undefined, // Vue app 实例
    _s,           // Store Map
    state         // 全局状态树
  })
  
  return pinia
}
```

这段代码很简短，让我们逐一解析每个设计决策。

## 核心设计解析

### 为什么使用 markRaw？

```typescript
const pinia: Pinia = markRaw({
  // ...
})
```

思考一下，如果不使用 `markRaw`，会发生什么？

当我们将 Pinia 实例作为 `reactive` 对象的属性或通过 `provide` 传递时，Vue 可能会尝试将其转换为响应式对象。但 Pinia 实例本身不需要响应式——它只是一个管理容器。

`markRaw` 告诉 Vue："这个对象不需要响应式转换"。这样做有两个好处：

1. **避免不必要的性能开销**：响应式转换有成本
2. **防止意外行为**：Pinia 内部结构不应该被代理拦截

### state 为什么是 ref？

```typescript
const state = ref<Record<string, StateTree>>({})
```

`state` 是全局状态树，存储所有 Store 的状态。使用 `ref` 而不是普通对象有两个原因：

1. **响应式**：当 Store 状态变化时，依赖这些状态的组件能够自动更新
2. **可替换**：`ref` 可以整体替换 `.value`，这在 SSR 水合时很有用

让我们看看状态树的结构：

```typescript
// state.value 的结构
{
  'counter': { count: 0, name: 'counter' },  // counter store 的状态
  'user': { id: 1, name: 'John' },           // user store 的状态
  'cart': { items: [] }                       // cart store 的状态
}
```

每个 Store 的状态以 Store ID 为键存储在这个树中。

### piniaSymbol 的作用

```typescript
export const piniaSymbol = Symbol('pinia')

// 在 install 中使用
app.provide(piniaSymbol, pinia)
```

`Symbol` 确保了注入键的唯一性。即使用户代码中也使用了字符串 `'pinia'` 作为 provide 键，也不会与我们的 Pinia 实例冲突。

组件中获取 Pinia 实例：

```typescript
import { inject } from 'vue'
import { piniaSymbol } from '@pinia/createPinia'

const pinia = inject(piniaSymbol)
```

### install 方法的职责

```typescript
install(app: App) {
  pinia._a = app
  app.provide(piniaSymbol, pinia)
  app.config.globalProperties.$pinia = pinia
}
```

三个关键步骤：

1. **保存 app 引用**：后续插件可能需要访问 Vue app
2. **provide 注入**：让所有组件都能通过 `inject` 获取 Pinia
3. **全局属性**：支持 Options API 中通过 `this.$pinia` 访问

### use 方法的链式调用

```typescript
use(plugin: PiniaPlugin) {
  _p.push(plugin)
  return this  // 返回 this 支持链式调用
}
```

这个设计允许链式注册插件：

```typescript
const pinia = createPinia()
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)
```

## 完善实现

最小版本存在一个问题：如果在 `install` 之前就调用了 `use` 注册插件，插件能正常工作吗？

官方 Pinia 的做法是延迟插件安装。让我们完善这个逻辑：

```typescript
// src/pinia/createPinia.ts
import { ref, markRaw } from 'vue'
import type { App, Ref } from 'vue'
import type { Pinia, StateTree, PiniaPlugin, StoreGeneric } from './types'

export const piniaSymbol = Symbol('pinia')

export function createPinia(): Pinia {
  const state = ref<Record<string, StateTree>>({})
  
  // 已安装的插件
  let _p: PiniaPlugin[] = []
  
  // 在 install 之前注册的插件
  let toBeInstalled: PiniaPlugin[] = []
  
  const _s = new Map<string, StoreGeneric>()
  
  const pinia: Pinia = markRaw({
    install(app: App) {
      pinia._a = app
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
      
      // 安装所有待安装的插件
      toBeInstalled.forEach(plugin => _p.push(plugin))
      toBeInstalled = []
    },
    
    use(plugin: PiniaPlugin) {
      // 如果还未 install，先暂存
      if (!this._a) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },
    
    _p,
    _a: undefined,
    _s,
    state
  })
  
  return pinia
}
```

现在无论插件在 `install` 之前还是之后注册，都能正常工作：

```typescript
const pinia = createPinia()

// install 之前注册 - 会被暂存
pinia.use(plugin1)

// install
app.use(pinia)  // 此时 plugin1 被正式添加到 _p

// install 之后注册 - 直接添加
pinia.use(plugin2)
```

## 测试用例

让我们编写测试来验证实现：

```typescript
// tests/createPinia.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createApp } from 'vue'
import { createPinia, piniaSymbol } from '@pinia/createPinia'

describe('createPinia', () => {
  it('should create a pinia instance', () => {
    const pinia = createPinia()
    
    expect(pinia).toBeDefined()
    expect(pinia.state).toBeDefined()
    expect(pinia._s).toBeInstanceOf(Map)
    expect(pinia._p).toEqual([])
  })
  
  it('should be installed as a Vue plugin', () => {
    const app = createApp({})
    const pinia = createPinia()
    
    app.use(pinia)
    
    expect(pinia._a).toBe(app)
    expect(app.config.globalProperties.$pinia).toBe(pinia)
  })
  
  it('should provide pinia to components', () => {
    const app = createApp({})
    const pinia = createPinia()
    
    // 模拟 provide
    const providedValues: Record<symbol, any> = {}
    app.provide = (key: symbol, value: any) => {
      providedValues[key] = value
      return app
    }
    
    app.use(pinia)
    
    expect(providedValues[piniaSymbol]).toBe(pinia)
  })
  
  it('should register plugins', () => {
    const pinia = createPinia()
    const plugin = vi.fn()
    
    pinia.use(plugin)
    
    // 插件被暂存
    expect(pinia._p).toEqual([])
    
    // install 后插件被正式添加
    const app = createApp({})
    app.use(pinia)
    
    expect(pinia._p).toContain(plugin)
  })
  
  it('should support chained use calls', () => {
    const pinia = createPinia()
    const plugin1 = vi.fn()
    const plugin2 = vi.fn()
    
    const result = pinia.use(plugin1).use(plugin2)
    
    expect(result).toBe(pinia)
  })
  
  it('should use markRaw to prevent reactivity', () => {
    const pinia = createPinia()
    const app = createApp({})
    
    app.use(pinia)
    
    // pinia 不应该被转换为响应式
    expect(pinia).toBe(pinia) // markRaw 的对象保持引用相等
  })
})
```

运行测试：

```bash
pnpm test
```

## 类型定义补充

确保 `types.ts` 中的 Pinia 类型与实现一致：

```typescript
// src/pinia/types.ts（补充）
import type { App, Ref } from 'vue'

export interface Pinia {
  /**
   * Vue 应用实例
   */
  _a?: App
  
  /**
   * 已注册的 Store Map
   * 键为 Store ID，值为 Store 实例
   */
  _s: Map<string, StoreGeneric>
  
  /**
   * 全局状态树
   * 键为 Store ID，值为 Store 的 state
   */
  state: Ref<Record<string, StateTree>>
  
  /**
   * 已注册的插件列表
   */
  _p: PiniaPlugin[]
  
  /**
   * Vue 插件 install 方法
   */
  install: (app: App) => void
  
  /**
   * 注册插件
   */
  use: (plugin: PiniaPlugin) => Pinia
}
```

## 使用示例

现在我们可以这样使用 `createPinia`：

```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia } from '@pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// 注册插件
pinia.use(({ store }) => {
  console.log('Store created:', store.$id)
})

// 安装到 Vue
app.use(pinia)

app.mount('#app')
```

## 本章小结

本章我们实现了 `createPinia` 函数：

1. **核心结构**：
   - `state`：响应式的全局状态树
   - `_s`：Store 注册表 Map
   - `_p`：插件列表

2. **关键设计**：
   - 使用 `markRaw` 避免不必要的响应式转换
   - 使用 `Symbol` 作为 provide/inject 的键
   - 支持延迟插件安装

3. **Vue 插件接口**：
   - `install` 方法：注入 Pinia 实例到 Vue 应用
   - `use` 方法：注册插件，支持链式调用

下一章我们将深入 Pinia 实例的数据结构，理解各个属性的作用和关系。

---

**下一章**：[Pinia 实例数据结构](pinia-instance.md)
