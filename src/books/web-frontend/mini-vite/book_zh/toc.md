# Vite 内核实现与实践: 构建 mini-vite

本书通过拆解 Vite 的核心运行机制，围绕开发服务器、插件系统、模块图与 HMR、构建与预览、SSR 等关键模块，规划一条从原理到实现的清晰路径。所有示例均与源码细节对齐，读者将循序搭建一个可运行的 mini-vite。

- [序言](preface.md)

---

### 第 1 部分: 设计概览 (Design Overview)

1. [目标与架构总览](overview/goals-and-architecture.md)
2. [核心数据流与模块图](overview/dataflow-and-module-graph.md)
3. [开发与构建的边界](overview/dev-vs-build.md)
4. [配置解析与默认值](overview/config-resolution-and-defaults.md)

---

### 第 2 部分: 开发服务器 (Dev Server)

5. [启动流程与环境初始化](dev-server/startup-and-environments.md)
6. [中间件管线与请求处理](dev-server/middleware-pipeline.md)
7. [路径解析与静态资源](dev-server/path-resolution-and-static.md)
8. [文件监听与变更事件](dev-server/file-watching-and-events.md)

---

### 第 3 部分: 插件系统 (Plugins)

9. [插件模型与钩子](plugins/plugin-model-and-hooks.md)
10. [插件容器与执行上下文](plugins/plugin-container-and-context.md)
11. [索引 HTML 变换](plugins/index-html-transform.md)
12. [内置插件与常用模式](plugins/builtin-plugins-and-patterns.md)

---

### 第 4 部分: 依赖优化 (Dependency Optimization)

13. [扫描与入口分析](dep-optimization/scan-and-entry-analysis.md)
14. [预构建与缓存目录](dep-optimization/prebundle-and-cache.md)
15. [优化策略与边界](dep-optimization/strategies-and-edge-cases.md)

---

### 第 5 部分: 环境与变量 (Env & Mode)

16. [环境文件与模式](env-mode/env-files-and-mode.md)
17. [import.meta.env 与前端暴露](env-mode/import-meta-env-and-exposure.md)

---

### 第 6 部分: 模块图与转换 (Module Graph & Transform)

18. [模块图结构与节点状态](module-graph/graph-structure-and-nodes.md)
19. [URL 解析与入口建立](module-graph/url-resolution-and-entry.md)
20. [转换缓存与失效](module-graph/transform-cache-and-invalidation.md)

---

### 第 7 部分: HMR 通道 (HMR Channel)

21. [WebSocket 通道与握手](hmr/ws-channel-and-handshake.md)
22. [更新传播与边界](hmr/update-propagation-and-boundary.md)
23. [客户端处理与热替换](hmr/client-handling-and-accept.md)
24. [模块运行器与传输](hmr/module-runner-and-transport.md)

---

### 第 8 部分: 构建与预览 (Build & Preview)

25. [构建选项与 Rollup 集成](build/options-and-rollup-integration.md)
26. [插件链与产物输出](build/plugin-chain-and-output.md)
27. [预览服务器与静态部署](build/preview-server-and-deploy.md)

---

### 第 9 部分: SSR 基础 (SSR Basics)

28. [环境与模块加载](ssr/environment-and-module-loader.md)
29. [堆栈重写与错误处理](ssr/stacktrace-and-errors.md)
30. [SSR 清单与样式预加载](ssr/manifest-and-preload.md)

---

### 第 10 部分: 实践：mini-vite (Project)

31. [范围与需求定义](project/scope-and-requirements.md)
32. [实现最小开发服务器](project/minimal-dev-server.md)
33. [实现模块图与基本 HMR](project/module-graph-and-basic-hmr.md)
34. [实现简化插件系统](project/minimal-plugin-system.md)
35. [构建与预览的简化版](project/minimal-build-and-preview.md)
36. [项目整合与测试验证](project/integration-and-testing.md)
