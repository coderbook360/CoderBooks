# 深度缓冲

> "深度缓冲记录每个像素的深度，决定谁在前谁在后。"

## 什么是深度缓冲

### 定义

深度缓冲（Depth Buffer，也称 Z-Buffer）是一个与颜色缓冲同尺寸的缓冲区，存储每个像素的深度值。

```
┌─────────────────────────────────────────────────────────┐
│                    深度缓冲概念                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   颜色缓冲              深度缓冲                        │
│   ┌─────────┐          ┌─────────┐                     │
│   │ R G B A │          │ Depth   │                     │
│   │ pixels  │  对应    │ values  │                     │
│   │         │  ─────>  │ 0.0-1.0 │                     │
│   └─────────┘          └─────────┘                     │
│                                                         │
│   每个像素位置有对应的深度值                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 深度值范围

```
        近裁剪面                     远裁剪面
        (0.0)                        (1.0)
           │                           │
           ▼                           ▼
    ┌──────┬───────────────────────────┬──────┐
    │      │                           │      │
    │      │      可见深度范围         │      │
    │      │       0.0 - 1.0           │      │
    │      │                           │      │
    └──────┴───────────────────────────┴──────┘
           │                           │
        近: 0.0                     远: 1.0
```

## 创建深度缓冲

### 自动创建

```javascript
// 获取 WebGL 上下文时请求深度缓冲
const gl = canvas.getContext('webgl2', {
  depth: true,           // 请求深度缓冲
  antialias: true,       // 抗锯齿
  stencil: false         // 模板缓冲
});
```

### 检查深度位数

```javascript
// 获取深度缓冲精度
const depthBits = gl.getParameter(gl.DEPTH_BITS);
console.log(`Depth buffer bits: ${depthBits}`);

// 常见值: 16, 24, 32
```

### 帧缓冲附件

```javascript
// 为帧缓冲创建深度附件
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.DEPTH_COMPONENT24,   // 24 位深度
  width, height,
  0,
  gl.DEPTH_COMPONENT,
  gl.UNSIGNED_INT,
  null
);

// 或使用渲染缓冲
const depthBuffer = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
```

## 启用深度测试

### 基本启用

```javascript
// 启用深度测试
gl.enable(gl.DEPTH_TEST);

// 禁用深度测试
gl.disable(gl.DEPTH_TEST);

// 检查状态
const enabled = gl.isEnabled(gl.DEPTH_TEST);
```

### 清除深度缓冲

```javascript
// 设置清除值
gl.clearDepth(1.0);  // 默认清除为最远

// 清除深度缓冲
gl.clear(gl.DEPTH_BUFFER_BIT);

// 同时清除颜色和深度
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
```

## 深度写入控制

### 深度掩码

```javascript
// 禁止写入深度缓冲
gl.depthMask(false);

// 允许写入深度缓冲
gl.depthMask(true);
```

### 使用场景

```javascript
// 渲染半透明物体时
function renderTransparent() {
  gl.depthMask(false);   // 禁止深度写入
  gl.enable(gl.BLEND);
  
  // 渲染半透明物体...
  
  gl.disable(gl.BLEND);
  gl.depthMask(true);    // 恢复深度写入
}
```

## 深度值计算

### 线性深度

```
         z_ndc = 2 * z_buffer - 1
         
         z_linear = (2 * near * far) / (far + near - z_ndc * (far - near))
```

### 着色器读取深度

```glsl
uniform sampler2D u_depthTexture;
uniform float u_near;
uniform float u_far;

// 将深度缓冲值转换为线性深度
float linearizeDepth(float depth) {
  float z_ndc = depth * 2.0 - 1.0;
  return (2.0 * u_near * u_far) / (u_far + u_near - z_ndc * (u_far - u_near));
}

void main() {
  float depth = texture(u_depthTexture, v_texCoord).r;
  float linear = linearizeDepth(depth);
  
  // 归一化到 [0, 1]
  float normalized = (linear - u_near) / (u_far - u_near);
  
  fragColor = vec4(vec3(normalized), 1.0);
}
```

## 深度精度

### 精度分布

```
┌─────────────────────────────────────────────────────────┐
│                    深度精度分布                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   透视投影下精度非线性分布:                              │
│                                                         │
│   near              far                                 │
│    │                 │                                  │
│    ▼                 ▼                                  │
│    ███████████│││││││                                   │
│    <-- 高精度 -->  <- 低精度 ->                         │
│                                                         │
│   大部分精度集中在近平面附近                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 优化精度

```javascript
// 1. 使用合适的近裁剪面
// 避免过小的 near 值
const near = 0.1;   // 不要使用 0.001
const far = 100.0;

// 2. 反向 Z（Reversed Z）
// 使用 1.0 作为近平面，0.0 作为远平面
gl.clearDepth(0.0);
gl.depthFunc(gl.GREATER);

// 3. 浮点深度缓冲
gl.texImage2D(
  gl.TEXTURE_2D, 0,
  gl.DEPTH_COMPONENT32F,  // 32 位浮点
  width, height, 0,
  gl.DEPTH_COMPONENT,
  gl.FLOAT,
  null
);
```

### 反向 Z 投影矩阵

```javascript
// 反向 Z 透视投影矩阵
function perspectiveReversedZ(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, near / (far - near), -1,
    0, 0, far * near / (far - near), 0
  ]);
}
```

## Z-Fighting

### 问题描述

```
┌─────────────────────────────────────────────────────────┐
│                    Z-Fighting 问题                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   两个共面或接近的表面:                                  │
│                                                         │
│      ┌─────────────┐                                    │
│      │▓▓▓░░░▓▓░░▓▓│  <-- 闪烁/条纹                     │
│      │░░▓▓▓░░▓░░▓░│                                     │
│      │▓░░▓░▓▓░▓░░▓│                                     │
│      └─────────────┘                                    │
│                                                         │
│   由于深度精度不足，两个面交替"获胜"                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 解决方案

```javascript
// 1. 多边形偏移
gl.enable(gl.POLYGON_OFFSET_FILL);
gl.polygonOffset(1.0, 1.0);  // factor, units

// 渲染贴花或叠加面...

gl.disable(gl.POLYGON_OFFSET_FILL);

// 2. 增加几何距离
// 将共面物体稍微分开

// 3. 提高深度精度
// 使用 24 位或 32 位深度缓冲

// 4. 减小远近比
// 减小 far/near 的比值
```

### 多边形偏移参数

```javascript
// polygonOffset(factor, units)
// 实际偏移 = factor * DZ + units * r
// DZ: 深度斜率
// r: 最小可分辨深度差

// 贴花
gl.polygonOffset(-1.0, -1.0);  // 向前偏移

// 描边
gl.polygonOffset(1.0, 1.0);    // 向后偏移
```

## 深度范围

### 设置深度范围

```javascript
// 设置 NDC 到窗口坐标的深度映射
gl.depthRange(0.0, 1.0);  // 默认

// 自定义范围
gl.depthRange(0.0, 0.5);  // 只使用前半深度范围

// 获取当前范围
const range = gl.getParameter(gl.DEPTH_RANGE);
console.log(`Depth range: ${range[0]} to ${range[1]}`);
```

### 用于分层渲染

```javascript
// 渲染背景层
gl.depthRange(0.5, 1.0);
renderBackground();

// 渲染前景层
gl.depthRange(0.0, 0.5);
renderForeground();

// 恢复
gl.depthRange(0.0, 1.0);
```

## 读取深度缓冲

### 读取到纹理

```javascript
// 深度纹理作为帧缓冲附件
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(
  gl.TEXTURE_2D, 0,
  gl.DEPTH_COMPONENT24,
  width, height, 0,
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

### 着色器访问

```glsl
uniform sampler2D u_depthMap;

void main() {
  float depth = texture(u_depthMap, v_texCoord).r;
  
  // 可视化深度
  fragColor = vec4(vec3(depth), 1.0);
}
```

## 应用示例

### 深度可视化

```javascript
// 将深度渲染为灰度
const depthVisShader = `#version 300 es
precision highp float;

uniform sampler2D u_depth;
uniform float u_near;
uniform float u_far;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  float depth = texture(u_depth, v_texCoord).r;
  
  // 线性化
  float z = u_near * u_far / (u_far + depth * (u_near - u_far));
  float normalized = (z - u_near) / (u_far - u_near);
  
  fragColor = vec4(vec3(normalized), 1.0);
}`;
```

### 场景深度排序

```javascript
// 按深度排序半透明物体
function sortByDepth(objects, viewMatrix) {
  return objects.sort((a, b) => {
    // 计算到相机的距离
    const posA = vec3.transformMat4([], a.position, viewMatrix);
    const posB = vec3.transformMat4([], b.position, viewMatrix);
    
    // 从远到近排序
    return posB[2] - posA[2];
  });
}
```

## 本章小结

- 深度缓冲存储每个像素的深度值
- 范围 0.0（近）到 1.0（远）
- `gl.enable(gl.DEPTH_TEST)` 启用深度测试
- `gl.depthMask(false)` 禁止深度写入
- 精度在近平面附近更高
- Z-Fighting 可用多边形偏移解决
- 反向 Z 可改善远处精度

下一章，我们将学习深度测试函数。
