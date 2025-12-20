# Node.js源码深度解析: 从V8到libuv

深入 Node.js 内部实现，掌握源码级的理解与调试能力。

- [序言](preface.md)

---

### 第一部分：源码阅读准备

1. [Node.js 源码结构概览](preparation/source-structure.md)
2. [编译 Node.js 源码](preparation/build-from-source.md)
3. [搭建源码调试环境](preparation/debug-environment.md)
4. [VS Code 调试配置](preparation/vscode-setup.md)
5. [C++ 代码阅读入门](preparation/cpp-primer.md)
6. [V8 API 基础](preparation/v8-api-basics.md)
7. [源码阅读方法论](preparation/reading-methodology.md)
8. [如何追踪代码变更](preparation/tracking-changes.md)

---

### 第二部分：Node.js 启动过程

9. [main() 函数：一切的起点](bootstrap/main-function.md)
10. [Node.js 初始化流程](bootstrap/initialization.md)
11. [V8 平台与 Isolate 创建](bootstrap/v8-platform.md)
12. [libuv 事件循环初始化](bootstrap/libuv-init.md)
13. [内部模块加载](bootstrap/internal-modules.md)
14. [bootstrap 脚本执行](bootstrap/bootstrap-scripts.md)
15. [用户代码入口](bootstrap/user-code-entry.md)
16. [REPL 启动流程](bootstrap/repl-start.md)

---

### 第三部分：libuv 深度解析

17. [libuv 架构与设计理念](libuv/architecture.md)
18. [事件循环核心：uv_run()](libuv/uv-run.md)
19. [句柄(Handle)体系](libuv/handles.md)
20. [请求(Request)体系](libuv/requests.md)
21. [定时器实现：最小堆](libuv/timers-heap.md)
22. [I/O 观察者与 epoll/kqueue](libuv/io-watchers.md)
23. [线程池实现](libuv/thread-pool.md)
24. [异步 DNS 解析](libuv/async-dns.md)
25. [文件系统异步操作](libuv/fs-async.md)
26. [网络 I/O 实现](libuv/network-io.md)
27. [信号处理实现](libuv/signals.md)
28. [子进程管理](libuv/child-processes.md)

---

### 第四部分：V8 集成与绑定

29. [V8 与 Node.js 的关系](v8-binding/v8-nodejs-relationship.md)
30. [C++ Binding 机制](v8-binding/cpp-binding.md)
31. [node::ObjectWrap 类](v8-binding/object-wrap.md)
32. [N-API 设计与实现](v8-binding/n-api.md)
33. [内置模块注册机制](v8-binding/builtin-registration.md)
34. [环境对象(Environment)](v8-binding/environment.md)
35. [上下文(Context)管理](v8-binding/context.md)
36. [JavaScript 与 C++ 的数据传递](v8-binding/data-passing.md)
37. [异步操作的 C++ 实现](v8-binding/async-cpp.md)

---

### 第五部分：核心模块源码分析

38. [fs 模块架构](core-modules/fs-architecture.md)
39. [fs 同步操作实现](core-modules/fs-sync.md)
40. [fs 异步操作实现](core-modules/fs-async.md)
41. [fs.promises 实现](core-modules/fs-promises.md)
42. [Buffer 内存管理](core-modules/buffer-memory.md)
43. [Buffer 与 TypedArray](core-modules/buffer-typedarray.md)
44. [Stream 基类设计](core-modules/stream-base.md)
45. [Readable Stream 实现](core-modules/readable-stream.md)
46. [Writable Stream 实现](core-modules/writable-stream.md)
47. [Duplex 与 Transform](core-modules/duplex-transform.md)
48. [net 模块：TCP 实现](core-modules/net-tcp.md)
49. [dns 模块实现](core-modules/dns.md)
50. [http 解析器：llhttp](core-modules/llhttp-parser.md)
51. [http 模块架构](core-modules/http-architecture.md)
52. [http.Server 实现](core-modules/http-server.md)
53. [http.request 实现](core-modules/http-request.md)

---

### 第六部分：模块系统源码

54. [模块系统架构概览](modules/architecture.md)
55. [Module 类设计](modules/module-class.md)
56. [require() 函数实现](modules/require-impl.md)
57. [模块路径解析算法](modules/path-resolution.md)
58. [模块编译与执行](modules/compilation.md)
59. [模块缓存机制](modules/caching.md)
60. [JSON 模块加载](modules/json-loading.md)
61. [原生模块加载](modules/native-modules.md)
62. [ESM Loader 设计](modules/esm-loader.md)
63. [ESM 解析与实例化](modules/esm-resolution.md)
64. [ESM 与 CJS 互操作](modules/esm-cjs-interop.md)
65. [自定义 Loader 实现](modules/custom-loaders.md)

---

### 第七部分：进程与线程源码

66. [process 对象构建](process/process-object.md)
67. [process.nextTick 实现](process/nexttick.md)
68. [child_process.spawn 实现](process/spawn-impl.md)
69. [进程间通信(IPC)实现](process/ipc-impl.md)
70. [Worker Threads 架构](process/worker-threads-arch.md)
71. [MessageChannel 实现](process/message-channel.md)
72. [SharedArrayBuffer 处理](process/shared-array-buffer.md)
73. [Cluster 模块实现](process/cluster-impl.md)
74. [负载均衡算法](process/load-balancing.md)

---

### 第八部分：进阶主题

75. [async_hooks 实现](advanced/async-hooks.md)
76. [诊断报告生成](advanced/diagnostic-reports.md)
77. [Heap Snapshot 实现](advanced/heap-snapshot.md)
78. [CPU Profiler 集成](advanced/cpu-profiler.md)
79. [Trace Events 系统](advanced/trace-events.md)
80. [Inspector 协议实现](advanced/inspector.md)
81. [WASI 支持实现](advanced/wasi.md)
82. [Permission Model 实现](advanced/permission-model.md)
83. [性能优化案例分析](advanced/optimization-cases.md)
84. [参与 Node.js 贡献](advanced/contributing.md)
85. [源码分析总结与展望](advanced/summary.md)

---

