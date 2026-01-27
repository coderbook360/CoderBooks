# 序言

## 为什么要手写 Mini Router？

学习源码的最佳方式，就是自己动手实现一遍。

通过手写 Mini Vue Router，你将：

- 深刻理解前端路由的工作原理
- 掌握路由匹配算法的实现细节
- 理解导航守卫的执行流程
- 学会设计一个完整的路由系统

## 本书特色

本书是 **L4-10 Mini Router 实现书**，带你从零开始，一步步实现一个功能完整的路由系统。

### 核心功能

我们将实现：

- ✅ Hash 和 History 两种模式
- ✅ 路由匹配器（支持动态路由、嵌套路由）
- ✅ 导航系统（push/replace/go）
- ✅ 导航守卫（beforeEach/afterEach）
- ✅ RouterView 和 RouterLink 组件
- ✅ Composition API（useRouter/useRoute）

### 学习方法

- **循序渐进**：从最简单的功能开始，逐步增强
- **测试驱动**：每个功能都配有测试用例
- **可运行代码**：所有代码都可以直接运行

## 目标读者

**前置要求**：
- 已阅读 L4-9《Vue Router 源码深度解析》
- 熟悉 Vue3 基础 API
- 熟悉 TypeScript

## 你将收获

- ✅ 独立实现一个 Mini Router
- ✅ 深刻理解路由系统的设计
- ✅ 提升架构设计能力
- ✅ 增强源码阅读能力

## 本书在系列中的位置

本书是 L4 系列的第 10 本（L4-10），是 Vue Router 的实现书。

**推荐学习顺序**：
1. L4-0《Vue3 核心设计总览》- 建立全局视野
2. L4-9《Vue Router 源码深度解析》- 理解源码实现
3. 本书（L4-10）- 动手实践

## 项目结构

```
mini-router/
├── src/
│   ├── history/         # History 管理
│   ├── matcher/         # 路由匹配
│   ├── router/          # 路由器核心
│   ├── components/      # 内置组件
│   └── index.ts         # 入口文件
└── test/                # 测试
```

## 开始实现

准备好了吗？让我们开始从零实现 Mini Vue Router！

[查看目录大纲 →](toc.md)
