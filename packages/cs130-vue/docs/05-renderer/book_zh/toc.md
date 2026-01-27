# 渲染器: Vue Renderer 源码深度解析

- [序言](index.md)

---

### 第1部分：设计思想 (Design Philosophy)

1. [Virtual DOM 的诞生](design/virtual-dom-origin.md)
2. [为什么需要 Virtual DOM](design/why-virtual-dom.md)
3. [Virtual DOM 的优势与局限](design/virtual-dom-pros-cons.md)
4. [VNode 节点设计](design/vnode-design.md)
5. [ShapeFlags 类型标记设计](design/shape-flags-design.md)
6. [PatchFlags 补丁标记设计](design/patch-flags-design.md)
7. [渲染器设计目标](design/renderer-design-goals.md)
8. [Diff 算法概述](design/diff-algorithm-overview.md)
9. [双端对比算法](design/double-ended-diff.md)
10. [最长递增子序列算法](design/lis-algorithm.md)
11. [Block Tree 优化设计](design/block-tree-design.md)
12. [Scheduler 调度器设计](design/scheduler-design.md)
13. [异步更新机制](design/async-update-mechanism.md)
14. [Suspense 设计思想](design/suspense-design.md)
15. [Teleport 设计思想](design/teleport-design.md)
16. [KeepAlive 缓存设计](design/keep-alive-design.md)
17. [自定义渲染器设计](design/custom-renderer-design.md)
18. [与编译器的协作](design/renderer-compiler-collaboration.md)
19. [设计权衡与取舍](design/design-tradeoffs.md)
20. [架构总览](design/architecture-overview.md)

---

### 第2部分：源码解析 (Source Code Analysis)

#### 渲染器创建与配置

21. [源码结构与阅读指南](source/source-structure-guide.md)
22. [createRenderer 渲染器创建](source/create-renderer.md)
23. [baseCreateRenderer 核心实现](source/base-create-renderer.md)
24. [渲染器配置选项](source/renderer-options.md)
25. [createHydrationRenderer 水合渲染器](source/create-hydration-renderer.md)

#### VNode 创建与处理

26. [h 函数实现](source/h-function.md)
27. [createVNode 创建虚拟节点](source/create-vnode.md)
28. [createBlock 创建 Block](source/create-block.md)
29. [openBlock 与 closeBlock](source/open-close-block.md)
30. [VNode 类型标记 ShapeFlags](source/vnode-shape-flags.md)
31. [VNode PatchFlags 补丁标记](source/vnode-patch-flags.md)
32. [normalizeVNode 规范化](source/normalize-vnode.md)
33. [cloneVNode 节点克隆](source/clone-vnode.md)
34. [mergeProps 属性合并](source/merge-props.md)

#### 挂载流程

35. [render 渲染入口](source/render-entry.md)
36. [patch 核心流程](source/patch-core.md)
37. [processElement 元素处理](source/process-element.md)
38. [processComponent 组件处理](source/process-component.md)
39. [processText 文本处理](source/process-text.md)
40. [processComment 注释处理](source/process-comment.md)
41. [processFragment 片段处理](source/process-fragment.md)
42. [mountElement 元素挂载](source/mount-element.md)
43. [mountChildren 子节点挂载](source/mount-children.md)

#### 更新与 Diff 算法

44. [patchElement 元素更新](source/patch-element.md)
45. [patchProps 属性更新](source/patch-props.md)
46. [patchBlockChildren Block 子节点](source/patch-block-children.md)
47. [patchChildren 子节点更新](source/patch-children.md)
48. [patchUnkeyedChildren 无 key 子节点](source/patch-unkeyed-children.md)
49. [patchKeyedChildren 有 key 子节点](source/patch-keyed-children.md)
50. [isSameVNodeType 节点类型判断](source/is-same-vnode-type.md)
51. [最长递增子序列实现](source/lis-implementation.md)
52. [move 节点移动](source/move-operation.md)

#### 卸载流程

53. [unmount 卸载流程](source/unmount-flow.md)
54. [unmountElement 元素卸载](source/unmount-element.md)
55. [unmountChildren 子节点卸载](source/unmount-children.md)
56. [unmountComponent 组件卸载](source/unmount-component.md)

#### 内置组件

57. [Teleport 源码解析](source/teleport-implementation.md)
58. [processTeleport 处理流程](source/process-teleport.md)
59. [Suspense 源码解析](source/suspense-implementation.md)
60. [processSuspense 处理流程](source/process-suspense.md)
61. [KeepAlive 源码解析](source/keep-alive-implementation.md)
62. [activate 与 deactivate](source/activate-deactivate.md)

#### 调度系统

63. [queueJob 任务入队](source/queue-job.md)
64. [queuePreFlushCb 前置回调](source/queue-pre-flush-cb.md)
65. [queuePostFlushCb 后置回调](source/queue-post-flush-cb.md)
66. [flushJobs 刷新队列](source/flush-jobs.md)
67. [flushPreFlushCbs 刷新前置](source/flush-pre-flush-cbs.md)
68. [flushPostFlushCbs 刷新后置](source/flush-post-flush-cbs.md)
69. [nextTick 实现](source/next-tick.md)

#### 2.8 DOM 操作与事件

70. [DOM 操作封装](source/dom-operations.md)
71. [patchDOMProp 属性更新](source/patch-dom-prop.md)
72. [patchClass 类名更新](source/patch-class.md)
73. [patchStyle 样式更新](source/patch-style.md)
74. [patchEvent 事件更新](source/patch-event.md)
75. [事件委托与缓存](source/event-delegation-cache.md)

#### 2.9 优化机制与边界处理

76. [Static Node 静态节点处理](source/static-node-handling.md)
77. [Hoisted VNode 提升节点](source/hoisted-vnode.md)
78. [Comment Node 注释节点](source/comment-node-handling.md)
79. [SSR Hydration 与渲染器协作](source/ssr-hydration-renderer.md)
80. [边界情况与错误处理](source/edge-cases-error-handling.md)
