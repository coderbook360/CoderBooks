# Pinia 设计与实现

深入解析 Pinia 状态管理库的设计思想、源码实现与手写实践。

- [序言](index.md)

---

### 第一部分：设计思想

1. [状态管理发展历程](design/state-management-history.md)
2. [Flux 架构与 Redux](design/flux-and-redux.md)
3. [Vuex 的设计与局限](design/vuex-design-limitations.md)
4. [Pinia 设计目标](design/pinia-design-goals.md)
5. [Pinia vs Vuex 对比](design/pinia-vs-vuex.md)
6. [Composition API 风格设计](design/composition-api-style.md)
7. [Setup Store vs Options Store](design/setup-vs-options-store.md)
8. [TypeScript 类型推导设计](design/typescript-inference.md)
9. [模块化 Store 设计](design/modular-store-design.md)
10. [Store 组合与嵌套](design/store-composition-nesting.md)
11. [插件系统设计](design/plugin-system-design.md)
12. [DevTools 集成设计](design/devtools-integration.md)
13. [SSR 状态管理设计](design/ssr-state-management.md)
14. [设计权衡与取舍](design/design-tradeoffs.md)
15. [架构总览](design/architecture-overview.md)

---

### 第二部分：源码解析

#### 2.1 Pinia 核心创建

16. [源码结构与阅读指南](source/source-structure-guide.md)
17. [createPinia 入口分析](source/create-pinia-entry.md)
18. [Pinia 实例结构](source/pinia-instance-structure.md)
19. [setActivePinia 设置活跃实例](source/set-active-pinia.md)
20. [getActivePinia 获取活跃实例](source/get-active-pinia.md)

#### 2.2 Store 定义与创建

21. [defineStore 入口分析](source/define-store-entry.md)
22. [useStore 获取实例](source/use-store.md)
23. [createOptionsStore 选项式](source/create-options-store.md)
24. [createSetupStore 组合式](source/create-setup-store.md)
25. [buildStoreToUse 构建 Store](source/build-store-to-use.md)
26. [Store 代理与包装](source/store-proxy-wrapper.md)

#### 2.3 State 响应式

27. [State 响应式处理](source/state-reactive-handling.md)
28. [State 初始化流程](source/state-initialization.md)
29. [$state 属性访问](source/state-property-access.md)
30. [$patch 对象补丁](source/patch-object-implementation.md)
31. [$patch 函数补丁](source/patch-function-implementation.md)
32. [$reset 状态重置](source/reset-implementation.md)

#### 2.4 Getters 计算属性

33. [Getters 计算属性实现](source/getters-implementation.md)
34. [Getters 缓存机制](source/getters-caching.md)
35. [Getters 参数化设计](source/getters-with-arguments.md)
36. [访问其他 Store 的 Getters](source/cross-store-getters.md)

#### 2.5 Actions 方法处理

37. [Actions 方法处理](source/actions-implementation.md)
38. [Actions 异步处理](source/actions-async-handling.md)
39. [Actions 上下文绑定](source/actions-context-binding.md)
40. [访问其他 Store 的 Actions](source/cross-store-actions.md)

#### 2.6 订阅机制

41. [$subscribe 状态订阅](source/subscribe-implementation.md)
42. [订阅选项与配置](source/subscription-options.md)
43. [$onAction 动作订阅](source/on-action-implementation.md)
44. [onAction 回调参数](source/on-action-callback-args.md)
45. [$dispose 销毁处理](source/dispose-implementation.md)
46. [订阅清理机制](source/subscription-cleanup.md)

#### 2.7 辅助函数

47. [storeToRefs 实现](source/store-to-refs.md)
48. [mapStores 辅助函数](source/map-stores.md)
49. [mapState 辅助函数](source/map-state.md)
50. [mapGetters 辅助函数](source/map-getters.md)
51. [mapActions 辅助函数](source/map-actions.md)
52. [mapWritableState 辅助函数](source/map-writable-state.md)

#### 2.8 插件与扩展

53. [插件机制实现](source/plugin-mechanism.md)
54. [插件上下文对象](source/plugin-context.md)
55. [插件 $subscribe 扩展](source/plugin-subscribe-extension.md)
56. [持久化插件分析](source/persistence-plugin.md)
57. [DevTools 集成实现](source/devtools-implementation.md)
58. [热更新支持](source/hot-module-replacement.md)

#### 2.9 SSR 支持

59. [SSR 支持总览](source/ssr-support.md)
60. [SSR 状态序列化](source/ssr-state-serialization.md)
61. [SSR 状态水合](source/ssr-state-hydration.md)

---

### 第三部分：Mini 实现

62. [项目架构设计](mini/project-architecture.md)
63. [接口定义与类型](mini/interface-definitions.md)
64. [实现 createPinia](mini/implement-create-pinia.md)
65. [实现 defineStore](mini/implement-define-store.md)
66. [实现 useStore](mini/implement-use-store.md)
67. [实现 Options Store](mini/implement-options-store.md)
68. [实现 Setup Store](mini/implement-setup-store.md)
69. [实现 State 响应式](mini/implement-state-reactive.md)
70. [实现 Getters](mini/implement-getters.md)
71. [实现 Actions](mini/implement-actions.md)
72. [实现 $patch](mini/implement-patch.md)
73. [实现 $reset](mini/implement-reset.md)
74. [实现 $subscribe](mini/implement-subscribe.md)
75. [实现 $onAction](mini/implement-on-action.md)
76. [实现 storeToRefs](mini/implement-store-to-refs.md)
77. [实现插件系统](mini/implement-plugin-system.md)
78. [单元测试设计](mini/unit-testing.md)
79. [测试用例实现](mini/test-cases.md)
80. [总结与回顾](mini/summary-and-review.md)
