# 纹理采样与过滤

> "采样和过滤决定了纹理在屏幕上的最终表现。"

## 采样基础

### 采样过程

```
┌─────────────────────────────────────────────────────────┐
│                    纹理采样流程                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  UV 坐标 → 纹理空间坐标 → 选择 Mipmap → 过滤 → 颜色值   │
│                                                         │
│  (0.5, 0.5) → (256, 256) → Level 2 → Bilinear → RGB    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 着色器采样函数

```glsl
// 基本采样
vec4 color = texture(u_sampler, uv);

// 带 LOD 偏移
vec4 color = texture(u_sampler, uv, lodBias);

// 指定 LOD
vec4 color = textureLod(u_sampler, uv, lod);

// 使用梯度
vec4 color = textureGrad(u_sampler, uv, dPdx, dPdy);

// 获取纹理尺寸
ivec2 size = textureSize(u_sampler, 0);

// 直接获取纹素（无过滤）
vec4 texel = texelFetch(u_sampler, ivec2(x, y), lod);
```

## 放大过滤

### 什么是放大

当纹理像素（Texel）比屏幕像素大时发生放大：

```
纹理 4x4:              屏幕显示 16x16:
┌──┬──┬──┬──┐         ┌────┬────┬────┬────┐
│A │B │C │D │         │ A  │ A  │ B  │ B  │
├──┼──┼──┼──┤   放大  ├────┼────┼────┼────┤
│E │F │G │H │  ────→  │ A  │ A  │ B  │ B  │
├──┼──┼──┼──┤         ├────┼────┼────┼────┤
│I │J │K │L │         │ E  │ E  │ F  │ F  │
├──┼──┼──┼──┤         ├────┼────┼────┼────┤
│M │N │O │P │         │ E  │ E  │ F  │ F  │
└──┴──┴──┴──┘         └────┴────┴────┴────┘
                       (示意，实际更复杂)
```

### NEAREST（最近点采样）

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
```

```
特点:
- 选择最近的纹素
- 像素化效果
- 无模糊
- 适合像素艺术、UI 图标

┌──┬──┬──┬──┐
│██│  │██│  │
├──┼──┼──┼──┤
│  │██│  │██│
├──┼──┼──┼──┤
│██│  │██│  │
└──┴──┴──┴──┘
  清晰锐利
```

### LINEAR（双线性过滤）

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

```
特点:
- 插值 4 个最近的纹素
- 平滑效果
- 边缘模糊
- 适合照片、自然纹理

┌────────────┐
│ ▓▓░░░░▓▓  │
│ ░░▓▓▓▓░░  │
│ ░░▓▓▓▓░░  │
│ ▓▓░░░░▓▓  │
└────────────┘
  平滑渐变
```

### 双线性插值计算

```
     t
     ↑
   ──┼───────
     │ A   B
     │
     │ C   D
   ──┼──────→ s
   
color = lerp(
  lerp(A, B, s),
  lerp(C, D, s),
  t
)
```

## 缩小过滤

### 什么是缩小

当纹理像素比屏幕像素小时发生缩小：

```
纹理 256x256:          屏幕显示 64x64:
┌────────────────┐    ┌────────┐
│                │    │ ▒▒▒▒▒▒ │
│  大量细节      │ → │ ▒▒▒▒▒▒ │
│                │    │ ▒▒▒▒▒▒ │
│                │    └────────┘
└────────────────┘    细节丢失
```

### 无 Mipmap 的问题

```javascript
// 不使用 mipmap
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

```
问题：
1. 走样（摩尔纹）
2. 闪烁
3. 性能差（采样大纹理）

远处的棋盘格:
┌────────────────┐
│ ╔═╦═╦═╦═╦═╦═╗ │  ← 摩尔纹
│ ╠═╬═╬═╬═╬═╬═╣ │
│ ╔═╦═╦═╦═╦═╦═╗ │
└────────────────┘
```

### Mipmap 过滤模式

```javascript
// 最近 mipmap + 最近纹素
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);

// 最近 mipmap + 线性纹素
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

// 线性 mipmap + 最近纹素
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);

// 线性 mipmap + 线性纹素（三线性过滤）
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
```

### 过滤模式对比

| 模式 | 纹素过滤 | Mipmap 过滤 | 质量 | 性能 |
|------|---------|------------|------|------|
| NEAREST | 最近点 | - | 最低 | 最快 |
| LINEAR | 双线性 | - | 低 | 快 |
| NEAREST_MIPMAP_NEAREST | 最近点 | 最近级别 | 中 | 快 |
| LINEAR_MIPMAP_NEAREST | 双线性 | 最近级别 | 中高 | 中 |
| NEAREST_MIPMAP_LINEAR | 最近点 | 混合级别 | 中高 | 中 |
| LINEAR_MIPMAP_LINEAR | 双线性 | 混合级别 | 最高 | 最慢 |

## Mipmap

### 生成 Mipmap

```javascript
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_2D);  // 自动生成所有级别
```

### 手动设置 Mipmap

```javascript
// 手动上传每个级别
let level = 0;
let width = image.width;
let height = image.height;

while (width >= 1 || height >= 1) {
  gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mipmaps[level]);
  level++;
  width = Math.max(1, width >> 1);
  height = Math.max(1, height >> 1);
}
```

### Mipmap 级别选择

```
LOD (Level of Detail) = log2(max(|du/dx|, |dv/dy|) * textureSize)

较近的物体: LOD = 0 (使用原始纹理)
较远的物体: LOD = 4 (使用 1/16 大小的纹理)
```

### 自定义 LOD 偏移

```javascript
// 使用采样器
gl.samplerParameterf(sampler, gl.TEXTURE_MIN_LOD, 0);
gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, 10);

// 着色器中偏移
vec4 color = texture(u_sampler, uv, -1.0);  // 使用更清晰的级别
```

## 各向异性过滤

### 问题：倾斜表面模糊

```
俯视地面:
┌─────────────────────────────────────┐
│    远处                             │
│    ════════════════════            │  ← 应该更清晰
│      ═══════════════               │
│        ═══════════                 │
│          ═════                     │
│           近处                     │
└─────────────────────────────────────┘

三线性过滤在一个方向过度模糊
```

### 启用各向异性过滤

```javascript
// 获取扩展
const ext = gl.getExtension('EXT_texture_filter_anisotropic');

if (ext) {
  // 获取最大各向异性值
  const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  
  // 设置各向异性级别
  gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
}
```

### 各向异性级别

```javascript
// 级别越高，倾斜表面越清晰，但性能开销越大
gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 1);   // 关闭
gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);   // 中等
gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 16);  // 高质量
```

## texelFetch

### 直接纹素访问

```glsl
// 使用整数坐标，无过滤
ivec2 coord = ivec2(x, y);
vec4 texel = texelFetch(u_sampler, coord, 0);  // level 0

// 用于数据纹理
int index = int(v_index);
int x = index % textureWidth;
int y = index / textureWidth;
vec4 data = texelFetch(u_dataTexture, ivec2(x, y), 0);
```

### 与 texture 的区别

```glsl
// texture: 归一化坐标 [0,1]，应用过滤
vec4 a = texture(u_tex, vec2(0.5, 0.5));

// texelFetch: 整数坐标，无过滤
vec4 b = texelFetch(u_tex, ivec2(128, 128), 0);
```

## 采样器比较

### 深度纹理比较

```javascript
// 创建深度纹理
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

// 设置比较模式
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
```

```glsl
// 着色器中使用阴影采样器
uniform sampler2DShadow u_shadowMap;

void main() {
  // 返回 0.0 或 1.0（或插值值）
  float shadow = texture(u_shadowMap, vec3(uv, refDepth));
}
```

## 采样精度

### LOD 计算

```glsl
// 获取自动计算的 LOD
float lod = textureQueryLod(u_sampler, uv).x;

// 基于 LOD 的效果
if (lod > 4.0) {
  // 使用简化着色
}
```

### 梯度采样

```glsl
// 在条件分支中需要手动计算梯度
vec2 dx = dFdx(v_texCoord);
vec2 dy = dFdy(v_texCoord);

if (condition) {
  // 不能在这里使用普通 texture()
  // 因为梯度在分支中未定义
  color = textureGrad(u_sampler, uv, dx, dy);
}
```

## 性能考虑

### 纹理缓存

```
采样模式对缓存的影响:

连续 UV:         随机 UV:
┌───────────────┐  ┌───────────────┐
│ → → → → → →  │  │ × ↗ ↙ ↘ ← ×│
│ → → → → → →  │  │ ↙ × ↗ ↘ × ↖│
│ → → → → → →  │  │ ↖ ↙ × → ↗ ↘│
└───────────────┘  └───────────────┘
  缓存友好            缓存不友好
```

### 采样数量

```glsl
// 减少采样次数
// 不好：多次采样同一纹理
vec4 c1 = texture(u_tex, uv + vec2(0.001, 0));
vec4 c2 = texture(u_tex, uv + vec2(-0.001, 0));
vec4 c3 = texture(u_tex, uv + vec2(0, 0.001));
vec4 c4 = texture(u_tex, uv + vec2(0, -0.001));

// 好：使用卷积采样或纹理 Gather
vec4 gathered = textureGather(u_tex, uv, 0);  // 获取 4 个红色通道
```

### textureGather

```glsl
// 获取一个组件的 2x2 邻域
vec4 reds = textureGather(u_tex, uv, 0);    // 4 个红色值
vec4 greens = textureGather(u_tex, uv, 1);  // 4 个绿色值
vec4 blues = textureGather(u_tex, uv, 2);   // 4 个蓝色值
vec4 alphas = textureGather(u_tex, uv, 3);  // 4 个 alpha 值

// 用于自定义过滤、边缘检测等
```

## 本章小结

- 放大过滤选择 NEAREST 或 LINEAR
- 缩小过滤应使用 Mipmap 避免走样
- 三线性过滤（LINEAR_MIPMAP_LINEAR）质量最高
- 各向异性过滤改善倾斜表面的清晰度
- texelFetch 直接访问纹素，无过滤
- textureGrad 在条件分支中使用
- textureGather 高效获取邻域值

下一章，我们将学习 Mipmap 的详细使用。
