# 环境光

> "环境光是世界的底色，确保阴影中的物体也能被看见。"

## 什么是环境光

### 概念

环境光（Ambient Light）模拟间接光照——光线在场景中多次反弹后产生的均匀照明。

```
┌─────────────────────────────────────────────────────────┐
│                    环境光原理                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   真实世界:                                             │
│   光源 → 墙壁 → 地板 → 物体 → 眼睛                     │
│         ↘    ↗    ↘    ↗                              │
│          反弹    反弹    反弹                           │
│                                                         │
│   简化模型:                                             │
│   环境光 = 场景中各处均匀的间接光                       │
│                                                         │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░                           │
│   ░░░░░ 均匀照明 ░░░░░░░░░░░                            │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 特点

- 不依赖光源方向
- 不依赖表面法向量
- 不依赖观察方向
- 均匀照亮所有表面

## 基础实现

### 最简单的环境光

```glsl
#version 300 es
precision highp float;

uniform vec3 u_ambientColor;    // 环境光颜色
uniform float u_ambientIntensity; // 环境光强度
uniform vec3 u_materialColor;   // 材质颜色

out vec4 fragColor;

void main() {
  vec3 ambient = u_ambientColor * u_ambientIntensity * u_materialColor;
  fragColor = vec4(ambient, 1.0);
}
```

### JavaScript 设置

```javascript
// 设置环境光 uniform
gl.uniform3f(u_ambientColor, 1.0, 1.0, 1.0);  // 白色环境光
gl.uniform1f(u_ambientIntensity, 0.1);         // 10% 强度
gl.uniform3f(u_materialColor, 0.8, 0.2, 0.2);  // 红色材质
```

## 与其他光照结合

### 完整光照公式

```glsl
// 环境光 + 漫反射 + 高光
vec3 ambient = u_ambientColor * u_ambientIntensity * material.ambient;
vec3 diffuse = ...; // 漫反射计算
vec3 specular = ...; // 高光计算

vec3 finalColor = ambient + diffuse + specular;
```

### 示例着色器

```glsl
#version 300 es
precision highp float;

struct Material {
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float shininess;
};

struct Light {
  vec3 direction;
  vec3 color;
  float ambientIntensity;
  float diffuseIntensity;
};

uniform Material u_material;
uniform Light u_light;
uniform vec3 u_viewPos;

in vec3 v_worldPos;
in vec3 v_normal;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(-u_light.direction);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 H = normalize(L + V);
  
  // 环境光
  vec3 ambient = u_light.color * u_light.ambientIntensity * u_material.ambient;
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = u_light.color * u_light.diffuseIntensity * diff * u_material.diffuse;
  
  // 高光
  float spec = pow(max(dot(N, H), 0.0), u_material.shininess);
  vec3 specular = u_light.color * spec * u_material.specular;
  
  fragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

## 环境光变体

### 半球环境光

```glsl
// 根据法向量在天空色和地面色之间插值
uniform vec3 u_skyColor;    // 天空颜色
uniform vec3 u_groundColor; // 地面颜色

vec3 hemisphereAmbient(vec3 normal) {
  // 法向量 Y 分量决定混合比例
  float blend = normal.y * 0.5 + 0.5;  // -1~1 映射到 0~1
  return mix(u_groundColor, u_skyColor, blend);
}

void main() {
  vec3 N = normalize(v_normal);
  vec3 ambient = hemisphereAmbient(N) * u_material.ambient;
  // ...
}
```

```
┌─────────────────────────────────────────────────────────┐
│                    半球环境光                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   天空色 (淡蓝)                                         │
│   ░░░░░░░░░░░░░░░░░░░                                  │
│        ↓                                                │
│        ▓ ← 朝上的面较亮                                │
│       ╱ ╲                                              │
│      ╱   ╲                                             │
│     ╱     ╲                                            │
│    ▓       ▒ ← 侧面中等                                │
│    │  物体 │                                           │
│    ▒───────▒ ← 朝下的面较暗                            │
│        ↑                                                │
│   地面色 (土黄)                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 三色环境光

```glsl
uniform vec3 u_ambientUp;    // 向上方向的环境光
uniform vec3 u_ambientSide;  // 侧面方向的环境光
uniform vec3 u_ambientDown;  // 向下方向的环境光

vec3 triColorAmbient(vec3 normal) {
  float upDot = max(normal.y, 0.0);
  float downDot = max(-normal.y, 0.0);
  float sideDot = 1.0 - abs(normal.y);
  
  return u_ambientUp * upDot +
         u_ambientSide * sideDot +
         u_ambientDown * downDot;
}
```

## 环境遮蔽

### 什么是 AO

```
┌─────────────────────────────────────────────────────────┐
│                环境遮蔽 (Ambient Occlusion)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   角落和缝隙处环境光较少:                               │
│                                                         │
│        ┌───────────┐                                    │
│        │           │                                    │
│        │     ░     │ ← 开阔区域，环境光充足            │
│        │    ╱      │                                    │
│   ─────┼───┘       │                                    │
│   ▓▓▓▓▓│           │ ← 角落较暗                        │
│                                                         │
│   AO 贴图存储每个点的遮蔽程度 (0-1)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 使用 AO 贴图

```glsl
uniform sampler2D u_aoMap;

void main() {
  float ao = texture(u_aoMap, v_texCoord).r;
  
  // 环境光受 AO 影响
  vec3 ambient = u_ambientColor * u_material.ambient * ao;
  
  // 漫反射和高光通常不受 AO 影响
  vec3 diffuse = ...;
  vec3 specular = ...;
  
  fragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

### SSAO 简介

```glsl
// Screen-Space Ambient Occlusion 在屏幕空间计算遮蔽
// 需要深度和法向量缓冲

uniform sampler2D u_depthTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_noiseTexture;

const int KERNEL_SIZE = 64;
uniform vec3 u_samples[KERNEL_SIZE];

float calculateSSAO() {
  vec3 fragPos = reconstructPosition(v_texCoord);
  vec3 normal = texture(u_normalTexture, v_texCoord).xyz * 2.0 - 1.0;
  vec3 randomVec = texture(u_noiseTexture, v_texCoord * u_noiseScale).xyz;
  
  // 构建 TBN 矩阵
  vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
  vec3 bitangent = cross(normal, tangent);
  mat3 TBN = mat3(tangent, bitangent, normal);
  
  float occlusion = 0.0;
  
  for (int i = 0; i < KERNEL_SIZE; i++) {
    // 采样点位置
    vec3 samplePos = fragPos + TBN * u_samples[i] * u_radius;
    
    // 投影到屏幕
    vec4 offset = u_projection * vec4(samplePos, 1.0);
    offset.xyz /= offset.w;
    offset.xy = offset.xy * 0.5 + 0.5;
    
    // 比较深度
    float sampleDepth = texture(u_depthTexture, offset.xy).r;
    
    // 范围检查
    float rangeCheck = smoothstep(0.0, 1.0, 
      u_radius / abs(fragPos.z - sampleDepth));
    
    occlusion += (sampleDepth >= samplePos.z ? 1.0 : 0.0) * rangeCheck;
  }
  
  return 1.0 - (occlusion / float(KERNEL_SIZE));
}
```

## 图像环境光

### 环境贴图采样

```glsl
uniform samplerCube u_envMap;

vec3 envMapAmbient(vec3 normal) {
  // 使用法向量采样环境贴图
  vec3 envColor = texture(u_envMap, normal).rgb;
  return envColor * u_ambientIntensity;
}
```

### 预滤波环境贴图

```glsl
// 使用预模糊的环境贴图，避免采样噪声
uniform samplerCube u_irradianceMap;  // 预计算的辐照度贴图

vec3 iblAmbient(vec3 normal) {
  vec3 irradiance = texture(u_irradianceMap, normal).rgb;
  return irradiance * u_material.diffuse;
}
```

## 动态环境光

### 时间变化

```javascript
function updateAmbient(timeOfDay) {
  // 根据一天中的时间调整环境光
  let ambientColor;
  let ambientIntensity;
  
  if (timeOfDay < 6 || timeOfDay > 20) {
    // 夜晚
    ambientColor = [0.1, 0.1, 0.2];
    ambientIntensity = 0.05;
  } else if (timeOfDay < 8 || timeOfDay > 18) {
    // 黎明/黄昏
    ambientColor = [0.4, 0.3, 0.2];
    ambientIntensity = 0.15;
  } else {
    // 白天
    ambientColor = [0.9, 0.9, 1.0];
    ambientIntensity = 0.2;
  }
  
  gl.uniform3fv(u_ambientColor, ambientColor);
  gl.uniform1f(u_ambientIntensity, ambientIntensity);
}
```

### 室内/室外过渡

```glsl
uniform float u_indoorFactor;  // 0 = 室外, 1 = 室内

void main() {
  vec3 outdoorAmbient = u_skyColor * 0.2;
  vec3 indoorAmbient = u_indoorLightColor * 0.1;
  
  vec3 ambient = mix(outdoorAmbient, indoorAmbient, u_indoorFactor);
  // ...
}
```

## 性能考虑

### 简化计算

```glsl
// 环境光计算非常简单，几乎没有性能开销
vec3 ambient = ambientColor * materialColor;

// 半球环境光略复杂但仍然很快
vec3 ambient = mix(groundColor, skyColor, normal.y * 0.5 + 0.5);
```

### AO 优化

```javascript
// AO 贴图烘焙（离线计算，运行时只采样）
// 比实时 SSAO 快很多

// SSAO 可以降采样计算然后上采样
const aoWidth = canvas.width / 2;
const aoHeight = canvas.height / 2;
```

## 常见问题

### 场景过暗

```javascript
// 增加环境光强度
gl.uniform1f(u_ambientIntensity, 0.2);  // 从 0.1 增加

// 或使用更亮的环境颜色
gl.uniform3f(u_ambientColor, 1.0, 1.0, 1.0);
```

### 失去立体感

```javascript
// 环境光过强会让物体看起来平面
// 保持环境光强度较低
gl.uniform1f(u_ambientIntensity, 0.05);  // 5% 通常足够
```

### 色彩不协调

```glsl
// 确保环境光颜色与场景协调
// 室外：冷色（蓝色调）
// 室内：暖色（黄色调）
```

## 本章小结

- 环境光模拟间接光照的简化近似
- 不依赖方向，均匀照亮所有表面
- 半球环境光考虑表面朝向
- AO 贴图存储局部遮蔽信息
- SSAO 在屏幕空间实时计算遮蔽
- 环境光强度通常保持较低（5-20%）
- 可以使用环境贴图获得更真实的效果

下一章，我们将学习漫反射光照。
