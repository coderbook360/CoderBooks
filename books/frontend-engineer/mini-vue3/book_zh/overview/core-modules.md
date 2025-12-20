# Vue 3 核心模块划分与数据流

打开 Vue 3 源码仓库，你会看到 `packages` 目录下有十几个子包。它们各自负责什么？相互之间是什么关系？

**理解模块划分是深入源码的第一步，也是最重要的一步。** 这一章，我们建立 Vue 3 的“全局地图”，让你在后续阅读具体实现时不会迷失方向。

## 模块总览

Vue 3 采用 monorepo 结构，核心模块如下：

```
packages/
├── vue              # 完整构建入口
├── reactivity       # 响应式系统
├── runtime-core     # 运行时核心（平台无关）
├── runtime-dom      # 浏览器运行时
├── compiler-core    # 编译器核心（平台无关）
├── compiler-dom     # 浏览器编译器
├── compiler-sfc     # SFC 编译器
├── compiler-ssr     # SSR 编译器
├── server-renderer  # 服务端渲染器
└── shared           # 共享工具函数
```

这些模块可以分为三大类：

- **响应式**：`@vue/reactivity`
- **运行时**：`@vue/runtime-core`、`@vue/runtime-dom`
- **编译器**：`@vue/compiler-core`、`@vue/compiler-dom`、`@vue/compiler-sfc`

让我们逐一了解。

## 响应式模块：@vue/reactivity

这是 Vue 3 最独立的一个模块，**完全可以脱离 Vue 框架单独使用**。

### 职责

提供响应式能力——当数据变化时，自动执行相关的副作用函数。

核心 API 包括：

- `reactive` / `shallowReactive`：创建响应式对象
- `ref` / `shallowRef`：创建响应式引用
- `computed`：创建计算属性
- `effect`：创建副作用函数
- `watch` / `watchEffect`：侦听器

### 内部结构

```
reactivity/src/
├── reactive.ts      # reactive/shallowReactive 实现
├── ref.ts           # ref/shallowRef 实现
├── computed.ts      # computed 实现
├── effect.ts        # effect/track/trigger 核心
├── effectScope.ts   # 副作用作用域
└── dep.ts           # 依赖集合
```

最核心的文件是 `effect.ts`，它实现了依赖收集（track）和触发更新（trigger）的机制。

### 独立使用

```javascript
// 关键：只从 @vue/reactivity 导入，不需要完整的 Vue
import { reactive, effect } from '@vue/reactivity'

// 创建响应式对象
const state = reactive({ count: 0 })

// 创建副作用函数
// effect 会立即执行一次传入的函数，并收集依赖
effect(() => {
  // 这里访问了 state.count
  // 响应式系统会记录：这个 effect 依赖 state.count
  console.log('count is:', state.count)
})
// 输出: count is: 0（首次执行）

// 修改状态，effect 自动重新执行
state.count = 1  // 输出: count is: 1
state.count = 2  // 输出: count is: 2

// 这就是响应式的核心：
// 数据变化 → 自动执行相关的副作用函数
// Vue 组件的更新函数本质上就是一个 effect
```

不需要 Vue 组件，不需要 DOM，响应式系统独立运作。这对于状态管理库（如 Pinia）、或在非 Vue 项目中使用响应式能力非常有用。

## 运行时模块

运行时负责在浏览器中创建和更新 DOM。它分为两层：平台无关层和平台特定层。

### @vue/runtime-core（平台无关）

这一层不包含任何 DOM 操作，只定义了渲染器的抽象接口和组件系统的核心逻辑。

职责包括：

- 组件实例的创建和管理
- 虚拟 DOM 的 Diff 算法
- 调度器（任务队列、nextTick）
- 生命周期钩子的注册和调用
- 内置组件（KeepAlive、Teleport、Suspense）的核心逻辑

核心文件：

```
runtime-core/src/
├── renderer.ts      # 渲染器核心，patch/mount/unmount
├── vnode.ts         # VNode 类型定义和创建函数
├── component.ts     # 组件实例相关
├── scheduler.ts     # 调度器
├── apiCreateApp.ts  # createApp 实现
└── componentOptions.ts  # Options API 支持
```

`renderer.ts` 是运行时的心脏，它实现了 `patch` 函数——Vue 3 更新 DOM 的核心入口。

### @vue/runtime-dom（浏览器平台）

这一层提供浏览器 DOM 的具体操作实现。

职责包括：

- DOM 节点的创建、插入、移除
- 属性和样式的设置
- 事件监听器的绑定
- Transition 动画的实现

核心文件：

```
runtime-dom/src/
├── index.ts         # 入口，导出 createApp 等
├── nodeOps.ts       # DOM 操作封装
├── patchProp.ts     # 属性处理入口
└── modules/         # 各类属性处理
    ├── class.ts     # class 处理
    ├── style.ts     # style 处理
    ├── events.ts    # 事件处理
    └── attrs.ts     # 普通属性处理
```

`nodeOps.ts` 封装了所有 DOM 操作：

```javascript
// nodeOps 是一个"平台适配层"
// 它定义了 runtime-core 需要的所有 DOM 操作
export const nodeOps = {
  // 插入节点：anchor 是参考节点，插入到它之前
  // 如果 anchor 为 null，则插入到 parent 末尾
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },
  
  // 移除节点
  remove: child => {
    const parent = child.parentNode
    if (parent) parent.removeChild(child)
  },
  
  // 创建元素节点
  createElement: tag => document.createElement(tag),
  
  // 创建文本节点
  createText: text => document.createTextNode(text),
  
  // 设置文本内容
  setText: (node, text) => { node.nodeValue = text },
  
  // ... 还有 createComment, parentNode, nextSibling 等
}

// 关键洞察：这些操作都是"抽象"的
// runtime-core 调用 nodeOps.createElement('div')
// 至于这个 'div' 是浏览器 DOM、Canvas 图形还是其他东西
// runtime-core 完全不关心
```

### 为什么要分层

分层设计的核心目的是**支持跨平台渲染**。

`runtime-core` 不依赖任何 DOM API，只通过抽象接口操作"节点"。只要你实现这些接口，就可以把 Vue 渲染到任何平台：

- Canvas（用于游戏或可视化）
- Three.js（用于 3D 场景）
- 原生移动端（类似 React Native）
- 终端（如 blessed 库）

第十七部分会详细讲解自定义渲染器的实现。

## 编译器模块

编译器负责将模板转换为渲染函数。同样分为平台无关层和平台特定层。

### @vue/compiler-core（平台无关）

编译流程分三步：

1. **Parse（解析）**：将模板字符串解析为 AST
2. **Transform（转换）**：遍历 AST，应用各种转换插件
3. **Codegen（代码生成）**：将 AST 转换为 JavaScript 代码

核心文件：

```
compiler-core/src/
├── parse.ts         # 模板解析器
├── transform.ts     # AST 转换
├── codegen.ts       # 代码生成
├── ast.ts           # AST 节点类型定义
└── transforms/      # 各种转换插件
    ├── vIf.ts       # v-if 转换
    ├── vFor.ts      # v-for 转换
    ├── vOn.ts       # v-on 转换
    └── hoistStatic.ts # 静态提升
```

### @vue/compiler-dom（浏览器平台）

在 `compiler-core` 基础上，添加浏览器特定的处理：

- HTML 实体解码
- 浏览器特有指令（`v-html`、`v-text`）
- 特定事件修饰符（`.stop`、`.prevent`）

### @vue/compiler-sfc（SFC 编译）

处理 `.vue` 单文件组件：

```
compiler-sfc/src/
├── parse.ts         # 将 .vue 文件分解为 template/script/style
├── compileScript.ts # 处理 <script> 和 <script setup>
├── compileTemplate.ts # 编译 <template>
└── compileStyle.ts  # 处理 <style>，包括 scoped 和 CSS Modules
```

一个 `.vue` 文件的编译流程：

```
Input:
<template>...</template>
<script setup>...</script>
<style scoped>...</style>

      ↓ compiler-sfc/parse

三个描述符：templateDescriptor, scriptDescriptor, styleDescriptor

      ↓ 分别编译

template → compiler-dom → render 函数
script → 直接提取/转换
style → 添加 scoped hash / 处理 CSS Modules
```

## 模块依赖关系

模块之间的依赖遵循严格的层次结构：

```
                    shared
                      ↑
                  reactivity
                      ↑
                runtime-core  ←  compiler-core
                      ↑               ↑
                runtime-dom       compiler-dom
                      ↑               ↑
                      └───→  vue  ←───┘
                              ↑
                        compiler-sfc
```

关键设计原则：

- **上层依赖下层**：`runtime-dom` 依赖 `runtime-core`，反之不成立
- **平台无关不依赖平台相关**：`runtime-core` 不依赖 `runtime-dom`
- **响应式完全独立**：`reactivity` 不依赖任何其他模块

这种设计让各模块可以独立使用，也让 Tree-shaking 更有效。

## 数据流分析

理解了模块职责，我们来看数据如何在模块间流动。

### 编译时数据流

从 `.vue` 文件到可执行代码：

```
.vue 文件
    ↓ compiler-sfc/parse
template + script + style 三个描述符
    ↓
template → compiler-dom/compile → 渲染函数代码
script → 提取/转换 → 组件定义对象
style → 添加 scoped → CSS 代码
    ↓
打包工具（Vite/Webpack）处理后
    ↓
最终产物：可执行的 JavaScript 模块
```

### 运行时数据流

从 `createApp` 到 DOM 更新：

```
createApp(App)
    ↓
app.mount('#app')
    ↓
创建根组件实例
    ↓
执行 setup()，收集响应式依赖
    ↓
执行 render()，生成 VNode 树
    ↓
patch(null, vnode, container)
    ↓
创建真实 DOM，插入容器
```

状态更新时：

```
state.count++
    ↓ trigger
相关 effect 被标记为 dirty
    ↓ scheduler
effect 被加入队列，等待下一个微任务
    ↓ flush
执行 effect，触发组件更新
    ↓
执行 render()，生成新 VNode 树
    ↓
patch(oldVNode, newVNode, container)
    ↓
Diff 算法比较新旧 VNode
    ↓
最小化 DOM 操作
```

## 本章小结

Vue 3 的核心模块分为三大类：

- **响应式**：`@vue/reactivity`，独立的响应式系统
- **运行时**：`runtime-core`（平台无关）+ `runtime-dom`（浏览器）
- **编译器**：`compiler-core`（平台无关）+ `compiler-dom`（浏览器）+ `compiler-sfc`（SFC）

模块设计遵循几个原则：

- 分层：平台无关与平台相关分离
- 独立：响应式系统可独立使用
- 单向依赖：上层依赖下层，不反向依赖

从下一章开始，我们将深入对比 Vue 2 和 Vue 3 的架构差异，看看这些设计决策带来了哪些具体改进。

---

## 练习与思考

1. 安装 `@vue/reactivity` 并独立使用，创建一个响应式计数器，不依赖任何 Vue 组件。

2. 使用 `@vue/compiler-dom` 编译一个简单模板，观察输出的渲染函数代码：

```javascript
import { compile } from '@vue/compiler-dom'

const { code } = compile(`
  <div>
    <span>static</span>
    <span>{{ dynamic }}</span>
  </div>
`)

console.log(code)
```

3. 思考：如果要实现一个 Canvas 渲染器，你需要实现 `nodeOps` 中的哪些方法？
