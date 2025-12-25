# 光照数学基础

> "理解光照的数学原理是创造真实渲染效果的基础。"

## 光照模型概述

```
光照计算
├── 辐射度量学
│   ├── 辐射通量（Radiant Flux）
│   ├── 辐射强度（Radiant Intensity）
│   ├── 辐照度（Irradiance）
│   └── 辐射率（Radiance）
├── 光源类型
│   ├── 方向光
│   ├── 点光源
│   └── 聚光灯
├── 光照方程
│   └── 渲染方程
└── BRDF
    ├── 漫反射
    └── 镜面反射
```

## 辐射度量学

### 辐射通量 (Radiant Flux)

```
Φ (Phi) - 单位：瓦特 (W)
定义：单位时间内发射或接收的能量

光源发射的总能量

      ──────────────────
     /                  \
    /   Φ = dQ/dt        \
   /                      \
  └────────────────────────┘
          光源
```

### 辐射强度 (Radiant Intensity)

```
I = dΦ/dω - 单位：W/sr（瓦特/球面度）

从光源出发，在给定方向上的能量密度

           ω (立体角)
          /
         /
    ◯───/──────────→
   光源   I = Φ / 4π（点光源）
```

### 辐照度 (Irradiance)

```
E = dΦ/dA - 单位：W/m²

表面单位面积接收的能量

    光线
      ↘
       ↘   θ
        ↘ ∠
    ─────────── 表面
         A

E = (Φ/A) × cos(θ)
```

### 辐射率 (Radiance)

```
L = d²Φ/(dA × dω × cos(θ)) - 单位：W/(m²·sr)

从表面单位面积、单位立体角发出的能量

这是渲染方程中最重要的量

         ω
        /
       /θ
    ──●────── 表面
     dA

L(p, ω) = 位置 p，方向 ω 的辐射率
```

## 渲染方程

```
Lo(p, ωo) = Le(p, ωo) + ∫[Ω] fr(p, ωi, ωo) × Li(p, ωi) × (n·ωi) dωi

其中：
Lo = 出射辐射率
Le = 自发光
fr = BRDF
Li = 入射辐射率
n·ωi = cos(θi)
Ω = 半球

        ωo (出射)
          ↑
          │
    ωi ↘  │  ↙ ωi
       ↘ │ ↙
        ↘│↙
    ──────●────── 表面
          p
          ↑
          n (法线)
```

### TypeScript 实现

```typescript
// 渲染方程的离散近似
interface LightSample {
  direction: Vector3;
  color: Color;
  intensity: number;
}

function computeOutgoingRadiance(
  position: Vector3,
  normal: Vector3,
  viewDir: Vector3,
  material: Material,
  lights: LightSample[]
): Color {
  const Lo = new Color(0, 0, 0);
  
  // 自发光
  if (material.emissive) {
    Lo.add(material.emissive);
  }
  
  // 积分每个光源的贡献
  for (const light of lights) {
    const L = light.direction;
    const NdotL = Math.max(normal.dot(L), 0);
    
    if (NdotL > 0) {
      // BRDF
      const brdf = evaluateBRDF(material, normal, viewDir, L);
      
      // Li × BRDF × cos(θ)
      const contribution = new Color()
        .copy(light.color)
        .multiplyScalar(light.intensity * NdotL);
      contribution.multiply(brdf);
      
      Lo.add(contribution);
    }
  }
  
  return Lo;
}
```

## BRDF (双向反射分布函数)

### 定义

```
fr(ωi, ωo) = dLo(ωo) / dE(ωi)

BRDF 描述光线如何从入射方向反射到出射方向

性质：
1. 正值性：fr >= 0
2. 互易性：fr(ωi, ωo) = fr(ωo, ωi)
3. 能量守恒：∫ fr × cos(θo) dωo <= 1
```

### Lambert BRDF

```typescript
// 理想漫反射
function lambertBRDF(albedo: Color): Color {
  // fr = albedo / π
  return albedo.clone().multiplyScalar(1 / Math.PI);
}
```

```glsl
// GLSL 实现
vec3 BRDF_Lambert(vec3 albedo) {
    return albedo / PI;
}
```

### Blinn-Phong BRDF

```typescript
// 经验模型
function blinnPhongBRDF(
  normal: Vector3,
  viewDir: Vector3,
  lightDir: Vector3,
  specular: Color,
  shininess: number
): Color {
  const halfDir = viewDir.clone().add(lightDir).normalize();
  const NdotH = Math.max(normal.dot(halfDir), 0);
  
  // (n+2)/(2π) × (N·H)^n
  const normalization = (shininess + 2) / (2 * Math.PI);
  const spec = normalization * Math.pow(NdotH, shininess);
  
  return specular.clone().multiplyScalar(spec);
}
```

```glsl
// GLSL 实现
vec3 BRDF_BlinnPhong(vec3 N, vec3 V, vec3 L, vec3 specular, float shininess) {
    vec3 H = normalize(V + L);
    float NdotH = max(dot(N, H), 0.0);
    
    float normalization = (shininess + 2.0) / (2.0 * PI);
    float spec = normalization * pow(NdotH, shininess);
    
    return specular * spec;
}
```

## Cook-Torrance BRDF

```
fr = kd × fLambert + ks × fCookTorrance

fCookTorrance = D × F × G / (4 × (N·V) × (N·L))

D = 法线分布函数 (NDF)
F = 菲涅尔项
G = 几何遮蔽项
```

### GGX 法线分布

```typescript
// Trowbridge-Reitz GGX
function D_GGX(NdotH: number, roughness: number): number {
  const a = roughness * roughness;
  const a2 = a * a;
  const NdotH2 = NdotH * NdotH;
  
  const denom = NdotH2 * (a2 - 1) + 1;
  return a2 / (Math.PI * denom * denom);
}
```

```glsl
// GLSL 实现
float D_GGX(float NdotH, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH2 = NdotH * NdotH;
    
    float denom = NdotH2 * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}
```

### Schlick 菲涅尔

```typescript
// Schlick 近似
function F_Schlick(VdotH: number, F0: Color): Color {
  const fresnel = Math.pow(1 - VdotH, 5);
  return F0.clone().lerp(new Color(1, 1, 1), fresnel);
}
```

```glsl
// GLSL 实现
vec3 F_Schlick(float VdotH, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
}
```

### Smith 几何函数

```typescript
// Smith GGX
function G_Smith(NdotV: number, NdotL: number, roughness: number): number {
  const a = roughness * roughness;
  const k = a / 2;
  
  const ggx1 = NdotV / (NdotV * (1 - k) + k);
  const ggx2 = NdotL / (NdotL * (1 - k) + k);
  
  return ggx1 * ggx2;
}
```

```glsl
// GLSL 实现
float G_SchlickGGX(float NdotX, float k) {
    return NdotX / (NdotX * (1.0 - k) + k);
}

float G_Smith(float NdotV, float NdotL, float roughness) {
    float a = roughness * roughness;
    float k = a / 2.0;
    return G_SchlickGGX(NdotV, k) * G_SchlickGGX(NdotL, k);
}
```

## 完整 PBR BRDF

```glsl
// 完整的 Cook-Torrance BRDF
vec3 BRDF_CookTorrance(
    vec3 N, vec3 V, vec3 L,
    vec3 albedo, float metalness, float roughness
) {
    vec3 H = normalize(V + L);
    
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float VdotH = max(dot(V, H), 0.0);
    
    // F0：金属使用 albedo，非金属使用 0.04
    vec3 F0 = mix(vec3(0.04), albedo, metalness);
    
    // 镜面 BRDF
    float D = D_GGX(NdotH, roughness);
    vec3 F = F_Schlick(VdotH, F0);
    float G = G_Smith(NdotV, NdotL, roughness);
    
    vec3 specular = D * F * G / max(4.0 * NdotV * NdotL, 0.001);
    
    // 漫反射 BRDF（金属无漫反射）
    vec3 kS = F;
    vec3 kD = (1.0 - kS) * (1.0 - metalness);
    vec3 diffuse = kD * albedo / PI;
    
    return diffuse + specular;
}
```

## 光源衰减

### 平方反比衰减

```
物理正确的衰减：
I = I₀ / d²

       I₀
    ◯──────→ d ──────→ 接收点
   光源              I = I₀/d²
```

### 窗口函数衰减

```typescript
// 带截断的衰减函数
function getDistanceAttenuation(
  distance: number,
  cutoffDistance: number,
  decayExponent: number
): number {
  if (cutoffDistance > 0 && decayExponent > 0) {
    // 平滑截断
    const distanceFalloff = 1 / Math.pow(distance, decayExponent);
    const cutoff = Math.pow(1 - Math.pow(distance / cutoffDistance, 4), 2);
    return distanceFalloff * Math.max(cutoff, 0);
  }
  return 1;
}
```

```glsl
// GLSL 实现
float getDistanceAttenuation(float d, float cutoff, float decay) {
    if (cutoff > 0.0 && decay > 0.0) {
        float distFalloff = 1.0 / pow(d, decay);
        float cutoffFalloff = pow(saturate(1.0 - pow(d / cutoff, 4.0)), 2.0);
        return distFalloff * cutoffFalloff;
    }
    return 1.0;
}
```

### 聚光灯衰减

```
        光源
          │
          │ direction
          ▼
         ╱│╲
        ╱ │ ╲
       ╱  │  ╲  coneCos (外锥角)
      ╱───│───╲ penumbraCos (内锥角)
     ╱    │    ╲
    ╱     │     ╲
   ╱      ●      ╲  angleCos = dot(L, direction)
  ─────────────────

衰减 = smoothstep(coneCos, penumbraCos, angleCos)
```

```glsl
// GLSL 实现
float getSpotAttenuation(float coneCos, float penumbraCos, float angleCos) {
    return smoothstep(coneCos, penumbraCos, angleCos);
}
```

## 半球采样

```typescript
// 余弦加权半球采样
function cosineSampleHemisphere(u1: number, u2: number): Vector3 {
  const r = Math.sqrt(u1);
  const theta = 2 * Math.PI * u2;
  
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const z = Math.sqrt(1 - u1);
  
  return new Vector3(x, y, z);
}

// 概率密度函数
function cosinePDF(cosTheta: number): number {
  return cosTheta / Math.PI;
}
```

## 本章小结

- 辐射度量学定义光能量的测量
- 渲染方程是所有光照计算的理论基础
- BRDF 描述表面的反射特性
- Lambert BRDF 用于漫反射
- Cook-Torrance BRDF 用于 PBR
- 光源衰减影响光照范围

下一章，我们将学习阴影技术。
