# Mini-React：从零实现 React 核心原理

本书将带你从零开始，一步步实现一个功能完备的 Mini-React。通过源码级的深度剖析，你将彻底掌握 Virtual DOM、Fiber 架构、Reconciliation 算法、Hooks 系统等 React 核心原理。

- [序言](index.md)

---

### 第一部分：基础概念与架构设计 (Foundations)

1. [React 概览与设计哲学](foundations/overview.md)
2. [声明式 UI 与组件化思想](foundations/declarative-ui.md)
3. [React 源码结构导读](foundations/source-structure.md)
4. [开发环境搭建与项目结构](foundations/dev-environment.md)
5. [构建流程整体架构](foundations/build-architecture.md)

---

### 第二部分：JSX 与 createElement (JSX & createElement)

6. [JSX 语法与编译原理](jsx/syntax.md)
7. [Babel 转换 JSX 过程](jsx/babel-transform.md)
8. [createElement 函数实现](jsx/create-element.md)
9. [ReactElement 数据结构](jsx/react-element.md)
10. [children 规范化处理](jsx/children-normalization.md)
11. [Fragment 实现](jsx/fragment.md)
12. [JSX Runtime 新模式](jsx/jsx-runtime.md)

---

### 第三部分：Virtual DOM 基础 (Virtual DOM)

13. [Virtual DOM 设计理念](vdom/design.md)
14. [VNode 数据结构设计](vdom/vnode-structure.md)
15. [VNode 类型分类](vdom/vnode-types.md)
16. [VNode 创建流程](vdom/vnode-creation.md)
17. [key 属性的作用与实现](vdom/key-prop.md)
18. [ref 属性处理](vdom/ref-prop.md)

---

### 第四部分：Fiber 架构基础 (Fiber Architecture)

19. [Fiber 架构设计动机](fiber/motivation.md)
20. [Fiber 节点数据结构](fiber/node-structure.md)
21. [Fiber 树的构建](fiber/tree-construction.md)
22. [双缓冲机制 (Double Buffering)](fiber/double-buffering.md)
23. [current 与 workInProgress](fiber/current-wip.md)
24. [Fiber 链表结构](fiber/linked-list.md)
25. [alternate 指针机制](fiber/alternate.md)

---

### 第五部分：渲染器基础 (Renderer Basics)

26. [渲染器设计与职责](renderer/design.md)
27. [createRoot API 实现](renderer/create-root.md)
28. [FiberRoot 与 HostRoot](renderer/fiber-root.md)
29. [container 容器处理](renderer/container.md)
30. [初次渲染流程](renderer/initial-render.md)
31. [render 方法实现](renderer/render-method.md)

---

### 第六部分：Reconciler 协调器 (Reconciler)

32. [Reconciler 设计与职责](reconciler/design.md)
33. [beginWork 阶段详解](reconciler/begin-work.md)
34. [completeWork 阶段详解](reconciler/complete-work.md)
35. [workLoop 工作循环](reconciler/work-loop.md)
36. [performUnitOfWork 实现](reconciler/perform-unit-of-work.md)
37. [Fiber 遍历算法](reconciler/traversal.md)
38. [effectTag 标记系统](reconciler/effect-tag.md)

---

### 第七部分：Diff 算法实现 (Diff Algorithm)

39. [Diff 算法设计原则](diff/design.md)
40. [单节点 Diff](diff/single-node.md)
41. [多节点 Diff 算法](diff/multi-node.md)
42. [key 优化策略](diff/key-optimization.md)
43. [移动节点检测](diff/move-detection.md)
44. [列表 Diff 优化](diff/list-optimization.md)
45. [文本节点处理](diff/text-node.md)

---

### 第八部分：Commit 阶段 (Commit Phase)

46. [Commit 阶段概述](commit/overview.md)
47. [beforeMutation 阶段](commit/before-mutation.md)
48. [mutation 阶段](commit/mutation.md)
49. [layout 阶段](commit/layout.md)
50. [DOM 操作封装](commit/dom-operations.md)
51. [Placement 插入操作](commit/placement.md)
52. [Update 更新操作](commit/update.md)
53. [Deletion 删除操作](commit/deletion.md)

---

### 第九部分：函数组件 (Function Components)

54. [函数组件设计理念](function-component/design.md)
55. [函数组件 Fiber 处理](function-component/fiber-handling.md)
56. [renderWithHooks 流程](function-component/render-with-hooks.md)
57. [组件 props 处理](function-component/props.md)
58. [children 处理模式](function-component/children.md)
59. [组件重渲染机制](function-component/rerender.md)

---

### 第十部分：Hooks 基础架构 (Hooks Infrastructure)

60. [Hooks 设计理念](hooks/design.md)
61. [Hooks 链表结构](hooks/linked-list.md)
62. [currentlyRenderingFiber](hooks/currently-rendering.md)
63. [dispatcher 调度器](hooks/dispatcher.md)
64. [mountHooks 与 updateHooks](hooks/mount-update.md)
65. [Hooks 规则与实现原理](hooks/rules.md)

---

### 第十一部分：useState 实现 (useState)

66. [useState 设计与用法](use-state/design.md)
67. [mountState 实现](use-state/mount-state.md)
68. [updateState 实现](use-state/update-state.md)
69. [dispatchAction 触发更新](use-state/dispatch-action.md)
70. [Update 队列结构](use-state/update-queue.md)
71. [状态批量更新](use-state/batching.md)
72. [函数式更新](use-state/functional-update.md)

---

### 第十二部分：useReducer 实现 (useReducer)

73. [useReducer 设计与用法](use-reducer/design.md)
74. [mountReducer 实现](use-reducer/mount-reducer.md)
75. [updateReducer 实现](use-reducer/update-reducer.md)
76. [reducer 执行流程](use-reducer/execution.md)
77. [与 useState 的关系](use-reducer/vs-use-state.md)

---

### 第十三部分：useEffect 实现 (useEffect)

78. [useEffect 设计与用法](use-effect/design.md)
79. [Effect 数据结构](use-effect/effect-structure.md)
80. [mountEffect 实现](use-effect/mount-effect.md)
81. [updateEffect 实现](use-effect/update-effect.md)
82. [依赖比较算法](use-effect/deps-comparison.md)
83. [Effect 调度与执行](use-effect/scheduling.md)
84. [cleanup 清理函数](use-effect/cleanup.md)
85. [useLayoutEffect 实现](use-effect/use-layout-effect.md)

---

### 第十四部分：useRef 与性能优化 Hooks (useRef & Performance Hooks)

86. [useRef 设计与实现](use-ref/design.md)
87. [mountRef 与 updateRef](use-ref/mount-update.md)
88. [ref 对象持久性](use-ref/persistence.md)
89. [forwardRef 实现](use-ref/forward-ref.md)
90. [useImperativeHandle 实现](use-ref/use-imperative-handle.md)
91. [useMemo 设计与实现](use-memo/design.md)
92. [useCallback 实现](use-memo/use-callback.md)
93. [记忆化原理](use-memo/memoization.md)
94. [memo 高阶组件实现](use-memo/memo-hoc.md)

---

### 第十五部分：useContext 实现 (useContext)

95. [Context 设计理念](context/design.md)
96. [createContext 实现](context/create-context.md)
97. [Provider 组件实现](context/provider.md)
98. [useContext Hook 实现](context/use-context.md)
99. [Context 值传递机制](context/value-propagation.md)
100. [Context 变更检测](context/change-detection.md)

---

### 第十六部分：其他核心 Hooks (Other Hooks)

101. [useId 实现](other-hooks/use-id.md)
102. [useDebugValue 实现](other-hooks/use-debug-value.md)
103. [useSyncExternalStore 实现](other-hooks/use-sync-external-store.md)
104. [useInsertionEffect 实现](other-hooks/use-insertion-effect.md)
105. [自定义 Hook 设计模式](other-hooks/custom-hooks.md)

---

### 第十七部分：事件系统 (Event System)

106. [React 事件系统设计](events/design.md)
107. [事件委托机制](events/delegation.md)
108. [SyntheticEvent 合成事件](events/synthetic-event.md)
109. [事件注册与监听](events/registration.md)
110. [事件触发与分发](events/dispatch.md)
111. [事件池机制](events/pooling.md)
112. [事件优先级](events/priority.md)

---

### 第十八部分：调度系统 (Scheduler)

113. [Scheduler 设计理念](scheduler/design.md)
114. [优先级系统设计](scheduler/priority-system.md)
115. [Lane 模型基础](scheduler/lane-model.md)
116. [任务队列管理](scheduler/task-queue.md)
117. [时间切片 (Time Slicing)](scheduler/time-slicing.md)
118. [shouldYield 中断检测](scheduler/should-yield.md)
119. [MessageChannel 调度](scheduler/message-channel.md)
120. [requestIdleCallback 模拟](scheduler/idle-callback.md)

---

### 第十九部分：并发特性 (Concurrent Features)

121. [并发模式概述](concurrent/overview.md)
122. [useTransition 实现](concurrent/use-transition.md)
123. [useDeferredValue 实现](concurrent/use-deferred-value.md)
124. [startTransition API](concurrent/start-transition.md)
125. [Suspense 基础实现](concurrent/suspense.md)
126. [lazy 懒加载实现](concurrent/lazy.md)
127. [use Hook 实现](concurrent/use-hook.md)
128. [Offscreen 组件](concurrent/offscreen.md)

---

### 第二十部分：类组件兼容 (Class Components)

129. [Component 基类实现](class-component/component.md)
130. [PureComponent 实现](class-component/pure-component.md)
131. [setState 实现](class-component/set-state.md)
132. [生命周期方法](class-component/lifecycle.md)
133. [shouldComponentUpdate](class-component/should-update.md)
134. [错误边界 (Error Boundaries)](class-component/error-boundaries.md)

---

### 第二十一部分：完整实现与整合 (Complete Implementation)

135. [完整版 Mini-React 实现](complete/full-implementation.md)
136. [React.createElement API](complete/create-element-api.md)
137. [ReactDOM.createRoot API](complete/create-root-api.md)
138. [render 与 unmount](complete/render-unmount.md)
139. [与官方 React 对比分析](complete/comparison.md)
140. [性能优化策略](complete/performance.md)
141. [总结与进阶方向](complete/conclusion.md)

---

### 附录 (Appendix)

142. [React Hooks 完整列表](appendix/hooks-reference.md)
143. [Fiber 节点类型参考](appendix/fiber-types.md)
144. [effectTag 标记参考](appendix/effect-tags.md)
145. [Lane 优先级参考](appendix/lane-reference.md)
146. [React 内部常量](appendix/internal-constants.md)
147. [StrictMode 实现原理](appendix/strict-mode.md)
148. [Profiler 性能分析](appendix/profiler.md)
149. [调试技巧与工具](appendix/debugging.md)
150. [常见问题与解决方案](appendix/faq.md)
