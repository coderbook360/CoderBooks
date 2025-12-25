# 漫反射

> "漫反射让我们看到物体的颜色，是最基础也最重要的光照分量。"

## 什么是漫反射

### 物理原理

漫反射发生在光线进入粗糙表面，在表面下多次反弹后向各个方向均匀散射出来。

```
┌─────────────────────────────────────────────────────────┐
│                    漫反射原理                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   入射光                                                │
│      ↘                                                  │
│       ↘    ↗  ↑  ↖                                    │
│        ↘  ╱   │   ╲                                    │
│         ↘╱    │    ╲                                   │
│   ───────●────────────                                  │
│          ╲    │    ╱                                    │
│           ╲   ↓   ╱                                     │
│            散射到各个方向                               │
│                                                         │
│   漫反射与观察角度无关                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Lambert 定律

```
┌─────────────────────────────────────────────────────────┐
│                    Lambert 定律                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              L (光线方向)                               │
│              ↘  θ                                       │
│               ↘─┐                                       │
│                ↘│                                       │
│   ─────────────●─────────→ N (法向量)                  │
│                                                         │
│   漫反射强度 = cos(θ) = dot(N, L)                       │
│                                                         │
│   θ = 0°  → cos = 1.0 (最亮)                           │
│   θ = 90° → cos = 0.0 (无光)                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 基础实现

### 方向光漫反射

```glsl
#version 300 es
precision highp float;

uniform vec3 u_lightDir;      // 指向光源的方向
uniform vec3 u_lightColor;    // 光源颜色
uniform vec3 u_materialDiffuse; // 材质漫反射颜色

in vec3 v_normal;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  
  // Lambert 漫反射
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = u_lightColor * u_materialDiffuse * NdotL;
  
  fragColor = vec4(diffuse, 1.0);
}
```

### 点光源漫反射

```glsl
uniform vec3 u_lightPos;      // 光源位置

in vec3 v_worldPos;
in vec3 v_normal;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_worldPos);  // 从片元指向光源
  
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = u_lightColor * u_materialDiffuse * NdotL;
  
  fragColor = vec4(diffuse, 1.0);
}
```

## 完整光照计算

### 结合环境光

```glsl
uniform vec3 u_ambientColor;
uniform float u_ambientIntensity;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;

struct Material {
  vec3 ambient;
  vec3 diffuse;
};

uniform Material u_material;

in vec3 v_normal;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  
  // 环境光
  vec3 ambient = u_ambientColor * u_ambientIntensity * u_material.ambient;
  
  // 漫反射
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = u_lightColor * u_material.diffuse * NdotL;
  
  vec3 result = ambient + diffuse;
  fragColor = vec4(result, 1.0);
}
```

## 纹理漫反射

### 使用漫反射贴图

```glsl
uniform sampler2D u_diffuseMap;

in vec2 v_texCoord;
in vec3 v_normal;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  
  // 从纹理获取漫反射颜色
  vec3 diffuseColor = texture(u_diffuseMap, v_texCoord).rgb;
  
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = u_lightColor * diffuseColor * NdotL;
  
  fragColor = vec4(diffuse, 1.0);
}
```

### sRGB 校正

```glsl
// 从 sRGB 纹理读取时需要线性化
vec3 diffuseColor = texture(u_diffuseMap, v_texCoord).rgb;
diffuseColor = pow(diffuseColor, vec3(2.2));  // sRGB 到线性

// 计算光照...

// 输出前转回 sRGB
result = pow(result, vec3(1.0 / 2.2));  // 线性到 sRGB
fragColor = vec4(result, 1.0);
```

## 光照衰减

### 点光源衰减

```glsl
struct PointLight {
  vec3 position;
  vec3 color;
  float constant;   // 常量衰减项
  float linear;     // 线性衰减项
  float quadratic;  // 二次衰减项
};

float calculateAttenuation(PointLight light, float distance) {
  return 1.0 / (light.constant + 
                light.linear * distance + 
                light.quadratic * distance * distance);
}

void main() {
  vec3 lightVec = u_light.position - v_worldPos;
  float distance = length(lightVec);
  vec3 L = lightVec / distance;
  
  float attenuation = calculateAttenuation(u_light, distance);
  
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = u_light.color * u_material.diffuse * NdotL * attenuation;
  
  fragColor = vec4(diffuse, 1.0);
}
```

### 衰减曲线

```
┌─────────────────────────────────────────────────────────┐
│                    衰减曲线                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1.0 ├─╲                                               │
│       │  ╲ 线性衰减                                    │
│       │   ╲                                             │
│   0.5 ├────╲──────                                      │
│       │     ╲    ╲ 二次衰减（更自然）                  │
│       │      ╲    ╲                                    │
│   0.0 ├───────╲────╲──────────────→ 距离              │
│       0        └────┴── 远                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 常用衰减值

| 范围 | Constant | Linear | Quadratic |
|------|----------|--------|-----------|
| 7 | 1.0 | 0.7 | 1.8 |
| 13 | 1.0 | 0.35 | 0.44 |
| 20 | 1.0 | 0.22 | 0.20 |
| 32 | 1.0 | 0.14 | 0.07 |
| 50 | 1.0 | 0.09 | 0.032 |
| 100 | 1.0 | 0.045 | 0.0075 |

## 聚光灯漫反射

### 实现

```glsl
struct SpotLight {
  vec3 position;
  vec3 direction;
  vec3 color;
  float innerCutoff;  // cos(内锥角)
  float outerCutoff;  // cos(外锥角)
  float constant;
  float linear;
  float quadratic;
};

vec3 calculateSpotLight(SpotLight light, vec3 N, vec3 fragPos) {
  vec3 lightVec = light.position - fragPos;
  float distance = length(lightVec);
  vec3 L = lightVec / distance;
  
  // 衰减
  float attenuation = 1.0 / (light.constant + 
                             light.linear * distance + 
                             light.quadratic * distance * distance);
  
  // 聚光锥
  float theta = dot(L, normalize(-light.direction));
  float epsilon = light.innerCutoff - light.outerCutoff;
  float intensity = clamp((theta - light.outerCutoff) / epsilon, 0.0, 1.0);
  
  // 漫反射
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = light.color * u_material.diffuse * NdotL;
  
  return diffuse * attenuation * intensity;
}
```

### 软边缘

```
┌─────────────────────────────────────────────────────────┐
│                    聚光灯软边缘                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│               ★ 光源                                   │
│              /│\                                        │
│             / │ \                                       │
│            /  │  \                                      │
│           ╱───┼───╲ 内锥 (100% 强度)                   │
│          ╱    │    ╲                                   │
│         ╱─────┼─────╲ 外锥 (渐变到 0%)                │
│        ╱      │      ╲                                 │
│       ────────┴────────                                │
│                                                         │
│   内锥到外锥之间平滑过渡                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 多光源

### 累加多个光源

```glsl
#define MAX_POINT_LIGHTS 4
#define MAX_DIR_LIGHTS 2

uniform PointLight u_pointLights[MAX_POINT_LIGHTS];
uniform int u_numPointLights;
uniform DirectionalLight u_dirLights[MAX_DIR_LIGHTS];
uniform int u_numDirLights;

void main() {
  vec3 N = normalize(v_normal);
  vec3 result = vec3(0.0);
  
  // 累加方向光
  for (int i = 0; i < u_numDirLights; i++) {
    result += calculateDirLight(u_dirLights[i], N);
  }
  
  // 累加点光源
  for (int i = 0; i < u_numPointLights; i++) {
    result += calculatePointLight(u_pointLights[i], N, v_worldPos);
  }
  
  // 加上环境光
  result += ambient;
  
  fragColor = vec4(result, 1.0);
}
```

### UBO 管理光源

```javascript
// 使用 Uniform Buffer Object 管理多光源
const lightBuffer = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, lightBuffer);

const lightData = new Float32Array([
  // Light 0
  0, 5, 0, 0,      // position + padding
  1, 1, 1, 1,      // color + intensity
  // Light 1...
]);

gl.bufferData(gl.UNIFORM_BUFFER, lightData, gl.DYNAMIC_DRAW);
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, lightBuffer);
```

## Half-Lambert

### 改进的漫反射

```glsl
// 标准 Lambert 在背面完全黑暗
// Half-Lambert 提供更柔和的过渡

float NdotL = dot(N, L);

// 标准 Lambert
float diffuseLambert = max(NdotL, 0.0);

// Half-Lambert
float diffuseHalfLambert = NdotL * 0.5 + 0.5;
diffuseHalfLambert = pow(diffuseHalfLambert, 2.0);  // 可选：增加对比度
```

### 对比

```
┌─────────────────────────────────────────────────────────┐
│               Lambert vs Half-Lambert                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Lambert:                                              │
│   ███████░░░░░░░░░░ 背面完全黑暗                       │
│                                                         │
│   Half-Lambert:                                         │
│   ██████▓▓▓▒▒▒░░░░ 背面也有些许光照                   │
│                                                         │
│   Half-Lambert 更适合角色渲染                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 包裹漫反射

### Wrap Lighting

```glsl
uniform float u_wrap;  // 0 = 标准, 1 = 完全包裹

float wrapDiffuse(float NdotL, float wrap) {
  return max(0.0, (NdotL + wrap) / (1.0 + wrap));
}

void main() {
  float NdotL = dot(N, L);
  float diffuse = wrapDiffuse(NdotL, u_wrap);
  // ...
}
```

## 能量守恒

### 问题

```glsl
// 简单实现可能导致光照过曝
vec3 ambient = ambientColor * 0.2;
vec3 diffuse = lightColor * NdotL;

// 如果 diffuse 很亮，结果可能超过 1.0
```

### 解决方案

```glsl
// 1. 限制光照总量
vec3 result = ambient + diffuse;
result = min(result, vec3(1.0));  // 简单裁剪

// 2. 使用 HDR + 色调映射
vec3 result = ambient + diffuse;
result = result / (result + vec3(1.0));  // Reinhard 色调映射

// 3. 物理正确的 BRDF（下一章）
```

## 本章小结

- 漫反射基于 Lambert 定律：I = max(N·L, 0)
- 漫反射与观察角度无关
- 点光源需要计算衰减（距离的平方反比）
- 聚光灯需要计算锥形边缘
- 多光源累加各个光源贡献
- Half-Lambert 提供更柔和的过渡
- 注意能量守恒和色调映射

下一章，我们将学习高光反射。
