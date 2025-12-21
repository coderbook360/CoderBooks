# Three.js 深度解析与手写实现

本书深入解析 Three.js 源码，并手写实现一个 Mini Three.js，帮助你真正掌握 3D 引擎的核心原理。

- [序言](preface.md)

---

### 第一部分：项目准备与数学库 (Foundation)

#### 理论：Three.js 架构设计

1. [Three.js 整体架构与模块划分](architecture/overall-architecture.md)
2. [核心设计模式与最佳实践](architecture/design-patterns.md)
3. [Three.js 数学库设计哲学](architecture/math-design.md)

#### 实战：搭建项目与数学库实现

4. [项目初始化与 TypeScript 配置](foundation/project-setup.md)
5. [构建系统与测试框架](foundation/build-and-test.md)
6. [Vector2/3/4 源码解析与实现](math/vectors.md)
7. [Matrix3/4 源码解析与实现](math/matrices.md)
8. [Quaternion 源码解析与实现](math/quaternion.md)
9. [Euler、Box3、Sphere 等实用类](math/utility-math.md)
10. [Color 颜色系统实现](math/color.md)

---

### 第二部分：核心对象系统 (Core System)

#### 理论：Three.js 核心架构

11. [Object3D 继承体系设计](core-theory/object3d-hierarchy.md)
12. [Scene Graph 场景图原理](core-theory/scene-graph.md)
13. [BufferGeometry 设计思想](core-theory/buffer-geometry-design.md)

#### 实战：核心对象实现

14. [EventDispatcher 事件系统](core/event-dispatcher.md)
15. [Object3D 基类实现](core/object3d.md)
16. [Scene 场景管理](core/scene.md)
17. [Group 与层级管理](core/group.md)
18. [BufferAttribute 实现](core/buffer-attribute.md)
19. [BufferGeometry 实现](core/buffer-geometry.md)
20. [InterleavedBuffer 交错缓冲](core/interleaved-buffer.md)
21. [Mesh 网格对象](core/mesh.md)
22. [Layers 图层系统](core/layers.md)

---

### 第三部分：WebGL 渲染器 (Renderer)

#### 理论：Three.js 渲染架构

23. [WebGLRenderer 渲染流程](renderer-theory/render-pipeline.md)
24. [WebGL 状态管理策略](renderer-theory/state-management.md)
25. [资源管理与缓存机制](renderer-theory/resource-management.md)

#### 实战：渲染器实现

26. [WebGLRenderer 核心架构](renderer/webgl-renderer.md)
27. [WebGLState 状态管理](renderer/webgl-state.md)
28. [WebGLPrograms 程序管理](renderer/webgl-programs.md)
29. [WebGLAttributes 属性管理](renderer/webgl-attributes.md)
30. [WebGLGeometries 几何体管理](renderer/webgl-geometries.md)
31. [WebGLTextures 纹理管理](renderer/webgl-textures.md)
32. [WebGLObjects 对象缓存](renderer/webgl-objects.md)
33. [WebGLRenderLists 渲染列表](renderer/webgl-render-lists.md)
34. [渲染循环与动画](renderer/render-loop.md)

---

### 第四部分：材质与着色器 (Materials)

#### 理论：Three.js 材质系统

35. [Material 系统架构](materials-theory/material-architecture.md)
36. [ShaderLib 与 ShaderChunk 设计](materials-theory/shader-system.md)
37. [PBR 材质原理与实现](materials-theory/pbr-theory.md)

#### 实战：材质系统实现

38. [Material 基类实现](materials/material-base.md)
39. [MeshBasicMaterial 实现](materials/mesh-basic.md)
40. [MeshLambertMaterial 实现](materials/mesh-lambert.md)
41. [MeshPhongMaterial 实现](materials/mesh-phong.md)
42. [MeshStandardMaterial PBR 实现](materials/mesh-standard.md)
43. [ShaderMaterial 自定义材质](materials/shader-material.md)
44. [着色器编译与优化](materials/shader-compilation.md)

---

### 第五部分：光照系统 (Lighting)

#### 理论：Three.js 光照架构

45. [光照系统设计](lighting-theory/lighting-system.md)
46. [阴影系统原理](lighting-theory/shadow-system.md)

#### 实战：光照实现

47. [Light 基类实现](lights/light-base.md)
48. [AmbientLight 环境光](lights/ambient-light.md)
49. [DirectionalLight 平行光](lights/directional-light.md)
50. [PointLight 点光源](lights/point-light.md)
51. [SpotLight 聚光灯](lights/spot-light.md)
52. [光照着色器集成](lights/lighting-shaders.md)
53. [阴影映射实现](lights/shadow-mapping.md)

---

### 第六部分：相机系统 (Camera)

#### 理论与实战：相机实现

54. [Camera 基类与投影矩阵](camera/camera-base.md)
55. [PerspectiveCamera 透视相机](camera/perspective-camera.md)
56. [OrthographicCamera 正交相机](camera/orthographic-camera.md)
57. [OrbitControls 轨道控制器](camera/orbit-controls.md)
58. [视锥体剔除实现](camera/frustum-culling.md)

---

### 第七部分：几何体与纹理 (Geometry & Texture)

#### 理论：几何体生成算法

59. [参数化几何体生成原理](geometry-theory/parametric-geometry.md)

#### 实战：几何体与纹理实现

60. [BoxGeometry 立方体](geometry/box-geometry.md)
61. [SphereGeometry 球体](geometry/sphere-geometry.md)
62. [PlaneGeometry 平面](geometry/plane-geometry.md)
63. [CylinderGeometry 圆柱](geometry/cylinder-geometry.md)
64. [Texture 纹理系统](texture/texture.md)
65. [TextureLoader 纹理加载](texture/texture-loader.md)
66. [CubeTexture 立方体贴图](texture/cube-texture.md)

---

### 第八部分：加载器与文件格式 (Loaders)

#### 理论：模型加载原理

67. [3D 文件格式对比（OBJ/FBX/glTF）](loaders-theory/format-comparison.md)
68. [glTF 2.0 规范深度解读](loaders-theory/gltf-specification.md)

#### 实战：GLTFLoader 深度解析与实现

69. [GLTFLoader 架构设计](loaders/gltf-architecture.md)
70. [JSON 解析与场景构建](loaders/gltf-json-parser.md)
71. [二进制数据处理（BufferView/Accessor）](loaders/gltf-binary.md)
72. [材质与纹理加载](loaders/gltf-materials.md)
73. [骨骼动画数据加载](loaders/gltf-animation.md)
74. [扩展支持与插件系统](loaders/gltf-extensions.md)
75. [KHR_draco_mesh_compression 扩展](loaders/draco-extension.md)

---

### 第九部分：高级特性 (Advanced Features)

#### 理论与实战：高级功能

76. [Raycaster 射线投射](advanced/raycaster.md)
77. [动画系统深度解析](advanced/animation-deep-dive.md)
78. [AnimationClip 与 KeyframeTrack](advanced/animation-clip.md)
79. [AnimationMixer 动画混合器](advanced/animation-mixer.md)
80. [骨骼动画与蒙皮](advanced/skinned-mesh.md)
81. [后处理系统：EffectComposer](advanced/effect-composer.md)
82. [Pass 系统与自定义后处理](advanced/custom-pass.md)
83. [Fog 雾效实现](advanced/fog.md)
84. [LOD 细节层次管理](advanced/lod.md)
85. [辅助工具：AxesHelper、GridHelper](advanced/helpers.md)
86. [PMREMGenerator 与 IBL 预滤波](advanced/pmrem-generator.md)
87. [WebGLCubeRenderTarget 动态环境映射](advanced/cube-render-target.md)
88. [Three.js 物理引擎集成](advanced/physics-integration.md)

---

### 第十部分：优化与工程化 (Optimization)

#### 理论：Three.js 性能优化

89. [性能分析与瓶颈定位](optimization-theory/performance-analysis.md)
90. [内存管理最佳实践](optimization-theory/memory-management.md)

#### 实战：优化与完善

91. [渲染性能优化](optimization/render-optimization.md)
92. [资源加载与管理](optimization/resource-loading.md)
93. [WebGL 扩展与兼容性](optimization/webgl-extensions.md)
94. [调试工具与技巧](optimization/debugging-tools.md)
95. [项目打包与发布](optimization/build-and-deploy.md)

---

### 第十一部分：实战项目 (Projects)

96. [项目一：3D 模型查看器](projects/model-viewer.md)
97. [项目二：太阳系模拟](projects/solar-system.md)
98. [项目三：PBR 材质展示](projects/pbr-showcase.md)
99. [项目四：粒子特效系统](projects/particle-system.md)
100. [项目五：3D 场景编辑器](projects/scene-editor.md)

---

### 附录 (Appendix)

101. [Three.js vs Babylon.js 对比](appendix/threejs-vs-babylonjs.md)
102. [WebGPU 与未来展望](appendix/webgpu-future.md)
103. [学习资源与社区](appendix/resources.md)
