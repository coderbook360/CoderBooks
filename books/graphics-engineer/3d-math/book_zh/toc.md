# 3D 图形学数学基础

本书系统讲解 3D 图形学必备的数学知识，用可视化和代码实现帮助你深刻理解向量、矩阵、四元数等核心概念。

- [序言](preface.md)

---

### 第一部分：向量运算 (Vector Operations)

1. [向量的概念与表示](vectors/vector-basics.md)
2. [向量的加减与数乘](vectors/vector-arithmetic.md)
3. [向量的长度与归一化](vectors/vector-length.md)
4. [点积与叉积](vectors/dot-cross-product.md)
5. [向量在图形学中的应用](vectors/vector-applications.md)

---

### 第二部分：矩阵运算 (Matrix Operations)

6. [矩阵的概念与表示](matrices/matrix-basics.md)
7. [矩阵的加减与数乘](matrices/matrix-arithmetic.md)
8. [矩阵乘法详解](matrices/matrix-multiplication.md)
9. [特殊矩阵：单位矩阵与逆矩阵](matrices/special-matrices.md)
10. [转置矩阵与矩阵属性](matrices/matrix-transpose.md)

---

### 第三部分：3D 变换 (3D Transformations)

11. [齐次坐标系统](transforms/homogeneous-coordinates.md)
12. [平移变换矩阵](transforms/translation-matrix.md)
13. [旋转变换矩阵](transforms/rotation-matrix.md)
14. [欧拉角与万向节死锁](transforms/euler-angles.md)
15. [缩放与镜像变换](transforms/scale-mirror.md)
16. [复合变换与变换顺序](transforms/composite-transforms.md)
17. [法线变换与逆转置矩阵](transforms/normal-transform.md)
18. [Look-At 矩阵构建详解](transforms/lookat-matrix.md)

---

### 第四部分：坐标系统 (Coordinate Systems)

19. [模型空间与世界空间](coordinates/model-world-space.md)
20. [观察空间与相机变换](coordinates/view-space.md)
21. [裁剪空间与归一化设备坐标](coordinates/clip-ndc.md)
22. [屏幕空间与视口变换](coordinates/screen-space.md)
23. [切线空间与 TBN 矩阵](coordinates/tangent-space.md)

---

### 第五部分：投影变换 (Projection Transforms)

24. [投影变换概述](projection/projection-overview.md)
25. [正交投影矩阵推导](projection/orthographic.md)
26. [透视投影矩阵推导](projection/perspective.md)
27. [视锥体与裁剪](projection/frustum-culling.md)
28. [深度缓冲与深度精度](projection/depth-buffer.md)

---

### 第六部分：四元数 (Quaternions)

29. [为什么需要四元数](quaternions/why-quaternions.md)
30. [四元数的定义与表示](quaternions/quaternion-basics.md)
31. [四元数的运算](quaternions/quaternion-operations.md)
32. [用四元数表示旋转](quaternions/rotation-quaternion.md)
33. [四元数与欧拉角的转换](quaternions/euler-quaternion.md)
34. [四元数插值：Slerp](quaternions/slerp.md)

---

### 第七部分：几何运算与应用 (Geometry and Applications)

35. [射线与平面的交点](geometry/ray-plane.md)
36. [轴对齐包围盒 AABB](geometry/aabb.md)
37. [球体包围盒与碰撞检测](geometry/bounding-sphere.md)
38. [OBB 有向包围盒](geometry/obb.md)
39. [射线-三角形相交算法](geometry/ray-triangle.md)
40. [点与三角形的关系](geometry/point-triangle.md)

---

### 第八部分：综合实战 (Practical Implementation)

41. [构建完整的 3D 数学库](practice/complete-math-library.md)
42. [矩阵分解与重组](practice/matrix-decomposition.md)
43. [性能优化：SIMD 与向量化](practice/performance-optimization.md)
44. [与 Three.js 数学库对比分析](practice/threejs-comparison.md)
45. [实战案例：相机控制器实现](practice/camera-controller.md)
