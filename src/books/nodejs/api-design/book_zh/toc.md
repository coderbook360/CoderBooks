# Node.js API设计与实现: 从RESTful到GraphQL

掌握现代 API 设计原则，构建开发者友好的后端服务接口。

- [序言](preface.md)

---

### 第一部分：API 设计基础

1. [什么是好的 API](foundations/good-api.md)
2. [API 设计原则与哲学](foundations/design-principles.md)
3. [HTTP 协议核心回顾](foundations/http-fundamentals.md)
4. [API 风格对比：REST vs GraphQL vs RPC](foundations/api-styles.md)
5. [API 优先设计方法论](foundations/api-first-design.md)

---

### 第二部分：RESTful API 设计

6. [REST 核心约束与理念](rest/rest-constraints.md)
7. [资源建模与命名规范](rest/resource-modeling.md)
8. [URL 设计最佳实践](rest/url-design.md)
9. [HTTP 方法语义详解](rest/http-methods.md)
10. [HTTP 状态码正确使用](rest/status-codes.md)
11. [请求与响应格式设计](rest/request-response-format.md)
12. [查询参数与过滤设计](rest/query-filtering.md)
13. [分页设计：offset、cursor 与 keyset](rest/pagination.md)
14. [排序与搜索接口设计](rest/sorting-searching.md)
15. [字段选择与稀疏字段集](rest/sparse-fieldsets.md)
16. [资源关系与嵌套资源](rest/resource-relationships.md)
17. [批量操作接口设计](rest/batch-operations.md)

---

### 第三部分：REST API 高级模式

18. [错误处理与响应规范](advanced-rest/error-handling.md)
19. [问题详情格式(RFC 7807)](advanced-rest/problem-details.md)
20. [HATEOAS 超媒体驱动](advanced-rest/hateoas.md)
21. [长时间操作处理模式](advanced-rest/long-running-operations.md)
22. [文件上传接口设计](advanced-rest/file-upload.md)
23. [Webhook 设计与实现](advanced-rest/webhooks.md)
24. [幂等性设计与实现](advanced-rest/idempotency.md)
25. [乐观锁与 ETag](advanced-rest/etag-caching.md)
26. [API 版本管理策略](advanced-rest/versioning.md)
27. [向后兼容与废弃策略](advanced-rest/backward-compatibility.md)

---

### 第四部分：RESTful API 实现

28. [Express 实现 REST API](rest-implementation/express-rest.md)
29. [Fastify 实现 REST API](rest-implementation/fastify-rest.md)
30. [NestJS 实现 REST API](rest-implementation/nestjs-rest.md)
31. [请求验证与数据转换](rest-implementation/validation-transformation.md)
32. [响应序列化与格式化](rest-implementation/serialization.md)
33. [中间件设计模式](rest-implementation/middleware-patterns.md)
34. [控制器组织与路由管理](rest-implementation/controller-routing.md)

---

### 第五部分：GraphQL 设计与实现

35. [GraphQL 核心概念](graphql/core-concepts.md)
36. [Schema 设计基础](graphql/schema-basics.md)
37. [类型系统详解](graphql/type-system.md)
38. [查询与变更设计](graphql/queries-mutations.md)
39. [输入类型与参数设计](graphql/input-types.md)
40. [接口与联合类型](graphql/interfaces-unions.md)
41. [枚举与标量类型](graphql/enums-scalars.md)
42. [Resolver 实现模式](graphql/resolvers.md)
43. [N+1 问题与 DataLoader](graphql/dataloader.md)
44. [分页：Relay Cursor 连接规范](graphql/relay-pagination.md)
45. [错误处理与错误格式](graphql/error-handling.md)
46. [订阅与实时数据](graphql/subscriptions.md)
47. [查询复杂度与深度限制](graphql/query-complexity.md)
48. [Apollo Server 实战](graphql/apollo-server.md)
49. [NestJS GraphQL 实战](graphql/nestjs-graphql.md)

---

### 第六部分：API 文档与规范

50. [OpenAPI 3.0 规范详解](documentation/openapi-spec.md)
51. [使用 Swagger 生成文档](documentation/swagger.md)
52. [代码优先 vs 规范优先](documentation/code-first-vs-spec-first.md)
53. [API 文档最佳实践](documentation/documentation-best-practices.md)
54. [交互式 API 文档：Swagger UI 与 Redoc](documentation/interactive-docs.md)
55. [API 示例与 Mock 服务](documentation/api-mocking.md)
56. [SDK 生成与客户端代码](documentation/sdk-generation.md)
57. [GraphQL 文档与 Playground](documentation/graphql-docs.md)

---

### 第七部分：API 性能优化

58. [API 响应时间优化](performance/response-time.md)
59. [HTTP 缓存策略](performance/http-caching.md)
60. [响应压缩与传输优化](performance/compression.md)
61. [数据库查询优化](performance/database-optimization.md)
62. [N+1 查询问题解决](performance/n-plus-one.md)
63. [API 负载测试](performance/load-testing.md)
64. [性能监控与 APM](performance/apm.md)

---

### 第八部分：API 网关与治理

65. [API 网关概念与选型](gateway/api-gateway-intro.md)
66. [Kong 网关入门](gateway/kong.md)
67. [Node.js 实现简易 API 网关](gateway/nodejs-gateway.md)
68. [限流设计与实现](gateway/rate-limiting.md)
69. [熔断与降级策略](gateway/circuit-breaker.md)
70. [API 聚合与 BFF 模式](gateway/bff-pattern.md)
71. [API 监控与分析](gateway/monitoring-analytics.md)
72. [API 生命周期管理](gateway/lifecycle-management.md)
73. [API 设计总结与最佳实践](gateway/summary.md)

---

