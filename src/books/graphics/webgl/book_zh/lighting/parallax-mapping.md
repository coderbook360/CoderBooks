# 视差贴图

> "视差贴图让平面产生真正的深度错觉，比法线贴图更进一步。"

## 什么是视差贴图

### 概念

视差贴图（Parallax Mapping）通过偏移纹理坐标来模拟表面的高度变化，产生真实的深度感。

```
┌─────────────────────────────────────────────────────────┐
│                    视差贴图原理                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   法线贴图:                                             │
│   只改变光照，纹理坐标不变                              │
│   ┌─────────────────────────┐                          │
│   │ ▓▓▓░░░▓▓▓░░░▓▓▓░░░▓▓▓  │ 看起来凹凸               │
│   └─────────────────────────┘ 但边缘是平的              │
│                                                         │
│   视差贴图:                                             │
│   偏移纹理坐标，模拟视角变化                            │
│   ┌─────────────────────────┐                          │
│   │  ▓░  ▓░  ▓░  ▓░       │ 低处看起来                │
│   │▓▓▓░░▓▓▓░░▓▓▓░░▓▓▓    │ 向后移动                  │
│   └─────────────────────────┘                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 视差效果

```
┌─────────────────────────────────────────────────────────┐
│                    视差偏移原理                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│            V (观察方向)                                 │
│             ↘                                           │
│              ↘                                          │
│   表面 ───────●───────────                             │
│               │↘ 偏移                                  │
│               │  ↘                                      │
│   实际高度 ───┼───●─────                               │
│               │                                         │
│                                                         │
│   看到的点应该是下面那个，而不是表面那个                │
│   所以需要偏移纹理坐标                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 基础视差贴图

### 简单偏移

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_heightMap;
uniform float u_heightScale;

in vec2 v_texCoord;
in vec3 v_tangentViewDir;

out vec4 fragColor;

vec2 parallaxMapping(vec2 texCoord, vec3 viewDir) {
  // 获取高度值
  float height = texture(u_heightMap, texCoord).r;
  
  // 计算偏移量
  vec2 offset = viewDir.xy / viewDir.z * (height * u_heightScale);
  
  return texCoord - offset;
}

void main() {
  vec3 V = normalize(v_tangentViewDir);
  
  // 偏移纹理坐标
  vec2 texCoord = parallaxMapping(v_texCoord, V);
  
  // 使用偏移后的坐标采样
  vec3 diffuse = texture(u_diffuseMap, texCoord).rgb;
  vec3 normal = texture(u_normalMap, texCoord).rgb * 2.0 - 1.0;
  
  // 光照计算...
  
  fragColor = vec4(diffuse, 1.0);
}
```

### 问题

简单视差贴图在陡峭角度会失效，因为它假设高度是均匀的。

## 陡峭视差贴图

### 概念

陡峭视差贴图（Steep Parallax Mapping）将高度采样分成多层，逐步搜索交点。

```
┌─────────────────────────────────────────────────────────┐
│                陡峭视差贴图采样                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│      V ↘                                               │
│         ↘                                              │
│   层1 ───●──────────                                   │
│          │↘                                            │
│   层2 ───┼─●────────                                   │
│          │  ↘                                          │
│   层3 ───┼───●──────  ← 高度曲面在这里                │
│          │    ↘                                        │
│   层4 ───┼─────●────  ← 射线穿过高度曲面              │
│          │                                             │
│                                                         │
│   找到射线与高度曲面的交点                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实现

```glsl
vec2 steepParallaxMapping(vec2 texCoord, vec3 viewDir) {
  // 层数（视角越陡峭需要越多层）
  const float minLayers = 8.0;
  const float maxLayers = 32.0;
  float numLayers = mix(maxLayers, minLayers, abs(viewDir.z));
  
  // 每层高度
  float layerDepth = 1.0 / numLayers;
  float currentLayerDepth = 0.0;
  
  // 每层的纹理偏移量
  vec2 P = viewDir.xy * u_heightScale;
  vec2 deltaTexCoord = P / numLayers;
  
  vec2 currentTexCoord = texCoord;
  float currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
  
  // 沿射线前进，直到低于高度曲面
  while (currentLayerDepth < currentDepthMapValue) {
    currentTexCoord -= deltaTexCoord;
    currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
    currentLayerDepth += layerDepth;
  }
  
  return currentTexCoord;
}
```

## 视差遮蔽贴图

### 概念

视差遮蔽贴图（Parallax Occlusion Mapping, POM）在陡峭视差的基础上增加线性插值，得到更精确的交点。

```glsl
vec2 parallaxOcclusionMapping(vec2 texCoord, vec3 viewDir) {
  const float minLayers = 8.0;
  const float maxLayers = 32.0;
  float numLayers = mix(maxLayers, minLayers, abs(viewDir.z));
  
  float layerDepth = 1.0 / numLayers;
  float currentLayerDepth = 0.0;
  
  vec2 P = viewDir.xy * u_heightScale;
  vec2 deltaTexCoord = P / numLayers;
  
  vec2 currentTexCoord = texCoord;
  float currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
  
  while (currentLayerDepth < currentDepthMapValue) {
    currentTexCoord -= deltaTexCoord;
    currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
    currentLayerDepth += layerDepth;
  }
  
  // 线性插值获取精确位置
  vec2 prevTexCoord = currentTexCoord + deltaTexCoord;
  
  float afterDepth = currentDepthMapValue - currentLayerDepth;
  float beforeDepth = texture(u_heightMap, prevTexCoord).r - currentLayerDepth + layerDepth;
  
  float weight = afterDepth / (afterDepth - beforeDepth);
  vec2 finalTexCoord = prevTexCoord * weight + currentTexCoord * (1.0 - weight);
  
  return finalTexCoord;
}
```

## 自阴影

### 概念

视差表面的凸起部分会遮挡光线，产生自阴影。

```
┌─────────────────────────────────────────────────────────┐
│                    视差自阴影                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   L (光线)                                              │
│    ↘                                                    │
│     ↘                                                   │
│      ● 凸起                                            │
│     ╱│╲                                               │
│    ╱ │ ╲                                              │
│   ───┼──────────                                       │
│   阴影 │                                                │
│                                                         │
│   沿光线方向检查是否被遮挡                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实现

```glsl
float parallaxShadow(vec2 texCoord, vec3 lightDir, float currentHeight) {
  float shadowMultiplier = 1.0;
  
  if (lightDir.z <= 0.0) return 0.0;  // 光线从下方来
  
  const float minLayers = 8.0;
  const float maxLayers = 32.0;
  float numLayers = mix(maxLayers, minLayers, lightDir.z);
  
  float layerHeight = currentHeight / numLayers;
  vec2 texStep = u_heightScale * lightDir.xy / lightDir.z / numLayers;
  
  float currentLayerHeight = currentHeight - layerHeight;
  vec2 currentTexCoord = texCoord + texStep;
  float heightFromTexture = texture(u_heightMap, currentTexCoord).r;
  
  float numSamplesUnderSurface = 0.0;
  
  while (currentLayerHeight > 0.0) {
    if (heightFromTexture > currentLayerHeight) {
      // 被遮挡
      numSamplesUnderSurface += 1.0;
      float newShadow = (currentLayerHeight - heightFromTexture) * 
                        (1.0 - currentLayerHeight);
      shadowMultiplier = max(shadowMultiplier - newShadow, 0.0);
    }
    
    currentLayerHeight -= layerHeight;
    currentTexCoord += texStep;
    heightFromTexture = texture(u_heightMap, currentTexCoord).r;
  }
  
  if (numSamplesUnderSurface < 1.0) {
    shadowMultiplier = 1.0;
  }
  
  return shadowMultiplier;
}
```

### 使用自阴影

```glsl
void main() {
  vec3 V = normalize(v_tangentViewDir);
  vec3 L = normalize(v_tangentLightDir);
  
  vec2 texCoord = parallaxOcclusionMapping(v_texCoord, V);
  float height = texture(u_heightMap, texCoord).r;
  
  // 计算自阴影
  float shadow = parallaxShadow(texCoord, L, height);
  
  // 光照计算
  vec3 diffuse = ...;
  vec3 specular = ...;
  
  // 应用阴影
  vec3 result = ambient + (diffuse + specular) * shadow;
  
  fragColor = vec4(result, 1.0);
}
```

## 边缘处理

### 丢弃超出边界的片元

```glsl
void main() {
  vec2 texCoord = parallaxOcclusionMapping(v_texCoord, V);
  
  // 检查是否超出 [0, 1] 范围
  if (texCoord.x < 0.0 || texCoord.x > 1.0 ||
      texCoord.y < 0.0 || texCoord.y > 1.0) {
    discard;
  }
  
  // ...
}
```

### 渐隐边缘

```glsl
float edgeFade(vec2 texCoord) {
  vec2 edge = min(texCoord, 1.0 - texCoord);
  float fade = min(edge.x, edge.y) * 10.0;  // 边缘 10% 渐隐
  return clamp(fade, 0.0, 1.0);
}

void main() {
  vec2 texCoord = parallaxOcclusionMapping(v_texCoord, V);
  
  float fade = edgeFade(texCoord);
  if (fade <= 0.0) discard;
  
  // ...
  
  fragColor.a *= fade;
}
```

## 性能优化

### 距离 LOD

```glsl
uniform float u_maxDistance;

void main() {
  float distance = length(v_worldPos - u_viewPos);
  float blend = clamp((distance / u_maxDistance), 0.0, 1.0);
  
  vec2 texCoord;
  if (blend < 1.0) {
    // 近处使用完整 POM
    vec2 pomCoord = parallaxOcclusionMapping(v_texCoord, V);
    // 远处只使用原始坐标
    texCoord = mix(pomCoord, v_texCoord, blend);
  } else {
    texCoord = v_texCoord;
  }
  
  // ...
}
```

### 二分搜索优化

```glsl
vec2 parallaxBinarySearch(vec2 texCoord, vec3 viewDir) {
  // 先用较少层数粗略查找
  const float layers = 8.0;
  float layerDepth = 1.0 / layers;
  float currentLayerDepth = 0.0;
  
  vec2 P = viewDir.xy * u_heightScale;
  vec2 deltaTexCoord = P / layers;
  
  vec2 currentTexCoord = texCoord;
  float currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
  
  while (currentLayerDepth < currentDepthMapValue) {
    currentTexCoord -= deltaTexCoord;
    currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
    currentLayerDepth += layerDepth;
  }
  
  // 二分搜索细化
  vec2 halfDelta = deltaTexCoord * 0.5;
  float halfLayerDepth = layerDepth * 0.5;
  
  for (int i = 0; i < 5; i++) {
    currentDepthMapValue = texture(u_heightMap, currentTexCoord).r;
    
    if (currentDepthMapValue > currentLayerDepth) {
      currentTexCoord -= halfDelta;
      currentLayerDepth += halfLayerDepth;
    } else {
      currentTexCoord += halfDelta;
      currentLayerDepth -= halfLayerDepth;
    }
    
    halfDelta *= 0.5;
    halfLayerDepth *= 0.5;
  }
  
  return currentTexCoord;
}
```

## 完整着色器

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
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;

out vec2 v_texCoord;
out vec3 v_tangentLightDir;
out vec3 v_tangentViewDir;
out vec3 v_worldPos;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_texCoord = a_texCoord;
  
  vec3 T = normalize(u_normalMatrix * a_tangent);
  vec3 N = normalize(u_normalMatrix * a_normal);
  T = normalize(T - dot(T, N) * N);
  vec3 B = cross(N, T);
  
  mat3 TBN = transpose(mat3(T, B, N));
  
  v_tangentLightDir = TBN * (u_lightPos - worldPos.xyz);
  v_tangentViewDir = TBN * (u_viewPos - worldPos.xyz);
  
  gl_Position = u_projection * u_view * worldPos;
}
```

### 片元着色器

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_heightMap;
uniform float u_heightScale;

in vec2 v_texCoord;
in vec3 v_tangentLightDir;
in vec3 v_tangentViewDir;
in vec3 v_worldPos;

out vec4 fragColor;

// 包含 parallaxOcclusionMapping 和 parallaxShadow 函数...

void main() {
  vec3 V = normalize(v_tangentViewDir);
  vec3 L = normalize(v_tangentLightDir);
  
  // 视差偏移
  vec2 texCoord = parallaxOcclusionMapping(v_texCoord, V);
  
  // 边界检查
  if (texCoord.x < 0.0 || texCoord.x > 1.0 ||
      texCoord.y < 0.0 || texCoord.y > 1.0) {
    discard;
  }
  
  // 采样贴图
  vec3 diffuseColor = texture(u_diffuseMap, texCoord).rgb;
  vec3 normal = normalize(texture(u_normalMap, texCoord).rgb * 2.0 - 1.0);
  float height = texture(u_heightMap, texCoord).r;
  
  // 自阴影
  float shadow = parallaxShadow(texCoord, L, height);
  
  // 光照
  vec3 H = normalize(L + V);
  float diff = max(dot(normal, L), 0.0);
  float spec = pow(max(dot(normal, H), 0.0), 32.0);
  
  vec3 ambient = 0.1 * diffuseColor;
  vec3 diffuse = diff * diffuseColor;
  vec3 specular = spec * vec3(0.5);
  
  vec3 result = ambient + (diffuse + specular) * shadow;
  
  fragColor = vec4(result, 1.0);
}
```

## 本章小结

- 视差贴图偏移纹理坐标模拟深度
- 简单视差只采样一次，效果有限
- 陡峭视差分层搜索交点
- POM 添加线性插值提高精度
- 自阴影需要沿光线方向检查遮挡
- 注意处理边界情况
- 使用距离 LOD 和二分搜索优化性能

下一章，我们将学习多光源渲染。
