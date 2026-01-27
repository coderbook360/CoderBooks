# 编译器: Vue 编译器源码深度解析

- [序言](index.md)

---

### 第1部分：设计基础 (Design Fundamentals)

1. [编译原理基础概念](design/compiler-basics.md)
2. [词法分析概述](design/lexical-analysis-overview.md)
3. [语法分析概述](design/syntax-analysis-overview.md)
4. [抽象语法树 AST](design/abstract-syntax-tree.md)
5. [Vue 编译器设计目标](design/vue-compiler-goals.md)
6. [模板编译 vs JSX 编译](design/template-vs-jsx.md)
7. [编译时 vs 运行时](design/compile-time-vs-runtime.md)
8. [架构总览](design/architecture-overview.md)

---

### 第2部分：优化设计 (Optimization Design)

9. [静态分析与优化](design/static-analysis-optimization.md)
10. [静态提升设计](design/static-hoisting-design.md)
11. [补丁标记设计](design/patch-flags-design.md)
12. [Block Tree 设计](design/block-tree-design.md)
13. [缓存事件处理器](design/cache-handlers-design.md)
14. [Tree Shaking 支持](design/tree-shaking-support.md)
15. [设计权衡与取舍](design/design-tradeoffs.md)

---

### 第3部分：SFC编译设计 (SFC Compilation Design)

16. [SFC 单文件组件编译](design/sfc-compilation.md)
17. [script setup 设计](design/script-setup-design.md)
18. [CSS 作用域与 Scoped](design/css-scoped-design.md)
19. [CSS Modules 设计](design/css-modules-design.md)
20. [自定义指令编译](design/custom-directives-compilation.md)

---

### 第四部分：核心流程篇 (Core Process)

21. [源码结构与阅读指南](source/source-structure-guide.md)
22. [compile 编译入口](source/compile-entry.md)
23. [baseCompile 核心流程](source/base-compile.md)
24. [CompilerOptions 配置选项](source/compiler-options.md)
25. [错误处理与错误码](source/error-handling-codes.md)

---

### 第五部分：解析器篇 (Parser)

26. [baseParse 解析入口](source/base-parse-entry.md)
27. [createParserContext 上下文创建](source/create-parser-context.md)
28. [parseChildren 子节点解析](source/parse-children.md)
29. [parseElement 元素解析](source/parse-element.md)
30. [parseTag 标签解析](source/parse-tag.md)
31. [parseAttributes 属性解析](source/parse-attributes.md)
32. [parseAttributeValue 属性值解析](source/parse-attribute-value.md)
33. [parseInterpolation 插值解析](source/parse-interpolation.md)
34. [parseText 文本解析](source/parse-text.md)
35. [parseComment 注释解析](source/parse-comment.md)
36. [parseBogusComment 伪注释解析](source/parse-bogus-comment.md)

---

### 第六部分：AST节点篇 (AST Nodes)

37. [AST 节点类型定义](source/ast-node-types.md)
38. [ElementNode 元素节点](source/element-node.md)
39. [TextNode 与 InterpolationNode](source/text-interpolation-node.md)
40. [CommentNode 注释节点](source/comment-node.md)
41. [AttributeNode 与 DirectiveNode](source/attribute-directive-node.md)
42. [CompoundExpressionNode 复合表达式](source/compound-expression-node.md)
43. [IfNode 与 ForNode](source/if-for-node.md)
44. [SlotOutletNode 与 TemplateNode](source/slot-template-node.md)

---

### 第七部分：AST转换篇 (AST Transform)

45. [transform 转换入口](source/transform-entry.md)
46. [createTransformContext 上下文](source/create-transform-context.md)
47. [traverseNode 节点遍历](source/traverse-node.md)
48. [traverseChildren 子节点遍历](source/traverse-children.md)
49. [transformElement 元素转换](source/transform-element.md)
50. [transformExpression 表达式转换](source/transform-expression.md)
51. [transformText 文本转换](source/transform-text.md)
52. [transformIf 条件转换](source/transform-if.md)
53. [transformFor 循环转换](source/transform-for.md)
54. [transformSlotOutlet 插槽转换](source/transform-slot-outlet.md)
55. [transformBind 绑定转换](source/transform-bind.md)
56. [transformOn 事件转换](source/transform-on.md)
57. [transformModel 双向绑定转换](source/transform-model.md)
58. [transformVShow 指令转换](source/transform-v-show.md)
59. [transformVOnce 一次性渲染](source/transform-v-once.md)
60. [transformVMemo 缓存节点](source/transform-v-memo.md)

---

### 第八部分：代码生成篇 (Code Generation)

61. [generate 代码生成入口](source/generate-entry.md)
62. [createCodegenContext 上下文](source/create-codegen-context.md)
63. [genNode 节点生成](source/gen-node.md)
64. [genElement 元素生成](source/gen-element.md)
65. [genExpression 表达式生成](source/gen-expression.md)
66. [genVNodeCall 虚拟节点调用生成](source/gen-vnode-call.md)
67. [genFunctionExpression 函数生成](source/gen-function-expression.md)
68. [genConditionalExpression 条件生成](source/gen-conditional-expression.md)
69. [genForNode 循环节点生成](source/gen-for-node.md)
70. [genSlotOutlet 插槽生成](source/gen-slot-outlet.md)

---

### 第九部分：编译优化篇 (Compilation Optimization)

71. [静态提升实现](source/static-hoisting-implementation.md)
72. [补丁标记实现](source/patch-flags-implementation.md)
73. [cacheHandlers 实现](source/cache-handlers-implementation.md)
74. [Block 与 dynamicChildren](source/block-dynamic-children.md)
75. [编译时常量折叠](source/compile-time-constant-folding.md)

---

### 第十部分：SFC编译篇 (SFC Compilation)

76. [SFC 编译流程](source/sfc-compile-flow.md)
77. [parse 解析 SFC](source/parse-sfc.md)
78. [compileScript 脚本编译](source/compile-script.md)
79. [script setup 编译](source/script-setup-compilation.md)
80. [defineProps 与 defineEmits](source/define-props-emits.md)
81. [defineExpose 与 defineOptions](source/define-expose-options.md)
82. [compileTemplate 模板编译](source/compile-template.md)
83. [compileStyle 样式编译](source/compile-style.md)
84. [Scoped CSS 实现](source/scoped-css-implementation.md)
85. [CSS Modules 实现](source/css-modules-implementation.md)
86. [CSS v-bind 实现](source/css-v-bind-implementation.md)

---

### 第十一部分：新版本特性篇 (Latest Features)

87. [defineModel 编译处理](source/define-model-compilation.md)
88. [withDefaults 编译处理](source/with-defaults-compilation.md)
89. [v-pre 编译跳过处理](source/v-pre-compilation.md)
90. [v-cloak 处理机制](source/v-cloak-handling.md)
91. [defineSlots 编译处理](source/define-slots-compilation.md)
92. [泛型组件编译](source/generic-component-compilation.md)
