---
sidebar_position: 1
title: Introduction
---

# Mini-Zepto.js：轻量级 DOM 库解析

## 简介

Zepto.js 是移动端最流行的轻量级 JavaScript 库，号称"移动端的 jQuery"。它提供与 jQuery 相似的 API，但体积只有 jQuery 的 1/10。

本书将从零实现一个 mini 版 Zepto，帮助你理解：

- DOM 库的核心设计模式
- 链式调用的实现原理
- 事件系统的架构设计
- 移动端优化技巧

## 适合读者

- 熟悉 JavaScript 基础语法
- 有过 jQuery/Zepto 使用经验
- 想深入理解 DOM 操作原理
- 希望提升源码阅读能力

## 你将学到什么

- **DOM 集合封装**：如何将原生 DOM 包装成可链式调用的对象
- **选择器引擎**：CSS 选择器的解析与匹配
- **事件系统**：事件绑定、委托、自定义事件的实现
- **动画系统**：CSS3 动画与 JavaScript 动画的结合
- **AJAX 封装**：XMLHttpRequest 的优雅封装
- **插件机制**：可扩展的架构设计

## 本书特色

- **渐进式实现**：从最简单的选择器开始，逐步构建完整库
- **对比分析**：与 jQuery 对比，理解设计取舍
- **移动优先**：关注移动端特有的触摸事件和性能优化
- **TypeScript 重构**：用现代 TypeScript 重新实现

## 如何使用本书

建议按章节顺序阅读，每章都有完整的代码示例。跟随书中的代码一步步实现，最终你将拥有一个功能完整的 mini-zepto 库。

## 开始阅读

让我们从[项目初始化](./foundations/setup)开始，搭建开发环境。
