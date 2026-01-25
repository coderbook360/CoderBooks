# Vue SSR 设计与实现

深入解析 Vue 服务端渲染的设计思想、源码实现与手写实践。

- [序言](index.md)

---

### 第一部分：设计思想

1. [服务端渲染发展历程](design/ssr-history.md)
2. [CSR vs SSR vs SSG](design/csr-ssr-ssg-comparison.md)
3. [SSR 的优势与挑战](design/ssr-pros-and-challenges.md)
4. [同构应用概念](design/isomorphic-application.md)
5. [同构渲染设计目标](design/isomorphic-design-goals.md)
6. [水合（Hydration）概念](design/hydration-concept.md)
7. [水合不匹配问题](design/hydration-mismatch.md)
8. [渐进式水合设计](design/progressive-hydration.md)
9. [选择性水合设计](design/selective-hydration.md)
10. [流式渲染设计](design/streaming-rendering-design.md)
11. [状态同步设计](design/state-synchronization.md)
12. [SSG 静态生成设计](design/static-site-generation.md)
13. [ISR 增量静态再生](design/incremental-static-regeneration.md)
14. [跨请求状态污染](design/cross-request-state-pollution.md)
15. [设计权衡与取舍](design/design-tradeoffs.md)
16. [架构总览](design/architecture-overview.md)

---

### 第二部分：源码解析

#### 2.1 字符串渲染

17. [源码结构与阅读指南](source/source-structure-guide.md)
18. [renderToString 入口](source/render-to-string-entry.md)
19. [createBuffer 缓冲区创建](source/create-buffer.md)
20. [SSRContext 渲染上下文](source/ssr-context.md)
21. [renderComponentVNode 组件渲染](source/render-component-vnode.md)
22. [renderComponentSubTree 组件子树](source/render-component-subtree.md)
23. [renderElementVNode 元素渲染](source/render-element-vnode.md)
24. [renderVNode 虚拟节点渲染](source/render-vnode.md)
25. [renderChildren 子节点渲染](source/render-children.md)

#### 2.2 属性与样式渲染

26. [ssrRenderAttrs 属性渲染](source/ssr-render-attrs.md)
27. [ssrRenderAttr 单属性渲染](source/ssr-render-attr.md)
28. [ssrRenderClass 类名渲染](source/ssr-render-class.md)
29. [ssrRenderStyle 样式渲染](source/ssr-render-style.md)
30. [ssrRenderDynamicAttr 动态属性](source/ssr-render-dynamic-attr.md)
31. [特殊属性处理](source/special-attrs-handling.md)

#### 2.3 内置组件渲染

32. [ssrRenderSlot 插槽渲染](source/ssr-render-slot.md)
33. [ssrRenderSlotInner 插槽内部](source/ssr-render-slot-inner.md)
34. [ssrRenderTeleport 传送门渲染](source/ssr-render-teleport.md)
35. [ssrRenderSuspense 异步渲染](source/ssr-render-suspense.md)
36. [ssrRenderSuspenseBoundary 边界](source/ssr-render-suspense-boundary.md)

#### 2.4 流式渲染

37. [renderToStream 入口](source/render-to-stream-entry.md)
38. [renderToSimpleStream 简单流](source/render-to-simple-stream.md)
39. [renderToNodeStream Node 流](source/render-to-node-stream.md)
40. [renderToWebStream Web 流](source/render-to-web-stream.md)
41. [pipeToNodeWritable 管道输出](source/pipe-to-node-writable.md)
42. [pipeToWebWritable Web 管道](source/pipe-to-web-writable.md)
43. [流式渲染背压处理](source/streaming-backpressure.md)

#### 2.5 客户端水合

44. [客户端 Hydration 入口](source/client-hydration-entry.md)
45. [createHydrationRenderer 创建](source/create-hydration-renderer.md)
46. [hydrateVNode 虚拟节点水合](source/hydrate-vnode.md)
47. [hydrateElement 元素水合](source/hydrate-element.md)
48. [hydrateComponent 组件水合](source/hydrate-component.md)
49. [hydrateTeleport 传送门水合](source/hydrate-teleport.md)
50. [hydrateSuspense Suspense 水合](source/hydrate-suspense.md)
51. [hydrateText 文本水合](source/hydrate-text.md)
52. [hydrateFragment Fragment 水合](source/hydrate-fragment.md)

#### 2.6 水合错误处理

53. [Hydration 不匹配处理](source/hydration-mismatch-handling.md)
54. [水合错误类型](source/hydration-error-types.md)
55. [水合错误恢复](source/hydration-error-recovery.md)

#### 2.7 异步与数据

56. [异步组件 SSR 处理](source/async-component-ssr.md)
57. [服务端数据预取](source/server-data-prefetch.md)
58. [useSSRContext 钩子](source/use-ssr-context.md)
59. [状态序列化与反序列化](source/state-serialization.md)

---

### 第三部分：Mini 实现

60. [项目架构设计](mini/project-architecture.md)
61. [接口定义与类型](mini/interface-definitions.md)
62. [实现 renderToString 基础版](mini/implement-render-to-string-basic.md)
63. [实现元素渲染](mini/implement-element-rendering.md)
64. [实现属性渲染](mini/implement-attrs-rendering.md)
65. [实现类名与样式渲染](mini/implement-class-style-rendering.md)
66. [实现组件渲染](mini/implement-component-rendering.md)
67. [实现插槽渲染](mini/implement-slot-rendering.md)
68. [实现 renderToStream](mini/implement-render-to-stream.md)
69. [实现流式输出](mini/implement-streaming-output.md)
70. [实现状态序列化](mini/implement-state-serialization.md)
71. [实现客户端 Hydration](mini/implement-client-hydration.md)
72. [实现元素水合](mini/implement-element-hydration.md)
73. [实现组件水合](mini/implement-component-hydration.md)
74. [实现水合错误检测](mini/implement-hydration-mismatch.md)
75. [单元测试设计](mini/unit-testing.md)
76. [测试用例实现](mini/test-cases.md)
77. [扩展功能探索](mini/extension-exploration.md)
78. [总结与回顾](mini/summary-and-review.md)
