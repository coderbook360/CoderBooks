# 帧缓冲与输出

> "帧缓冲是渲染管线的终点，也是可见图像的起点。"

## 帧缓冲概述

### 什么是帧缓冲

帧缓冲（Framebuffer）是存储渲染结果的内存区域，包含多个附件：

```
┌─────────────────────────────────────────────────────────┐
│                     帧缓冲                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  颜色附件 0     │  │  颜色附件 1     │  ...         │
│  │  (Color)        │  │  (Color)        │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  深度附件       │  │  模板附件       │              │
│  │  (Depth)        │  │  (Stencil)      │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  或合并为 深度模板附件 (Depth-Stencil)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 默认帧缓冲

浏览器提供的默认帧缓冲：

```javascript
// 默认帧缓冲的属性由 getContext 参数控制
const gl = canvas.getContext('webgl2', {
  alpha: true,           // 是否有 alpha 通道
  depth: true,           // 是否有深度缓冲
  stencil: false,        // 是否有模板缓冲
  antialias: true,       // 是否启用抗锯齿
  premultipliedAlpha: true,  // 预乘 alpha
  preserveDrawingBuffer: false  // 是否保留缓冲内容
});

// 绑定默认帧缓冲
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

## 输出合并阶段

### 处理流程

```
片元着色器输出
       │
       ▼
┌─────────────────┐
│   裁剪测试      │  根据裁剪区域丢弃
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   模板测试      │  根据模板值丢弃
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   深度测试      │  根据深度值丢弃
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   混合          │  与现有颜色混合
└────────┬────────┘
         │
         ▼
    写入帧缓冲
```

## 深度测试

### 启用和配置

```javascript
// 启用深度测试
gl.enable(gl.DEPTH_TEST);

// 设置深度比较函数
gl.depthFunc(gl.LESS);      // 小于时通过（默认）
gl.depthFunc(gl.LEQUAL);    // 小于等于时通过
gl.depthFunc(gl.GREATER);   // 大于时通过
gl.depthFunc(gl.GEQUAL);    // 大于等于时通过
gl.depthFunc(gl.EQUAL);     // 等于时通过
gl.depthFunc(gl.NOTEQUAL);  // 不等于时通过
gl.depthFunc(gl.ALWAYS);    // 总是通过
gl.depthFunc(gl.NEVER);     // 从不通过
```

### 深度写入控制

```javascript
// 禁用深度写入（但保持深度测试）
gl.depthMask(false);

// 启用深度写入
gl.depthMask(true);

// 透明物体渲染策略
// 1. 渲染不透明物体（深度测试 + 深度写入）
gl.enable(gl.DEPTH_TEST);
gl.depthMask(true);
drawOpaqueObjects();

// 2. 渲染透明物体（深度测试 + 禁用深度写入）
gl.depthMask(false);
drawTransparentObjects();
```

### 深度范围

```javascript
// 设置深度范围
gl.depthRange(near, far);  // 默认 (0.0, 1.0)

// 多边形偏移（防止 Z-fighting）
gl.enable(gl.POLYGON_OFFSET_FILL);
gl.polygonOffset(factor, units);
// 偏移量 = factor * 斜率 + units * 最小可解析单位
```

## 模板测试

### 启用和配置

```javascript
// 启用模板测试
gl.enable(gl.STENCIL_TEST);

// 设置模板函数
gl.stencilFunc(gl.EQUAL, 1, 0xFF);
// 参数: func, ref, mask
// 比较: (ref & mask) func (stencil & mask)

// 设置模板操作
gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
// 参数: stencilFail, depthFail, depthPass
```

### 模板操作类型

| 操作 | 说明 |
|------|------|
| gl.KEEP | 保持当前值 |
| gl.ZERO | 设为 0 |
| gl.REPLACE | 设为 ref |
| gl.INCR | 增加 1（饱和） |
| gl.INCR_WRAP | 增加 1（溢出归零） |
| gl.DECR | 减少 1（饱和） |
| gl.DECR_WRAP | 减少 1（溢出归最大值） |
| gl.INVERT | 按位取反 |

### 轮廓效果示例

```javascript
// 第一遍：渲染物体，写入模板
gl.enable(gl.STENCIL_TEST);
gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
gl.stencilMask(0xFF);
gl.clear(gl.STENCIL_BUFFER_BIT);

drawObject();

// 第二遍：渲染放大的物体，只在模板值不为 1 的地方
gl.stencilFunc(gl.NOTEQUAL, 1, 0xFF);
gl.stencilMask(0x00);
gl.disable(gl.DEPTH_TEST);

// 使用纯色着色器绘制轮廓
drawObjectScaled(1.05);

gl.stencilMask(0xFF);
gl.enable(gl.DEPTH_TEST);
```

## 颜色混合

### 启用混合

```javascript
gl.enable(gl.BLEND);

// 设置混合函数
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
// 结果 = src * srcFactor + dst * dstFactor

// 分离 RGB 和 Alpha 混合
gl.blendFuncSeparate(
  gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,  // RGB
  gl.ONE, gl.ONE  // Alpha
);
```

### 混合因子

| 因子 | RGB | Alpha |
|------|-----|-------|
| gl.ZERO | (0,0,0) | 0 |
| gl.ONE | (1,1,1) | 1 |
| gl.SRC_COLOR | (Rs,Gs,Bs) | As |
| gl.DST_COLOR | (Rd,Gd,Bd) | Ad |
| gl.SRC_ALPHA | (As,As,As) | As |
| gl.DST_ALPHA | (Ad,Ad,Ad) | Ad |
| gl.ONE_MINUS_* | 1 - 对应值 | 1 - 对应值 |
| gl.CONSTANT_COLOR | blendColor | blendColor.a |

### 混合方程

```javascript
// 设置混合方程
gl.blendEquation(gl.FUNC_ADD);           // 默认：src + dst
gl.blendEquation(gl.FUNC_SUBTRACT);      // src - dst
gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT); // dst - src
gl.blendEquation(gl.MIN);                // min(src, dst)
gl.blendEquation(gl.MAX);                // max(src, dst)
```

### 常用混合模式

```javascript
// 标准透明混合
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 加法混合（发光效果）
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

// 乘法混合
gl.blendFunc(gl.DST_COLOR, gl.ZERO);

// 预乘 Alpha
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
```

## 写入掩码

### 颜色掩码

```javascript
// 控制哪些颜色通道被写入
gl.colorMask(red, green, blue, alpha);

// 示例：只写入红色通道
gl.colorMask(true, false, false, false);

// 恢复正常
gl.colorMask(true, true, true, true);
```

### 综合写入控制

```javascript
// 完全禁止写入（只做测试）
gl.colorMask(false, false, false, false);
gl.depthMask(false);
gl.stencilMask(0x00);

// 深度预渲染
gl.colorMask(false, false, false, false);
gl.depthMask(true);
drawAllObjects();

// 正式渲染
gl.colorMask(true, true, true, true);
gl.depthMask(false);  // 已有正确深度，无需再写
gl.depthFunc(gl.EQUAL);  // 只渲染已写入深度的片元
drawAllObjects();
```

## 清除缓冲

### 基本清除

```javascript
// 设置清除值
gl.clearColor(0.0, 0.0, 0.0, 1.0);  // 黑色
gl.clearDepth(1.0);                   // 最远深度
gl.clearStencil(0);                   // 模板值 0

// 执行清除
gl.clear(gl.COLOR_BUFFER_BIT);
gl.clear(gl.DEPTH_BUFFER_BIT);
gl.clear(gl.STENCIL_BUFFER_BIT);

// 同时清除多个
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
```

### 清除特定区域

```javascript
// 使用裁剪区域限制清除范围
gl.enable(gl.SCISSOR_TEST);
gl.scissor(x, y, width, height);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.disable(gl.SCISSOR_TEST);
```

## 裁剪测试

### 启用裁剪

```javascript
// 启用裁剪测试
gl.enable(gl.SCISSOR_TEST);

// 设置裁剪区域（像素坐标）
gl.scissor(x, y, width, height);

// 只在该区域内渲染
drawScene();

// 禁用裁剪
gl.disable(gl.SCISSOR_TEST);
```

### 与视口的区别

```
┌─────────────────────────────────────┐
│              Canvas                 │
│  ┌─────────────────────────────┐   │
│  │          Viewport            │   │  viewport: 坐标变换
│  │  ┌─────────────────────┐    │   │
│  │  │      Scissor        │    │   │  scissor: 裁剪丢弃
│  │  │                     │    │   │
│  │  └─────────────────────┘    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 读取像素

### readPixels

```javascript
// 创建存储数组
const pixels = new Uint8Array(width * height * 4);

// 读取像素
gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

// WebGL 2.0 异步读取
const pbo = gl.createBuffer();
gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
gl.bufferData(gl.PIXEL_PACK_BUFFER, width * height * 4, gl.STREAM_READ);

gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);

// 稍后获取数据
const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
// ... 等待同步
gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels);
```

### 读取深度值

```javascript
// 需要将深度渲染到纹理
const depthPixels = new Float32Array(width * height);
gl.readPixels(0, 0, width, height, gl.DEPTH_COMPONENT, gl.FLOAT, depthPixels);
```

## 双缓冲

### 工作原理

```
┌─────────────────────────────────────────────────────────┐
│                      双缓冲                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────┐        ┌───────────────┐            │
│  │   后缓冲      │  交换  │   前缓冲      │            │
│  │  (渲染中)     │ ←───→ │  (显示中)     │            │
│  └───────────────┘        └───────────────┘            │
│                                                         │
│  渲染完成后调用 gl.finish() 或浏览器自动交换             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### preserveDrawingBuffer

```javascript
// 默认情况下，交换后后缓冲内容未定义
const gl = canvas.getContext('webgl2', {
  preserveDrawingBuffer: false  // 默认
});

// 如需保留（如截图），设为 true
const gl = canvas.getContext('webgl2', {
  preserveDrawingBuffer: true
});

// 截图
canvas.toDataURL('image/png');
canvas.toBlob(blob => { /* ... */ });
```

## 本章小结

- 帧缓冲包含颜色、深度、模板附件
- 输出合并执行裁剪、模板、深度测试和混合
- 深度测试用于实现正确的遮挡关系
- 模板测试可实现遮罩、轮廓等效果
- 混合用于实现透明度和特殊效果
- 写入掩码控制哪些数据可以写入
- 双缓冲避免渲染过程中的画面撕裂

下一章，我们将学习缓冲对象的详细使用。
