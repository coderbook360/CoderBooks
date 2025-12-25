# 构建工具原理与实践

深入理解前端构建工具的核心原理，掌握 Webpack、Vite 等工具的内部机制与插件开发。

- [序言](index.md)

---

### 第一部分：模块化体系

1. [JavaScript 模块化演进史](module-system/evolution-history.md)
2. [CommonJS 规范详解](module-system/commonjs-spec.md)
3. [CommonJS 在 Node.js 中的实现](module-system/commonjs-node.md)
4. [ES Modules 规范详解](module-system/esm-spec.md)
5. [ES Modules 在浏览器中的实现](module-system/esm-browser.md)
6. [ES Modules 在 Node.js 中的实现](module-system/esm-node.md)
7. [CommonJS 与 ES Modules 互操作](module-system/cjs-esm-interop.md)
8. [模块解析算法详解](module-system/module-resolution.md)
9. [动态导入与代码分割](module-system/dynamic-import.md)

---

### 第二部分：包管理深度解析

10. [npm 架构与核心概念](package-management/npm-architecture.md)
11. [npm 依赖解析算法](package-management/npm-resolution.md)
12. [npm 安装机制详解](package-management/npm-install.md)
13. [yarn 设计理念与架构](package-management/yarn-design.md)
14. [yarn PnP 模式详解](package-management/yarn-pnp.md)
15. [pnpm 原理：硬链接与内容寻址](package-management/pnpm-internals.md)
16. [包管理器性能对比](package-management/manager-benchmark.md)
17. [依赖版本策略与锁文件](package-management/versioning-lock.md)
18. [依赖安全与漏洞扫描](package-management/security-audit.md)
19. [私有 npm 仓库搭建](package-management/private-registry.md)

---

### 第三部分：Webpack 核心原理

20. [Webpack 架构设计概览](webpack/architecture-overview.md)
21. [Webpack 编译流程详解](webpack/compilation-flow.md)
22. [Webpack 模块解析机制](webpack/module-resolution.md)
23. [Webpack 依赖图构建](webpack/dependency-graph.md)
24. [Webpack 代码生成原理](webpack/code-generation.md)
25. [Webpack Runtime 详解](webpack/runtime-analysis.md)
26. [Webpack Loader 机制](webpack/loader-mechanism.md)
27. [Loader 开发实战](webpack/loader-development.md)
28. [Webpack Plugin 与 Tapable](webpack/plugin-tapable.md)
29. [Plugin 开发实战](webpack/plugin-development.md)
30. [Webpack HMR 原理](webpack/hmr-internals.md)
31. [Webpack 5 新特性详解](webpack/webpack5-features.md)
32. [Module Federation 原理](webpack/module-federation.md)

---

### 第四部分：Vite 核心原理

33. [Vite 设计理念与架构](vite/design-philosophy.md)
34. [Vite 开发服务器原理](vite/dev-server-internals.md)
35. [依赖预构建机制](vite/pre-bundling.md)
36. [Vite 模块热更新原理](vite/hmr-internals.md)
37. [Vite 插件机制详解](vite/plugin-mechanism.md)
38. [Vite 插件开发实战](vite/plugin-development.md)
39. [Vite 生产构建流程](vite/production-build.md)
40. [Vite 与 Rollup 的关系](vite/vite-rollup.md)
41. [Vite 性能优化策略](vite/performance-optimization.md)

---

### 第五部分：Rollup 与库构建

42. [Rollup 设计理念](rollup/design-philosophy.md)
43. [Rollup 打包原理](rollup/bundling-internals.md)
44. [Rollup 插件机制](rollup/plugin-mechanism.md)
45. [Rollup 插件开发](rollup/plugin-development.md)
46. [库构建最佳实践](rollup/library-bundling.md)
47. [多格式输出策略](rollup/multi-format-output.md)
48. [Tree Shaking 原理详解](rollup/tree-shaking.md)

---

### 第六部分：新一代编译工具

49. [esbuild 架构设计](new-tools/esbuild-architecture.md)
50. [esbuild 为何如此快](new-tools/esbuild-performance.md)
51. [esbuild 插件开发](new-tools/esbuild-plugins.md)
52. [SWC 架构设计](new-tools/swc-architecture.md)
53. [SWC 插件开发](new-tools/swc-plugins.md)
54. [Turbopack 设计理念](new-tools/turbopack-design.md)
55. [Rspack 架构分析](new-tools/rspack-architecture.md)
56. [构建工具选型决策](new-tools/tool-selection.md)

---

### 第七部分：编译与转译

57. [Babel 架构设计](compilation/babel-architecture.md)
58. [Babel 解析器原理](compilation/babel-parser.md)
59. [AST 详解与操作](compilation/ast-deep-dive.md)
60. [Babel 插件开发基础](compilation/babel-plugin-basics.md)
61. [Babel 插件开发进阶](compilation/babel-plugin-advanced.md)
62. [Babel 预设配置策略](compilation/babel-presets.md)
63. [Polyfill 策略详解](compilation/polyfill-strategies.md)
64. [TypeScript 编译器原理](compilation/typescript-compiler.md)
65. [PostCSS 架构与插件](compilation/postcss-architecture.md)
66. [Tailwind CSS 编译原理](compilation/tailwind-internals.md)

---

### 第八部分：开发体验工程

67. [开发服务器架构设计](dev-experience/dev-server-design.md)
68. [热模块替换完整原理](dev-experience/hmr-complete.md)
69. [Source Map 规范与原理](dev-experience/source-map-spec.md)
70. [Source Map 调试技巧](dev-experience/source-map-debugging.md)
71. [代理配置与跨域处理](dev-experience/proxy-cors.md)
72. [Mock 服务架构设计](dev-experience/mock-architecture.md)
73. [多环境配置管理](dev-experience/multi-environment.md)

---

### 第九部分：构建优化

74. [Bundle 分析方法论](optimization/bundle-analysis.md)
75. [代码分割策略详解](optimization/code-splitting.md)
76. [懒加载与预加载](optimization/lazy-preload.md)
77. [Tree Shaking 优化技巧](optimization/tree-shaking-tips.md)
78. [Scope Hoisting 原理](optimization/scope-hoisting.md)
79. [资源压缩与优化](optimization/asset-optimization.md)
80. [缓存策略设计](optimization/caching-strategies.md)
81. [构建速度优化](optimization/build-speed.md)
82. [构建缓存机制](optimization/build-cache.md)
83. [增量构建实现](optimization/incremental-build.md)

---

### 第十部分：实战与总结

84. [实战：从零实现一个打包器](practice/mini-bundler.md)
85. [实战：自定义 Webpack Loader](practice/custom-loader.md)
86. [实战：自定义 Vite 插件](practice/custom-vite-plugin.md)
87. [实战：构建配置抽象](practice/config-abstraction.md)
88. [总结：构建工具的未来趋势](practice/future-trends.md)
