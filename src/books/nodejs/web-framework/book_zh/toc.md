# Node.js Web框架设计原理: 从Express到NestJS

深入理解主流 Web 框架的设计原理，掌握框架级的架构思维。

- [序言](preface.md)

---

### 第一部分：Web 框架基础

1. [Web 框架的本质与价值](foundations/framework-essence.md)
2. [HTTP 服务器基础回顾](foundations/http-server-basics.md)
3. [请求-响应生命周期](foundations/request-response-lifecycle.md)
4. [Web 框架核心职责](foundations/framework-responsibilities.md)
5. [Node.js Web 框架发展史](foundations/framework-history.md)
6. [框架选型考量因素](foundations/framework-selection.md)

---

### 第二部分：中间件模式

7. [中间件模式概述](middleware/middleware-overview.md)
8. [中间件的本质与设计理念](middleware/middleware-essence.md)
9. [线性中间件模型](middleware/linear-model.md)
10. [洋葱模型详解](middleware/onion-model.md)
11. [中间件组合与执行顺序](middleware/composition.md)
12. [错误处理中间件](middleware/error-middleware.md)
13. [异步中间件处理](middleware/async-middleware.md)
14. [中间件最佳实践](middleware/best-practices.md)
15. [实现简单中间件引擎](middleware/implement-engine.md)

---

### 第三部分：路由系统设计

16. [路由系统概述](routing/routing-overview.md)
17. [路由匹配算法](routing/matching-algorithms.md)
18. [路径参数提取](routing/path-parameters.md)
19. [正则路由与通配符](routing/regex-wildcards.md)
20. [路由优先级与冲突](routing/priority-conflicts.md)
21. [路由分组与嵌套](routing/grouping-nesting.md)
22. [路由中间件](routing/route-middleware.md)
23. [路由树(Radix Tree)实现](routing/radix-tree.md)
24. [find-my-way 路由库分析](routing/find-my-way.md)
25. [实现简单路由系统](routing/implement-router.md)

---

### 第四部分：请求与响应处理

26. [请求对象增强设计](request-response/request-enhancement.md)
27. [响应对象增强设计](request-response/response-enhancement.md)
28. [Context 对象设计](request-response/context-design.md)
29. [请求体解析策略](request-response/body-parsing.md)
30. [文件上传处理设计](request-response/file-upload.md)
31. [响应格式化与内容协商](request-response/content-negotiation.md)
32. [视图渲染引擎集成](request-response/view-engines.md)
33. [静态资源服务](request-response/static-files.md)

---

### 第五部分：Express 深度剖析

34. [Express 架构概览](express/architecture-overview.md)
35. [express() 应用创建](express/app-creation.md)
36. [Express 中间件实现](express/middleware-impl.md)
37. [Express Router 实现](express/router-impl.md)
38. [express.Request 增强](express/request-enhancement.md)
39. [express.Response 增强](express/response-enhancement.md)
40. [Express 错误处理机制](express/error-handling.md)
41. [Express 子应用(Sub-apps)](express/sub-apps.md)
42. [Express 性能考量](express/performance.md)
43. [Express 常用中间件源码](express/common-middleware.md)

---

### 第六部分：Koa 源码分析

44. [Koa 设计哲学](koa/design-philosophy.md)
45. [Koa 核心架构](koa/core-architecture.md)
46. [Koa Application 类](koa/application-class.md)
47. [Koa Context 设计](koa/context-design.md)
48. [koa-compose 中间件组合](koa/koa-compose.md)
49. [Koa 错误处理](koa/error-handling.md)
50. [Koa vs Express 对比](koa/koa-vs-express.md)
51. [Koa 常用中间件源码](koa/common-middleware.md)
52. [Koa 最佳实践](koa/best-practices.md)

---

### 第七部分：Fastify 分析

53. [Fastify 设计目标](fastify/design-goals.md)
54. [Fastify 架构概览](fastify/architecture.md)
55. [Fastify 插件系统](fastify/plugin-system.md)
56. [avvio 插件加载器](fastify/avvio.md)
57. [Fastify 路由性能优化](fastify/routing-performance.md)
58. [JSON Schema 验证集成](fastify/json-schema.md)
59. [Fastify 序列化优化](fastify/serialization.md)
60. [Fastify Hooks 机制](fastify/hooks.md)
61. [Fastify 装饰器(Decorators)](fastify/decorators.md)
62. [Fastify 性能对比分析](fastify/performance-comparison.md)

---

### 第八部分：NestJS 架构

63. [NestJS 设计理念](nestjs/design-philosophy.md)
64. [NestJS 架构概览](nestjs/architecture-overview.md)
65. [模块系统(Modules)](nestjs/modules.md)
66. [依赖注入(DI)原理](nestjs/dependency-injection.md)
67. [IoC 容器实现](nestjs/ioc-container.md)
68. [控制器(Controllers)](nestjs/controllers.md)
69. [提供者(Providers)](nestjs/providers.md)
70. [装饰器与元数据](nestjs/decorators-metadata.md)
71. [管道(Pipes)与验证](nestjs/pipes.md)
72. [守卫(Guards)](nestjs/guards.md)
73. [拦截器(Interceptors)](nestjs/interceptors.md)
74. [异常过滤器(Exception Filters)](nestjs/exception-filters.md)
75. [NestJS 生命周期](nestjs/lifecycle.md)
76. [NestJS 与底层框架适配](nestjs/platform-adapters.md)

---

### 第九部分：实现 Mini 框架

77. [Mini 框架设计目标](mini-framework/design-goals.md)
78. [项目结构与初始化](mini-framework/project-setup.md)
79. [实现核心 Application 类](mini-framework/application.md)
80. [实现中间件引擎](mini-framework/middleware-engine.md)
81. [实现路由系统](mini-framework/router.md)
82. [实现 Context 对象](mini-framework/context.md)
83. [实现请求体解析](mini-framework/body-parser.md)
84. [实现静态文件服务](mini-framework/static-serve.md)
85. [实现错误处理](mini-framework/error-handling.md)
86. [添加 TypeScript 支持](mini-framework/typescript-support.md)
87. [编写测试](mini-framework/testing.md)
88. [性能优化](mini-framework/performance.md)
89. [发布到 npm](mini-framework/publish.md)
90. [框架设计总结](mini-framework/summary.md)

---

