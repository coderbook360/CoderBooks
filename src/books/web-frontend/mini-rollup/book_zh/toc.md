# Mini-Rollup：从零实现现代 ES 模块打包器

本书将带你从零开始，一步步实现一个功能完备的 Rollup 模块打包器。通过源码级的深度剖析，你将彻底掌握 ES 模块打包、Tree Shaking、代码分割等核心原理。

- [序言](index.md)

---

### 第一部分：基础概念与架构设计 (Foundations)

1. [Rollup 概览与设计哲学](foundations/overview.md)
2. [ES Module 标准深度解析](foundations/esm-spec.md)
3. [Rollup vs Webpack：设计理念对比](foundations/rollup-vs-webpack.md)
4. [Rollup 源码结构导读](foundations/source-structure.md)
5. [开发环境搭建与项目结构](foundations/dev-environment.md)
6. [构建流程整体架构](foundations/build-architecture.md)

---

### 第二部分：配置系统 (Configuration System)

7. [InputOptions 输入配置设计](config/input-options.md)
8. [OutputOptions 输出配置设计](config/output-options.md)
9. [external 外部模块配置](config/external.md)
10. [makeAbsoluteExternalsRelative 相对外部模块](config/make-absolute-externals-relative.md)
11. [output.format 输出格式详解](config/output-format.md)
12. [output.globals 全局变量映射](config/output-globals.md)
13. [output.name 导出名称配置](config/output-name.md)
14. [配置标准化与默认值处理](config/normalization.md)

---

### 第三部分：Graph 模块图构建 (Module Graph)

15. [Graph 类设计与职责](graph/design.md)
16. [入口解析与模块加载](graph/entry-resolution.md)
17. [ModuleLoader 模块加载器](graph/module-loader.md)
18. [模块依赖图构建](graph/dependency-graph.md)
19. [circular dependency 循环依赖检测](graph/circular-deps.md)
20. [模块元信息管理](graph/module-info.md)
21. [构建缓存机制](graph/cache.md)

---

### 第四部分：Plugin 插件系统 (Plugin System)

22. [Plugin 设计理念与架构](plugin/design.md)
23. [PluginDriver 插件驱动器](plugin/plugin-driver.md)
24. [插件 Hook 类型分类](plugin/hook-types.md)
25. [async/sync Hook 执行机制](plugin/async-sync.md)
26. [first/sequential/parallel Hook 执行策略](plugin/execution-strategy.md)
27. [PluginContext 插件上下文](plugin/context.md)
28. [this.resolve 模块解析](plugin/this-resolve.md)
29. [this.load 模块加载](plugin/this-load.md)
30. [this.emitFile 资源发射](plugin/this-emit-file.md)
31. [this.getModuleInfo 模块信息获取](plugin/this-get-module-info.md)
32. [this.parse AST 解析](plugin/this-parse.md)
33. [this.addWatchFile 监听文件](plugin/this-add-watch-file.md)

---

### 第五部分：Build Hooks 构建阶段钩子 (Build Hooks)

34. [Build Hooks 概述与流程图](build-hooks/overview.md)
35. [options Hook：配置预处理](build-hooks/options.md)
36. [buildStart Hook：构建开始](build-hooks/build-start.md)
37. [resolveId Hook：模块路径解析](build-hooks/resolve-id.md)
38. [load Hook：模块内容加载](build-hooks/load.md)
39. [transform Hook：代码转换](build-hooks/transform.md)
40. [moduleParsed Hook：模块解析完成](build-hooks/module-parsed.md)
41. [resolveDynamicImport Hook：动态导入解析](build-hooks/resolve-dynamic-import.md)
42. [buildEnd Hook：构建结束](build-hooks/build-end.md)
43. [closeWatcher Hook：监听器关闭](build-hooks/close-watcher.md)
44. [watchChange Hook：文件变更](build-hooks/watch-change.md)
45. [shouldTransformCachedModule Hook：缓存模块判断](build-hooks/should-transform-cached.md)

---

### 第六部分：AST 解析与分析 (AST Analysis)

46. [AST 解析器选择与集成](ast/parser.md)
47. [ESTree 标准与节点类型](ast/estree.md)
48. [import 语句解析](ast/import-analysis.md)
49. [export 语句解析](ast/export-analysis.md)
50. [动态 import() 解析](ast/dynamic-import.md)
51. [import.meta 处理](ast/import-meta.md)
52. [作用域分析与变量追踪](ast/scope-analysis.md)
53. [副作用检测与标记](ast/side-effect-detection.md)
54. [代码路径分析](ast/code-path-analysis.md)

---

### 第七部分：Module 模块系统 (Module System)

55. [Module 类设计与职责](module/design.md)
56. [模块类型与标识](module/types.md)
57. [ExternalModule 外部模块](module/external-module.md)
58. [模块元数据 meta](module/meta.md)
59. [moduleSideEffects 副作用标记](module/side-effects.md)
60. [syntheticNamedExports 合成命名导出](module/synthetic-exports.md)
61. [模块属性 attributes](module/attributes.md)

---

### 第八部分：Tree Shaking 实现 (Tree Shaking)

62. [Tree Shaking 原理概述](tree-shaking/overview.md)
63. [导出使用分析](tree-shaking/export-usage.md)
64. [usedExports 追踪](tree-shaking/used-exports.md)
65. [副作用分析与处理](tree-shaking/side-effects.md)
66. [treeshake.moduleSideEffects 配置](tree-shaking/module-side-effects.md)
67. [treeshake.propertyReadSideEffects 配置](tree-shaking/property-read.md)
68. [@__PURE__ 注解处理](tree-shaking/pure-annotation.md)
69. [manualPureFunctions 手动标记](tree-shaking/manual-pure-functions.md)
70. [死代码消除实现](tree-shaking/dead-code-elimination.md)
71. [treeshake.tryCatchDeoptimization 配置](tree-shaking/try-catch.md)

---

### 第九部分：Chunk 代码块生成 (Chunk Generation)

72. [Chunk 设计与职责](chunk/design.md)
73. [入口 Chunk 生成](chunk/entry-chunk.md)
74. [动态导入 Chunk 分离](chunk/dynamic-chunk.md)
75. [manualChunks 手动分块](chunk/manual-chunks.md)
76. [Chunk 命名策略](chunk/naming.md)
77. [chunkFileNames 模板配置](chunk/file-names.md)
78. [entryFileNames 入口命名](chunk/entry-file-names.md)
79. [preserveModules 保留模块结构](chunk/preserve-modules.md)
80. [inlineDynamicImports 内联动态导入](chunk/inline-dynamic-imports.md)
81. [preserveEntrySignatures 入口签名保留](chunk/preserve-signatures.md)

---

### 第十部分：Output Generation Hooks 输出阶段钩子 (Output Hooks)

82. [Output Hooks 概述与流程图](output-hooks/overview.md)
83. [outputOptions Hook：输出配置处理](output-hooks/output-options.md)
84. [renderStart Hook：渲染开始](output-hooks/render-start.md)
85. [renderDynamicImport Hook：动态导入渲染](output-hooks/render-dynamic-import.md)
86. [resolveImportMeta Hook：import.meta 解析](output-hooks/resolve-import-meta.md)
87. [resolveFileUrl Hook：文件 URL 解析](output-hooks/resolve-file-url.md)
88. [banner/footer Hook：头尾注入](output-hooks/banner-footer.md)
89. [intro/outro Hook：代码包裹](output-hooks/intro-outro.md)
90. [renderChunk Hook：代码块渲染](output-hooks/render-chunk.md)
91. [augmentChunkHash Hook：Hash 增强](output-hooks/augment-chunk-hash.md)
92. [generateBundle Hook：产物生成](output-hooks/generate-bundle.md)
93. [writeBundle Hook：产物写入](output-hooks/write-bundle.md)
94. [renderError Hook：渲染错误处理](output-hooks/render-error.md)
95. [closeBundle Hook：关闭资源](output-hooks/close-bundle.md)

---

### 第十一部分：代码生成 (Code Generation)

96. [代码生成整体架构](codegen/overview.md)
97. [ES Module 格式生成](codegen/format-es.md)
98. [CommonJS 格式生成](codegen/format-cjs.md)
99. [IIFE 格式生成](codegen/format-iife.md)
100. [UMD 格式生成](codegen/format-umd.md)
101. [AMD 格式生成](codegen/format-amd.md)
102. [SystemJS 格式生成](codegen/format-system.md)
103. [interop 互操作性处理](codegen/interop.md)
104. [命名空间对象生成](codegen/namespace-object.md)
105. [动态导入代码生成](codegen/dynamic-import-codegen.md)
106. [externalLiveBindings 外部活绑定](codegen/external-live-bindings.md)

---

### 第十二部分：SourceMap 生成 (SourceMap Generation)

107. [SourceMap 原理与格式](sourcemap/overview.md)
108. [MagicString 字符串操作库](sourcemap/magic-string.md)
109. [代码位置映射](sourcemap/position-mapping.md)
110. [多阶段 SourceMap 合并](sourcemap/combining.md)
111. [sourcemap 配置选项](sourcemap/options.md)
112. [sourcemapExcludeSources 排除源码](sourcemap/exclude-sources.md)
113. [sourcemapPathTransform 路径转换](sourcemap/path-transform.md)

---

### 第十三部分：Hash 与缓存 (Hashing & Caching)

114. [内容 Hash 计算原理](hash/content-hash.md)
115. [Hash 占位符机制](hash/placeholders.md)
116. [hashCharacters 字符集配置](hash/characters.md)
117. [Rollup 缓存机制设计](hash/cache-design.md)
118. [Watch 模式增量构建](hash/incremental-build.md)

---

### 第十四部分：资源处理 (Asset Handling)

119. [Asset 资源发射机制](assets/emit-asset.md)
120. [assetFileNames 资源命名](assets/file-names.md)
121. [import.meta.ROLLUP_FILE_URL 引用](assets/file-url.md)
122. [needsCodeReference 条件发射](assets/needs-reference.md)
123. [prebuilt-chunk 预构建块](assets/prebuilt-chunk.md)

---

### 第十五部分：Watch 模式 (Watch Mode)

124. [Watch 模式设计与实现](watch/design.md)
125. [Watcher 类实现](watch/watcher.md)
126. [chokidar 文件监听集成](watch/chokidar.md)
127. [watch 配置选项](watch/options.md)
128. [增量重建优化](watch/incremental-rebuild.md)

---

### 第十六部分：实战插件开发 (Plugin Development Practice)

129. [实战：Virtual Module Plugin](plugin-practice/virtual-module.md)
130. [实战：JSON Plugin](plugin-practice/json-plugin.md)
131. [实战：Node Resolve Plugin](plugin-practice/node-resolve.md)
132. [实战：CommonJS Plugin 原理](plugin-practice/commonjs.md)
133. [实战：Replace Plugin](plugin-practice/replace.md)
134. [实战：Terser Plugin 集成](plugin-practice/terser.md)
135. [实战：Alias Plugin](plugin-practice/alias.md)

---

### 第十七部分：完整实现与整合 (Complete Implementation)

136. [完整版 Mini-Rollup 实现](complete/full-implementation.md)
137. [JavaScript API 设计](complete/javascript-api.md)
138. [CLI 命令行工具实现](complete/cli.md)
139. [rollup.rollup() 构建流程](complete/rollup-rollup.md)
140. [bundle.generate() 生成流程](complete/bundle-generate.md)
141. [bundle.write() 写入流程](complete/bundle-write.md)
142. [与官方 Rollup 对比分析](complete/comparison.md)
143. [性能优化策略](complete/performance.md)
144. [总结与进阶方向](complete/conclusion.md)

---

### 附录 (Appendix)

145. [Rollup 配置项完整参考](appendix/configuration.md)
146. [Plugin Hook 完整列表](appendix/hooks-reference.md)
147. [PluginContext API 参考](appendix/context-api.md)
148. [OutputChunk 与 OutputAsset 类型](appendix/output-types.md)
149. [ESTree 节点类型参考](appendix/estree-nodes.md)
150. [JSX 支持配置](appendix/jsx.md)
151. [generatedCode 配置详解](appendix/generated-code.md)
152. [treeshake 配置详解](appendix/treeshake-options.md)
153. [perf 性能分析配置](appendix/perf.md)
154. [strictDeprecations 严格废弃警告](appendix/strict-deprecations.md)
155. [常见问题与解决方案](appendix/faq.md)
