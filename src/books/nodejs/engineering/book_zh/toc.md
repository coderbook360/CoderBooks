# Node.js工程化实践: 从开发到生产

构建专业的 Node.js 开发体系，实现持续集成与高质量交付。

- [序言](preface.md)

---

### 第一部分：TypeScript 工程化

1. [TypeScript 与 Node.js 概述](typescript/overview.md)
2. [tsconfig.json 配置详解](typescript/tsconfig.md)
3. [模块系统选择：CommonJS vs ESM](typescript/module-system.md)
4. [路径别名与模块解析](typescript/path-aliases.md)
5. [类型声明文件与 @types](typescript/type-declarations.md)
6. [Node.js 类型实践技巧](typescript/typing-practices.md)
7. [编译策略与构建工具](typescript/build-tools.md)
8. [tsx 与开发时编译](typescript/tsx-development.md)
9. [TypeScript 严格模式最佳实践](typescript/strict-mode.md)

---

### 第二部分：代码质量保障

10. [代码规范的价值与实施](code-quality/code-standards-value.md)
11. [ESLint 配置详解](code-quality/eslint-config.md)
12. [Prettier 代码格式化](code-quality/prettier.md)
13. [ESLint 与 Prettier 协作](code-quality/eslint-prettier.md)
14. [自定义 ESLint 规则](code-quality/custom-eslint-rules.md)
15. [Git Hooks 与 Husky](code-quality/husky-git-hooks.md)
16. [lint-staged 增量检查](code-quality/lint-staged.md)
17. [Commitlint 提交规范](code-quality/commitlint.md)
18. [代码审查最佳实践](code-quality/code-review.md)

---

### 第三部分：测试体系建设

19. [Node.js 测试策略概览](testing/testing-strategy.md)
20. [Vitest 入门与配置](testing/vitest-basics.md)
21. [Jest 入门与配置](testing/jest-basics.md)
22. [单元测试编写技巧](testing/unit-testing.md)
23. [异步代码测试](testing/async-testing.md)
24. [Mock 与 Stub 详解](testing/mocking.md)
25. [数据库测试策略](testing/database-testing.md)
26. [HTTP 接口测试：Supertest](testing/api-testing.md)
27. [集成测试设计](testing/integration-testing.md)
28. [E2E 测试入门](testing/e2e-testing.md)
29. [测试覆盖率与质量门禁](testing/coverage.md)
30. [测试驱动开发(TDD)实践](testing/tdd.md)
31. [快照测试](testing/snapshot-testing.md)
32. [性能测试与基准测试](testing/performance-testing.md)

---

### 第四部分：CI/CD 实践

33. [CI/CD 概念与价值](cicd/cicd-concepts.md)
34. [GitHub Actions 入门](cicd/github-actions-intro.md)
35. [工作流语法详解](cicd/workflow-syntax.md)
36. [Node.js 项目 CI 配置](cicd/nodejs-ci.md)
37. [矩阵构建与多版本测试](cicd/matrix-build.md)
38. [缓存优化构建速度](cicd/caching.md)
39. [密钥与环境变量管理](cicd/secrets-management.md)
40. [自动化发布到 npm](cicd/npm-publish.md)
41. [自动化版本管理：semantic-release](cicd/semantic-release.md)
42. [Docker 镜像构建与推送](cicd/docker-build-push.md)
43. [自动化部署流程](cicd/automated-deployment.md)
44. [质量门禁与强制检查](cicd/quality-gates.md)

---

### 第五部分：容器化与部署

45. [Docker 基础回顾](deployment/docker-basics.md)
46. [Node.js Dockerfile 最佳实践](deployment/dockerfile-best-practices.md)
47. [多阶段构建优化镜像](deployment/multi-stage-build.md)
48. [Docker Compose 本地开发](deployment/docker-compose.md)
49. [PM2 进程管理详解](deployment/pm2-deep-dive.md)
50. [PM2 集群模式与负载均衡](deployment/pm2-cluster.md)
51. [优雅启停与零停机部署](deployment/graceful-shutdown.md)
52. [传统服务器部署指南](deployment/traditional-deployment.md)
53. [云平台部署：AWS、GCP、Azure](deployment/cloud-deployment.md)
54. [Serverless 部署入门](deployment/serverless.md)
55. [Kubernetes 入门与实践](deployment/kubernetes-intro.md)

---

### 第六部分：日志与监控

56. [日志设计原则](logging/logging-principles.md)
57. [console 的局限性](logging/console-limitations.md)
58. [Winston 日志框架](logging/winston.md)
59. [Pino 高性能日志](logging/pino.md)
60. [结构化日志与 JSON](logging/structured-logging.md)
61. [日志级别与分类策略](logging/log-levels.md)
62. [请求追踪与关联 ID](logging/correlation-id.md)
63. [日志聚合与分析](logging/log-aggregation.md)
64. [健康检查端点设计](monitoring/health-checks.md)
65. [指标收集与 Prometheus](monitoring/prometheus.md)
66. [APM 接入：New Relic、Datadog](monitoring/apm.md)
67. [告警设计与实现](monitoring/alerting.md)
68. [生产环境问题诊断](monitoring/production-debugging.md)

---

### 第七部分：配置与环境管理

69. [配置管理原则](config/config-principles.md)
70. [环境变量最佳实践](config/environment-variables.md)
71. [dotenv 与配置文件](config/dotenv.md)
72. [多环境配置管理](config/multi-environment.md)
73. [配置验证与类型安全](config/config-validation.md)
74. [密钥管理策略](config/secrets-management.md)
75. [功能开关与特性标记](config/feature-flags.md)
76. [配置中心入门](config/config-center.md)

---

### 第八部分：项目组织与协作

77. [项目目录结构规范](organization/project-structure.md)
78. [Monorepo 概念与选型](organization/monorepo-intro.md)
79. [Turborepo 实战](organization/turborepo.md)
80. [Nx 工作区管理](organization/nx.md)
81. [pnpm Workspace](organization/pnpm-workspace.md)
82. [共享代码与内部包](organization/internal-packages.md)
83. [版本管理策略](organization/versioning.md)
84. [CHANGELOG 自动生成](organization/changelog.md)
85. [发布流程规范](organization/release-process.md)
86. [团队协作规范](organization/team-collaboration.md)
87. [工程化总结与检查清单](organization/summary-checklist.md)

---

