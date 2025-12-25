---
sidebar_position: 10
title: install 方法与 Vue 集成
---

# install 方法与 Vue 集成

Pinia 作为 Vue 插件，需要通过 `install` 方法与 Vue 应用集成。本章将深入分析这个集成过程，理解 Pinia 如何融入 Vue 的生态系统。

## Vue 插件机制回顾

在深入 Pinia 的 `install` 实现之前，让我们先回顾 Vue 的插件机制。

Vue 插件是一个包含 `install` 方法的对象：

```typescript
interface Plugin {
  install: (app: App, ...options: any[]) => void
}

// 使用插件
const app = createApp(App)
app.use(plugin)  // 调用 plugin.install(app)
```

`app.use()` 做了什么？

```typescript
// Vue 源码中 app.use 的简化逻辑
use(plugin, ...options) {
  if (installedPlugins.has(plugin)) {
    // 已安装，跳过
    return this
  }
  
  // 调用 install 方法
  plugin.install(this, ...options)
  
  installedPlugins.add(plugin)
  return this
}
```

关键点：
1. 插件只会安装一次
2. `install` 接收 `app` 实例作为第一个参数
3. `app.use()` 返回 `app`，支持链式调用

## Pinia install 方法实现

现在让我们看 Pinia 的 `install` 方法：

```typescript
// src/pinia/createPinia.ts
import { ref, markRaw } from 'vue'
import type { App } from 'vue'

export const piniaSymbol = Symbol('pinia')

export function createPinia(): Pinia {
  const state = ref<Record<string, StateTree>>({})
  let _p: PiniaPlugin[] = []
  let toBeInstalled: PiniaPlugin[] = []
  const _s = new Map<string, StoreGeneric>()
  
  const pinia: Pinia = markRaw({
    install(app: App) {
      // 1. 保存 Vue app 引用
      pinia._a = app
      
      // 2. 通过 provide 注入 pinia 实例
      app.provide(piniaSymbol, pinia)
      
      // 3. 挂载到全局属性（支持 Options API）
      app.config.globalProperties.$pinia = pinia
      
      // 4. 安装待处理的插件
      toBeInstalled.forEach(plugin => _p.push(plugin))
      toBeInstalled = []
    },
    
    // ... 其他属性
  })
  
  return pinia
}
```

让我们逐步分析每个步骤。

## 步骤一：保存 App 引用

```typescript
pinia._a = app
```

保存 `app` 引用的目的：

1. **插件访问**：插件可以通过 `context.app` 访问 Vue 应用
2. **全局配置**：访问 `app.config` 进行配置
3. **组件注册**：某些场景需要动态注册组件
4. **判断安装状态**：`_a` 是否存在可判断是否已安装

```typescript
use(plugin: PiniaPlugin) {
  if (!this._a) {
    // 还未安装到 Vue，暂存插件
    toBeInstalled.push(plugin)
  } else {
    // 已安装，直接添加
    _p.push(plugin)
  }
  return this
}
```

## 步骤二：Provide 注入

```typescript
app.provide(piniaSymbol, pinia)
```

这是最关键的一步。通过 `provide`，所有组件都能获取 Pinia 实例：

```typescript
// 在任意组件中
import { inject } from 'vue'
import { piniaSymbol } from '@pinia/createPinia'

export default {
  setup() {
    const pinia = inject(piniaSymbol)
    // 现在可以使用 pinia
  }
}
```

### 为什么用 Symbol？

对比两种方案：

```typescript
// 方案一：字符串键
app.provide('pinia', pinia)

// 方案二：Symbol 键
const piniaSymbol = Symbol('pinia')
app.provide(piniaSymbol, pinia)
```

使用 Symbol 的优势：
1. **避免命名冲突**：即使其他库也用 `'pinia'` 字符串，也不会冲突
2. **类型安全**：TypeScript 可以准确推断 inject 的返回类型
3. **防止意外访问**：只有持有 Symbol 的代码才能获取值

### 在 Store 中使用

`defineStore` 返回的 `useStore` 函数内部：

```typescript
function useStore(pinia?: Pinia | null): Store {
  // 获取当前组件实例
  const currentInstance = getCurrentInstance()
  
  // 从 inject 获取 pinia 实例
  pinia = pinia || 
         (currentInstance && inject(piniaSymbol, null))
  
  // 确保有 pinia 实例
  if (!pinia) {
    throw new Error('Pinia not installed')
  }
  
  // ... 创建或获取 Store
}
```

## 步骤三：全局属性

```typescript
app.config.globalProperties.$pinia = pinia
```

这一步是为了支持 Options API：

```typescript
export default {
  computed: {
    doubleCount() {
      // Options API 中通过 this.$pinia 访问
      const store = useCounterStore(this.$pinia)
      return store.count * 2
    }
  }
}
```

### 何时需要显式传递 pinia？

在大多数情况下，`useStore` 可以自动获取 pinia 实例。但有些场景需要显式传递：

```typescript
// 场景一：在组件外部使用
import { useCounterStore } from '@/stores/counter'
import { pinia } from '@/main'

// 组件外部没有 getCurrentInstance()
// 必须显式传递 pinia
const counter = useCounterStore(pinia)
```

```typescript
// 场景二：Options API
export default {
  methods: {
    increment() {
      // Options API 中 setup 上下文不可用
      const store = useCounterStore(this.$pinia)
      store.count++
    }
  }
}
```

## 步骤四：安装待处理插件

```typescript
toBeInstalled.forEach(plugin => _p.push(plugin))
toBeInstalled = []
```

这处理了在 `install` 之前注册的插件：

```typescript
const pinia = createPinia()

// install 之前注册的插件
pinia.use(plugin1)  // → toBeInstalled = [plugin1]
pinia.use(plugin2)  // → toBeInstalled = [plugin1, plugin2]

// install 时，把 toBeInstalled 的插件移到 _p
app.use(pinia)
// _p = [plugin1, plugin2]
// toBeInstalled = []

// install 之后注册的插件直接进入 _p
pinia.use(plugin3)  // → _p = [plugin1, plugin2, plugin3]
```

## TypeScript 类型扩展

为了让 `$pinia` 在 Options API 中有正确的类型提示，需要扩展 Vue 的类型：

```typescript
// src/pinia/types.ts
import type { Pinia } from './types'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    /**
     * Pinia 实例
     */
    $pinia: Pinia
  }
}
```

这样在 Options API 中 `this.$pinia` 就有正确的类型提示了。

## 测试 install 方法

```typescript
// tests/install.test.ts
import { describe, it, expect } from 'vitest'
import { createApp, inject, defineComponent } from 'vue'
import { createPinia, piniaSymbol } from '@pinia/createPinia'

describe('pinia install', () => {
  it('should install pinia to Vue app', () => {
    const app = createApp({})
    const pinia = createPinia()
    
    app.use(pinia)
    
    // 验证 _a 被设置
    expect(pinia._a).toBe(app)
  })
  
  it('should provide pinia instance', () => {
    const app = createApp({})
    const pinia = createPinia()
    
    let injectedPinia: Pinia | null = null
    
    const TestComponent = defineComponent({
      setup() {
        injectedPinia = inject(piniaSymbol, null)
        return () => null
      }
    })
    
    app.use(pinia)
    app.mount(document.createElement('div'))
    
    // 验证可以通过 inject 获取
    expect(injectedPinia).toBe(pinia)
  })
  
  it('should set global property $pinia', () => {
    const app = createApp({})
    const pinia = createPinia()
    
    app.use(pinia)
    
    expect(app.config.globalProperties.$pinia).toBe(pinia)
  })
  
  it('should install pending plugins', () => {
    const pinia = createPinia()
    const plugin1 = () => {}
    const plugin2 = () => {}
    
    // install 前注册
    pinia.use(plugin1)
    pinia.use(plugin2)
    
    expect(pinia._p.length).toBe(0)  // 还在 toBeInstalled
    
    const app = createApp({})
    app.use(pinia)
    
    expect(pinia._p).toContain(plugin1)
    expect(pinia._p).toContain(plugin2)
  })
})
```

## 常见问题

### 问题一：组件外部使用 Store

```typescript
// ❌ 错误：在 main.ts 中直接使用
const store = useCounterStore()  // Error: pinia not found

// ✅ 正确：等待 pinia 安装后再使用
const pinia = createPinia()
app.use(pinia)

// 方式一：显式传递
const store = useCounterStore(pinia)

// 方式二：在路由守卫中
router.beforeEach((to) => {
  // 此时 app 已经挂载，可以获取 pinia
  const store = useAuthStore()
  if (!store.isLoggedIn && to.meta.requiresAuth) {
    return '/login'
  }
})
```

### 问题二：多个 Vue 应用

```typescript
// 每个 Vue app 需要自己的 Pinia 实例
const app1 = createApp(App1)
const pinia1 = createPinia()
app1.use(pinia1)

const app2 = createApp(App2)
const pinia2 = createPinia()
app2.use(pinia2)

// pinia1 和 pinia2 的状态完全独立
```

### 问题三：热更新

Vite 的热更新可能导致 Store 状态丢失。Pinia 通过 HMR API 处理这个问题：

```typescript
// 开发环境下的特殊处理
if (import.meta.hot) {
  import.meta.hot.accept()
}
```

## 本章小结

本章我们深入分析了 `install` 方法：

1. **Vue 插件机制**：通过 `install` 方法与 Vue 集成

2. **四个关键步骤**：
   - 保存 App 引用
   - Provide 注入 Pinia 实例
   - 设置全局属性 `$pinia`
   - 安装待处理的插件

3. **Symbol 的使用**：确保 provide/inject 的键唯一性

4. **类型扩展**：为 Options API 提供正确的类型提示

下一章我们将讨论 `activePinia` 机制，理解 Pinia 如何在组件外部工作。

---

**下一章**：[activePinia 与上下文注入](active-pinia.md)
