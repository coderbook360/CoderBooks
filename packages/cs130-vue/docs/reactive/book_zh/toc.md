# Vue3 响应式系统源码深度解析

深入解析 Vue3 响应式系统的设计思想与源码实现。

- [序言](index.md)

---

### 第一部分：设计思想

1. [响应式编程概述](design/reactive-programming-overview.md)
2. [Vue 响应式的演进历程](design/vue-reactivity-evolution.md)
3. [Proxy vs Object.defineProperty](design/proxy-vs-define-property.md)
4. [响应式系统的设计目标](design/design-goals.md)
5. [核心概念：响应式对象](design/core-concept-reactive-object.md)
6. [核心概念：副作用函数](design/core-concept-effect.md)
7. [核心概念：依赖收集](design/core-concept-track.md)
8. [核心概念：触发更新](design/core-concept-trigger.md)
9. [依赖收集的数据结构设计](design/dependency-data-structure.md)
10. [调度器与批量更新](design/scheduler-batch-update.md)
11. [computed 的惰性求值设计](design/computed-lazy-evaluation.md)
12. [watch 的设计思路](design/watch-design.md)
13. [effectScope 作用域管理](design/effect-scope-design.md)
14. [customRef 自定义响应式](design/custom-ref-design.md)
15. [响应式系统的边界与限制](design/limitations-and-boundaries.md)
16. [与 MobX/Solid 等方案对比](design/comparison-with-others.md)
17. [设计权衡与取舍](design/design-tradeoffs.md)
18. [架构总览](design/architecture-overview.md)

---

### 第二部分：源码解析

#### 2.1 响应式核心

19. [源码结构与阅读指南](source/source-structure-guide.md)
20. [reactive 函数入口](source/reactive-entry.md)
21. [createReactiveObject 实现](source/create-reactive-object.md)
22. [baseHandlers：基础拦截器](source/base-handlers.md)
23. [get 拦截器详解](source/get-handler.md)
24. [set 拦截器详解](source/set-handler.md)
25. [has 和 deleteProperty 拦截器](source/has-delete-handlers.md)
26. [ownKeys 拦截器](source/own-keys-handler.md)
27. [collectionHandlers：集合拦截器](source/collection-handlers.md)
28. [Map/Set 的响应式处理](source/map-set-handlers.md)
29. [readonly 与 shallowReadonly](source/readonly-implementation.md)
30. [shallowReactive 实现](source/shallow-reactive.md)
31. [isReactive/isReadonly/isProxy](source/is-reactive-readonly.md)
32. [toRaw 与 markRaw](source/to-raw-mark-raw.md)

#### 2.2 Effect 系统

33. [effect 函数入口](source/effect-entry.md)
34. [ReactiveEffect 类](source/reactive-effect-class.md)
35. [activeEffect 与 effectStack](source/active-effect-stack.md)
36. [track 依赖收集](source/track-implementation.md)
37. [trigger 触发更新](source/trigger-implementation.md)
38. [triggerEffects 执行流程](source/trigger-effects-flow.md)
39. [依赖清理机制](source/dependency-cleanup.md)
40. [嵌套 effect 处理](source/nested-effect.md)
41. [stop 与 runner](source/stop-and-runner.md)
42. [调度器 scheduler 选项](source/scheduler-option.md)

#### 2.3 Ref 系统

43. [ref 函数入口](source/ref-entry.md)
44. [RefImpl 类实现](source/ref-impl-class.md)
45. [shallowRef 实现](source/shallow-ref.md)
46. [triggerRef 手动触发](source/trigger-ref.md)
47. [unref 与 isRef](source/unref-is-ref.md)
48. [toRef 与 toRefs](source/to-ref-to-refs.md)
49. [toValue 工具函数](source/to-value.md)
50. [proxyRefs 自动解包](source/proxy-refs.md)
51. [customRef 自定义 Ref](source/custom-ref.md)

#### 2.4 Computed 系统

52. [computed 函数入口](source/computed-entry.md)
53. [ComputedRefImpl 类](source/computed-ref-impl.md)
54. [computed 的脏值检查](source/computed-dirty-check.md)
55. [computed 的缓存机制](source/computed-cache.md)
56. [computed 的 getter/setter](source/computed-getter-setter.md)

#### 2.5 Watch 系统

57. [watch 函数入口](source/watch-entry.md)
58. [doWatch 核心实现](source/do-watch-implementation.md)
59. [watch 的 source 类型处理](source/watch-source-handling.md)
60. [watchEffect 实现](source/watch-effect-implementation.md)
61. [watchPostEffect 与 watchSyncEffect](source/watch-post-sync-effect.md)
62. [watch 的 flush 选项](source/watch-flush-options.md)
63. [watch 的 deep 选项](source/watch-deep-option.md)
64. [watch 的 immediate 选项](source/watch-immediate-option.md)
65. [watch 的 once 选项](source/watch-once-option.md)
66. [onCleanup 清理机制](source/watch-cleanup.md)

#### 2.6 EffectScope 系统

67. [effectScope 入口](source/effect-scope-entry.md)
68. [EffectScope 类实现](source/effect-scope-class.md)
69. [onScopeDispose 实现](source/on-scope-dispose.md)
70. [getCurrentScope 实现](source/get-current-scope.md)

#### 2.7 边界与优化

71. [边界情况处理](source/edge-cases.md)
72. [错误处理机制](source/error-handling.md)
73. [性能优化技巧](source/performance-optimizations.md)
74. [响应式调试 API](source/debug-apis.md)

#### 2.8 Vue 3.3+ 新增 API

75. [toValue 与 MaybeRefOrGetter](source/to-value-maybe-ref.md)
76. [响应式语法糖的设计与废弃](source/reactivity-transform.md)
77. [Shallow 系列 API 完整解析](source/shallow-apis-complete.md)