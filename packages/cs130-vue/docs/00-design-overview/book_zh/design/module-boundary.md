# 各模块的职责边界

Vue 3 的架构由多个解耦的模块组成。每个模块有明确的职责边界，通过定义良好的接口协作。理解这些边界有助于把握 Vue 的整体设计。

## 核心模块划分

Vue 3 的核心分为以下几个包：

```
@vue/reactivity   - 响应式系统
@vue/runtime-core - 平台无关的运行时核心
@vue/runtime-dom  - 浏览器 DOM 运行时
@vue/compiler-core - 平台无关的编译器核心
@vue/compiler-dom  - 浏览器 DOM 编译器
@vue/compiler-sfc  - 单文件组件编译器
vue               - 整合包，导出完整功能
```

这种分包策略让每个模块可以独立使用、独立测试、独立演进。

## 响应式系统的边界

@vue/reactivity 是完全独立的包，不依赖 Vue 的其他部分：

```javascript
import { reactive, ref, computed, effect } from '@vue/reactivity'

// 可以在任何 JavaScript 环境使用
const state = reactive({ count: 0 })
effect(() => console.log(state.count))
state.count++
```

响应式系统的职责：
- 将普通对象转换为响应式代理
- 追踪依赖关系
- 在数据变化时通知订阅者

响应式系统不关心：
- 依赖追踪的目的是什么（渲染、watch、其他）
- 通知后订阅者做什么
- 运行在什么平台

这种设计让响应式系统可以用于非 Vue 的场景，如状态管理、数据同步等。

## 运行时核心的边界

@vue/runtime-core 包含组件系统和渲染器的抽象逻辑：

```javascript
import { createRenderer, h, createVNode } from '@vue/runtime-core'
```

它依赖 @vue/reactivity，但不依赖任何平台特定的 API。

运行时核心的职责：
- 组件实例的创建和管理
- 虚拟 DOM 的创建和 diff
- 生命周期钩子的调度
- 提供渲染器工厂

运行时核心不关心：
- 具体的 DOM 操作如何实现
- 事件如何绑定
- 属性如何设置

这种抽象让 Vue 可以渲染到不同的平台。

## 平台运行时的边界

@vue/runtime-dom 实现了浏览器 DOM 的具体操作：

```javascript
import { nodeOps, patchProp } from '@vue/runtime-dom'
```

它通过实现一组节点操作接口，将抽象的渲染逻辑具体化：

```javascript
const nodeOps = {
  createElement: tag => document.createElement(tag),
  insert: (child, parent, anchor) => parent.insertBefore(child, anchor),
  remove: child => child.parentNode?.removeChild(child),
  setText: (node, text) => node.nodeValue = text,
  // ...
}
```

SSR 场景使用 @vue/server-renderer，它实现了将 VNode 渲染为 HTML 字符串的逻辑。

## 编译器的边界

@vue/compiler-core 处理模板的解析和转换：

```javascript
import { parse, transform, generate } from '@vue/compiler-core'

const ast = parse(template)
transform(ast, options)
const code = generate(ast)
```

编译器核心的职责：
- 将模板字符串解析为 AST
- 应用各种转换（如 v-if、v-for 的处理）
- 生成渲染函数代码
- 添加优化标记（PatchFlags、静态提升）

编译器核心不关心：
- 平台特定的元素和属性
- 具体的代码生成目标（浏览器、SSR）

@vue/compiler-dom 添加了 DOM 特定的处理：

- 识别 HTML 元素和 SVG 元素
- 处理 v-on、v-bind 等指令的 DOM 语义
- 添加浏览器事件修饰符的处理

## SFC 编译器的边界

@vue/compiler-sfc 处理 .vue 单文件组件：

```javascript
import { parse, compileTemplate, compileScript, compileStyle } from '@vue/compiler-sfc'

const { descriptor } = parse(source)
const template = compileTemplate({ source: descriptor.template.content })
const script = compileScript(descriptor)
const styles = descriptor.styles.map(style => compileStyle(style))
```

SFC 编译器的职责：
- 解析 .vue 文件的结构（template、script、style）
- 处理 `<script setup>` 语法
- 协调各部分的编译
- 处理 CSS scoped 和 CSS modules

它将复杂的 SFC 编译拆分为可管理的步骤。

## 模块间的接口

模块间通过明确的接口通信：

响应式系统 → 运行时核心：
- Effect 和 ReactiveEffect 类
- track() 和 trigger() 函数

运行时核心 → 平台运行时：
- RendererOptions 接口（nodeOps、patchProp）

编译器 → 运行时：
- 生成的渲染函数代码
- 通过 PatchFlags 和 Block Tree 传递优化信息

这些接口是稳定的契约。一个模块的内部实现变化不会影响其他模块，只要接口保持兼容。

## 树摇优化

模块边界的清晰让树摇（tree-shaking）更有效。未使用的功能不会被打包：

```javascript
// 只导入需要的功能
import { ref, computed } from 'vue'

// Transition、KeepAlive 等未使用的组件会被树摇掉
```

Vue 3 的许多功能是可选的。一个简单的应用可能只需要 10KB 左右的运行时代码。

## 扩展点

清晰的边界也提供了扩展点：

自定义渲染器：

```javascript
import { createRenderer } from '@vue/runtime-core'

const renderer = createRenderer({
  createElement(type) { /* 自定义创建逻辑 */ },
  insert(el, parent) { /* 自定义插入逻辑 */ },
  // ...
})
```

自定义编译器指令：

```javascript
import { compile } from '@vue/compiler-dom'

compile(template, {
  nodeTransforms: [/* 自定义转换 */],
  directiveTransforms: {
    'my-directive': myDirectiveTransform
  }
})
```

## 设计原则

Vue 3 模块设计遵循的原则：

**单一职责**：每个模块只做一件事，做好一件事。

**依赖倒置**：高层模块不依赖低层实现，而是依赖抽象接口。

**开闭原则**：对扩展开放，对修改关闭。新平台支持不需要修改核心代码。

**最小知识**：模块间只通过必要的接口通信，不暴露内部细节。

这些原则让 Vue 3 的代码库保持可维护性，即使在快速演进的过程中。

## 实践启示

理解模块边界对日常开发也有帮助：

当响应式行为不符合预期时，问题通常在 @vue/reactivity 层面。

当组件生命周期或渲染有问题时，问题在 @vue/runtime-core 层面。

当模板编译有问题时，问题在编译器层面。

这种分层思维有助于快速定位问题所在。
