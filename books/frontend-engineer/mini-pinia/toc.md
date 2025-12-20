# Mini Pinia: Vue 3 状态管理源码深度解析

从零实现一个功能完备的状态管理库，深入理解 Pinia 的核心设计与实现原理。

- [序言](preface.md)

---

### 第一部分：基础准备 (Foundations)

1. [Pinia 概览与核心概念](foundations/overview.md)
2. [响应式系统回顾：ref、reactive、computed](foundations/reactivity-recap.md)
3. [effectScope 与依赖管理](foundations/effect-scope.md)
4. [Vue 3 插件机制与 provide/inject](foundations/plugin-system.md)
5. [搭建 Mini Pinia 开发环境](foundations/dev-environment.md)

---

### 第二部分：createPinia 核心实现 (createPinia Core)

6. [createPinia 函数解析](create-pinia/create-pinia.md)
7. [Pinia 实例结构设计](create-pinia/pinia-instance.md)
8. [Vue 插件安装：install 方法实现](create-pinia/install-method.md)
9. [全局状态树：state 的响应式实现](create-pinia/state-tree.md)
10. [activePinia 与上下文管理](create-pinia/active-pinia.md)

---

### 第三部分：defineStore 核心实现 (defineStore Core)

11. [defineStore 函数签名与重载](define-store/function-signature.md)
12. [Store ID 与唯一标识机制](define-store/store-id.md)
13. [useStore 函数生成逻辑](define-store/use-store.md)
14. [Store 注册与缓存机制](define-store/store-registry.md)

---

### 第四部分：Options Store 实现 (Options API Store)

15. [Options Store 配置结构](options-store/configuration.md)
16. [createOptionsStore 函数解析](options-store/create-options-store.md)
17. [State 初始化与响应式转换](options-store/state-initialization.md)
18. [Getters 实现：computed 的封装](options-store/getters-implementation.md)
19. [Actions 实现与 this 绑定](options-store/actions-implementation.md)

---

### 第五部分：Setup Store 实现 (Composition API Store)

20. [Setup Store 设计理念](setup-store/design-philosophy.md)
21. [createSetupStore 函数解析](setup-store/create-setup-store.md)
22. [状态识别：区分 State、Getter、Action](setup-store/state-identification.md)
23. [effectScope 在 Setup Store 中的应用](setup-store/effect-scope-usage.md)
24. [setup 函数执行与返回值处理](setup-store/setup-execution.md)

---

### 第六部分：订阅与状态变更系统 (Subscription and State Mutation)

25. [订阅系统架构设计](subscriptions/architecture.md)
26. [addSubscription 与 triggerSubscriptions](subscriptions/subscription-functions.md)
27. [MutationType 变更类型枚举](subscriptions/mutation-type.md)
28. [$subscribe 订阅状态变化](subscriptions/subscribe-method.md)
29. [$onAction 监听 Action 执行](subscriptions/on-action-method.md)
30. [$patch 方法：对象与函数两种模式](subscriptions/patch-method.md)
31. [mergeReactiveObjects 深度合并](subscriptions/merge-reactive-objects.md)

---

### 第七部分：Store 实例 API 实现 (Store Instance APIs)

32. [$state 属性实现](store-apis/state-property.md)
33. [$reset 方法与状态重置](store-apis/reset-method.md)
34. [$dispose 与资源清理](store-apis/dispose-method.md)
35. [$id 与内部属性](store-apis/internal-properties.md)

---

### 第八部分：插件系统 (Plugin System)

36. [插件系统设计理念](plugins/design-philosophy.md)
37. [pinia.use() 方法实现](plugins/use-method.md)
38. [PiniaPluginContext 上下文对象](plugins/plugin-context.md)
39. [插件扩展 Store 属性](plugins/extend-store.md)
40. [实战：实现持久化插件](plugins/persistence-plugin.md)

---

### 第九部分：辅助函数实现 (Helper Functions)

41. [storeToRefs 响应式解构](helpers/store-to-refs.md)
42. [mapHelpers：mapState 与 mapActions](helpers/map-helpers.md)
43. [isPlainObject 与工具函数](helpers/utility-functions.md)

---

### 第十部分：完整实现与总结 (Complete Implementation)

44. [Mini Pinia 完整实现](final/complete-implementation.md)
45. [与官方 Pinia 对比分析](final/comparison.md)
46. [总结与展望](final/conclusion.md)
