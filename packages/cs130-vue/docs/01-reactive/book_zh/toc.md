# 响应式系统: Vue3 响应式系统源码深度解析

- [序言](index.md)

---

### 第1部分：基础理论 (Fundamentals)

1. [响应式编程概述](design/reactive-programming-overview.md)
2. [Vue 响应式的演进历程](design/vue-reactivity-evolution.md)
3. [Proxy vs Object.defineProperty](design/proxy-vs-define-property.md)
4. [与 MobX/Solid 等方案对比](design/comparison-with-others.md)
5. [响应式系统的设计目标](design/design-goals.md)
6. [架构总览](design/architecture-overview.md)
7. [设计权衡与取舍](design/design-tradeoffs.md)
8. [响应式系统的边界与限制](design/limitations-and-boundaries.md)
9. [核心概念：响应式对象](design/core-concept-reactive-object.md)
10. [核心概念：副作用函数](design/core-concept-effect.md)
11. [核心概念：依赖收集](design/core-concept-track.md)
12. [核心概念：触发更新](design/core-concept-trigger.md)
13. [依赖收集的数据结构设计](design/dependency-data-structure.md)
14. [调度器与批量更新](design/scheduler-batch-update.md)

---

### 第2部分：响应式对象 (Reactive Objects)

15. [源码结构与阅读指南](source/source-structure-guide.md)
16. [reactive 函数入口](source/reactive-entry.md)
17. [createReactiveObject 实现](source/create-reactive-object.md)
18. [baseHandlers：基础拦截器](source/base-handlers.md)
19. [get 拦截器详解](source/get-handler.md)
20. [set 拦截器详解](source/set-handler.md)
21. [has 和 deleteProperty 拦截器](source/has-delete-handlers.md)
22. [ownKeys 拦截器](source/own-keys-handler.md)
23. [collectionHandlers：集合拦截器](source/collection-handlers.md)
24. [Map/Set 的响应式处理](source/map-set-handlers.md)
25. [readonly 与 shallowReadonly](source/readonly-implementation.md)
26. [shallowReactive 实现](source/shallow-reactive.md)
27. [isReactive/isReadonly/isProxy](source/is-reactive-readonly.md)
28. [toRaw 与 markRaw](source/to-raw-mark-raw.md)

---

### 第3部分：副作用系统 (Effect System)

29. [effect 函数入口](source/effect-entry.md)
30. [ReactiveEffect 类](source/reactive-effect-class.md)
31. [activeEffect 与 effectStack](source/active-effect-stack.md)
32. [track 依赖收集](source/track-implementation.md)
33. [trigger 触发更新](source/trigger-implementation.md)
34. [triggerEffects 执行流程](source/trigger-effects-flow.md)
35. [依赖清理机制](source/dependency-cleanup.md)
36. [嵌套 effect 处理](source/nested-effect.md)
37. [stop 与 runner](source/stop-and-runner.md)
38. [调度器 scheduler 选项](source/scheduler-option.md)

---

### 第4部分：引用系统 (Ref System)

39. [ref 函数入口](source/ref-entry.md)
40. [RefImpl 类实现](source/ref-impl-class.md)
41. [shallowRef 实现](source/shallow-ref.md)
42. [triggerRef 手动触发](source/trigger-ref.md)
43. [unref 与 isRef](source/unref-is-ref.md)
44. [toRef 与 toRefs](source/to-ref-to-refs.md)
45. [toValue 工具函数](source/to-value.md)
46. [proxyRefs 自动解包](source/proxy-refs.md)
47. [customRef 设计思路](design/custom-ref-design.md)
48. [customRef 实现解析](source/custom-ref.md)

---

### 第5部分：计算属性 (Computed)

49. [computed 设计思路](design/computed-lazy-evaluation.md)
50. [computed 函数入口](source/computed-entry.md)
51. [ComputedRefImpl 类](source/computed-ref-impl.md)
52. [computed 的脏值检查](source/computed-dirty-check.md)
53. [computed 的缓存机制](source/computed-cache.md)
54. [computed 的 getter/setter](source/computed-getter-setter.md)

---

### 第6部分：监听系统 (Watch System)

55. [watch 设计思路](design/watch-design.md)
56. [watch 函数入口](source/watch-entry.md)
57. [doWatch 核心实现](source/do-watch-implementation.md)
58. [watch 的 source 类型处理](source/watch-source-handling.md)
59. [watchEffect 实现](source/watch-effect-implementation.md)
60. [watchPostEffect 与 watchSyncEffect](source/watch-post-sync-effect.md)
61. [watch 的 flush 选项](source/watch-flush-options.md)
62. [watch 的 deep 选项](source/watch-deep-option.md)
63. [watch 的 immediate 选项](source/watch-immediate-option.md)
64. [watch 的 once 选项](source/watch-once-option.md)
65. [onCleanup 清理机制](source/watch-cleanup.md)

---

### 第七部分：作用域管理篇 (Scope Management)

66. [effectScope 设计思路](design/effect-scope-design.md)
67. [effectScope 入口](source/effect-scope-entry.md)
68. [EffectScope 类实现](source/effect-scope-class.md)
69. [onScopeDispose 实现](source/on-scope-dispose.md)
70. [getCurrentScope 实现](source/get-current-scope.md)

---

### 第八部分：优化与扩展篇 (Optimization & Extensions)

71. [边界情况处理](source/edge-cases.md)
72. [错误处理机制](source/error-handling.md)
73. [性能优化技巧](source/performance-optimizations.md)
74. [响应式调试 API](source/debug-apis.md)
75. [toValue 与 MaybeRefOrGetter](source/to-value-maybe-ref.md)
76. [响应式语法糖的设计与废弃](source/reactivity-transform.md)
77. [Shallow 系列 API 完整解析](source/shallow-apis-complete.md)