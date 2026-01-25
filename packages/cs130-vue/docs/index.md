---
layout: home

hero:
  name: "Vue3 源码设计与实现"
  text: "深入理解 Vue3 核心原理"
  tagline: 7 本聚焦源码级别的专业书籍，覆盖 Vue3 生态系统全部核心模块
  actions:
    - theme: brand
      text: 开始学习
      link: /reactive/
    - theme: alt
      text: 查看学习路径
      link: /learning-paths
    - theme: alt
      text: GitHub
      link: https://github.com

features:
  - icon: 🎯
    title: 响应式系统
    details: Proxy、依赖收集、effect 机制的设计思想与源码实现
    link: /reactive/
  - icon: 🧩
    title: 组件系统
    details: 组件生命周期、渲染机制、Composition API 的设计与实现
    link: /component/
  - icon: 🛣️
    title: 路由系统
    details: History API、路由匹配、导航守卫的原理与实现
    link: /router/
  - icon: ⚙️
    title: 编译器系统
    details: 模板解析、AST 转换、代码生成的完整流程与实现
    link: /compiler/
  - icon: 🎨
    title: 渲染器系统
    details: Virtual DOM、Diff 算法、Patch 机制的设计与实现
    link: /renderer/
  - icon: 📦
    title: 状态管理 (Pinia)
    details: Store 设计、插件系统、响应式集成的原理与实现
    link: /pinia/
  - icon: 🚀
    title: 服务端渲染
    details: 同构渲染、水合机制、流式渲染的设计与实现
    link: /ssr/
---

## 📚 系列定位

本系列采用 **"设计思想 + 源码解析"** 与 **"Mini 实现"** 分离的架构，面向 **3-5 年经验** 的前端开发者，帮助你：

- 🧠 **理解设计**：掌握 Vue3 核心模块的设计理念与权衡
- 🔍 **精读源码**：逐行解析官方源码的关键实现
- 🛠️ **手写实现**：通过独立的 Mini 实现书籍，从零实现核心功能

## 📖 源码解析书籍

| 书籍 | 核心内容 | 源码包 | 章节数 |
|------|---------|--------|--------|
| [《Vue3 响应式系统源码深度解析》](/reactive/) | Proxy、依赖收集、effect、computed、watch | @vue/reactivity | 77 章 |
| [《Vue3 组件系统源码深度解析》](/component/) | 组件生命周期、Props、Slots、渲染流程 | @vue/runtime-core | 88 章 |
| [《Vue Renderer 源码深度解析》](/renderer/) | VNode、Diff、Patch、调度器 | @vue/runtime-dom | 80 章 |
| [《Vue Compiler 源码深度解析》](/compiler/) | 模板解析、AST、Transform、Codegen | @vue/compiler-* | 92 章 |
| [《Vue Router 设计与实现》](/router/) | History API、路由匹配、导航守卫 | vue-router | 79 章 |
| [《Pinia 设计与实现》](/pinia/) | Store、Actions、Getters、插件系统 | pinia | 80 章 |
| [《Vue SSR 设计与实现》](/ssr/) | 同构渲染、水合、流式渲染 | @vue/server-renderer | 78 章 |

## 🛠️ Mini 实现书籍

| 书籍 | 核心内容 | 章节数 |
|------|---------|--------|
| [《从零实现 Mini Vue Reactivity》](/reactive-mini/) | reactive、effect、ref、computed、watch 实现 | 26 章 |
| [《从零实现 Mini Vue Component》](/component-mini/) | 组件实例、Props、Slots、生命周期实现 | 20 章 |
| [《从零实现 Mini Vue Renderer》](/renderer-mini/) | VNode、mount、patch、Diff 算法实现 | 22 章 |
| [《从零实现 Mini Vue Compiler》](/compiler-mini/) | 词法分析、AST、Transform、Codegen 实现 | 21 章 |

**总计**：11 本书籍，663 章节，完整学习时间约 32-40 周

## 🎯 目标读者

- **经验要求**：3-5 年前端开发经验
- **前置知识**：熟悉 Vue3 基础使用、TypeScript、ES6+
- **学习目标**：深入理解 Vue3 源码，具备造轮子能力

## 📐 书籍架构说明

### 源码解析书籍结构

```
第一部分：设计思想（约 30%）
├── 核心概念与设计理念
├── 设计原则与权衡
├── 与其他方案对比分析
└── 架构概览

第二部分：源码解析（约 70%）
├── 整体架构与模块划分
├── 核心模块逐行解读
├── 关键算法与数据结构
└── 边界处理与异常情况
```

### Mini 实现书籍结构

```
第一部分：项目架构（约 10%）
├── 项目架构设计
└── 接口定义与类型

第二部分：核心功能实现（约 75%）
├── 核心功能从零实现
└── 逐步增强复杂度

第三部分：测试与优化（约 15%）
├── 单元测试设计
└── 总结与回顾
```

## 🚀 推荐学习路径

### 路径 A：Vue3 核心原理（基础路线）

掌握 Vue3 最核心的三大系统

```
响应式系统 → 组件系统 → 渲染器系统
```

**时长**：约 12-16 周 | **成果**：理解 Vue3 核心运行机制

### 路径 B：Vue3 全栈深入（进阶路线）

全面掌握 Vue3 生态系统

```
响应式 → 组件 → 渲染器 → 编译器 → 路由 → 状态管理
```

**时长**：约 24-28 周 | **成果**：成为 Vue3 源码专家

### 路径 C：企业级应用（实战路线）

聚焦企业级应用开发关键技术

```
组件系统 → 路由系统 → 状态管理 → SSR
```

**时长**：约 14-18 周 | **成果**：掌握企业级 Vue3 应用架构

## 🔧 技术栈

| 技术方向 | 具体技术 |
|---------|---------|
| **核心框架** | Vue 3.4+、TypeScript 5.x |
| **响应式** | Proxy、Reflect、WeakMap、依赖收集 |
| **编译器** | 词法分析、AST、Transform、Codegen |
| **渲染器** | Virtual DOM、Diff 算法、Scheduler |
| **路由** | History API、路径匹配、正则表达式 |
| **状态管理** | Reactive Store、插件系统 |
| **SSR** | 同构渲染、Hydration、流式渲染 |

## 📁 目录结构

```
docs/
├── index.md                  # 系列总览（本文件）
├── learning-paths.md         # 学习路线指南
│
├── reactive/                 # 响应式系统源码解析
├── reactive-mini/            # 响应式系统 Mini 实现
│
├── component/                # 组件系统源码解析
├── component-mini/           # 组件系统 Mini 实现
│
├── renderer/                 # 渲染器源码解析
├── renderer-mini/            # 渲染器 Mini 实现
│
├── compiler/                 # 编译器源码解析
├── compiler-mini/            # 编译器 Mini 实现
│
├── router/                   # 路由系统（完整书籍）
├── pinia/                    # 状态管理（完整书籍）
└── ssr/                      # 服务端渲染（完整书籍）
```

## 📝 许可证

本系列书籍版权所有，未经授权不得转载。
