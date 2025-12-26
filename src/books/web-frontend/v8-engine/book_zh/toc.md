# V8 引擎深度解析：理解 JavaScript 底层运行机制

本书将带你深入 V8 引擎，从前端开发者的视角理解 JavaScript 代码的底层运行机制。我们不是为了研究 V8 源码而学习，而是通过 V8 的实现来解答你在日常开发中的困惑：为什么这样写代码更快？闭包是如何存储的？异步任务是如何调度的？

- [序言](preface.md)

---

### 第一部分：V8 架构与 JavaScript 执行流程

1. [V8 引擎概览：从源码到机器码的旅程](foundations/v8-overview.md)
2. [JavaScript 代码的解析过程：词法分析与语法分析](foundations/parsing-process.md)
3. [抽象语法树（AST）：代码的结构化表示](foundations/ast-structure.md)
4. [字节码与解释器：Ignition 的工作原理](foundations/bytecode-interpreter.md)
5. [即时编译（JIT）：从解释执行到机器码](foundations/jit-compilation.md)

---

### 第二部分：JavaScript 基本类型的底层实现

6. [V8 中的值表示：Tagged Pointer 与 Smi](types/tagged-pointer-smi.md)
7. [基本类型的存储：Number、String、Boolean](types/basic-types-storage.md)
8. [类型转换与运算符：ToPrimitive 与隐式转换机制](types/type-conversion.md)
9. [字符串的内部表示：编码方式与优化策略](types/string-representation.md)
10. [JSON 解析与序列化：高性能数据处理](types/json-processing.md)
11. [对象的内存结构：属性存储与快慢属性](types/object-memory-structure.md)
12. [隐藏类（Hidden Class）：对象结构的优化基础](types/hidden-class.md)
13. [数组的特殊处理：Elements Kind 与数组优化](types/array-optimization.md)
14. [函数对象：代码、作用域与上下文](types/function-object.md)

---

### 第三部分：高级类型与数据结构

15. [属性描述符：对象属性的完整控制](advanced-types/property-descriptors.md)
16. [访问器属性：getter 与 setter 的底层机制](advanced-types/accessor-properties.md)
17. [对象不可变性：freeze、seal 与 preventExtensions](advanced-types/object-immutability.md)
18. [Map 与 Set：哈希表的底层实现](advanced-types/map-set.md)
19. [WeakMap 与 WeakSet：弱引用集合的特殊处理](advanced-types/weakmap-weakset.md)
20. [BigInt：任意精度整数的实现](advanced-types/bigint.md)
21. [类与继承：ES6 Class 的底层转换](advanced-types/class-inheritance.md)
22. [ArrayBuffer 与 TypedArray：二进制数据处理](advanced-types/arraybuffer-typedarray.md)
23. [迭代器与生成器：Iterator 协议与状态机](advanced-types/iterator-generator.md)

---

### 第四部分：模块系统与作用域机制

24. [ESM 模块系统：加载、解析与执行](modules/esm-system.md)
25. [模块作用域：import/export 的底层实现](modules/module-scope.md)
26. [循环依赖：模块间依赖的处理机制](modules/circular-dependency.md)

---

### 第五部分：执行上下文与作用域链

27. [执行上下文：JavaScript 代码的运行环境](execution/execution-context.md)
28. [作用域链：变量查找的底层机制](execution/scope-chain.md)
29. [闭包的底层实现：Context 对象与变量捕获](execution/closure-implementation.md)
30. [this 绑定：执行上下文中的接收者](execution/this-binding.md)
31. [词法环境与变量环境：let/const 与 var 的区别](execution/lexical-environment.md)
32. [new 操作符：对象创建与构造函数调用](execution/new-operator.md)
33. [严格模式：底层实现与性能影响](execution/strict-mode.md)
34. [with 与 eval：动态作用域的性能代价](execution/with-eval.md)

---

### 第六部分：内存管理与垃圾回收

35. [V8 的堆结构：新生代与老生代](memory/heap-structure.md)
36. [垃圾回收概览：V8 的分代回收策略](memory/gc-overview.md)
37. [Scavenge 算法：新生代的快速回收](memory/gc-scavenge.md)
38. [Mark-Sweep-Compact：老生代的垃圾回收](memory/gc-mark-sweep-compact.md)
39. [增量标记与并发回收：Orinoco GC](memory/incremental-gc.md)
40. [内存对齐与填充：对象布局优化](memory/memory-alignment.md)
41. [内存泄漏的常见场景与分析方法](memory/memory-leaks.md)
42. [内存快照分析：Heap Snapshot 的使用](memory/heap-snapshot.md)
43. [FinalizationRegistry：弱引用与清理回调](memory/finalization-registry.md)

---

### 第七部分：性能优化与内联缓存

44. [内联缓存（IC）：属性访问的加速器](optimization/inline-cache.md)
45. [单态、多态与超态：对象形状的影响](optimization/ic-states.md)
46. [TurboFan 编译器：激进的优化策略](optimization/turbofan-compiler.md)
47. [去优化（Deoptimization）：当优化失效时](optimization/deoptimization.md)
48. [内联函数：调用栈的优化](optimization/function-inlining.md)
49. [尾调用优化：递归性能提升策略](optimization/tail-call-optimization.md)
50. [V8友好代码：基础优化原则](optimization/v8-friendly-code-basics.md)
51. [V8友好代码：高级优化技巧](optimization/v8-friendly-code-advanced.md)
52. [V8友好代码：优化检查清单与工具](optimization/v8-friendly-code-checklist.md)

---

### 第八部分：异步机制与事件循环

53. [事件循环的底层实现：宏任务与微任务](async/event-loop.md)
54. [Promise 的内部机制：PromiseJobs 与微任务队列](async/promise-internals.md)
55. [async/await 的底层转换：生成器与状态机](async/async-await.md)
56. [定时器的实现：setTimeout 与 setInterval](async/timers.md)
57. [异步迭代器：for await...of 的实现](async/async-iterator.md)
58. [Node.js 中的事件循环：libuv 与 V8 的协作](async/nodejs-event-loop.md)

---

### 第九部分：错误处理与调试机制

59. [Error 对象与堆栈跟踪：错误信息的生成](debugging/error-stack-trace.md)
60. [try...catch 的性能影响：异常处理的代价](debugging/try-catch-performance.md)
61. [Source Map：源码映射的原理](debugging/source-map.md)
62. [调试协议：Chrome DevTools 与 V8 的通信](debugging/debug-protocol.md)

---

### 第十部分：高级主题与实战应用

63. [原型链的底层实现：__proto__ 与 prototype](advanced/prototype-chain.md)
64. [Proxy 与 Reflect：元编程的底层支持](advanced/proxy-reflect.md)
65. [Symbol 的内部实现：唯一标识符与内置 Symbol](advanced/symbol.md)
66. [正则表达式引擎：Irregexp 的实现原理](advanced/regexp-engine.md)
67. [WebAssembly 集成：JS 与 WASM 的互操作](advanced/wasm-integration.md)
68. [SharedArrayBuffer 与 Atomics：共享内存与原子操作](advanced/shared-arraybuffer.md)
69. [Realm 与多全局对象：iframe 中的隔离机制](advanced/realm-isolation.md)
70. [性能分析工具：Chrome DevTools 性能面板深度使用](advanced/devtools-performance.md)
71. [V8 命令行工具：d8 与性能调试](advanced/v8-d8-tool.md)
72. [实战案例：定位并解决性能瓶颈](advanced/case-performance-bottleneck.md)
73. [实战案例：内存泄漏的排查与修复](advanced/case-memory-leak.md)
