# 代码质量与测试工程

构建完善的代码质量保障体系，掌握自动化测试的策略与实践。

- [序言](index.md)

---

### 第一部分：代码质量体系

1. [代码质量的定义与度量](quality-system/quality-definition.md)
2. [代码质量指标体系设计](quality-system/quality-metrics.md)
3. [技术债务的识别与量化](quality-system/technical-debt.md)
4. [代码质量改进策略](quality-system/improvement-strategy.md)

---

### 第二部分：ESLint 深度解析

5. [ESLint 架构设计](eslint/architecture.md)
6. [ESLint 规则引擎原理](eslint/rule-engine.md)
7. [ESLint 解析器详解](eslint/parsers.md)
8. [ESLint 规则开发基础](eslint/rule-development-basics.md)
9. [ESLint 规则开发进阶](eslint/rule-development-advanced.md)
10. [ESLint 共享配置设计](eslint/shared-config.md)
11. [ESLint 插件开发实战](eslint/plugin-development.md)
12. [ESLint Flat Config 详解](eslint/flat-config.md)

---

### 第三部分：TypeScript 工程化

13. [TypeScript 编译配置详解](typescript/tsconfig-deep-dive.md)
14. [TypeScript 严格模式策略](typescript/strict-mode.md)
15. [TypeScript 类型检查优化](typescript/type-checking-optimization.md)
16. [TypeScript 增量编译](typescript/incremental-compilation.md)
17. [TypeScript 项目引用](typescript/project-references.md)
18. [TypeScript 与 ESLint 集成](typescript/eslint-integration.md)

---

### 第四部分：代码风格与规范

19. [Prettier 原理与配置](formatting/prettier-internals.md)
20. [Prettier 与 ESLint 协作](formatting/prettier-eslint.md)
21. [Stylelint 配置与实践](formatting/stylelint.md)
22. [EditorConfig 统一编辑器配置](formatting/editorconfig.md)
23. [代码风格规范设计](formatting/style-guide-design.md)
24. [代码复杂度分析](formatting/complexity-analysis.md)
25. [代码重复检测](formatting/duplication-detection.md)

---

### 第五部分：Git 工作流与自动化

26. [Git Hooks 机制详解](git-workflow/git-hooks.md)
27. [Husky 配置与使用](git-workflow/husky.md)
28. [lint-staged 增量检查](git-workflow/lint-staged.md)
29. [Commitlint 提交规范](git-workflow/commitlint.md)
30. [Conventional Commits 规范](git-workflow/conventional-commits.md)
31. [Changelog 自动生成](git-workflow/changelog-generation.md)
32. [语义化版本控制](git-workflow/semantic-versioning.md)

---

### 第六部分：测试策略与基础

33. [前端测试策略概述](testing-fundamentals/testing-strategy.md)
34. [测试金字塔与测试钻石](testing-fundamentals/test-pyramid.md)
35. [测试类型与适用场景](testing-fundamentals/test-types.md)
36. [测试驱动开发 (TDD)](testing-fundamentals/tdd.md)
37. [行为驱动开发 (BDD)](testing-fundamentals/bdd.md)
38. [测试覆盖率详解](testing-fundamentals/coverage.md)

---

### 第七部分：Jest 深度解析

39. [Jest 架构设计](jest/architecture.md)
40. [Jest 配置详解](jest/configuration.md)
41. [Jest 匹配器系统](jest/matchers.md)
42. [Jest Mock 机制](jest/mocking.md)
43. [Jest 异步测试](jest/async-testing.md)
44. [Jest 快照测试](jest/snapshot-testing.md)
45. [Jest 并行与隔离](jest/parallelization.md)
46. [Jest 自定义匹配器](jest/custom-matchers.md)
47. [Jest 性能优化](jest/performance.md)

---

### 第八部分：Vitest 与现代测试

48. [Vitest 设计理念](vitest/design-philosophy.md)
49. [Vitest 配置与迁移](vitest/configuration-migration.md)
50. [Vitest 与 Vite 集成](vitest/vite-integration.md)
51. [Vitest 浏览器模式](vitest/browser-mode.md)
52. [Vitest 组件测试](vitest/component-testing.md)

---

### 第九部分：组件测试

53. [组件测试原则](component-testing/testing-principles.md)
54. [Testing Library 核心理念](component-testing/testing-library-philosophy.md)
55. [React Testing Library 实战](component-testing/react-testing-library.md)
56. [Vue Testing Library 实战](component-testing/vue-testing-library.md)
57. [用户事件模拟](component-testing/user-events.md)
58. [异步组件测试](component-testing/async-components.md)
59. [Hooks 测试策略](component-testing/hooks-testing.md)
60. [组件 Mock 策略](component-testing/component-mocking.md)

---

### 第十部分：E2E 测试

61. [E2E 测试策略](e2e/e2e-strategy.md)
62. [Playwright 架构设计](e2e/playwright-architecture.md)
63. [Playwright 定位器详解](e2e/playwright-locators.md)
64. [Playwright 交互操作](e2e/playwright-interactions.md)
65. [Playwright 断言与等待](e2e/playwright-assertions.md)
66. [Playwright 网络拦截](e2e/playwright-network.md)
67. [Playwright 视觉测试](e2e/playwright-visual.md)
68. [Playwright 最佳实践](e2e/playwright-best-practices.md)
69. [Cypress 核心概念](e2e/cypress-core.md)
70. [Cypress vs Playwright 对比](e2e/cypress-playwright-comparison.md)

---

### 第十一部分：视觉回归测试

71. [视觉回归测试概述](visual-testing/overview.md)
72. [Chromatic 实战](visual-testing/chromatic.md)
73. [Percy 实战](visual-testing/percy.md)
74. [本地视觉回归方案](visual-testing/local-visual-testing.md)
75. [视觉测试最佳实践](visual-testing/best-practices.md)

---

### 第十二部分：CI/CD 工程

76. [CI/CD 架构设计原则](cicd/architecture-principles.md)
77. [GitHub Actions 深度实践](cicd/github-actions.md)
78. [GitHub Actions 自定义 Action](cicd/custom-actions.md)
79. [GitLab CI 深度实践](cicd/gitlab-ci.md)
80. [构建流水线设计](cicd/pipeline-design.md)
81. [自动化代码审查集成](cicd/automated-review.md)
82. [测试并行化策略](cicd/test-parallelization.md)
83. [制品管理与发布](cicd/artifact-release.md)

---

### 第十三部分：Monorepo 工程化

84. [Monorepo 架构设计](monorepo/architecture.md)
85. [Monorepo 工具对比](monorepo/tools-comparison.md)
86. [Nx 核心概念](monorepo/nx-concepts.md)
87. [Nx 任务编排与缓存](monorepo/nx-task-caching.md)
88. [Nx 远程缓存](monorepo/nx-remote-cache.md)
89. [Turborepo 核心概念](monorepo/turborepo-concepts.md)
90. [Turborepo 管道配置](monorepo/turborepo-pipeline.md)
91. [pnpm Workspace 详解](monorepo/pnpm-workspace.md)
92. [Monorepo 依赖管理策略](monorepo/dependency-strategy.md)
93. [Monorepo CI/CD 最佳实践](monorepo/cicd-practices.md)
94. [Monorepo 迁移指南](monorepo/migration-guide.md)

---

### 第十四部分：实战与总结

95. [实战：构建团队级质量体系](practice/team-quality-system.md)
96. [实战：测试基础设施建设](practice/test-infrastructure.md)
97. [实战：遗留项目测试改造](practice/legacy-testing.md)
98. [总结：质量工程师的能力矩阵](practice/quality-engineer-skills.md)
