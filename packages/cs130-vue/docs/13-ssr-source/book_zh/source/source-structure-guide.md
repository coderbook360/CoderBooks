# 源码结构与阅读指南

欢迎进入第二部分：源码解析。在这一部分，我们将深入 Vue SSR 的实现细节，逐行阅读核心代码。在开始之前，让我们先了解源码的整体结构和阅读方法。

## Vue 仓库结构

Vue 3 采用 monorepo 结构，所有的包都在 `packages` 目录下。与 SSR 相关的主要包有：

```
vue/packages/
├── server-renderer/      # 服务端渲染器
│   ├── src/
│   │   ├── render.ts            # renderToString 核心实现
│   │   ├── renderToStream.ts    # 流式渲染实现
│   │   ├── renderToString.ts    # 入口函数
│   │   └── helpers/             # 辅助函数
│   │       ├── ssrRenderAttrs.ts
│   │       ├── ssrRenderClass.ts
│   │       ├── ssrRenderStyle.ts
│   │       └── ssrRenderSlot.ts
│   └── index.ts
│
├── runtime-core/         # 运行时核心
│   ├── src/
│   │   ├── hydration.ts         # 水合核心逻辑
│   │   ├── component.ts         # 组件实例
│   │   ├── vnode.ts             # 虚拟 DOM
│   │   └── renderer.ts          # 渲染器接口
│   └── index.ts
│
└── runtime-dom/          # DOM 运行时
    ├── src/
    │   ├── index.ts             # createApp, createSSRApp
    │   └── nodeOps.ts           # DOM 操作
    └── index.ts
```

我们的分析将主要集中在 `server-renderer` 包，同时会涉及 `runtime-core` 中的水合逻辑。

## 核心文件概览

`server-renderer/src/render.ts` 是最核心的文件，包含了将虚拟 DOM 渲染为字符串的主要逻辑。这个文件大约 600 行代码，包含了多个关键函数：

`renderComponentVNode` 处理组件类型的虚拟节点，创建组件实例并渲染其内容。

`renderComponentSubTree` 渲染组件的子树，处理 setup 函数和模板。

`renderElementVNode` 处理普通 HTML 元素，生成开标签、属性、子内容和闭标签。

`renderVNode` 是通用的虚拟节点渲染入口，根据节点类型分发到不同的处理函数。

`server-renderer/src/helpers/` 目录包含了属性、类名、样式等的渲染辅助函数。这些函数负责将 Vue 的响应式数据转换为 HTML 属性字符串。

`runtime-core/src/hydration.ts` 包含了客户端水合的核心逻辑。`createHydrationFunctions` 函数创建水合过程中使用的各种辅助函数。

## 阅读源码的方法

阅读框架源码可能会让人感到不知所措。以下是一些有效的阅读策略。

首先，从入口函数开始。找到你想理解的功能的入口点。对于服务端渲染，入口是 `renderToString`。从这里开始，跟踪函数调用链。

其次，关注主流程，暂时忽略边界情况。源码中往往有大量的错误处理、特殊情况处理、性能优化代码。第一次阅读时，先理解核心逻辑，把复杂的分支跳过。

第三，配合调试。在 Node.js 中设置断点，用简单的测试用例调试，观察代码执行流程和变量值。

```javascript
// 简单的调试用例
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

const app = createSSRApp({
  template: '<div>Hello</div>'
})

// 在 renderToString 内部设置断点
const html = await renderToString(app)
console.log(html)
```

第四，阅读测试用例。测试文件展示了各种使用场景和预期行为，是理解代码意图的好帮手。

## 关键类型定义

在深入源码之前，了解一些关键的类型定义会很有帮助。

```typescript
// VNode 虚拟节点的简化类型
interface VNode {
  type: Component | string | Symbol  // 组件、标签名或特殊类型
  props: Record<string, any> | null  // 属性
  children: VNodeChildren            // 子节点
  component: ComponentInternalInstance | null  // 组件实例
  el: Node | null                    // 对应的真实 DOM 节点
  // ... 更多属性
}

// 组件实例的简化类型
interface ComponentInternalInstance {
  type: Component                    // 组件定义
  props: Record<string, any>        // 解析后的 props
  setupState: Record<string, any>   // setup 返回值
  render: Function | null           // 渲染函数
  subTree: VNode                    // 渲染结果
  // ... 更多属性
}

// SSR 上下文
interface SSRContext {
  [key: string]: any
  teleports?: Record<string, string>  // Teleport 内容
  __teleportBuffers?: Record<string, SSRBuffer>
}

// SSR 缓冲区
type SSRBuffer = SSRBufferItem[]
type SSRBufferItem = string | SSRBuffer | Promise<SSRBuffer>
```

这些类型会在后续章节中频繁出现。虚拟节点 VNode 是 Vue 渲染系统的核心数据结构。组件实例保存了组件运行时的状态。SSRContext 在渲染过程中传递上下文信息。SSRBuffer 用于收集渲染结果。

## 版本说明

本书基于 Vue 3.4 版本的源码进行分析。虽然具体实现可能会在后续版本中变化，但核心的设计思想和架构模式通常保持稳定。

如果你在阅读最新版本的源码时发现差异，不必担心。理解了设计思想后，适应实现上的变化并不困难。

## 接下来的内容

从下一章开始，我们将按照功能模块逐步深入源码：

首先是字符串渲染相关的代码，包括 `renderToString` 入口、缓冲区创建、组件和元素渲染等。

然后是属性和样式处理，了解 Vue 如何将响应式数据转换为 HTML 属性。

接着是内置组件（Slot、Teleport、Suspense）的 SSR 实现。

然后是流式渲染的实现细节。

最后是客户端水合的源码分析。

准备好了吗？让我们开始深入 Vue SSR 的源码世界。
