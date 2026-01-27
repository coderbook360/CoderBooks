# 架构总览

经过前面章节对 Pinia 各个设计方面的深入探讨，现在让我们退后一步，从宏观视角审视 Pinia 的整体架构。这一章将把所有的设计决策串联起来，形成一个完整的架构图景。

## 核心架构组件

Pinia 的架构可以分为几个核心层次。

最底层是 Vue 3 响应式系统。Pinia 建立在 Vue 的 reactive、ref、computed 等原语之上。Store 的 state 是响应式对象，getters 是计算属性，所有的变更追踪能力都来自响应式系统。这一层是 Pinia 的基础，也是它能比 Vuex 更简洁的根本原因——很多 Vuex 需要自己实现的功能，Vue 3 响应式系统已经提供了。

中间层是 Pinia 核心。这包括 createPinia 创建全局实例，defineStore 定义 Store 工厂，以及 Store 实例的创建和管理逻辑。这一层处理 Store 的注册、实例化、状态管理等核心功能。

上层是扩展机制。包括插件系统、DevTools 集成、SSR 支持等。这些功能增强了 Pinia 的能力，但不影响核心的状态管理功能。

```
┌─────────────────────────────────────────┐
│           扩展层                         │
│   Plugins / DevTools / SSR Support      │
├─────────────────────────────────────────┤
│           Pinia 核心                     │
│   createPinia / defineStore / Store     │
├─────────────────────────────────────────┤
│           Vue 3 响应式系统               │
│   reactive / ref / computed / effect    │
└─────────────────────────────────────────┘
```

## 数据流架构

Pinia 的数据流遵循清晰的模式。

Store 是状态的单一来源。所有需要共享的状态都存储在 Store 中，组件从 Store 读取数据，而不是自己维护副本。这确保了数据的一致性。

状态变更是响应式的。无论通过什么方式修改状态（直接修改、$patch、actions），变更都会触发响应式更新，依赖该状态的组件会自动重新渲染。

Getters 提供派生数据。当需要基于 state 计算新的值时，使用 getters。它们是缓存的，只有依赖变化时才重新计算。

Actions 封装业务逻辑。异步操作、复杂的状态变更逻辑、与外部 API 的交互，都应该放在 actions 中。

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Component  │────>│   Action    │────>│    State    │
│   读取状态   │     │  执行逻辑   │     │   存储数据   │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                                      │
       │                                      │
       │            ┌─────────────┐           │
       └────────────│   Getter    │<──────────┘
                    │   派生数据   │
                    └─────────────┘
```

## Pinia 实例的角色

createPinia 创建的实例是整个状态管理系统的入口点。它扮演几个角色。

首先是 Store 的注册中心。所有 Store 在创建时都会注册到 Pinia 实例中，通过 Store ID 进行索引。这使得 Pinia 可以管理所有 Store 的生命周期。

其次是状态的聚合点。`pinia.state.value` 包含所有已创建 Store 的状态，这对 SSR 的序列化和 DevTools 的状态检查都很重要。

第三是插件的安装点。通过 `pinia.use(plugin)` 安装的插件会应用到所有 Store。

最后是 Vue 应用的桥梁。通过 `app.use(pinia)` 将 Pinia 实例注入 Vue 应用，使得组件可以通过 inject 获取 Pinia 实例，进而访问 Store。

```typescript
interface Pinia {
  // Vue 插件安装
  install(app: App): void
  
  // 插件管理
  use(plugin: PiniaPlugin): Pinia
  _p: PiniaPlugin[]
  
  // Store 管理
  _s: Map<string, StoreGeneric>
  
  // 全局状态
  state: Ref<Record<string, StateTree>>
  
  // 作用域（用于 SSR）
  _e: EffectScope
}
```

## Store 的生命周期

Store 从定义到销毁经历几个阶段。

defineStore 阶段只是定义，不创建实例。它返回一个工厂函数（useXxxStore），调用这个函数才会创建 Store 实例。

首次调用 useXxxStore 时，Pinia 创建 Store 实例。它执行 state 函数获取初始状态，设置 getters 为计算属性，绑定 actions 的上下文。创建完成后，Store 实例被缓存到 Pinia 的 _s Map 中。

后续调用 useXxxStore 直接返回缓存的实例。这确保了同一个 Store 在整个应用中是单例的。

Store 实例通常存活到应用结束。但在某些场景（如 SSR、测试），可以通过 $dispose 方法销毁 Store，清理订阅和副作用。

```
defineStore ──> useXxxStore 首次调用 ──> Store 实例创建 ──> 缓存
                       │                                    │
                       └──────── 后续调用 ─────────────────>┘
```

## 与 Vue 的集成方式

Pinia 与 Vue 的集成是透明的。开发者几乎不需要关心底层的集成机制。

在应用级别，通过 `app.use(pinia)` 安装。这会将 Pinia 实例注入 Vue 的依赖注入系统，所有组件都可以访问。

在组件级别，通过 useXxxStore 获取 Store 实例。useXxxStore 内部会从 Vue 的 inject 获取当前的 Pinia 实例，然后从中取出或创建对应的 Store。

Store 的响应式与 Vue 组件的响应式是一致的。Store 中的 ref 和 reactive 对象与组件中的行为完全相同，可以在模板中直接使用，可以用于计算属性和监听器。

```typescript
// Store 的响应式与组件无缝配合
const store = useCounterStore()

// 在模板中
<template>
  <div>{{ store.count }}</div>
</template>

// 在 computed 中
const double = computed(() => store.count * 2)

// 在 watch 中
watch(() => store.count, (newVal) => {
  console.log('Count changed:', newVal)
})
```

## 模块化架构

Pinia 的模块化设计体现在多个层面。

Store 层面，每个 Store 是独立的模块。它有自己的 state、getters、actions，有自己的 ID 和生命周期。Store 之间通过 import 建立依赖，依赖关系清晰可见。

文件层面，Store 通常组织在 stores 目录下，按领域或功能分组。这种组织方式与 JavaScript 的模块系统一致，便于维护和导航。

功能层面，通过 composables 可以在多个 Store 之间共享逻辑。一个 composable 封装一个功能点，可以在任何 Store 中使用。

```
stores/
├── user/
│   ├── index.ts        # 用户主 Store
│   ├── profile.ts      # 用户资料
│   └── settings.ts     # 用户设置
├── cart/
│   └── index.ts        # 购物车
└── composables/
    ├── useLoadable.ts  # 加载状态 composable
    └── usePersist.ts   # 持久化 composable
```

## 扩展性架构

Pinia 的扩展性通过插件系统实现。

插件可以在全局层面扩展所有 Store。添加新属性、新方法、订阅状态变化、订阅 action 调用，这些都可以通过插件实现。

类型扩展通过 TypeScript 的模块扩展实现。插件可以声明它添加的类型，使得使用者获得类型支持。

DevTools 集成是一种特殊的扩展。它利用 Pinia 的订阅机制和状态访问能力，提供可视化的调试体验。

SSR 支持也是基于 Pinia 的架构设计。每请求独立的实例、状态的序列化接口、水合机制，这些都是架构层面的支持。

## 性能考量

Pinia 的架构在性能方面有多处优化。

懒创建是一个关键优化。Store 只在首次使用时创建，未使用的 Store 不占用资源。这对大型应用尤其重要。

响应式系统的优化来自 Vue 3。计算属性的缓存、依赖追踪的精确性、批量更新的调度，这些优化 Pinia 都能直接受益。

DevTools 只在开发环境启用。生产构建中，相关代码被 tree-shaking 移除，不影响运行时性能。

独立 Store 利于代码分割。Store 可以与使用它的组件一起懒加载，减少初始加载体积。

## 总结

Pinia 的架构设计围绕几个核心理念：建立在 Vue 3 响应式系统之上，继承其强大能力；保持核心简洁，复杂功能通过扩展实现；提供灵活性，让开发者选择最适合的方式；拥抱 TypeScript，从设计层面支持类型安全。

这套架构使 Pinia 成为 Vue 3 时代的理想状态管理方案。它足够简单，初学者可以快速上手；它足够强大，可以支撑大型应用；它足够灵活，可以适应各种需求。

第一部分"设计思想"到此结束。接下来的第二部分"源码解析"将深入 Pinia 的实现细节，看看这些设计思想是如何落地为代码的。
