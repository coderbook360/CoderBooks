# Mini-Redux：从零实现状态管理核心原理

本书将带你从零开始，一步步实现一个功能完备的 Mini-Redux。通过源码级的深度剖析，你将彻底掌握 Store、Reducer、Action、Middleware 等状态管理核心原理。

- [序言](index.md)

---

### 第一部分：基础概念与设计理念 (Foundations)

1. [Redux 概览与设计哲学](foundations/overview.md)
2. [Flux 架构与单向数据流](foundations/flux-architecture.md)
3. [Redux 三大原则](foundations/three-principles.md)
4. [Redux 源码结构导读](foundations/source-structure.md)
5. [开发环境搭建与项目结构](foundations/dev-environment.md)

---

### 第二部分：核心概念实现 (Core Concepts)

6. [State 状态树设计](core/state-tree.md)
7. [Action 设计与规范](core/action.md)
8. [Action Creator 函数](core/action-creator.md)
9. [Reducer 纯函数设计](core/reducer.md)
10. [Reducer 组合模式](core/reducer-composition.md)
11. [不可变性原则与实现](core/immutability.md)

---

### 第三部分：createStore 实现 (createStore)

12. [createStore 函数设计](create-store/design.md)
13. [Store 数据结构](create-store/store-structure.md)
14. [getState 实现](create-store/get-state.md)
15. [dispatch 实现](create-store/dispatch.md)
16. [subscribe 订阅机制](create-store/subscribe.md)
17. [listeners 监听器管理](create-store/listeners.md)
18. [replaceReducer 实现](create-store/replace-reducer.md)
19. [observable 实现](create-store/observable.md)

---

### 第四部分：combineReducers 实现 (combineReducers)

20. [combineReducers 设计理念](combine-reducers/design.md)
21. [Reducer 拆分策略](combine-reducers/splitting.md)
22. [状态树结构映射](combine-reducers/state-mapping.md)
23. [combineReducers 核心实现](combine-reducers/implementation.md)
24. [状态变更检测](combine-reducers/change-detection.md)
25. [嵌套 combineReducers](combine-reducers/nested.md)

---

### 第五部分：Middleware 中间件系统 (Middleware)

26. [Middleware 设计理念](middleware/design.md)
27. [Middleware 签名与结构](middleware/signature.md)
28. [Middleware 洋葱模型](middleware/onion-model.md)
29. [applyMiddleware 实现](middleware/apply-middleware.md)
30. [compose 函数组合](middleware/compose.md)
31. [Middleware 执行流程](middleware/execution-flow.md)
32. [enhancer 增强器机制](middleware/enhancer.md)

---

### 第六部分：常用 Middleware 实现 (Middleware Implementations)

33. [redux-thunk 实现](middleware-impl/thunk.md)
34. [redux-promise 实现](middleware-impl/promise.md)
35. [redux-logger 实现](middleware-impl/logger.md)
36. [错误处理中间件](middleware-impl/error-handler.md)
37. [性能监控中间件](middleware-impl/performance.md)

---

### 第七部分：bindActionCreators 实现 (bindActionCreators)

38. [bindActionCreators 设计理念](bind-action-creators/design.md)
39. [单个 Action Creator 绑定](bind-action-creators/single.md)
40. [多个 Action Creator 绑定](bind-action-creators/multiple.md)
41. [bindActionCreators 核心实现](bind-action-creators/implementation.md)
42. [与组件 props 集成](bind-action-creators/props-integration.md)

---

### 第八部分：Selector 选择器 (Selectors)

43. [Selector 设计理念](selectors/design.md)
44. [基础 Selector 实现](selectors/basic.md)
45. [Selector 组合](selectors/composition.md)
46. [记忆化 Selector](selectors/memoization.md)
47. [createSelector 实现 (reselect)](selectors/create-selector.md)
48. [参数化 Selector](selectors/parameterized.md)

---

### 第九部分：React-Redux 绑定 (React-Redux)

49. [React-Redux 设计理念](react-redux/design.md)
50. [Provider 组件实现](react-redux/provider.md)
51. [Context 传递 Store](react-redux/context.md)
52. [connect 函数设计](react-redux/connect-design.md)
53. [mapStateToProps 实现](react-redux/map-state-to-props.md)
54. [mapDispatchToProps 实现](react-redux/map-dispatch-to-props.md)
55. [connect 高阶组件实现](react-redux/connect-hoc.md)
56. [useSelector Hook 实现](react-redux/use-selector.md)
57. [useDispatch Hook 实现](react-redux/use-dispatch.md)
58. [useStore Hook 实现](react-redux/use-store.md)
59. [性能优化策略](react-redux/performance.md)

---

### 第十部分：Redux Toolkit 核心 (Redux Toolkit)

60. [Redux Toolkit 设计理念](rtk/design.md)
61. [configureStore 实现](rtk/configure-store.md)
62. [createSlice 设计与实现](rtk/create-slice.md)
63. [createReducer 与 Immer](rtk/create-reducer.md)
64. [createAction 实现](rtk/create-action.md)
65. [createAsyncThunk 实现](rtk/create-async-thunk.md)
66. [createEntityAdapter 实现](rtk/create-entity-adapter.md)

---

### 第十一部分：异步状态管理 (Async State Management)

67. [异步 Action 设计模式](async/action-patterns.md)
68. [loading/error 状态处理](async/loading-error.md)
69. [请求生命周期管理](async/request-lifecycle.md)
70. [取消请求处理](async/cancellation.md)
71. [乐观更新策略](async/optimistic-update.md)
72. [请求去重与缓存](async/deduplication.md)

---

### 第十二部分：状态规范化 (State Normalization)

73. [状态规范化设计理念](normalization/design.md)
74. [实体与关系建模](normalization/entity-modeling.md)
75. [normalizr 原理解析](normalization/normalizr.md)
76. [规范化状态结构](normalization/normalized-structure.md)
77. [实体更新策略](normalization/entity-update.md)
78. [关系数据查询](normalization/relationship-query.md)

---

### 第十三部分：DevTools 集成 (DevTools)

79. [Redux DevTools 设计](devtools/design.md)
80. [Action 记录与回放](devtools/action-recording.md)
81. [时间旅行调试](devtools/time-travel.md)
82. [状态导入导出](devtools/state-import-export.md)
83. [DevTools 增强器实现](devtools/enhancer.md)

---

### 第十四部分：持久化与序列化 (Persistence)

84. [状态持久化设计](persistence/design.md)
85. [localStorage 存储](persistence/local-storage.md)
86. [状态序列化与反序列化](persistence/serialization.md)
87. [选择性持久化](persistence/selective.md)
88. [状态迁移策略](persistence/migration.md)

---

### 第十五部分：测试策略 (Testing)

89. [Redux 测试策略概述](testing/overview.md)
90. [Reducer 测试](testing/reducer.md)
91. [Action Creator 测试](testing/action-creator.md)
92. [Selector 测试](testing/selector.md)
93. [Middleware 测试](testing/middleware.md)
94. [集成测试策略](testing/integration.md)

---

### 第十六部分：完整实现与整合 (Complete Implementation)

95. [完整版 Mini-Redux 实现](complete/full-implementation.md)
96. [createStore 完整版](complete/create-store-full.md)
97. [combineReducers 完整版](complete/combine-reducers-full.md)
98. [applyMiddleware 完整版](complete/apply-middleware-full.md)
99. [React-Redux 完整版](complete/react-redux-full.md)
100. [与官方 Redux 对比分析](complete/comparison.md)
101. [性能优化策略](complete/performance.md)
102. [总结与进阶方向](complete/conclusion.md)

---

### 附录 (Appendix)

103. [Redux API 完整参考](appendix/api-reference.md)
104. [Redux Toolkit API 参考](appendix/rtk-api.md)
105. [React-Redux API 参考](appendix/react-redux-api.md)
106. [Middleware 签名参考](appendix/middleware-signature.md)
107. [常用 Action 命名规范](appendix/action-naming.md)
108. [状态结构设计模式](appendix/state-patterns.md)
109. [常见问题与解决方案](appendix/faq.md)
