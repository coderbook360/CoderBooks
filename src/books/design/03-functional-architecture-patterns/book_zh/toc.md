# 函数式编程与架构模式

掌握函数式编程核心思想，深入理解前端架构模式的演进与选择。

- [序言](index.md)

---

### 第一部分：函数式编程基础

1. [函数式编程概述：范式与思维方式](fp-basics/fp-overview.md)
2. [纯函数：无副作用的计算](fp-basics/pure-functions.md)
3. [不可变性：数据的安全保障](fp-basics/immutability.md)
4. [Immutable.js 与 Immer 对比](fp-basics/immutable-libraries.md)
5. [一等函数：函数作为值](fp-basics/first-class-functions.md)
6. [高阶函数：函数的抽象与复用](fp-basics/higher-order-functions.md)
7. [闭包与作用域链](fp-basics/closures-scope.md)

---

### 第二部分：函数式高级技术

8. [柯里化：参数的分步传递](fp-advanced/currying.md)
9. [偏应用：固定部分参数](fp-advanced/partial-application.md)
10. [函数组合：compose 与 pipe](fp-advanced/function-composition.md)
11. [Point-Free 风格](fp-advanced/point-free.md)
12. [惰性求值与惰性序列](fp-advanced/lazy-evaluation.md)
13. [递归与尾调用优化](fp-advanced/recursion-tail-call.md)
14. [Transducer：高效的数据转换](fp-advanced/transducers.md)

---

### 第三部分：函数式抽象

15. [Functor：可映射的容器](fp-abstractions/functor.md)
16. [Applicative Functor](fp-abstractions/applicative.md)
17. [Monad：可链式操作的容器](fp-abstractions/monad.md)
18. [Maybe Monad：空值的优雅处理](fp-abstractions/maybe-monad.md)
19. [Either Monad：错误处理的函数式方案](fp-abstractions/either-monad.md)
20. [IO Monad：副作用的隔离](fp-abstractions/io-monad.md)
21. [Task/Future：异步的函数式处理](fp-abstractions/task-future.md)
22. [Lens：不可变数据的优雅操作](fp-abstractions/lens-optics.md)
23. [fp-ts 库实战](fp-abstractions/fp-ts-practice.md)

---

### 第四部分：架构模式演进

24. [前端架构的演进历程](architecture-evolution/evolution-history.md)
25. [MVC 模式：经典的三层分离](architecture-evolution/mvc-pattern.md)
26. [MVP 模式：视图与逻辑的解耦](architecture-evolution/mvp-pattern.md)
27. [MVVM 模式：数据绑定的理念](architecture-evolution/mvvm-pattern.md)
28. [MVC vs MVP vs MVVM 对比分析](architecture-evolution/mvc-mvp-mvvm-comparison.md)

---

### 第五部分：单向数据流架构

29. [Flux 架构：单向数据流的起源](unidirectional/flux-architecture.md)
30. [Redux 核心概念详解](unidirectional/redux-concepts.md)
31. [Redux 源码解析](unidirectional/redux-source-code.md)
32. [Redux 中间件原理](unidirectional/redux-middleware.md)
33. [Redux Toolkit 最佳实践](unidirectional/redux-toolkit.md)
34. [Redux 异步方案对比：Thunk vs Saga vs Observable](unidirectional/redux-async-comparison.md)

---

### 第六部分：响应式架构

35. [响应式编程概述](reactive/reactive-overview.md)
36. [MobX 核心原理](reactive/mobx-principles.md)
37. [MobX 源码解析：响应式系统](reactive/mobx-source-code.md)
38. [RxJS 基础：Observable 与 Operator](reactive/rxjs-basics.md)
39. [RxJS 操作符分类详解](reactive/rxjs-operators.md)
40. [RxJS 实战：复杂异步场景](reactive/rxjs-practice.md)
41. [响应式状态管理对比](reactive/reactive-state-comparison.md)

---

### 第七部分：现代状态管理

42. [Zustand 设计理念与实现](modern-state/zustand-design.md)
43. [Jotai 原子化状态管理](modern-state/jotai-atomic.md)
44. [Recoil 数据流图模型](modern-state/recoil-data-flow.md)
45. [Valtio 代理状态管理](modern-state/valtio-proxy.md)
46. [状态管理方案选型决策](modern-state/selection-guide.md)

---

### 第八部分：高级架构模式

47. [Clean Architecture 概述](advanced-patterns/clean-architecture-overview.md)
48. [Clean Architecture 在前端的实践](advanced-patterns/clean-architecture-frontend.md)
49. [领域驱动设计 (DDD) 核心概念](advanced-patterns/ddd-concepts.md)
50. [DDD 战略设计：限界上下文](advanced-patterns/ddd-bounded-context.md)
51. [DDD 战术设计：实体、值对象、聚合](advanced-patterns/ddd-tactical.md)
52. [DDD 在前端的落地实践](advanced-patterns/ddd-frontend-practice.md)
53. [CQRS 模式：读写分离](advanced-patterns/cqrs-pattern.md)
54. [Event Sourcing：事件溯源](advanced-patterns/event-sourcing.md)

---

### 第九部分：代码组织与模块化

55. [目录结构设计原则](code-organization/directory-principles.md)
56. [按功能组织 vs 按层次组织](code-organization/feature-vs-layer.md)
57. [领域驱动的目录结构](code-organization/domain-driven-structure.md)
58. [模块的内聚性与耦合性](code-organization/module-cohesion-coupling.md)
59. [模块边界与接口设计](code-organization/module-boundaries.md)
60. [依赖注入原理](code-organization/di-principles.md)
61. [依赖注入容器实现](code-organization/di-container.md)
62. [InversifyJS 实战](code-organization/inversify-practice.md)
63. [分层架构设计](code-organization/layered-architecture.md)
64. [六边形架构在前端的应用](code-organization/hexagonal-architecture.md)

---

### 第十部分：架构演进与实战

65. [架构演进的时机与策略](evolution/architecture-evolution-timing.md)
66. [渐进式架构迁移](evolution/progressive-migration.md)
67. [Strangler Fig 模式](evolution/strangler-pattern.md)
68. [实战：从 MVC 到 Clean Architecture](practice/mvc-to-clean.md)
69. [实战：企业级应用架构设计](practice/enterprise-architecture.md)
70. [总结：选择适合的架构模式](practice/choosing-architecture.md)
