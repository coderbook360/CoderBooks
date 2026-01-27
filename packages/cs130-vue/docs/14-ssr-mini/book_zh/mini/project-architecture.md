# 项目架构设计

在深入理解 Vue SSR 源码之后，我们将从零构建一个 Mini SSR 框架。这个框架虽然简化，但涵盖了 SSR 的核心概念和实现细节。本章规划整体架构。

## 项目目标

我们的 Mini SSR 框架将实现以下核心功能：

1. **服务端渲染**：将组件树渲染为 HTML 字符串
2. **流式渲染**：支持分块输出 HTML
3. **客户端 Hydration**：在客户端激活服务端渲染的 HTML
4. **状态传递**：服务端状态传递到客户端
5. **组件系统**：支持函数组件和有状态组件

## 目录结构

```
mini-ssr/
├── src/
│   ├── shared/           # 共享代码
│   │   ├── vnode.ts      # VNode 类型定义
│   │   ├── h.ts          # createElement 函数
│   │   ├── component.ts  # 组件类型
│   │   └── utils.ts      # 工具函数
│   │
│   ├── server/           # 服务端代码
│   │   ├── render.ts     # 字符串渲染
│   │   ├── stream.ts     # 流式渲染
│   │   ├── context.ts    # 渲染上下文
│   │   └── serialize.ts  # 状态序列化
│   │
│   ├── runtime/          # 客户端运行时
│   │   ├── hydrate.ts    # Hydration 逻辑
│   │   ├── mount.ts      # 挂载逻辑
│   │   ├── patch.ts      # 更新逻辑
│   │   └── events.ts     # 事件处理
│   │
│   └── index.ts          # 统一导出
│
├── test/                 # 测试
│   ├── unit/
│   └── integration/
│
└── package.json
```

## 核心模块

### VNode 模块

VNode（Virtual Node）是整个框架的基础数据结构。它描述了 DOM 结构，可以是元素、组件、文本或 Fragment。

```typescript
// 核心 VNode 接口
interface VNode {
  type: VNodeType
  props: Record<string, any> | null
  children: VNodeChildren
  shapeFlag: number
  el?: Node | null
  component?: ComponentInstance | null
}
```

### 服务端渲染模块

服务端渲染模块负责将 VNode 树转换为 HTML 字符串。核心函数：

- `renderToString`：一次性渲染，返回完整 HTML
- `renderToStream`：流式渲染，分块输出 HTML

### 客户端运行时模块

客户端运行时负责 Hydration 和后续的交互处理：

- `hydrate`：激活服务端渲染的 HTML
- `mount`：挂载应用
- `patch`：处理更新

### 状态管理模块

处理服务端和客户端之间的状态传递：

- `serialize`：服务端状态序列化
- `deserialize`：客户端状态恢复

## 设计原则

### 同构设计

同一份组件代码可在服务端和客户端运行。通过环境检测处理差异：

```typescript
const isServer = typeof window === 'undefined'

if (isServer) {
  // 服务端逻辑
} else {
  // 客户端逻辑
}
```

### 最小化依赖

框架核心不依赖任何外部库，保持轻量和可理解性。

### 渐进增强

- 服务端渲染保证内容可访问
- 客户端 Hydration 增强交互能力
- 后续更新使用高效的 patch 算法

### 类型安全

使用 TypeScript 编写，提供完整的类型定义。

## 数据流

```
服务端：
  组件 → VNode 树 → HTML 字符串 → 响应

客户端：
  HTML → Hydration → VNode 树 + DOM 关联 → 可交互应用

状态：
  服务端收集 → 序列化 → 注入 HTML → 客户端恢复
```

## 构建配置

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      input: {
        server: 'src/server/index.ts',
        client: 'src/runtime/index.ts'
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
}
```

## 使用示例

```typescript
// 服务端
import { renderToString, createSSRContext } from 'mini-ssr/server'
import { h } from 'mini-ssr/shared'
import App from './App'

const context = createSSRContext()
const html = await renderToString(h(App, null), context)

// 客户端
import { hydrate } from 'mini-ssr/runtime'
import { h } from 'mini-ssr/shared'
import App from './App'

hydrate(h(App, null), document.getElementById('app'))
```

## 实现顺序

1. **基础类型**：VNode、ShapeFlags
2. **createElement**：h() 函数
3. **服务端渲染**：renderToString
4. **流式渲染**：renderToStream
5. **客户端挂载**：mount
6. **Hydration**：hydrate
7. **状态传递**：serialize/deserialize
8. **测试**：单元测试和集成测试

## 小结

本章规划了 Mini SSR 框架的整体架构。接下来的章节将按照模块逐一实现，最终完成一个可运行的 SSR 框架。通过动手实践，你将深入理解 Vue SSR 的核心原理。
