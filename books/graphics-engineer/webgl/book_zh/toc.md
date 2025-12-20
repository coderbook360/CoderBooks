# WebGL 基础与渲染管线

本书深入讲解 WebGL API 和 GPU 渲染原理，带你从零开始手写一个 WebGL 渲染器。

- [序言](preface.md)

---

### 第一部分：WebGL 基础 (WebGL Fundamentals)

1. [WebGL 概述与环境搭建](fundamentals/webgl-overview.md)
2. [WebGL 上下文与状态机](fundamentals/context-state-machine.md)
3. [第一个 WebGL 程序：绘制三角形](fundamentals/first-triangle.md)
4. [WebGL 坐标系统与视口](fundamentals/coordinate-viewport.md)

---

### 第二部分：着色器编程 (Shader Programming)

5. [着色器概述与工作流程](shaders/shader-overview.md)
6. [GLSL 语言基础：数据类型](shaders/glsl-datatypes.md)
7. [GLSL 语言基础：运算符与控制流](shaders/glsl-operators.md)
8. [顶点着色器详解](shaders/vertex-shader.md)
9. [片元着色器详解](shaders/fragment-shader.md)
10. [着色器的编译、链接与调试](shaders/shader-compile-debug.md)

---

### 第三部分：渲染管线 (Rendering Pipeline)

11. [渲染管线概述](pipeline/pipeline-overview.md)
12. [顶点处理阶段](pipeline/vertex-processing.md)
13. [图元装配与光栅化](pipeline/primitive-rasterization.md)
14. [片元处理阶段](pipeline/fragment-processing.md)
15. [帧缓冲与输出合并](pipeline/framebuffer-output.md)

---

### 第四部分：缓冲区系统 (Buffer System)

16. [缓冲区对象概述](buffers/buffer-overview.md)
17. [VBO：顶点缓冲对象](buffers/vbo.md)
18. [IBO/EBO：索引缓冲对象](buffers/ibo-ebo.md)
19. [VAO：顶点数组对象](buffers/vao.md)
20. [Attribute：顶点属性](buffers/attributes.md)
21. [Uniform：统一变量](buffers/uniforms.md)
22. [UBO：统一缓冲对象](buffers/ubo.md)
23. [Varying：变量传递](buffers/varyings.md)

---

### 第五部分：纹理系统 (Texture System)

24. [纹理概述与工作原理](textures/texture-overview.md)
25. [纹理创建与数据加载](textures/texture-creation.md)
26. [纹理坐标与映射](textures/texture-coordinates.md)
27. [纹理采样与过滤](textures/texture-sampling.md)
28. [Mipmap 与多级纹理](textures/mipmaps.md)
29. [立方体贴图与环境映射](textures/cubemap.md)
30. [3D 纹理与体积渲染](textures/3d-texture.md)

---

### 第六部分：深度测试与混合 (Depth Testing and Blending)

31. [深度缓冲原理](depth-blending/depth-buffer.md)
32. [深度测试配置与应用](depth-blending/depth-testing.md)
33. [Alpha 混合基础](depth-blending/alpha-blending.md)
34. [混合模式与混合函数](depth-blending/blend-modes.md)
35. [模板测试与应用](depth-blending/stencil-test.md)

---

### 第七部分：光照系统 (Lighting System)

36. [光照模型概述](lighting/lighting-overview.md)
37. [环境光实现](lighting/ambient-light.md)
38. [漫反射光照](lighting/diffuse-light.md)
39. [镜面反射光照](lighting/specular-light.md)
40. [Phong 光照模型实现](lighting/phong-lighting.md)
41. [法线贴图实现](lighting/normal-mapping.md)
42. [视差贴图 (Parallax Mapping)](lighting/parallax-mapping.md)
43. [多光源处理](lighting/multiple-lights.md)

---

### 第八部分：高级特性 (Advanced Features)

44. [帧缓冲对象 FBO](advanced/framebuffer-object.md)
45. [渲染到纹理](advanced/render-to-texture.md)
46. [多重渲染目标 MRT](advanced/mrt.md)
47. [实例化渲染](advanced/instanced-rendering.md)
48. [Transform Feedback](advanced/transform-feedback.md)
49. [WebGL 性能优化策略](advanced/performance-optimization.md)
50. [WebGL 调试技巧与工具](advanced/debugging-tools.md)

---

### 第九部分：综合实战 (Complete Project)

51. [实战项目：手写 WebGL 渲染器](project/webgl-renderer.md)
52. [常见错误与排查技巧](project/error-troubleshooting.md)
53. [从 WebGL 到 Three.js](project/webgl-to-threejs.md)
