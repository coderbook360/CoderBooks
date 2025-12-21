# Node.js核心原理深度解析: 从运行时到底层机制

本书深入剖析Node.js运行时的核心原理，帮助你真正理解事件循环、V8引擎、libuv、模块系统等底层机制。

- [序言](preface.md)

---

### 第一部分：Node.js基础与架构

1. [Node.js发展历史与版本演进](foundations/history.md)
2. [Node.js架构概览](foundations/architecture.md)
3. [V8引擎在Node.js中的角色](foundations/v8-role.md)
4. [libuv跨平台抽象层](foundations/libuv-overview.md)
5. [Node.js与浏览器JavaScript的差异](foundations/node-vs-browser.md)
6. [Node.js运行时启动流程](foundations/startup-process.md)
7. [搭建Node.js源码调试环境](foundations/debug-setup.md)

---

### 第二部分：事件循环与异步机制

8. [事件循环整体架构](event-loop/architecture.md)
9. [事件循环六个阶段详解](event-loop/phases.md)
10. [timers阶段：setTimeout与setInterval](event-loop/timers.md)
11. [pending callbacks阶段](event-loop/pending-callbacks.md)
12. [poll阶段：I/O事件处理](event-loop/poll.md)
13. [check阶段：setImmediate](event-loop/check.md)
14. [close callbacks阶段](event-loop/close-callbacks.md)
15. [process.nextTick与微任务队列](event-loop/nexttick-microtask.md)
16. [Promise与事件循环的交互](event-loop/promise-integration.md)
17. [事件循环可视化调试](event-loop/debugging.md)
18. [事件循环常见误区与陷阱](event-loop/common-pitfalls.md)
19. [事件循环性能优化](event-loop/performance.md)

---

### 第三部分：V8引擎深度解析

20. [V8引擎架构概览](v8/architecture.md)
21. [JavaScript代码解析与AST](v8/parsing-ast.md)
22. [Ignition解释器](v8/ignition.md)
23. [TurboFan优化编译器](v8/turbofan.md)
24. [内联缓存与隐藏类](v8/inline-cache-hidden-class.md)
25. [V8垃圾回收机制概述](v8/gc-overview.md)
26. [新生代垃圾回收：Scavenge](v8/scavenge.md)
27. [老生代垃圾回收：Mark-Sweep与Mark-Compact](v8/mark-sweep-compact.md)
28. [增量标记与并发垃圾回收](v8/incremental-concurrent-gc.md)
29. [V8内存限制与配置](v8/memory-limits.md)
30. [V8快照与启动优化](v8/snapshot-startup.md)
31. [WebAssembly在Node.js中的集成](v8/wasm-integration.md)
32. [V8性能分析工具](v8/profiling-tools.md)
33. [Node.js中的V8优化技巧](v8/optimization-tips.md)

---

### 第四部分：libuv异步I/O

34. [libuv设计理念与架构](libuv/design-architecture.md)
35. [libuv事件循环实现](libuv/event-loop-impl.md)
36. [libuv句柄与请求](libuv/handles-requests.md)
37. [定时器实现原理](libuv/timer-impl.md)
38. [线程池工作原理](libuv/thread-pool.md)
39. [文件I/O的异步实现](libuv/file-io.md)
40. [网络I/O的异步实现](libuv/network-io.md)
41. [DNS解析的异步实现](libuv/dns.md)
42. [信号处理](libuv/signals.md)
43. [子进程管理](libuv/child-processes.md)
44. [libuv与操作系统交互](libuv/os-interaction.md)
45. [libuv性能调优](libuv/performance-tuning.md)

---

### 第五部分：模块系统

46. [CommonJS模块规范](modules/commonjs-spec.md)
47. [require函数实现原理](modules/require-impl.md)
48. [模块缓存机制](modules/caching.md)
49. [模块路径解析算法](modules/path-resolution.md)
50. [循环依赖处理](modules/circular-dependencies.md)
51. [Node.js内置模块加载机制](modules/builtin-modules.md)
52. [ES Modules规范](modules/esm-spec.md)
53. [ESM与CommonJS互操作](modules/esm-cjs-interop.md)
54. [import.meta特性详解](modules/import-meta.md)
55. [条件导出与子路径导出](modules/conditional-exports.md)
56. [模块加载器自定义](modules/custom-loaders.md)
57. [package.json字段详解](modules/package-json.md)

---

### 第六部分：Buffer与二进制数据

58. [Buffer基础与创建方式](buffer/basics.md)
59. [Buffer内存分配策略](buffer/memory-allocation.md)
60. [Buffer与ArrayBuffer的关系](buffer/arraybuffer.md)
61. [Buffer读写操作](buffer/read-write.md)
62. [Buffer编码与解码](buffer/encoding.md)
63. [Buffer池与性能优化](buffer/pooling.md)
64. [TypedArray与DataView](buffer/typed-array.md)
65. [Blob与File API](buffer/blob-file-api.md)
66. [二进制协议解析实战](buffer/binary-protocol.md)

---

### 第七部分：进程与线程

67. [process全局对象详解](process/process-object.md)
68. [进程生命周期与退出码](process/lifecycle.md)
69. [进程优雅退出实现](process/graceful-shutdown.md)
70. [环境变量与配置管理](process/env-config.md)
71. [标准输入输出流](process/stdio.md)
72. [child_process模块概览](process/child-process-overview.md)
73. [spawn、exec、fork的区别](process/spawn-exec-fork.md)
74. [进程间通信IPC](process/ipc.md)
75. [Worker Threads工作线程](process/worker-threads.md)
76. [Worker Threads性能调优](process/worker-threads-tuning.md)
77. [SharedArrayBuffer与Atomics](process/shared-memory.md)
78. [多进程架构设计](process/multi-process-design.md)
79. [Cluster集群模块](process/cluster.md)
80. [负载均衡策略](process/load-balancing.md)

---

### 第八部分：错误处理与调试

81. [Node.js错误类型体系](error/error-types.md)
82. [同步错误与异步错误](error/sync-async-errors.md)
83. [Promise错误处理](error/promise-errors.md)
84. [AbortController与可取消操作](error/abort-controller.md)
85. [uncaughtException与unhandledRejection](error/uncaught-handlers.md)
86. [Domain模块与错误边界](error/domain.md)
87. [async_hooks异步跟踪](error/async-hooks.md)
88. [调试器使用指南](error/debugger.md)
89. [Chrome DevTools调试Node.js](error/devtools.md)
90. [诊断报告与Core Dump](error/diagnostic-reports.md)
91. [Tracing与APM集成](error/tracing-apm.md)
92. [生产环境错误追踪](error/production-tracking.md)

---

### 第九部分：性能分析与优化

93. [性能分析方法论](performance/methodology.md)
94. [CPU Profiling](performance/cpu-profiling.md)
95. [内存分析与堆快照](performance/heap-snapshot.md)
96. [内存泄漏检测与定位](performance/memory-leak.md)
97. [事件循环延迟监控](performance/event-loop-lag.md)
98. [Node.js预热与JIT优化](performance/warmup-jit.md)
99. [性能计时API](performance/timing-api.md)
100. [HTTP/2与HTTP/3性能特性](performance/http2-http3.md)
101. [Node.js基准测试](performance/benchmarking.md)
102. [性能优化最佳实践](performance/best-practices.md)

---

### 第十部分：安全与最佳实践

103. [Node.js安全威胁模型](security/threat-model.md)
104. [依赖安全与供应链攻击](security/dependency-security.md)
105. [沙箱与权限模型](security/sandbox-permissions.md)
106. [Node.js 20+权限模型详解](security/permission-model.md)
107. [加密模块crypto](security/crypto.md)
108. [TLS/SSL配置最佳实践](security/tls-ssl.md)
109. [HTTP安全头设置](security/http-security-headers.md)
110. [环境隔离与容器安全](security/container-security.md)
111. [Node.js编码规范](security/coding-standards.md)
112. [Node.js核心原理总结](security/summary.md)

---
