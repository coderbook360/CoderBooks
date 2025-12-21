# Canvas 图形编程：从基础到图形编辑器实现

本书系统性地讲解 Canvas 2D 图形编程，从基础 API 到高级图形编辑器功能实现，为阅读 Fabric.js 等图形库源码奠定坚实基础。

- [序言](preface.md)

---

### 第一部分：Canvas 基础入门 (Canvas Fundamentals)

1. [Canvas 概述与开发环境](foundations/canvas-overview.md)
2. [Canvas 坐标系统](foundations/coordinate-system.md)
3. [绘制上下文与状态基础](foundations/context-basics.md)
4. [save/restore与状态栈](foundations/context-state-stack.md)
5. [状态管理最佳实践](foundations/context-state-patterns.md)
6. [像素操作基础](foundations/pixel-basics.md)
7. [图像处理算法](foundations/image-filters.md)

---

### 第二部分：图形绘制详解 (Drawing Shapes)

8. [基础图形：矩形、圆、椭圆](drawing/basic-shapes.md)
9. [路径系统：直线、曲线与贝塞尔](drawing/path-system.md)
10. [路径高级操作基础](drawing/path-advanced-basics.md)
11. [路径性能优化与企业实践](drawing/path-advanced-optimization.md)
12. [文本渲染与测量](drawing/text-rendering.md)
13. [图像绘制与处理](drawing/image-drawing.md)
14. [图像处理算法：滤镜与卷积](drawing/image-processing.md)

---

### 第三部分：样式与视觉效果 (Styles and Effects)

15. [填充与描边样式](styles/fill-stroke.md)
16. [渐变与图案](styles/gradients-patterns.md)
17. [阴影与合成操作](styles/shadow-composite.md)
18. [透明度与混合模式](styles/alpha-blending.md)

---

### 第四部分：坐标变换与矩阵 (Transforms and Matrix)

19. [变换基础：平移、旋转、缩放](transforms/basic-transforms.md)
20. [变换矩阵原理](transforms/matrix-theory.md)
21. [矩阵运算与自定义变换](transforms/matrix-operations.md)
22. [变换堆栈与状态保存](transforms/transform-stack.md)
23. [坐标系转换：屏幕坐标与 Canvas 坐标](transforms/coordinate-conversion.md)

---

### 第五部分：事件与交互 (Events and Interaction)

24. [事件绑定与坐标计算](interaction/event-binding.md)
25. [点击检测：几何方法与路径方法](interaction/hit-testing.md)
26. [拖拽交互实现](interaction/drag-interaction.md)
27. [缩放与平移交互](interaction/zoom-pan.md)
28. [键盘事件与快捷键](interaction/keyboard-events.md)

---

### 第六部分：动画与渲染优化 (Animation and Rendering)

29. [动画基础：requestAnimationFrame](animation/raf-basics.md)
30. [缓动函数与动画曲线](animation/easing-functions.md)
31. [帧率控制与时间管理](animation/frame-control.md)
32. [脏矩形渲染基础](animation/dirty-rect-basics.md)
33. [脏矩形渲染进阶](animation/dirty-rect-advanced.md)
34. [分层 Canvas 基础](animation/layered-canvas-basics.md)
35. [分层 Canvas 进阶优化](animation/layered-canvas-advanced.md)
36. [离屏 Canvas 基础与缓存](animation/offscreen-basics.md)
37. [OffscreenCanvas API与缓存管理](animation/offscreen-advanced.md)
38. [粒子系统深度实现：力场与发射器](animation/particle-system-advanced.md)
39. [Canvas 绘制性能最佳实践](animation/performance-best-practices.md)

---

### 第七部分：对象模型设计 (Object Model Design)
40. [为什么需要对象模型](object-model/why-object-model.md)
41. [图形对象基类设计](object-model/base-object.md)
42. [属性系统与观察者模式](object-model/property-system.md)
43. [对象序列化与反序列化](object-model/serialization.md)
44. [对象集合与容器](object-model/object-collection.md)

---

### 第八部分：图形编辑器核心功能 (Editor Core Features)
45. [画布管理与视口控制](editor/canvas-viewport.md)
46. [对象选择机制](editor/object-selection.md)
47. [选择框与控制点基础](editor/bounding-box-controls-basics.md)
48. [选择框与控制点进阶](editor/bounding-box-controls-advanced.md)
49. [对象变换：移动、旋转、缩放](editor/object-transform.md)
50. [对象分组与取消分组](editor/group-ungroup.md)
51. [图层管理：层级与排序](editor/layer-management.md)
52. [撤销重做系统](editor/undo-redo.md)
53. [剪贴板操作](editor/clipboard.md)

---

### 第九部分：高级主题 (Advanced Topics)

54. [高 DPI 屏幕适配](advanced/high-dpi.md)
55. [性能分析与问题排查](advanced/performance.md)
56. [Canvas 与 SVG 对比选择](advanced/canvas-vs-svg.md)
57. [导出功能：图片与 SVG](advanced/export.md)
58. [WebWorker 基础：多线程通信与 OffscreenCanvas](advanced/webworker-basics.md)
59. [WebWorker 高级：分片渲染与生产实践](advanced/webworker-advanced.md)

