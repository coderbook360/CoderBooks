# 投影变换概述

当你用手机拍照时，3D 世界被"压扁"到 2D 照片上。远处的建筑看起来比近处的小，平行的铁轨在远方汇聚。

3D 图形学中的**投影变换**（Projection Transform）做的就是这件事：将 3D 场景投影到 2D 屏幕上。

## 为什么需要投影变换

首先要问一个问题：为什么不能直接丢弃 z 坐标？

```javascript
// 错误：直接丢弃 z
function projectWrong(x, y, z) {
  return { x, y }; // ❌ 忽略深度
}
```

问题：
1. **没有透视效果**：远近物体大小相同
2. **无法裁剪**：看不到的物体也会绘制
3. **深度测试失效**：无法判断前后关系

正确的投影变换要做三件事：
1. **透视缩放**：远处的物体更小
2. **视锥体裁剪**：只保留可见区域
3. **深度映射**：保留深度信息用于遮挡判断

## 投影的两大类型

3D 图形学中有两种主要的投影方式：

### 1. 正交投影（Orthographic Projection）

特点：
- **平行线保持平行**，不会汇聚
- **物体大小不变**，与距离相机远近无关
- **没有透视效果**

应用场景：
- CAD/建筑设计
- 2D 游戏（侧视角）
- 技术图纸
- UI 叠加

示例：
```javascript
// 正交投影：远近物体大小相同
const cube1 = { z: 10, size: 1 }; // 距离 10
const cube2 = { z: 50, size: 1 }; // 距离 50
// 屏幕上大小相同
```

### 2. 透视投影（Perspective Projection）

特点：
- **平行线汇聚**到消失点
- **物体大小随距离变化**，远小近大
- **符合人眼视觉**

应用场景：
- 3D 游戏
- 电影特效
- 虚拟现实
- 建筑可视化

示例：
```javascript
// 透视投影：远处物体更小
const cube1 = { z: 10, size: 1 };  // 距离 10
const cube2 = { z: 50, size: 1 };  // 距离 50
// 屏幕上 cube2 只有 cube1 的 1/5 大小
```

## 对比示例

同一个立方体阵列的两种投影：

```javascript
// 创建 10x10 的立方体阵列
const cubes = [];
for (let x = -5; x < 5; x++) {
  for (let z = 0; z < 10; z++) {
    cubes.push({ x, y: 0, z });
  }
}

// 正交投影
renderOrthographic(cubes);
// 结果：所有立方体大小相同，像棋盘

// 透视投影
renderPerspective(cubes);
// 结果：远处的立方体更小，有深度感
```

## 视锥体（View Frustum）

投影变换定义了一个**可见区域**，称为**视锥体**。

视锥体的参数：

| 参数 | 含义 | 正交投影 | 透视投影 |
|------|------|---------|---------|
| **near** | 近裁剪面距离 | 必需 | 必需 |
| **far** | 远裁剪面距离 | 必需 | 必需 |
| **left** | 左边界 | 必需 | - |
| **right** | 右边界 | 必需 | - |
| **top** | 上边界 | 必需 | - |
| **bottom** | 下边界 | 必需 | - |
| **fov** | 视野角度 | - | 必需 |
| **aspect** | 宽高比 | - | 必需 |

### 正交投影视锥体

形状：**长方体**（Box）

```javascript
// 正交投影参数
const ortho = {
  left: -10,
  right: 10,
  bottom: -10,
  top: 10,
  near: 1,
  far: 100
};

// 可见区域：一个 20×20×99 的长方体
```

### 透视投影视锥体

形状：**截锥体**（Frustum）

```javascript
// 透视投影参数
const persp = {
  fov: 60 * Math.PI / 180, // 60度视野
  aspect: 800 / 600,       // 宽高比 4:3
  near: 0.1,
  far: 1000
};

// 可见区域：一个截锥体（金字塔削去顶部）
```

## 投影矩阵的作用

投影矩阵将观察空间（View Space）的坐标转换到裁剪空间（Clip Space）：

$$
\mathbf{v}_{\text{clip}} = \mathbf{P} \cdot \mathbf{v}_{\text{view}}
$$

转换后的坐标：
- **x, y, z**：裁剪空间坐标
- **w**：用于透视除法的齐次坐标分量

### 透视除法

裁剪空间坐标还不是最终的 NDC：

$$
\mathbf{v}_{\text{ndc}} = \frac{\mathbf{v}_{\text{clip}}}{w_{\text{clip}}}
$$

具体：

$$
x_{\text{ndc}} = \frac{x_{\text{clip}}}{w_{\text{clip}}}, \quad
y_{\text{ndc}} = \frac{y_{\text{clip}}}{w_{\text{clip}}}, \quad
z_{\text{ndc}} = \frac{z_{\text{clip}}}{w_{\text{clip}}}
$$

这一步在 GPU 中自动执行。

### 代码示例

```javascript
// 完整的变换流程
function transformVertex(vertex, worldMatrix, viewMatrix, projectionMatrix) {
  // 1. 模型空间 → 世界空间
  const worldPos = multiply(worldMatrix, vertex);
  
  // 2. 世界空间 → 观察空间
  const viewPos = multiply(viewMatrix, worldPos);
  
  // 3. 观察空间 → 裁剪空间
  const clipPos = multiply(projectionMatrix, viewPos);
  
  // 4. 透视除法 → NDC
  const ndcPos = [
    clipPos[0] / clipPos[3],
    clipPos[1] / clipPos[3],
    clipPos[2] / clipPos[3]
  ];
  
  return ndcPos;
}
```

## 裁剪（Clipping）

视锥体外的顶点需要被裁剪掉。

裁剪判断（在裁剪空间中）：

$$
-w \leq x \leq w \\
-w \leq y \leq w \\
-w \leq z \leq w \quad \text{(OpenGL)} \\
0 \leq z \leq w \quad \text{(DirectX/WebGPU)}
$$

如果顶点的任何坐标超出范围，就在视锥体外。

```javascript
function isInsideFrustum(clipPos) {
  const x = clipPos[0];
  const y = clipPos[1];
  const z = clipPos[2];
  const w = clipPos[3];
  
  // OpenGL 风格裁剪判断
  return (
    x >= -w && x <= w &&
    y >= -w && y <= w &&
    z >= -w && z <= w
  );
}
```

## 深度缓冲（Depth Buffer）

投影变换后，深度值（z）被映射到 [0, 1] 或 [-1, 1] 范围。

深度缓冲用于判断像素的前后关系：

```javascript
function depthTest(x, y, newDepth, depthBuffer, width) {
  const index = y * width + x;
  
  // 如果新深度更近，更新深度缓冲
  if (newDepth < depthBuffer[index]) {
    depthBuffer[index] = newDepth;
    return true; // 通过测试，绘制像素
  }
  
  return false; // 被遮挡，丢弃像素
}
```

## 投影变换的数学本质

### 正交投影

本质：**线性映射**

- 将 $[left, right]$ 映射到 $[-1, 1]$
- 将 $[bottom, top]$ 映射到 $[-1, 1]$
- 将 $[near, far]$ 映射到 $[-1, 1]$ 或 $[0, 1]$

### 透视投影

本质：**非线性映射**

关键操作：**除以深度**

$$
x_{\text{screen}} \propto \frac{x_{\text{view}}}{z_{\text{view}}}
$$

这就是透视缩放的来源：z 越大（越远），除法结果越小。

## 常见陷阱与注意事项

### 陷阱1：near 和 far 的选择

```javascript
// 错误：near 太小，far 太大
const projection = createPerspective(45, 1.33, 0.001, 100000); // ❌

// 问题：深度精度严重不足（Z-fighting）
```

原因：深度缓冲是非线性的，大部分精度集中在近处。

```javascript
// 正确：合理的近远比
const projection = createPerspective(45, 1.33, 0.1, 1000); // ✅
// near/far 比例约为 1:10000
```

### 陷阱2：透视除法后的深度

```javascript
// 错误：以为 z_ndc 是线性的
const linearDepth = z_ndc; // ❌

// 正确：需要转换回线性深度
function ndcDepthToLinear(z_ndc, near, far) {
  // OpenGL 风格
  const z_clip = z_ndc * 2 - 1; // [0,1] → [-1,1]
  return (2 * near * far) / (far + near - z_clip * (far - near));
}
```

### 陷阱3：FOV 的单位

```javascript
// 错误：角度和弧度混用
const fov = 60; // 是角度还是弧度？
const projection = createPerspective(fov, aspect, near, far); // ❌

// 正确：明确单位
const fovDegrees = 60;
const fovRadians = fovDegrees * Math.PI / 180;
const projection = createPerspective(fovRadians, aspect, near, far); // ✅
```

### 陷阱4：宽高比不匹配

```javascript
// 错误：宽高比与画布不匹配
const canvas = { width: 800, height: 600 }; // 4:3
const aspect = 16 / 9; // 16:9
const projection = createPerspective(fov, aspect, near, far); // ❌
// 结果：图像被拉伸

// 正确：匹配画布宽高比
const aspect = canvas.width / canvas.height; // ✅
```

## 实际应用场景

### 场景1：第一人称游戏

```javascript
// 透视投影 + 较大 FOV
const camera = {
  fov: 75 * Math.PI / 180, // 75度视野（沉浸感）
  aspect: window.innerWidth / window.innerHeight,
  near: 0.1,
  far: 1000
};

const projectionMatrix = createPerspective(
  camera.fov, 
  camera.aspect, 
  camera.near, 
  camera.far
);
```

### 场景2：地图编辑器

```javascript
// 正交投影 + 俯视角
const editor = {
  left: -100,
  right: 100,
  top: 100,
  bottom: -100,
  near: -100,
  far: 100
};

const projectionMatrix = createOrthographic(
  editor.left, 
  editor.right, 
  editor.bottom, 
  editor.top, 
  editor.near, 
  editor.far
);
```

### 场景3：小地图

```javascript
// 正交投影渲染小地图
function renderMinimap(scene, minimapCamera) {
  // 设置小地图视口（右上角 200x200）
  setViewport(600, 0, 200, 200);
  
  // 使用正交投影
  const orthoProjection = createOrthographic(-50, 50, -50, 50, 1, 200);
  
  // 俯视角相机
  minimapCamera.position = { x: 0, y: 100, z: 0 };
  minimapCamera.lookAt({ x: 0, y: 0, z: 0 });
  
  render(scene, minimapCamera, orthoProjection);
}
```

## 总结

投影变换是 3D 到 2D 的关键步骤：

| 概念 | 正交投影 | 透视投影 |
|------|---------|---------|
| **形状** | 长方体 | 截锥体 |
| **透视效果** | 无 | 有 |
| **数学本质** | 线性映射 | 非线性映射（除以深度） |
| **应用场景** | CAD、2D游戏、UI | 3D游戏、电影、VR |
| **关键参数** | left/right/top/bottom | FOV + aspect |

关键要点：
- 投影变换生成**裁剪空间坐标**
- GPU 自动执行**透视除法**得到 NDC
- **near/far** 的选择影响深度精度
- **FOV** 和 **aspect** 决定视野范围
- 裁剪发生在**裁剪空间**，判断条件是 $|x|, |y|, |z| \leq w$

接下来的章节将详细推导正交投影和透视投影的矩阵形式。
