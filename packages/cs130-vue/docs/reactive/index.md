# Vue3 响应式系统源码深度解析

## 书籍概述

本书深入解析 Vue3 响应式系统的设计思想与源码实现，带你彻底读懂 `@vue/reactivity` 的核心机制。

## 核心内容

- **Proxy 响应式原理**：深入理解 Proxy/Reflect 的拦截机制
- **依赖收集机制**：track、trigger 与 effect 的完整流程
- **响应式 API 实现**：ref、reactive、computed、watch 的源码解析
- **调度器系统**：scheduler 与异步更新机制

## 书籍信息

| 项目 | 内容 |
|------|------|
| **目标读者** | 3-5 年前端开发经验 |
| **前置知识** | Vue3 基础使用、TypeScript、ES6+ |
| **源码包** | @vue/reactivity |
| **预计章节** | 77 章 |
| **阅读时长** | 2-3 周 |

## 书籍结构

### 第一部分：设计思想（18 章）

深入理解响应式系统的设计理念与权衡：

- 响应式编程范式概述
- Vue3 响应式设计目标与约束
- Proxy vs Object.defineProperty 的对比分析
- 依赖收集的设计思路
- 调度器与异步更新策略
- 响应式系统的边界与限制

### 第二部分：源码解析（56 章）

逐行解读 `@vue/reactivity` 核心源码：

- 整体架构与模块划分
- reactive 与 readonly 实现
- ref 与 shallowRef 实现
- effect 与依赖收集机制
- track 与 trigger 函数解析
- computed 计算属性实现
- watch 与 watchEffect 实现
- effectScope 作用域管理
- 边界处理与异常情况

## 配套书籍

📘 **[《从零实现 Mini Vue Reactivity》](/reactive-mini/)**

如果你希望通过亲手实现来巩固所学知识，推荐阅读配套的 Mini 实现书籍。

## 技术栈

- **核心框架**: Vue 3.4+
- **语言**: TypeScript
- **关键 API**: Proxy、Reflect、WeakMap、Set
- **核心概念**: 依赖收集、发布订阅、调度器

## 学习目标

完成本书学习后，你将能够：

- ✅ 深入理解 Vue3 响应式系统的设计原理
- ✅ 读懂 `@vue/reactivity` 源码的核心实现
- ✅ 解决项目中的响应式相关疑难问题
- ✅ 在技术面试中深入讲解响应式原理

## 开始阅读

- [序言](book_zh/index.md)
- [目录](book_zh/toc.md)
