# 大规模前端系统架构

探索大规模前端系统的架构设计，包括性能工程、微前端、监控可观测性、安全与服务端渲染。

- [序言](index.md)

---

### 第一部分：性能工程基础

1. [性能指标体系：Core Web Vitals](performance-fundamentals/core-web-vitals.md)
2. [性能度量：LCP、FID、CLS 详解](performance-fundamentals/lcp-fid-cls.md)
3. [性能预算制定](performance-fundamentals/performance-budget.md)
4. [性能分析工具链](performance-fundamentals/profiling-tools.md)
5. [Chrome DevTools 性能分析](performance-fundamentals/devtools-performance.md)
6. [Lighthouse 深度使用](performance-fundamentals/lighthouse.md)

---

### 第二部分：加载性能优化

7. [资源加载优化概述](loading-performance/overview.md)
8. [代码分割策略](loading-performance/code-splitting.md)
9. [动态导入与懒加载](loading-performance/dynamic-import.md)
10. [预加载与预获取](loading-performance/preload-prefetch.md)
11. [资源优先级控制](loading-performance/resource-priority.md)
12. [Critical CSS 提取](loading-performance/critical-css.md)
13. [字体加载优化](loading-performance/font-loading.md)
14. [图片加载优化](loading-performance/image-optimization.md)
15. [现代图片格式：WebP、AVIF](loading-performance/modern-image-formats.md)
16. [脚本加载策略：async vs defer](loading-performance/script-loading.md)

---

### 第三部分：运行时性能优化

17. [JavaScript 执行性能](runtime-performance/js-execution.md)
18. [渲染性能优化](runtime-performance/rendering.md)
19. [布局抖动与重排优化](runtime-performance/layout-thrashing.md)
20. [虚拟滚动实现](runtime-performance/virtual-scrolling.md)
21. [长列表优化策略](runtime-performance/long-list-optimization.md)
22. [Web Worker 多线程](runtime-performance/web-workers.md)
23. [requestIdleCallback 应用](runtime-performance/idle-callback.md)
24. [时间分片技术](runtime-performance/time-slicing.md)

---

### 第四部分：内存与网络优化

25. [内存管理基础](memory-network/memory-basics.md)
26. [内存泄漏检测与修复](memory-network/memory-leak-detection.md)
27. [垃圾回收与性能](memory-network/garbage-collection.md)
28. [HTTP 缓存策略](memory-network/http-caching.md)
29. [Service Worker 缓存](memory-network/service-worker-caching.md)
30. [CDN 优化策略](memory-network/cdn-optimization.md)
31. [HTTP/2 与 HTTP/3 优化](memory-network/http2-http3.md)
32. [资源压缩策略](memory-network/compression.md)

---

### 第五部分：框架层性能优化

33. [React 性能优化原理](framework-performance/react-optimization-principles.md)
34. [React 组件优化策略](framework-performance/react-component-optimization.md)
35. [React 状态管理性能](framework-performance/react-state-performance.md)
36. [React Concurrent 特性](framework-performance/react-concurrent.md)
37. [Vue 响应式性能优化](framework-performance/vue-reactivity-performance.md)
38. [Vue 编译优化机制](framework-performance/vue-compiler-optimization.md)

---

### 第六部分：微前端基础

39. [微前端架构概述](micro-frontends/overview.md)
40. [微前端解决的问题](micro-frontends/problems-solved.md)
41. [微前端技术方案对比](micro-frontends/solution-comparison.md)
42. [微前端拆分策略](micro-frontends/splitting-strategy.md)
43. [应用隔离机制](micro-frontends/isolation.md)

---

### 第七部分：微前端框架实战

44. [qiankun 架构解析](micro-frontends-frameworks/qiankun-architecture.md)
45. [qiankun 实战配置](micro-frontends-frameworks/qiankun-practice.md)
46. [Module Federation 原理](micro-frontends-frameworks/module-federation-principle.md)
47. [Module Federation 实战](micro-frontends-frameworks/module-federation-practice.md)
48. [single-spa 核心机制](micro-frontends-frameworks/single-spa.md)
49. [Garfish 架构详解](micro-frontends-frameworks/garfish.md)
50. [无界 (Wujie) 沙箱原理](micro-frontends-frameworks/wujie.md)
51. [微前端框架选型](micro-frontends-frameworks/framework-selection.md)

---

### 第八部分：微前端高级话题

52. [JS 沙箱实现原理](micro-frontends-advanced/js-sandbox.md)
53. [CSS 沙箱实现方案](micro-frontends-advanced/css-sandbox.md)
54. [子应用通信机制](micro-frontends-advanced/communication.md)
55. [共享依赖管理](micro-frontends-advanced/shared-dependencies.md)
56. [路由同步方案](micro-frontends-advanced/routing-sync.md)
57. [微前端部署策略](micro-frontends-advanced/deployment.md)
58. [微前端性能优化](micro-frontends-advanced/performance.md)

---

### 第九部分：前端监控基础

59. [前端监控体系概述](monitoring/overview.md)
60. [监控数据采集架构](monitoring/data-collection.md)
61. [性能监控实现](monitoring/performance-monitoring.md)
62. [错误监控实现](monitoring/error-monitoring.md)
63. [用户行为监控](monitoring/behavior-monitoring.md)
64. [监控数据上报策略](monitoring/data-reporting.md)

---

### 第十部分：可观测性建设

65. [可观测性三支柱](observability/three-pillars.md)
66. [日志系统设计](observability/logging.md)
67. [全链路追踪实现](observability/tracing.md)
68. [Metrics 指标体系](observability/metrics.md)
69. [告警系统设计](observability/alerting.md)
70. [Sentry 深度实战](observability/sentry.md)
71. [监控大盘设计](observability/dashboard.md)

---

### 第十一部分：前端安全基础

72. [前端安全概述](security/overview.md)
73. [XSS 攻击原理与防护](security/xss.md)
74. [CSRF 攻击原理与防护](security/csrf.md)
75. [点击劫持防护](security/clickjacking.md)
76. [CSP 策略配置](security/csp.md)
77. [安全 HTTP 响应头](security/security-headers.md)

---

### 第十二部分：前端安全进阶

78. [敏感数据保护](security-advanced/sensitive-data.md)
79. [接口安全设计](security-advanced/api-security.md)
80. [依赖安全审计](security-advanced/dependency-audit.md)
81. [供应链安全](security-advanced/supply-chain.md)
82. [前端加密实践](security-advanced/encryption.md)
83. [安全编码规范](security-advanced/secure-coding.md)

---

### 第十三部分：服务端渲染基础

84. [SSR 架构原理](ssr/architecture.md)
85. [SSR vs CSR vs SSG](ssr/ssr-csr-ssg.md)
86. [Hydration 机制详解](ssr/hydration.md)
87. [React SSR 实现](ssr/react-ssr.md)
88. [Vue SSR 实现](ssr/vue-ssr.md)

---

### 第十四部分：服务端渲染进阶

89. [Next.js 架构解析](ssr-advanced/nextjs-architecture.md)
90. [Next.js App Router](ssr-advanced/nextjs-app-router.md)
91. [Nuxt.js 架构解析](ssr-advanced/nuxtjs-architecture.md)
92. [流式渲染实现](ssr-advanced/streaming-rendering.md)
93. [Selective Hydration](ssr-advanced/selective-hydration.md)
94. [Islands Architecture](ssr-advanced/islands-architecture.md)
95. [SSR 性能优化](ssr-advanced/ssr-performance.md)
96. [SSR 缓存策略](ssr-advanced/ssr-caching.md)

---

### 第十五部分：大规模系统实战

97. [实战：千万级 PV 系统架构](practice/high-pv-architecture.md)
98. [实战：性能优化完整案例](practice/performance-case-study.md)
99. [实战：微前端落地经验](practice/micro-frontend-landing.md)
100. [实战：监控体系建设](practice/monitoring-implementation.md)
101. [容灾降级方案设计](practice/disaster-recovery.md)
102. [灰度发布策略](practice/gray-release.md)
103. [总结：大规模系统架构原则](practice/architecture-principles.md)
