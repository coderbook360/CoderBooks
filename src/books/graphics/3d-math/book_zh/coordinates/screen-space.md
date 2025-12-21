# 屏幕空间与视口变换

经过投影变换后，顶点坐标已经在 **NDC**（归一化设备坐标，Normalized Device Coordinates）空间中，范围是 [-1, 1]。

但屏幕的坐标系是这样的：

```javascript
canvas.width = 800;   // 像素宽度
canvas.height = 600;  // 像素高度
// 左上角是 (0, 0)，右下角是 (800, 600)
```

如何将 NDC 坐标映射到屏幕像素坐标？这就是**视口变换**（Viewport Transform）。

## NDC 空间的定义

首先要问一个问题：为什么 NDC 的范围是 [-1, 1]？

这是一个**标准化范围**，与具体的屏幕分辨率无关。

- **x 轴**：-1（左） 到 +1（右）
- **y 轴**：-1（下） 到 +1（上）
- **z 轴**：-1（近） 到 +1（远）（OpenGL）或 0（近） 到 1（远）（DirectX/WebGPU）

注意：不同图形 API 对 y 轴和 z 轴的定义可能不同。

## 屏幕空间的定义

**屏幕空间**（Screen Space）是最终像素坐标系统。

- **原点**：通常在**左上角**（Web/UI 习惯）或**左下角**（OpenGL 习惯）
- **x 轴**：0 到 宽度（像素）
- **y 轴**：0 到 高度（像素）
- **z 轴**：深度值（用于深度测试）

示例：
- 屏幕宽度 800，高度 600
- 屏幕中心：(400, 300)
- 左上角：(0, 0)
- 右下角：(800, 600)

## 视口变换的推导

### 第一步：从 [-1, 1] 缩放到 [0, 2]

$$
x' = x + 1 \\
y' = y + 1
$$

范围变为 [0, 2]。

### 第二步：缩放到屏幕尺寸

$$
x'' = x' \times \frac{\text{width}}{2} = (x + 1) \times \frac{\text{width}}{2} \\
y'' = y' \times \frac{\text{height}}{2} = (y + 1) \times \frac{\text{height}}{2}
$$

### 第三步：处理 y 轴翻转（可选）

如果屏幕原点在左上角（Web Canvas），y 轴需要翻转：

$$
y_{\text{screen}} = \text{height} - y''
$$

### 完整公式（原点在左上角）

$$
x_{\text{screen}} = (x_{\text{ndc}} + 1) \times \frac{\text{width}}{2} \\
y_{\text{screen}} = (1 - y_{\text{ndc}}) \times \frac{\text{height}}{2}
$$

### 完整公式（原点在左下角）

$$
x_{\text{screen}} = (x_{\text{ndc}} + 1) \times \frac{\text{width}}{2} \\
y_{\text{screen}} = (y_{\text{ndc}} + 1) \times \frac{\text{height}}{2}
$$

## 视口变换矩阵

视口变换可以用矩阵表示（原点在左下角）：

$$
\mathbf{V} = \begin{bmatrix}
\frac{w}{2} & 0 & 0 & \frac{w}{2} \\
0 & \frac{h}{2} & 0 & \frac{h}{2} \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

其中 $w$ 是屏幕宽度，$h$ 是屏幕高度。

应用变换：

$$
\begin{bmatrix} x_{\text{screen}} \\ y_{\text{screen}} \\ z_{\text{screen}} \\ 1 \end{bmatrix} = \mathbf{V} \cdot \begin{bmatrix} x_{\text{ndc}} \\ y_{\text{ndc}} \\ z_{\text{ndc}} \\ 1 \end{bmatrix}
$$

### 代码实现

```javascript
function createViewportMatrix(width, height) {
  const w = width;
  const h = height;
  
  return [
    w/2,  0,   0, w/2,
    0,    h/2, 0, h/2,
    0,    0,   1, 0,
    0,    0,   0, 1
  ];
}

function ndcToScreen(ndcX, ndcY, width, height) {
  const screenX = (ndcX + 1) * width / 2;
  const screenY = (ndcY + 1) * height / 2;
  return { x: screenX, y: screenY };
}

// 示例
const ndc = { x: 0, y: 0 };  // NDC 中心
const screen = ndcToScreen(ndc.x, ndc.y, 800, 600);
console.log(screen); // { x: 400, y: 300 } - 屏幕中心
```

### 处理 y 轴翻转（Canvas/DOM）

```javascript
function ndcToScreenFlipped(ndcX, ndcY, width, height) {
  const screenX = (ndcX + 1) * width / 2;
  const screenY = (1 - ndcY) * height / 2; // 翻转 y 轴
  return { x: screenX, y: screenY };
}

// 示例
const ndc = { x: 0, y: 1 };  // NDC 顶部中心
const screen = ndcToScreenFlipped(ndc.x, ndc.y, 800, 600);
console.log(screen); // { x: 400, y: 0 } - 屏幕顶部中心
```

## 视口的概念

**视口**（Viewport）是屏幕上用于渲染的矩形区域。

通常视口就是整个屏幕，但也可以是屏幕的一部分：

```javascript
const viewport = {
  x: 100,       // 视口左上角 x 坐标
  y: 50,        // 视口左上角 y 坐标
  width: 600,   // 视口宽度
  height: 400   // 视口高度
};
```

视口变换公式调整为：

$$
x_{\text{screen}} = \text{viewport.x} + (x_{\text{ndc}} + 1) \times \frac{\text{viewport.width}}{2} \\
y_{\text{screen}} = \text{viewport.y} + (y_{\text{ndc}} + 1) \times \frac{\text{viewport.height}}{2}
$$

### 代码实现

```javascript
function ndcToViewport(ndcX, ndcY, viewport) {
  const screenX = viewport.x + (ndcX + 1) * viewport.width / 2;
  const screenY = viewport.y + (ndcY + 1) * viewport.height / 2;
  return { x: screenX, y: screenY };
}

// 示例：分屏渲染
const leftViewport = { x: 0, y: 0, width: 400, height: 600 };
const rightViewport = { x: 400, y: 0, width: 400, height: 600 };

// NDC 中心映射到左视口
const left = ndcToViewport(0, 0, leftViewport);
console.log(left); // { x: 200, y: 300 }

// NDC 中心映射到右视口
const right = ndcToViewport(0, 0, rightViewport);
console.log(right); // { x: 600, y: 300 }
```

## 完整渲染管线回顾

从模型顶点到屏幕像素的完整流程：

```javascript
// 1. 模型空间顶点
const vertex = [0, 1, 0, 1];

// 2. 世界变换
const worldVertex = multiply(worldMatrix, vertex);

// 3. 观察变换
const viewVertex = multiply(viewMatrix, worldVertex);

// 4. 投影变换
const clipVertex = multiply(projectionMatrix, viewVertex);

// 5. 透视除法（得到 NDC）
const ndcVertex = [
  clipVertex[0] / clipVertex[3],
  clipVertex[1] / clipVertex[3],
  clipVertex[2] / clipVertex[3]
];

// 6. 视口变换（得到屏幕坐标）
const screenVertex = ndcToScreen(
  ndcVertex[0], 
  ndcVertex[1], 
  800, 
  600
);

console.log(screenVertex); // { x: 425, y: 280 }
```

## 实际应用场景

### 场景1：屏幕空间拾取

点击屏幕上的某个像素，判断点击了哪个 3D 物体：

```javascript
function screenToNDC(screenX, screenY, width, height) {
  const ndcX = (screenX / width) * 2 - 1;
  const ndcY = 1 - (screenY / height) * 2; // y 轴翻转
  return { x: ndcX, y: ndcY };
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  const ndc = screenToNDC(screenX, screenY, canvas.width, canvas.height);
  
  // 构造射线进行拾取
  const ray = createRayFromNDC(ndc.x, ndc.y, camera);
  const hitObject = raycast(ray, scene.objects);
  
  if (hitObject) {
    console.log('点击了对象:', hitObject.name);
  }
});
```

### 场景2：分屏渲染

多个相机渲染到不同的视口：

```javascript
function renderSplitScreen(scene, camera1, camera2) {
  // 左半屏：相机1
  const leftViewport = { x: 0, y: 0, width: 400, height: 600 };
  setViewport(leftViewport);
  render(scene, camera1);
  
  // 右半屏：相机2
  const rightViewport = { x: 400, y: 0, width: 400, height: 600 };
  setViewport(rightViewport);
  render(scene, camera2);
}
```

### 场景3：UI 叠加

3D 场景中叠加 2D UI 元素：

```javascript
// 将 3D 物体的世界位置投影到屏幕
function projectWorldToScreen(worldPos, camera, viewport) {
  // 1. 世界空间 → 观察空间
  const viewPos = multiply(camera.viewMatrix, worldPos);
  
  // 2. 观察空间 → 裁剪空间
  const clipPos = multiply(camera.projectionMatrix, viewPos);
  
  // 3. 透视除法 → NDC
  const ndcPos = [
    clipPos[0] / clipPos[3],
    clipPos[1] / clipPos[3],
    clipPos[2] / clipPos[3]
  ];
  
  // 4. 检查是否在视锥体内
  if (Math.abs(ndcPos[0]) > 1 || 
      Math.abs(ndcPos[1]) > 1 || 
      ndcPos[2] < -1 || ndcPos[2] > 1) {
    return null; // 不可见
  }
  
  // 5. NDC → 屏幕坐标
  return ndcToScreen(ndcPos[0], ndcPos[1], viewport.width, viewport.height);
}

// 在敌人头顶显示血条
enemies.forEach(enemy => {
  const screenPos = projectWorldToScreen(enemy.position, camera, viewport);
  if (screenPos) {
    drawHealthBar(screenPos.x, screenPos.y, enemy.health);
  }
});
```

### 场景4：屏幕空间特效

屏幕空间环境光遮蔽（SSAO）、屏幕空间反射（SSR）：

```javascript
// 屏幕空间环境光遮蔽
function computeSSAO(depthBuffer, normalBuffer, width, height) {
  const occlusionBuffer = new Float32Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // 将屏幕坐标转换为 NDC
      const ndcX = (x / width) * 2 - 1;
      const ndcY = (y / height) * 2 - 1;
      
      // 采样周围像素计算遮蔽
      const occlusion = sampleOcclusion(
        ndcX, ndcY, 
        depthBuffer, 
        normalBuffer
      );
      
      occlusionBuffer[idx] = occlusion;
    }
  }
  
  return occlusionBuffer;
}
```

## 深度值的处理

视口变换不仅处理 x 和 y，还需要处理深度值 z。

### OpenGL 风格（z ∈ [-1, 1] → [0, 1]）

$$
z_{\text{depth}} = \frac{z_{\text{ndc}} + 1}{2}
$$

### DirectX/WebGPU 风格（z ∈ [0, 1] 不变）

$$
z_{\text{depth}} = z_{\text{ndc}}
$$

深度值用于深度测试（Depth Test）：

```javascript
function depthTest(x, y, newDepth, depthBuffer, width) {
  const idx = y * width + x;
  
  // 检查新深度是否更近
  if (newDepth < depthBuffer[idx]) {
    depthBuffer[idx] = newDepth; // 更新深度
    return true; // 通过测试
  }
  
  return false; // 被遮挡
}
```

## 常见陷阱与注意事项

### 陷阱1：y 轴方向混淆

不同系统的 y 轴方向不同：

- **OpenGL/WebGL**：原点在左下角，y 向上
- **Canvas/DOM**：原点在左上角，y 向下
- **DirectX**：原点在左上角，y 向下

```javascript
// WebGL (原点在左下角)
const y = (ndcY + 1) * height / 2;

// Canvas (原点在左上角)
const y = (1 - ndcY) * height / 2;
```

### 陷阱2：视口裁剪

没有检查顶点是否在视口内：

```javascript
// 错误：直接绘制所有顶点
vertices.forEach(v => {
  const screen = ndcToScreen(v.x, v.y, width, height);
  drawPixel(screen.x, screen.y); // 可能越界
});

// 正确：裁剪到视口范围
vertices.forEach(v => {
  if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) { // NDC 范围检查
    const screen = ndcToScreen(v.x, v.y, width, height);
    drawPixel(screen.x, screen.y);
  }
});
```

### 陷阱3：浮点数到整数的转换

屏幕坐标是整数像素位置：

```javascript
// 错误：使用浮点数
const screenX = (ndcX + 1) * width / 2; // 可能是 425.7834

// 正确：四舍五入
const screenX = Math.round((ndcX + 1) * width / 2); // 426
```

或者使用向下取整（性能更好）：

```javascript
const screenX = ((ndcX + 1) * width / 2) | 0; // 位运算取整
```

### 陷阱4：高 DPI 屏幕

Canvas 的逻辑尺寸与物理像素不同：

```javascript
const canvas = document.createElement('canvas');
const dpr = window.devicePixelRatio || 1;

// 逻辑尺寸
canvas.style.width = '800px';
canvas.style.height = '600px';

// 物理像素
canvas.width = 800 * dpr;
canvas.height = 600 * dpr;

// 视口变换使用物理像素
const screenPos = ndcToScreen(ndcX, ndcY, canvas.width, canvas.height);
```

## 总结

屏幕空间与视口变换是渲染管线的最后一步：

| 空间 | 坐标范围 | 原点 | 用途 |
|------|---------|------|------|
| **NDC** | [-1, 1] | 中心 | 标准化设备坐标 |
| **屏幕空间** | [0, width] × [0, height] | 左上角或左下角 | 像素坐标 |

关键要点：
- NDC 到屏幕的变换：**缩放 + 平移**
- 注意 **y 轴方向**（不同系统不同）
- 视口可以是屏幕的**任意矩形区域**
- 深度值用于**深度测试**
- 屏幕坐标必须是**整数像素**
- 高 DPI 屏幕需要处理 **devicePixelRatio**

理解视口变换，你就掌握了从 3D 世界到 2D 屏幕的完整流程！
