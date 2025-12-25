# 设计原则与 TypeScript 类型系统

掌握软件设计的核心原则，精通 TypeScript 高级类型技巧，为架构设计打下坚实基础。

- [序言](index.md)

---

### 第一部分：架构思维基础

1. [什么是代码架构：前端视角的理解](foundations/what-is-code-architecture.md)
2. [好代码的标准：可读性、可维护性与可扩展性](foundations/good-code-standards.md)
3. [软件复杂度的本质与应对策略](foundations/software-complexity.md)
4. [代码质量的度量与评估](foundations/code-quality-metrics.md)

---

### 第二部分：SOLID 原则深度解析

5. [SOLID 原则概述：为什么需要设计原则](solid/solid-overview.md)
6. [单一职责原则 (SRP)：职责的定义与边界](solid/srp-principle.md)
7. [SRP 实战：组件、Hooks 与服务的职责划分](solid/srp-practice.md)
8. [开闭原则 (OCP)：面向扩展开放的设计](solid/ocp-principle.md)
9. [OCP 实战：插件化与策略模式的应用](solid/ocp-practice.md)
10. [里氏替换原则 (LSP)：继承的正确使用](solid/lsp-principle.md)
11. [LSP 实战：组件继承与接口设计](solid/lsp-practice.md)
12. [接口隔离原则 (ISP)：API 设计的精细化](solid/isp-principle.md)
13. [ISP 实战：Props 设计与接口拆分](solid/isp-practice.md)
14. [依赖倒置原则 (DIP)：解耦的核心思想](solid/dip-principle.md)
15. [DIP 实战：依赖注入在前端的实现](solid/dip-practice.md)

---

### 第三部分：实用主义设计原则

16. [DRY 原则：重复的识别与消除策略](pragmatic/dry-principle.md)
17. [DRY 的边界：何时重复是合理的](pragmatic/dry-boundaries.md)
18. [KISS 原则：简单性的价值与实践](pragmatic/kiss-principle.md)
19. [YAGNI 原则：克制过度设计的冲动](pragmatic/yagni-principle.md)
20. [关注点分离：代码职责的边界划分](pragmatic/separation-of-concerns.md)
21. [高内聚低耦合：模块设计的核心准则](pragmatic/cohesion-coupling.md)
22. [最小知识原则：减少模块间的依赖](pragmatic/law-of-demeter.md)
23. [组合优于继承：灵活性的选择](pragmatic/composition-over-inheritance.md)

---

### 第四部分：TypeScript 类型系统基础

24. [TypeScript 类型系统概览](typescript/type-system-overview.md)
25. [基础类型与类型注解](typescript/basic-types.md)
26. [接口与类型别名的选择](typescript/interface-vs-type.md)
27. [联合类型与交叉类型](typescript/union-intersection.md)
28. [字面量类型与类型收窄](typescript/literal-narrowing.md)
29. [类型守卫：运行时类型检查](typescript/type-guards.md)
30. [never 类型与穷尽性检查](typescript/never-exhaustive.md)

---

### 第五部分：TypeScript 泛型编程

31. [泛型基础：类型的参数化](generics/generics-basics.md)
32. [泛型约束：限制类型参数的范围](generics/generic-constraints.md)
33. [泛型默认值与可选泛型](generics/generic-defaults.md)
34. [泛型函数与泛型类](generics/generic-functions-classes.md)
35. [泛型工具类型：Partial、Required、Pick](generics/utility-types-1.md)
36. [泛型工具类型：Omit、Record、Exclude](generics/utility-types-2.md)
37. [自定义工具类型设计](generics/custom-utility-types.md)

---

### 第六部分：TypeScript 高级类型

38. [条件类型基础：类型的 if-else](advanced/conditional-basics.md)
39. [条件类型与 infer 关键字](advanced/conditional-infer.md)
40. [分布式条件类型](advanced/distributive-conditional.md)
41. [映射类型：批量转换类型](advanced/mapped-types.md)
42. [映射类型修饰符：readonly 与可选](advanced/mapped-modifiers.md)
43. [模板字面量类型](advanced/template-literal-types.md)
44. [递归类型与类型递归限制](advanced/recursive-types.md)
45. [类型体操实战：深度 Readonly](advanced/deep-readonly.md)
46. [类型体操实战：路径类型提取](advanced/path-types.md)

---

### 第七部分：类型安全的架构设计

47. [类型驱动开发 (TDD with Types)](type-safe/type-driven-development.md)
48. [类型安全的 API 设计](type-safe/type-safe-api.md)
49. [类型安全的事件系统](type-safe/type-safe-events.md)
50. [类型安全的状态管理](type-safe/type-safe-state.md)
51. [类型安全的路由设计](type-safe/type-safe-routing.md)
52. [运行时类型检查：Zod 与 io-ts](type-safe/runtime-validation.md)
53. [类型与 Schema 的统一](type-safe/type-schema-sync.md)

---

### 第八部分：实战与总结

54. [实战：类型安全的 HTTP 客户端](practice/type-safe-http-client.md)
55. [实战：类型安全的表单系统](practice/type-safe-forms.md)
56. [实战：类型安全的配置系统](practice/type-safe-config.md)
57. [TypeScript 编译配置最佳实践](practice/tsconfig-best-practices.md)
58. [总结：设计原则与类型系统的融合](practice/principles-types-integration.md)
