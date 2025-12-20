# Node.js微服务与分布式系统: 架构设计与实践

从单体到分布式，构建可扩展、高可用的 Node.js 微服务系统。

- [序言](preface.md)

---

### 第一部分：微服务架构基础

1. [微服务架构概述与演进](foundations/microservices-overview.md)
2. [单体 vs 微服务：权衡与选择](foundations/monolith-vs-microservices.md)
3. [服务拆分策略与原则](foundations/service-decomposition.md)
4. [领域驱动设计(DDD)与限界上下文](foundations/ddd-bounded-context.md)
5. [微服务设计模式概览](foundations/design-patterns-overview.md)
6. [Node.js 微服务技术栈选型](foundations/tech-stack.md)

---

### 第二部分：服务通信

7. [服务间通信模式概览](communication/communication-patterns.md)
8. [同步通信：REST 与 HTTP](communication/rest-http.md)
9. [gRPC 基础与 Node.js 实现](communication/grpc-basics.md)
10. [gRPC 高级特性：流式与拦截器](communication/grpc-advanced.md)
11. [Protocol Buffers 详解](communication/protobuf.md)
12. [异步通信：消息队列概述](communication/message-queues-intro.md)
13. [RabbitMQ 与 Node.js](communication/rabbitmq.md)
14. [Redis 发布订阅与 Streams](communication/redis-pubsub.md)
15. [Apache Kafka 基础](communication/kafka-basics.md)
16. [消息模式：点对点、发布订阅、请求响应](communication/messaging-patterns.md)
17. [事件驱动架构](communication/event-driven-architecture.md)

---

### 第三部分：服务发现与负载均衡

18. [服务发现原理与模式](discovery/service-discovery-intro.md)
19. [Consul 服务发现实战](discovery/consul.md)
20. [etcd 服务发现实战](discovery/etcd.md)
21. [Kubernetes 服务发现](discovery/kubernetes-discovery.md)
22. [客户端负载均衡](discovery/client-side-lb.md)
23. [服务端负载均衡](discovery/server-side-lb.md)
24. [健康检查机制设计](discovery/health-checks.md)

---

### 第四部分：弹性设计与容错

25. [分布式系统的故障模式](resilience/failure-modes.md)
26. [超时设计与实现](resilience/timeouts.md)
27. [重试策略与退避算法](resilience/retry-backoff.md)
28. [熔断器模式详解](resilience/circuit-breaker.md)
29. [使用 opossum 实现熔断](resilience/opossum.md)
30. [舱壁模式与隔离设计](resilience/bulkhead.md)
31. [降级策略与优雅降级](resilience/graceful-degradation.md)
32. [限流算法与实现](resilience/rate-limiting-algorithms.md)
33. [混沌工程入门](resilience/chaos-engineering.md)

---

### 第五部分：分布式数据管理

34. [微服务数据管理挑战](data/data-management-challenges.md)
35. [数据库每服务模式](data/database-per-service.md)
36. [分布式事务问题](data/distributed-transactions.md)
37. [Saga 模式详解](data/saga-pattern.md)
38. [编排式 Saga 实现](data/orchestration-saga.md)
39. [协调式 Saga 实现](data/choreography-saga.md)
40. [事件溯源基础](data/event-sourcing-basics.md)
41. [CQRS 命令查询职责分离](data/cqrs.md)
42. [最终一致性处理](data/eventual-consistency.md)
43. [跨服务数据查询](data/cross-service-queries.md)

---

### 第六部分：可观测性

44. [可观测性三大支柱](observability/three-pillars.md)
45. [结构化日志设计](observability/structured-logging.md)
46. [日志聚合：ELK Stack](observability/elk-stack.md)
47. [分布式追踪原理](observability/distributed-tracing-intro.md)
48. [OpenTelemetry 入门](observability/opentelemetry.md)
49. [Jaeger 追踪实战](observability/jaeger.md)
50. [指标收集：Prometheus](observability/prometheus.md)
51. [可视化：Grafana 仪表盘](observability/grafana.md)
52. [告警设计与实现](observability/alerting.md)
53. [SLI、SLO 与 SLA](observability/sli-slo-sla.md)

---

### 第七部分：API 网关与 BFF

54. [API 网关在微服务中的角色](gateway/api-gateway-role.md)
55. [Kong 网关实战](gateway/kong-implementation.md)
56. [自建 Node.js API 网关](gateway/nodejs-api-gateway.md)
57. [BFF 模式详解](gateway/bff-pattern.md)
58. [GraphQL 作为 BFF](gateway/graphql-bff.md)
59. [网关限流与认证](gateway/gateway-rate-auth.md)

---

### 第八部分：容器化与编排

60. [Docker 基础回顾](containers/docker-basics.md)
61. [Node.js Docker 最佳实践](containers/nodejs-docker-best-practices.md)
62. [多阶段构建优化](containers/multi-stage-build.md)
63. [Docker Compose 本地开发](containers/docker-compose.md)
64. [Kubernetes 核心概念](containers/kubernetes-concepts.md)
65. [Kubernetes 部署 Node.js 服务](containers/kubernetes-nodejs.md)
66. [ConfigMap 与 Secret 管理](containers/configmap-secrets.md)
67. [Kubernetes 服务网格入门](containers/service-mesh-intro.md)
68. [Istio 基础实战](containers/istio.md)

---

### 第九部分：CI/CD 与 DevOps

69. [微服务 CI/CD 策略](devops/cicd-strategy.md)
70. [GitHub Actions 流水线](devops/github-actions.md)
71. [容器镜像构建与推送](devops/container-build-push.md)
72. [GitOps 与 ArgoCD](devops/gitops-argocd.md)
73. [蓝绿部署与金丝雀发布](devops/deployment-strategies.md)
74. [功能开关与特性标记](devops/feature-flags.md)

---

### 第十部分：综合实战

75. [微服务项目架构设计](practice/project-architecture.md)
76. [用户服务实现](practice/user-service.md)
77. [订单服务实现](practice/order-service.md)
78. [支付服务实现](practice/payment-service.md)
79. [通知服务实现](practice/notification-service.md)
80. [服务集成与端到端测试](practice/integration-testing.md)
81. [生产环境部署](practice/production-deployment.md)
82. [微服务架构总结与展望](practice/summary.md)

---

