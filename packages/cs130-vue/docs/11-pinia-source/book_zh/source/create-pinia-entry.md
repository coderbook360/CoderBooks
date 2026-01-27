# createPinia 入口分析

createPinia 是使用 Pinia 的第一步。它创建一个 Pinia 实例，这个实例是整个状态管理系统的核心。这一章我们将深入分析 createPinia 的源码实现。

## 基本用法回顾

在分析源码之前，先回顾一下 createPinia 的使用方式：

```typescript
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')
```

createPinia 返回一个 Pinia 实例，这个实例通过 `app.use()` 安装到 Vue 应用中。之后，所有组件都可以通过 useXxxStore 访问 Store。

## 源码分析

让我们看看 createPinia 的核心实现。以下代码来自 `packages/pinia/src/createPinia.ts`，为了突出核心逻辑，移除了部分辅助代码：

```typescript
import { ref, markRaw, effectScope, Ref } from 'vue'
import { StateTree, PiniaPlugin, Pinia } from './types'

export function createPinia(): Pinia {
  // 创建一个 effect scope，用于管理所有 Store 的响应式副作用
  const scope = effectScope(true)
  
  // 在 scope 内创建全局状态容器
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  // 插件列表和待安装的插件
  let _p: PiniaPlugin[] = []
  let toBeInstalled: PiniaPlugin[] = []

  // 使用 markRaw 标记 pinia 对象，避免被响应式包装
  const pinia: Pinia = markRaw({
    // Vue 插件安装方法
    install(app) {
      // 保存 app 引用
      pinia._a = app
      
      // 通过 provide 注入 pinia 实例
      app.provide(piniaSymbol, pinia)
      
      // 在 app.config.globalProperties 上挂载 $pinia
      app.config.globalProperties.$pinia = pinia
      
      // 安装所有待安装的插件
      toBeInstalled.forEach((plugin) => _p.push(plugin))
      toBeInstalled = []
    },

    // 使用插件
    use(plugin) {
      // 如果还没安装到 app，先收集到 toBeInstalled
      if (!this._a) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },

    // 插件列表
    _p,
    
    // Vue app 引用
    _a: null,
    
    // effect scope
    _e: scope,
    
    // Store 注册表
    _s: new Map(),
    
    // 全局状态
    state,
  })

  return pinia
}
```

这段代码虽然不长，但信息密度很高。让我们逐块解析。

## effectScope 的作用

代码首先创建了一个 effectScope：

```typescript
const scope = effectScope(true)
```

effectScope 是 Vue 3.2 引入的 API，用于管理响应式副作用的生命周期。所有在 scope 内创建的响应式依赖（computed、watch 等）都归属于这个 scope。当 scope 被销毁时，其中的所有副作用会一起清理。

Pinia 用 effectScope 来管理所有 Store 的响应式副作用。当需要销毁整个 Pinia 实例时（比如 SSR 场景下请求结束后），只需要调用 `scope.stop()`，所有 Store 的副作用都会被清理。

传入 `true` 表示创建一个"分离的"（detached）scope，它不会被当前活跃的父 scope 收集。这确保 Pinia 的 scope 是顶级的，不会意外被其他 scope 管理。

## 全局状态容器

接下来创建全局状态容器：

```typescript
const state = scope.run<Ref<Record<string, StateTree>>>(() =>
  ref<Record<string, StateTree>>({})
)!
```

`scope.run()` 在 scope 内执行传入的函数，返回函数的返回值。这里创建了一个 ref 对象，其初始值是空对象 `{}`。

这个 `state` 对象的结构是：键为 Store ID，值为对应 Store 的状态。例如：

```typescript
{
  user: { name: 'Alice', age: 25 },
  cart: { items: [] }
}
```

将 state 的创建放在 scope 内，确保它的响应式追踪归属于 Pinia 的 scope。

## markRaw 的使用

创建 pinia 对象时使用了 markRaw：

```typescript
const pinia: Pinia = markRaw({ ... })
```

markRaw 告诉 Vue 的响应式系统不要将这个对象转换为响应式代理。Pinia 实例包含很多内部状态和方法，将它变成响应式会带来不必要的开销，而且可能导致意外的行为。

pinia 对象本身不需要是响应式的——它是一个管理容器，真正需要响应式的是 Store 中的 state，那是由 Store 自己管理的。

## install 方法实现

pinia 对象实现了 Vue 插件接口，包含 install 方法：

```typescript
install(app) {
  pinia._a = app
  app.provide(piniaSymbol, pinia)
  app.config.globalProperties.$pinia = pinia
  toBeInstalled.forEach((plugin) => _p.push(plugin))
  toBeInstalled = []
}
```

这个方法在 `app.use(pinia)` 时被 Vue 调用。它做了几件事：

保存 app 引用到 `_a` 属性。这个引用后续会用到，比如在创建 Store 时需要获取 app 上下文。

通过 `app.provide` 注入 pinia 实例。这使用了 Vue 的依赖注入系统，所有后代组件都可以通过 inject 获取 pinia 实例。`piniaSymbol` 是一个 Symbol，确保注入的唯一性。

在 `app.config.globalProperties` 上挂载 `$pinia`。这是为了 Options API 的兼容，使得在 Options API 组件中可以通过 `this.$pinia` 访问 Pinia 实例。

处理待安装的插件。如果在 `app.use(pinia)` 之前调用了 `pinia.use(plugin)`，插件会被收集到 `toBeInstalled` 数组。这里将它们正式安装到 `_p` 中。

## use 方法实现

use 方法用于安装 Pinia 插件：

```typescript
use(plugin) {
  if (!this._a) {
    toBeInstalled.push(plugin)
  } else {
    _p.push(plugin)
  }
  return this
}
```

逻辑很简单：如果 Pinia 还没有安装到 Vue app（`_a` 为 null），将插件暂存到 `toBeInstalled`；如果已安装，直接添加到 `_p` 插件列表。

返回 `this` 支持链式调用：

```typescript
pinia
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)
```

## 核心属性解析

pinia 对象有几个核心属性：

`_p` 是插件列表。每当创建新的 Store 时，会遍历这个列表，让每个插件处理新 Store。

`_a` 是 Vue app 的引用。Store 创建时可能需要访问 app 上下文，比如获取 router 实例。

`_e` 是 effectScope 实例。管理所有 Store 的响应式副作用。

`_s` 是 Store 注册表，一个 Map 对象。键是 Store ID，值是 Store 实例。这确保了 Store 的单例性——同一个 ID 的 Store 只会创建一次。

`state` 是全局状态容器。所有 Store 的 state 都会注册到这里，便于 SSR 序列化和 DevTools 检查。

## 设计要点总结

createPinia 的实现体现了几个设计要点：

职责清晰。Pinia 实例只负责管理基础设施——Store 注册、插件管理、全局状态。具体的 Store 逻辑由 defineStore 和 createSetupStore 处理。

生命周期管理。通过 effectScope 统一管理所有响应式副作用的生命周期，为 SSR 和测试场景提供了清理能力。

Vue 集成。通过标准的 Vue 插件机制（install、provide）与 Vue 应用集成，对用户透明。

可扩展性。插件机制从一开始就设计进来，不是事后添加的。

下一章我们将详细分析 Pinia 实例的完整结构，包括类型定义和各属性的作用。
