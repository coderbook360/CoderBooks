# Vue 3 源码解析：深入理解框架设计与实现

本书专注于 Vue 3 的核心源码原理，深入剖析响应式系统、调度器、渲染器、组件系统和编译器的完整实现。通过系统性的源码分析，帮助你真正理解 Vue 3 的设计哲学与实现细节。

- [序言](preface.md)

---

### 第一部分：框架设计哲学 (Framework Design Philosophy)

1. [Vue 3 的设计目标与核心理念](overview/design-philosophy.md)
2. [命令式与声明式：两种范式的权衡](overview/imperative-vs-declarative.md)
3. [运行时与编译时：性能优化的关键抉择](overview/runtime-vs-compiletime.md)
4. [Vue 3 核心模块划分与数据流](overview/core-modules.md)
5. [Vue 3 与 Vue 2 的架构差异对比](overview/vue2-vs-vue3.md)

---

### 第二部分：响应式系统核心 (Reactivity Core)

6. [响应式系统概览：从 Object.defineProperty 到 Proxy](reactivity/overview.md)
7. [reactive 的实现：创建深层响应式对象](reactivity/reactive.md)
8. [effect 与依赖收集：track 和 trigger 的实现](reactivity/effect-track-trigger.md)
9. [依赖清理与嵌套 effect 的处理](reactivity/effect-cleanup.md)
10. [ref 的实现：处理原始值的响应式包装](reactivity/ref.md)
11. [computed 的实现：惰性求值与缓存机制](reactivity/computed.md)
12. [watch 与 watchEffect：侦听器的完整实现](reactivity/watch.md)

---

### 第三部分：响应式系统进阶 (Reactivity Advanced)

13. [shallowReactive 与 shallowRef：浅层响应式](reactivity-advanced/shallow.md)
14. [readonly 与 shallowReadonly：只读代理的实现](reactivity-advanced/readonly.md)
15. [toRaw 与 markRaw：逃离响应式](reactivity-advanced/raw.md)
16. [toRef 与 toRefs：响应式解构的秘密](reactivity-advanced/to-refs.md)
17. [effectScope：副作用作用域管理](reactivity-advanced/effect-scope.md)
18. [响应式系统的边界处理与常见陷阱](reactivity-advanced/edge-cases.md)

---

### 第四部分：调度器系统 (Scheduler System)

19. [调度器概述：Vue 3 异步更新机制](scheduler/overview.md)
20. [queueJob：任务队列的管理与排序](scheduler/queue-job.md)
21. [Pre/Post FlushCbs：刷新回调的处理](scheduler/flush-cbs.md)
22. [nextTick 的实现原理](scheduler/next-tick.md)
23. [SchedulerJobFlags 与递归保护](scheduler/job-flags.md)

---

### 第五部分：虚拟 DOM 与渲染器 (Virtual DOM & Renderer)

24. [虚拟 DOM 概述：为什么需要 VNode](renderer/vdom-overview.md)
25. [VNode 的类型设计与创建函数](renderer/vnode-design.md)
26. [渲染器架构：createRenderer 的设计](renderer/renderer-architecture.md)
27. [元素的挂载流程：mountElement](renderer/mount-element.md)
28. [属性与样式的处理：patchProp](renderer/patch-prop.md)
29. [事件处理：invoker 模式的优化](renderer/event-handling.md)
30. [元素的更新流程：patchElement](renderer/patch-element.md)
31. [子节点的挂载与更新](renderer/children.md)

---

### 第六部分：Diff 算法详解 (Diff Algorithm In-Depth)

32. [Diff 算法概述：最小化 DOM 操作的核心](diff/overview.md)
33. [简单 Diff 算法：基础实现与局限性](diff/simple-diff.md)
34. [双端 Diff 算法：优化比较策略](diff/double-ended-diff.md)
35. [快速 Diff 算法：预处理与最长递增子序列](diff/fast-diff.md)
36. [最长递增子序列算法详解](diff/lis-algorithm.md)
37. [key 的作用与 Diff 性能优化](diff/key-optimization.md)

---

### 第七部分：组件系统基础 (Component Fundamentals)

38. [组件的本质：状态与行为的封装](component/overview.md)
39. [组件实例的创建与初始化](component/instance-creation.md)
40. [组件公共实例代理：this 的实现](component/public-instance.md)
41. [组件的挂载流程：mountComponent](component/mounting.md)
42. [组件的更新流程：updateComponent](component/updating.md)
43. [Props 的声明、校验与传递](component/props.md)
44. [Emit 事件的实现机制](component/emit.md)
45. [Slots 插槽的实现与作用域插槽](component/slots.md)

---

### 第八部分：组件系统进阶 (Component Advanced)

46. [setup 函数与 Composition API](component-advanced/setup-function.md)
47. [生命周期钩子的注册与调用](component-advanced/lifecycle-hooks.md)
48. [provide 与 inject：跨层级通信](component-advanced/provide-inject.md)
49. [异步组件与 defineAsyncComponent](component-advanced/async-component.md)
50. [函数式组件的实现](component-advanced/functional-component.md)
51. [自定义指令的完整实现](component-advanced/directives.md)

---

### 第九部分：内置组件实现原理 (Built-in Components)

52. [KeepAlive：组件缓存与 LRU 策略](builtin/keep-alive.md)
53. [Teleport：跨 DOM 层级渲染](builtin/teleport.md)
54. [Transition：过渡动画的实现机制](builtin/transition.md)
55. [Suspense：异步依赖的协调与 fallback](builtin/suspense.md)
56. [Fragment：多根节点的处理](builtin/fragment.md)

---

### 第十部分：编译器核心 (Compiler Core)

57. [编译器概述：模板到渲染函数的完整流程](compiler/overview.md)
58. [词法分析：有限状态机与 Token 化](compiler/tokenizer.md)
59. [语法分析：递归下降解析模板 AST](compiler/parser.md)
60. [模板 AST 的节点类型设计](compiler/ast-design.md)
61. [插值表达式与指令的解析](compiler/interpolation-directive.md)

---

### 第十一部分：编译器转换 (Compiler Transform)

62. [AST 转换概述：Transform 阶段的设计](transform/overview.md)
63. [节点转换与上下文对象](transform/context.md)
64. [v-if 与 v-else 的转换实现](transform/v-if.md)
65. [v-for 的转换实现](transform/v-for.md)
66. [v-on 事件绑定的转换](transform/v-on.md)
67. [v-bind 与动态属性的转换](transform/v-bind.md)
68. [v-model 双向绑定的转换](transform/v-model.md)

---

### 第十二部分：编译优化 (Compiler Optimization)

69. [编译优化概述：静态分析与运行时提示](optimization/overview.md)
70. [PatchFlags：精确的更新提示](optimization/patch-flags.md)
71. [静态提升：hoistStatic 的实现](optimization/hoist-static.md)
72. [预字符串化：将静态内容转为字符串](optimization/stringify-static.md)
73. [Block Tree 与动态节点收集](optimization/block-tree.md)
74. [缓存事件处理函数](optimization/cache-handlers.md)
75. [v-once 与 v-memo 的优化实现](optimization/v-once-v-memo.md)

---

### 第十三部分：代码生成 (Code Generation)

76. [代码生成器的架构设计](codegen/architecture.md)
77. [生成 render 函数代码](codegen/render-function.md)
78. [运行时辅助函数的调用生成](codegen/runtime-helpers.md)
79. [JavaScript AST 的代码生成](codegen/js-ast.md)
80. [Source Map 的生成原理](codegen/source-map.md)

---

### 第十四部分：SFC 编译 (Single File Component)

81. [SFC 概述：.vue 文件的编译流程](sfc/overview.md)
82. [SFC 解析：分离 template/script/style](sfc/parsing.md)
83. [script setup 的编译处理](sfc/script-setup.md)
84. [CSS 作用域：scoped 样式的实现](sfc/scoped-css.md)
85. [CSS Modules 与 v-bind in CSS](sfc/css-modules.md)

---

### 第十五部分：服务端渲染 (Server Side Rendering)

86. [SSR 概述：服务端渲染的原理与挑战](ssr/overview.md)
87. [SSR 渲染器：renderToString 的实现](ssr/render-to-string.md)
88. [SSR 编译模式：优化的服务端代码生成](ssr/compiler-mode.md)
89. [客户端激活：hydration 的实现](ssr/hydration.md)
90. [流式渲染：renderToStream](ssr/streaming.md)
