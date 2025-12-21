# Mini-Pinia：从零实现 Vue 状态管理库

本书将带你从零开始，一步步实现一个完整的 Pinia 状态管理库。通过源码级的深度剖析，你将彻底掌握 Vue 官方状态管理方案的核心原理与设计哲学。

- [序言](index.md)

---

### 第一部分：基础准备 (Foundations)

1. [Pinia 概览与核心概念](foundations/overview.md)
2. [Vue 3 响应式系统回顾](foundations/reactivity-recap.md)
3. [effectScope 原理与应用](foundations/effect-scope.md)
4. [Pinia 插件架构概述](foundations/plugin-system.md)
5. [开发环境搭建与项目结构](foundations/dev-environment.md)
6. [Pinia 源码结构导读](foundations/source-structure.md)

---

### 第二部分：createPinia 实现 (Create Pinia)

7. [createPinia 函数设计](create-pinia/create-pinia.md)
8. [Pinia 实例数据结构](create-pinia/pinia-instance.md)
9. [全局状态树管理](create-pinia/state-tree.md)
10. [install 方法与 Vue 集成](create-pinia/install-method.md)
11. [activePinia 与上下文注入](create-pinia/active-pinia.md)
12. [setActivePinia 与 getActivePinia](create-pinia/active-pinia-helpers.md)

---

### 第三部分：defineStore 核心 (Define Store Core)

13. [defineStore 函数签名解析](define-store/function-signature.md)
14. [Store ID 与唯一标识机制](define-store/store-id.md)
15. [Store 注册表设计](define-store/store-registry.md)
16. [useStore 函数实现](define-store/use-store.md)
17. [Store 缓存与复用机制](define-store/store-cache.md)
18. [热更新支持](define-store/hot-update.md)

---

### 第四部分：Options Store 实现 (Options Store)

19. [Options Store 设计理念](options-store/design-philosophy.md)
20. [createOptionsStore 函数实现](options-store/create-options-store.md)
21. [State 初始化与响应式处理](options-store/state-initialization.md)
22. [Getters 实现：计算属性封装](options-store/getters-implementation.md)
23. [Getters 相互访问与依赖](options-store/getters-dependencies.md)
24. [Actions 实现：方法绑定与上下文](options-store/actions-implementation.md)
25. [Actions 异步处理与错误捕获](options-store/actions-async.md)
26. [Options Store 配置选项](options-store/configuration.md)

---

### 第五部分：Setup Store 实现 (Setup Store)

27. [Setup Store 设计理念](setup-store/design-philosophy.md)
28. [createSetupStore 函数实现](setup-store/create-setup-store.md)
29. [Setup 函数执行与返回值处理](setup-store/setup-execution.md)
30. [effectScope 在 Store 中的应用](setup-store/effect-scope-usage.md)
31. [State 自动识别与提取](setup-store/state-identification.md)
32. [ref vs reactive 状态识别](setup-store/ref-vs-reactive.md)
33. [computed 与 Getters 对应关系](setup-store/computed-getters.md)

---

### 第六部分：Store API 实现 (Store API)

34. [$id 属性与 Store 标识](store-api/id-property.md)
35. [$state 属性实现](store-api/state-property.md)
36. [$reset 方法实现](store-api/reset-method.md)
37. [$dispose 方法实现](store-api/dispose-method.md)
38. [Store 内部属性设计](store-api/internal-properties.md)
39. [_customProperties 与调试支持](store-api/custom-properties.md)

---

### 第七部分：状态变更与订阅 (State Mutations & Subscriptions)

40. [订阅系统架构设计](subscriptions/architecture.md)
41. [$patch 实现：对象模式](subscriptions/patch-object.md)
42. [$patch 实现：函数模式](subscriptions/patch-function.md)
43. [MutationType 类型定义](subscriptions/mutation-types.md)
44. [$subscribe 实现：状态变更监听](subscriptions/subscribe-implementation.md)
45. [订阅选项：flush 与 detached](subscriptions/subscribe-options.md)
46. [$onAction 实现：Action 生命周期](subscriptions/on-action-implementation.md)
47. [after 与 onError 回调处理](subscriptions/action-callbacks.md)
48. [mergeReactiveObjects 工具函数](subscriptions/merge-reactive-objects.md)
49. [订阅函数管理与清理](subscriptions/subscription-functions.md)

---

### 第八部分：辅助函数 (Helper Functions)

50. [storeToRefs 实现：响应式解构](helpers/store-to-refs.md)
51. [mapStores 实现：Store 映射](helpers/map-stores.md)
52. [mapState 实现：状态映射](helpers/map-state.md)
53. [mapWritableState 实现：可写状态映射](helpers/map-writable-state.md)
54. [mapActions 实现：Action 映射](helpers/map-actions.md)
55. [mapGetters 别名处理](helpers/map-getters.md)
56. [工具函数集](helpers/utility-functions.md)

---

### 第九部分：跨 Store 协作 (Cross-Store Collaboration)

57. [Store 间的依赖关系](cross-store/dependencies.md)
58. [在 Actions 中访问其他 Store](cross-store/access-in-actions.md)
59. [在 Getters 中访问其他 Store](cross-store/access-in-getters.md)
60. [循环依赖问题与解决方案](cross-store/circular-dependencies.md)
61. [组合 Store 模式](cross-store/composing-stores.md)

---

### 第十部分：插件系统 (Plugin System)

62. [插件系统设计理念](plugins/design-philosophy.md)
63. [PiniaPluginContext 上下文对象](plugins/plugin-context.md)
64. [pinia.use() 实现](plugins/use-implementation.md)
65. [插件扩展 Store 机制](plugins/extend-store.md)
66. [插件添加新 State](plugins/add-state.md)
67. [插件添加新 Options](plugins/add-options.md)
68. [实战：持久化存储插件](plugins/persistence-plugin.md)
69. [实战：日志记录插件](plugins/logging-plugin.md)

---

### 第十一部分：完整实现与整合 (Complete Implementation)

70. [完整版 Mini-Pinia 实现](complete/full-implementation.md)
71. [与官方 Pinia 对比分析](complete/comparison.md)
72. [性能考量与优化策略](complete/performance.md)
73. [总结与进阶方向](complete/conclusion.md)

---
