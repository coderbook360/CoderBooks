---
sidebar_position: 1
title: 序言
---

# Mini-Webpack 5：从零实现现代模块打包器

## 为什么要学习 Webpack 源码？

Webpack 是现代前端工程化的基石。无论你使用 React、Vue 还是 Angular，无论你的项目规模大小，Webpack 几乎无处不在。然而，对于大多数开发者来说，Webpack 仍然是一个"黑盒"——我们知道如何配置它，却不清楚它内部究竟是如何工作的。

深入学习 Webpack 源码，你将获得：

- **打包原理透彻理解**：从入口解析到代码生成的完整流程
- **插件开发能力**：掌握 Tapable 事件系统，编写高质量的 Webpack 插件
- **性能优化洞察**：理解 Tree Shaking、代码分割、缓存等优化策略的底层实现
- **构建工具视野**：为学习 Vite、Rollup、esbuild 等工具奠定坚实基础
- **系统设计能力**：学习大型开源项目的架构设计与模块划分

Webpack 5 的源码经过多年迭代，已经成为模块打包器设计的典范。本书将带你揭开这个"黑盒"的面纱。

## 本书的目标

本书将带你从零开始，一步步实现一个完整的 Mini-Webpack 5。完成本书的学习后，你将能够：

1. **掌握 Tapable 事件系统**：实现完整的同步/异步钩子系列
2. **理解 Compiler 与 Compilation**：把握 Webpack 核心架构的双引擎设计
3. **实现模块系统**：NormalModule、ModuleFactory、ModuleGraph 的完整实现
4. **构建 Resolver 解析器**：enhanced-resolve、条件导出、fallback 回退机制
5. **构建 Loader 管道**：loader-runner、Pitching Loader、Loader Context
6. **实现 Parser 解析器**：AST 解析、依赖提取、Top-Level Await、Worker 支持
7. **掌握 Externals 外部化**：外部模块处理、库模式输出
8. **掌握 Chunk 系统**：代码分割、ChunkGraph、运行时生成
9. **实现优化阶段**：Tree Shaking、Scope Hoisting、TerserPlugin 集成
10. **输出代码生成**：Template 系统、Hash 计算、Library 模式、SourceMap 生成
11. **构建 Plugin 系统**：生命周期钩子、7 个实战插件开发

## 目标读者

本书面向**具有 3-5 年以上前端开发经验**的高级开发者，你应该：

- 熟练使用 Webpack 进行项目构建配置
- 熟悉 Node.js 文件系统和模块机制
- 了解 AST（抽象语法树）的基本概念
- 具备 ES6+ 和 TypeScript 基础知识
- 对编译原理有基本了解（可选但推荐）

如果你刚开始使用 Webpack，建议先阅读官方文档和使用指南，积累足够的实践经验后再来阅读本书。

## 本书结构

本书共分为 **18 个部分 + 附录**，共计 **162 个章节**，按照 Webpack 构建流程的顺序组织：

### 基础准备（第一、二部分）
介绍 Webpack 核心概念，深入实现 Tapable 事件系统——这是理解整个 Webpack 架构的基础。

### 核心引擎（第三、四部分）
实现 Compiler 和 Compilation 两大核心类，它们共同构成了 Webpack 的"双引擎"架构。

### 模块系统（第五、六、七部分）
深入模块的创建、解析、构建流程，实现 NormalModuleFactory、Resolver（包含 conditionNames、fallback）、Module 等核心组件。

### 转换层（第八、九、十部分）
实现 Loader 加载器管道、Parser 语法解析器（含 Top-Level Await、Worker 支持）、Dependency 依赖系统。

### 外部化与打包（第十一、十二、十三部分）
实现 Externals 外部化系统、Chunk 系统、代码分割策略。

### 优化阶段（第十四部分）
实现 Tree Shaking、Scope Hoisting、Module Concatenation、TerserPlugin 集成等优化策略。

### 代码生成与输出（第十五、十六部分）
实现 Generator、Template、运行时代码生成、Library 模式输出、资源写入。

### 扩展系统（第十七部分）
Plugin 系统设计与 7 个实战插件开发（含 ProvidePlugin、IgnorePlugin、ContextReplacementPlugin）。

### 完整实现（第十八部分）
整合所有模块，与官方 Webpack 5 对比分析。

### 附录
涵盖 Module Federation、Persistent Caching、HMR、Asset Modules 等进阶主题。

## 学习建议

1. **构建全局视角**：先快速浏览全书目录，建立对 Webpack 架构的整体认知
2. **边读边写**：每个章节都动手实现代码，不要只是阅读
3. **对照源码**：准备一份 Webpack 5 官方源码，随时对照验证
4. **关注数据流**：重点理解数据在各个阶段之间是如何流转的
5. **先实现再优化**：先实现功能，再考虑边界情况和性能优化

## 技术标准

本书基于以下版本进行讲解：

- **Webpack**: 5.x
- **Node.js**: 18+
- **Tapable**: 2.x
- **Acorn**: 8.x

代码示例使用 JavaScript/TypeScript，遵循 Webpack 官方编码规范。

## 开始你的 Webpack 源码之旅

模块打包器是现代前端工程的核心基础设施。通过本书的学习，你不仅能掌握 Webpack 的实现原理，更能习得构建复杂系统的思维方式和架构设计能力。

现在，让我们从第一行代码开始，一步步构建你自己的 Webpack！

---

**下一章**：[Webpack 概览与核心概念](foundations/overview.md)
