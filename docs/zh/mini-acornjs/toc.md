# JavaScript解析器实战：从零构建mini-acorn

本书将带你从零开始，一步步构建一个功能完备的 JavaScript 解析器。我们不仅会深入 Acorn 的源码实现，更会结合编译原理的理论知识，让你知其然，更知其所以然。

- [序言](preface.md)

---

## 第一部分：解析器基石

1. [启程：JavaScript 解析器概览](foundations/parsing-overview.md)
2. [编译原理速成：文法、词法与语法](foundations/compiler-primer.md)
3. [理解 ESTree 规范](foundations/estree-specification.md)
4. [Acorn 架构概览：核心模块与流程](foundations/acorn-architecture.md)
5. [准备工作：搭建 mini-acorn 项目](foundations/project-setup.md)

---

## 第二部分：词法分析

6. [词法分析概览：分词的实现思路](lexical-analysis/overview.md)
7. [Token 数据结构设计](lexical-analysis/token-data-structure.md)
8. [实现 Tokenizer：处理空白、注释与 Token 读取](lexical-analysis/tokenizer-implementation.md)
9. [解析标识符与关键字](lexical-analysis/identifiers-and-keywords.md)
10. [解析字面量：字符串、数字与正则表达式](lexical-analysis/literals-and-regexp.md)
11. [解析运算符与标点](lexical-analysis/operators-and-punctuators.md)

---

## 第三部分：语法分析

12. [语法分析概览：递归下降法](syntactic-analysis/overview.md)
13. [Parser 核心：状态初始化与管理](syntactic-analysis/parser-state.md)
14. [实现解析器辅助方法](syntactic-analysis/parser-helpers.md)
15. [解析程序与顶层节点：实现 parse 方法](syntactic-analysis/program-parsing.md)
16. [语句解析调度：parseStatement 实现](syntactic-analysis/statement-dispatcher.md)
17. [解析两种基础语句：表达式语句与块级语句](syntactic-analysis/basic-statements.md)

---

## 第四部分：表达式解析

18. [表达式解析的挑战：运算符优先级与结合性](expressions/challenges.md)
19. [Pratt 解析法：算法核心](expressions/pratt-parser-core.md)
20. [实现 Pratt 解析器：Token 的“绑定力”](expressions/pratt-parser-implementation.md)
21. [解析原子与分组表达式：`this`, `super`, `( ... )`](expressions/atomic-and-grouping.md)
22. [解析数组与对象字面量](expressions/array-and-object-literals.md)
23. [解析前缀与更新表达式：`!x`, `++i`](expressions/prefix-and-update.md)
24. [解析中缀表达式：二元运算与逻辑运算](expressions/infix-expressions.md)
25. [解析后缀、调用与成员表达式：`a++`, `a()`, `a[]`](expressions/postfix-call-member.md)
26. [解析条件与赋值表达式：`a ? b : c`, `a = b`](expressions/conditional-and-assignment.md)

---

## 第五部分：语句与声明

27. [解析变量声明：`var`, `let`, `const`](semantics/variable-declarations.md)
28. [解析条件语句：`if` 与 `switch`](semantics/conditional-statements.md)
29. [解析循环语句：`while`, `do-while`, `for`](semantics/loop-statements.md)
30. [解析控制转移语句：`return`, `break`, `continue`, `throw`](semantics/control-transfer.md)
31. [解析函数：声明、表达式与箭头函数](semantics/function-parsing.md)
32. [解析类：声明与表达式](semantics/class-parsing.md)
33. [深入作用域：构建符号表与作用域链](semantics/scope-and-symbol-table.md)
34. [解析 ES 模块：`import` 与 `export`](semantics/es-modules.md)

---

## 第六部分：AST 应用

35. [AST 遍历与访问：Visitor 模式的应用](ast-manipulation/traversal-and-visitor-pattern.md)
36. [代码生成：将 AST 转换回 JavaScript 代码](ast-manipulation/code-generation.md)

---

## 第七部分：高级特性

37. [插件化架构：打造可扩展的解析器](advanced/plugin-architecture.md)
38. [源码映射：实现 Source Map 生成](advanced/source-map-generation.md)
39. [性能优化：解析器内存与速度考量](advanced/performance-optimization.md)
40. [错误处理与容错：构建更健壮的解析器](advanced/error-handling-and-recovery.md)
41. [整合实践：构建完整解析器](advanced/putting-it-all-together.md)