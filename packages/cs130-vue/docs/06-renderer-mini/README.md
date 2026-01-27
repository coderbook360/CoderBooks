# 从零实现 Mini Vue Renderer

## 书籍概述

本书带你从零开始，手写一个功能完整的 Mini 渲染器，通过亲手实现彻底掌握 Vue3 渲染器原理。

## 核心内容

- **VNode 实现**：虚拟节点创建与类型标记
- **h 函数实现**：创建虚拟节点的工厂函数
- **挂载流程实现**：元素挂载与子节点挂载
- **更新流程实现**：patch 机制与属性更新
- **Diff 算法实现**：简单 Diff、双端 Diff、最长递增子序列
- **调度器实现**：Scheduler 与 nextTick

## 书籍信息

| 项目 | 内容 |
|------|------|
| **目标读者** | 3-5 年前端开发经验 |
| **前置知识** | Vue3 基础使用、TypeScript、响应式原理 |
| **预计章节** | 22 章 |
| **阅读时长** | 1-2 周 |
| **配套书籍** | [《Vue Renderer 源码深度解析》](/renderer/) |

## 书籍结构

### 核心功能实现（19 章）

- **VNode 系列**：VNode 创建、h 函数、ShapeFlags
- **挂载系列**：render 入口、mount 挂载、元素挂载、子节点挂载
- **更新系列**：patch 更新、元素更新、属性更新
- **Diff 系列**：简单 Diff、双端 Diff、最长递增子序列
- **其他**：Fragment、unmount 卸载
- **调度系列**：Scheduler、nextTick

### 测试与优化（3 章）

- 单元测试设计与实现
- 总结与回顾

## 前置知识

在阅读本书之前，建议先阅读配套的源码解析书籍：

📘 **[《Vue Renderer 源码深度解析》](/renderer/)**

## 技术栈

- **语言**: TypeScript
- **关键概念**: Virtual DOM、Diff 算法、Scheduler
- **测试框架**: Vitest

## 学习目标

完成本书学习后，你将能够：

- ✅ 独立实现一个功能完整的 Mini 渲染器
- ✅ 深刻理解 Virtual DOM 和 Diff 算法
- ✅ 具备造轮子的能力

## 开始阅读

- [序言](book_zh/index.md)
- [目录](book_zh/toc.md)
