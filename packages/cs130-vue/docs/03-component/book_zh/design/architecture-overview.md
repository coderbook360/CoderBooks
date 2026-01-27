# 组件系统架构总览

在深入源码之前，让我们从宏观视角审视 Vue 组件系统的整体架构。理解各个模块的职责和它们之间的关系，有助于在后续章节中把握细节与全局的联系。

## 核心模块

Vue 运行时的组件相关代码主要分布在以下模块：

**@vue/runtime-core** 是平台无关的核心，包含：
- 组件实例的创建和管理
- 组件的挂载、更新、卸载流程
- 生命周期钩子的调度
- Props、Slots、Events 的处理
- 内置组件（KeepAlive、Teleport、Suspense、Transition）

**@vue/runtime-dom** 是 Web 平台的实现：
- DOM 操作的具体实现
- DOM 属性和事件的处理
- Transition 的 DOM 动画支持

**@vue/reactivity** 提供响应式能力：
- ref、reactive、computed
- 依赖收集和触发
- 副作用管理

这三个包协同工作，构成了完整的运行时。

## 组件的数据结构

理解几个核心数据结构是阅读源码的前提。

**VNode（虚拟节点）** 描述了 UI 的结构：

```typescript
interface VNode {
  type: Component | string | Symbol  // 组件、标签名、或特殊类型
  props: Record<string, any>         // 属性
  children: VNodeChildren            // 子节点
  key: string | number | null        // 用于 diff 的唯一标识
  component: ComponentInstance | null // 组件实例（仅组件 VNode）
  el: HostElement | null             // 真实 DOM 元素
  // ...
}
```

**ComponentInstance（组件实例）** 包含组件的运行时状态：

```typescript
interface ComponentInstance {
  type: Component                    // 组件选项对象
  vnode: VNode                       // 当前的组件 VNode
  proxy: ComponentPublicInstance     // 渲染上下文代理
  
  // 状态
  setupState: Record<string, any>    // setup 返回的状态
  data: Record<string, any>          // data 选项的数据
  props: Record<string, any>         // 解析后的 props
  slots: Slots                       // 插槽内容
  
  // 渲染
  render: RenderFunction             // 渲染函数
  subTree: VNode                     // 渲染结果
  update: () => void                 // 更新函数
  
  // 生命周期
  isMounted: boolean
  isUnmounted: boolean
  // ...
}
```

**Component（组件选项）** 定义了组件的配置：

```typescript
interface Component {
  name?: string
  props?: PropsOptions
  emits?: EmitsOptions
  setup?: SetupFunction
  render?: RenderFunction
  template?: string
  // Options API
  data?: () => object
  computed?: Record<string, ComputedOptions>
  methods?: Record<string, Function>
  // 生命周期钩子
  beforeCreate?: () => void
  created?: () => void
  // ...
}
```

## 核心流程

### 应用创建

一切从 `createApp` 开始：

```javascript
const app = createApp(App)
app.mount('#app')
```

`createApp` 创建应用实例，配置全局上下文（指令、组件、插件等）。`mount` 触发根组件的挂载流程。

### 组件挂载

当渲染器遇到组件 VNode：

```
mountComponent(vnode, container)
├── createComponentInstance(vnode)    // 创建实例
├── setupComponent(instance)          // 设置组件
│   ├── initProps(instance)           // 初始化 props
│   ├── initSlots(instance)           // 初始化 slots
│   └── setupStatefulComponent()      // 调用 setup
└── setupRenderEffect(instance)       // 设置渲染副作用
    └── effect(renderComponentRoot)   // 创建响应式副作用
```

`setupRenderEffect` 创建了响应式副作用。当组件依赖的响应式数据变化时，副作用重新执行，触发组件更新。

### 组件更新

更新流程分为两种触发方式：

**自身状态变化**：响应式数据变化 → effect 重新执行 → 生成新 subTree → diff patch

**Props 变化**：父组件更新 → 检测 props 变化 → 触发子组件更新

```
updateComponent(n1, n2)
├── shouldUpdateComponent(n1, n2)     // 检查是否需要更新
└── instance.update()                 // 触发更新
    ├── renderComponentRoot()         // 生成新 subTree
    └── patch(prevTree, nextTree)     // diff 并更新
```

### 组件卸载

卸载时清理所有资源：

```
unmountComponent(instance)
├── beforeUnmount hooks               // 调用 beforeUnmount
├── stop(instance.scope)              // 停止响应式副作用
├── unmount(subTree)                  // 卸载子树
└── unmounted hooks                   // 调用 unmounted
```

## 模块间的协作

理解模块间的协作关系：

**响应式与组件**：组件的渲染被包装在 effect 中。setup 中使用 ref/reactive 创建的状态被追踪，变化时触发 effect 重新执行。

**编译器与运行时**：编译器把模板转换为优化过的渲染函数。运行时根据 PatchFlags 等标记进行高效 diff。

**核心与平台**：runtime-core 定义了抽象的节点操作接口，runtime-dom 提供 Web 平台的具体实现。

```
                  ┌──────────────────┐
                  │    Template      │
                  └────────┬─────────┘
                           │ compile
                           ▼
┌─────────────┐    ┌──────────────────┐
│ @vue/       │    │  Render Function │
│ reactivity  │    └────────┬─────────┘
│             │             │ execute
│  ref        │             ▼
│  reactive   │◄───┌──────────────────┐
│  effect     │    │     VNode        │
└─────────────┘    └────────┬─────────┘
       ▲                    │ patch
       │                    ▼
       │           ┌──────────────────┐
       │           │   @vue/runtime-  │
       └───────────│      core        │
                   │                  │
                   │  Component       │
                   │  Lifecycle       │
                   │  Scheduler       │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  @vue/runtime-   │
                   │      dom         │
                   │                  │
                   │  DOM Operations  │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │      DOM         │
                   └──────────────────┘
```

## 调度器

Vue 使用调度器管理更新的执行时机：

```javascript
const queue = []
let isFlushing = false

function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(flushJobs)
  }
}
```

调度器的职责：

- **去重**：同一个组件的多次更新合并为一次
- **排序**：按组件层级排序，父组件先于子组件更新
- **批量**：在微任务中批量执行所有更新

## 内置组件的位置

内置组件在架构中的角色：

**KeepAlive**：在组件树中拦截子组件的卸载，将其缓存而非销毁。与渲染器紧密配合。

**Teleport**：打破组件树的 DOM 层级，将内容渲染到指定容器。需要渲染器特殊处理。

**Suspense**：协调异步组件的加载状态，提供统一的 pending/fallback 处理。

**Transition**：在元素进入/离开时添加动画类，与 DOM 操作紧密配合。

## 类型系统

Vue 3 用 TypeScript 编写，类型贯穿整个代码库：

```typescript
// 组件选项的类型推导
export function defineComponent<Props>(
  options: ComponentOptionsWithProps<Props>
): DefineComponent<Props>

// 渲染上下文的类型
export interface ComponentPublicInstance<P = {}, S = {}> {
  $props: P
  $emit: EmitFn
  $slots: Slots
  // ...
}
```

类型不仅提供了 IDE 支持，也是理解 API 设计的重要参考。

## 阅读源码的路径

建议的阅读顺序：

1. **从入口开始**：`createApp` 和 `mount`，理解应用如何启动
2. **组件创建流程**：`mountComponent`、`setupComponent`，理解组件如何初始化
3. **渲染与更新**：`setupRenderEffect`、`patch`，理解响应式如何驱动更新
4. **具体特性**：Props 处理、Slots 解析、生命周期调度
5. **内置组件**：KeepAlive、Teleport、Suspense 的实现

每个部分都可以独立理解，但它们之间有紧密的联系。在阅读过程中，保持对全局架构的意识有助于理解局部代码的设计意图。

## 小结

Vue 组件系统的架构可以总结为：

- **分层设计**：核心逻辑与平台实现分离
- **数据驱动**：VNode 描述 UI，响应式驱动更新
- **模块协作**：编译器、响应式、渲染器紧密配合
- **调度优化**：批量、排序、去重，减少不必要的工作

理解了这个架构，我们就可以进入源码分析了。在接下来的章节中，我们将深入每个模块的具体实现，看看这些设计思想是如何落地为代码的。
