# Mipmap 详解

> "Mipmap 是平衡纹理质量与性能的关键技术。"

## Mipmap 原理

### 什么是 Mipmap

Mipmap 是预先计算的纹理金字塔，每一级是上一级尺寸的一半：

```
┌────────────────────────────────────────────────────────┐
│                      Mipmap 金字塔                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Level 0: 256x256   ┌───────────────────────┐          │
│                     │                       │          │
│                     │    原始纹理           │          │
│                     │                       │          │
│                     └───────────────────────┘          │
│                                                        │
│  Level 1: 128x128   ┌───────────┐                      │
│                     │           │                      │
│                     └───────────┘                      │
│                                                        │
│  Level 2: 64x64     ┌─────┐                            │
│                     └─────┘                            │
│                                                        │
│  Level 3: 32x32     ┌──┐                               │
│                     └──┘                               │
│  ...                                                   │
│  Level 8: 1x1       ┌┐                                 │
│                     └┘                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 为什么需要 Mipmap

```
无 Mipmap:                    有 Mipmap:
┌─────────────────────┐       ┌─────────────────────┐
│                     │       │                     │
│  ▓▒░▓▒░▓▒░ 走样     │       │  ▒▒▒▒▒▒▒ 平滑      │
│  ░▓▒░▓▒░▓▒          │       │  ▒▒▒▒▒▒▒           │
│  ▓▒░▓▒░▓▒░ 闪烁     │       │  ▒▒▒▒▒▒▒ 稳定      │
│                     │       │                     │
│  采样大纹理慢        │       │  采样小纹理快        │
│                     │       │                     │
└─────────────────────┘       └─────────────────────┘
```

### 内存开销

```
原始纹理: 256 KB (512x512 RGBA)

Mipmap 总内存:
Level 0: 256 KB (512x512)
Level 1: 64 KB (256x256)
Level 2: 16 KB (128x128)
Level 3: 4 KB (64x64)
Level 4: 1 KB (32x32)
...

总计 ≈ 341 KB (原始的 1.33 倍)

公式: 总内存 = 原始 × (1 + 1/4 + 1/16 + ...) ≈ 原始 × 4/3
```

## 生成 Mipmap

### 自动生成

```javascript
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

// 上传基础级别
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

// 自动生成所有 mipmap 级别
gl.generateMipmap(gl.TEXTURE_2D);

// 设置过滤模式以使用 mipmap
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
```

### 手动生成

```javascript
function generateMipmapsManual(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let width = image.width;
  let height = image.height;
  let level = 0;
  
  // Level 0
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  // 后续级别
  while (width > 1 || height > 1) {
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
    level++;
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    
    gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    
    // 使用当前 canvas 作为下一级的源
    image = canvas;
  }
}
```

### 使用预生成的 Mipmap

```javascript
// 从 DDS/KTX 文件加载预生成的 mipmap
async function loadMipmappedTexture(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = parseDDS(buffer);  // 假设有 DDS 解析器
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  for (let i = 0; i < data.mipmaps.length; i++) {
    const mip = data.mipmaps[i];
    gl.texImage2D(
      gl.TEXTURE_2D, i, gl.RGBA,
      mip.width, mip.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      mip.data
    );
  }
  
  return texture;
}
```

## Mipmap 参数

### 最小/最大 LOD

```javascript
// 限制 mipmap 级别范围
gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_LOD, 0);   // 最清晰级别
gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAX_LOD, 4);   // 最模糊级别

// 或使用采样器
gl.samplerParameterf(sampler, gl.TEXTURE_MIN_LOD, 0);
gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, 4);
```

### 基础级别

```javascript
// 设置基础 mipmap 级别
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);

// 设置最大 mipmap 级别
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 8);
```

### LOD 偏移

```javascript
// 全局 LOD 偏移（使用采样器）
// 负值 = 更清晰，正值 = 更模糊
// WebGL 2.0 不直接支持 LOD_BIAS

// 在着色器中使用偏移
vec4 color = texture(u_sampler, uv, -1.0);  // 更清晰
vec4 color = texture(u_sampler, uv, 1.0);   // 更模糊
```

## LOD 计算

### 自动 LOD 计算

GPU 根据纹理坐标的屏幕空间导数计算 LOD：

```glsl
// GPU 内部计算（简化版）
vec2 dx = dFdx(texCoord) * textureSize;
vec2 dy = dFdy(texCoord) * textureSize;
float d = max(length(dx), length(dy));
float lod = log2(d);
```

### 手动指定 LOD

```glsl
// 使用 textureLod 指定级别
vec4 color = textureLod(u_sampler, uv, 0.0);    // Level 0
vec4 color = textureLod(u_sampler, uv, 2.0);    // Level 2
vec4 color = textureLod(u_sampler, uv, 2.5);    // Level 2 和 3 混合

// 在顶点着色器中采样时必须使用
// 因为顶点着色器没有导数
```

### 查询 LOD

```glsl
// 获取 GPU 计算的 LOD
vec2 lod = textureQueryLod(u_sampler, uv);
// lod.x = 使用的 mipmap 级别
// lod.y = 计算的未钳制 LOD 值
```

## 不同过滤模式的效果

### NEAREST_MIPMAP_NEAREST

```
选择最近的 mipmap 级别，使用最近点采样

┌─────────────┐
│  Level 2    │  选择一个级别
│   ┌───┐     │
│   │ X │     │  选择一个纹素
│   └───┘     │
└─────────────┘

特点: 最快，可能出现级别跳变
```

### LINEAR_MIPMAP_NEAREST

```
选择最近的 mipmap 级别，使用双线性采样

┌─────────────┐
│  Level 2    │  选择一个级别
│   ┌───┬───┐ │
│   │ A │ B │ │  混合 4 个纹素
│   ├───┼───┤ │
│   │ C │ D │ │
│   └───┴───┘ │
└─────────────┘

特点: 较快，仍有级别跳变
```

### NEAREST_MIPMAP_LINEAR

```
混合两个 mipmap 级别，使用最近点采样

┌─────────────┐  ┌─────────────┐
│  Level 2    │  │  Level 3    │  混合两个级别
│   ┌───┐     │  │   ┌───┐     │
│   │ X │     │  │   │ Y │     │  每个级别一个纹素
│   └───┘     │  │   └───┘     │
└─────────────┘  └─────────────┘

特点: 平滑级别过渡，但纹素边缘锐利
```

### LINEAR_MIPMAP_LINEAR（三线性）

```
混合两个 mipmap 级别，每个级别使用双线性采样

┌─────────────┐  ┌─────────────┐
│  Level 2    │  │  Level 3    │
│   ┌───┬───┐ │  │   ┌───┬───┐ │
│   │ A │ B │ │  │   │ E │ F │ │  混合 8 个纹素
│   ├───┼───┤ │  │   ├───┼───┤ │
│   │ C │ D │ │  │   │ G │ H │ │
│   └───┴───┘ │  │   └───┴───┘ │
└─────────────┘  └─────────────┘

特点: 最平滑，但最慢
```

## 特殊考虑

### 非 2 的幂纹理

```javascript
// WebGL 2.0 支持任意尺寸的 mipmap
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, npotImage);
gl.generateMipmap(gl.TEXTURE_2D);  // 可以工作

// WebGL 1.0 需要检查
if (!isPowerOf2(width) || !isPowerOf2(height)) {
  // 不能使用 mipmap
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
```

### 不完整的 Mipmap

```javascript
// 问题：只上传了部分 mipmap 级别
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, level0);
gl.texImage2D(gl.TEXTURE_2D, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, level1);
// 缺少 level 2, 3, ...

// 纹理将不完整，渲染为黑色

// 解决 1：生成所有级别
gl.generateMipmap(gl.TEXTURE_2D);

// 解决 2：限制最大级别
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 1);

// 解决 3：使用不需要 mipmap 的过滤
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

### 渲染目标纹理

```javascript
// 渲染目标纹理通常不需要 mipmap
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// 如果需要 mipmap，在渲染后生成
gl.bindTexture(gl.TEXTURE_2D, renderTexture);
gl.generateMipmap(gl.TEXTURE_2D);
```

## 自定义 Mipmap 过滤

### 保持锐利（UI/像素艺术）

```javascript
// 完全禁用 mipmap
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
```

### Kaiser 过滤

```javascript
// 预生成高质量 mipmap（使用更好的过滤算法）
// 通常在离线工具中完成

function generateKaiserMipmap(imageData, level) {
  // 使用 Kaiser 窗口函数进行下采样
  // 比简单的盒式过滤更好
  // 减少混叠伪影
}
```

### 保持色彩（sRGB）

```javascript
// 使用 sRGB 纹理确保正确的 gamma
gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_2D);

// GPU 在生成 mipmap 时会正确处理 sRGB
```

## 调试 Mipmap

### 可视化 Mipmap 级别

```glsl
// 在着色器中给每个级别着色
uniform sampler2D u_texture;
uniform sampler2D u_coloredMipmaps;  // 每级不同颜色

void main() {
  float lod = textureQueryLod(u_texture, v_texCoord).x;
  
  // 彩虹色显示级别
  vec3 colors[8] = vec3[](
    vec3(1, 0, 0),   // Level 0: 红
    vec3(1, 0.5, 0), // Level 1: 橙
    vec3(1, 1, 0),   // Level 2: 黄
    vec3(0, 1, 0),   // Level 3: 绿
    vec3(0, 1, 1),   // Level 4: 青
    vec3(0, 0, 1),   // Level 5: 蓝
    vec3(0.5, 0, 1), // Level 6: 紫
    vec3(1, 0, 1)    // Level 7: 品红
  );
  
  int level = int(lod);
  fragColor = vec4(colors[min(level, 7)], 1.0);
}
```

### 检查 Mipmap 完整性

```javascript
// 检查纹理是否完整
gl.bindTexture(gl.TEXTURE_2D, texture);

const complete = gl.isTexture(texture);
if (!complete) {
  console.warn('Texture is incomplete');
}

// 尝试渲染并检查错误
const error = gl.getError();
if (error !== gl.NO_ERROR) {
  console.error('WebGL error:', error);
}
```

## 本章小结

- Mipmap 是预计算的纹理级别金字塔
- 解决缩小时的走样和性能问题
- 内存开销约为原始的 1.33 倍
- generateMipmap 自动生成所有级别
- LOD 参数控制级别选择范围
- 三线性过滤提供最平滑的效果
- 注意非 2 的幂纹理的限制
- 使用 sRGB 确保正确的 gamma

下一章，我们将学习立方体贴图。
