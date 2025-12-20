# 浏览器原理深度剖析: 理解前端运行的底层世界

本书将带你深入浏览器内核，从底层原理角度理解前端技术，成为真正的前端专家。

- [序言](preface.md)

---

### 第一部分：浏览器架构与进程模型

1. [浏览器发展简史](architecture/history.md)
2. [现代浏览器架构概览](architecture/overview.md)
3. [多进程架构详解](architecture/multi-process.md)
4. [浏览器进程](architecture/browser-process.md)
5. [渲染进程](architecture/renderer-process.md)
6. [GPU进程](architecture/gpu-process.md)
7. [网络进程](architecture/network-process.md)
8. [插件进程与扩展机制](architecture/plugin-process.md)
9. [进程间通信(IPC)](architecture/ipc.md)
10. [站点隔离与安全边界](architecture/site-isolation.md)

---

### 第二部分：网络与资源加载

11. [从URL到页面：导航流程](network/navigation-flow.md)
12. [DNS解析过程详解](network/dns-resolution.md)
13. [TCP连接与TLS握手](network/tcp-tls.md)
14. [HTTP请求与响应](network/http-request-response.md)
15. [HTTP/2协议详解](network/http2-deep.md)
16. [HTTP/3与QUIC详解](network/http3-quic-deep.md)
17. [缓存机制详解](network/caching.md)
18. [Service Worker与网络代理](network/service-worker.md)
19. [资源优先级与预加载](network/resource-priority.md)
20. [跨域资源共享(CORS)](network/cors.md)

---

### 第三部分：HTML解析与DOM构建

21. [HTML解析器原理](parsing/html-parser.md)
22. [词法分析：Tokenization](parsing/tokenization.md)
23. [语法分析：树构建算法](parsing/tree-construction.md)
24. [DOM树结构与节点类型](parsing/dom-tree.md)
25. [容错机制与异常处理](parsing/error-handling.md)
26. [解析阻塞与异步脚本](parsing/script-blocking.md)
27. [预解析与推测性加载](parsing/preload-scanner.md)
28. [Document对象与DOM API](parsing/document-api.md)
29. [MutationObserver原理](parsing/mutation-observer.md)
30. [Shadow DOM与封装](parsing/shadow-dom.md)

---

### 第四部分：CSS解析与样式计算

31. [CSS解析器原理](css/css-parser.md)
32. [CSSOM构建过程](css/cssom-construction.md)
33. [选择器匹配算法](css/selector-matching.md)
34. [样式级联与继承](css/cascade-inheritance.md)
35. [计算样式(Computed Style)](css/computed-style.md)
36. [CSS变量与自定义属性](css/css-variables.md)
37. [媒体查询与响应式](css/media-queries.md)
38. [CSS动画与过渡原理](css/animations-transitions.md)
39. [CSS Houdini简介](css/houdini.md)
40. [CSS性能优化原理](css/performance.md)

---

### 第五部分：布局与渲染树

41. [渲染树构建](layout/render-tree.md)
42. [布局(Layout)过程详解](layout/layout-process.md)
43. [盒模型计算](layout/box-model.md)
44. [正常流布局](layout/normal-flow.md)
45. [浮动布局原理](layout/float.md)
46. [定位布局原理](layout/positioning.md)
47. [Flexbox布局原理](layout/flexbox.md)
48. [Grid布局原理](layout/grid.md)
49. [BFC与格式化上下文](layout/formatting-context.md)
50. [布局优化与性能](layout/performance.md)

---

### 第六部分：绘制与合成

51. [绘制(Paint)过程详解](painting/paint-process.md)
52. [绘制记录与显示列表](painting/display-list.md)
53. [分层(Layer)与合成](painting/layers-compositing.md)
54. [图层树与合成层](painting/layer-tree.md)
55. [GPU光栅化](painting/gpu-rasterization.md)
56. [帧合成与显示](painting/frame-composition.md)
57. [will-change与图层提升](painting/will-change.md)
58. [硬件加速原理](painting/hardware-acceleration.md)
59. [滚动与滚动优化](painting/scroll-optimization.md)
60. [绘制性能优化](painting/performance.md)

---

### 第七部分：JavaScript引擎

61. [JavaScript引擎概述](js-engine/overview.md)
62. [V8引擎架构](js-engine/v8-architecture.md)
63. [解析与AST生成](js-engine/parsing-ast.md)
64. [字节码与Ignition](js-engine/bytecode-ignition.md)
65. [JIT编译与TurboFan](js-engine/jit-turbofan.md)
66. [内联缓存(IC)](js-engine/inline-caching.md)
67. [隐藏类与对象表示](js-engine/hidden-classes.md)
68. [内存管理与堆结构](js-engine/memory-heap.md)
69. [垃圾回收机制详解](js-engine/garbage-collection.md)
70. [V8性能优化技巧](js-engine/optimization-tips.md)

---

### 第八部分：事件循环与异步

71. [事件循环(Event Loop)详解](event-loop/overview.md)
72. [调用栈(Call Stack)](event-loop/call-stack.md)
73. [宏任务(Macrotask)](event-loop/macrotasks.md)
74. [微任务(Microtask)](event-loop/microtasks.md)
75. [requestAnimationFrame详解](event-loop/raf.md)
76. [requestIdleCallback详解](event-loop/ric.md)
77. [setTimeout/setInterval原理](event-loop/timers.md)
78. [Promise与异步调度](event-loop/promise.md)
79. [async/await原理](event-loop/async-await.md)
80. [Web Worker原理](event-loop/web-worker.md)

---

### 第九部分：浏览器API原理

81. [DOM事件系统](browser-api/dom-events.md)
82. [事件捕获与冒泡](browser-api/event-propagation.md)
83. [IntersectionObserver原理](browser-api/intersection-observer.md)
84. [ResizeObserver原理](browser-api/resize-observer.md)
85. [PerformanceObserver原理](browser-api/performance-observer.md)
86. [History API与路由](browser-api/history-api.md)
87. [Storage API原理](browser-api/storage.md)
88. [IndexedDB原理](browser-api/indexeddb.md)
89. [Fetch API原理](browser-api/fetch.md)
90. [WebSocket原理](browser-api/websocket.md)

---

### 第十部分：安全与沙箱

91. [浏览器安全模型](security/security-model.md)
92. [同源策略详解](security/same-origin-policy.md)
93. [XSS攻击与防御](security/xss.md)
94. [CSRF攻击与防御](security/csrf.md)
95. [CSP内容安全策略](security/csp.md)
96. [沙箱机制](security/sandbox.md)
97. [HTTPS与证书](security/https.md)
98. [Cookie安全](security/cookie-security.md)
99. [浏览器指纹与隐私](security/fingerprinting.md)
100. [前端安全最佳实践](security/best-practices.md)

---
