# 编译器 Mini: 从零实现 Mini Vue Compiler

- [序言](index.md)

---

### 第1部分：项目架构与准备 (Project Architecture)

1. [项目架构设计](mini/project-architecture.md)
2. [接口定义与类型](mini/interface-definitions.md)

---

### 第2部分：编译器核心实现 (Core Implementation)

#### 词法分析

3. [实现词法分析器基础](mini/implement-lexer-basic.md)
4. [实现 Token 定义](mini/implement-token-definition.md)

#### 语法解析

5. [实现元素解析](mini/implement-element-parsing.md)
6. [实现属性解析](mini/implement-attribute-parsing.md)
7. [实现插值解析](mini/implement-interpolation-parsing.md)
8. [实现 AST 节点结构](mini/implement-ast-structure.md)

#### AST 转换

9. [实现 Transform 框架](mini/implement-transform-framework.md)
10. [实现元素转换](mini/implement-element-transform.md)
11. [实现 v-if 转换](mini/implement-v-if-transform.md)
12. [实现 v-for 转换](mini/implement-v-for-transform.md)
13. [实现表达式转换](mini/implement-expression-transform.md)

#### 代码生成

14. [实现代码生成器](mini/implement-codegen.md)
15. [实现元素生成](mini/implement-element-generation.md)
16. [实现静态提升](mini/implement-static-hoisting.md)
17. [实现补丁标记](mini/implement-patch-flags.md)

---

### 第3部分：测试与优化 (Testing & Optimization)

18. [单元测试设计](mini/unit-testing.md)
19. [测试用例实现](mini/test-cases.md)
20. [扩展功能探索](mini/extension-exploration.md)
21. [总结与回顾](mini/summary-and-review.md)
