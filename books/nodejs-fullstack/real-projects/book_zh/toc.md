# Node.js实战项目集: 从零构建生产级应用

六个完整实战项目，将所学知识转化为真正的工程能力。

- [序言](preface.md)

---

### 第一部分：CLI 脚手架工具

1. [项目概述与需求分析](cli-scaffold/overview.md)
2. [项目初始化与结构设计](cli-scaffold/project-setup.md)
3. [Commander.js 命令定义](cli-scaffold/commander-setup.md)
4. [Inquirer.js 交互式问询](cli-scaffold/inquirer-prompts.md)
5. [模板引擎与文件生成](cli-scaffold/template-engine.md)
6. [模板下载与仓库集成](cli-scaffold/template-download.md)
7. [配置文件读写](cli-scaffold/config-files.md)
8. [进度显示与美化输出](cli-scaffold/progress-styling.md)
9. [错误处理与用户提示](cli-scaffold/error-handling.md)
10. [插件系统设计](cli-scaffold/plugin-system.md)
11. [单元测试编写](cli-scaffold/unit-testing.md)
12. [npm 包发布流程](cli-scaffold/npm-publish.md)
13. [项目总结与扩展方向](cli-scaffold/summary.md)

---

### 第二部分：RESTful API 认证服务

14. [项目概述与 API 设计](rest-auth/overview.md)
15. [Express + TypeScript 项目搭建](rest-auth/project-setup.md)
16. [数据库设计与 Prisma 集成](rest-auth/database-prisma.md)
17. [用户模型与密码加密](rest-auth/user-model.md)
18. [注册接口实现](rest-auth/registration.md)
19. [登录接口与 JWT 签发](rest-auth/login-jwt.md)
20. [认证中间件实现](rest-auth/auth-middleware.md)
21. [刷新令牌机制](rest-auth/refresh-token.md)
22. [密码重置流程](rest-auth/password-reset.md)
23. [邮件发送集成](rest-auth/email-integration.md)
24. [RBAC 权限系统设计](rest-auth/rbac-design.md)
25. [权限中间件实现](rest-auth/permission-middleware.md)
26. [请求验证与错误处理](rest-auth/validation-errors.md)
27. [API 文档生成](rest-auth/api-documentation.md)
28. [集成测试编写](rest-auth/integration-testing.md)
29. [Docker 部署配置](rest-auth/docker-deployment.md)
30. [项目总结与最佳实践](rest-auth/summary.md)

---

### 第三部分：实时聊天应用

31. [项目概述与功能设计](chat-app/overview.md)
32. [Socket.io 服务端搭建](chat-app/socketio-setup.md)
33. [连接管理与用户状态](chat-app/connection-management.md)
34. [房间系统实现](chat-app/room-system.md)
35. [消息发送与接收](chat-app/message-handling.md)
36. [私聊功能实现](chat-app/private-messaging.md)
37. [消息持久化：MongoDB](chat-app/message-persistence.md)
38. [历史消息加载](chat-app/message-history.md)
39. [用户在线状态管理](chat-app/online-status.md)
40. [消息已读状态](chat-app/read-receipts.md)
41. [文件与图片发送](chat-app/file-sharing.md)
42. [Redis 适配器：多节点支持](chat-app/redis-adapter.md)
43. [前端集成示例](chat-app/frontend-integration.md)
44. [性能优化与压测](chat-app/performance.md)
45. [项目总结](chat-app/summary.md)

---

### 第四部分：任务调度系统

46. [项目概述与需求分析](task-scheduler/overview.md)
47. [BullMQ 入门与配置](task-scheduler/bullmq-setup.md)
48. [任务定义与队列设计](task-scheduler/queue-design.md)
49. [即时任务处理](task-scheduler/immediate-tasks.md)
50. [延迟任务实现](task-scheduler/delayed-tasks.md)
51. [定时任务(Cron)配置](task-scheduler/cron-tasks.md)
52. [任务重试与退避策略](task-scheduler/retry-backoff.md)
53. [任务优先级](task-scheduler/task-priority.md)
54. [任务进度追踪](task-scheduler/progress-tracking.md)
55. [任务结果存储](task-scheduler/result-storage.md)
56. [死信队列处理](task-scheduler/dead-letter-queue.md)
57. [分布式锁实现](task-scheduler/distributed-lock.md)
58. [任务监控仪表盘](task-scheduler/monitoring-dashboard.md)
59. [API 接口设计](task-scheduler/api-design.md)
60. [项目总结](task-scheduler/summary.md)

---

### 第五部分：文件服务

61. [项目概述与功能规划](file-service/overview.md)
62. [Fastify 项目搭建](file-service/fastify-setup.md)
63. [基础文件上传](file-service/basic-upload.md)
64. [大文件分片上传](file-service/chunked-upload.md)
65. [断点续传实现](file-service/resume-upload.md)
66. [文件合并与校验](file-service/merge-verify.md)
67. [文件下载与范围请求](file-service/download-range.md)
68. [图片处理：Sharp 集成](file-service/image-processing.md)
69. [缩略图生成](file-service/thumbnails.md)
70. [文件元数据管理](file-service/metadata.md)
71. [存储抽象：本地与云存储](file-service/storage-abstraction.md)
72. [AWS S3 集成](file-service/aws-s3.md)
73. [阿里云 OSS 集成](file-service/aliyun-oss.md)
74. [CDN 集成与缓存](file-service/cdn-caching.md)
75. [访问控制与签名 URL](file-service/access-control.md)
76. [项目总结](file-service/summary.md)

---

### 第六部分：博客内容管理系统

77. [项目概述与系统设计](blog-cms/overview.md)
78. [NestJS 项目架构](blog-cms/nestjs-architecture.md)
79. [用户模块实现](blog-cms/user-module.md)
80. [文章模块：CRUD 操作](blog-cms/article-crud.md)
81. [Markdown 解析与渲染](blog-cms/markdown-rendering.md)
82. [分类与标签系统](blog-cms/categories-tags.md)
83. [评论系统实现](blog-cms/comments.md)
84. [全文搜索：Elasticsearch](blog-cms/elasticsearch.md)
85. [图片上传与管理](blog-cms/image-management.md)
86. [草稿与发布状态](blog-cms/draft-publish.md)
87. [访问统计与分析](blog-cms/analytics.md)
88. [RSS 订阅生成](blog-cms/rss-feed.md)
89. [SEO 优化实践](blog-cms/seo.md)
90. [管理后台 API](blog-cms/admin-api.md)
91. [部署与运维](blog-cms/deployment.md)
92. [项目总结与系列回顾](blog-cms/summary.md)

---

