---
outline: deep
---

# path-to-regexp 源码解析：从零实现 mini-path-to-regexp

本书将带你深入 path-to-regexp 的核心源码，聚焦于其两大核心功能——路径正则化和路径编译的原理与实现。我们将通过构建一个 mini-path-to-regexp，让你彻底掌握 URL 匹配的精髓。

## 🎯 你将学到什么

- **词法分析** - 将路径字符串分解为 Token
- **语法解析** - parse 函数实现详解
- **正则生成** - pathToRegexp 函数原理
- **路径编译** - compile 与 match 函数

## 📖 开始阅读

👉 从 [序言](./preface) 开始，或者使用左侧导航菜单浏览各个章节。

## 📚 本书结构

本书共分为 **3 个部分，11 个章节**：

1. **基础原理** - API 概览、核心概念、设计思想
2. **路径解析与正则生成** - 词法分析、Token 设计、parse 与 pathToRegexp
3. **路径编译与匹配** - compile、match 与错误处理
