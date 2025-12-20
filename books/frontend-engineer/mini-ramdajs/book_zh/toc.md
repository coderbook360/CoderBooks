# Ramda 设计与实现：深入 JavaScript 函数式编程

本书旨在为前端开发者打开函数式编程的大门。我们将从函数式编程的核心概念出发，深入剖析 Ramda 库中每个函数的实现细节，让你不仅能熟练运用 Ramda，更能深刻理解其背后的设计哲学与实现原理。

- [序言](preface.md)

---

### 第一部分：函数式编程基石 (Foundations of Functional Programming)

1. [初识函数式编程：从前端开发视角](foundations/intro-to-fp.md)
2. [纯函数与副作用：构建可靠代码的基石](foundations/pure-functions-and-side-effects.md)
3. [不可变性：Ramda 的数据操作哲学](foundations/immutability.md)
4. [Ramda 概览：函数优先与数据置后](foundations/ramda-overview.md)

---

### 第二部分：核心机制：柯里化与函数组合 (Core Mechanics: Currying and Composition)

5. [柯里化：Ramda 的“魔法”核心](core-mechanics/currying.md)
6. [深入 `curry` 实现：从 `_curry1` 到 `_curryN`](core-mechanics/curry-implementation.md)
7. [函数组合：构建声明式数据流](core-mechanics/function-composition.md)
8. [剖析 `compose` 与 `pipe`：组合函数的实现](core-mechanics/compose-pipe-implementation.md)

---

### 第三部分：列表操作：基础 (List Operations: Basics)

9. [遍历与转换：`map` 与 `forEach` 的实现](list-operations/map-and-foreach.md)
10. [筛选与查找：`filter`、`find` 与 `reject`](list-operations/filter-and-find.md)
11. [数据规约：`reduce` 的力量与实现](list-operations/reduce.md)
12. [列表切片：`slice`、`take` 与 `drop`](list-operations/slicing.md)
13. [列表变换：`adjust`、`update` 与 `insert`](list-operations/transforming.md)
14. [排序与去重：`sort` 与 `uniq`](list-operations/sorting-and-deduping.md)
15. [分组与聚合：`groupBy` 与 `countBy`](list-operations/grouping.md)

---

### 第四部分：对象操作 (Object Operations)

16. [属性访问：`prop`、`path` 与 `pick`](object-operations/property-access.md)
17. [对象更新与演进：`assoc`、`dissoc` 与 `evolve`](object-operations/updating-objects.md)
18. [对象合并：`merge` 与 `mergeDeep`](object-operations/merging.md)
19. [结构转换：`toPairs` 与 `fromPairs`](object-operations/structure-conversion.md)

---

### 第五部分：逻辑与流程控制 (Logic and Control Flow)

20. [条件逻辑：`ifElse` 与 `cond` 的函数式表达](logic-flow/conditional-logic.md)
21. [断言组合：构建复杂的逻辑过滤器](logic-flow/predicate-composition.md)
22. [布尔运算与比较：`and`、`or`、`not` 与 `equals`](logic-flow/boolean-and-comparison.md)

---

### 第六部分：Transducer 协议：高性能组合的秘密

23. [Transducer 思想：从数据流到操作流](transducers/intro-to-transducers.md)
24. [实现 `map` Transducer：改造 `map` 函数](transducers/map-transducer.md)
25. [Transducer 的组合与 `sequence` 实现](transducers/composition-and-sequence.md)

---

### 第七部分：Lenses：聚焦数据结构的任意部分

26. [Lenses 思想：函数式的 Getter/Setter](lenses/intro-to-lenses.md)
27. [深入 `lens`、`view`、`set` 与 `over` 的实现](lenses/lens-implementation.md)
28. [Lenses 的组合：深入嵌套数据](lenses/lens-composition.md)

---

### 第八部分：Ramda 内部架构揭秘

29. [架构概览：`internal` 目录的核心作用](internal-architecture/overview.md)
30. [核心工具剖析：`_curryN`, `_dispatchable`, `_xfrm`](internal-architecture/core-helpers.md)
31. [从内部函数到公共 API：`map` 的完整构建过程](internal-architecture/building-a-public-api.md)

---

### 第九部分：总结与展望

32. [函数式编程思维复盘](summary/fp-thinking-recap.md)
33. [从 Ramda 到你的函数式工具库](summary/building-your-own-library.md)
