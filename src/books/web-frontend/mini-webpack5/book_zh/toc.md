# Mini-Webpack 5：从零实现现代模块打包器

本书将带你从零开始，一步步实现一个功能完备的 Webpack 5 模块打包器。通过源码级的深度剖析，你将彻底掌握现代前端构建工具的核心原理与设计哲学。

- [序言](index.md)

---

### 第一部分：基础概念与环境准备 (Foundations)

1. [Webpack 概览与核心概念](foundations/overview.md)
2. [模块化发展历程：从 IIFE 到 ESM](foundations/module-history.md)
3. [Webpack 5 新特性概览](foundations/webpack5-features.md)
4. [Tapable 事件系统入门](foundations/tapable-intro.md)
5. [开发环境搭建与项目结构](foundations/dev-environment.md)
6. [Webpack 源码结构导读](foundations/source-structure.md)

---

### 第二部分：Tapable 事件系统 (Tapable Event System)

7. [Tapable 设计理念与架构](tapable/design-philosophy.md)
8. [SyncHook 实现：同步钩子](tapable/sync-hook.md)
9. [SyncBailHook 实现：熔断钩子](tapable/sync-bail-hook.md)
10. [SyncWaterfallHook 实现：瀑布流钩子](tapable/sync-waterfall-hook.md)
11. [SyncLoopHook 实现：循环钩子](tapable/sync-loop-hook.md)
12. [AsyncParallelHook 实现：异步并行钩子](tapable/async-parallel-hook.md)
13. [AsyncSeriesHook 实现：异步串行钩子](tapable/async-series-hook.md)
14. [AsyncSeriesBailHook 实现](tapable/async-series-bail-hook.md)
15. [AsyncSeriesWaterfallHook 实现](tapable/async-series-waterfall-hook.md)
16. [HookMap 与 MultiHook 实现](tapable/hook-map-multi-hook.md)
17. [Interception 拦截器机制](tapable/interception.md)

---

### 第三部分：Compiler 核心 (Compiler Core)

18. [Compiler 类设计与职责](compiler/design.md)
19. [配置解析与标准化](compiler/configuration.md)
20. [Compiler Hooks 体系](compiler/hooks.md)
21. [run 方法实现：启动编译流程](compiler/run.md)
22. [watch 方法实现：监听模式](compiler/watch.md)
23. [createCompilation 方法实现](compiler/create-compilation.md)
24. [compile 方法实现：编译入口](compiler/compile.md)
25. [ContextModuleFactory 上下文模块工厂](compiler/context-module-factory.md)

---

### 第四部分：Compilation 核心 (Compilation Core)

26. [Compilation 类设计与职责](compilation/design.md)
27. [Compilation Hooks 体系](compilation/hooks.md)
28. [ModuleGraph 模块依赖图](compilation/module-graph.md)
29. [ChunkGraph 代码块依赖图](compilation/chunk-graph.md)
30. [addEntry 方法：入口添加](compilation/add-entry.md)
31. [factorizeModule 方法：模块工厂化](compilation/factorize-module.md)
32. [buildModule 方法：模块构建](compilation/build-module.md)
33. [processModuleDependencies 方法：依赖处理](compilation/process-dependencies.md)

---

### 第五部分：模块系统 (Module System)

34. [Module 基类设计](module/base-class.md)
35. [NormalModule 实现：普通模块](module/normal-module.md)
36. [模块类型与 ModuleType](module/module-type.md)
37. [模块标识符与 Identifier](module/identifier.md)
38. [模块构建流程详解](module/build-process.md)
39. [Source 与 SourceMap 处理](module/source-map.md)
40. [模块缓存机制](module/cache.md)
41. [ContextModule 实现](module/context-module.md)
42. [ExternalModule 外部模块](module/external-module.md)

---

### 第六部分：模块工厂 (Module Factory)

43. [NormalModuleFactory 设计](factory/normal-module-factory.md)
44. [ModuleFactory Hooks 体系](factory/hooks.md)
45. [create 方法实现](factory/create.md)
46. [resolve 方法与模块解析](factory/resolve.md)
47. [Loader 匹配与应用](factory/loader-matching.md)
48. [Parser 选择与创建](factory/parser-selection.md)
49. [Generator 选择与创建](factory/generator-selection.md)

---

### 第七部分：Resolver 模块解析器 (Resolver)

50. [Resolver 设计理念](resolver/design.md)
51. [enhanced-resolve 核心原理](resolver/enhanced-resolve.md)
52. [ResolverFactory 实现](resolver/resolver-factory.md)
53. [解析算法与查找策略](resolver/algorithm.md)
54. [别名 (alias) 解析](resolver/alias.md)
55. [extensions 与 mainFields 处理](resolver/extensions-mainfields.md)
56. [resolve 配置项完整解析](resolver/configuration.md)
57. [exports 与 imports 字段支持](resolver/exports-imports.md)
58. [conditionNames 条件名称匹配](resolver/condition-names.md)
59. [fallback 回退与 Node.js Polyfill](resolver/fallback.md)
60. [resolveLoader Loader 解析配置](resolver/resolve-loader.md)

---

### 第八部分：Loader 系统 (Loader System)

61. [Loader 设计理念与架构](loader/design.md)
62. [loader-runner 核心实现](loader/loader-runner.md)
63. [Loader 执行顺序与管道](loader/execution-order.md)
64. [Normal Loader 实现](loader/normal-loader.md)
65. [Pitching Loader 实现](loader/pitching-loader.md)
66. [Loader Context 上下文对象](loader/loader-context.md)
67. [Raw Loader 与 Buffer 处理](loader/raw-loader.md)
68. [Loader 缓存与性能优化](loader/cache.md)
69. [Inline Loader 语法解析](loader/inline-loader.md)

---

### 第九部分：Parser 语法解析器 (Parser)

70. [JavascriptParser 设计](parser/design.md)
71. [AST 解析与 Acorn 集成](parser/acorn.md)
72. [Parser Hooks 体系](parser/hooks.md)
73. [import/export 语句解析](parser/import-export.md)
74. [require 语句解析](parser/require.md)
75. [动态 import() 解析](parser/dynamic-import.md)
76. [Dependency 依赖对象创建](parser/dependency.md)
77. [作用域分析与变量追踪](parser/scope-analysis.md)
78. [Magic Comments 解析](parser/magic-comments.md)
79. [Top-Level Await 顶层 await 支持](parser/top-level-await.md)
80. [new Worker() 语法解析](parser/worker-syntax.md)

---

### 第十部分：Dependency 依赖系统 (Dependency System)

81. [Dependency 基类设计](dependency/base-class.md)
82. [ModuleDependency 模块依赖](dependency/module-dependency.md)
83. [HarmonyImportDependency ESM 导入依赖](dependency/harmony-import.md)
84. [HarmonyExportDependency ESM 导出依赖](dependency/harmony-export.md)
85. [CommonJsRequireDependency CJS 依赖](dependency/commonjs-require.md)
86. [DependencyTemplate 模板系统](dependency/template.md)
87. [DependencyReference 引用追踪](dependency/reference.md)

---

### 第十一部分：Externals 外部化系统 (Externals System)

88. [Externals 设计理念与使用场景](externals/design.md)
89. [ExternalsPlugin 实现](externals/externals-plugin.md)
90. [外部化类型：var/commonjs/amd/umd](externals/types.md)
91. [函数形式的 externals 配置](externals/function-externals.md)
92. [正则表达式匹配外部模块](externals/regex-externals.md)

---

### 第十二部分：Chunk 代码块系统 (Chunk System)

93. [Chunk 设计与职责](chunk/design.md)
94. [ChunkGroup 代码块组](chunk/chunk-group.md)
95. [Entrypoint 入口点](chunk/entrypoint.md)
96. [seal 方法：封装阶段](chunk/seal.md)
97. [Chunk 创建与分配](chunk/creation.md)
98. [模块到 Chunk 的映射](chunk/module-mapping.md)
99. [Chunk 之间的连接关系](chunk/connections.md)

---

### 第十三部分：代码分割 (Code Splitting)

100. [代码分割原理概述](code-splitting/overview.md)
101. [SplitChunksPlugin 设计](code-splitting/split-chunks-plugin.md)
102. [Chunk 分割算法](code-splitting/algorithm.md)
103. [cacheGroups 配置解析](code-splitting/cache-groups.md)
104. [动态导入与按需加载](code-splitting/dynamic-import.md)
105. [Runtime Chunk 运行时分离](code-splitting/runtime-chunk.md)
106. [minSize/maxSize 限制策略](code-splitting/size-limits.md)

---

### 第十四部分：优化阶段 (Optimization Phase)

107. [优化阶段概述](optimization/overview.md)
108. [optimizeModules 模块优化](optimization/optimize-modules.md)
109. [optimizeChunks 代码块优化](optimization/optimize-chunks.md)
110. [Tree Shaking 原理与实现](optimization/tree-shaking.md)
111. [usedExports 分析](optimization/used-exports.md)
112. [sideEffects 副作用处理](optimization/side-effects.md)
113. [Scope Hoisting 作用域提升](optimization/scope-hoisting.md)
114. [Module Concatenation 模块合并](optimization/module-concatenation.md)
115. [TerserPlugin 与代码压缩集成](optimization/terser-plugin.md)

---

### 第十五部分：代码生成 (Code Generation)

116. [代码生成阶段概述](code-gen/overview.md)
117. [Generator 基类设计](code-gen/generator.md)
118. [JavascriptGenerator 实现](code-gen/javascript-generator.md)
119. [Template 模板系统](code-gen/template.md)
120. [RuntimeModule 运行时模块](code-gen/runtime-module.md)
121. [__webpack_require__ 实现](code-gen/webpack-require.md)
122. [__webpack_modules__ 模块注册表](code-gen/webpack-modules.md)
123. [__webpack_chunk_load__ 懒加载](code-gen/chunk-load.md)
124. [Hash 计算与内容哈希](code-gen/hash.md)

---

### 第十六部分：资源输出 (Asset Output)

125. [资源输出阶段概述](output/overview.md)
126. [createAssets 资源创建](output/create-assets.md)
127. [emitAssets 资源写入](output/emit-assets.md)
128. [webpack-sources 库解析](output/webpack-sources.md)
129. [Source 合并与优化](output/source-concat.md)
130. [SourceMap 生成策略](output/sourcemap.md)
131. [文件名模板与占位符](output/filename-template.md)
132. [output.library 库模式配置](output/library-output.md)
133. [libraryTarget 与 UMD 输出](output/library-target.md)

---

### 第十七部分：Plugin 系统 (Plugin System)

134. [Plugin 设计理念与架构](plugin/design.md)
135. [Plugin 接口规范](plugin/interface.md)
136. [apply 方法与钩子注册](plugin/apply.md)
137. [Compiler 生命周期钩子](plugin/compiler-lifecycle.md)
138. [Compilation 生命周期钩子](plugin/compilation-lifecycle.md)
139. [实战：BannerPlugin 实现](plugin/banner-plugin.md)
140. [实战：HtmlWebpackPlugin 原理](plugin/html-webpack-plugin.md)
141. [实战：DefinePlugin 实现](plugin/define-plugin.md)
142. [实战：ProgressPlugin 实现](plugin/progress-plugin.md)
143. [实战：ProvidePlugin 自动注入模块](plugin/provide-plugin.md)
144. [实战：IgnorePlugin 忽略模块](plugin/ignore-plugin.md)
145. [实战：ContextReplacementPlugin](plugin/context-replacement-plugin.md)

---

### 第十八部分：完整实现与整合 (Complete Implementation)

146. [完整版 Mini-Webpack 实现](complete/full-implementation.md)
147. [构建流程完整串联](complete/build-process.md)
148. [与官方 Webpack 5 对比分析](complete/comparison.md)
149. [性能考量与优化策略](complete/performance.md)
150. [总结与进阶方向](complete/conclusion.md)

---

### 附录 (Appendix)

151. [Webpack 5 配置项完整参考](appendix/configuration.md)
152. [Stats 统计信息详解](appendix/stats.md)
153. [Watch Mode 与增量编译](appendix/watch-mode.md)
154. [Module Federation 模块联邦概述](appendix/module-federation.md)
155. [Persistent Caching 持久化缓存](appendix/persistent-cache.md)
156. [Asset Modules 资源模块](appendix/asset-modules.md)
157. [WebAssembly 支持](appendix/webassembly.md)
158. [Node.js 目标环境支持](appendix/node-target.md)
159. [Hot Module Replacement 原理](appendix/hmr.md)
160. [DevServer 开发服务器概述](appendix/dev-server.md)
161. [TypeScript 类型定义](appendix/typescript.md)
162. [常见问题与解决方案](appendix/faq.md)
