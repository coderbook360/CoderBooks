# 透视投影矩阵推导

站在铁轨旁向远方看，两条平行的轨道似乎在地平线汇聚成一点。这就是**透视**（Perspective）效应。

透视投影的核心思想：**物体距离越远，看起来越小**。

## 透视投影的核心：除以深度

首先要问一个问题：透视投影的数学本质是什么？

答案：**除以深度 z**

相似三角形原理：

```
       |
   P   |       相机
   *   |       📷
  /|\  |       ↑
 / | \ |       |
/  h  \|       |
-------+-------+------ z 轴
   d   |   z   |

屏幕高度 h' = h * (d / z)
```

- $h$：物体的实际高度
- $z$：物体到相机的距离
- $d$：屏幕到相机的距离（焦距）
- $h'$：物体在屏幕上的投影高度

公式：

$$
h' = \frac{h \cdot d}{z}
$$

z 越大（越远），$h'$ 越小。

## 透视投影的参数

两种常见的参数化方式：

### 方式1：视锥体参数（WebGL glFrustum）

```javascript
const frustum = {
  left: -1,     // 近平面左边界
  right: 1,     // 近平面右边界
  bottom: -1,   // 近平面下边界
  top: 1,       // 近平面上边界
  near: 1,      // 近裁剪面距离
  far: 100      // 远裁剪面距离
};
```

### 方式2：FOV + 宽高比（更常用）

```javascript
const camera = {
  fov: 60 * Math.PI / 180,  // 视野角度（弧度）
  aspect: 16 / 9,            // 宽高比
  near: 0.1,                 // 近裁剪面
  far: 1000                  // 远裁剪面
};
```

两种方式可以互相转换：

$$
\begin{align}
top &= near \cdot \tan\left(\frac{fov}{2}\right) \\
right &= top \cdot aspect
\end{align}
$$

## 推导过程：从相似三角形到矩阵

### 第一步：x 和 y 的投影

根据相似三角形：

$$
\begin{align}
x' &= \frac{x \cdot near}{-z} \\
y' &= \frac{y \cdot near}{-z}
\end{align}
$$

注意：
- z 是负值（物体在相机前方）
- 使用 $-z$ 确保结果为正

### 第二步：归一化到 [-1, 1]

将投影结果映射到 NDC 范围：

$$
\begin{align}
x_{\text{ndc}} &= \frac{x'}{right} = \frac{x \cdot near}{-z \cdot right} \\
y_{\text{ndc}} &= \frac{y'}{top} = \frac{y \cdot near}{-z \cdot top}
\end{align}
$$

### 第三步：利用齐次坐标

透视除法发生在矩阵变换之后：

$$
\begin{bmatrix} x_{\text{ndc}} \\ y_{\text{ndc}} \\ z_{\text{ndc}} \\ 1 \end{bmatrix} = \frac{1}{w} \begin{bmatrix} x_{\text{clip}} \\ y_{\text{clip}} \\ z_{\text{clip}} \\ w_{\text{clip}} \end{bmatrix}
$$

关键技巧：设置 $w_{\text{clip}} = -z$，GPU 自动执行除法。

### 第四步：构建 x 和 y 变换

要使得：

$$
\frac{x_{\text{clip}}}{w_{\text{clip}}} = \frac{x \cdot near}{-z \cdot right}
$$

设 $w_{\text{clip}} = -z$，则：

$$
x_{\text{clip}} = \frac{x \cdot near}{right}
$$

矩阵形式：

$$
x_{\text{clip}} = \frac{near}{right} \cdot x
$$

同理：

$$
y_{\text{clip}} = \frac{near}{top} \cdot y
$$

### 第五步：z 坐标变换（OpenGL）

z 变换比较复杂，因为要满足：
1. 近平面 $(z = -near)$ 映射到 $z_{\text{ndc}} = -1$
2. 远平面 $(z = -far)$ 映射到 $z_{\text{ndc}} = 1$
3. 非线性映射（保持深度精度）

设 z 变换为：

$$
z_{\text{clip}} = A \cdot z + B
$$

透视除法后：

$$
z_{\text{ndc}} = \frac{z_{\text{clip}}}{w_{\text{clip}}} = \frac{A \cdot z + B}{-z}
$$

代入边界条件：

$$
\begin{cases}
z = -near: & \frac{-A \cdot near + B}{near} = -1 \\
z = -far: & \frac{-A \cdot far + B}{far} = 1
\end{cases}
$$

解方程：

$$
\begin{align}
A &= -\frac{far + near}{far - near} \\
B &= -\frac{2 \cdot far \cdot near}{far - near}
\end{align}
$$

### 第六步：完整矩阵（OpenGL）

$$
\mathbf{P}_{\text{persp}} = \begin{bmatrix}
\frac{near}{right} & 0 & 0 & 0 \\
0 & \frac{near}{top} & 0 & 0 \\
0 & 0 & -\frac{far + near}{far - near} & -\frac{2 \cdot far \cdot near}{far - near} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

注意第4行：$[0, 0, -1, 0]$，使得 $w_{\text{clip}} = -z$。

## 代码实现（Frustum 版本）

```javascript
function createPerspectiveFrustum(left, right, bottom, top, near, far) {
  return [
    2*near/(right-left),  0,                      (right+left)/(right-left),   0,
    0,                    2*near/(top-bottom),    (top+bottom)/(top-bottom),   0,
    0,                    0,                      -(far+near)/(far-near),      -2*far*near/(far-near),
    0,                    0,                      -1,                          0
  ];
}
```

## 代码实现（FOV 版本）

更常用的 FOV + aspect 版本：

```javascript
function createPerspective(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  
  return [
    f / aspect,  0,   0,                      0,
    0,           f,   0,                      0,
    0,           0,   (far + near) * nf,     2 * far * near * nf,
    0,           0,   -1,                    0
  ];
}

// 示例：60度视野，16:9宽高比
const projection = createPerspective(
  60 * Math.PI / 180,  // 60度
  16 / 9,               // 宽高比
  0.1,                  // 近平面
  1000                  // 远平面
);
```

### FOV 的含义

FOV（Field of View）是**垂直视野角度**：

```
    |
    | top
    |/
   📷 ← 相机
    |\
    | bottom
    |

tan(fov/2) = top / near
```

因此：

$$
top = near \cdot \tan\left(\frac{fov}{2}\right)
$$

## DirectX/WebGPU 版本

DirectX 的 NDC z 范围是 $[0, 1]$。

z 变换调整为：

$$
z_{\text{ndc}} = \frac{A \cdot z + B}{-z}
$$

边界条件：

$$
\begin{cases}
z = -near: & \frac{-A \cdot near + B}{near} = 0 \\
z = -far: & \frac{-A \cdot far + B}{far} = 1
\end{cases}
$$

解得：

$$
\begin{align}
A &= -\frac{far}{far - near} \\
B &= -\frac{far \cdot near}{far - near}
\end{align}
$$

矩阵（DirectX）：

$$
\mathbf{P}_{\text{persp\_DX}} = \begin{bmatrix}
\frac{f}{\text{aspect}} & 0 & 0 & 0 \\
0 & f & 0 & 0 \\
0 & 0 & \frac{far}{near - far} & \frac{far \cdot near}{near - far} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

代码：

```javascript
function createPerspectiveDX(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  
  return [
    f / aspect,  0,   0,                             0,
    0,           f,   0,                             0,
    0,           0,   far / (near - far),           (far * near) / (near - far),
    0,           0,   -1,                           0
  ];
}
```

## 验证示例

### 示例1：近平面中心

```javascript
const projection = createPerspective(
  Math.PI / 3,  // 60度
  16 / 9,
  1,
  100
);

// 近平面中心 (0, 0, -1)
const input = [0, 0, -1, 1];
const clipPos = multiplyMatrixVector(projection, input);

console.log(clipPos); 
// [0, 0, A, 1]  其中 A = -(far+near)/(far-near)

// 透视除法
const ndcPos = [
  clipPos[0] / clipPos[3],  // 0
  clipPos[1] / clipPos[3],  // 0
  clipPos[2] / clipPos[3]   // ≈ -1.02 (接近 -1)
];
```

### 示例2：远平面边缘

```javascript
// 远平面右上角（需先计算坐标）
const far = 100;
const top = far * Math.tan(Math.PI / 6);  // tan(30°)
const right = top * (16 / 9);

const input = [right, top, -far, 1];
const clipPos = multiplyMatrixVector(projection, input);
const ndcPos = [
  clipPos[0] / clipPos[3],  // ≈ 1
  clipPos[1] / clipPos[3],  // ≈ 1
  clipPos[2] / clipPos[3]   // ≈ 1
];
```

## 深度非线性的影响

透视投影的深度映射是**非线性**的：

$$
z_{\text{ndc}} = \frac{A \cdot z + B}{-z} = A + \frac{B}{-z}
$$

特点：
- **近处精度高**：z 接近 -near 时，$\frac{B}{-z}$ 变化快
- **远处精度低**：z 接近 -far 时，$\frac{B}{-z}$ 变化慢

示例：

```javascript
function depthPrecision(z, near, far) {
  const A = -(far + near) / (far - near);
  const B = -2 * far * near / (far - near);
  return A + B / (-z);
}

// near=0.1, far=1000
console.log(depthPrecision(0.1, 0.1, 1000));   // -1.0 (近平面)
console.log(depthPrecision(1, 0.1, 1000));     // -0.82
console.log(depthPrecision(10, 0.1, 1000));    // 0.80
console.log(depthPrecision(100, 0.1, 1000));   // 0.98
console.log(depthPrecision(1000, 0.1, 1000));  // 1.0 (远平面)

// 近处 0.1→1：深度变化 0.18
// 远处 100→1000：深度变化仅 0.02
```

## 实际应用场景

### 场景1：第一人称游戏

```javascript
// 标准第一人称相机
const camera = {
  fov: 75 * Math.PI / 180,   // 较大FOV，沉浸感强
  aspect: window.innerWidth / window.innerHeight,
  near: 0.1,                  // 武器模型很近
  far: 1000                   // 远景
};

const projection = createPerspective(
  camera.fov,
  camera.aspect,
  camera.near,
  camera.far
);
```

### 场景2：第三人称游戏

```javascript
// 第三人称相机
const camera = {
  fov: 50 * Math.PI / 180,   // 适中FOV
  aspect: 16 / 9,
  near: 1,                    // 避免穿透角色
  far: 500
};
```

### 场景3：电影镜头

```javascript
// 模拟 35mm 电影镜头
const FOCAL_LENGTH = 50;  // 毫米
const SENSOR_WIDTH = 36;  // 毫米

function focalLengthToFOV(focalLength, sensorWidth) {
  return 2 * Math.atan(sensorWidth / (2 * focalLength));
}

const fov = focalLengthToFOV(FOCAL_LENGTH, SENSOR_WIDTH);
// fov ≈ 39.6度

const projection = createPerspective(fov, 16/9, 0.1, 1000);
```

### 场景4：VR 渲染

```javascript
// VR：左右眼分别渲染
function renderVR(scene, leftEye, rightEye) {
  // 左眼
  const leftProjection = createPerspective(
    110 * Math.PI / 180,  // VR 需要更大FOV
    1,                     // 方形视口
    0.01,
    100
  );
  renderEye(scene, leftEye, leftProjection, { x: 0, y: 0, width: 512, height: 512 });
  
  // 右眼（镜像参数）
  const rightProjection = leftProjection; // 相同投影
  renderEye(scene, rightEye, rightProjection, { x: 512, y: 0, width: 512, height: 512 });
}
```

## 常见陷阱与注意事项

### 陷阱1：near 太小或 far 太大

```javascript
// 错误：near/far 比例过大
const projection = createPerspective(60, 16/9, 0.001, 100000); // ❌
// 深度精度严重不足，导致 Z-fighting

// 正确：合理的近远比
const projection = createPerspective(60, 16/9, 0.1, 1000); // ✅
// near/far 比例约 1:10000
```

### 陷阱2：FOV 单位混淆

```javascript
// 错误：传入角度值
const projection = createPerspective(60, 16/9, 0.1, 1000); // ❌
// 函数期望弧度，但传入了角度

// 正确：转换为弧度
const fovDegrees = 60;
const fovRadians = fovDegrees * Math.PI / 180;
const projection = createPerspective(fovRadians, 16/9, 0.1, 1000); // ✅
```

### 陷阱3：near = 0

```javascript
// 错误：near 不能为 0
const projection = createPerspective(60, 16/9, 0, 1000); // ❌
// 会导致除以零错误

// 正确：near 必须大于 0
const projection = createPerspective(60, 16/9, 0.1, 1000); // ✅
```

### 陷阱4：宽高比错误

```javascript
// 错误：宽高比颠倒
const aspect = canvas.height / canvas.width; // ❌

// 正确：宽除以高
const aspect = canvas.width / canvas.height; // ✅
```

### 陷阱5：响应式调整

```javascript
// 错误：窗口缩放后不更新投影矩阵
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // ❌ 没有更新 projection
});

// 正确：同步更新投影矩阵
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // ✅ 重新计算宽高比和投影矩阵
  const aspect = canvas.width / canvas.height;
  projection = createPerspective(fov, aspect, near, far);
});
```

## 逆矩阵：从 NDC 到观察空间

屏幕拾取需要将 NDC 坐标反推回观察空间。

透视投影逆矩阵：

$$
\mathbf{P}^{-1}_{\text{persp}} = \begin{bmatrix}
\frac{\text{aspect}}{f} & 0 & 0 & 0 \\
0 & \frac{1}{f} & 0 & 0 \\
0 & 0 & 0 & -1 \\
0 & 0 & \frac{near - far}{2 \cdot near \cdot far} & \frac{near + far}{2 \cdot near \cdot far}
\end{bmatrix}
$$

代码：

```javascript
function invertPerspective(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = near - far;
  
  return [
    aspect / f,  0,      0,                          0,
    0,           1 / f,  0,                          0,
    0,           0,      0,                          nf / (2*near*far),
    0,           0,      -1,                         (near+far) / (2*near*far)
  ];
}
```

## 性能优化

### 优化1：缓存计算结果

```javascript
class PerspectiveCamera {
  constructor(fov, aspect, near, far) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this._projectionMatrix = null;
    this._dirty = true;
  }
  
  getProjectionMatrix() {
    if (this._dirty) {
      this._projectionMatrix = createPerspective(
        this.fov,
        this.aspect,
        this.near,
        this.far
      );
      this._dirty = false;
    }
    return this._projectionMatrix;
  }
  
  updateAspect(newAspect) {
    if (this.aspect !== newAspect) {
      this.aspect = newAspect;
      this._dirty = true;
    }
  }
}
```

### 优化2：预计算常量

```javascript
// 预计算 1/tan(fov/2)
this.f = 1.0 / Math.tan(this.fov / 2);
this.nf = 1 / (this.near - this.far);

// 矩阵构建时直接使用
return [
  this.f / this.aspect, 0,       0,                            0,
  0,                    this.f,  0,                            0,
  0,                    0,       (this.far+this.near)*this.nf, 2*this.far*this.near*this.nf,
  0,                    0,       -1,                           0
];
```

## 总结

透视投影矩阵的核心思想：

| 概念 | 说明 |
|------|------|
| **透视除法** | 除以 $w = -z$ 实现远小近大 |
| **非线性深度** | 深度映射非线性，近处精度高 |
| **FOV** | 垂直视野角度，影响缩放 |
| **aspect** | 宽高比，影响水平缩放 |
| **near/far** | 定义可见范围，影响深度精度 |

关键要点：
- 透视投影的本质是**相似三角形**
- 齐次坐标的 **w 分量**实现透视除法
- **near 不能为 0**，far 不能等于 near
- **near/far 比例**严重影响深度精度
- OpenGL 和 DirectX 的 **z 范围不同**
- FOV 通常指**垂直视野角度**

掌握透视投影，你就能创建逼真的 3D 场景！
