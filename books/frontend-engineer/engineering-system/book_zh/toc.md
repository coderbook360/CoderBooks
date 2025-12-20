# 前端工程化体系: 从工具使用者到体系设计者

本书将帮助你从"会用工具"升级为"能设计工程化体系"，掌握现代前端工程化的核心能力。

- [序言](preface.md)

---

### 第一部分：工程化思维与全局视野

1. [什么是前端工程化](foundations/what-is-engineering.md)
2. [工程化的演进历程](foundations/evolution.md)
3. [现代前端工程化体系全景](foundations/landscape.md)
4. [工程化思维：从手工作坊到流水线](foundations/mindset.md)
5. [技术选型方法论](foundations/tech-selection.md)

---

### 第二部分：模块化与依赖管理

6. [JavaScript模块化演进史](modules/history.md)
7. [CommonJS规范详解](modules/commonjs.md)
8. [ES Modules规范详解](modules/esm.md)
9. [ESM与CJS互操作](modules/esm-cjs-interop.md)
10. [npm原理与最佳实践](modules/npm-deep-dive.md)
11. [package.json全字段解析](modules/package-json.md)
12. [pnpm原理与workspace](modules/pnpm.md)
13. [依赖版本管理策略](modules/version-strategy.md)
14. [依赖安全审计与治理](modules/security-audit.md)
15. [私有npm仓库搭建](modules/private-registry.md)

---

### 第三部分：构建工具深度剖析

16. [构建工具演进与对比](build-tools/evolution.md)
17. [Webpack核心概念](build-tools/webpack-core.md)
18. [Webpack Loader原理与开发](build-tools/webpack-loader.md)
19. [Webpack Plugin原理与开发](build-tools/webpack-plugin.md)
20. [Webpack构建优化实战](build-tools/webpack-optimization.md)
21. [Vite核心原理](build-tools/vite-core.md)
22. [Vite插件开发](build-tools/vite-plugin.md)
23. [Vite vs Webpack深度对比](build-tools/vite-vs-webpack.md)
24. [Rollup原理与库打包](build-tools/rollup.md)
25. [esbuild原理与应用](build-tools/esbuild.md)
26. [SWC原理与应用](build-tools/swc.md)
27. [Turbopack与新一代构建工具](build-tools/turbopack.md)

---

### 第四部分：代码质量与规范体系

28. [代码规范设计原则](code-quality/principles.md)
29. [ESLint深度配置与规则开发](code-quality/eslint-deep.md)
30. [Prettier与代码格式化](code-quality/prettier.md)
31. [TypeScript严格配置策略](code-quality/typescript-strict.md)
32. [Stylelint与CSS规范](code-quality/stylelint.md)
33. [Commitlint与提交规范](code-quality/commitlint.md)
34. [Husky与Git Hooks](code-quality/husky.md)
35. [lint-staged优化提交检查](code-quality/lint-staged.md)
36. [代码规范的落地与治理](code-quality/governance.md)

---

### 第五部分：自动化测试体系

37. [测试策略与测试金字塔](testing/strategy.md)
38. [单元测试：Jest深度使用](testing/jest.md)
39. [单元测试：Vitest与现代方案](testing/vitest.md)
40. [组件测试：Testing Library](testing/testing-library.md)
41. [E2E测试：Playwright实战](testing/playwright.md)
42. [E2E测试：Cypress实战](testing/cypress.md)
43. [可视化回归测试](testing/visual-regression.md)
44. [测试覆盖率与质量门禁](testing/coverage.md)
45. [Mock策略与实践](testing/mocking.md)
46. [测试驱动开发(TDD)实践](testing/tdd.md)

---

### 第六部分：CI/CD与自动化流水线

47. [CI/CD核心概念](cicd/concepts.md)
48. [GitHub Actions实战](cicd/github-actions.md)
49. [GitLab CI实战](cicd/gitlab-ci.md)
50. [Jenkins与企业级CI](cicd/jenkins.md)
51. [自动化构建流水线设计](cicd/pipeline-design.md)
52. [自动化测试集成](cicd/test-integration.md)
53. [自动化部署策略](cicd/deployment-strategy.md)
54. [环境管理与配置](cicd/environment-management.md)
55. [灰度发布与蓝绿部署](cicd/gray-release.md)
56. [回滚机制设计](cicd/rollback.md)

---

### 第七部分：Monorepo架构

57. [Monorepo vs Multirepo](monorepo/comparison.md)
58. [Monorepo工具选型](monorepo/tools.md)
59. [pnpm workspace实战](monorepo/pnpm-workspace.md)
60. [Turborepo原理与实战](monorepo/turborepo.md)
61. [Nx原理与实战](monorepo/nx.md)
62. [Lerna使用与迁移](monorepo/lerna.md)
63. [Monorepo依赖管理](monorepo/dependency-management.md)
64. [Monorepo构建优化](monorepo/build-optimization.md)
65. [Monorepo版本发布策略](monorepo/versioning.md)
66. [大型Monorepo实践案例](monorepo/case-study.md)

---

### 第八部分：微前端架构

67. [微前端概念与适用场景](micro-frontend/concepts.md)
68. [微前端技术方案对比](micro-frontend/solutions.md)
69. [qiankun原理与实战](micro-frontend/qiankun.md)
70. [Module Federation原理](micro-frontend/module-federation.md)
71. [Module Federation实战](micro-frontend/mf-practice.md)
72. [iframe方案与优化](micro-frontend/iframe.md)
73. [微前端通信机制](micro-frontend/communication.md)
74. [微前端样式隔离](micro-frontend/style-isolation.md)
75. [微前端JS沙箱](micro-frontend/js-sandbox.md)
76. [微前端部署与运维](micro-frontend/deployment.md)

---

### 第九部分：前端监控与可观测性

77. [前端监控体系设计](monitoring/system-design.md)
78. [错误监控与上报](monitoring/error-tracking.md)
79. [性能监控指标设计](monitoring/performance-metrics.md)
80. [用户行为追踪](monitoring/user-tracking.md)
81. [SourceMap与错误定位](monitoring/sourcemap.md)
82. [Sentry实战与定制](monitoring/sentry.md)
83. [自研监控SDK设计](monitoring/custom-sdk.md)
84. [数据分析与告警](monitoring/alerting.md)
85. [APM与全链路追踪](monitoring/apm.md)

---

### 第十部分：工程化实战与综合案例

86. [从零搭建企业级工程化体系](practice/enterprise-setup.md)
87. [大型项目架构设计](practice/large-project.md)
88. [遗留项目工程化改造](practice/legacy-refactor.md)
89. [开源项目工程化实践](practice/open-source.md)
90. [工程化体系的持续演进](practice/continuous-evolution.md)

---
