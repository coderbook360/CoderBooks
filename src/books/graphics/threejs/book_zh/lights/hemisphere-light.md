# HemisphereLight 半球光

> "半球光模拟天空和地面的环境光照，提供更自然的户外照明效果。"

## 半球光特点

```
HemisphereLight
├── 双色照明
│   ├── skyColor（天空色）
│   └── groundColor（地面色）
├── 基于法线方向
│   └── 朝上接收天空色
│   └── 朝下接收地面色
├── 无阴影
├── 用途
│   ├── 户外环境光
│   ├── 天空-地面反射
│   └── 自然照明
└── 与 AmbientLight 对比
    └── 更真实的环境效果
```

## 完整实现

```typescript
// src/lights/HemisphereLight.ts
import { Light } from './Light';
import { Color, ColorRepresentation } from '../math/Color';

export class HemisphereLight extends Light {
  readonly isHemisphereLight = true;
  readonly type = 'HemisphereLight';
  
  // 地面颜色
  groundColor: Color;
  
  constructor(
    skyColor?: ColorRepresentation,
    groundColor?: ColorRepresentation,
    intensity: number = 1
  ) {
    super(skyColor, intensity);
    
    // color 作为天空色
    this.groundColor = new Color(groundColor);
    
    // 默认方向朝上
    this.position.copy(Object3D.DEFAULT_UP);
    this.updateMatrix();
  }
  
  copy(source: HemisphereLight, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.groundColor.copy(source.groundColor);
    
    return this;
  }
}
```

## 着色器实现

```glsl
// hemisphere_light.glsl

// 半球光结构
struct HemisphereLight {
    vec3 direction;    // 天空方向（通常朝上）
    vec3 skyColor;     // 天空颜色
    vec3 groundColor;  // 地面颜色
};

#if NUM_HEMI_LIGHTS > 0
uniform HemisphereLight hemisphereLights[NUM_HEMI_LIGHTS];
#endif

// 计算半球光辐照度
vec3 getHemisphereLightIrradiance(
    const in HemisphereLight hemiLight,
    const in vec3 normal
) {
    // 法线与天空方向的点积
    // 1 = 完全朝上（天空色）
    // -1 = 完全朝下（地面色）
    float dotNL = dot(normal, hemiLight.direction);
    
    // 映射到 0-1 范围
    float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
    
    // 在天空色和地面色之间插值
    return mix(hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight);
}

// 应用半球光到漫反射
void RE_IndirectDiffuse_Hemisphere(
    const in HemisphereLight hemiLight,
    const in vec3 normal,
    const in vec3 diffuseColor,
    inout ReflectedLight reflectedLight
) {
    vec3 irradiance = getHemisphereLightIrradiance(hemiLight, normal);
    
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(diffuseColor);
}
```

## 使用示例

### 基本用法

```typescript
// 创建半球光
const hemisphereLight = new HemisphereLight(
  0x87ceeb,  // 天空蓝
  0x3a5f0b,  // 草地绿
  1
);
scene.add(hemisphereLight);

// 调整颜色
hemisphereLight.color.set(0xaaddff);      // 天空色
hemisphereLight.groundColor.set(0x553311); // 地面色

// 调整强度
hemisphereLight.intensity = 0.6;
```

### 户外场景照明

```typescript
// 完整户外照明设置
function setupOutdoorLighting(scene: Scene): void {
  // 半球光作为环境光
  const hemiLight = new HemisphereLight(
    0xaaccff,  // 浅蓝天空
    0x88aa55,  // 绿色地面反射
    0.6
  );
  scene.add(hemiLight);
  
  // 方向光作为太阳
  const sunLight = new DirectionalLight(0xffffcc, 1);
  sunLight.position.set(50, 100, 30);
  sunLight.castShadow = true;
  scene.add(sunLight);
  
  // 可选：填充光
  const fillLight = new DirectionalLight(0x88aaff, 0.3);
  fillLight.position.set(-30, 50, -30);
  scene.add(fillLight);
}
```

### 时间变化

```typescript
class DayNightCycle {
  private hemiLight: HemisphereLight;
  private sunLight: DirectionalLight;
  
  // 预设颜色
  private skyColors = {
    dawn: new Color(0xff9966),
    day: new Color(0x87ceeb),
    dusk: new Color(0xff6644),
    night: new Color(0x112244),
  };
  
  private groundColors = {
    dawn: new Color(0x553322),
    day: new Color(0x3a5f0b),
    dusk: new Color(0x442211),
    night: new Color(0x111122),
  };
  
  constructor(scene: Scene) {
    this.hemiLight = new HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemiLight);
    
    this.sunLight = new DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = true;
    scene.add(this.sunLight);
  }
  
  setTimeOfDay(hour: number): void {
    // hour: 0-24
    
    let skyColor: Color;
    let groundColor: Color;
    let sunIntensity: number;
    let hemiIntensity: number;
    
    if (hour >= 5 && hour < 7) {
      // 黎明
      const t = (hour - 5) / 2;
      skyColor = this.skyColors.night.clone().lerp(this.skyColors.dawn, t);
      groundColor = this.groundColors.night.clone().lerp(this.groundColors.dawn, t);
      sunIntensity = t * 0.5;
      hemiIntensity = 0.3 + t * 0.3;
      
    } else if (hour >= 7 && hour < 17) {
      // 白天
      const t = Math.sin((hour - 7) / 10 * Math.PI);
      skyColor = this.skyColors.dawn.clone().lerp(this.skyColors.day, t);
      groundColor = this.groundColors.dawn.clone().lerp(this.groundColors.day, t);
      sunIntensity = 0.5 + t * 0.5;
      hemiIntensity = 0.6;
      
    } else if (hour >= 17 && hour < 19) {
      // 黄昏
      const t = (hour - 17) / 2;
      skyColor = this.skyColors.day.clone().lerp(this.skyColors.dusk, t);
      groundColor = this.groundColors.day.clone().lerp(this.groundColors.dusk, t);
      sunIntensity = 0.5 - t * 0.4;
      hemiIntensity = 0.6 - t * 0.3;
      
    } else {
      // 夜晚
      skyColor = this.skyColors.night;
      groundColor = this.groundColors.night;
      sunIntensity = 0;
      hemiIntensity = 0.1;
    }
    
    this.hemiLight.color.copy(skyColor);
    this.hemiLight.groundColor.copy(groundColor);
    this.hemiLight.intensity = hemiIntensity;
    
    this.sunLight.intensity = sunIntensity;
    
    // 更新太阳位置
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    this.sunLight.position.set(
      Math.cos(sunAngle) * 100,
      Math.sin(sunAngle) * 100,
      0
    );
  }
}
```

### 与 IBL 结合

```typescript
// 半球光 + 环境贴图
function setupAdvancedLighting(scene: Scene, envMap: Texture): void {
  // 半球光提供基础照明
  const hemiLight = new HemisphereLight(0xffffff, 0x444444, 0.3);
  scene.add(hemiLight);
  
  // 环境贴图提供反射
  scene.environment = envMap;
  
  // 材质使用环境贴图
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.5,
    envMap: envMap,
    envMapIntensity: 1,
  });
}
```

## 半球光原理图

```
              天空方向 (direction)
                  ↑
                  │
    ┌─────────────┼─────────────┐
    │  skyColor   │             │
    │    ╭───────●───────╮      │
    │   ╱       ↗│       ╲     │
    │  ╱    法线 │        ╲    │
    │ ╱          │         ╲   │
    │╱           │          ╲  │
────●────────────┼───────────●────
    │╲           │          ╱  │
    │ ╲          │         ╱   │
    │  ╲         │        ╱    │
    │   ╲        │       ╱     │
    │    ╰───────●───────╯      │
    │ groundColor               │
    └───────────────────────────┘

颜色混合：
法线朝上 → skyColor
法线朝下 → groundColor
法线水平 → 50% 混合

混合公式：
weight = dot(normal, direction) * 0.5 + 0.5
color = mix(groundColor, skyColor, weight)
```

## 与 AmbientLight 对比

```
AmbientLight:
┌─────────────────┐
│ ████████████████ │  均匀颜色
│ ████████████████ │  所有方向相同
│ ████████████████ │
└─────────────────┘

HemisphereLight:
┌─────────────────┐
│ ░░░░░░░░░░░░░░░ │  天空色（上方）
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │  过渡区
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  地面色（下方）
└─────────────────┘

球体照明对比：
AmbientLight:              HemisphereLight:
    ┌───┐                      ┌───┐
   ╱     ╲                    ╱░░░░░╲
  │ 均匀  │                  │▒▒▒▒▒▒▒│
   ╲     ╱                    ╲▓▓▓▓▓╱
    └───┘                      └───┘
```

## 性能考虑

| 光源类型 | 计算复杂度 | 阴影 | 效果 |
|----------|------------|------|------|
| AmbientLight | 最低 | ✗ | 单一 |
| HemisphereLight | 低 | ✗ | 自然 |
| DirectionalLight | 中 | ✓ | 定向 |
| PointLight | 高 | ✓ | 点源 |
| SpotLight | 高 | ✓ | 锥形 |

## 本章小结

- HemisphereLight 模拟天地环境光
- 使用 skyColor 和 groundColor 两种颜色
- 基于法线方向混合颜色
- 比 AmbientLight 更自然
- 适合户外场景照明

下一章，我们将学习 RectAreaLight 矩形区域光。
