# Vue3 组件系统源码深度解析

## 书籍概述

本书深入解析 Vue3 组件系统的设计思想与源码实现，带你彻底读懂 `@vue/runtime-core` 的组件机制。

## 核心内容

- **组件生命周期**：完整的组件创建、更新、卸载流程
- **Props 与 Emits**：属性传递与事件通信机制
- **Slots 插槽**：作用域插槽与动态插槽实现
- **Composition API**：setup、响应式集成与组合函数
- **特殊组件**：Teleport、Suspense、KeepAlive 实现原理

## 书籍信息

| 项目 | 内容 |
|------|------|
| **目标读者** | 3-5 年前端开发经验 |
| **前置知识** | Vue3 基础使用、TypeScript、响应式原理 |
| **源码包** | @vue/runtime-core |
| **预计章节** | 88 章 |
| **阅读时长** | 3-4 周 |

## 书籍结构

### 第一部分：设计思想（约 22 章）

深入理解组件系统的设计理念与权衡：

- 组件化开发范式概述
- Vue3 组件设计目标与约束
- Options API vs Composition API 对比
- 组件通信模式设计
- 生命周期设计思想
- 组件树与渲染机制

### 第二部分：源码解析（约 33 章）

逐行解读 `@vue/runtime-core` 组件相关源码：

- 整体架构与模块划分
- createApp 与应用实例
- defineComponent 与组件定义
- 组件实例创建流程
- Props 与 Attrs 处理
- Emits 事件系统
- Slots 插槽机制
- setup 函数执行
- 生命周期钩子实现
- provide/inject 依赖注入
- Teleport 传送门实现
- Suspense 异步组件
- KeepAlive 缓存组件

## 配套书籍

📘 **[《从零实现 Mini Vue Component》](/component-mini/)**

如果你希望通过亲手实现来巩固所学知识，推荐阅读配套的 Mini 实现书籍。

## 技术栈

- **核心框架**: Vue 3.4+
- **语言**: TypeScript
- **关键概念**: 组件实例、渲染函数、虚拟DOM
- **设计模式**: 组合模式、依赖注入、观察者模式

## 学习目标

完成本书学习后，你将能够：

- ✅ 深入理解 Vue3 组件系统的设计原理
- ✅ 读懂 `@vue/runtime-core` 源码的核心实现
- ✅ 独立实现一个功能完整的 Mini 组件系统
- ✅ 解决项目中的组件相关疑难问题
- ✅ 设计高质量的可复用组件

## 开始阅读

- [序言](book_zh/index.md)
- [目录](book_zh/toc.md)
