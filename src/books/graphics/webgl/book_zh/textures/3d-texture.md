# 3D 纹理

> "3D 纹理为体积数据提供了无缝的三维采样能力。"

## 什么是 3D 纹理

### 定义

3D 纹理（也称体积纹理）是一种三维纹理，具有宽度、高度和深度三个维度。

```
┌─────────────────────────────────────────────────────────┐
│                    3D 纹理结构                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│        ┌─────────────┐                                  │
│       /             /│                                  │
│      /  切片 n     / │                                  │
│     ┌─────────────┐  │                                  │
│    /             /│  │                                  │
│   /  切片 1     / │  │                                  │
│  ┌─────────────┐  │  │                                  │
│  │  切片 0     │  │ /                                   │
│  │             │  │/                                    │
│  │             │  /                                     │
│  │             │ /                                      │
│  └─────────────┴/                                       │
│                                                         │
│  使用 (s, t, r) 三维坐标采样                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 与 2D 纹理数组对比

| 特性 | 3D 纹理 | 2D 纹理数组 |
|------|---------|------------|
| 深度过滤 | 支持 | 不支持 |
| 切片插值 | 自动 | 手动 |
| Mipmap | 三维缩小 | 二维缩小 |
| 用途 | 体积数据 | 层级精灵 |

## 创建 3D 纹理

### 基本创建

```javascript
const texture3D = gl.createTexture();
gl.bindTexture(gl.TEXTURE_3D, texture3D);

const width = 64;
const height = 64;
const depth = 64;

// 分配空间
gl.texImage3D(
  gl.TEXTURE_3D,
  0,                    // mipmap 级别
  gl.RGBA8,             // 内部格式
  width,
  height,
  depth,
  0,                    // 边框
  gl.RGBA,              // 格式
  gl.UNSIGNED_BYTE,     // 数据类型
  null                  // 数据
);

// 设置参数
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
```

### 上传数据

```javascript
// 创建体积数据
const data = new Uint8Array(width * height * depth * 4);

for (let z = 0; z < depth; z++) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (z * height * width + y * width + x) * 4;
      
      // 示例：球形密度
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dz = z - depth / 2;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const density = Math.max(0, 1 - dist / (width / 2));
      
      data[index + 0] = density * 255;     // R
      data[index + 1] = density * 255;     // G
      data[index + 2] = density * 255;     // B
      data[index + 3] = density * 255;     // A
    }
  }
}

gl.texImage3D(
  gl.TEXTURE_3D,
  0,
  gl.RGBA8,
  width, height, depth,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  data
);

gl.generateMipmap(gl.TEXTURE_3D);
```

### 子区域更新

```javascript
// 更新部分区域
gl.texSubImage3D(
  gl.TEXTURE_3D,
  0,                    // mipmap 级别
  offsetX, offsetY, offsetZ,  // 偏移
  subWidth, subHeight, subDepth,  // 尺寸
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  subData
);
```

## 采样 3D 纹理

### 着色器采样

```glsl
#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler3D u_volume;

in vec3 v_texCoord;  // 三维纹理坐标

out vec4 fragColor;

void main() {
  // 使用三维坐标采样
  vec4 color = texture(u_volume, v_texCoord);
  fragColor = color;
}
```

### LOD 采样

```glsl
// 指定 mipmap 级别
vec4 color = textureLod(u_volume, v_texCoord, 2.0);

// 获取纹理尺寸
ivec3 size = textureSize(u_volume, 0);
```

## 应用场景

### 3D 噪声纹理

```javascript
// 创建 3D Perlin 噪声
function create3DNoiseTexture(size) {
  const data = new Uint8Array(size * size * size);
  
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = z * size * size + y * size + x;
        
        // 多频率噪声
        let noise = 0;
        let amplitude = 1;
        let frequency = 1;
        
        for (let i = 0; i < 4; i++) {
          noise += perlin3D(
            x * frequency / size,
            y * frequency / size,
            z * frequency / size
          ) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        data[index] = (noise * 0.5 + 0.5) * 255;
      }
    }
  }
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, size, size, size, 0, gl.RED, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  return texture;
}
```

### 使用噪声着色器

```glsl
uniform sampler3D u_noise;
uniform float u_time;

void main() {
  // 动画噪声
  vec3 noiseCoord = v_position * 0.5 + vec3(0.0, 0.0, u_time * 0.1);
  float noise = texture(u_noise, noiseCoord).r;
  
  // 用于云、火焰等效果
  fragColor = vec4(vec3(noise), 1.0);
}
```

### 3D LUT（颜色查找表）

```javascript
// 创建 3D 颜色校正 LUT
function createColorLUT(size) {
  const data = new Uint8Array(size * size * size * 4);
  
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const index = (b * size * size + g * size + r) * 4;
        
        // 默认身份映射
        data[index + 0] = r * 255 / (size - 1);
        data[index + 1] = g * 255 / (size - 1);
        data[index + 2] = b * 255 / (size - 1);
        data[index + 3] = 255;
      }
    }
  }
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  
  return texture;
}
```

### 应用 LUT

```glsl
uniform sampler2D u_image;
uniform sampler3D u_lut;
uniform float u_intensity;

void main() {
  vec4 color = texture(u_image, v_texCoord);
  
  // LUT 坐标（考虑半像素偏移）
  float scale = (32.0 - 1.0) / 32.0;
  float offset = 0.5 / 32.0;
  vec3 lutCoord = color.rgb * scale + offset;
  
  vec3 lutColor = texture(u_lut, lutCoord).rgb;
  
  // 混合原色和 LUT 颜色
  fragColor = vec4(mix(color.rgb, lutColor, u_intensity), color.a);
}
```

### 体积渲染

```glsl
// 光线步进渲染体积数据
uniform sampler3D u_volume;
uniform mat4 u_invModelView;
uniform vec2 u_resolution;

const int MAX_STEPS = 128;
const float STEP_SIZE = 0.01;

void main() {
  // 计算光线方向
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 rayDir = normalize(v_rayDir);
  vec3 rayPos = v_rayOrigin;
  
  vec4 accum = vec4(0.0);
  
  for (int i = 0; i < MAX_STEPS; i++) {
    // 采样体积
    vec3 samplePos = rayPos * 0.5 + 0.5;  // 转换到 [0, 1]
    
    if (samplePos.x < 0.0 || samplePos.x > 1.0 ||
        samplePos.y < 0.0 || samplePos.y > 1.0 ||
        samplePos.z < 0.0 || samplePos.z > 1.0) {
      break;
    }
    
    vec4 sample = texture(u_volume, samplePos);
    
    // 前后混合
    sample.rgb *= sample.a;
    accum = accum + sample * (1.0 - accum.a);
    
    if (accum.a > 0.95) break;
    
    rayPos += rayDir * STEP_SIZE;
  }
  
  fragColor = accum;
}
```

## 格式选择

### 常用格式

| 格式 | 用途 | 内存 |
|------|------|------|
| R8 | 单通道密度 | 1 byte/体素 |
| RG8 | 密度+梯度 | 2 bytes/体素 |
| RGBA8 | 颜色+透明度 | 4 bytes/体素 |
| R16F | 高精度密度 | 2 bytes/体素 |
| RGBA16F | HDR 颜色 | 8 bytes/体素 |

### 内存计算

```javascript
function calculate3DTextureSize(width, height, depth, bytesPerPixel) {
  const baseSize = width * height * depth * bytesPerPixel;
  
  // 包含 mipmap
  let totalSize = baseSize;
  let w = width, h = height, d = depth;
  
  while (w > 1 || h > 1 || d > 1) {
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
    d = Math.max(1, Math.floor(d / 2));
    totalSize += w * h * d * bytesPerPixel;
  }
  
  return totalSize;
}

// 128³ RGBA8 纹理
const size = calculate3DTextureSize(128, 128, 128, 4);
console.log(`Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
```

## 性能优化

### 分块加载

```javascript
// 大体积数据分块加载
async function loadVolumeChunked(url, texture, width, height, depth, chunkDepth) {
  const chunkCount = Math.ceil(depth / chunkDepth);
  
  for (let i = 0; i < chunkCount; i++) {
    const offsetZ = i * chunkDepth;
    const currentDepth = Math.min(chunkDepth, depth - offsetZ);
    
    const chunkData = await fetchVolumeChunk(url, offsetZ, currentDepth);
    
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texSubImage3D(
      gl.TEXTURE_3D,
      0,
      0, 0, offsetZ,
      width, height, currentDepth,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      chunkData
    );
    
    // 更新进度
    console.log(`Loaded chunk ${i + 1}/${chunkCount}`);
  }
}
```

### 压缩纹理

```javascript
// 检查压缩格式支持
const ext = gl.getExtension('WEBGL_compressed_texture_s3tc');

if (ext) {
  // 使用压缩格式
  gl.compressedTexImage3D(
    gl.TEXTURE_3D,
    0,
    ext.COMPRESSED_RGBA_S3TC_DXT5_EXT,
    width, height, depth,
    0,
    compressedData
  );
}
```

## 本章小结

- 3D 纹理具有三个维度（宽、高、深）
- 支持三维过滤和插值
- 使用 `texImage3D` 创建和上传
- 适用于体积数据、3D 噪声、颜色 LUT
- 体积渲染使用光线步进技术
- 注意内存占用（立方增长）
- 大数据可分块加载

下一章，我们将学习深度缓冲和深度测试。
