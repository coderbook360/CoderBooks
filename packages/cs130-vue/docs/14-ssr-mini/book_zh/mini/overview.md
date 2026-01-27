# Mini SSR 概述

从这一章开始，我们将从零构建一个迷你 SSR 框架。通过亲手实现，你将深入理解 Vue SSR 的核心原理，而不仅仅是使用它。

## 为什么要自己实现

阅读源码和自己实现是两种不同层次的理解。阅读让你知道"是什么"，实现让你真正理解"为什么"。当你需要调试 SSR 问题、优化性能或扩展功能时，这种深层理解是无价的。

我们的目标不是复制 Vue SSR 的全部功能，而是抓住核心要素：

- 虚拟 DOM 到 HTML 的转换
- 组件的服务端渲染
- 客户端水合激活
- 状态的序列化和传递

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Mini SSR Framework                    │
├─────────────────┬─────────────────┬─────────────────────┤
│   Server Side   │   Shared Core   │    Client Side      │
├─────────────────┼─────────────────┼─────────────────────┤
│  renderToString │   VNode Types   │  createApp          │
│  renderToStream │   createElement │  mount              │
│  createSSRApp   │   Component     │  hydrate            │
│  stateSerialize │   Props/Events  │  stateRestore       │
└─────────────────┴─────────────────┴─────────────────────┘
```

## 核心模块

### 1. 虚拟节点（VNode）

一切从 VNode 开始：

```typescript
// 我们将实现的 VNode 结构
interface VNode {
  type: string | Component
  props: Record<string, any> | null
  children: VNode[] | string | null
  el?: Element | Text
}
```

### 2. 服务端渲染器

将 VNode 树转换为 HTML 字符串：

```typescript
// 核心渲染函数
function renderToString(vnode: VNode): string
function renderToStream(vnode: VNode): ReadableStream
```

### 3. 客户端水合

复用服务端 HTML，附加事件：

```typescript
// 水合入口
function hydrate(vnode: VNode, container: Element): void
```

### 4. 状态管理

服务端到客户端的状态传递：

```typescript
// 状态序列化
function serializeState(state: any): string
function restoreState(): any
```

## 实现路线图

**第一阶段：基础渲染**
- VNode 定义
- createElement 函数
- 基础 renderToString

**第二阶段：组件支持**
- 函数组件
- 有状态组件
- Props 和事件

**第三阶段：客户端**
- mount 挂载
- hydrate 水合
- 事件附加

**第四阶段：进阶**
- 流式渲染
- 状态传递
- 异步组件

## 技术选择

为了专注于核心概念，我们做一些简化：

1. **使用 TypeScript**：类型帮助理解结构
2. **无编译器**：手写 render 函数，不实现模板编译
3. **无响应式**：简化状态管理
4. **Node.js 环境**：使用原生 http 模块

## 项目结构

```
mini-ssr/
├── src/
│   ├── shared/           # 共享代码
│   │   ├── vnode.ts      # VNode 类型定义
│   │   ├── h.ts          # createElement
│   │   └── component.ts  # 组件类型
│   ├── server/           # 服务端
│   │   ├── render.ts     # renderToString
│   │   ├── stream.ts     # 流式渲染
│   │   └── state.ts      # 状态序列化
│   ├── client/           # 客户端
│   │   ├── mount.ts      # 挂载
│   │   ├── hydrate.ts    # 水合
│   │   └── state.ts      # 状态恢复
│   └── index.ts          # 入口
├── example/              # 示例应用
├── package.json
└── tsconfig.json
```

## 预期成果

完成后，你将拥有一个可工作的迷你 SSR 框架，能够：

```typescript
// 定义组件
const App = {
  render() {
    return h('div', { class: 'app' }, [
      h('h1', null, 'Hello SSR'),
      h(Counter, { initial: 0 })
    ])
  }
}

// 服务端渲染
const html = renderToString(h(App, null, null))

// 客户端水合
hydrate(h(App, null, null), document.getElementById('app'))
```

## 与 Vue SSR 的对比

| 特性 | Vue SSR | Mini SSR |
|------|---------|----------|
| 模板编译 | ✅ | ❌ |
| 响应式 | ✅ | ❌ |
| 虚拟 DOM Diff | ✅ | ❌ |
| 组件 | ✅ | ✅ 简化版 |
| 水合 | ✅ | ✅ 简化版 |
| 流式渲染 | ✅ | ✅ 简化版 |
| Suspense | ✅ | ❌ |
| Teleport | ✅ | ❌ |

通过实现这个简化版本，你将理解 Vue SSR 的核心设计思想，为深入学习完整实现打下基础。

## 开发环境准备

```bash
# 创建项目
mkdir mini-ssr
cd mini-ssr
npm init -y

# 安装依赖
npm install typescript ts-node @types/node

# TypeScript 配置
npx tsc --init
```

基础 tsconfig.json：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

准备就绪，让我们开始构建！
