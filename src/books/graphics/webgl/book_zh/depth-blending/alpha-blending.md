# Alpha 混合

> "Alpha 混合让透明物体与背景完美融合。"

## 什么是 Alpha 混合

### 概念

Alpha 混合是将新绘制的片元颜色（源）与已存在的颜色（目标）按透明度组合的过程。

```
┌─────────────────────────────────────────────────────────┐
│                    Alpha 混合过程                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   源颜色 (Source)       目标颜色 (Dest)                 │
│   ┌─────────┐           ┌─────────┐                    │
│   │ RGBA    │           │ RGB     │                    │
│   │ 新片元  │           │ 帧缓冲  │                    │
│   └────┬────┘           └────┬────┘                    │
│        │                     │                          │
│        ▼                     ▼                          │
│   ┌─────────────────────────────────────┐              │
│   │         混合方程                     │              │
│   │  结果 = Src × SrcFactor +           │              │
│   │         Dst × DstFactor             │              │
│   └──────────────┬──────────────────────┘              │
│                  │                                      │
│                  ▼                                      │
│            最终颜色                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 启用混合

### 基本设置

```javascript
// 启用混合
gl.enable(gl.BLEND);

// 设置混合函数
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
```

### 混合因子

| 因子 | 说明 | 值 |
|------|------|-----|
| `gl.ZERO` | 零 | (0, 0, 0, 0) |
| `gl.ONE` | 一 | (1, 1, 1, 1) |
| `gl.SRC_COLOR` | 源颜色 | (Rs, Gs, Bs, As) |
| `gl.ONE_MINUS_SRC_COLOR` | 1 - 源颜色 | (1-Rs, 1-Gs, 1-Bs, 1-As) |
| `gl.DST_COLOR` | 目标颜色 | (Rd, Gd, Bd, Ad) |
| `gl.ONE_MINUS_DST_COLOR` | 1 - 目标颜色 | (1-Rd, 1-Gd, 1-Bd, 1-Ad) |
| `gl.SRC_ALPHA` | 源 Alpha | (As, As, As, As) |
| `gl.ONE_MINUS_SRC_ALPHA` | 1 - 源 Alpha | (1-As, 1-As, 1-As, 1-As) |
| `gl.DST_ALPHA` | 目标 Alpha | (Ad, Ad, Ad, Ad) |
| `gl.ONE_MINUS_DST_ALPHA` | 1 - 目标 Alpha | (1-Ad, 1-Ad, 1-Ad, 1-Ad) |
| `gl.CONSTANT_COLOR` | 常量颜色 | (Rc, Gc, Bc, Ac) |
| `gl.ONE_MINUS_CONSTANT_COLOR` | 1 - 常量颜色 | ... |
| `gl.CONSTANT_ALPHA` | 常量 Alpha | (Ac, Ac, Ac, Ac) |
| `gl.ONE_MINUS_CONSTANT_ALPHA` | 1 - 常量 Alpha | ... |
| `gl.SRC_ALPHA_SATURATE` | 饱和源 Alpha | (f, f, f, 1) |

## 混合方程

### 设置方程

```javascript
// 默认：加法混合
gl.blendEquation(gl.FUNC_ADD);
```

### 可用方程

| 方程 | 公式 |
|------|------|
| `gl.FUNC_ADD` | Src × SF + Dst × DF |
| `gl.FUNC_SUBTRACT` | Src × SF - Dst × DF |
| `gl.FUNC_REVERSE_SUBTRACT` | Dst × DF - Src × SF |
| `gl.MIN` | min(Src, Dst) |
| `gl.MAX` | max(Src, Dst) |

## 分离颜色和 Alpha

### 分离混合函数

```javascript
// 颜色和 Alpha 使用不同因子
gl.blendFuncSeparate(
  gl.SRC_ALPHA,           // srcRGB
  gl.ONE_MINUS_SRC_ALPHA, // dstRGB
  gl.ONE,                 // srcAlpha
  gl.ONE_MINUS_SRC_ALPHA  // dstAlpha
);
```

### 分离混合方程

```javascript
// 颜色和 Alpha 使用不同方程
gl.blendEquationSeparate(
  gl.FUNC_ADD,      // 颜色方程
  gl.FUNC_ADD       // Alpha 方程
);
```

## 常用混合模式

### 标准透明

```javascript
// 最常用的透明混合
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 公式: 结果 = Src × As + Dst × (1 - As)
```

### 预乘 Alpha

```javascript
// 预乘 Alpha（更正确的混合）
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

// 着色器中预乘
// fragColor = vec4(color.rgb * color.a, color.a);
```

### 加法混合

```javascript
// 发光效果
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

// 公式: 结果 = Src × As + Dst
// 结果只会更亮
```

### 乘法混合

```javascript
// 变暗效果
gl.blendFunc(gl.DST_COLOR, gl.ZERO);

// 公式: 结果 = Src × Dst
```

### 滤色混合

```javascript
// 变亮效果（类似乘法的反转）
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);

// 公式: 结果 = Src + Dst × (1 - Src)
```

## 渲染顺序

### 问题

```
┌─────────────────────────────────────────────────────────┐
│                渲染顺序问题                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   错误（从前往后）:                                      │
│                                                         │
│   ┌───┐                                                 │
│   │ A │ ← 先渲染（近）                                 │
│   └─┬─┘                                                 │
│     │ ┌───┐                                             │
│     └─│ B │ ← 后渲染（远）→ 被 A 的深度挡住            │
│       └───┘                                             │
│                                                         │
│   正确（从后往前）:                                      │
│                                                         │
│       ┌───┐                                             │
│       │ B │ ← 先渲染（远）                             │
│   ┌───┼───┘                                             │
│   │ A │ ← 后渲染（近）→ 正确混合到 B 上                │
│   └───┘                                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 正确顺序

```javascript
function render() {
  // 1. 渲染不透明物体（任意顺序）
  gl.disable(gl.BLEND);
  gl.depthMask(true);
  renderOpaqueObjects();
  
  // 2. 按深度排序半透明物体
  const sorted = sortBackToFront(transparentObjects, camera);
  
  // 3. 渲染半透明物体
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);  // 不写入深度
  
  for (const obj of sorted) {
    renderObject(obj);
  }
  
  gl.depthMask(true);
}

function sortBackToFront(objects, camera) {
  return objects.sort((a, b) => {
    const distA = vec3.distance(a.center, camera.position);
    const distB = vec3.distance(b.center, camera.position);
    return distB - distA;  // 远的在前
  });
}
```

## 与深度缓冲配合

### 禁止深度写入

```javascript
// 渲染半透明物体时
gl.depthMask(false);  // 不写入深度，但仍做深度测试
gl.enable(gl.BLEND);

renderTransparentObjects();

gl.depthMask(true);
gl.disable(gl.BLEND);
```

### 双面渲染

```javascript
// 渲染透明双面物体
function renderTransparentDoubleSided(obj) {
  gl.enable(gl.CULL_FACE);
  
  // 先渲染背面
  gl.cullFace(gl.FRONT);
  drawObject(obj);
  
  // 再渲染正面
  gl.cullFace(gl.BACK);
  drawObject(obj);
  
  gl.disable(gl.CULL_FACE);
}
```

## 顺序无关透明

### 概述

顺序无关透明（Order-Independent Transparency，OIT）技术可以不依赖排序正确渲染透明物体。

### 加权混合 OIT

```glsl
// 片元着色器
layout(location = 0) out vec4 accumColor;
layout(location = 1) out float accumAlpha;

void main() {
  vec4 color = u_color;
  
  // 权重函数
  float weight = max(
    min(1.0, max(color.a, color.r, color.g, color.b) * 8.0 + 0.01),
    0.01
  );
  weight *= 1.0 - gl_FragCoord.z * 0.99;
  
  // 输出到累积缓冲
  accumColor = vec4(color.rgb * color.a * weight, color.a * weight);
  accumAlpha = color.a;
}
```

### 合成 Pass

```glsl
// 合成着色器
uniform sampler2D u_accumTexture;
uniform sampler2D u_alphaTexture;

void main() {
  vec4 accum = texture(u_accumTexture, v_texCoord);
  float alpha = texture(u_alphaTexture, v_texCoord).r;
  
  if (accum.a <= 0.00001) {
    discard;
  }
  
  vec3 color = accum.rgb / accum.a;
  fragColor = vec4(color, 1.0 - alpha);
}
```

## 常量颜色

### 设置常量

```javascript
// 设置混合常量颜色
gl.blendColor(0.5, 0.5, 0.5, 0.5);

// 使用常量因子
gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
```

### 淡入淡出效果

```javascript
function fadeEffect(progress) {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
  gl.blendColor(0, 0, 0, progress);  // 0-1 控制透明度
  
  renderScene();
  
  gl.disable(gl.BLEND);
}
```

## 应用示例

### 粒子系统

```javascript
// 粒子通常使用加法混合
function renderParticles() {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);  // 加法
  gl.depthMask(false);
  
  // 不需要排序（加法混合顺序无关）
  drawParticles();
  
  gl.depthMask(true);
  gl.disable(gl.BLEND);
}
```

### UI 渲染

```javascript
// UI 使用预乘 Alpha
function renderUI() {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);  // 预乘
  gl.disable(gl.DEPTH_TEST);
  
  drawUI();
  
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
}
```

### 多遍效果

```javascript
// 多层混合效果
function multiPassBlending() {
  // 第一遍：正常渲染到帧缓冲
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO);
  gl.disable(gl.BLEND);
  renderScene();
  
  // 第二遍：叠加发光
  gl.bindFramebuffer(gl.FRAMEBUFFER, glowFBO);
  renderGlowingObjects();
  
  // 合成
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ZERO);  // 替换
  drawFullscreen(sceneTexture);
  
  gl.blendFunc(gl.ONE, gl.ONE);   // 加法
  drawFullscreen(glowTexture);
  
  gl.disable(gl.BLEND);
}
```

## 调试技巧

### 可视化 Alpha

```glsl
// 只显示 Alpha 通道
void main() {
  vec4 color = texture(u_texture, v_texCoord);
  fragColor = vec4(vec3(color.a), 1.0);
}
```

### 检查混合状态

```javascript
// 获取当前混合状态
const blendEnabled = gl.isEnabled(gl.BLEND);
const srcRGB = gl.getParameter(gl.BLEND_SRC_RGB);
const dstRGB = gl.getParameter(gl.BLEND_DST_RGB);
const srcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA);
const dstAlpha = gl.getParameter(gl.BLEND_DST_ALPHA);
const eqRGB = gl.getParameter(gl.BLEND_EQUATION_RGB);
const eqAlpha = gl.getParameter(gl.BLEND_EQUATION_ALPHA);
const color = gl.getParameter(gl.BLEND_COLOR);
```

## 本章小结

- `gl.enable(gl.BLEND)` 启用 Alpha 混合
- `gl.blendFunc()` 设置混合因子
- `gl.blendEquation()` 设置混合方程
- 标准透明：`SRC_ALPHA, ONE_MINUS_SRC_ALPHA`
- 预乘 Alpha：`ONE, ONE_MINUS_SRC_ALPHA`
- 加法混合：`SRC_ALPHA, ONE`（粒子）
- 半透明物体需从后往前渲染
- `gl.depthMask(false)` 禁止深度写入

下一章，我们将学习更多混合模式。
