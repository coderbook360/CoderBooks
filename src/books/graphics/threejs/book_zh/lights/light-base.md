# Light 光源基类

> "所有光源类型都继承自 Light 基类，共享颜色和强度属性。"

## Light 类结构

```
Light extends Object3D
├── 属性
│   ├── color（颜色）
│   ├── intensity（强度）
│   └── castShadow（投射阴影）
├── 阴影
│   └── shadow（LightShadow）
└── 子类
    ├── AmbientLight
    ├── DirectionalLight
    ├── PointLight
    ├── SpotLight
    ├── HemisphereLight
    └── RectAreaLight
```

## 完整实现

```typescript
// src/lights/Light.ts
import { Object3D } from '../core/Object3D';
import { Color, ColorRepresentation } from '../math/Color';

export class Light extends Object3D {
  readonly isLight = true;
  readonly type = 'Light';
  
  // 光源颜色
  color: Color;
  
  // 光源强度
  intensity: number;
  
  constructor(color?: ColorRepresentation, intensity: number = 1) {
    super();
    
    this.color = new Color(color);
    this.intensity = intensity;
  }
  
  // 释放资源
  dispose(): void {
    // 子类可能需要释放阴影贴图等资源
  }
  
  copy(source: Light, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.color.copy(source.color);
    this.intensity = source.intensity;
    
    return this;
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    data.object.color = this.color.getHex();
    data.object.intensity = this.intensity;
    
    return data;
  }
}
```

## LightShadow 阴影配置

```typescript
// src/lights/LightShadow.ts
import { Camera } from '../cameras/Camera';
import { Matrix4 } from '../math/Matrix4';
import { Vector2 } from '../math/Vector2';
import { WebGLRenderTarget } from '../renderers/WebGLRenderTarget';

export class LightShadow {
  // 阴影相机
  camera: Camera;
  
  // 阴影偏移
  bias = 0;
  normalBias = 0;
  
  // 阴影半径（用于 PCF）
  radius = 1;
  
  // 模糊采样数
  blurSamples = 8;
  
  // 阴影贴图尺寸
  mapSize = new Vector2(512, 512);
  
  // 阴影贴图
  map: WebGLRenderTarget | null = null;
  
  // 光源空间矩阵
  matrix = new Matrix4();
  
  // 是否需要更新
  autoUpdate = true;
  needsUpdate = false;
  
  constructor(camera: Camera) {
    this.camera = camera;
  }
  
  // 获取视锥体边界
  getFrameExtents(): Vector2 {
    return new Vector2(1, 1);
  }
  
  // 更新矩阵
  updateMatrices(light: Light): void {
    const shadowCamera = this.camera;
    const shadowMatrix = this.matrix;
    
    // 更新阴影相机矩阵
    shadowCamera.position.setFromMatrixPosition(light.matrixWorld);
    shadowCamera.updateMatrixWorld();
    
    // 阴影矩阵 = bias * projection * view
    shadowMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    
    shadowMatrix.multiply(shadowCamera.projectionMatrix);
    shadowMatrix.multiply(shadowCamera.matrixWorldInverse);
  }
  
  // 创建阴影贴图
  getViewport(viewportIndex: number): Vector2 {
    return new Vector2(0, 0);
  }
  
  dispose(): void {
    if (this.map) {
      this.map.dispose();
    }
  }
  
  copy(source: LightShadow): this {
    this.camera = source.camera.clone();
    
    this.bias = source.bias;
    this.normalBias = source.normalBias;
    this.radius = source.radius;
    this.blurSamples = source.blurSamples;
    
    this.mapSize.copy(source.mapSize);
    
    return this;
  }
  
  clone(): LightShadow {
    return new (this.constructor as any)().copy(this);
  }
}
```

## 光源 Uniform 结构

```typescript
// src/renderers/shaders/UniformsLib.ts

// 光源 uniform 定义
const lightsUniform = {
  // 环境光
  ambientLightColor: { value: [] },
  
  // 方向光
  directionalLights: {
    value: [],
    properties: {
      direction: {},
      color: {},
    }
  },
  
  directionalLightShadows: {
    value: [],
    properties: {
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {},
    }
  },
  
  directionalShadowMap: { value: [] },
  directionalShadowMatrix: { value: [] },
  
  // 点光源
  pointLights: {
    value: [],
    properties: {
      color: {},
      position: {},
      decay: {},
      distance: {},
    }
  },
  
  pointLightShadows: {
    value: [],
    properties: {
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {},
      shadowCameraNear: {},
      shadowCameraFar: {},
    }
  },
  
  pointShadowMap: { value: [] },
  pointShadowMatrix: { value: [] },
  
  // 聚光灯
  spotLights: {
    value: [],
    properties: {
      color: {},
      position: {},
      direction: {},
      distance: {},
      coneCos: {},
      penumbraCos: {},
      decay: {},
    }
  },
  
  spotLightShadows: {
    value: [],
    properties: {
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {},
    }
  },
  
  spotShadowMap: { value: [] },
  spotShadowMatrix: { value: [] },
  
  // 半球光
  hemisphereLights: {
    value: [],
    properties: {
      direction: {},
      skyColor: {},
      groundColor: {},
    }
  },
  
  // 矩形区域光
  rectAreaLights: {
    value: [],
    properties: {
      color: {},
      position: {},
      width: {},
      height: {},
    }
  },
};
```

## 光源着色器 Chunks

### 光源参数声明

```glsl
// lights_pars_begin.glsl

// 环境光
uniform vec3 ambientLightColor;

// 方向光结构
struct DirectionalLight {
    vec3 direction;
    vec3 color;
};

uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];

// 点光源结构
struct PointLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
};

uniform PointLight pointLights[NUM_POINT_LIGHTS];

// 聚光灯结构
struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 color;
    float distance;
    float decay;
    float coneCos;
    float penumbraCos;
};

uniform SpotLight spotLights[NUM_SPOT_LIGHTS];

// 半球光结构
struct HemisphereLight {
    vec3 direction;
    vec3 skyColor;
    vec3 groundColor;
};

uniform HemisphereLight hemisphereLights[NUM_HEMI_LIGHTS];

// 矩形区域光结构
struct RectAreaLight {
    vec3 color;
    vec3 position;
    vec3 halfWidth;
    vec3 halfHeight;
};

uniform RectAreaLight rectAreaLights[NUM_RECT_AREA_LIGHTS];
```

### 光源计算函数

```glsl
// lights_lambert_pars_fragment.glsl

// Lambert 光照计算
void RE_Direct_Lambert(
    const in IncidentLight directLight,
    const in vec3 geometryNormal,
    const in vec3 geometryViewDir,
    const in vec3 diffuseColor,
    inout ReflectedLight reflectedLight
) {
    float dotNL = saturate(dot(geometryNormal, directLight.direction));
    vec3 irradiance = dotNL * directLight.color;
    
    reflectedLight.directDiffuse += irradiance * BRDF_Lambert(diffuseColor);
}

// 环境光
void RE_IndirectDiffuse_Lambert(
    const in vec3 irradiance,
    const in vec3 diffuseColor,
    inout ReflectedLight reflectedLight
) {
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(diffuseColor);
}
```

## 使用示例

```typescript
// 基础光源设置
const scene = new Scene();

// 添加环境光
const ambient = new AmbientLight(0x404040, 0.5);
scene.add(ambient);

// 添加方向光
const directional = new DirectionalLight(0xffffff, 1);
directional.position.set(5, 10, 5);
directional.castShadow = true;
directional.shadow.mapSize.set(2048, 2048);
scene.add(directional);

// 添加点光源
const point = new PointLight(0xff0000, 1, 100, 2);
point.position.set(0, 5, 0);
scene.add(point);

// 添加聚光灯
const spot = new SpotLight(0x00ff00, 1, 50, Math.PI / 6, 0.5, 2);
spot.position.set(-5, 10, 0);
spot.target.position.set(0, 0, 0);
scene.add(spot);
scene.add(spot.target);
```

## 光源限制

```typescript
// WebGL 对 uniform 数量有限制
// Three.js 默认限制

const maxLights = {
  directional: 4,
  point: 4,
  spot: 4,
  hemisphere: 2,
  rectArea: 4,
};

// 超过限制时需要使用 deferred rendering 或其他技术
```

## 本章小结

- Light 是所有光源的基类
- LightShadow 管理阴影配置
- 光源数据通过 uniform 传递到着色器
- WebGL 对光源数量有限制
- 每种光源类型有特定的属性和行为

下一章，我们将学习 AmbientLight 环境光。
