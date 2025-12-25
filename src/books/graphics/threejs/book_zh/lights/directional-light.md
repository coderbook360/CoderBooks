# DirectionalLight 方向光

> "方向光模拟无限远的光源（如太阳），所有光线平行照射场景。"

## 方向光特点

```
DirectionalLight
├── 平行光线
│   └── 所有点接收相同方向的光
├── 无衰减
│   └── 光强不随距离变化
├── 位置决定方向
│   └── 从 position 指向 target
├── 阴影
│   └── 正交投影阴影贴图
└── 用途
    ├── 模拟太阳光
    ├── 户外场景主光源
    └── 大范围照明
```

## 完整实现

```typescript
// src/lights/DirectionalLight.ts
import { Light } from './Light';
import { Object3D } from '../core/Object3D';
import { DirectionalLightShadow } from './DirectionalLightShadow';
import { ColorRepresentation } from '../math/Color';

export class DirectionalLight extends Light {
  readonly isDirectionalLight = true;
  readonly type = 'DirectionalLight';
  
  // 光源目标
  target: Object3D;
  
  // 阴影
  shadow: DirectionalLightShadow;
  
  constructor(color?: ColorRepresentation, intensity: number = 1) {
    super(color, intensity);
    
    // 默认位置
    this.position.copy(Object3D.DEFAULT_UP);
    this.updateMatrix();
    
    // 创建目标
    this.target = new Object3D();
    
    // 创建阴影
    this.shadow = new DirectionalLightShadow();
  }
  
  dispose(): void {
    this.shadow.dispose();
  }
  
  copy(source: DirectionalLight, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.target = source.target.clone();
    this.shadow = source.shadow.clone();
    
    return this;
  }
}
```

## DirectionalLightShadow

```typescript
// src/lights/DirectionalLightShadow.ts
import { LightShadow } from './LightShadow';
import { OrthographicCamera } from '../cameras/OrthographicCamera';

export class DirectionalLightShadow extends LightShadow {
  readonly isDirectionalLightShadow = true;
  
  constructor() {
    // 方向光使用正交相机
    super(new OrthographicCamera(-5, 5, 5, -5, 0.5, 500));
  }
  
  updateMatrices(light: DirectionalLight): void {
    const camera = this.camera as OrthographicCamera;
    const shadowMatrix = this.matrix;
    
    // 更新阴影相机位置（从光源位置出发）
    camera.position.setFromMatrixPosition(light.matrixWorld);
    
    // 看向目标
    _lookTarget.setFromMatrixPosition(light.target.matrixWorld);
    camera.lookAt(_lookTarget);
    
    camera.updateMatrixWorld();
    
    // 计算阴影矩阵
    // bias * projection * view
    shadowMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    
    shadowMatrix.multiply(camera.projectionMatrix);
    shadowMatrix.multiply(camera.matrixWorldInverse);
  }
}

const _lookTarget = new Vector3();
```

## 着色器实现

```glsl
// directional_light.glsl

// 方向光结构
struct DirectionalLight {
    vec3 direction;
    vec3 color;
};

#if NUM_DIR_LIGHTS > 0
uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
#endif

// 获取方向光入射信息
void getDirectionalLightInfo(
    const in DirectionalLight directionalLight,
    out IncidentLight light
) {
    light.color = directionalLight.color;
    light.direction = directionalLight.direction;
    light.visible = true;
}

// 计算方向光贡献
void RE_Direct_Directional(
    const in DirectionalLight directionalLight,
    const in vec3 geometryNormal,
    const in vec3 geometryViewDir,
    const in PhysicalMaterial material,
    inout ReflectedLight reflectedLight
) {
    IncidentLight light;
    getDirectionalLightInfo(directionalLight, light);
    
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
```

### 阴影采样

```glsl
// directional_shadow.glsl

#if NUM_DIR_LIGHT_SHADOWS > 0

struct DirectionalLightShadow {
    float shadowBias;
    float shadowNormalBias;
    float shadowRadius;
    vec2 shadowMapSize;
};

uniform DirectionalLightShadow directionalLightShadows[NUM_DIR_LIGHT_SHADOWS];
uniform sampler2D directionalShadowMap[NUM_DIR_LIGHT_SHADOWS];
uniform mat4 directionalShadowMatrix[NUM_DIR_LIGHT_SHADOWS];

float getDirectionalShadow(
    sampler2D shadowMap,
    DirectionalLightShadow shadow,
    mat4 shadowMatrix,
    vec4 shadowCoord
) {
    shadowCoord = shadowMatrix * shadowCoord;
    
    return getShadow(
        shadowMap,
        shadow.shadowMapSize,
        shadow.shadowBias,
        shadow.shadowRadius,
        shadowCoord
    );
}

#endif
```

## 使用示例

### 基本用法

```typescript
// 创建方向光
const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// 添加目标（可选，默认在原点）
scene.add(directionalLight.target);
directionalLight.target.position.set(0, 0, 0);
```

### 阴影配置

```typescript
// 启用阴影
directionalLight.castShadow = true;

// 阴影贴图大小
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;

// 阴影相机范围（正交相机）
const d = 10;
directionalLight.shadow.camera.left = -d;
directionalLight.shadow.camera.right = d;
directionalLight.shadow.camera.top = d;
directionalLight.shadow.camera.bottom = -d;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;

// 阴影偏移
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.normalBias = 0.02;

// PCF 半径
directionalLight.shadow.radius = 1;
```

### 阴影相机辅助

```typescript
// 可视化阴影相机
const helper = new CameraHelper(directionalLight.shadow.camera);
scene.add(helper);

// 方向光辅助线
const lightHelper = new DirectionalLightHelper(directionalLight, 5);
scene.add(lightHelper);
```

### 太阳光模拟

```typescript
class SunLight {
  private light: DirectionalLight;
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
    
    this.light = new DirectionalLight(0xffffff, 1);
    this.light.castShadow = true;
    this.configureShadow();
    
    scene.add(this.light);
    scene.add(this.light.target);
  }
  
  private configureShadow(): void {
    const shadow = this.light.shadow;
    
    shadow.mapSize.set(4096, 4096);
    
    const d = 50;
    shadow.camera.left = -d;
    shadow.camera.right = d;
    shadow.camera.top = d;
    shadow.camera.bottom = -d;
    shadow.camera.near = 1;
    shadow.camera.far = 200;
    
    shadow.bias = -0.0001;
    shadow.normalBias = 0.02;
  }
  
  // 根据时间设置太阳位置
  setTimeOfDay(hour: number): void {
    // hour: 0-24
    // 6点日出，18点日落
    
    const angle = ((hour - 6) / 12) * Math.PI; // 0 到 π
    const elevation = Math.sin(angle);
    const horizontal = Math.cos(angle);
    
    // 太阳轨迹
    const distance = 100;
    this.light.position.set(
      horizontal * distance,
      Math.max(elevation, -0.2) * distance,
      0
    );
    
    // 调整颜色
    if (hour >= 6 && hour <= 7 || hour >= 17 && hour <= 18) {
      // 日出日落：暖色
      this.light.color.setHex(0xffaa66);
      this.light.intensity = 0.8;
    } else if (hour > 7 && hour < 17) {
      // 日间：白色
      this.light.color.setHex(0xffffff);
      this.light.intensity = 1;
    } else {
      // 夜间
      this.light.intensity = 0;
    }
  }
}
```

### 场景包围盒自适应

```typescript
// 根据场景自动调整阴影相机
function fitShadowCameraToScene(
  light: DirectionalLight,
  scene: Scene
): void {
  const box = new Box3().setFromObject(scene);
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const padding = maxDim * 0.5;
  
  // 更新阴影相机
  const camera = light.shadow.camera as OrthographicCamera;
  camera.left = -maxDim / 2 - padding;
  camera.right = maxDim / 2 + padding;
  camera.top = maxDim / 2 + padding;
  camera.bottom = -maxDim / 2 - padding;
  camera.near = 0.5;
  camera.far = maxDim * 2;
  camera.updateProjectionMatrix();
  
  // 设置光源位置
  const lightDir = light.position.clone().normalize();
  light.position.copy(center).add(lightDir.multiplyScalar(maxDim));
  light.target.position.copy(center);
}
```

## 方向光与相机距离

```
方向光特点：
- 光线平行
- 无衰减
- 适合远距离光源

     太阳 ☀️
        ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓  平行光线
        ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
    ─────────────────────── 地面
        △   △   △   △
       物体  物体  物体  物体

无论物体距离多远，光照强度相同
```

## 本章小结

- DirectionalLight 模拟平行光源
- position 和 target 决定光线方向
- 使用正交相机生成阴影
- 适合模拟太阳光等远距离光源
- 阴影相机范围需要根据场景调整

下一章，我们将学习 PointLight 点光源。
