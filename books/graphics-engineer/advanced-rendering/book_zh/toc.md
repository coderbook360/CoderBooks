# 3D 场景管理与高级渲染

本书讲解现代 3D 引擎的核心技术，从场景图到 PBR 材质，从阴影系统到性能优化。

- [序言](preface.md)

---

### 第一部分：场景图系统 (Scene Graph)

1. [场景图概述与设计原理](scene-graph/scene-graph-overview.md)
2. [节点树结构实现](scene-graph/tree-structure.md)
3. [变换继承与传播](scene-graph/transform-inheritance.md)
4. [世界矩阵计算](scene-graph/world-matrix.md)
5. [渲染遍历算法](scene-graph/render-traversal.md)
6. [场景查询与过滤](scene-graph/scene-query.md)

---

### 第二部分：相机系统 (Camera System)

7. [相机概述与分类](camera/camera-overview.md)
8. [透视相机实现](camera/perspective-camera.md)
9. [正交相机实现](camera/orthographic-camera.md)
10. [相机控制器：轨道控制](camera/orbit-controls.md)
11. [相机控制器：第一人称](camera/first-person-controls.md)
12. [视锥体剔除实现](camera/frustum-culling.md)

---

### 第三部分：材质系统 (Material System)

13. [材质系统架构设计](materials/material-architecture.md)
14. [基础材质：MeshBasicMaterial](materials/mesh-basic-material.md)
15. [Lambert 材质实现](materials/lambert-material.md)
16. [Phong 材质实现](materials/phong-material.md)
17. [PBR 材质理论基础](materials/pbr-theory.md)
18. [PBR 材质实现：金属度与粗糙度](materials/pbr-implementation.md)
19. [材质参数系统](materials/material-parameters.md)

---

### 第四部分：光照与阴影 (Lighting and Shadows)

20. [光源系统架构](lighting/light-system.md)
21. [环境光实现](lighting/ambient-light.md)
22. [平行光实现](lighting/directional-light.md)
23. [点光源实现](lighting/point-light.md)
24. [聚光灯实现](lighting/spot-light.md)
25. [IBL 基于图像的光照](lighting/ibl.md)
26. [HDR 与色调映射](lighting/hdr-tone-mapping.md)
27. [阴影映射原理](lighting/shadow-mapping.md)
28. [PCF 软阴影](lighting/pcf-shadows.md)
29. [CSM 级联阴影贴图](lighting/csm.md)
30. [球谐光照 (Spherical Harmonics)](lighting/spherical-harmonics.md)
31. [VSM 方差阴影映射](lighting/vsm-shadows.md)
32. [PCSS 百分比渐进软阴影](lighting/pcss-shadows.md)

---

### 第五部分：几何体系统 (Geometry System)

33. [几何体架构设计](geometry/geometry-architecture.md)
34. [BufferGeometry 实现](geometry/buffer-geometry.md)
35. [内置几何体：立方体](geometry/box-geometry.md)
36. [内置几何体：球体](geometry/sphere-geometry.md)
37. [内置几何体：平面与圆柱](geometry/plane-cylinder.md)
38. [自定义几何体](geometry/custom-geometry.md)
39. [网格简化算法 (QEM)](geometry/mesh-simplification.md)

---

### 第六部分：模型加载与后处理 (Loaders & Post-Processing)

40. [glTF 模型格式详解](loaders/gltf-format.md)
41. [glTF 加载器实现](loaders/gltf-loader.md)
42. [Draco 网格压缩](loaders/draco-compression.md)
43. [后处理概述与框架](post-processing/overview.md)
44. [Bloom 辉光效果](post-processing/bloom.md)
45. [SSAO 环境光遮蔽](post-processing/ssao.md)
46. [HBAO+ 高级环境光遮蔽](post-processing/hbao-plus.md)
47. [SSR 屏幕空间反射](post-processing/ssr.md)
48. [SSGI 屏幕空间全局光照](post-processing/ssgi.md)

---

### 第七部分：动画系统 (Animation System)

49. [骨骼动画原理](animation/skeletal-animation-theory.md)
50. [骨骼层级与绑定](animation/skeletal-hierarchy.md)
51. [蒙皮权重计算](animation/skinning-weights.md)
52. [动画关键帧插值](animation/keyframe-interpolation.md)
53. [动画混合与状态机](animation/animation-blending.md)
54. [IK 反向动力学系统](animation/ik-system.md)
55. [IK 求解器算法](animation/ik-solvers.md)

---

### 第八部分：性能优化 (Performance Optimization)

56. [性能分析工具与方法](performance/profiling-tools.md)
57. [Draw Call 优化](performance/draw-call-optimization.md)
58. [批量渲染实现](performance/batch-rendering.md)
59. [实例化渲染](performance/instanced-rendering.md)
60. [LOD 系统实现](performance/lod-system.md)
61. [视锥体剔除优化](performance/frustum-culling.md)
62. [遮挡剔除技术](performance/occlusion-culling.md)
63. [KD-Tree 空间分割](performance/kd-tree.md)
64. [PVS 预计算可见性](performance/pvs.md)
65. [八叉树空间分割](performance/octree.md)
66. [BVH 层次包围盒](performance/bvh.md)
67. [渲染队列优化](performance/render-queue.md)

---

### 第九部分：综合实战 (Final Project)

68. [实战：3D 游戏场景渲染器](project/game-scene-renderer.md)
69. [性能监控与调试](project/performance-monitoring.md)
70. [从引擎到 Three.js 源码](project/to-threejs-source.md)
