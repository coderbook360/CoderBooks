# path-to-regexp 源码解析：从零实现 mini-path-to-regexp

本书将带你深入 path-to-regexp 的核心源码，聚焦于其两大核心功能——路径正则化和路径编译的原理与实现。我们将通过构建一个 mini-path-to-regexp，让你彻底掌握 URL 匹配的精髓。

- [序言](preface.md)

---

### 第一部分：基础原理 (Foundational Principles)

1. [概览：API 与核心流程](foundations/overview.md)
2. [核心概念：路径模式、参数与修饰符](foundations/core-concepts.md)
3. [设计思想：从路径字符串到正则表达式的转换之旅](foundations/design-philosophy.md)

---

### 第二部分：核心实现：路径解析与正则生成 (Path Parsing and RegExp Generation)

4. [词法分析：将路径字符串分解为 Token](implementation/lexical-analysis.md)
5. [Token 数据结构：解析结果的标准化表示](implementation/token-data-structure.md)
6. [语法解析：`parse` 函数实现详解](implementation/parse-function.md)
7. [正则生成：`pathToRegexp` 函数实现详解](implementation/pathtoregexp-function.md)
8. [高级模式解析：处理可选、重复与自定义参数](implementation/advanced-patterns.md)

---

### 第三部分：核心实现：路径编译与匹配 (Path Compilation and Matching)

9. [路径编译：`compile` 函数实现详解](implementation/compile-function.md)
10. [路径匹配：`match` 函数实现详解](implementation/match-function.md)
11. [错误处理：构建健壮的解析与匹配机制](implementation/error-handling.md)
