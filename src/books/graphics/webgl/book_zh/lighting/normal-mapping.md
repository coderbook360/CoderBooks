# 法线贴图

> "法线贴图用像素表达几何细节，让低模拥有高模的光照效果。"

## 什么是法线贴图

### 概念

法线贴图（Normal Map）将表面法向量信息存储在纹理中，用于在光照计算时提供更多细节。

```
┌─────────────────────────────────────────────────────────┐
│                    法线贴图原理                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   低多边形模型             使用法线贴图后               │
│   ┌─────────────┐         ┌─────────────┐              │
│   │             │         │ ▓▓▒░░▒▓▓   │              │
│   │   平坦表面  │   →     │ ▒▒░░░▒▒   │              │
│   │             │         │ ▓▓▒░░▒▓▓   │              │
│   └─────────────┘         └─────────────┘              │
│                           看起来有凹凸细节              │
│                                                         │
│   RGB 值存储 XYZ 法向量分量                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 法线贴图颜色

```
┌─────────────────────────────────────────────────────────┐
│                  法线贴图颜色含义                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   RGB → XYZ                                             │
│                                                         │
│   R (红色) → X (切线方向)                               │
│   G (绿色) → Y (副切线方向)                             │
│   B (蓝色) → Z (法线方向，朝外)                         │
│                                                         │
│   典型颜色: 淡蓝紫色 (128, 128, 255)                    │
│   表示: 向上的法线 (0, 0, 1)                            │
│                                                         │
│   颜色范围 [0, 255] → 向量范围 [-1, 1]                  │
│   转换: normal = color * 2.0 - 1.0                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 切线空间

### TBN 矩阵

```
┌─────────────────────────────────────────────────────────┐
│                    切线空间坐标系                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    N (法线)                             │
│                    ↑                                    │
│                    │                                    │
│                    │                                    │
│            ────────●────────→ T (切线)                 │
│                   ╱                                     │
│                  ╱                                      │
│                 ↙                                       │
│                B (副切线)                               │
│                                                         │
│   T: 沿纹理 U 方向                                      │
│   B: 沿纹理 V 方向                                      │
│   N: 垂直于表面                                         │
│                                                         │
│   TBN 矩阵将切线空间转换到世界空间                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 计算切线

```javascript
function calculateTangents(positions, texCoords, indices) {
  const tangents = new Float32Array(positions.length);
  const bitangents = new Float32Array(positions.length);
  
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    
    // 位置
    const p0 = [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]];
    const p1 = [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]];
    const p2 = [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]];
    
    // 纹理坐标
    const uv0 = [texCoords[i0 * 2], texCoords[i0 * 2 + 1]];
    const uv1 = [texCoords[i1 * 2], texCoords[i1 * 2 + 1]];
    const uv2 = [texCoords[i2 * 2], texCoords[i2 * 2 + 1]];
    
    // 边向量
    const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    
    // UV 差值
    const deltaUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
    const deltaUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];
    
    // 计算切线和副切线
    const f = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1]);
    
    const tangent = [
      f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
      f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
      f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])
    ];
    
    const bitangent = [
      f * (-deltaUV2[0] * edge1[0] + deltaUV1[0] * edge2[0]),
      f * (-deltaUV2[0] * edge1[1] + deltaUV1[0] * edge2[1]),
      f * (-deltaUV2[0] * edge1[2] + deltaUV1[0] * edge2[2])
    ];
    
    // 累加到顶点
    for (const idx of [i0, i1, i2]) {
      tangents[idx * 3] += tangent[0];
      tangents[idx * 3 + 1] += tangent[1];
      tangents[idx * 3 + 2] += tangent[2];
      
      bitangents[idx * 3] += bitangent[0];
      bitangents[idx * 3 + 1] += bitangent[1];
      bitangents[idx * 3 + 2] += bitangent[2];
    }
  }
  
  // 归一化
  for (let i = 0; i < tangents.length; i += 3) {
    const len = Math.sqrt(tangents[i]**2 + tangents[i+1]**2 + tangents[i+2]**2);
    tangents[i] /= len;
    tangents[i+1] /= len;
    tangents[i+2] /= len;
  }
  
  return { tangents, bitangents };
}
```

## 着色器实现

### 顶点着色器

```glsl
#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
in vec3 a_tangent;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;

out vec3 v_worldPos;
out vec2 v_texCoord;
out mat3 v_TBN;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_texCoord = a_texCoord;
  
  // 计算 TBN 矩阵
  vec3 T = normalize(u_normalMatrix * a_tangent);
  vec3 N = normalize(u_normalMatrix * a_normal);
  
  // Gram-Schmidt 正交化
  T = normalize(T - dot(T, N) * N);
  
  // 副切线
  vec3 B = cross(N, T);
  
  v_TBN = mat3(T, B, N);
  
  gl_Position = u_projection * u_view * worldPos;
}
```

### 片元着色器

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;

in vec3 v_worldPos;
in vec2 v_texCoord;
in mat3 v_TBN;

out vec4 fragColor;

void main() {
  // 从法线贴图获取法线
  vec3 normalMap = texture(u_normalMap, v_texCoord).rgb;
  
  // 从 [0,1] 转换到 [-1,1]
  vec3 normal = normalMap * 2.0 - 1.0;
  
  // 转换到世界空间
  vec3 N = normalize(v_TBN * normal);
  
  // 光照计算
  vec3 L = normalize(u_lightPos - v_worldPos);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 H = normalize(L + V);
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  vec3 diffuseColor = texture(u_diffuseMap, v_texCoord).rgb;
  vec3 diffuse = diff * diffuseColor;
  
  // 高光
  float spec = pow(max(dot(N, H), 0.0), 32.0);
  vec3 specular = spec * vec3(0.5);
  
  // 环境光
  vec3 ambient = 0.1 * diffuseColor;
  
  fragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

## 优化：切线空间光照

### 概念

将光照向量转换到切线空间，而不是将法线转换到世界空间。

```glsl
// 顶点着色器中进行转换（更高效）
out vec3 v_tangentLightDir;
out vec3 v_tangentViewDir;

void main() {
  // TBN 的逆（切线空间到世界空间的逆）
  mat3 TBN = mat3(T, B, N);
  mat3 invTBN = transpose(TBN);  // 正交矩阵的逆 = 转置
  
  vec3 lightDir = u_lightPos - worldPos.xyz;
  vec3 viewDir = u_viewPos - worldPos.xyz;
  
  // 转换到切线空间
  v_tangentLightDir = invTBN * lightDir;
  v_tangentViewDir = invTBN * viewDir;
  
  // ...
}
```

### 片元着色器

```glsl
in vec3 v_tangentLightDir;
in vec3 v_tangentViewDir;

void main() {
  // 直接使用贴图中的法线（已在切线空间）
  vec3 normal = texture(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
  
  vec3 L = normalize(v_tangentLightDir);
  vec3 V = normalize(v_tangentViewDir);
  vec3 H = normalize(L + V);
  
  // 在切线空间计算光照
  float diff = max(dot(normal, L), 0.0);
  float spec = pow(max(dot(normal, H), 0.0), 32.0);
  
  // ...
}
```

## 法线贴图类型

### 对象空间 vs 切线空间

| 类型 | 存储内容 | 颜色外观 | 适用场景 |
|------|----------|----------|----------|
| 切线空间 | 相对于表面的法线 | 蓝紫色调 | 可变形网格 |
| 对象空间 | 世界坐标系法线 | 彩色 | 静态物体 |

### 切线空间优势

```
┌─────────────────────────────────────────────────────────┐
│                切线空间法线贴图优势                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. 可以复用在不同朝向的面上                           │
│   2. 支持动画和变形                                     │
│   3. 可以平铺和镜像                                     │
│   4. 压缩更高效（Z 可以重建）                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 法线贴图压缩

### BC5/ATI2 压缩

```glsl
// 只存储 XY，重建 Z
uniform sampler2D u_normalMap;  // 只有 RG 通道

void main() {
  vec2 normalXY = texture(u_normalMap, v_texCoord).rg * 2.0 - 1.0;
  
  // 重建 Z（假设法线已归一化）
  float normalZ = sqrt(1.0 - dot(normalXY, normalXY));
  
  vec3 normal = vec3(normalXY, normalZ);
  // ...
}
```

### DXT5 用于法线

```glsl
// DXT5nm 格式：X 在 Alpha，Y 在 Green
vec4 packedNormal = texture(u_normalMap, v_texCoord);
vec2 normalXY = vec2(packedNormal.a, packedNormal.g) * 2.0 - 1.0;
float normalZ = sqrt(1.0 - saturate(dot(normalXY, normalXY)));
vec3 normal = vec3(normalXY, normalZ);
```

## 细节法线贴图

### 混合多层法线

```glsl
uniform sampler2D u_normalMap;       // 主法线贴图
uniform sampler2D u_detailNormalMap; // 细节法线贴图
uniform float u_detailScale;

vec3 blendNormals(vec3 n1, vec3 n2) {
  // UDN 混合
  n1 += vec3(0, 0, 1);
  n2 *= vec3(-1, -1, 1);
  return n1 * dot(n1, n2) / n1.z - n2;
}

void main() {
  vec3 baseNormal = texture(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
  vec3 detailNormal = texture(u_detailNormalMap, v_texCoord * u_detailScale).rgb * 2.0 - 1.0;
  
  vec3 normal = normalize(blendNormals(baseNormal, detailNormal));
  // ...
}
```

### Whiteout 混合

```glsl
vec3 blendNormalsWhiteout(vec3 n1, vec3 n2) {
  return normalize(vec3(
    n1.xy + n2.xy,
    n1.z * n2.z
  ));
}
```

## 凹凸贴图转换

### 从高度图生成

```javascript
function heightMapToNormalMap(heightMap, width, height, strength) {
  const normalData = new Uint8Array(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 采样相邻像素
      const left = getHeight(heightMap, x - 1, y, width, height);
      const right = getHeight(heightMap, x + 1, y, width, height);
      const up = getHeight(heightMap, x, y - 1, width, height);
      const down = getHeight(heightMap, x, y + 1, width, height);
      
      // 计算梯度
      const dx = (right - left) * strength;
      const dy = (down - up) * strength;
      
      // 构建法线
      const normal = normalize([-dx, -dy, 1]);
      
      // 转换到 [0, 255]
      const idx = (y * width + x) * 4;
      normalData[idx + 0] = Math.round((normal[0] * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((normal[1] * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((normal[2] * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }
  
  return normalData;
}
```

### 着色器中实时生成

```glsl
uniform sampler2D u_heightMap;
uniform float u_normalStrength;

vec3 calculateNormalFromHeight(vec2 uv) {
  vec2 texelSize = 1.0 / vec2(textureSize(u_heightMap, 0));
  
  float left = texture(u_heightMap, uv - vec2(texelSize.x, 0)).r;
  float right = texture(u_heightMap, uv + vec2(texelSize.x, 0)).r;
  float up = texture(u_heightMap, uv - vec2(0, texelSize.y)).r;
  float down = texture(u_heightMap, uv + vec2(0, texelSize.y)).r;
  
  vec3 normal = vec3(
    (left - right) * u_normalStrength,
    (up - down) * u_normalStrength,
    1.0
  );
  
  return normalize(normal);
}
```

## 调试技巧

### 可视化法线

```glsl
// 显示世界空间法线
fragColor = vec4(N * 0.5 + 0.5, 1.0);

// 显示切线空间法线
vec3 tangentNormal = texture(u_normalMap, v_texCoord).rgb;
fragColor = vec4(tangentNormal, 1.0);

// 显示切线
fragColor = vec4(v_TBN[0] * 0.5 + 0.5, 1.0);

// 显示副切线
fragColor = vec4(v_TBN[1] * 0.5 + 0.5, 1.0);
```

### 检查 TBN 正交性

```glsl
// TBN 应该接近正交
float TdotN = dot(v_TBN[0], v_TBN[2]);
float TdotB = dot(v_TBN[0], v_TBN[1]);
float BdotN = dot(v_TBN[1], v_TBN[2]);

// 这些值应该接近 0
fragColor = vec4(abs(TdotN), abs(TdotB), abs(BdotN), 1.0);
```

## 本章小结

- 法线贴图存储表面细节法向量
- RGB → XYZ，范围从 [0,1] 转换到 [-1,1]
- TBN 矩阵将切线空间转换到世界空间
- 切线从纹理坐标导数计算
- 可以在切线空间计算光照以优化
- BC5 压缩只存储 XY，重建 Z
- 可以混合多层法线增加细节

下一章，我们将学习视差贴图技术。
