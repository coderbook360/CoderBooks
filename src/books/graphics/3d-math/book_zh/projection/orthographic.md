# 正交投影矩阵推导

想象你站在一栋大楼前，用相机拍摄它的侧面。如果相机距离足够远，远处的窗户和近处的窗户看起来大小几乎相同——这就是**正交投影**的效果。

正交投影的特点：**物体大小不随距离改变**，平行线保持平行。

## 正交投影的目标

正交投影矩阵要完成三个任务：

1. **缩放**：将 $[left, right]$ 映射到 $[-1, 1]$
2. **平移**：将中心移到原点
3. **深度映射**：将 $[near, far]$ 映射到 $[-1, 1]$（OpenGL）或 $[0, 1]$（DirectX）

视锥体参数：

```javascript
const frustum = {
  left: -10,    // 左边界
  right: 10,    // 右边界
  bottom: -10,  // 下边界
  top: 10,      // 上边界
  near: 1,      // 近裁剪面
  far: 100      // 远裁剪面
};
```

## 推导过程：分步击破

### 第一步：x 坐标的变换

目标：将 $[left, right]$ 映射到 $[-1, 1]$

**分析**：
- 范围宽度：$right - left$
- 中心位置：$\frac{left + right}{2}$

**操作步骤**：

1. 平移到原点：$x - \frac{left + right}{2}$
2. 缩放到 $[-1, 1]$：$\frac{2}{right - left}$

完整公式：

$$
x' = \frac{2}{right - left} \left( x - \frac{left + right}{2} \right)
$$

展开：

$$
x' = \frac{2x}{right - left} - \frac{left + right}{right - left}
$$

### 第二步：y 坐标的变换

同理，将 $[bottom, top]$ 映射到 $[-1, 1]$：

$$
y' = \frac{2y}{top - bottom} - \frac{top + bottom}{top - bottom}
$$

### 第三步：z 坐标的变换（OpenGL）

OpenGL 的 NDC z 范围是 $[-1, 1]$。

将 $[near, far]$ 映射到 $[-1, 1]$：

$$
z' = \frac{2z}{far - near} - \frac{far + near}{far - near}
$$

但是，**注意符号**：在观察空间中，相机朝向 -z 方向，near 和 far 是正值。

实际公式：

$$
z' = -\frac{2z}{far - near} - \frac{far + near}{far - near}
$$

负号使得近处（z 较小）映射到 -1，远处（z 较大）映射到 1。

### 第四步：构建矩阵

将上述变换写成矩阵形式：

$$
\begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix}
\frac{2}{right - left} & 0 & 0 & -\frac{right + left}{right - left} \\
0 & \frac{2}{top - bottom} & 0 & -\frac{top + bottom}{top - bottom} \\
0 & 0 & -\frac{2}{far - near} & -\frac{far + near}{far - near} \\
0 & 0 & 0 & 1
\end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix}
$$

## 简化公式

定义：

$$
\begin{align}
w &= right - left \\
h &= top - bottom \\
d &= far - near
\end{align}
$$

矩阵简化为：

$$
\mathbf{P}_{\text{ortho}} = \begin{bmatrix}
\frac{2}{w} & 0 & 0 & -\frac{right + left}{w} \\
0 & \frac{2}{h} & 0 & -\frac{top + bottom}{h} \\
0 & 0 & -\frac{2}{d} & -\frac{far + near}{d} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

## 代码实现（OpenGL）

```javascript
function createOrthographic(left, right, bottom, top, near, far) {
  const w = right - left;
  const h = top - bottom;
  const d = far - near;
  
  return [
    2/w,  0,    0,     -(right + left) / w,
    0,    2/h,  0,     -(top + bottom) / h,
    0,    0,    -2/d,  -(far + near) / d,
    0,    0,    0,     1
  ];
}

// 示例：创建一个对称的正交投影
const matrix = createOrthographic(-10, 10, -10, 10, 1, 100);
```

## 特殊情况：对称视锥体

如果视锥体关于原点对称：

$$
left = -right, \quad bottom = -top
$$

则：
- $right + left = 0$
- $top + bottom = 0$

矩阵简化为：

$$
\mathbf{P}_{\text{ortho}} = \begin{bmatrix}
\frac{1}{right} & 0 & 0 & 0 \\
0 & \frac{1}{top} & 0 & 0 \\
0 & 0 & -\frac{2}{far - near} & -\frac{far + near}{far - near} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

代码：

```javascript
function createOrthographicSymmetric(width, height, near, far) {
  const right = width / 2;
  const top = height / 2;
  const d = far - near;
  
  return [
    1/right,  0,      0,      0,
    0,        1/top,  0,      0,
    0,        0,      -2/d,   -(far + near) / d,
    0,        0,      0,      1
  ];
}
```

## DirectX/WebGPU 版本

DirectX 和 WebGPU 的 NDC z 范围是 $[0, 1]$。

z 变换调整为：

$$
z' = \frac{z}{far - near} - \frac{near}{far - near}
$$

完整矩阵：

$$
\mathbf{P}_{\text{ortho\_DX}} = \begin{bmatrix}
\frac{2}{w} & 0 & 0 & -\frac{right + left}{w} \\
0 & \frac{2}{h} & 0 & -\frac{top + bottom}{h} \\
0 & 0 & \frac{1}{d} & -\frac{near}{d} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

代码：

```javascript
function createOrthographicDX(left, right, bottom, top, near, far) {
  const w = right - left;
  const h = top - bottom;
  const d = far - near;
  
  return [
    2/w,  0,    0,    -(right + left) / w,
    0,    2/h,  0,    -(top + bottom) / h,
    0,    0,    1/d,  -near / d,
    0,    0,    0,    1
  ];
}
```

## 验证示例

### 示例1：中心点

```javascript
const matrix = createOrthographic(-10, 10, -10, 10, 1, 100);

// 中心点 (0, 0, -50)
const input = [0, 0, -50, 1];
const output = multiplyMatrixVector(matrix, input);

console.log(output); 
// [0, 0, 0, 1]
// x: 0 → 0 (中心)
// y: 0 → 0 (中心)
// z: -50 → 0 (深度中间)
```

### 示例2：边界点

```javascript
// 右上远角 (10, 10, -100)
const input = [10, 10, -100, 1];
const output = multiplyMatrixVector(matrix, input);

console.log(output); 
// [1, 1, 1, 1]
// x: right → 1
// y: top → 1
// z: far → 1
```

### 示例3：左下近角

```javascript
// 左下近角 (-10, -10, -1)
const input = [-10, -10, -1, 1];
const output = multiplyMatrixVector(matrix, input);

console.log(output); 
// [-1, -1, -1, 1]
// x: left → -1
// y: bottom → -1
// z: near → -1
```

## 实际应用场景

### 场景1：2D 游戏渲染

```javascript
// 像素完美的 2D 渲染
const canvas = { width: 800, height: 600 };

// 正交投影：1单位 = 1像素
const projection = createOrthographic(
  0, canvas.width,      // x: 0 到 800
  0, canvas.height,     // y: 0 到 600
  -1, 1                 // z: 不重要
);

// 精灵位置 (100, 200) 直接对应像素坐标
```

### 场景2：CAD 软件

```javascript
// 建筑平面图（俯视图）
const editorView = {
  zoom: 1.0,
  centerX: 0,
  centerY: 0
};

function updateProjection(view, canvas) {
  const halfWidth = canvas.width / (2 * view.zoom);
  const halfHeight = canvas.height / (2 * view.zoom);
  
  return createOrthographic(
    view.centerX - halfWidth,
    view.centerX + halfWidth,
    view.centerY - halfHeight,
    view.centerY + halfHeight,
    -1000,
    1000
  );
}

// 缩放操作
function zoom(delta) {
  editorView.zoom *= (1 + delta * 0.1);
  const newProjection = updateProjection(editorView, canvas);
}
```

### 场景3：UI 叠加

```javascript
// 在 3D 场景上叠加 2D UI
function renderUI(canvas) {
  // UI 使用正交投影
  const uiProjection = createOrthographic(
    0, canvas.width,
    canvas.height, 0,  // y 轴翻转（原点在左上角）
    -1, 1
  );
  
  // 绘制 UI 元素
  drawButton(100, 50, 150, 40, uiProjection);
  drawText("Score: 100", 10, 10, uiProjection);
}
```

### 场景4：阴影贴图（平行光）

```javascript
// 平行光使用正交投影渲染阴影贴图
function renderShadowMap(light, scene) {
  // 平行光的"相机"
  const shadowCamera = {
    left: -50,
    right: 50,
    bottom: -50,
    top: 50,
    near: 0.1,
    far: 200
  };
  
  const lightProjection = createOrthographic(
    shadowCamera.left,
    shadowCamera.right,
    shadowCamera.bottom,
    shadowCamera.top,
    shadowCamera.near,
    shadowCamera.far
  );
  
  const lightView = lookAt(light.position, light.target, { x: 0, y: 1, z: 0 });
  
  // 从光源视角渲染深度
  renderToDepthTexture(scene, lightView, lightProjection);
}
```

## 常见陷阱与注意事项

### 陷阱1：near 和 far 的符号

```javascript
// 错误：near > far
const matrix = createOrthographic(-10, 10, -10, 10, 100, 1); // ❌

// 正确：near < far
const matrix = createOrthographic(-10, 10, -10, 10, 1, 100); // ✅
```

### 陷阱2：负 z 坐标

观察空间中，物体在相机前方时 z 是负值：

```javascript
// 物体在相机前方 10 单位
const objectZ = -10; // 注意负号

// near/far 是正值
const near = 1;
const far = 100;
```

### 陷阱3：y 轴方向

不同系统的 y 轴方向不同：

```javascript
// OpenGL：原点在左下角，y 向上
const projection = createOrthographic(0, 800, 0, 600, -1, 1);

// Canvas/UI：原点在左上角，y 向下
const projection = createOrthographic(0, 800, 600, 0, -1, 1); // 交换 bottom/top
```

### 陷阱4：宽高比失真

```javascript
// 错误：不考虑画布宽高比
const projection = createOrthographic(-10, 10, -10, 10, 1, 100); // ❌
// 如果画布是 800x600，圆形会变成椭圆

// 正确：匹配宽高比
const aspect = canvas.width / canvas.height;
const height = 10;
const width = height * aspect;
const projection = createOrthographic(-width, width, -height, height, 1, 100); // ✅
```

## 逆矩阵推导

有时需要从 NDC 反推回观察空间（例如屏幕拾取）。

正交投影的逆矩阵：

$$
\mathbf{P}^{-1}_{\text{ortho}} = \begin{bmatrix}
\frac{w}{2} & 0 & 0 & \frac{right + left}{2} \\
0 & \frac{h}{2} & 0 & \frac{top + bottom}{2} \\
0 & 0 & -\frac{d}{2} & -\frac{far + near}{2} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

代码：

```javascript
function invertOrthographic(left, right, bottom, top, near, far) {
  const w = right - left;
  const h = top - bottom;
  const d = far - near;
  
  return [
    w/2,  0,     0,      (right + left) / 2,
    0,    h/2,   0,      (top + bottom) / 2,
    0,    0,     -d/2,   -(far + near) / 2,
    0,    0,     0,      1
  ];
}
```

## 性能优化

### 优化1：预计算常量

```javascript
class OrthographicProjection {
  constructor(left, right, bottom, top, near, far) {
    this.left = left;
    this.right = right;
    this.bottom = bottom;
    this.top = top;
    this.near = near;
    this.far = far;
    
    // 预计算
    this.scaleX = 2 / (right - left);
    this.scaleY = 2 / (top - bottom);
    this.scaleZ = -2 / (far - near);
    this.offsetX = -(right + left) / (right - left);
    this.offsetY = -(top + bottom) / (top - bottom);
    this.offsetZ = -(far + near) / (far - near);
  }
  
  getMatrix() {
    return [
      this.scaleX, 0, 0, this.offsetX,
      0, this.scaleY, 0, this.offsetY,
      0, 0, this.scaleZ, this.offsetZ,
      0, 0, 0, 1
    ];
  }
}
```

### 优化2：避免重复计算

```javascript
// 缓存投影矩阵
let cachedProjection = null;
let cachedParams = null;

function getOrthographicProjection(left, right, bottom, top, near, far) {
  const params = `${left},${right},${bottom},${top},${near},${far}`;
  
  if (params !== cachedParams) {
    cachedProjection = createOrthographic(left, right, bottom, top, near, far);
    cachedParams = params;
  }
  
  return cachedProjection;
}
```

## 总结

正交投影矩阵的推导过程：

| 步骤 | 操作 | 公式 |
|------|------|------|
| **x 变换** | 缩放 + 平移 | $x' = \frac{2x}{right - left} - \frac{right + left}{right - left}$ |
| **y 变换** | 缩放 + 平移 | $y' = \frac{2y}{top - bottom} - \frac{top + bottom}{top - bottom}$ |
| **z 变换** | 缩放 + 平移 | $z' = -\frac{2z}{far - near} - \frac{far + near}{far - near}$ |

关键要点：
- 正交投影是**线性变换**
- 矩阵第4列是**平移分量**
- 主对角线是**缩放因子**
- OpenGL 和 DirectX 的 **z 映射范围不同**
- 对称视锥体可以**简化计算**
- 需要考虑画布的**宽高比**

正交投影适合 2D 游戏、CAD 软件和技术图纸，下一章将推导透视投影矩阵。
