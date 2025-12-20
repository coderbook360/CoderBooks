# 深度缓冲与深度精度

当两个三角形重叠时，如何判断哪个在前面？答案是使用**深度缓冲**（Depth Buffer，也叫 Z-Buffer）。

但如果你遇到过两个表面相互闪烁的现象（Z-Fighting），那是**深度精度**不足的表现。

## 什么是深度缓冲

**深度缓冲**是一个 2D 数组，存储每个像素的深度值。

```javascript
const depthBuffer = new Float32Array(width * height);

// 初始化为最大深度（最远）
depthBuffer.fill(1.0);
```

渲染流程：

```javascript
function renderTriangle(triangle, colorBuffer, depthBuffer, width) {
  triangle.pixels.forEach(pixel => {
    const { x, y, depth } = pixel;
    const index = y * width + x;
    
    // 深度测试
    if (depth < depthBuffer[index]) {
      // 更近，更新颜色和深度
      colorBuffer[index] = pixel.color;
      depthBuffer[index] = depth;
    }
    // 否则丢弃像素（被遮挡）
  });
}
```

## 深度值的范围

深度值经过投影变换和透视除法后，落在标准范围内：

| 图形 API | NDC z 范围 | 深度缓冲范围 |
|----------|-----------|-------------|
| **OpenGL/WebGL** | [-1, 1] | [0, 1] |
| **DirectX/WebGPU** | [0, 1] | [0, 1] |

OpenGL 需要额外的映射：

$$
z_{\text{depth}} = \frac{z_{\text{ndc}} + 1}{2}
$$

## 深度测试的类型

深度测试比较运算符可以配置：

```javascript
// WebGL 示例
gl.enable(gl.DEPTH_TEST);

// 常见的深度测试模式
gl.depthFunc(gl.LESS);     // 深度更小（更近）通过测试（默认）
gl.depthFunc(gl.LEQUAL);   // 深度小于等于通过测试
gl.depthFunc(gl.GREATER);  // 深度更大（更远）通过测试
gl.depthFunc(gl.ALWAYS);   // 总是通过测试
gl.depthFunc(gl.NEVER);    // 总是不通过测试
```

最常用的是 `LESS`：新像素的深度更小（更近）时覆盖旧像素。

## 深度非线性问题

首先要问一个问题：为什么深度精度不均匀？

因为透视投影的深度映射是**非线性**的。

### 透视投影的深度映射

回顾透视投影的 z 变换（OpenGL）：

$$
z_{\text{ndc}} = \frac{A \cdot z_{\text{view}} + B}{-z_{\text{view}}}
$$

其中：

$$
\begin{align}
A &= -\frac{far + near}{far - near} \\
B &= -\frac{2 \cdot far \cdot near}{far - near}
\end{align}
$$

展开：

$$
z_{\text{ndc}} = -\frac{far + near}{far - near} + \frac{2 \cdot far \cdot near}{(far - near) \cdot z_{\text{view}}}
$$

这是一个**双曲函数**！

### 数值示例

```javascript
function ndcDepth(z, near, far) {
  const A = -(far + near) / (far - near);
  const B = -2 * far * near / (far - near);
  return A + B / (-z);
}

// near=0.1, far=100
const near = 0.1;
const far = 100;

console.log('z=0.1:', ndcDepth(0.1, near, far));   // -1.0 (近平面)
console.log('z=1:  ', ndcDepth(1, near, far));     // -0.82
console.log('z=5:  ', ndcDepth(5, near, far));     // -0.04
console.log('z=10: ', ndcDepth(10, near, far));    // 0.40
console.log('z=50: ', ndcDepth(50, near, far));    // 0.96
console.log('z=100:', ndcDepth(100, near, far));   // 1.0 (远平面)

// 近处 0.1→1：深度变化 0.18
// 中间 1→10：深度变化 1.22
// 远处 10→100：深度变化仅 0.60
```

### 精度分布

假设深度缓冲使用 24 位（$2^{24} = 16777216$ 个不同值）：

```javascript
function depthPrecision(near, far) {
  const totalLevels = Math.pow(2, 24);
  
  // 近处 1% 范围内的精度
  const nearRange = near + (far - near) * 0.01;
  const nearDepth1 = ndcDepth(near, near, far);
  const nearDepth2 = ndcDepth(nearRange, near, far);
  const nearLevels = Math.abs(nearDepth2 - nearDepth1) * totalLevels;
  
  // 远处 1% 范围内的精度
  const farRange = far - (far - near) * 0.01;
  const farDepth1 = ndcDepth(farRange, near, far);
  const farDepth2 = ndcDepth(far, near, far);
  const farLevels = Math.abs(farDepth2 - farDepth1) * totalLevels;
  
  console.log(`Near precision: ${nearLevels.toFixed(0)} levels`);
  console.log(`Far precision: ${farLevels.toFixed(0)} levels`);
}

depthPrecision(0.1, 100);
// Near precision: 3000000 levels (高精度)
// Far precision: 3000 levels (低精度，相差1000倍！)
```

## Z-Fighting：深度冲突

**Z-Fighting**（深度冲突）发生在两个表面距离极近时，深度精度不足以区分它们。

现象：
- 表面相互闪烁
- 出现奇怪的条纹
- 随相机角度变化

原因：
1. **near/far 比例过大**
2. **两个表面太近**（共面或几乎共面）
3. **深度缓冲位数不足**

### 示例：Z-Fighting 复现

```javascript
// 两个重叠的三角形
const triangle1 = {
  vertices: [
    { x: 0, y: 0, z: -10.0 },
    { x: 1, y: 0, z: -10.0 },
    { x: 0, y: 1, z: -10.0 }
  ]
};

const triangle2 = {
  vertices: [
    { x: 0, y: 0, z: -10.0001 }, // 仅差 0.0001
    { x: 1, y: 0, z: -10.0001 },
    { x: 0, y: 1, z: -10.0001 }
  ]
};

// 如果 near=0.1, far=1000，深度精度不足以区分
// 两个三角形会随机出现在前面
```

## 解决方案1：优化 near 和 far

**关键原则**：尽量减小 near/far 比例。

```javascript
// 错误：near 太小，far 太大
const badCamera = {
  near: 0.001,
  far: 100000
};
// near/far 比例 = 1:100,000,000

// 正确：合理的近远比
const goodCamera = {
  near: 0.1,
  far: 1000
};
// near/far 比例 = 1:10,000
```

### 经验法则

| 场景类型 | near | far | 比例 |
|---------|------|-----|------|
| **室内** | 0.1 | 100 | 1:1000 |
| **室外小场景** | 0.1 | 500 | 1:5000 |
| **室外大场景** | 1.0 | 10000 | 1:10000 |
| **飞行模拟** | 10 | 100000 | 1:10000 |

### 动态调整 far

```javascript
// 根据场景动态计算 far
function calculateFarPlane(objects, cameraPos) {
  let maxDistance = 0;
  
  objects.forEach(obj => {
    const distance = calculateDistance(cameraPos, obj.position);
    maxDistance = Math.max(maxDistance, distance);
  });
  
  // 留一些余量
  return maxDistance * 1.5;
}

// 每帧更新
const newFar = calculateFarPlane(scene.objects, camera.position);
if (Math.abs(newFar - camera.far) > 10) {
  camera.far = newFar;
  camera.updateProjection();
}
```

## 解决方案2：Polygon Offset

手动偏移深度值，避免共面冲突：

```javascript
// WebGL 示例
gl.enable(gl.POLYGON_OFFSET_FILL);

// 绘制地面
gl.polygonOffset(0, 0);
drawGround();

// 绘制贴花（稍微偏移）
gl.polygonOffset(-1, -1);
drawDecals();

gl.disable(gl.POLYGON_OFFSET_FILL);
```

参数含义：
- **factor**：斜率相关偏移
- **units**：常量偏移

偏移公式：

$$
z_{\text{offset}} = z + factor \cdot slope + units \cdot r
$$

其中 $r$ 是深度缓冲的最小可区分值。

## 解决方案3：对数深度缓冲

**对数深度缓冲**将深度映射改为对数分布，提供均匀的精度。

数学原理：

$$
z_{\text{log}} = \frac{\log(C \cdot z + 1)}{\log(C \cdot far + 1)}
$$

其中 $C = 1$ 是常用选择。

### 实现（片段着色器）

```glsl
// 顶点着色器传递线性深度
varying float vViewZ;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewZ = -mvPosition.z; // 线性深度（正值）
  
  gl_Position = projectionMatrix * mvPosition;
}
```

```glsl
// 片段着色器重写深度
uniform float cameraNear;
uniform float cameraFar;

varying float vViewZ;

void main() {
  // 计算对数深度
  float logDepth = log(1.0 + vViewZ) / log(1.0 + cameraFar);
  
  // 写入深度
  gl_FragDepth = logDepth;
  
  // 正常着色
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

优点：
- **精度均匀分布**
- 支持极大的 near/far 比例（1:1,000,000）

缺点：
- **性能开销**：每个片段都要计算对数
- **需要扩展**：WebGL 需要 `EXT_frag_depth`

## 解决方案4：反转 Z

**反转 Z**（Reversed-Z）交换 near 和 far 的深度值，提升浮点精度利用率。

原理：浮点数在接近 0 时精度最高，接近 1 时精度最低。

传统映射：
- near → 0（高精度） ✅
- far → 1（低精度） ❌

反转映射：
- near → 1（高精度） ✅
- far → 0（仍然高精度！） ✅

### 实现

修改投影矩阵的 z 变换：

```javascript
function createPerspectiveReversedZ(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  
  return [
    f / aspect,  0,   0,                0,
    0,           f,   0,                0,
    0,           0,   0,                near,  // 修改这里
    0,           0,   -1,               0      // 修改这里
  ];
}
```

深度测试改为 `GREATER`：

```javascript
gl.depthFunc(gl.GREATER); // 深度更大（实际更近）通过测试
```

清空深度缓冲为 0：

```javascript
gl.clearDepth(0.0); // 最远深度是 0
gl.clear(gl.DEPTH_BUFFER_BIT);
```

## 深度缓冲的格式

常见的深度缓冲格式：

| 格式 | 位数 | 精度 | 用途 |
|------|------|------|------|
| **DEPTH_COMPONENT16** | 16 | 65536 | 移动端，低精度 |
| **DEPTH_COMPONENT24** | 24 | 16M | 常用，中等精度 |
| **DEPTH_COMPONENT32F** | 32 (浮点) | 极高 | 高精度需求 |
| **DEPTH24_STENCIL8** | 24+8 | 16M | 深度+模板缓冲 |

### 创建深度纹理

```javascript
// WebGL 2.0
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);

gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.DEPTH_COMPONENT24,  // 24位深度
  width,
  height,
  0,
  gl.DEPTH_COMPONENT,
  gl.UNSIGNED_INT,
  null
);

// 附加到帧缓冲
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.DEPTH_ATTACHMENT,
  gl.TEXTURE_2D,
  depthTexture,
  0
);
```

## 调试深度缓冲

### 可视化深度

```glsl
// 片段着色器：显示深度值
void main() {
  float depth = gl_FragCoord.z; // [0, 1]
  
  // 线性化深度（可选）
  float linearDepth = (2.0 * near) / (far + near - depth * (far - near));
  
  gl_FragColor = vec4(vec3(linearDepth), 1.0);
}
```

### 输出深度统计

```javascript
function analyzeDepthBuffer(depthBuffer, width, height) {
  let min = 1.0;
  let max = 0.0;
  let sum = 0;
  
  for (let i = 0; i < depthBuffer.length; i++) {
    const depth = depthBuffer[i];
    min = Math.min(min, depth);
    max = Math.max(max, depth);
    sum += depth;
  }
  
  console.log(`Depth range: [${min.toFixed(4)}, ${max.toFixed(4)}]`);
  console.log(`Average depth: ${(sum / depthBuffer.length).toFixed(4)}`);
}
```

## 实际应用场景

### 场景1：阴影贴图

深度缓冲用于渲染阴影贴图：

```javascript
// 第一遍：从光源视角渲染深度
function renderShadowMap(light, scene) {
  bindFramebuffer(shadowMapFBO);
  clearDepth(1.0);
  
  const lightView = lookAt(light.position, light.target);
  const lightProjection = createOrthographic(...);
  
  renderScene(scene, lightView, lightProjection);
  
  unbindFramebuffer();
}

// 第二遍：正常渲染 + 阴影测试
function renderWithShadows(camera, scene, shadowMap) {
  bindFramebuffer(null);
  
  scene.objects.forEach(obj => {
    // 计算光源空间坐标
    const lightSpacePos = lightProjection * lightView * obj.worldPos;
    
    // 采样阴影贴图
    const shadowDepth = sampleTexture(shadowMap, lightSpacePos.xy);
    
    // 深度比较
    const inShadow = lightSpacePos.z > shadowDepth + bias;
    
    // 着色
    const color = calculateLighting(obj, inShadow);
    drawObject(obj, color);
  });
}
```

### 场景2：屏幕空间环境光遮蔽（SSAO）

```javascript
// 使用深度缓冲计算 SSAO
function computeSSAO(depthBuffer, normalBuffer, width, height) {
  const samples = generateRandomSamples(64);
  const occlusion = new Float32Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const depth = depthBuffer[idx];
      const normal = normalBuffer[idx];
      
      // 在半球内采样
      let occluded = 0;
      samples.forEach(sample => {
        const samplePos = getSamplePosition(x, y, depth, normal, sample);
        const sampleDepth = sampleDepthBuffer(samplePos.x, samplePos.y);
        
        if (sampleDepth < samplePos.z) {
          occluded++;
        }
      });
      
      occlusion[idx] = 1.0 - (occluded / samples.length);
    }
  }
  
  return occlusion;
}
```

### 场景3：粒子深度排序

```javascript
// 软粒子：避免硬边缘
function renderSoftParticles(particles, depthBuffer) {
  particles.forEach(particle => {
    const screenPos = projectToScreen(particle.position);
    const sceneDepth = depthBuffer[screenPos.y * width + screenPos.x];
    const particleDepth = particle.depth;
    
    // 根据深度差计算透明度
    const depthDiff = sceneDepth - particleDepth;
    const fade = clamp(depthDiff / fadeDistance, 0, 1);
    
    particle.alpha *= fade;
    drawParticle(particle);
  });
}
```

## 常见陷阱与注意事项

### 陷阱1：忘记清空深度缓冲

```javascript
// 错误：每帧不清空深度
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT); // ❌ 只清空颜色
  drawScene();
}

// 正确：清空深度缓冲
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // ✅
  drawScene();
}
```

### 陷阱2：禁用深度写入后忘记恢复

```javascript
// 绘制天空盒
gl.depthMask(false); // 禁用深度写入
drawSkybox();
gl.depthMask(true);  // ✅ 恢复深度写入

// 继续绘制场景
drawScene();
```

### 陷阱3：透明物体渲染顺序

```javascript
// 错误：透明物体开启深度写入
gl.enable(gl.BLEND);
gl.depthMask(true); // ❌ 会遮挡后面的透明物体

// 正确：透明物体禁用深度写入，从远到近排序
gl.enable(gl.BLEND);
gl.depthMask(false); // ✅
transparentObjects.sort((a, b) => b.distance - a.distance);
transparentObjects.forEach(obj => drawObject(obj));
gl.depthMask(true);
```

## 总结

深度缓冲是 3D 渲染的基石：

| 概念 | 说明 |
|------|------|
| **深度缓冲** | 存储每个像素的深度值 |
| **深度测试** | 根据深度决定是否绘制像素 |
| **非线性深度** | 透视投影导致精度不均匀 |
| **Z-Fighting** | 深度精度不足导致的闪烁 |

解决方案对比：

| 方案 | 复杂度 | 性能 | 效果 |
|------|--------|------|------|
| **优化 near/far** | 低 | 无影响 | 中等 |
| **Polygon Offset** | 低 | 无影响 | 针对特定情况 |
| **对数深度** | 中 | 有开销 | 极好 |
| **反转 Z** | 中 | 无影响 | 很好 |

关键要点：
- **near/far 比例**是精度的关键
- 深度映射是**非线性**的
- Z-Fighting 主要发生在**远处**
- 透明物体需要特殊处理
- 对数深度和反转 Z 可以解决极端情况

理解深度缓冲，你就能避免 Z-Fighting 等常见问题！
