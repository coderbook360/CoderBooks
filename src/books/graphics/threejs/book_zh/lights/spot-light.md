# SpotLight 聚光灯

> "聚光灯从单点沿特定方向发射锥形光线，适合模拟舞台灯、手电筒等。"

## 聚光灯特点

```
SpotLight
├── 锥形光线
│   ├── angle（锥角）
│   └── penumbra（半影）
├── 距离衰减
│   ├── distance
│   └── decay
├── 目标指向
│   └── target
├── 阴影
│   └── 透视投影阴影贴图
└── 用途
    ├── 舞台灯
    ├── 手电筒
    ├── 车灯
    └── 聚焦照明
```

## 完整实现

```typescript
// src/lights/SpotLight.ts
import { Light } from './Light';
import { Object3D } from '../core/Object3D';
import { SpotLightShadow } from './SpotLightShadow';
import { ColorRepresentation } from '../math/Color';

export class SpotLight extends Light {
  readonly isSpotLight = true;
  readonly type = 'SpotLight';
  
  // 目标
  target: Object3D;
  
  // 光照范围
  distance: number;
  decay: number;
  
  // 锥角（弧度）
  angle: number;
  
  // 半影（0-1）
  penumbra: number;
  
  // 阴影
  shadow: SpotLightShadow;
  
  // 光域网贴图
  map: Texture | null = null;
  
  constructor(
    color?: ColorRepresentation,
    intensity: number = 1,
    distance: number = 0,
    angle: number = Math.PI / 3,
    penumbra: number = 0,
    decay: number = 2
  ) {
    super(color, intensity);
    
    // 默认位置
    this.position.copy(Object3D.DEFAULT_UP);
    this.updateMatrix();
    
    this.target = new Object3D();
    
    this.distance = distance;
    this.decay = decay;
    this.angle = angle;
    this.penumbra = penumbra;
    
    this.shadow = new SpotLightShadow();
  }
  
  // 获取光照功率
  get power(): number {
    // 聚光灯功率 = intensity × π × angle²
    return this.intensity * Math.PI * (1 - Math.cos(this.angle));
  }
  
  set power(power: number) {
    this.intensity = power / (Math.PI * (1 - Math.cos(this.angle)));
  }
  
  dispose(): void {
    this.shadow.dispose();
  }
  
  copy(source: SpotLight, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.distance = source.distance;
    this.decay = source.decay;
    this.angle = source.angle;
    this.penumbra = source.penumbra;
    
    this.target = source.target.clone();
    this.shadow = source.shadow.clone();
    
    this.map = source.map;
    
    return this;
  }
}
```

## SpotLightShadow

```typescript
// src/lights/SpotLightShadow.ts
import { LightShadow } from './LightShadow';
import { PerspectiveCamera } from '../cameras/PerspectiveCamera';
import { MathUtils } from '../math/MathUtils';

export class SpotLightShadow extends LightShadow {
  readonly isSpotLightShadow = true;
  
  // 焦点（用于聚焦阴影）
  focus = 1;
  
  constructor() {
    // 聚光灯使用透视相机
    super(new PerspectiveCamera(50, 1, 0.5, 500));
  }
  
  updateMatrices(light: SpotLight): void {
    const camera = this.camera as PerspectiveCamera;
    
    // FOV 基于聚光灯角度
    const fov = MathUtils.RAD2DEG * 2 * light.angle * this.focus;
    
    // 远裁剪面基于距离
    const far = light.distance || camera.far;
    
    if (fov !== camera.fov || far !== camera.far) {
      camera.fov = fov;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    
    // 更新相机位置和朝向
    camera.position.setFromMatrixPosition(light.matrixWorld);
    
    _lookTarget.setFromMatrixPosition(light.target.matrixWorld);
    camera.lookAt(_lookTarget);
    camera.updateMatrixWorld();
    
    // 阴影矩阵
    this.matrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    
    this.matrix.multiply(camera.projectionMatrix);
    this.matrix.multiply(camera.matrixWorldInverse);
  }
}

const _lookTarget = new Vector3();
```

## 着色器实现

```glsl
// spot_light.glsl

// 聚光灯结构
struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 color;
    float distance;
    float decay;
    float coneCos;      // cos(angle)
    float penumbraCos;  // cos(angle * (1 - penumbra))
};

#if NUM_SPOT_LIGHTS > 0
uniform SpotLight spotLights[NUM_SPOT_LIGHTS];
#endif

// 聚光灯衰减
float getSpotAttenuation(float coneCos, float penumbraCos, float angleCos) {
    // 平滑过渡（半影效果）
    return smoothstep(coneCos, penumbraCos, angleCos);
}

// 获取聚光灯入射信息
void getSpotLightInfo(
    const in SpotLight spotLight,
    const in vec3 geometryPosition,
    out IncidentLight light
) {
    vec3 lVector = spotLight.position - geometryPosition;
    float lightDistance = length(lVector);
    
    light.direction = normalize(lVector);
    
    // 计算角度衰减
    float angleCos = dot(light.direction, spotLight.direction);
    float spotAttenuation = getSpotAttenuation(
        spotLight.coneCos,
        spotLight.penumbraCos,
        angleCos
    );
    
    if (spotAttenuation > 0.0) {
        // 距离衰减
        float distanceAttenuation = getDistanceAttenuation(
            lightDistance,
            spotLight.distance,
            spotLight.decay
        );
        
        light.color = spotLight.color * spotAttenuation * distanceAttenuation;
        light.visible = true;
    } else {
        light.color = vec3(0.0);
        light.visible = false;
    }
}

// 计算聚光灯贡献
void RE_Direct_Spot(
    const in SpotLight spotLight,
    const in vec3 geometryPosition,
    const in vec3 geometryNormal,
    const in vec3 geometryViewDir,
    const in PhysicalMaterial material,
    inout ReflectedLight reflectedLight
) {
    IncidentLight light;
    getSpotLightInfo(spotLight, geometryPosition, light);
    
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

### 光域网贴图

```glsl
// spot_light_map.glsl

#ifdef USE_SPOTLIGHTMAP

uniform sampler2D spotLightMap[NUM_SPOT_LIGHTS];
uniform mat4 spotLightMatrix[NUM_SPOT_LIGHTS];

vec3 getSpotLightMapColor(
    int index,
    vec3 worldPosition
) {
    vec4 spotLightCoord = spotLightMatrix[index] * vec4(worldPosition, 1.0);
    
    if (spotLightCoord.z > 0.0) {
        vec2 uv = spotLightCoord.xy / spotLightCoord.w * 0.5 + 0.5;
        
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
            return texture2D(spotLightMap[index], uv).rgb;
        }
    }
    
    return vec3(0.0);
}

#endif
```

## 使用示例

### 基本用法

```typescript
// 创建聚光灯
const spotLight = new SpotLight(
  0xffffff,           // 颜色
  1,                  // 强度
  100,                // 距离
  Math.PI / 6,        // 角度（30度）
  0.5,                // 半影
  2                   // 衰减
);

spotLight.position.set(0, 10, 0);
scene.add(spotLight);

// 添加目标
scene.add(spotLight.target);
spotLight.target.position.set(0, 0, 0);
```

### 阴影配置

```typescript
// 启用阴影
spotLight.castShadow = true;

// 阴影贴图大小
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

// 阴影相机
spotLight.shadow.camera.near = 0.5;
spotLight.shadow.camera.far = 100;

// 阴影偏移
spotLight.shadow.bias = -0.0001;
spotLight.shadow.normalBias = 0.02;

// PCF 半径
spotLight.shadow.radius = 1;

// 聚焦（调整阴影视野）
spotLight.shadow.focus = 1;
```

### 舞台灯效果

```typescript
// 舞台灯光系统
class StageLighting {
  private lights: SpotLight[] = [];
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.createStageLights();
  }
  
  private createStageLights(): void {
    // 创建多个聚光灯
    const positions = [
      { x: -5, y: 10, z: 5 },
      { x: 0, y: 10, z: 5 },
      { x: 5, y: 10, z: 5 },
    ];
    
    const colors = [0xff0000, 0x00ff00, 0x0000ff];
    
    positions.forEach((pos, i) => {
      const light = new SpotLight(
        colors[i],
        2,
        50,
        Math.PI / 8,  // 22.5度
        0.3,
        2
      );
      
      light.position.set(pos.x, pos.y, pos.z);
      light.target.position.set(0, 0, 0);
      
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      
      this.scene.add(light);
      this.scene.add(light.target);
      this.lights.push(light);
    });
  }
  
  // 灯光追踪动画
  public followTarget(target: Vector3): void {
    this.lights.forEach(light => {
      light.target.position.copy(target);
    });
  }
  
  // 颜色循环
  public colorCycle(time: number): void {
    this.lights.forEach((light, i) => {
      const hue = (time * 0.0001 + i / this.lights.length) % 1;
      light.color.setHSL(hue, 1, 0.5);
    });
  }
}
```

### 手电筒效果

```typescript
class Flashlight {
  private light: SpotLight;
  private camera: Camera;
  
  constructor(camera: Camera, scene: Scene) {
    this.camera = camera;
    
    // 创建手电筒光源
    this.light = new SpotLight(
      0xffffee,
      2,
      30,
      Math.PI / 10,  // 18度
      0.2,
      2
    );
    
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(512, 512);
    this.light.shadow.camera.near = 0.1;
    this.light.shadow.camera.far = 30;
    
    scene.add(this.light);
    scene.add(this.light.target);
  }
  
  update(): void {
    // 跟随相机
    this.light.position.copy(this.camera.position);
    
    // 获取相机朝向
    const direction = new Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    
    // 设置目标位置
    this.light.target.position.copy(this.camera.position).add(direction);
  }
  
  toggle(on: boolean): void {
    this.light.visible = on;
  }
  
  setIntensity(intensity: number): void {
    this.light.intensity = intensity;
  }
}
```

### 光域网（IES）

```typescript
// 使用光域网贴图
const loader = new TextureLoader();
const iesTexture = loader.load('/textures/ies_profile.png');

const spotLight = new SpotLight(0xffffff, 1);
spotLight.map = iesTexture;
spotLight.castShadow = true;
scene.add(spotLight);
```

## 聚光灯参数可视化

```
angle（锥角）:
                ╱╲
               ╱  ╲  angle
              ╱────╲────→
             ╱      ╲
            ╱        ╲

penumbra（半影）:
        penumbra = 0          penumbra = 0.5
        ┌────────────┐        ┌────────────┐
        │████████████│        │▓▓▓█████▓▓▓│
        │████████████│        │▓▓▓█████▓▓▓│
        └────────────┘        └────────────┘
        硬边缘               软边缘（渐变）

coneCos 和 penumbraCos:
    coneCos = cos(angle)
    penumbraCos = cos(angle × (1 - penumbra))
    
    当 angleCos < coneCos: 完全在外
    当 angleCos > penumbraCos: 完全在内
    当 coneCos < angleCos < penumbraCos: 半影区
```

## 辅助工具

```typescript
// 聚光灯辅助线
const spotLightHelper = new SpotLightHelper(spotLight);
scene.add(spotLightHelper);

// 需要在渲染循环中更新
function animate() {
  spotLightHelper.update();
  renderer.render(scene, camera);
}

// 阴影相机辅助
const shadowHelper = new CameraHelper(spotLight.shadow.camera);
scene.add(shadowHelper);
```

## 本章小结

- SpotLight 发射锥形光线
- angle 控制锥角大小
- penumbra 控制边缘柔软度
- target 决定照射方向
- 支持光域网贴图
- 阴影使用透视投影

下一章，我们将学习 HemisphereLight 半球光。
