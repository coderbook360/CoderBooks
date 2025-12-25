# 纹理概述

> "纹理是 3D 图形中最强大的视觉增强工具。"

## 什么是纹理

### 定义

纹理（Texture）是存储在 GPU 中的图像数据，用于为 3D 模型表面添加细节。

```
┌─────────────────────────────────────────────────────────┐
│                      纹理应用                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  无纹理:                    有纹理:                     │
│  ┌─────────────┐           ┌─────────────┐             │
│  │             │           │ ▓▒░▓▒░▓▒░▓ │             │
│  │   纯色方块   │   →      │ ░▓▒░▓▒░▓▒░ │ 木纹表面     │
│  │             │           │ ▓▒░▓▒░▓▒░▓ │             │
│  └─────────────┘           └─────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 纹理类型

| 类型 | 目标 | 用途 |
|------|------|------|
| 2D 纹理 | TEXTURE_2D | 最常用，贴图、法线、UI |
| 立方体贴图 | TEXTURE_CUBE_MAP | 天空盒、环境反射 |
| 3D 纹理 | TEXTURE_3D | 体积渲染、LUT |
| 2D 数组纹理 | TEXTURE_2D_ARRAY | 图块集、动画帧 |

## 纹理坐标

### UV 坐标系

```
(0,1)          (1,1)
  ┌──────────────┐
  │              │
  │   纹理图像   │
  │              │
  │              │
  └──────────────┘
(0,0)          (1,0)

U: 水平方向 [0, 1]
V: 垂直方向 [0, 1]
```

### 坐标映射

```glsl
// 顶点着色器
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
}

// 片元着色器
in vec2 v_texCoord;
uniform sampler2D u_texture;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  fragColor = color;
}
```

## 创建纹理

### 基本流程

```javascript
// 1. 创建纹理对象
const texture = gl.createTexture();

// 2. 绑定到目标
gl.bindTexture(gl.TEXTURE_2D, texture);

// 3. 设置参数
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// 4. 上传图像数据
gl.texImage2D(
  gl.TEXTURE_2D,
  0,                  // mipmap 级别
  gl.RGBA,            // 内部格式
  gl.RGBA,            // 源格式
  gl.UNSIGNED_BYTE,   // 数据类型
  image               // 图像源
);

// 5. 生成 mipmap
gl.generateMipmap(gl.TEXTURE_2D);
```

### 从图像加载

```javascript
function loadTexture(url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // 临时填充 1x1 像素
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 0, 255, 255])  // 紫色
  );
  
  // 异步加载图像
  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;
  
  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}
```

## 纹理参数

### 环绕模式

```javascript
// 重复
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

// 镜像重复
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

// 边缘拉伸
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

```
UV > 1 时的效果:

REPEAT:           MIRRORED_REPEAT:   CLAMP_TO_EDGE:
┌───┬───┬───┐    ┌───┬───┬───┐      ┌───┬───┬───┐
│ A │ A │ A │    │ A │ A'│ A │      │ A │ A→│→A→│
├───┼───┼───┤    ├───┼───┼───┤      ├───┼───┼───┤
│ A │ A │ A │    │ A'│ A'│ A'│      │ A │ A→│→A→│
└───┴───┴───┘    └───┴───┴───┘      └───┴───┴───┘
```

### 过滤模式

```javascript
// 缩小过滤（纹理比屏幕像素密度高）
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

// 放大过滤（纹理比屏幕像素密度低）
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

```
NEAREST vs LINEAR:

NEAREST (点采样):     LINEAR (双线性):
┌─┬─┬─┬─┐            ┌─────────┐
│█│░│█│░│            │ 平滑渐变 │
├─┼─┼─┼─┤     →     │         │
│░│█│░│█│            │         │
└─┴─┴─┴─┘            └─────────┘
像素化、锐利            模糊、平滑
```

## 纹理单元

### 多纹理使用

```javascript
// 激活纹理单元
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
gl.uniform1i(u_diffuse, 0);

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, normalTexture);
gl.uniform1i(u_normal, 1);

gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_2D, specularTexture);
gl.uniform1i(u_specular, 2);
```

### 最大纹理单元

```javascript
// 获取最大纹理单元数
const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
console.log('Max texture units:', maxTextureUnits);  // 通常 16-32

// 顶点着色器中的纹理单元
const maxVertexTextureUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
console.log('Max vertex texture units:', maxVertexTextureUnits);  // 通常 16
```

## 采样器对象（WebGL 2.0）

### 创建采样器

```javascript
// 创建采样器
const sampler = gl.createSampler();

// 设置采样参数
gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// 绑定到纹理单元
gl.bindSampler(0, sampler);

// 解绑（使用纹理自身的参数）
gl.bindSampler(0, null);
```

### 采样器优势

```javascript
// 同一纹理，不同采样方式
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.bindSampler(0, linearSampler);   // 线性采样

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, texture);  // 同一纹理
gl.bindSampler(1, nearestSampler);  // 最近点采样
```

## 删除纹理

```javascript
// 删除纹理
gl.deleteTexture(texture);

// 删除采样器
gl.deleteSampler(sampler);

// 检查是否有效
gl.isTexture(texture);    // 删除后返回 false
gl.isSampler(sampler);
```

## 纹理格式

### 常用格式

| 格式 | 组件 | 用途 |
|------|------|------|
| RGBA | 4 | 彩色图像 + 透明度 |
| RGB | 3 | 彩色图像 |
| RG | 2 | 法线图 XY、流场 |
| RED | 1 | 高度图、遮罩 |
| DEPTH_COMPONENT | 1 | 深度图 |

### WebGL 2.0 格式

```javascript
// 标准格式
gl.RGBA8           // 8 位每通道
gl.RGB8
gl.RG8
gl.R8

// 有符号归一化
gl.RGBA8_SNORM
gl.RGB8_SNORM

// 浮点格式
gl.RGBA32F
gl.RGBA16F
gl.RG32F
gl.R32F

// 整数格式
gl.RGBA8UI
gl.RGBA8I
gl.RGBA16UI
gl.RGBA32UI

// 特殊格式
gl.RGB10_A2        // 10 位 RGB + 2 位 Alpha
gl.R11F_G11F_B10F  // HDR 紧凑格式
gl.SRGB8_ALPHA8    // sRGB 颜色空间
```

## 性能考虑

### 纹理大小

```javascript
// 获取最大纹理尺寸
const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
console.log('Max texture size:', maxSize);  // 通常 4096-16384

// 建议：
// - 使用 2 的幂次尺寸（虽然 WebGL 2.0 不强制）
// - 不要超过需要的尺寸
// - 考虑使用纹理图集
```

### 纹理压缩

```javascript
// 检查压缩格式支持
const s3tc = gl.getExtension('WEBGL_compressed_texture_s3tc');
const etc = gl.getExtension('WEBGL_compressed_texture_etc');
const astc = gl.getExtension('WEBGL_compressed_texture_astc');

// 使用压缩纹理
if (s3tc) {
  gl.compressedTexImage2D(
    gl.TEXTURE_2D, 0,
    s3tc.COMPRESSED_RGBA_S3TC_DXT5_EXT,
    width, height, 0,
    compressedData
  );
}
```

## 本章小结

- 纹理存储图像数据用于渲染
- UV 坐标将纹理映射到几何体
- 环绕模式控制 UV 超出 [0,1] 的行为
- 过滤模式控制采样质量
- 纹理单元允许同时使用多个纹理
- 采样器对象分离采样参数和纹理数据
- 选择合适的格式和大小优化性能

下一章，我们将详细学习纹理创建和上传。
