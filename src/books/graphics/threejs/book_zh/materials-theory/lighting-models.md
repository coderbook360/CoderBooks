# 光照模型原理

> "光照模型是渲染的灵魂，决定了物体如何与光线交互。"

## 光照模型分类

```
光照模型
├── 经验模型
│   ├── Lambert（漫反射）
│   ├── Phong（镜面反射）
│   └── Blinn-Phong（改进镜面）
├── 物理模型 (PBR)
│   ├── Cook-Torrance
│   ├── GGX/Trowbridge-Reitz
│   └── Disney Principled
└── 特殊模型
    ├── 次表面散射 (SSS)
    ├── 各向异性
    └── 透射/折射
```

## 光照基础

### 光照方程

```
L_o = L_e + ∫ f_r(ω_i, ω_o) L_i(ω_i) (n · ω_i) dω_i

其中：
- L_o: 出射光辐射度
- L_e: 自发光
- f_r: 双向反射分布函数 (BRDF)
- L_i: 入射光辐射度
- n · ω_i: 余弦衰减
```

### 光照组件

```
                    法线 (N)
                      ↑
                      │
    入射光 (L)   ←────┼────→   视线 (V)
        ↘            │           ↗
          ↘          │         ↗
            ↘        │       ↗
              ↘      │     ↗
                ═════════════
                   表面

反射光 = 环境光 + 漫反射 + 镜面反射
       = Ambient + Diffuse + Specular
```

## Lambert 漫反射

### 原理

漫反射假设光线在表面各方向均匀散射：

```typescript
// Lambert 漫反射公式
function lambertDiffuse(
  lightDir: Vector3,   // 光源方向
  normal: Vector3,     // 表面法线
  lightColor: Color,   // 光源颜色
  albedo: Color        // 表面颜色
): Color {
  // 余弦衰减
  const NdotL = Math.max(0, normal.dot(lightDir));
  
  // 漫反射 = 光源颜色 × 表面颜色 × cos(θ)
  return lightColor.clone()
    .multiply(albedo)
    .multiplyScalar(NdotL);
}
```

### GLSL 实现

```glsl
// Lambert 漫反射着色器
vec3 lambertDiffuse(vec3 L, vec3 N, vec3 lightColor, vec3 albedo) {
    float NdotL = max(dot(N, L), 0.0);
    return lightColor * albedo * NdotL;
}
```

## Phong 镜面反射

### 原理

Phong 模型使用反射向量计算高光：

```typescript
// Phong 镜面反射公式
function phongSpecular(
  lightDir: Vector3,   // 光源方向
  viewDir: Vector3,    // 视线方向
  normal: Vector3,     // 表面法线
  lightColor: Color,   // 光源颜色
  shininess: number    // 光泽度
): Color {
  // 计算反射向量
  // R = 2(N·L)N - L
  const reflectDir = normal.clone()
    .multiplyScalar(2 * normal.dot(lightDir))
    .sub(lightDir);
  
  // 镜面反射 = (R·V)^shininess
  const RdotV = Math.max(0, reflectDir.dot(viewDir));
  const specular = Math.pow(RdotV, shininess);
  
  return lightColor.clone().multiplyScalar(specular);
}
```

### GLSL 实现

```glsl
// Phong 镜面反射着色器
vec3 phongSpecular(vec3 L, vec3 V, vec3 N, vec3 lightColor, float shininess) {
    vec3 R = reflect(-L, N);
    float RdotV = max(dot(R, V), 0.0);
    float spec = pow(RdotV, shininess);
    return lightColor * spec;
}
```

## Blinn-Phong 模型

### 原理

Blinn-Phong 使用半程向量代替反射向量，更高效：

```
        法线 (N)
          ↑
          │   半程向量 (H)
          │  ↗
    L ────┼────→ V
          │
      ════════════
      
H = normalize(L + V)
```

```typescript
// Blinn-Phong 镜面反射
function blinnPhongSpecular(
  lightDir: Vector3,
  viewDir: Vector3,
  normal: Vector3,
  lightColor: Color,
  shininess: number
): Color {
  // 计算半程向量
  const halfDir = lightDir.clone().add(viewDir).normalize();
  
  // 镜面反射 = (N·H)^shininess
  const NdotH = Math.max(0, normal.dot(halfDir));
  const specular = Math.pow(NdotH, shininess);
  
  return lightColor.clone().multiplyScalar(specular);
}
```

### GLSL 实现

```glsl
// Blinn-Phong 着色器
vec3 blinnPhongSpecular(vec3 L, vec3 V, vec3 N, vec3 lightColor, float shininess) {
    vec3 H = normalize(L + V);
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, shininess);
    return lightColor * spec;
}

// 完整 Blinn-Phong 光照
vec3 blinnPhong(
    vec3 position,
    vec3 normal,
    vec3 lightPos,
    vec3 viewPos,
    vec3 lightColor,
    vec3 albedo,
    float shininess,
    float specularStrength
) {
    vec3 N = normalize(normal);
    vec3 L = normalize(lightPos - position);
    vec3 V = normalize(viewPos - position);
    
    // 漫反射
    vec3 diffuse = lambertDiffuse(L, N, lightColor, albedo);
    
    // 镜面反射
    vec3 specular = blinnPhongSpecular(L, V, N, lightColor, shininess) * specularStrength;
    
    return diffuse + specular;
}
```

## 光照衰减

### 距离衰减

```typescript
// 物理正确的平方反比衰减
function physicalAttenuation(distance: number): number {
  return 1 / (distance * distance);
}

// 平滑衰减（避免远处突然截断）
function smoothAttenuation(
  distance: number,
  maxDistance: number,
  decayExponent: number = 2
): number {
  // Three.js 风格衰减
  const distanceDecay = Math.pow(1 - Math.min(distance / maxDistance, 1), decayExponent);
  const inverseSquare = 1 / Math.max(distance * distance, 0.01);
  
  return distanceDecay * inverseSquare;
}
```

### GLSL 衰减

```glsl
// 点光源衰减
float getPointLightAttenuation(float distance, float maxDistance, float decay) {
    if (maxDistance > 0.0) {
        // 带最大距离的衰减
        float distanceFalloff = 1.0 - pow(distance / maxDistance, 4.0);
        distanceFalloff = max(distanceFalloff, 0.0);
        distanceFalloff *= distanceFalloff;
        
        return distanceFalloff / (distance * distance * decay);
    }
    
    // 纯物理衰减
    return 1.0 / (distance * distance * decay);
}

// 聚光灯衰减
float getSpotAttenuation(
    vec3 lightDir,
    vec3 spotDir,
    float coneCos,
    float penumbraCos
) {
    float angleCos = dot(lightDir, spotDir);
    
    if (angleCos > coneCos) {
        return smoothstep(coneCos, penumbraCos, angleCos);
    }
    
    return 0.0;
}
```

## 环境光照

### 常量环境光

```glsl
vec3 ambientLight(vec3 ambientColor, vec3 albedo) {
    return ambientColor * albedo;
}
```

### 半球光

```glsl
// 半球光照（天空/地面渐变）
vec3 hemisphereLight(
    vec3 normal,
    vec3 skyColor,
    vec3 groundColor,
    vec3 lightDirection
) {
    float weight = 0.5 * dot(normal, lightDirection) + 0.5;
    return mix(groundColor, skyColor, weight);
}
```

### 环境贴图

```glsl
// 漫反射辐照度
vec3 irradiance = texture(envIrradianceMap, normal).rgb;

// 镜面反射（预滤波 + BRDF LUT）
vec3 prefilteredColor = textureLod(envMap, R, roughness * maxMipLevel).rgb;
vec2 brdf = texture(brdfLUT, vec2(NdotV, roughness)).rg;
vec3 specular = prefilteredColor * (F0 * brdf.x + brdf.y);
```

## 模型对比

| 模型 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| Lambert | 简单、快速 | 无高光 | 哑光材质 |
| Phong | 高光明显 | 计算反射向量 | 塑料、陶瓷 |
| Blinn-Phong | 更高效 | 非物理 | 游戏、实时 |
| PBR | 物理正确 | 计算量大 | 高质量渲染 |

## Three.js 材质映射

```typescript
// Three.js 光照模型选择
MeshBasicMaterial    // 无光照
MeshLambertMaterial  // Lambert 漫反射
MeshPhongMaterial    // Blinn-Phong
MeshStandardMaterial // PBR (metallic-roughness)
MeshPhysicalMaterial // 高级 PBR
```

## 完整着色器示例

```glsl
// Blinn-Phong 片段着色器
#version 300 es
precision highp float;

uniform vec3 diffuse;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

uniform vec3 ambientLightColor;

struct DirectionalLight {
    vec3 direction;
    vec3 color;
};

uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];

in vec3 vNormal;
in vec3 vViewPosition;

out vec4 fragColor;

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewPosition);
    
    // 环境光
    vec3 finalColor = ambientLightColor * diffuse;
    
    // 方向光
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        vec3 L = normalize(directionalLights[i].direction);
        vec3 lightColor = directionalLights[i].color;
        
        // 漫反射
        float NdotL = max(dot(N, L), 0.0);
        finalColor += lightColor * diffuse * NdotL;
        
        // 镜面反射
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float spec = pow(NdotH, shininess);
        finalColor += lightColor * specular * spec;
    }
    
    fragColor = vec4(finalColor, opacity);
}
```

## 本章小结

- Lambert 模型计算漫反射
- Phong/Blinn-Phong 添加镜面高光
- 光照衰减影响光源覆盖范围
- 环境光提供全局照明
- Three.js 提供多种材质实现不同光照模型

下一章，我们将学习 PBR 渲染原理。
