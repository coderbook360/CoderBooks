# PBR 渲染原理

> "基于物理的渲染让虚拟世界与真实世界的光照行为一致。"

## PBR 基础概念

```
PBR (Physically Based Rendering)
├── 核心原则
│   ├── 能量守恒
│   ├── 微表面理论
│   └── 菲涅尔效应
├── 参数模型
│   ├── Metallic-Roughness
│   └── Specular-Glossiness
└── 组件
    ├── BRDF (双向反射分布函数)
    ├── 法线分布函数 (NDF)
    ├── 几何遮蔽函数 (G)
    └── 菲涅尔方程 (F)
```

## 微表面理论

### 概念

物体表面由无数微小镜面组成，每个微表面有自己的法线：

```
    粗糙表面                  光滑表面
        ∧∧∧∧                    ────────
       /  \/  \                     │
      /    \   \                    │
                                    │
  微表面法线混乱              微表面法线一致
  → 散射光线                  → 集中反射
```

### 半程向量

```
        N (宏观法线)
        ↑
        │   H (半程向量)
        │  ↗   m (微表面法线)
        │ ↗   ↗
    L ←─┼──→ V
        │
    ════════════

H = normalize(L + V)

只有 m = H 的微表面才会将 L 反射到 V 方向
```

## Cook-Torrance BRDF

### 公式

```
f_r = f_diffuse + f_specular

f_diffuse = c_diff / π

f_specular = D(h) × F(v,h) × G(l,v,h)
             ─────────────────────────
                 4(n·l)(n·v)

其中：
- D: 法线分布函数 (Normal Distribution Function)
- F: 菲涅尔方程 (Fresnel)
- G: 几何遮蔽函数 (Geometry)
```

### TypeScript 实现

```typescript
// Cook-Torrance BRDF
function cookTorranceBRDF(
  N: Vector3,        // 法线
  V: Vector3,        // 视线方向
  L: Vector3,        // 光源方向
  albedo: Color,     // 基础颜色
  metallic: number,  // 金属度
  roughness: number  // 粗糙度
): Color {
  const H = L.clone().add(V).normalize();
  
  const NdotL = Math.max(N.dot(L), 0.001);
  const NdotV = Math.max(N.dot(V), 0.001);
  const NdotH = Math.max(N.dot(H), 0.001);
  const VdotH = Math.max(V.dot(H), 0.001);
  
  // F0: 基础反射率
  // 非金属 ~0.04, 金属取 albedo
  const F0 = new Color(0.04, 0.04, 0.04).lerp(albedo, metallic);
  
  // D: GGX 法线分布
  const D = distributionGGX(NdotH, roughness);
  
  // F: Schlick 菲涅尔
  const F = fresnelSchlick(VdotH, F0);
  
  // G: Smith 几何遮蔽
  const G = geometrySmith(NdotV, NdotL, roughness);
  
  // 镜面反射
  const numerator = D * G;
  const denominator = 4 * NdotV * NdotL;
  const specular = F.clone().multiplyScalar(numerator / denominator);
  
  // 漫反射（金属无漫反射）
  const kD = new Color(1, 1, 1).sub(F).multiplyScalar(1 - metallic);
  const diffuse = kD.multiply(albedo).multiplyScalar(1 / Math.PI);
  
  return diffuse.add(specular).multiplyScalar(NdotL);
}
```

## 法线分布函数 (NDF)

### GGX/Trowbridge-Reitz

```typescript
// GGX 法线分布
function distributionGGX(NdotH: number, roughness: number): number {
  const a = roughness * roughness;
  const a2 = a * a;
  
  const NdotH2 = NdotH * NdotH;
  
  const numerator = a2;
  const denominator = NdotH2 * (a2 - 1) + 1;
  
  return numerator / (Math.PI * denominator * denominator);
}
```

### GLSL 实现

```glsl
// GGX 法线分布函数
float distributionGGX(float NdotH, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH2 = NdotH * NdotH;
    
    float num = a2;
    float denom = NdotH2 * (a2 - 1.0) + 1.0;
    denom = PI * denom * denom;
    
    return num / denom;
}
```

### 粗糙度对 NDF 的影响

```
roughness = 0.1         roughness = 0.5         roughness = 0.9
     ╭─╮                    ╭───╮                  ╭───────╮
    ╱   ╲                  ╱     ╲                ╱         ╲
   │     │                ╱       ╲              ╱           ╲
  ╱       ╲              ╱         ╲            ╱             ╲
 ╱         ╲            ╱           ╲          ╱               ╲
────────────          ────────────────      ──────────────────────
  尖锐高光              中等散射              宽泛散射
```

## 菲涅尔方程

### Schlick 近似

```typescript
// Schlick 菲涅尔近似
function fresnelSchlick(cosTheta: number, F0: Color): Color {
  const factor = Math.pow(1 - cosTheta, 5);
  return F0.clone().add(
    new Color(1, 1, 1).sub(F0).multiplyScalar(factor)
  );
}

// 带粗糙度的菲涅尔（用于 IBL）
function fresnelSchlickRoughness(cosTheta: number, F0: Color, roughness: number): Color {
  const factor = Math.pow(1 - cosTheta, 5);
  const maxF = new Color(1 - roughness, 1 - roughness, 1 - roughness);
  const F0Inv = maxF.clone().sub(F0);
  
  return F0.clone().add(F0Inv.multiplyScalar(factor));
}
```

### GLSL 实现

```glsl
// Schlick 菲涅尔
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// 菲涅尔效应示意
//
// 视角正对      视角掠射
//    │            ╲
//    ↓             ╲
// ───────        ───────
// 低反射率      高反射率
// (F ≈ F0)      (F ≈ 1.0)
```

## 几何遮蔽函数

### Smith GGX

```typescript
// Smith 几何函数
function geometrySmith(NdotV: number, NdotL: number, roughness: number): number {
  const ggx1 = geometrySchlickGGX(NdotV, roughness);
  const ggx2 = geometrySchlickGGX(NdotL, roughness);
  
  return ggx1 * ggx2;
}

// Schlick-GGX 单向几何函数
function geometrySchlickGGX(NdotX: number, roughness: number): number {
  const r = roughness + 1;
  const k = (r * r) / 8; // 直接光照的 k
  
  const numerator = NdotX;
  const denominator = NdotX * (1 - k) + k;
  
  return numerator / denominator;
}
```

### GLSL 实现

```glsl
float geometrySchlickGGX(float NdotV, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    
    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    
    return nom / denom;
}

float geometrySmith(float NdotV, float NdotL, float roughness) {
    float ggx1 = geometrySchlickGGX(NdotV, roughness);
    float ggx2 = geometrySchlickGGX(NdotL, roughness);
    
    return ggx1 * ggx2;
}
```

### 几何遮蔽示意

```
微表面自遮蔽 (Shadowing)      微表面自遮蔽 (Masking)

    光线 →                          → 视线
         ╲                         ╱
          ╲ 被遮挡                被遮挡 ╱
           ╲ ↓                      ↓ ╱
     ╱╲╱╲╱╲╱╲╱╲               ╱╲╱╲╱╲╱╲╱╲
     微表面轮廓                 微表面轮廓
```

## 完整 PBR 着色器

```glsl
#version 300 es
precision highp float;

#define PI 3.141592653589793

// Uniforms
uniform vec3 albedo;
uniform float metallic;
uniform float roughness;
uniform float ao;

uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];

uniform vec3 camPos;

// Inputs
in vec3 vWorldPos;
in vec3 vNormal;

// Output
out vec4 fragColor;

// PBR 函数
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    
    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    
    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    
    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    
    return num / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    
    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(camPos - vWorldPos);
    
    // F0: 基础反射率
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);
    
    // 累积光照
    vec3 Lo = vec3(0.0);
    
    for (int i = 0; i < 4; i++) {
        // 光源计算
        vec3 L = normalize(lightPositions[i] - vWorldPos);
        vec3 H = normalize(V + L);
        float distance = length(lightPositions[i] - vWorldPos);
        float attenuation = 1.0 / (distance * distance);
        vec3 radiance = lightColors[i] * attenuation;
        
        // Cook-Torrance BRDF
        float NDF = DistributionGGX(N, H, roughness);
        float G = GeometrySmith(N, V, L, roughness);
        vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
        
        vec3 numerator = NDF * G * F;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        vec3 specular = numerator / denominator;
        
        // 能量守恒
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic; // 金属无漫反射
        
        // 最终光照
        float NdotL = max(dot(N, L), 0.0);
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
    }
    
    // 环境光
    vec3 ambient = vec3(0.03) * albedo * ao;
    
    vec3 color = ambient + Lo;
    
    // HDR 色调映射
    color = color / (color + vec3(1.0));
    
    // Gamma 校正
    color = pow(color, vec3(1.0 / 2.2));
    
    fragColor = vec4(color, 1.0);
}
```

## 能量守恒

```
入射光能量 = 反射光能量 + 吸收能量 + 透射能量

对于不透明物体:
kS + kD ≤ 1.0

其中:
- kS: 镜面反射比例 (由菲涅尔 F 决定)
- kD: 漫反射比例 = 1 - kS
- 金属: kD = 0 (无漫反射)
```

## Metallic-Roughness 工作流

| 参数 | 范围 | 含义 |
|------|------|------|
| Albedo | RGB [0,1] | 基础颜色 |
| Metallic | [0,1] | 金属度 |
| Roughness | [0,1] | 粗糙度 |
| AO | [0,1] | 环境遮蔽 |
| Normal | RGB | 法线贴图 |

## 本章小结

- PBR 基于微表面理论和能量守恒
- Cook-Torrance BRDF 由 D、F、G 三部分组成
- GGX 是最常用的法线分布函数
- Schlick 近似简化菲涅尔计算
- Smith GGX 处理几何遮蔽
- Metallic-Roughness 是主流 PBR 工作流

下一章，我们将学习材质系统设计。
