# Vue Renderer 源码深度解析

## 书籍概述

本书深入解析 Vue3 渲染器的设计思想与源码实现，带你彻底读懂 Virtual DOM 与 Diff 算法的核心机制。

## 核心内容

- **Virtual DOM**：虚拟节点的设计与表示
- **VNode 创建**：h 函数与 createVNode 实现
- **Diff 算法**：高效的节点对比与更新策略
- **Patch 机制**：DOM 节点的创建、更新、卸载
- **调度器**：批量更新与异步调度

## 书籍信息

| 项目 | 内容 |
|------|------|
| **目标读者** | 3-5 年前端开发经验 |
| **前置知识** | Vue3 基础使用、TypeScript、DOM API |
| **源码包** | @vue/runtime-dom、@vue/runtime-core |
| **预计章节** | 80 章 |
| **阅读时长** | 2-3 周 |

## 书籍结构

### 第一部分：设计思想（约 18 章）

深入理解渲染器的设计理念与权衡：

- Virtual DOM 的诞生与演进
- 为什么需要 Virtual DOM
- Vue3 渲染器设计目标
- Diff 算法的设计思路
- 最长递增子序列算法
- 自定义渲染器的设计

### 第二部分：源码解析（约 28 章）

逐行解读 Vue 渲染器核心源码：

- 整体架构与模块划分
- VNode 类型与结构定义
- createVNode 与 h 函数
- render 函数入口
- patch 核心流程
- processElement 元素处理
- processComponent 组件处理
- patchElement 元素更新
- patchChildren 子节点 Diff
- patchKeyedChildren 带 key 子节点 Diff
- 最长递增子序列优化
- unmount 卸载流程
- Scheduler 调度器实现

## 配套书籍

📘 **[《从零实现 Mini Vue Renderer》](/renderer-mini/)**

如果你希望通过亲手实现来巩固所学知识，推荐阅读配套的 Mini 实现书籍。

## 技术栈

- **核心框架**: Vue 3.4+
- **语言**: TypeScript
- **关键 API**: DOM API、requestAnimationFrame
- **核心算法**: 最长递增子序列（LIS）

## 学习目标

完成本书学习后，你将能够：

- ✅ 深入理解 Virtual DOM 的设计原理
- ✅ 读懂 Vue 渲染器源码的核心实现
- ✅ 掌握 Diff 算法的优化策略
- ✅ 独立实现一个功能完整的 Mini 渲染器
- ✅ 解决项目中的渲染性能问题

## 开始阅读

- [序言](book_zh/index.md)
- [目录](book_zh/toc.md)
