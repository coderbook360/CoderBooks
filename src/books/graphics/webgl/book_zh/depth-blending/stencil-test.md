# 模板测试

> "模板测试是像素级的门卫，决定谁能通过谁被阻挡。"

## 什么是模板测试

### 概念

模板缓冲（Stencil Buffer）是与颜色缓冲同尺寸的整数缓冲区，用于控制像素的渲染。

```
┌─────────────────────────────────────────────────────────┐
│                    模板缓冲概念                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   颜色缓冲         深度缓冲         模板缓冲            │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐          │
│   │ RGBA    │     │ Depth   │     │ Stencil │          │
│   │         │     │         │     │ 0-255   │          │
│   └─────────┘     └─────────┘     └─────────┘          │
│                                                         │
│   模板测试在深度测试之前执行                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 渲染管线位置

```
┌─────────────────────────────────────────────────────────┐
│                    片元测试顺序                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   片元着色器                                            │
│        │                                                │
│        ▼                                                │
│   ┌─────────────┐                                       │
│   │ 模板测试    │ ← 先执行                             │
│   └──────┬──────┘                                       │
│          │                                              │
│          ▼                                              │
│   ┌─────────────┐                                       │
│   │ 深度测试    │ ← 后执行                             │
│   └──────┬──────┘                                       │
│          │                                              │
│          ▼                                              │
│   颜色混合 → 帧缓冲                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 创建模板缓冲

### 请求模板缓冲

```javascript
// 获取上下文时请求模板缓冲
const gl = canvas.getContext('webgl2', {
  stencil: true,    // 请求模板缓冲
  depth: true,
  antialias: true
});

// 检查模板位数
const stencilBits = gl.getParameter(gl.STENCIL_BITS);
console.log(`Stencil bits: ${stencilBits}`);  // 通常是 8
```

### 帧缓冲附件

```javascript
// 为帧缓冲创建深度模板附件
const depthStencil = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, depthStencil);
gl.renderbufferStorage(
  gl.RENDERBUFFER,
  gl.DEPTH24_STENCIL8,  // 24 位深度 + 8 位模板
  width, height
);

gl.framebufferRenderbuffer(
  gl.FRAMEBUFFER,
  gl.DEPTH_STENCIL_ATTACHMENT,
  gl.RENDERBUFFER,
  depthStencil
);
```

## 启用模板测试

### 基本操作

```javascript
// 启用模板测试
gl.enable(gl.STENCIL_TEST);

// 禁用模板测试
gl.disable(gl.STENCIL_TEST);

// 清除模板缓冲
gl.clearStencil(0);
gl.clear(gl.STENCIL_BUFFER_BIT);

// 同时清除所有缓冲
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
```

## 模板函数

### stencilFunc

```javascript
// 设置模板测试函数
gl.stencilFunc(func, ref, mask);

// func: 比较函数
// ref: 参考值
// mask: 掩码（与操作）

// 测试公式: (ref & mask) func (stencil & mask)
```

### 比较函数

| 函数 | 说明 |
|------|------|
| `gl.NEVER` | 永不通过 |
| `gl.LESS` | ref < stencil |
| `gl.LEQUAL` | ref ≤ stencil |
| `gl.GREATER` | ref > stencil |
| `gl.GEQUAL` | ref ≥ stencil |
| `gl.EQUAL` | ref = stencil |
| `gl.NOTEQUAL` | ref ≠ stencil |
| `gl.ALWAYS` | 总是通过 |

### 示例

```javascript
// 只渲染模板值为 1 的像素
gl.stencilFunc(gl.EQUAL, 1, 0xFF);

// 只渲染模板值不为 0 的像素
gl.stencilFunc(gl.NOTEQUAL, 0, 0xFF);

// 使用掩码
gl.stencilFunc(gl.EQUAL, 0x01, 0x0F);  // 只检查低 4 位
```

## 模板操作

### stencilOp

```javascript
// 设置模板操作
gl.stencilOp(sfail, dpfail, dppass);

// sfail: 模板测试失败时的操作
// dpfail: 模板通过但深度测试失败时的操作
// dppass: 模板和深度都通过时的操作
```

### 操作类型

| 操作 | 说明 |
|------|------|
| `gl.KEEP` | 保持当前值 |
| `gl.ZERO` | 设置为 0 |
| `gl.REPLACE` | 替换为参考值 |
| `gl.INCR` | 增加 1（饱和） |
| `gl.INCR_WRAP` | 增加 1（回绕） |
| `gl.DECR` | 减少 1（饱和） |
| `gl.DECR_WRAP` | 减少 1（回绕） |
| `gl.INVERT` | 按位取反 |

### 示例

```javascript
// 通过时写入参考值
gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

// 每次通过递增
gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
```

## 模板掩码

### stencilMask

```javascript
// 控制写入模板缓冲的位
gl.stencilMask(0xFF);  // 允许写入所有位
gl.stencilMask(0x00);  // 禁止写入
gl.stencilMask(0x0F);  // 只写入低 4 位
```

## 分离前后面

### stencilFuncSeparate

```javascript
// 为前后面设置不同函数
gl.stencilFuncSeparate(gl.FRONT, gl.ALWAYS, 1, 0xFF);
gl.stencilFuncSeparate(gl.BACK, gl.ALWAYS, 0, 0xFF);
```

### stencilOpSeparate

```javascript
// 为前后面设置不同操作
gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR);
gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR);
```

### stencilMaskSeparate

```javascript
// 为前后面设置不同掩码
gl.stencilMaskSeparate(gl.FRONT, 0xFF);
gl.stencilMaskSeparate(gl.BACK, 0x00);
```

## 应用：物体轮廓

### 实现步骤

```
┌─────────────────────────────────────────────────────────┐
│                    轮廓渲染步骤                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   步骤 1: 渲染物体，写入模板                            │
│   ┌─────────┐                                           │
│   │   ███   │  模板 = 1                                │
│   │   ███   │                                           │
│   └─────────┘                                           │
│                                                         │
│   步骤 2: 放大渲染，只在模板 ≠ 1 处绘制                 │
│   ┌─────────┐                                           │
│   │  ▓███▓  │  轮廓                                    │
│   │  ▓███▓  │                                          │
│   └─────────┘                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 代码实现

```javascript
function renderWithOutline(object, outlineColor, outlineScale) {
  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  
  // 步骤 1: 渲染物体，写入模板值 1
  gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
  gl.stencilMask(0xFF);
  
  renderObject(object);
  
  // 步骤 2: 渲染放大的物体，只在模板 ≠ 1 处绘制
  gl.stencilFunc(gl.NOTEQUAL, 1, 0xFF);
  gl.stencilMask(0x00);  // 不写入模板
  gl.disable(gl.DEPTH_TEST);  // 轮廓始终可见
  
  // 放大物体
  const scaledMatrix = mat4.clone(object.matrix);
  mat4.scale(scaledMatrix, scaledMatrix, [outlineScale, outlineScale, outlineScale]);
  
  // 使用纯色着色器渲染轮廓
  gl.useProgram(solidColorProgram);
  gl.uniform4fv(u_color, outlineColor);
  renderObjectWithMatrix(object, scaledMatrix);
  
  // 恢复状态
  gl.enable(gl.DEPTH_TEST);
  gl.stencilMask(0xFF);
  gl.disable(gl.STENCIL_TEST);
}
```

## 应用：镜面反射

### 实现思路

```javascript
function renderMirror() {
  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  
  // 步骤 1: 渲染镜面区域，写入模板
  gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
  gl.colorMask(false, false, false, false);  // 不写入颜色
  gl.depthMask(false);
  
  renderMirrorPlane();
  
  // 步骤 2: 只在镜面区域渲染反射
  gl.stencilFunc(gl.EQUAL, 1, 0xFF);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.colorMask(true, true, true, true);
  gl.depthMask(true);
  
  // 反转相机，渲染反射场景
  const reflectedView = reflectMatrix(viewMatrix, mirrorPlane);
  gl.cullFace(gl.FRONT);  // 反转剔除
  renderScene(reflectedView);
  gl.cullFace(gl.BACK);
  
  // 步骤 3: 渲染镜面本身（带透明度）
  gl.disable(gl.STENCIL_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  renderMirrorSurface();
  gl.disable(gl.BLEND);
}
```

## 应用：遮罩

### 简单遮罩

```javascript
function renderWithMask(maskShape, content) {
  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  
  // 渲染遮罩形状
  gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
  gl.colorMask(false, false, false, false);
  
  renderShape(maskShape);
  
  // 只在遮罩区域渲染内容
  gl.stencilFunc(gl.EQUAL, 1, 0xFF);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.colorMask(true, true, true, true);
  
  renderContent(content);
  
  gl.disable(gl.STENCIL_TEST);
}
```

### 反向遮罩

```javascript
// 在遮罩区域外渲染
gl.stencilFunc(gl.NOTEQUAL, 1, 0xFF);
```

## 应用：阴影体积

### 模板阴影

```javascript
function stencilShadowVolume(light, occluder) {
  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  gl.colorMask(false, false, false, false);
  gl.depthMask(false);
  gl.enable(gl.DEPTH_TEST);
  
  // 使用 Carmack 反转
  gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
  gl.enable(gl.CULL_FACE);
  
  // 渲染背面，深度失败时递增
  gl.cullFace(gl.FRONT);
  gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.INCR_WRAP, gl.KEEP);
  renderShadowVolume(light, occluder);
  
  // 渲染正面，深度失败时递减
  gl.cullFace(gl.BACK);
  gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.DECR_WRAP, gl.KEEP);
  renderShadowVolume(light, occluder);
  
  // 阴影区域 = 模板 ≠ 0
  gl.colorMask(true, true, true, true);
  gl.stencilFunc(gl.NOTEQUAL, 0, 0xFF);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.disable(gl.DEPTH_TEST);
  
  // 渲染阴影覆盖
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  renderFullscreenQuad([0, 0, 0, 0.5]);  // 半透明黑色
  
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.STENCIL_TEST);
}
```

## 应用：传送门

### 传送门渲染

```javascript
function renderPortals(portals, scene) {
  for (const portal of portals) {
    gl.enable(gl.STENCIL_TEST);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    
    // 标记传送门区域
    gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.colorMask(false, false, false, false);
    gl.depthMask(false);
    
    renderPortalFrame(portal);
    
    // 在传送门区域渲染目标场景
    gl.stencilFunc(gl.EQUAL, 1, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);  // 重置深度
    
    // 计算传送门视角
    const portalView = calculatePortalView(portal, camera);
    renderScene(scene, portalView);
    
    gl.disable(gl.STENCIL_TEST);
  }
  
  // 最后渲染主场景
  renderScene(scene, camera.viewMatrix);
}
```

## 调试技巧

### 可视化模板缓冲

```javascript
// 将模板值渲染为灰度
function visualizeStencil() {
  gl.disable(gl.STENCIL_TEST);
  
  // 使用全屏着色器读取模板
  gl.useProgram(stencilVisProgram);
  drawFullscreenQuad();
}
```

### 着色器读取

```glsl
// 需要纹理形式的模板附件
uniform usampler2D u_stencilTexture;

void main() {
  uint stencil = texture(u_stencilTexture, v_texCoord).r;
  float value = float(stencil) / 255.0;
  fragColor = vec4(vec3(value), 1.0);
}
```

## 本章小结

- 模板缓冲是 8 位整数缓冲区
- `gl.stencilFunc()` 设置测试函数和参考值
- `gl.stencilOp()` 设置通过/失败时的操作
- `gl.stencilMask()` 控制写入掩码
- 常用于轮廓、遮罩、镜面、阴影体积
- 可分离设置前后面的行为
- 模板测试在深度测试之前执行

下一章，我们将学习光照基础。
