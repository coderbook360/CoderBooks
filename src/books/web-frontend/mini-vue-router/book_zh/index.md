# Mini Vue Router：Vue Router 4 源码深度解析

从零实现一个 Mini Vue Router，深入理解路由系统的核心原理与设计思想。

## 简介

Vue Router 是 Vue.js 生态中最核心的库之一。几乎每一个 Vue 应用都依赖它来处理页面导航、参数传递、权限控制。然而，大多数开发者对它的理解停留在"会用"的层面。

本书将带你**从零实现一个 Mini Vue Router**，在这个过程中彻底理解路由系统的设计思想与核心实现。

## 适合读者

- **中高级前端开发者**：熟悉 Vue 3 和 Vue Router 的基本使用，希望深入理解原理
- **想提升架构能力的工程师**：学习 Vue Router 的模块化设计、插件机制、类型系统
- **准备面试的开发者**：前端路由是高频考点，源码级理解让你脱颖而出
- **开源爱好者**：想参与 Vue 生态贡献，需要先读懂核心库的实现

## 你将学到什么

- **路由的本质**：理解前端路由的发展历程与核心原理
- **History API 深度掌握**：实现 Web History、Hash History、Memory History 三种模式
- **路由匹配算法**：掌握路径解析、参数提取、动态路由、嵌套路由的实现
- **导航守卫系统**：理解守卫的执行队列、异步处理与流程控制
- **Vue 插件机制**：学习 Router 如何与 Vue 3 深度集成
- **组件实现**：亲手实现 RouterLink、RouterView 核心组件
- **Composition API**：实现 useRouter、useRoute 等 Hooks

## 本书特色

- **渐进式实现**：从最简单的代码开始，逐步增强到完整方案
- **原理驱动**：不只是教你怎么写，更讲清楚为什么这样设计
- **对标官方**：实现与官方 Vue Router 4 行为一致的 API
- **42 章系统讲解**：覆盖 History、Matcher、Guards、Router、Components 全部核心模块

## 前置知识

- 熟练使用 Vue 3（Composition API）
- 了解 TypeScript 基础语法
- 使用过 Vue Router 4 的基本功能

## 开始阅读

准备好了吗？让我们从 [序言](preface.md) 开始这段源码探索之旅。
