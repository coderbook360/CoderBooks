---
layout: home

hero:
  name: "Vue3 源码设计与实现"
  text: "深入理解 Vue3 核心原理"
  tagline: 15 本聚焦源码级别的专业书籍，完整覆盖 Vue3 生态系统（L4 系列）
  actions:
    - theme: brand
      text: 📖 阅读总览书
      link: /00-design-overview/
    - theme: alt
      text: 查看学习路径
      link: /learning-paths
    - theme: alt
      text: GitHub
      link: https://github.com

features:
  - icon: 📚
    title: L4-0 核心设计总览
    details: Vue3 生态系统设计理念全景，各模块对比分析与架构决策
    link: /00-design-overview/
  - icon: 🎯
    title: L4-1/2 响应式系统
    details: Proxy、依赖收集、effect 机制的源码解析与 Mini 实现
    link: /01-reactive/
  - icon: 🧩
    title: L4-3/4 组件系统
    details: 组件生命周期、Props、Slots 的源码解析与 Mini 实现
    link: /03-component/
  - icon: 🎨
    title: L4-5/6 渲染器系统
    details: Virtual DOM、Diff 算法的源码解析与 Mini 实现
    link: /05-renderer/
  - icon: ⚙️
    title: L4-7/8 编译器系统
    details: 模板编译、AST 转换的源码解析与 Mini 实现
    link: /07-compiler/
  - icon: 🛣️
    title: L4-9/10 路由系统
    details: Vue Router 的源码解析与 Mini 实现
    link: /09-router-source/
  - icon: 📦
    title: L4-11/12 状态管理
    details: Pinia 的源码解析与 Mini 实现
    link: /11-pinia-source/
  - icon: 🚀
    title: L4-13/14 服务端渲染
    details: Vue SSR 的源码解析与 Mini 实现
    link: /13-ssr-source/
---

## 📚 系列定位

本系列采用 **L4 源码实现层「1 总 + 2N 分」架构**，面向 **3-5 年经验** 的前端开发者：

- 📖 **L4-0 总览书**：建立全局视野，理解各模块设计理念
- 🔍 **源码解析书**：逐行解析官方源码的核心实现
- 🛠️ **Mini 实现书**：从零实现，深化理解

## 📖 完整书籍列表（15 本）

### L4-0：系列总览（必读基础）

| 编号 | 书籍名称 | 章节数 | 阅读时长 |
|------|---------|--------|---------|
| L4-0 | [《Vue3 核心设计总览》](/00-design-overview/) | 58 章 | 1-2 周 |

### L4-1 至 L4-8：四大核心模块

| 编号 | 书籍名称 | 章节数 | 源码包 | 阅读时长 |
|------|---------|--------|--------|---------|
| L4-1 | [《Vue3 响应式系统源码深度解析》](/01-reactive/) | 77 章 | @vue/reactivity | 2-3 周 |
| L4-2 | [《从零实现 Mini Vue Reactivity》](/02-reactive-mini/) | 26 章 | - | 1 周 |
| L4-3 | [《Vue3 组件系统源码深度解析》](/03-component/) | 88 章 | @vue/runtime-core | 3-4 周 |
| L4-4 | [《从零实现 Mini Vue Component》](/04-component-mini/) | 20 章 | - | 1 周 |
| L4-5 | [《Vue Renderer 源码深度解析》](/05-renderer/) | 80 章 | @vue/runtime-dom | 2-3 周 |
| L4-6 | [《从零实现 Mini Vue Renderer》](/06-renderer-mini/) | 22 章 | - | 1 周 |
| L4-7 | [《Vue Compiler 源码深度解析》](/07-compiler/) | 92 章 | @vue/compiler-* | 3-4 周 |
| L4-8 | [《从零实现 Mini Vue Compiler》](/08-compiler-mini/) | 21 章 | - | 1 周 |

### L4-9 至 L4-14：生态系统模块

| 编号 | 书籍名称 | 章节数 | 源码包 | 阅读时长 |
|------|---------|--------|--------|---------|
| L4-9 | [《Vue Router 源码深度解析》](/09-router-source/) | 62 章 | vue-router | 3-4 周 |
| L4-10 | [《从零实现 Mini Vue Router》](/10-router-mini/) | 25 章 | - | 1-2 周 |
| L4-11 | [《Pinia 源码深度解析》](/11-pinia-source/) | 61 章 | pinia | 2-3 周 |
| L4-12 | [《从零实现 Mini Pinia》](/12-pinia-mini/) | 19 章 | - | 1 周 |
| L4-13 | [《Vue SSR 源码深度解析》](/13-ssr-source/) | 59 章 | @vue/server-renderer | 2-3 周 |
| L4-14 | [《从零实现 Mini Vue SSR》](/14-ssr-mini/) | 19 章 | - | 1 周 |

**总计**：15 本书籍，739 章节，完整学习时间约 30-40 周

## 🎯 学习目标

完成本系列学习后，你将：

- ✅ **全局视野**：理解 Vue3 生态系统的整体架构设计
- ✅ **源码能力**：能够独立阅读和理解框架源码
- ✅ **造轮子能力**：能够从零实现核心功能模块
- ✅ **架构思维**：掌握框架设计的方法论和决策模式
- ✅ **技术选型**：能够做出合理的技术方案选择

## 📐 L4 系列架构说明

本系列遵循技术书籍的 **L4 源码实现层「1 总 + 2N 分」架构**：

```
L4-0: 总览书（必读基础）
  ├── 建立全局视野
  ├── 理解设计理念
  └── 对比各模块差异
  
L4-1/2: 响应式（源码 + 实现）
L4-3/4: 组件（源码 + 实现）
L4-5/6: 渲染器（源码 + 实现）
L4-7/8: 编译器（源码 + 实现）
L4-9/10: Router（源码 + 实现）
L4-11/12: Pinia（源码 + 实现）
L4-13/14: SSR（源码 + 实现）
```

### 源码解析书籍结构

```
第一部分：设计思想（约 20-30%）
├── 核心概念与设计理念
├── 设计原则与权衡
├── 与其他方案对比分析
└── 架构概览

第二部分：源码解析（约 70-80%）
├── 整体架构与模块划分
├── 核心模块逐行解读
├── 关键算法实现细节
└── 边界情况与优化策略
```

### Mini 实现书籍结构

```
第一部分：项目架构
第二至N部分：核心功能实现
最后部分：测试与总结
```
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
