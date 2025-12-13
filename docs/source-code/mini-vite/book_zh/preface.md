# 序言

如果你正在使用 Vite，却还不清楚它如何在开发阶段做到"即开即用"，如何在不打包的前提下完成按需转换与热更新，这本书会带你把这些机制拆开、读懂、并亲手实现。

## 为什么写这本书

Vite 已经成为前端开发的新标准。它的开发体验令人惊叹：毫秒级的冷启动、瞬时的热更新、零配置的开箱即用。但这些"魔法"背后的原理是什么？

市面上关于 Vite 的教程大多停留在"如何使用"的层面。本书的目标不同——我们要**从源码层面理解 Vite 的设计思想**，并**亲手实现一个 mini-vite**，在实践中掌握核心原理。

## 你将学到什么

- **原生 ESM 开发服务器**的工作原理
- **插件系统**的设计与实现
- **模块图**与**依赖追踪**机制
- **HMR（热模块替换）**的完整流程
- **依赖预构建**的优化策略
- 如何用 **Rollup** 构建生产代码

## Vite 的演进与未来方向

Vite 作为一个快速迭代的项目，其架构在不断演进。了解这些变化有助于你把握技术趋势：

### Vite 5.x（本书主要参照版本）

- 稳定的 Plugin API 和 Environment API 基础
- 成熟的依赖预构建机制
- 完善的 HMR 和模块图实现

### Vite 6.0 新特性（2024年末）

**Environment API**：Vite 6.0 引入了革命性的 Environment API，它将"环境"（client、ssr、edge worker 等）抽象为独立的配置单元：

```javascript
// vite.config.js - Vite 6.0 Environment API
export default {
  environments: {
    client: {
      // 客户端环境配置
      build: { outDir: 'dist/client' }
    },
    ssr: {
      // SSR 环境配置
      build: { outDir: 'dist/server' }
    },
    edge: {
      // Edge Worker 环境配置
      resolve: { conditions: ['edge-light'] }
    }
  }
}
```

这使得每个环境可以有独立的模块图、插件配置和构建选项，极大简化了全栈框架（如 Nuxt、Remix）的集成。

### Rolldown：下一代打包器

Vite 团队正在开发 **Rolldown**——一个用 Rust 编写的、与 Rollup API 兼容的打包器。它的目标是：

- **更快的构建速度**：Rust 的原生性能
- **开发/生产一致性**：替代 esbuild + Rollup 的双引擎架构
- **完全兼容**：现有 Rollup 插件可无缝迁移

```
当前 Vite 架构：
开发时：esbuild（快速转换）
构建时：Rollup（优化打包）

未来 Vite 架构（Rolldown）：
开发时：Rolldown
构建时：Rolldown
→ 统一引擎，更一致的行为
```

### 本书的范围

本书聚焦于 Vite 5.x 的核心机制，这些原理在后续版本中仍然适用。Environment API 和 Rolldown 等新特性虽然改变了部分实现细节，但核心概念（模块图、HMR 传播、插件钩子）保持一致。掌握本书内容后，你将能够快速理解和适应 Vite 的未来演进。

## 目标读者

本书适合：

- 有一定前端开发经验，熟悉 ES Modules 语法
- 使用过 Vite 或其他构建工具（Webpack、Rollup）
- 希望深入理解构建工具原理的开发者
- 想要编写 Vite 插件的开发者

## 前置知识

- JavaScript / TypeScript 基础
- Node.js 基础（文件操作、HTTP 服务器）
- 了解 ES Modules（`import` / `export`）
- 了解 npm / package.json

## 阅读建议

我们以 Vite 源码为参照，提炼关键模块：开发服务器、中间件管线、插件系统、模块图与 HMR、构建与预览、SSR。每一章的代码都指向一个可运行的 mini-vite 组件，最终拼装成完整的项目。你将不仅理解"为什么"，还能写出"怎么做"。

**推荐阅读路径**：

1. 从"设计概览"建立全局视角
2. 按模块顺序推进，理解每个子系统
3. 在"实践：mini-vite"章节中把前文产出组装为可运行的结果
4. 完成闭环后，尝试扩展自己的功能

让我们开始这场探索之旅！
