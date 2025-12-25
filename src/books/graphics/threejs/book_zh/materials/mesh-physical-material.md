# MeshPhysicalMaterial 高级 PBR 材质

> "Physical 材质扩展 Standard 材质，支持清漆层、次表面散射等高级渲染效果。"

## 材质特点

```
MeshPhysicalMaterial extends MeshStandardMaterial
├── 清漆层（Clearcoat）
│   ├── clearcoat
│   └── clearcoatRoughness
├── 光泽层（Sheen）
│   ├── sheen
│   ├── sheenRoughness
│   └── sheenColor
├── 透射（Transmission）
│   ├── transmission
│   ├── thickness
│   └── attenuationColor
├── 折射率（IOR）
├── 各向异性（Anisotropy）
├── 虹彩效果（Iridescence）
└── 次表面散射（Specular）
```

## 完整实现

```typescript
// src/materials/MeshPhysicalMaterial.ts
import { MeshStandardMaterial, MeshStandardMaterialParameters } from './MeshStandardMaterial';
import { Color, ColorRepresentation } from '../math/Color';
import { Texture } from '../textures/Texture';
import { Vector2 } from '../math/Vector2';

export interface MeshPhysicalMaterialParameters extends MeshStandardMaterialParameters {
  // 清漆
  clearcoat?: number;
  clearcoatMap?: Texture | null;
  clearcoatRoughness?: number;
  clearcoatRoughnessMap?: Texture | null;
  clearcoatNormalMap?: Texture | null;
  clearcoatNormalScale?: Vector2;
  
  // 光泽（布料）
  sheen?: number;
  sheenColor?: ColorRepresentation;
  sheenColorMap?: Texture | null;
  sheenRoughness?: number;
  sheenRoughnessMap?: Texture | null;
  
  // 透射（玻璃）
  transmission?: number;
  transmissionMap?: Texture | null;
  thickness?: number;
  thicknessMap?: Texture | null;
  attenuationDistance?: number;
  attenuationColor?: ColorRepresentation;
  
  // 折射率
  ior?: number;
  
  // 镜面反射
  specularIntensity?: number;
  specularIntensityMap?: Texture | null;
  specularColor?: ColorRepresentation;
  specularColorMap?: Texture | null;
  
  // 各向异性
  anisotropy?: number;
  anisotropyRotation?: number;
  anisotropyMap?: Texture | null;
  
  // 虹彩
  iridescence?: number;
  iridescenceMap?: Texture | null;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: [number, number];
  iridescenceThicknessMap?: Texture | null;
}

export class MeshPhysicalMaterial extends MeshStandardMaterial {
  readonly isMeshPhysicalMaterial = true;
  readonly type = 'MeshPhysicalMaterial';
  
  defines = {
    'STANDARD': '',
    'PHYSICAL': '',
  };
  
  // 清漆层
  clearcoat = 0;
  clearcoatMap: Texture | null = null;
  clearcoatRoughness = 0;
  clearcoatRoughnessMap: Texture | null = null;
  clearcoatNormalMap: Texture | null = null;
  clearcoatNormalScale = new Vector2(1, 1);
  
  // 光泽（布料效果）
  sheen = 0;
  sheenColor = new Color(0x000000);
  sheenColorMap: Texture | null = null;
  sheenRoughness = 1;
  sheenRoughnessMap: Texture | null = null;
  
  // 透射（玻璃效果）
  transmission = 0;
  transmissionMap: Texture | null = null;
  thickness = 0;
  thicknessMap: Texture | null = null;
  attenuationDistance = Infinity;
  attenuationColor = new Color(1, 1, 1);
  
  // 折射率
  ior = 1.5;
  
  // 镜面反射控制
  specularIntensity = 1;
  specularIntensityMap: Texture | null = null;
  specularColor = new Color(1, 1, 1);
  specularColorMap: Texture | null = null;
  
  // 各向异性
  anisotropy = 0;
  anisotropyRotation = 0;
  anisotropyMap: Texture | null = null;
  
  // 虹彩效果
  iridescence = 0;
  iridescenceMap: Texture | null = null;
  iridescenceIOR = 1.3;
  iridescenceThicknessRange: [number, number] = [100, 400];
  iridescenceThicknessMap: Texture | null = null;
  
  constructor(parameters?: MeshPhysicalMaterialParameters) {
    super();
    
    this.defines = {
      'STANDARD': '',
      'PHYSICAL': '',
    };
    
    this.setValues(parameters);
  }
  
  // Getter/Setter 用于动态启用特性
  get reflectivity(): number {
    return clamp(2.5 * (this.ior - 1) / (this.ior + 1), 0, 1);
  }
  
  set reflectivity(value: number) {
    this.ior = (1 + 0.4 * value) / (1 - 0.4 * value);
  }
  
  copy(source: MeshPhysicalMaterial): this {
    super.copy(source);
    
    this.defines = {
      'STANDARD': '',
      'PHYSICAL': '',
    };
    
    this.clearcoat = source.clearcoat;
    this.clearcoatMap = source.clearcoatMap;
    this.clearcoatRoughness = source.clearcoatRoughness;
    this.clearcoatRoughnessMap = source.clearcoatRoughnessMap;
    this.clearcoatNormalMap = source.clearcoatNormalMap;
    this.clearcoatNormalScale.copy(source.clearcoatNormalScale);
    
    this.sheen = source.sheen;
    this.sheenColor.copy(source.sheenColor);
    this.sheenColorMap = source.sheenColorMap;
    this.sheenRoughness = source.sheenRoughness;
    this.sheenRoughnessMap = source.sheenRoughnessMap;
    
    this.transmission = source.transmission;
    this.transmissionMap = source.transmissionMap;
    this.thickness = source.thickness;
    this.thicknessMap = source.thicknessMap;
    this.attenuationDistance = source.attenuationDistance;
    this.attenuationColor.copy(source.attenuationColor);
    
    this.ior = source.ior;
    
    this.specularIntensity = source.specularIntensity;
    this.specularIntensityMap = source.specularIntensityMap;
    this.specularColor.copy(source.specularColor);
    this.specularColorMap = source.specularColorMap;
    
    this.anisotropy = source.anisotropy;
    this.anisotropyRotation = source.anisotropyRotation;
    this.anisotropyMap = source.anisotropyMap;
    
    this.iridescence = source.iridescence;
    this.iridescenceMap = source.iridescenceMap;
    this.iridescenceIOR = source.iridescenceIOR;
    this.iridescenceThicknessRange = [...source.iridescenceThicknessRange];
    this.iridescenceThicknessMap = source.iridescenceThicknessMap;
    
    return this;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

## 清漆层着色器

```glsl
// clearcoat.glsl
#ifdef USE_CLEARCOAT

uniform float clearcoat;
uniform float clearcoatRoughness;

#ifdef USE_CLEARCOATMAP
uniform sampler2D clearcoatMap;
#endif

#ifdef USE_CLEARCOAT_ROUGHNESSMAP
uniform sampler2D clearcoatRoughnessMap;
#endif

#ifdef USE_CLEARCOAT_NORMALMAP
uniform sampler2D clearcoatNormalMap;
uniform vec2 clearcoatNormalScale;
#endif

// 清漆层 F0
const float F0_CLEARCOAT = 0.04;

// 清漆层 BRDF
vec3 BRDF_Clearcoat(
    vec3 N, vec3 V, vec3 L,
    float clearcoatFactor,
    float clearcoatRoughness
) {
    vec3 H = normalize(V + L);
    
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float VdotH = max(dot(V, H), 0.0);
    
    // D
    float D = D_GGX(NdotH, clearcoatRoughness);
    
    // G
    float G = G_Smith(NdotV, NdotL, clearcoatRoughness);
    
    // F
    float F = F_Schlick_Scalar(VdotH, F0_CLEARCOAT);
    
    return vec3(D * G * F / (4.0 * NdotV * NdotL + 0.0001)) * clearcoatFactor;
}

// 获取清漆层法线
vec3 getClearcoatNormal() {
    #ifdef USE_CLEARCOAT_NORMALMAP
    vec3 mapN = texture(clearcoatNormalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= clearcoatNormalScale;
    return normalize(TBN * mapN);
    #else
    return vNormal;
    #endif
}

#endif
```

## 透射着色器

```glsl
// transmission.glsl
#ifdef USE_TRANSMISSION

uniform float transmission;
uniform float thickness;
uniform float attenuationDistance;
uniform vec3 attenuationColor;
uniform float ior;

#ifdef USE_TRANSMISSIONMAP
uniform sampler2D transmissionMap;
#endif

#ifdef USE_THICKNESSMAP
uniform sampler2D thicknessMap;
#endif

uniform sampler2D transmissionSamplerMap;
uniform vec2 transmissionSamplerSize;

// Beer-Lambert 衰减
vec3 volumeAttenuation(float thickness, vec3 attenuationColor, float attenuationDistance) {
    if (attenuationDistance == 0.0) {
        return vec3(1.0);
    }
    
    // Beer-Lambert law
    vec3 sigma = -log(attenuationColor) / attenuationDistance;
    return exp(-sigma * thickness);
}

// 折射
vec3 getTransmission(
    vec3 N, vec3 V,
    float roughness,
    vec3 baseColor,
    vec3 F0,
    float ior,
    float thickness,
    vec3 attenuationColor,
    float attenuationDistance,
    vec4 transmissionSample
) {
    // 折射方向
    vec3 R = refract(-V, N, 1.0 / ior);
    
    // 采样背景
    vec2 screenUv = gl_FragCoord.xy / transmissionSamplerSize;
    
    // 偏移基于折射和粗糙度
    float offset = thickness * roughness * 0.1;
    vec2 sampleUv = screenUv + R.xy * offset;
    
    vec3 transmitted = texture(transmissionSamplerMap, sampleUv).rgb;
    
    // 体积衰减
    vec3 attenuation = volumeAttenuation(thickness, attenuationColor, attenuationDistance);
    
    // 基色染色
    transmitted *= mix(vec3(1.0), baseColor, transmission);
    transmitted *= attenuation;
    
    return transmitted;
}

#endif
```

## 光泽层着色器（布料）

```glsl
// sheen.glsl
#ifdef USE_SHEEN

uniform float sheen;
uniform vec3 sheenColor;
uniform float sheenRoughness;

#ifdef USE_SHEENCOLORMAP
uniform sampler2D sheenColorMap;
#endif

#ifdef USE_SHEENROUGHNESSMAP
uniform sampler2D sheenRoughnessMap;
#endif

// Charlie 分布函数（布料专用）
float D_Charlie(float NdotH, float roughness) {
    float a = roughness * roughness;
    float invR = 1.0 / a;
    float cos2h = NdotH * NdotH;
    float sin2h = 1.0 - cos2h;
    
    return (2.0 + invR) * pow(sin2h, invR * 0.5) / (2.0 * PI);
}

// Neubelt 可见性函数
float V_Neubelt(float NdotV, float NdotL) {
    return 1.0 / (4.0 * (NdotL + NdotV - NdotL * NdotV));
}

// 光泽 BRDF
vec3 BRDF_Sheen(
    vec3 N, vec3 V, vec3 L,
    vec3 sheenColor,
    float sheenRoughness
) {
    vec3 H = normalize(V + L);
    
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    
    float D = D_Charlie(NdotH, sheenRoughness);
    float V_sheen = V_Neubelt(NdotV, NdotL);
    
    return sheenColor * D * V_sheen;
}

// 光泽层能量损失补偿
float sheenEnergyCompensation(float sheenRoughness) {
    // 简化的能量补偿
    return 1.0 - sheen * 0.5;
}

#endif
```

## 各向异性着色器

```glsl
// anisotropy.glsl
#ifdef USE_ANISOTROPY

uniform float anisotropy;
uniform float anisotropyRotation;

#ifdef USE_ANISOTROPYMAP
uniform sampler2D anisotropyMap;
#endif

// 各向异性 GGX
float D_GGX_Anisotropic(
    float NdotH,
    float TdotH,
    float BdotH,
    float at,
    float ab
) {
    float a2 = at * ab;
    vec3 v = vec3(ab * TdotH, at * BdotH, a2 * NdotH);
    float v2 = dot(v, v);
    float w2 = a2 / v2;
    return a2 * w2 * w2 / PI;
}

// 各向异性 BRDF
vec3 BRDF_GGX_Anisotropic(
    vec3 N, vec3 V, vec3 L,
    vec3 T, vec3 B,
    vec3 F0,
    float roughness,
    float anisotropy
) {
    vec3 H = normalize(V + L);
    
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float VdotH = max(dot(V, H), 0.0);
    float TdotH = dot(T, H);
    float BdotH = dot(B, H);
    
    // 各向异性粗糙度
    float aspect = sqrt(1.0 - anisotropy * 0.9);
    float at = roughness / aspect;
    float ab = roughness * aspect;
    
    float D = D_GGX_Anisotropic(NdotH, TdotH, BdotH, at, ab);
    float G = G_Smith(NdotV, NdotL, roughness);
    vec3 F = F_Schlick(VdotH, F0);
    
    return D * G * F / (4.0 * NdotV * NdotL + 0.0001);
}

#endif
```

## 虹彩效果着色器

```glsl
// iridescence.glsl
#ifdef USE_IRIDESCENCE

uniform float iridescence;
uniform float iridescenceIOR;
uniform vec2 iridescenceThicknessRange;

#ifdef USE_IRIDESCENCEMAP
uniform sampler2D iridescenceMap;
#endif

#ifdef USE_IRIDESCENCE_THICKNESSMAP
uniform sampler2D iridescenceThicknessMap;
#endif

// 薄膜干涉
vec3 evalIridescence(float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0) {
    // Snell's law
    float sinTheta2 = outsideIOR * outsideIOR * (1.0 - cosTheta1 * cosTheta1) / (eta2 * eta2);
    float cosTheta2 = sqrt(1.0 - sinTheta2);
    
    // 相位差
    float delta = 2.0 * eta2 * thinFilmThickness * cosTheta2;
    
    // 波长（可见光范围）
    const vec3 wavelengths = vec3(650.0, 510.0, 475.0); // RGB 波长 (nm)
    
    // 光程差
    vec3 OPD = delta / wavelengths * 2.0 * PI;
    
    // 干涉
    vec3 iridescenceColor = baseF0 + (1.0 - baseF0) * pow(1.0 - cosTheta1, 5.0);
    
    // 薄膜干涉调制
    vec3 interference = 0.5 + 0.5 * cos(OPD);
    
    return mix(baseF0, iridescenceColor * interference, iridescence);
}

#endif
```

## 使用示例

### 清漆效果（汽车漆面）

```typescript
// 汽车漆面材质
const carPaint = new MeshPhysicalMaterial({
  color: 0xff0000,
  metalness: 0.9,
  roughness: 0.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
});

// 带法线的清漆
const orangePeel = new MeshPhysicalMaterial({
  color: 0x0066cc,
  metalness: 0.8,
  roughness: 0.4,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  clearcoatNormalMap: loader.load('/textures/orangepeel_normal.jpg'),
  clearcoatNormalScale: new Vector2(0.3, 0.3),
});
```

### 布料材质

```typescript
// 天鹅绒
const velvet = new MeshPhysicalMaterial({
  color: 0x660033,
  roughness: 1.0,
  metalness: 0.0,
  sheen: 1.0,
  sheenColor: new Color(0xff9999),
  sheenRoughness: 0.8,
});

// 丝绸
const silk = new MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.0,
  sheen: 0.8,
  sheenColor: new Color(0xffeedd),
  sheenRoughness: 0.3,
});
```

### 玻璃材质

```typescript
// 清澈玻璃
const clearGlass = new MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.0,
  transmission: 1.0,
  thickness: 0.5,
  ior: 1.5,
});

// 有色玻璃
const tintedGlass = new MeshPhysicalMaterial({
  color: 0x88ccff,
  metalness: 0.0,
  roughness: 0.0,
  transmission: 0.9,
  thickness: 1.0,
  ior: 1.5,
  attenuationColor: new Color(0.5, 0.8, 1.0),
  attenuationDistance: 2.0,
});

// 磨砂玻璃
const frostedGlass = new MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.3,
  transmission: 0.9,
  thickness: 0.5,
  ior: 1.5,
});
```

### 各向异性金属

```typescript
// 拉丝金属
const brushedMetal = new MeshPhysicalMaterial({
  color: 0xcccccc,
  metalness: 1.0,
  roughness: 0.3,
  anisotropy: 0.8,
  anisotropyRotation: 0,
});

// 圆形拉丝
const circularBrushed = new MeshPhysicalMaterial({
  color: 0xcccccc,
  metalness: 1.0,
  roughness: 0.3,
  anisotropy: 0.6,
  anisotropyMap: loader.load('/textures/circular_brush.jpg'),
});
```

### 虹彩效果

```typescript
// 肥皂泡
const soapBubble = new MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.0,
  transmission: 0.95,
  thickness: 0.001,
  iridescence: 1.0,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400],
});

// CD 光盘
const cdSurface = new MeshPhysicalMaterial({
  color: 0xcccccc,
  metalness: 0.8,
  roughness: 0.1,
  iridescence: 0.8,
  iridescenceIOR: 2.0,
  iridescenceThicknessRange: [300, 800],
});
```

## 常见材质参数参考

| 材质 | metalness | roughness | 特殊参数 |
|------|-----------|-----------|----------|
| 汽车漆 | 0.8-0.9 | 0.4-0.6 | clearcoat: 1.0 |
| 玻璃 | 0.0 | 0.0-0.3 | transmission: 0.9-1.0 |
| 布料 | 0.0 | 0.8-1.0 | sheen: 0.5-1.0 |
| 拉丝金属 | 1.0 | 0.2-0.4 | anisotropy: 0.5-0.9 |
| 肥皂泡 | 0.0 | 0.0 | iridescence: 1.0 |
| 钻石 | 0.0 | 0.0 | ior: 2.4 |

## 本章小结

- MeshPhysicalMaterial 扩展 Standard 材质
- 清漆层用于汽车漆面等双层材质
- 光泽层用于布料的边缘高光
- 透射用于玻璃、液体等透明材质
- 各向异性用于拉丝金属
- 虹彩用于薄膜干涉效果

下一章，我们将学习 ShaderMaterial 自定义着色器材质。
