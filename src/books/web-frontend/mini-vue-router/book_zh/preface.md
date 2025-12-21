# 序言

## 为什么写这本书

Vue Router 是 Vue.js 生态中最核心的库之一。几乎每一个 Vue 应用都依赖它来处理页面导航、参数传递、权限控制。然而，大多数开发者对它的理解停留在"会用"的层面——配置路由、添加守卫、处理跳转。

**会用，不代表理解。**

当你遇到以下问题时，是否感到困惑：

- 为什么 `router.push()` 有时候是异步的，有时候像是同步？
- Hash 模式和 History 模式底层有什么本质区别？
- 导航守卫的执行顺序到底是怎样的？
- 嵌套路由是如何匹配和渲染的？
- 动态路由 `/user/:id` 是怎么解析参数的？

这些问题的答案，都藏在 Vue Router 的源码中。

本书的目标是：**带你从零实现一个 Mini Vue Router**，在这个过程中彻底理解路由系统的设计思想与核心实现。

---

## 这本书适合谁

本书适合以下读者：

- **中高级前端开发者**：熟悉 Vue 3 和 Vue Router 的基本使用，希望深入理解原理
- **想提升架构能力的工程师**：学习 Vue Router 的模块化设计、插件机制、类型系统
- **准备面试的开发者**：前端路由是高频考点，源码级理解让你脱颖而出
- **开源爱好者**：想参与 Vue 生态贡献，需要先读懂核心库的实现

**前置知识**：
- 熟练使用 Vue 3（Composition API）
- 了解 TypeScript 基础
- 使用过 Vue Router 4

---

## 这本书讲什么

本书围绕 **Vue Router 4** 的核心源码，按照"理解 → 实现 → 对比"的思路展开：

### 第一部分：路由基础与架构概览
从前端路由的发展历程讲起，分析 Vue Router 4 的整体架构，建立全局视角。

### 第二部分：History 模式实现
深入 History API，实现 `createWebHistory`、`createWebHashHistory`、`createMemoryHistory` 三种模式，理解它们的设计差异。

### 第三部分：路由匹配器
这是 Vue Router 最核心的模块。我们将实现路径解析、参数提取、动态路由匹配、嵌套路由、路由优先级排序等功能。

### 第四部分：导航守卫系统
实现全局守卫、路由守卫、组件守卫，理解守卫队列的执行机制和异步处理。

### 第五部分：核心 Router 实例
实现 `createRouter`，包括 `push`、`replace`、`go`、`resolve`、动态路由管理等核心方法。

### 第六部分：Vue 集成与组件
实现 `RouterLink`、`RouterView` 组件，以及 `useRouter`、`useRoute` 等 Composition API。

### 第七部分：高级特性
实现滚动行为、路由元信息与权限控制、命名视图、重定向与别名等高级功能。

### 第八部分：错误处理
实现错误类型定义、导航失败处理等错误边界机制。

### 第九部分：完整实现与总结
整合所有模块，形成完整的 Mini Vue Router，并与官方实现对比，总结核心设计思想。

---

## 如何阅读这本书

### 推荐的阅读方式

1. **顺序阅读**：本书各章节层层递进，建议按顺序阅读
2. **边读边写**：每一章都会给出实现代码，建议动手实现
3. **对照源码**：阅读时打开 Vue Router 官方源码对比验证
4. **做练习题**：每章末尾的练习题帮助巩固理解

### 代码仓库

本书配套代码仓库：（待补充）

每一章的代码都是可运行的，你可以 clone 下来边学边练。

---

## Vue Router 4 源码结构

在开始之前，先了解 Vue Router 4 的源码目录结构：

```
packages/router/src/
├── history/          # History 模式实现
│   ├── common.ts     # 通用逻辑
│   ├── html5.ts      # createWebHistory
│   ├── hash.ts       # createWebHashHistory
│   └── memory.ts     # createMemoryHistory
├── matcher/          # 路由匹配器
│   ├── index.ts      # createRouterMatcher
│   ├── pathMatcher.ts
│   ├── pathParserRanker.ts
│   └── ...
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数
├── RouterLink.ts     # RouterLink 组件
├── RouterView.ts     # RouterView 组件
├── router.ts         # createRouter 核心
├── navigationGuards.ts # 导航守卫
├── location.ts       # 位置解析
├── query.ts          # 查询参数处理
├── encoding.ts       # URL 编码
├── errors.ts         # 错误定义
├── useApi.ts         # Composition API
└── index.ts          # 导出入口
```

我们的 Mini Vue Router 将按照类似的结构组织代码。

---

## 致谢

感谢 Vue Router 的核心维护者 **Eduardo San Martin Morote (posva)** 创造了如此优秀的路由库。Vue Router 4 的代码质量、类型设计、架构思想都值得反复学习。

感谢每一位读者的阅读。希望这本书能帮助你真正理解前端路由的本质，提升你的工程能力。

---

让我们开始这段源码探索之旅。

**翻开下一页，从前端路由的历史讲起。**
