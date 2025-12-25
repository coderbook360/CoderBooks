# AmbientLight 环境光

> "环境光均匀照亮场景中的所有物体，模拟环境中的间接光照。"

## 环境光特点

```
AmbientLight
├── 无方向性
│   └── 均匀照亮所有表面
├── 无位置
│   └── 不受距离影响
├── 无阴影
│   └── 不能投射阴影
├── 用途
│   ├── 基础照明
│   ├── 模拟间接光
│   └── 避免纯黑区域
└── 性能
    └── 计算最简单
```

## 完整实现

```typescript
// src/lights/AmbientLight.ts
import { Light } from './Light';
import { ColorRepresentation } from '../math/Color';

export class AmbientLight extends Light {
  readonly isAmbientLight = true;
  readonly type = 'AmbientLight';
  
  constructor(color?: ColorRepresentation, intensity: number = 1) {
    super(color, intensity);
  }
}
```

## 着色器实现

```glsl
// ambient_light.glsl

// 环境光 uniform
uniform vec3 ambientLightColor;

// 计算环境光贡献
vec3 getAmbientLightIrradiance(vec3 ambientLightColor) {
    return ambientLightColor * PI;
}

// 应用到漫反射
void RE_IndirectDiffuse_Ambient(
    const in vec3 ambientColor,
    const in vec3 diffuseColor,
    inout ReflectedLight reflectedLight
) {
    vec3 irradiance = getAmbientLightIrradiance(ambientColor);
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(diffuseColor);
}
```

## 使用示例

### 基本用法

```typescript
// 创建环境光
const ambientLight = new AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// 调整颜色
ambientLight.color.set(0x333333);

// 调整强度
ambientLight.intensity = 0.3;
```

### 场景配合

```typescript
// 完整场景照明
const scene = new Scene();

// 环境光提供基础照明
const ambient = new AmbientLight(0x404040, 0.5);
scene.add(ambient);

// 方向光作为主光源
const directional = new DirectionalLight(0xffffff, 1);
directional.position.set(5, 10, 5);
scene.add(directional);

// 物体不会有完全黑暗的区域
const mesh = new Mesh(
  new BoxGeometry(1, 1, 1),
  new MeshStandardMaterial({ color: 0xff0000 })
);
scene.add(mesh);
```

### 日夜循环

```typescript
// 模拟一天中的光照变化
function updateLighting(timeOfDay: number) {
  // timeOfDay: 0-24
  const normalizedTime = timeOfDay / 24;
  
  // 日间（6-18）环境光较强
  let ambientIntensity = 0;
  
  if (timeOfDay >= 6 && timeOfDay <= 18) {
    // 正午最亮
    const dayProgress = (timeOfDay - 6) / 12;
    ambientIntensity = Math.sin(dayProgress * Math.PI) * 0.5;
  } else {
    // 夜间微弱环境光
    ambientIntensity = 0.05;
  }
  
  ambientLight.intensity = ambientIntensity;
  
  // 颜色也随时间变化
  if (timeOfDay >= 6 && timeOfDay <= 7) {
    // 日出：暖色
    ambientLight.color.setHex(0xffaa66);
  } else if (timeOfDay >= 17 && timeOfDay <= 18) {
    // 日落：暖色
    ambientLight.color.setHex(0xffaa66);
  } else if (timeOfDay > 7 && timeOfDay < 17) {
    // 白天：蓝白色
    ambientLight.color.setHex(0xaaccff);
  } else {
    // 夜间：深蓝色
    ambientLight.color.setHex(0x112244);
  }
}
```

## 环境光与材质

```typescript
// MeshBasicMaterial 不受光照影响
const basicMaterial = new MeshBasicMaterial({ color: 0xff0000 });
// 颜色恒定，环境光无效果

// MeshLambertMaterial 受环境光影响
const lambertMaterial = new MeshLambertMaterial({ color: 0xff0000 });
// 最终颜色 = 材质颜色 × 环境光

// MeshStandardMaterial 受环境光影响
const standardMaterial = new MeshStandardMaterial({ color: 0xff0000 });
// PBR 中，环境光作为漫反射间接光
```

## 光照计算

```
环境光计算：

最终颜色 = 材质颜色 × 环境光颜色 × 环境光强度

示例：
材质颜色 = (1.0, 0.0, 0.0)  // 红色
环境光颜色 = (0.25, 0.25, 0.25)  // 灰色
环境光强度 = 1.0

最终颜色 = (1.0 × 0.25, 0.0 × 0.25, 0.0 × 0.25)
         = (0.25, 0.0, 0.0)  // 暗红色
```

## 环境光与 IBL 对比

```
AmbientLight:
- 均匀颜色
- 无方向信息
- 性能高
- 效果简单

Image-Based Lighting (IBL):
- 环境贴图提供
- 有方向信息
- 性能较低
- 效果真实

   AmbientLight          IBL
      ↓ ↓ ↓            ╭─────╮
      ↓ ↓ ↓           ╱       ╲
      ↓ ↓ ↓    →     │  HDRI  │
    均匀照射          ╲       ╱
                      ╰─────╯
                    环境贴图照射
```

## 本章小结

- AmbientLight 提供均匀的基础照明
- 没有方向和位置概念
- 不能投射阴影
- 用于模拟间接光照
- 通常与其他光源配合使用

下一章，我们将学习 DirectionalLight 方向光。
