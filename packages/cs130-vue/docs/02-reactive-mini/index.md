# 从零实现 Mini Vue Reactivity

## 书籍概述

本书带你从零开始，手写一个功能完整的 Mini 响应式系统，通过亲手实现彻底掌握 Vue3 响应式原理。

## 核心内容

- **reactive 实现**：Proxy 拦截与依赖收集
- **effect 实现**：副作用函数与触发更新
- **ref 实现**：值类型响应式包装
- **computed 实现**：惰性求值与缓存机制
- **watch 实现**：侦听器与清理函数

## 书籍信息

| 项目 | 内容 |
|------|------|
| **目标读者** | 3-5 年前端开发经验 |
| **前置知识** | Vue3 基础使用、TypeScript、ES6+ |
| **预计章节** | 26 章 |
| **阅读时长** | 1-2 周 |
| **配套书籍** | [《Vue3 响应式系统源码深度解析》](/reactive/) |

## 书籍结构

### 核心功能实现（20 章）

从零实现一个完整的 Mini 响应式系统：

- **reactive 系列**：reactive、readonly、shallowReactive
- **effect 系列**：effect、track、trigger、依赖清理
- **ref 系列**：ref、shallowRef、toRef、toRefs、customRef
- **computed 系列**：computed 基础版与缓存机制
- **watch 系列**：watch、watchEffect
- **effectScope**：作用域管理

### 测试与优化（6 章）

- 单元测试设计与实现
- 性能对比测试
- 扩展功能探索
- 总结与回顾

## 前置知识

在阅读本书之前，建议先阅读配套的源码解析书籍：

📘 **[《Vue3 响应式系统源码深度解析》](/reactive/)**

理解设计思想和源码实现后，再来动手实现会事半功倍。

## 技术栈

- **语言**: TypeScript
- **关键 API**: Proxy、Reflect、WeakMap、Set
- **测试框架**: Vitest

## 学习目标

完成本书学习后，你将能够：

- ✅ 独立实现一个功能完整的 Mini 响应式系统
- ✅ 深刻理解响应式系统的每一个细节
- ✅ 具备造轮子的能力
- ✅ 在技术面试中手写响应式原理

## 开始阅读

- [序言](book_zh/index.md)
- [目录](book_zh/toc.md)
