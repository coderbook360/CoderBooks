# 序言

## 为什么写这本书

Pinia 是 Vue 官方推荐的新一代状态管理库，它以更简洁的 API 和更好的 TypeScript 支持取代了 Vuex。

作为一名前端开发者，你可能已经在项目中使用 Pinia，但你是否真正理解：

- defineStore 是如何创建 Store 的？
- State 是如何与 Vue 响应式系统集成的？
- Getters 和 Actions 是如何实现的？
- 插件系统是如何工作的？
- $subscribe 和 $onAction 的订阅机制是什么？

这些问题的答案，隐藏在 Pinia 的设计之中。本书将带你深入 Pinia 的源码，全面理解现代化状态管理的实现原理。

## 本书特色

本书采用 **"设计思想 + 源码解析 + Mini 实现"** 三合一的架构。

### 第一部分：设计思想

- 状态管理的发展历程
- Pinia vs Vuex 设计对比
- 插件系统设计思想

### 第二部分：源码解析

逐行解读 Pinia 核心源码：

- createPinia 创建流程
- defineStore 实现原理
- State、Getters、Actions 处理
- 订阅机制实现

### 第三部分：Mini 实现

从零实现一个功能完整的 Mini Pinia。

## 目标读者

本书面向具有 **3-5 年前端开发经验** 的开发者。

## 你将收获

- ✅ 深入理解 Pinia 的设计原理
- ✅ 读懂 Pinia 源码的核心实现
- ✅ 独立实现一个 Mini Pinia
- ✅ 开发 Pinia 插件

## 开始阅读

[查看目录](toc.md)
