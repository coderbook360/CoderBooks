# Mini PixiJS v8 源码解析: 2D WebGL/WebGPU 渲染引擎核心实现

本书将带你深入 PixiJS v8 源码，从渲染管线到场景图系统，全面理解现代 2D 渲染引擎的设计与实现。

- [序言](preface.md)

---

### 第一部分：架构概览与基础设施

1. [PixiJS v8 架构全景](foundations/architecture-overview.md)
2. [项目结构与模块组织](foundations/project-structure.md)
3. [核心类型与接口设计](foundations/core-types.md)
4. [扩展系统与插件机制](foundations/extensions-system.md)
5. [Environment 环境适配](foundations/environment.md)

---

### 第二部分：渲染器架构

6. [渲染器架构设计](rendering/renderer-architecture.md)
7. [System 系统模式与生命周期](rendering/system-pattern.md)
8. [渲染器自动检测与选择](rendering/auto-detect.md)
9. [渲染上下文与初始化](rendering/context-init.md)
10. [渲染指令与绘制流程](rendering/instructions.md)

---

### 第三部分：WebGL 渲染器

11. [WebGLRenderer 核心实现](webgl/webgl-renderer.md)
12. [GlContext 上下文管理](webgl/gl-context.md)
13. [GlState 状态机](webgl/gl-state.md)
14. [GlBuffer 缓冲区管理](webgl/gl-buffer.md)
15. [GlGeometry 几何体系统](webgl/gl-geometry.md)
16. [GlTexture 纹理管理](webgl/gl-texture.md)
17. [GlShader 着色器系统](webgl/gl-shader.md)
18. [GlRenderTarget 渲染目标](webgl/gl-render-target.md)
19. [GlUBO 统一缓冲区](webgl/gl-ubo.md)

---

### 第四部分：WebGPU 渲染器

20. [WebGPURenderer 核心实现](webgpu/webgpu-renderer.md)
21. [GPUDevice 与适配器](webgpu/gpu-device.md)
22. [GPUBuffer 缓冲区管理](webgpu/gpu-buffer.md)
23. [GPUTexture 纹理管理](webgpu/gpu-texture.md)
24. [GPUShader 着色器与 WGSL](webgpu/gpu-shader.md)
25. [GPURenderPipeline 管线](webgpu/gpu-pipeline.md)
26. [GPURenderTarget 渲染目标](webgpu/gpu-render-target.md)
27. [WebGL vs WebGPU 对比](webgpu/comparison.md)

---

### 第五部分：Shader 系统

28. [HighShader 高级着色器抽象](shader/high-shader.md)
29. [Shader 程序管理](shader/program.md)
30. [Uniform 与 UniformGroup](shader/uniforms.md)
31. [GLSL 到 WGSL 转换](shader/glsl-wgsl.md)
32. [内置着色器分析](shader/builtin-shaders.md)

---

### 第六部分：场景图核心

33. [场景图与显示对象树](scene/display-tree.md)
34. [Container 容器实现](scene/container.md)
35. [子节点管理与遍历](scene/children.md)
36. [View 渲染视图抽象](scene/view.md)
37. [Renderable 可渲染对象](scene/renderable.md)

---

### 第七部分：Transform 与 Bounds

38. [Transform 变换系统](transform/transform.md)
39. [Matrix 矩阵运算](transform/matrix.md)
40. [Local 与 World 变换](transform/local-world.md)
41. [Bounds 边界计算](transform/bounds.md)
42. [边界更新与缓存策略](transform/bounds-cache.md)

---

### 第八部分：Culling 与 Mask

43. [Culling 视锥裁剪](culling/culling.md)
44. [RenderLayer 渲染层](culling/render-layer.md)
45. [Mask 遮罩系统](mask/mask-system.md)
46. [Stencil 模板遮罩](mask/stencil.md)
47. [Alpha 遮罩与颜色遮罩](mask/alpha-color.md)

---

### 第九部分：Texture 纹理系统

48. [Texture 核心设计](texture/texture-core.md)
49. [TextureSource 纹理源](texture/texture-source.md)
50. [TextureStyle 采样配置](texture/texture-style.md)
51. [RenderTexture 渲染纹理](texture/render-texture.md)
52. [纹理上传与 GPU 管理](texture/gpu-upload.md)
53. [纹理 GC 垃圾回收](texture/texture-gc.md)

---

### 第十部分：Sprite 精灵系统

54. [Sprite 核心实现](sprite/sprite.md)
55. [Anchor 与 Pivot](sprite/anchor-pivot.md)
56. [TilingSprite 平铺精灵](sprite/tiling-sprite.md)
57. [AnimatedSprite 帧动画](sprite/animated-sprite.md)
58. [NineSliceSprite 九宫格](sprite/nine-slice.md)
59. [Spritesheet 精灵图集](sprite/spritesheet.md)

---

### 第十一部分：Graphics 矢量绘制

60. [Graphics 设计理念](graphics/overview.md)
61. [GraphicsContext 绘图上下文](graphics/context.md)
62. [基本形状绘制](graphics/basic-shapes.md)
63. [路径与贝塞尔曲线](graphics/path-bezier.md)
64. [填充与描边样式](graphics/fill-stroke.md)
65. [FillGradient 渐变填充](graphics/gradient.md)
66. [FillPattern 图案填充](graphics/pattern.md)
67. [SVG 路径解析](graphics/svg-path.md)
68. [Graphics GPU 渲染](graphics/gpu-rendering.md)

---

### 第十二部分：Text 文本渲染

69. [Text 文本渲染概览](text/overview.md)
70. [Canvas 文本渲染](text/canvas-text.md)
71. [TextStyle 样式系统](text/text-style.md)
72. [BitmapFont 位图字体](text/bitmap-font.md)
73. [BitmapText 位图文本](text/bitmap-text.md)
74. [HTMLText HTML 文本](text/html-text.md)
75. [文本测量与布局](text/measurement.md)

---

### 第十三部分：Mesh 网格系统

76. [Mesh 网格基础](mesh/overview.md)
77. [Geometry 几何体数据](mesh/geometry.md)
78. [MeshPlane 平面网格](mesh/mesh-plane.md)
79. [MeshRope 绳索网格](mesh/mesh-rope.md)
80. [PerspectiveMesh 透视网格](mesh/perspective.md)
81. [自定义 Mesh 顶点](mesh/custom-mesh.md)

---

### 第十四部分：Filter 滤镜系统

82. [Filter 滤镜架构](filters/architecture.md)
83. [滤镜渲染管线](filters/render-pipeline.md)
84. [FilterEffect 滤镜效果](filters/filter-effect.md)
85. [BlurFilter 模糊滤镜](filters/blur.md)
86. [ColorMatrixFilter 颜色矩阵](filters/color-matrix.md)
87. [DisplacementFilter 置换滤镜](filters/displacement.md)
88. [NoiseFilter 噪声滤镜](filters/noise.md)
89. [自定义滤镜开发](filters/custom-filter.md)

---

### 第十五部分：Batch 批处理系统

90. [批处理设计理念](batch/overview.md)
91. [Batcher 批处理器](batch/batcher.md)
92. [BatchGeometry 批次几何体](batch/batch-geometry.md)
93. [DefaultBatcher 默认批处理](batch/default-batcher.md)
94. [纹理打包与 TexturePacker](batch/texture-packer.md)

---

### 第十六部分：Assets 资源系统

95. [Assets 资源系统设计](assets/overview.md)
96. [Loader 加载器实现](assets/loader.md)
97. [Resolver 资源解析](assets/resolver.md)
98. [Cache 缓存管理](assets/cache.md)
99. [资源 Bundle 与 Manifest](assets/manifest.md)
100. [自定义 Loader 插件](assets/custom-loader.md)

---

### 第十七部分：Events 事件系统

101. [EventSystem 事件系统](events/event-system.md)
102. [FederatedEvent 联合事件](events/federated-event.md)
103. [事件冒泡与捕获](events/propagation.md)
104. [Hit Testing 命中测试](events/hit-testing.md)
105. [触摸与多点触控](events/touch.md)
106. [EventMode 事件模式](events/event-mode.md)

---

### 第十八部分：Ticker 动画系统

107. [Ticker 帧循环机制](ticker/ticker.md)
108. [UPDATE_PRIORITY 优先级](ticker/priority.md)
109. [DeltaTime 时间增量](ticker/delta-time.md)
110. [帧率无关动画实现](ticker/frame-independent.md)

---

### 第十九部分：Maths 数学库

111. [Point 与 ObservablePoint](maths/point.md)
112. [Matrix 矩阵变换](maths/matrix.md)
113. [Rectangle 矩形边界](maths/rectangle.md)
114. [Circle、Ellipse 几何形状](maths/shapes.md)
115. [Polygon 多边形](maths/polygon.md)

---

### 第二十部分：Particle 粒子系统

116. [ParticleContainer 设计](particles/container.md)
117. [Particle 粒子对象](particles/particle.md)
118. [粒子渲染优化](particles/optimization.md)
119. [高性能粒子实现](particles/high-performance.md)

---

### 第二十一部分：高级主题

120. [Blend Modes 混合模式](advanced/blend-modes.md)
121. [Advanced Blend Modes](advanced/advanced-blend.md)
122. [Compressed Textures 压缩纹理](advanced/compressed-textures.md)
123. [Prepare 资源预处理](advanced/prepare.md)
124. [Extract 提取系统](advanced/extract.md)
125. [Accessibility 无障碍支持](advanced/accessibility.md)

---

### 第二十二部分：实战与进阶

126. [构建迷你 2D 渲染器](practice/mini-renderer.md)
127. [性能分析与优化](practice/performance.md)
128. [内存管理与 GC](practice/memory-gc.md)
129. [从 v7 迁移到 v8](practice/migration.md)
130. [总结与学习路径](practice/summary.md)
