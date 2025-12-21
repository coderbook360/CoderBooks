# 手写 Mini-RxJS：从零实现响应式编程库

通过亲手实现一个功能完备的响应式编程库，深入理解 RxJS 的核心设计思想与实现原理。

- [序言](index.md)

---

### 第一部分：起步——响应式编程基础

1. [项目初始化与环境搭建](setup.md)
2. [响应式编程思想入门](foundations/reactive-programming.md)
3. [Push 与 Pull 系统：理解数据流模型](foundations/push-pull-model.md)
4. [观察者模式与迭代器模式](foundations/observer-iterator-pattern.md)
5. [函数式编程基础：纯函数与组合](foundations/functional-programming.md)

---

### 第二部分：Observable 核心实现

6. [Observable 是什么：惰性推送集合](observable/what-is-observable.md)
7. [实现 Observable 类](observable/observable-class.md)
8. [subscribe 函数：连接生产者与消费者](observable/subscribe.md)
9. [Observable 契约：next、error、complete](observable/observable-contract.md)
10. [同步与异步 Observable](observable/sync-async.md)

---

### 第三部分：Observer 与 Subscriber

11. [Observer 接口设计](observer/observer-interface.md)
12. [实现 Subscriber 类](observer/subscriber-class.md)
13. [SafeSubscriber：安全的观察者包装](observer/safe-subscriber.md)
14. [Observer 的错误处理机制](observer/error-handling.md)

---

### 第四部分：Subscription 订阅管理

15. [Subscription 核心概念](subscription/subscription-concept.md)
16. [实现 Subscription 类](subscription/subscription-class.md)
17. [unsubscribe：资源清理与取消](subscription/unsubscribe.md)
18. [组合订阅：add 与 remove](subscription/composite-subscription.md)
19. [内存泄漏防护与最佳实践](subscription/memory-leak-prevention.md)

---

### 第五部分：操作符架构设计

20. [操作符是什么：Observable 到 Observable 的转换](operators/what-are-operators.md)
21. [Pipeable 操作符 vs 创建操作符](operators/pipeable-vs-creation.md)
22. [实现 pipe 方法](operators/pipe-implementation.md)
23. [操作符工厂函数设计模式](operators/operator-factory.md)
24. [自定义操作符开发指南](operators/custom-operators.md)

---

### 第六部分：创建操作符

25. [of：同步值发射](creation/of.md)
26. [from：从可迭代对象创建](creation/from.md)
27. [fromEvent：DOM 事件转 Observable](creation/from-event.md)
28. [fromPromise：Promise 转 Observable](creation/from-promise.md)
29. [interval 与 timer：定时器操作符](creation/interval-timer.md)
30. [defer：延迟创建 Observable](creation/defer.md)
31. [range：数值范围发射](creation/range.md)
32. [throwError 与 EMPTY](creation/throw-error-empty.md)

---

### 第七部分：转换操作符

33. [map：值映射](transformation/map.md)
34. [mapTo：映射为常量](transformation/map-to.md)
35. [pluck：属性提取](transformation/pluck.md)
36. [scan：累积器操作符](transformation/scan.md)
37. [reduce：归约操作符](transformation/reduce.md)
38. [buffer 与 bufferCount：值缓冲](transformation/buffer.md)
39. [toArray：收集为数组](transformation/to-array.md)
40. [pairwise：成对发射](transformation/pairwise.md)

---

### 第八部分：过滤操作符

41. [filter：条件过滤](filtering/filter.md)
42. [take 与 takeLast：取值限制](filtering/take.md)
43. [takeUntil 与 takeWhile：条件取值](filtering/take-until-while.md)
44. [skip 与 skipUntil：跳过值](filtering/skip.md)
45. [first 与 last：首尾取值](filtering/first-last.md)
46. [distinct 与 distinctUntilChanged：去重](filtering/distinct.md)
47. [debounceTime：防抖](filtering/debounce-time.md)
48. [throttleTime：节流](filtering/throttle-time.md)
49. [auditTime 与 sampleTime](filtering/audit-sample-time.md)
50. [elementAt 与 single](filtering/element-at-single.md)

---

### 第九部分：组合操作符

51. [merge：合并多个 Observable](combination/merge.md)
52. [concat：顺序连接](combination/concat.md)
53. [combineLatest：组合最新值](combination/combine-latest.md)
54. [zip：配对组合](combination/zip.md)
55. [forkJoin：并行执行等待完成](combination/fork-join.md)
56. [race：竞速](combination/race.md)
57. [startWith 与 endWith](combination/start-end-with.md)
58. [withLatestFrom：获取最新值](combination/with-latest-from.md)

---

### 第十部分：高阶 Observable 与扁平化

59. [理解高阶 Observable](higher-order/understanding-higher-order.md)
60. [mergeAll：并行订阅](higher-order/merge-all.md)
61. [concatAll：顺序订阅](higher-order/concat-all.md)
62. [switchAll：切换订阅](higher-order/switch-all.md)
63. [exhaustAll：忽略新订阅](higher-order/exhaust-all.md)
64. [mergeMap：映射并合并](higher-order/merge-map.md)
65. [concatMap：映射并连接](higher-order/concat-map.md)
66. [switchMap：映射并切换](higher-order/switch-map.md)
67. [exhaustMap：映射并忽略](higher-order/exhaust-map.md)

---

### 第十一部分：错误处理操作符

68. [catchError：捕获错误](error-handling/catch-error.md)
69. [retry 与 retryWhen：重试机制](error-handling/retry.md)
70. [finalize：最终清理](error-handling/finalize.md)
71. [throwIfEmpty：空值错误](error-handling/throw-if-empty.md)

---

### 第十二部分：工具操作符

72. [tap：副作用操作](utility/tap.md)
73. [delay 与 delayWhen：延迟发射](utility/delay.md)
74. [timeout 与 timeoutWith：超时处理](utility/timeout.md)
75. [observeOn 与 subscribeOn：调度控制](utility/observe-subscribe-on.md)
76. [materialize 与 dematerialize：通知对象化](utility/materialize.md)
77. [toArray：收集所有值](utility/to-array.md)

---

### 第十三部分：Subject 家族

78. [Subject：多播的核心](subjects/subject.md)
79. [BehaviorSubject：带初始值的 Subject](subjects/behavior-subject.md)
80. [ReplaySubject：重放历史值](subjects/replay-subject.md)
81. [AsyncSubject：只发射最后值](subjects/async-subject.md)
82. [Subject 与 Observable 的区别](subjects/subject-vs-observable.md)
83. [多播操作符：share 与 shareReplay](subjects/multicast-operators.md)

---

### 第十四部分：Scheduler 调度器

84. [Scheduler 核心概念](schedulers/scheduler-concept.md)
85. [实现 Scheduler 基类](schedulers/scheduler-class.md)
86. [asyncScheduler：异步调度](schedulers/async-scheduler.md)
87. [queueScheduler：队列调度](schedulers/queue-scheduler.md)
88. [asapScheduler：微任务调度](schedulers/asap-scheduler.md)
89. [animationFrameScheduler：动画帧调度](schedulers/animation-frame-scheduler.md)
90. [Scheduler 在操作符中的应用](schedulers/scheduler-in-operators.md)

---

### 第十五部分：测试与调试

91. [Marble 图解：可视化 Observable](testing/marble-diagrams.md)
92. [TestScheduler：时间控制测试](testing/test-scheduler.md)
93. [Marble 测试语法与实践](testing/marble-testing.md)
94. [调试技巧与常见问题排查](testing/debugging.md)

---

### 第十六部分：实战应用

95. [实现 HTTP 请求封装](practice/http-client.md)
96. [实现表单验证与自动保存](practice/form-validation.md)
97. [实现搜索自动补全](practice/autocomplete.md)
98. [实现无限滚动加载](practice/infinite-scroll.md)
99. [状态管理：简易 Redux 风格实现](practice/state-management.md)

---

### 第十七部分：工程化与发布

100. [完整 TypeScript 类型定义](engineering/type-definitions.md)
101. [泛型在 RxJS 中的应用](engineering/generics.md)
102. [单元测试策略](engineering/unit-testing.md)
103. [Tree-shaking 与模块设计](engineering/tree-shaking.md)
104. [npm 发布与文档](engineering/npm-publish.md)

---

### 附录

105. [Mini-RxJS 与 RxJS 源码对照](appendix/source-comparison.md)
106. [操作符分类速查表](appendix/operator-cheatsheet.md)
107. [Marble 图语法参考](appendix/marble-syntax.md)
108. [常见使用模式与最佳实践](appendix/best-practices.md)
