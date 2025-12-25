# MeshStandardMaterial PBR 材质

> "PBR 材质基于物理的渲染原理，使用金属度-粗糙度工作流创造真实的材质表现。"

## PBR 材质特点

```
MeshStandardMaterial
├── 基于物理的参数
│   ├── metalness（金属度）
│   └── roughness（粗糙度）
├── Cook-Torrance BRDF
│   ├── 漫反射（Lambert）
│   ├── 镜面反射（GGX）
│   └── 菲涅尔效应（Schlick）
├── 能量守恒
├── IBL 支持
│   ├── 环境光照
│   └── 反射探针
└── 真实感渲染
```

## 完整实现

```typescript
// src/materials/MeshStandardMaterial.ts
import { Material, MaterialParameters } from './Material';
import { Color, ColorRepresentation } from '../math/Color';
import { Texture } from '../textures/Texture';
import { Vector2 } from '../math/Vector2';
import { TangentSpaceNormalMap, NormalMapType } from '../constants';

export interface MeshStandardMaterialParameters extends MaterialParameters {
  color?: ColorRepresentation;
  roughness?: number;
  metalness?: number;
  map?: Texture | null;
  lightMap?: Texture | null;
  lightMapIntensity?: number;
  aoMap?: Texture | null;
  aoMapIntensity?: number;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  emissiveMap?: Texture | null;
  bumpMap?: Texture | null;
  bumpScale?: number;
  normalMap?: Texture | null;
  normalMapType?: NormalMapType;
  normalScale?: Vector2;
  displacementMap?: Texture | null;
  displacementScale?: number;
  displacementBias?: number;
  roughnessMap?: Texture | null;
  metalnessMap?: Texture | null;
  alphaMap?: Texture | null;
  envMap?: Texture | null;
  envMapIntensity?: number;
  wireframe?: boolean;
  flatShading?: boolean;
  fog?: boolean;
}

export class MeshStandardMaterial extends Material {
  readonly isMeshStandardMaterial = true;
  readonly type = 'MeshStandardMaterial';
  
  // 定义 shader
  defines = {
    'STANDARD': '',
  };
  
  // 基础颜色
  color = new Color(0xffffff);
  
  // PBR 参数
  roughness = 1;
  metalness = 0;
  
  // 纹理贴图
  map: Texture | null = null;
  
  // 光照贴图
  lightMap: Texture | null = null;
  lightMapIntensity = 1;
  
  // AO 贴图
  aoMap: Texture | null = null;
  aoMapIntensity = 1;
  
  // 自发光
  emissive = new Color(0x000000);
  emissiveIntensity = 1;
  emissiveMap: Texture | null = null;
  
  // 凹凸贴图
  bumpMap: Texture | null = null;
  bumpScale = 1;
  
  // 法线贴图
  normalMap: Texture | null = null;
  normalMapType: NormalMapType = TangentSpaceNormalMap;
  normalScale = new Vector2(1, 1);
  
  // 置换贴图
  displacementMap: Texture | null = null;
  displacementScale = 1;
  displacementBias = 0;
  
  // PBR 贴图
  roughnessMap: Texture | null = null;
  metalnessMap: Texture | null = null;
  
  // Alpha 贴图
  alphaMap: Texture | null = null;
  
  // 环境贴图
  envMap: Texture | null = null;
  envMapIntensity = 1;
  
  // 渲染选项
  wireframe = false;
  wireframeLinewidth = 1;
  flatShading = false;
  fog = true;
  
  constructor(parameters?: MeshStandardMaterialParameters) {
    super();
    this.setValues(parameters);
  }
  
  copy(source: MeshStandardMaterial): this {
    super.copy(source);
    
    this.defines = { 'STANDARD': '' };
    
    this.color.copy(source.color);
    
    this.roughness = source.roughness;
    this.metalness = source.metalness;
    
    this.map = source.map;
    
    this.lightMap = source.lightMap;
    this.lightMapIntensity = source.lightMapIntensity;
    
    this.aoMap = source.aoMap;
    this.aoMapIntensity = source.aoMapIntensity;
    
    this.emissive.copy(source.emissive);
    this.emissiveIntensity = source.emissiveIntensity;
    this.emissiveMap = source.emissiveMap;
    
    this.bumpMap = source.bumpMap;
    this.bumpScale = source.bumpScale;
    
    this.normalMap = source.normalMap;
    this.normalMapType = source.normalMapType;
    this.normalScale.copy(source.normalScale);
    
    this.displacementMap = source.displacementMap;
    this.displacementScale = source.displacementScale;
    this.displacementBias = source.displacementBias;
    
    this.roughnessMap = source.roughnessMap;
    this.metalnessMap = source.metalnessMap;
    
    this.alphaMap = source.alphaMap;
    
    this.envMap = source.envMap;
    this.envMapIntensity = source.envMapIntensity;
    
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;
    
    this.flatShading = source.flatShading;
    
    this.fog = source.fog;
    
    return this;
  }
}
```

## PBR 着色器

### 顶点着色器

```glsl
// meshstandard_vert.glsl
#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uv;

#ifdef USE_TANGENT
in vec4 tangent;
#endif

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

out vec3 vNormal;
out vec3 vViewPosition;
out vec2 vUv;
out vec3 vWorldPosition;

#ifdef USE_TANGENT
out vec3 vTangent;
out vec3 vBitangent;
#endif

void main() {
    // 法线变换
    vNormal = normalize(normalMatrix * normal);
    
    #ifdef USE_TANGENT
    vTangent = normalize(normalMatrix * tangent.xyz);
    vBitangent = normalize(cross(vNormal, vTangent) * tangent.w);
    #endif
    
    // 位置
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    vUv = uv;
    
    gl_Position = projectionMatrix * mvPosition;
}
```

### 片段着色器

```glsl
// meshstandard_frag.glsl
#version 300 es
precision highp float;

// 材质参数
uniform vec3 diffuse;
uniform float roughness;
uniform float metalness;
uniform vec3 emissive;
uniform float emissiveIntensity;
uniform float opacity;

// 环境
uniform float envMapIntensity;
uniform vec3 cameraPosition;

// 光照
#define MAX_DIR_LIGHTS 4
#define MAX_POINT_LIGHTS 4

struct DirectionalLight {
    vec3 direction;
    vec3 color;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
};

uniform DirectionalLight directionalLights[MAX_DIR_LIGHTS];
uniform PointLight pointLights[MAX_POINT_LIGHTS];
uniform vec3 ambientLightColor;
uniform int numDirectionalLights;
uniform int numPointLights;

// 纹理
#ifdef USE_MAP
uniform sampler2D map;
#endif

#ifdef USE_ROUGHNESSMAP
uniform sampler2D roughnessMap;
#endif

#ifdef USE_METALNESSMAP
uniform sampler2D metalnessMap;
#endif

#ifdef USE_NORMALMAP
uniform sampler2D normalMap;
uniform vec2 normalScale;
#endif

#ifdef USE_ENVMAP
uniform samplerCube envMap;
#endif

#ifdef USE_EMISSIVEMAP
uniform sampler2D emissiveMap;
#endif

#ifdef USE_AOMAP
uniform sampler2D aoMap;
uniform float aoMapIntensity;
#endif

// 输入
in vec3 vNormal;
in vec3 vViewPosition;
in vec2 vUv;
in vec3 vWorldPosition;

#ifdef USE_TANGENT
in vec3 vTangent;
in vec3 vBitangent;
#endif

out vec4 fragColor;

// 常量
const float PI = 3.14159265359;
const float MIN_ROUGHNESS = 0.04;

// GGX/Trowbridge-Reitz NDF
float D_GGX(float NdotH, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH2 = NdotH * NdotH;
    
    float denom = NdotH2 * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

// Smith GGX 几何函数
float G_Smith(float NdotV, float NdotL, float roughness) {
    float a = roughness * roughness;
    float k = a / 2.0;
    
    float ggx1 = NdotV / (NdotV * (1.0 - k) + k);
    float ggx2 = NdotL / (NdotL * (1.0 - k) + k);
    
    return ggx1 * ggx2;
}

// Schlick 菲涅尔
vec3 F_Schlick(float VdotH, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
}

// 带粗糙度的菲涅尔
vec3 F_SchlickRoughness(float NdotV, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - NdotV, 5.0);
}

// Cook-Torrance BRDF
vec3 BRDF_Specular_GGX(
    vec3 N, vec3 V, vec3 L,
    vec3 F0, float roughness
) {
    vec3 H = normalize(V + L);
    
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float VdotH = max(dot(V, H), 0.0);
    
    // D
    float D = D_GGX(NdotH, roughness);
    
    // G
    float G = G_Smith(NdotV, NdotL, roughness);
    
    // F
    vec3 F = F_Schlick(VdotH, F0);
    
    // Cook-Torrance
    vec3 numerator = D * G * F;
    float denominator = 4.0 * NdotV * NdotL + 0.0001;
    
    return numerator / denominator;
}

// 距离衰减
float getDistanceAttenuation(float lightDistance, float cutoffDistance, float decay) {
    if (cutoffDistance > 0.0 && decay > 0.0) {
        float d = max(pow(lightDistance, decay), 0.01);
        float c = 1.0 - pow(lightDistance / cutoffDistance, 4.0);
        return (1.0 / d) * max(c, 0.0) * max(c, 0.0);
    }
    return 1.0;
}

// 获取法线
vec3 getNormal() {
    vec3 N = normalize(vNormal);
    
    #ifdef USE_NORMALMAP
    vec3 mapN = texture(normalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;
    
    #ifdef USE_TANGENT
    mat3 TBN = mat3(normalize(vTangent), normalize(vBitangent), N);
    #else
    vec3 q0 = dFdx(vWorldPosition);
    vec3 q1 = dFdy(vWorldPosition);
    vec2 st0 = dFdx(vUv);
    vec2 st1 = dFdy(vUv);
    vec3 T = normalize(q0 * st1.t - q1 * st0.t);
    vec3 B = normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);
    #endif
    
    N = normalize(TBN * mapN);
    #endif
    
    return N;
}

// IBL 漫反射
vec3 getIBLIrradiance(vec3 N) {
    // 简化实现，实际应使用预计算的漫反射辐照度图
    #ifdef USE_ENVMAP
    return texture(envMap, N).rgb * ambientLightColor;
    #else
    return ambientLightColor;
    #endif
}

// IBL 镜面反射
vec3 getIBLRadiance(vec3 R, float roughness) {
    #ifdef USE_ENVMAP
    // 简化实现，实际应使用预过滤的环境贴图
    float mip = roughness * 5.0; // 模拟 mipmap
    return textureLod(envMap, R, mip).rgb * envMapIntensity;
    #else
    return vec3(0.0);
    #endif
}

void main() {
    // 基础颜色
    vec4 diffuseColor = vec4(diffuse, opacity);
    
    #ifdef USE_MAP
    vec4 texelColor = texture(map, vUv);
    diffuseColor *= texelColor;
    #endif
    
    // PBR 参数
    float roughnessFactor = roughness;
    float metalnessFactor = metalness;
    
    #ifdef USE_ROUGHNESSMAP
    roughnessFactor *= texture(roughnessMap, vUv).g;
    #endif
    
    #ifdef USE_METALNESSMAP
    metalnessFactor *= texture(metalnessMap, vUv).b;
    #endif
    
    roughnessFactor = max(roughnessFactor, MIN_ROUGHNESS);
    
    // F0（金属使用 albedo，非金属使用 0.04）
    vec3 F0 = mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);
    
    // 漫反射颜色（金属无漫反射）
    vec3 albedo = diffuseColor.rgb * (1.0 - metalnessFactor);
    
    // 法线和视线
    vec3 N = getNormal();
    vec3 V = normalize(cameraPosition - vWorldPosition);
    float NdotV = max(dot(N, V), 0.0);
    
    // 直接光照
    vec3 Lo = vec3(0.0);
    
    // 方向光
    for (int i = 0; i < MAX_DIR_LIGHTS; i++) {
        if (i >= numDirectionalLights) break;
        
        vec3 L = directionalLights[i].direction;
        vec3 radiance = directionalLights[i].color;
        
        float NdotL = max(dot(N, L), 0.0);
        
        // 漫反射
        vec3 diffuseBRDF = albedo / PI;
        
        // 镜面反射
        vec3 specularBRDF = BRDF_Specular_GGX(N, V, L, F0, roughnessFactor);
        
        // 菲涅尔
        vec3 H = normalize(V + L);
        float VdotH = max(dot(V, H), 0.0);
        vec3 F = F_Schlick(VdotH, F0);
        
        // 能量守恒
        vec3 kD = (1.0 - F) * (1.0 - metalnessFactor);
        
        Lo += (kD * diffuseBRDF + specularBRDF) * radiance * NdotL;
    }
    
    // 点光源
    for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
        if (i >= numPointLights) break;
        
        vec3 lightVector = pointLights[i].position - vWorldPosition;
        float lightDistance = length(lightVector);
        vec3 L = normalize(lightVector);
        
        float attenuation = getDistanceAttenuation(
            lightDistance,
            pointLights[i].distance,
            pointLights[i].decay
        );
        
        vec3 radiance = pointLights[i].color * attenuation;
        
        float NdotL = max(dot(N, L), 0.0);
        
        vec3 diffuseBRDF = albedo / PI;
        vec3 specularBRDF = BRDF_Specular_GGX(N, V, L, F0, roughnessFactor);
        
        vec3 H = normalize(V + L);
        float VdotH = max(dot(V, H), 0.0);
        vec3 F = F_Schlick(VdotH, F0);
        vec3 kD = (1.0 - F) * (1.0 - metalnessFactor);
        
        Lo += (kD * diffuseBRDF + specularBRDF) * radiance * NdotL;
    }
    
    // IBL（间接光照）
    vec3 F_ibl = F_SchlickRoughness(NdotV, F0, roughnessFactor);
    vec3 kD_ibl = (1.0 - F_ibl) * (1.0 - metalnessFactor);
    
    // 漫反射 IBL
    vec3 irradiance = getIBLIrradiance(N);
    vec3 diffuseIBL = kD_ibl * albedo * irradiance;
    
    // 镜面 IBL
    vec3 R = reflect(-V, N);
    vec3 radiance = getIBLRadiance(R, roughnessFactor);
    vec3 specularIBL = F_ibl * radiance;
    
    vec3 ambient = diffuseIBL + specularIBL;
    
    // AO
    #ifdef USE_AOMAP
    float ao = (texture(aoMap, vUv).r - 1.0) * aoMapIntensity + 1.0;
    ambient *= ao;
    Lo *= ao;
    #endif
    
    // 自发光
    vec3 totalEmissive = emissive * emissiveIntensity;
    #ifdef USE_EMISSIVEMAP
    totalEmissive *= texture(emissiveMap, vUv).rgb;
    #endif
    
    // 最终颜色
    vec3 color = ambient + Lo + totalEmissive;
    
    fragColor = vec4(color, diffuseColor.a);
}
```

## 使用示例

### 基本用法

```typescript
// 基础 PBR 材质
const standardMaterial = new MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.5,
});

// 完全金属
const metal = new MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.2,
  metalness: 1.0,
});

// 粗糙塑料
const plastic = new MeshStandardMaterial({
  color: 0xff0000,
  roughness: 0.8,
  metalness: 0.0,
});
```

### 贴图工作流

```typescript
// 完整 PBR 贴图
const loader = new TextureLoader();

const pbrMaterial = new MeshStandardMaterial({
  map: loader.load('/textures/metal_basecolor.jpg'),
  normalMap: loader.load('/textures/metal_normal.jpg'),
  roughnessMap: loader.load('/textures/metal_roughness.jpg'),
  metalnessMap: loader.load('/textures/metal_metalness.jpg'),
  aoMap: loader.load('/textures/metal_ao.jpg'),
  envMap: cubeTexture,
  envMapIntensity: 1.0,
});

// 需要第二套 UV 给 AO 贴图
geometry.setAttribute('uv2', geometry.attributes.uv);
```

### 材质参数可视化

```typescript
// 创建材质参数对比
const rows = 5;
const cols = 5;

for (let i = 0; i < rows; i++) {
  for (let j = 0; j < cols; j++) {
    const roughness = i / (rows - 1);
    const metalness = j / (cols - 1);
    
    const material = new MeshStandardMaterial({
      color: 0xffffff,
      roughness,
      metalness,
    });
    
    const sphere = new Mesh(
      new SphereGeometry(0.4, 32, 32),
      material
    );
    
    sphere.position.set(
      (j - (cols - 1) / 2) * 1,
      (i - (rows - 1) / 2) * 1,
      0
    );
    
    scene.add(sphere);
  }
}
```

### 环境贴图

```typescript
// HDR 环境贴图
const pmremGenerator = new PMREMGenerator(renderer);
const hdriLoader = new RGBELoader();

hdriLoader.load('/hdri/studio.hdr', (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  
  scene.environment = envMap;
  
  material.envMap = envMap;
  material.envMapIntensity = 1.0;
  material.needsUpdate = true;
  
  texture.dispose();
  pmremGenerator.dispose();
});
```

## 金属度-粗糙度工作流

```
               粗糙度（Roughness）
               0.0 ─────────────────── 1.0
               镜面              哑光
         ┌─────────────────────────────────┐
    1.0  │  抛光金属    →    磨砂金属      │
    │    │                                 │
金  │    │                                 │
属  │    │                                 │
度  │    │                                 │
    │    │                                 │
    0.0  │  光滑塑料    →    粗糙塑料      │
         └─────────────────────────────────┘
```

## 本章小结

- MeshStandardMaterial 实现 PBR 金属度-粗糙度工作流
- 使用 Cook-Torrance BRDF 进行高质量光照计算
- 支持 IBL 环境光照
- metalness 控制金属/非金属
- roughness 控制表面光滑程度
- 能量守恒确保物理正确性

下一章，我们将学习 MeshPhysicalMaterial 高级 PBR 材质。
