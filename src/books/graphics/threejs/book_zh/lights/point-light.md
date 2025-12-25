# PointLight 点光源

> "点光源从单一位置向所有方向发光，模拟灯泡、蜡烛等现实光源。"

## 点光源特点

```
PointLight
├── 全向发光
│   └── 从一点向四周发射
├── 距离衰减
│   ├── distance（最大距离）
│   └── decay（衰减指数）
├── 阴影
│   └── 立方体阴影贴图
└── 用途
    ├── 灯泡
    ├── 蜡烛
    ├── 火把
    └── 室内照明
```

## 完整实现

```typescript
// src/lights/PointLight.ts
import { Light } from './Light';
import { PointLightShadow } from './PointLightShadow';
import { ColorRepresentation } from '../math/Color';

export class PointLight extends Light {
  readonly isPointLight = true;
  readonly type = 'PointLight';
  
  // 光照距离（0 = 无限远）
  distance: number;
  
  // 衰减指数（物理正确值为 2）
  decay: number;
  
  // 阴影
  shadow: PointLightShadow;
  
  constructor(
    color?: ColorRepresentation,
    intensity: number = 1,
    distance: number = 0,
    decay: number = 2
  ) {
    super(color, intensity);
    
    this.distance = distance;
    this.decay = decay;
    
    this.shadow = new PointLightShadow();
  }
  
  // 获取光照功率（流明）
  get power(): number {
    // intensity 是 candelas（坎德拉）
    // power = intensity * 4 * π
    return this.intensity * 4 * Math.PI;
  }
  
  set power(power: number) {
    this.intensity = power / (4 * Math.PI);
  }
  
  dispose(): void {
    this.shadow.dispose();
  }
  
  copy(source: PointLight, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.distance = source.distance;
    this.decay = source.decay;
    this.shadow = source.shadow.clone();
    
    return this;
  }
}
```

## PointLightShadow

```typescript
// src/lights/PointLightShadow.ts
import { LightShadow } from './LightShadow';
import { PerspectiveCamera } from '../cameras/PerspectiveCamera';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { Vector4 } from '../math/Vector4';

export class PointLightShadow extends LightShadow {
  readonly isPointLightShadow = true;
  
  // 6个方向
  private _cubeDirections = [
    new Vector3(1, 0, 0),   // +X
    new Vector3(-1, 0, 0),  // -X
    new Vector3(0, 1, 0),   // +Y
    new Vector3(0, -1, 0),  // -Y
    new Vector3(0, 0, 1),   // +Z
    new Vector3(0, 0, -1),  // -Z
  ];
  
  private _cubeUps = [
    new Vector3(0, -1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
    new Vector3(0, -1, 0),
    new Vector3(0, -1, 0),
  ];
  
  constructor() {
    // 点光源使用透视相机（90度视角）
    super(new PerspectiveCamera(90, 1, 0.5, 500));
    
    // 需要6个视口（立方体6面）
    this._frameExtents = new Vector2(4, 2);
    this._viewportCount = 6;
    
    this._viewports = [
      new Vector4(2, 1, 1, 1), // +X
      new Vector4(0, 1, 1, 1), // -X
      new Vector4(3, 1, 1, 1), // +Y
      new Vector4(1, 1, 1, 1), // -Y
      new Vector4(3, 0, 1, 1), // +Z
      new Vector4(1, 0, 1, 1), // -Z
    ];
  }
  
  updateMatrices(light: PointLight, viewportIndex: number = 0): void {
    const camera = this.camera as PerspectiveCamera;
    
    // 设置相机位置为光源位置
    camera.position.setFromMatrixPosition(light.matrixWorld);
    
    // 设置相机方向
    _lookTarget.copy(camera.position);
    _lookTarget.add(this._cubeDirections[viewportIndex]);
    camera.up.copy(this._cubeUps[viewportIndex]);
    camera.lookAt(_lookTarget);
    camera.updateMatrixWorld();
    
    // 更新阴影矩阵
    this.matrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    
    this.matrix.multiply(camera.projectionMatrix);
    this.matrix.multiply(camera.matrixWorldInverse);
  }
  
  getViewport(viewportIndex: number): Vector4 {
    return this._viewports[viewportIndex];
  }
}

const _lookTarget = new Vector3();
```

## 着色器实现

```glsl
// point_light.glsl

// 点光源结构
struct PointLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
};

#if NUM_POINT_LIGHTS > 0
uniform PointLight pointLights[NUM_POINT_LIGHTS];
#endif

// 距离衰减函数
float getDistanceAttenuation(float lightDistance, float cutoffDistance, float decayExponent) {
    // 物理正确的平方反比衰减
    if (decayExponent > 0.0) {
        // 带截断的衰减
        float distanceFalloff = 1.0 / max(pow(lightDistance, decayExponent), 0.01);
        
        if (cutoffDistance > 0.0) {
            // 平滑截断
            float cutoff = pow(saturate(1.0 - pow(lightDistance / cutoffDistance, 4.0)), 2.0);
            return distanceFalloff * cutoff;
        }
        
        return distanceFalloff;
    }
    
    return 1.0;
}

// 获取点光源入射信息
void getPointLightInfo(
    const in PointLight pointLight,
    const in vec3 geometryPosition,
    out IncidentLight light
) {
    vec3 lVector = pointLight.position - geometryPosition;
    float lightDistance = length(lVector);
    
    light.direction = normalize(lVector);
    
    // 计算衰减
    float attenuation = getDistanceAttenuation(
        lightDistance,
        pointLight.distance,
        pointLight.decay
    );
    
    light.color = pointLight.color * attenuation;
    light.visible = (attenuation > 0.0);
}

// 计算点光源贡献
void RE_Direct_Point(
    const in PointLight pointLight,
    const in vec3 geometryPosition,
    const in vec3 geometryNormal,
    const in vec3 geometryViewDir,
    const in PhysicalMaterial material,
    inout ReflectedLight reflectedLight
) {
    IncidentLight light;
    getPointLightInfo(pointLight, geometryPosition, light);
    
    if (light.visible) {
        float dotNL = saturate(dot(geometryNormal, light.direction));
        vec3 irradiance = dotNL * light.color;
        
        // 漫反射
        reflectedLight.directDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);
        
        // 镜面反射
        reflectedLight.directSpecular += irradiance * BRDF_GGX(
            light.direction,
            geometryViewDir,
            geometryNormal,
            material.specularColor,
            material.roughness
        );
    }
}
```

### 点光源阴影采样

```glsl
// point_shadow.glsl

#if NUM_POINT_LIGHT_SHADOWS > 0

struct PointLightShadow {
    float shadowBias;
    float shadowNormalBias;
    float shadowRadius;
    vec2 shadowMapSize;
    float shadowCameraNear;
    float shadowCameraFar;
};

uniform PointLightShadow pointLightShadows[NUM_POINT_LIGHT_SHADOWS];
uniform samplerCube pointShadowMap[NUM_POINT_LIGHT_SHADOWS];

// 计算点光源阴影
float getPointShadow(
    samplerCube shadowMap,
    PointLightShadow shadow,
    vec3 lightToFrag,
    float lightDistance
) {
    // 采样立方体贴图
    vec3 direction = normalize(lightToFrag);
    
    // 计算深度
    float shadowCameraNear = shadow.shadowCameraNear;
    float shadowCameraFar = shadow.shadowCameraFar;
    
    float normalizedDist = (lightDistance - shadowCameraNear) / 
                          (shadowCameraFar - shadowCameraNear);
    normalizedDist += shadow.shadowBias;
    
    // 采样
    float closestDist = unpackRGBAToDepth(texture(shadowMap, direction));
    
    return step(normalizedDist, closestDist);
}

// PCF 软阴影（使用偏移方向采样）
float getPointShadowPCF(
    samplerCube shadowMap,
    PointLightShadow shadow,
    vec3 lightToFrag,
    float lightDistance
) {
    vec3 direction = normalize(lightToFrag);
    
    float shadowCameraNear = shadow.shadowCameraNear;
    float shadowCameraFar = shadow.shadowCameraFar;
    float normalizedDist = (lightDistance - shadowCameraNear) / 
                          (shadowCameraFar - shadowCameraNear);
    normalizedDist += shadow.shadowBias;
    
    float accumShadow = 0.0;
    
    // 20个偏移方向
    vec3 sampleOffsetDirections[20] = vec3[](
        vec3(1, 1, 1), vec3(1, -1, 1), vec3(-1, -1, 1), vec3(-1, 1, 1),
        vec3(1, 1, -1), vec3(1, -1, -1), vec3(-1, -1, -1), vec3(-1, 1, -1),
        vec3(1, 1, 0), vec3(1, -1, 0), vec3(-1, -1, 0), vec3(-1, 1, 0),
        vec3(1, 0, 1), vec3(-1, 0, 1), vec3(1, 0, -1), vec3(-1, 0, -1),
        vec3(0, 1, 1), vec3(0, -1, 1), vec3(0, -1, -1), vec3(0, 1, -1)
    );
    
    float diskRadius = shadow.shadowRadius / lightDistance;
    
    for (int i = 0; i < 20; i++) {
        vec3 sampleDirection = direction + sampleOffsetDirections[i] * diskRadius;
        float closestDist = unpackRGBAToDepth(texture(shadowMap, sampleDirection));
        accumShadow += step(normalizedDist, closestDist);
    }
    
    return accumShadow / 20.0;
}

#endif
```

## 使用示例

### 基本用法

```typescript
// 创建点光源
const pointLight = new PointLight(0xffffff, 1, 100, 2);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// 调整参数
pointLight.color.set(0xff8800);
pointLight.intensity = 2;
pointLight.distance = 50;
pointLight.decay = 2; // 物理正确
```

### 阴影配置

```typescript
// 启用阴影
pointLight.castShadow = true;

// 阴影贴图大小
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;

// 阴影相机范围
pointLight.shadow.camera.near = 0.5;
pointLight.shadow.camera.far = 50;

// 阴影偏移
pointLight.shadow.bias = -0.001;
pointLight.shadow.normalBias = 0.02;

// PCF 半径
pointLight.shadow.radius = 2;
```

### 灯泡效果

```typescript
// 创建灯泡模型
function createBulb(scene: Scene): PointLight {
  // 灯泡几何体
  const bulbGeometry = new SphereGeometry(0.1, 16, 16);
  const bulbMaterial = new MeshBasicMaterial({
    color: 0xffffee,
    transparent: true,
    opacity: 0.8,
  });
  const bulbMesh = new Mesh(bulbGeometry, bulbMaterial);
  
  // 点光源
  const light = new PointLight(0xffffee, 1, 10, 2);
  light.add(bulbMesh);
  light.position.y = 3;
  
  scene.add(light);
  
  return light;
}

// 灯泡闪烁效果
function flickerBulb(light: PointLight, baseIntensity: number): void {
  const flicker = 1 + Math.random() * 0.1 - 0.05;
  light.intensity = baseIntensity * flicker;
}
```

### 多点光源场景

```typescript
// 创建多个点光源
const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
const lights: PointLight[] = [];

colors.forEach((color, i) => {
  const light = new PointLight(color, 0.5, 20, 2);
  
  const angle = (i / colors.length) * Math.PI * 2;
  light.position.set(
    Math.cos(angle) * 5,
    2,
    Math.sin(angle) * 5
  );
  
  scene.add(light);
  lights.push(light);
});

// 动画旋转
function animateLights(time: number): void {
  lights.forEach((light, i) => {
    const angle = time * 0.001 + (i / lights.length) * Math.PI * 2;
    light.position.x = Math.cos(angle) * 5;
    light.position.z = Math.sin(angle) * 5;
  });
}
```

### 使用 power 属性

```typescript
// 使用物理单位（流明）
const light = new PointLight(0xffffff);
light.power = 800; // 800 流明（相当于 60W 白炽灯）

// 常见灯泡功率参考
// 25W 白炽灯 ≈ 200 流明
// 40W 白炽灯 ≈ 400 流明
// 60W 白炽灯 ≈ 800 流明
// 100W 白炽灯 ≈ 1600 流明
```

## 衰减可视化

```
点光源衰减：

intensity = baseIntensity / distance^decay

decay = 1:
    ◯ ─────────────────────── 
       └──────────────────────→ 距离
       线性衰减

decay = 2（物理正确）:
    ◯ ────┐
          └───────────────────→ 距离
       平方反比衰减

distance 参数：
    ◯ ──────┐
            │← distance
            ╰────→ 光强为 0
       带截断的衰减
```

## 本章小结

- PointLight 从单点向所有方向发光
- decay 控制衰减方式（2 为物理正确）
- distance 设置光照范围
- 阴影使用立方体贴图（6 面）
- power 属性使用物理单位（流明）

下一章，我们将学习 SpotLight 聚光灯。
