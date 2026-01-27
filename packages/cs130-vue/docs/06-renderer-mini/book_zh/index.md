# 序言

## 为什么写这本书

> 纸上得来终觉浅，绝知此事要躬行。

本书将带你从零开始，手写一个功能完整的 Mini 渲染器。

## 本书定位

本书是 [《Vue Renderer 源码深度解析》](/renderer/) 的配套实践书籍。

## 你将实现什么

### VNode 系统

- 虚拟节点创建
- h 函数
- ShapeFlags 类型标记

### 挂载流程

- render 入口
- mount 挂载
- 元素挂载
- 子节点挂载

### 更新流程

- patch 更新
- 元素更新
- 属性更新

### Diff 算法

- 简单 Diff
- 双端 Diff
- 最长递增子序列（LIS）

### 其他功能

- Fragment 支持
- unmount 卸载
- Scheduler 调度器
- nextTick 实现

## 目标读者

- ✅ 已阅读 [《Vue Renderer 源码深度解析》](/renderer/)
- ✅ 熟悉 TypeScript 基础语法
- ✅ 熟悉 ES6+ 语法特性

## 开始实现

准备好了吗？让我们开始动手实现！

[查看目录](toc.md)
