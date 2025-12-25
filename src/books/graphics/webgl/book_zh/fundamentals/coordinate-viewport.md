# WebGL 坐标系统与视口

> "理解坐标变换是 3D 图形编程的核心。"

## WebGL 坐标系统

### 归一化设备坐标 (NDC)

WebGL 使用归一化设备坐标系统，所有可见内容都在一个立方体内：

```
         Y
         │
    1.0  │
         │    ┌─────────────┐
         │    │             │
         │    │   可见区域   │
         │    │             │
   ──────┼────┼─────────────┼──────  X
   -1.0  │    │             │  1.0
         │    │             │
         │    └─────────────┘
   -1.0  │
         │
         │
         ▼
         Z (指向屏幕外)
```

### 坐标范围

| 轴 | 范围 | 说明 |
|----|------|------|
| X | -1 到 1 | 左到右 |
| Y | -1 到 1 | 下到上 |
| Z | -1 到 1 | 近到远 |

### 右手坐标系

WebGL 使用右手坐标系：

```
          Y (上)
          │
          │
          │
          └───────── X (右)
         /
        /
       /
      Z (朝向观察者)
```

## 坐标变换流程

### 变换管线

```
模型坐标 (Local)
      │
      ▼  模型矩阵 (Model Matrix)
世界坐标 (World)
      │
      ▼  视图矩阵 (View Matrix)
观察坐标 (View/Eye)
      │
      ▼  投影矩阵 (Projection Matrix)
裁剪坐标 (Clip)
      │
      ▼  透视除法 (Perspective Division)
归一化设备坐标 (NDC)
      │
      ▼  视口变换 (Viewport Transform)
屏幕坐标 (Screen)
```

### MVP 矩阵

```javascript
// 在顶点着色器中
gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
```

或者预先计算 MVP 矩阵：

```javascript
// JavaScript 中
const mvpMatrix = mat4.create();
mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

// 顶点着色器中
gl_Position = u_mvp * vec4(a_position, 1.0);
```

## 视口设置

### viewport 函数

```javascript
gl.viewport(x, y, width, height);
```

**参数说明**：

| 参数 | 说明 |
|------|------|
| x | 视口左下角 X 坐标（像素） |
| y | 视口左下角 Y 坐标（像素） |
| width | 视口宽度（像素） |
| height | 视口高度（像素） |

### 常见视口设置

```javascript
// 全屏视口
gl.viewport(0, 0, canvas.width, canvas.height);

// 左半屏
gl.viewport(0, 0, canvas.width / 2, canvas.height);

// 右半屏
gl.viewport(canvas.width / 2, 0, canvas.width / 2, canvas.height);

// 小窗口
gl.viewport(100, 100, 400, 300);
```

### 分屏渲染

```javascript
function renderSplitScreen() {
  // 左视图
  gl.viewport(0, 0, canvas.width / 2, canvas.height);
  renderScene(leftViewMatrix);
  
  // 右视图
  gl.viewport(canvas.width / 2, 0, canvas.width / 2, canvas.height);
  renderScene(rightViewMatrix);
}
```

## 处理画布尺寸

### 像素比处理

```javascript
function resizeCanvas(canvas) {
  // 获取 CSS 尺寸
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  
  // 计算实际像素尺寸
  const pixelWidth = Math.floor(displayWidth * devicePixelRatio);
  const pixelHeight = Math.floor(displayHeight * devicePixelRatio);
  
  // 检查是否需要调整
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    return true;
  }
  
  return false;
}
```

### 响应式处理

```javascript
function handleResize() {
  if (resizeCanvas(canvas)) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // 更新投影矩阵的宽高比
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projectionMatrix, fov, aspect, near, far);
  }
}

window.addEventListener('resize', handleResize);
```

## 投影矩阵

### 正交投影

正交投影保持物体大小不变，不随距离变化：

```javascript
// 创建正交投影矩阵
function ortho(left, right, bottom, top, near, far) {
  const out = new Float32Array(16);
  
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = -2 / (far - near);
  out[12] = -(right + left) / (right - left);
  out[13] = -(top + bottom) / (top - bottom);
  out[14] = -(far + near) / (far - near);
  out[15] = 1;
  
  return out;
}

// 使用
const projMatrix = ortho(-1, 1, -1, 1, 0.1, 100);
```

```
正交投影示意：
        ┌─────────────┐
       /│            /│
      / │           / │
     /  │          /  │
    ┌─────────────┐   │
    │   │         │   │
    │   └─────────│───┘
    │  /          │  /
    │ /           │ /
    └─────────────┘
    近平面 = 远平面大小
```

### 透视投影

透视投影模拟人眼，远处物体显得更小：

```javascript
// 创建透视投影矩阵
function perspective(fov, aspect, near, far) {
  const out = new Float32Array(16);
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1.0 / (near - far);
  
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (near + far) * rangeInv;
  out[11] = -1;
  out[14] = 2 * near * far * rangeInv;
  
  return out;
}

// 使用
const fov = Math.PI / 4; // 45度
const aspect = canvas.width / canvas.height;
const near = 0.1;
const far = 100;
const projMatrix = perspective(fov, aspect, near, far);
```

```
透视投影示意：
              远平面
        ┌─────────────────┐
       /                  \
      /                    \
     /                      \
    ┌─────────┐              │
    │ 近平面  │              │
    │         │              │
    └─────────┘              │
     \                      /
      \                    /
       \                  /
        视点 (眼睛位置)
```

## 视图矩阵

### lookAt 函数

```javascript
// 创建视图矩阵
function lookAt(eye, target, up) {
  // 计算相机坐标系
  const zAxis = normalize(subtract(eye, target));  // 相机看向的反方向
  const xAxis = normalize(cross(up, zAxis));       // 相机的右方向
  const yAxis = cross(zAxis, xAxis);               // 相机的上方向
  
  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
  ]);
}

// 使用
const eye = [0, 0, 5];     // 相机位置
const target = [0, 0, 0];  // 观察目标
const up = [0, 1, 0];      // 上方向
const viewMatrix = lookAt(eye, target, up);
```

### 相机控制

```javascript
class Camera {
  constructor() {
    this.position = [0, 0, 5];
    this.target = [0, 0, 0];
    this.up = [0, 1, 0];
  }
  
  getViewMatrix() {
    return lookAt(this.position, this.target, this.up);
  }
  
  // 绕目标旋转
  orbit(deltaX, deltaY) {
    // 计算相对位置
    const offset = subtract(this.position, this.target);
    
    // 转换为球坐标
    const radius = length(offset);
    let theta = Math.atan2(offset[0], offset[2]);
    let phi = Math.acos(offset[1] / radius);
    
    // 更新角度
    theta -= deltaX * 0.01;
    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + deltaY * 0.01));
    
    // 转回笛卡尔坐标
    this.position[0] = this.target[0] + radius * Math.sin(phi) * Math.sin(theta);
    this.position[1] = this.target[1] + radius * Math.cos(phi);
    this.position[2] = this.target[2] + radius * Math.sin(phi) * Math.cos(theta);
  }
  
  // 缩放
  zoom(delta) {
    const direction = normalize(subtract(this.target, this.position));
    const distance = delta * 0.1;
    this.position = add(this.position, scale(direction, distance));
  }
}
```

## 屏幕坐标转世界坐标

### 反投影

```javascript
function screenToWorld(screenX, screenY, z = 0) {
  // 转换到 NDC
  const ndcX = (screenX / canvas.width) * 2 - 1;
  const ndcY = 1 - (screenY / canvas.height) * 2;
  
  // 创建逆 MVP 矩阵
  const mvp = mat4.create();
  mat4.multiply(mvp, projectionMatrix, viewMatrix);
  const invMVP = mat4.create();
  mat4.invert(invMVP, mvp);
  
  // 变换 NDC 坐标
  const ndcPoint = [ndcX, ndcY, z, 1];
  const worldPoint = vec4.transformMat4([], ndcPoint, invMVP);
  
  // 透视除法
  return [
    worldPoint[0] / worldPoint[3],
    worldPoint[1] / worldPoint[3],
    worldPoint[2] / worldPoint[3]
  ];
}
```

### 射线拾取

```javascript
function getRayFromScreen(screenX, screenY) {
  // 近平面和远平面上的点
  const nearPoint = screenToWorld(screenX, screenY, -1);
  const farPoint = screenToWorld(screenX, screenY, 1);
  
  // 射线方向
  const direction = normalize(subtract(farPoint, nearPoint));
  
  return {
    origin: nearPoint,
    direction: direction
  };
}
```

## 本章小结

- WebGL 使用归一化设备坐标 (NDC)，范围 [-1, 1]
- 坐标变换流程：模型 → 世界 → 观察 → 裁剪 → NDC → 屏幕
- 视口定义了渲染输出的屏幕区域
- 正交投影用于 2D 或 CAD，透视投影用于 3D 场景
- 视图矩阵控制相机位置和方向

下一章，我们将开始学习着色器编程。
