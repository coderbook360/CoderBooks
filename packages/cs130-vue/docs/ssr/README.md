# Vue SSR 设计与实现

## 书籍概述

本书深入解析 Vue3 服务端渲染的设计思想与源码实现，带你从理解原理到手写实现，彻底掌握同构渲染的核心机制。

## 核心内容

- **同构渲染**：服务端与客户端渲染的统一
- **水合机制**：Hydration 的原理与实现
- **流式渲染**：renderToStream 的实现
- **状态同步**：服务端状态到客户端的传递
- **SSG 静态生成**：预渲染与静态站点生成
- **Mini 实现**：从零实现完整的 SSR 方案

## 书籍信息

| 项目 | 内容 |
|------|------|
| **目标读者** | 3-5 年前端开发经验 |
| **前置知识** | Vue3 基础使用、TypeScript、Node.js |
| **源码包** | @vue/server-renderer |
| **预计章节** | ~55 章 |
| **阅读时长** | 2-3 周 |

## 书籍结构

### 第一部分：设计思想（约 15 章）

深入理解 SSR 的设计理念与权衡：

- SSR 的诞生背景与价值
- CSR vs SSR vs SSG 对比
- 同构应用的设计挑战
- 水合（Hydration）的设计思路
- 流式渲染的优势与实现
- SEO 与首屏性能优化

### 第二部分：源码解析（约 25 章）

逐行解读 Vue SSR 核心源码：

- 整体架构与模块划分
- renderToString 实现
- renderToStream 实现
- 组件的服务端渲染
- 异步组件处理
- Teleport 在 SSR 中的处理
- Suspense 在 SSR 中的处理
- 状态序列化与传递
- 客户端 Hydration 流程
- Hydration 不匹配处理
- 服务端数据预取
- SSG 静态生成实现

### 第三部分：Mini 实现（约 15 章）

从零实现一个完整的 Mini SSR 方案：

- 项目架构设计与接口定义
- 实现 renderToString
- 实现 renderToStream
- 实现状态同步
- 实现客户端 Hydration
- 单元测试与验证
- 性能优化与扩展

## 技术栈

- **核心框架**: Vue 3.4+
- **服务端**: Node.js、Express/Koa
- **语言**: TypeScript
- **关键概念**: 同构渲染、Hydration、流式渲染

## 学习目标

完成本书学习后，你将能够：

- ✅ 深入理解 SSR 的设计原理
- ✅ 读懂 Vue SSR 源码的核心实现
- ✅ 独立实现一个功能完整的 Mini SSR 方案
- ✅ 解决 SSR 项目中的疑难问题
- ✅ 设计高性能的 SSR/SSG 架构

## 开始阅读

- [序言](book_zh/index.md)
- [目录](book_zh/toc.md)
