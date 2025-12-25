# Scene 场景根节点

> "Scene 是 3D 世界的舞台，所有对象都在这里汇聚。"

## Scene 概述

### 职责

Scene（场景）是场景图的根节点，主要职责：
- 作为所有可渲染对象的容器
- 定义背景（颜色、天空盒）
- 定义环境光/环境贴图
- 定义雾效
- 管理覆盖材质

### 类继承

```
EventDispatcher
    └── Object3D
            └── Scene
```

## Scene 实现

### 基础结构

```typescript
// src/core/Scene.ts
import { Object3D } from './Object3D';
import { Color } from '../math/Color';
import { Fog } from './Fog';
import { FogExp2 } from './FogExp2';
import { Texture } from '../textures/Texture';
import { Material } from '../materials/Material';

export class Scene extends Object3D {
  readonly isScene = true;
  type = 'Scene';
  
  background: Color | Texture | null;
  environment: Texture | null;
  fog: Fog | FogExp2 | null;
  
  backgroundBlurriness: number;
  backgroundIntensity: number;
  backgroundRotation: Euler;
  
  environmentIntensity: number;
  environmentRotation: Euler;
  
  overrideMaterial: Material | null;
  
  constructor() {
    super();
    
    this.background = null;
    this.environment = null;
    this.fog = null;
    
    this.backgroundBlurriness = 0;
    this.backgroundIntensity = 1;
    this.backgroundRotation = new Euler();
    
    this.environmentIntensity = 1;
    this.environmentRotation = new Euler();
    
    this.overrideMaterial = null;
  }
  
  copy(source: Scene, recursive = true): this {
    super.copy(source, recursive);
    
    if (source.background !== null) {
      if (source.background instanceof Color) {
        this.background = source.background.clone();
      } else {
        this.background = source.background;
      }
    }
    
    if (source.environment !== null) {
      this.environment = source.environment;
    }
    
    if (source.fog !== null) {
      this.fog = source.fog.clone();
    }
    
    this.backgroundBlurriness = source.backgroundBlurriness;
    this.backgroundIntensity = source.backgroundIntensity;
    this.backgroundRotation.copy(source.backgroundRotation);
    
    this.environmentIntensity = source.environmentIntensity;
    this.environmentRotation.copy(source.environmentRotation);
    
    if (source.overrideMaterial !== null) {
      this.overrideMaterial = source.overrideMaterial.clone();
    }
    
    this.matrixAutoUpdate = source.matrixAutoUpdate;
    
    return this;
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    if (this.fog !== null) {
      data.object.fog = this.fog.toJSON();
    }
    
    if (this.backgroundBlurriness > 0) {
      data.object.backgroundBlurriness = this.backgroundBlurriness;
    }
    
    if (this.backgroundIntensity !== 1) {
      data.object.backgroundIntensity = this.backgroundIntensity;
    }
    
    if (this.backgroundRotation.x !== 0 || 
        this.backgroundRotation.y !== 0 || 
        this.backgroundRotation.z !== 0) {
      data.object.backgroundRotation = this.backgroundRotation.toArray();
    }
    
    if (this.environmentIntensity !== 1) {
      data.object.environmentIntensity = this.environmentIntensity;
    }
    
    if (this.environmentRotation.x !== 0 || 
        this.environmentRotation.y !== 0 || 
        this.environmentRotation.z !== 0) {
      data.object.environmentRotation = this.environmentRotation.toArray();
    }
    
    return data;
  }
}
```

## 背景

### 纯色背景

```typescript
const scene = new Scene();

// 设置纯色背景
scene.background = new Color(0x87ceeb);  // 天蓝色

// 或使用十六进制
scene.background = new Color('#87ceeb');

// 或使用 RGB
scene.background = new Color(0.53, 0.81, 0.92);
```

### 纹理背景

```typescript
// 2D 纹理背景
const loader = new TextureLoader();
scene.background = loader.load('background.jpg');

// 等距柱状投影全景图
scene.background = loader.load('panorama.jpg');
scene.background.mapping = EquirectangularReflectionMapping;
```

### 立方体贴图背景

```typescript
// 天空盒
const cubeLoader = new CubeTextureLoader();
scene.background = cubeLoader.load([
  'px.jpg', 'nx.jpg',  // 正X, 负X
  'py.jpg', 'ny.jpg',  // 正Y, 负Y
  'pz.jpg', 'nz.jpg',  // 正Z, 负Z
]);

// 背景模糊
scene.backgroundBlurriness = 0.5;  // 0-1

// 背景亮度
scene.backgroundIntensity = 0.8;
```

## 环境光

### 环境贴图

环境贴图用于 PBR 材质的环境反射和间接光照。

```typescript
// 加载 HDR 环境贴图
const rgbeLoader = new RGBELoader();
rgbeLoader.load('environment.hdr', (texture) => {
  texture.mapping = EquirectangularReflectionMapping;
  
  scene.environment = texture;
  scene.background = texture;  // 可选，也用作背景
});
```

### 环境强度

```typescript
// 调整环境光强度
scene.environmentIntensity = 1.5;

// 旋转环境贴图
scene.environmentRotation.y = Math.PI / 4;
```

## 雾效

### 线性雾

距离越远，颜色越接近雾色：

```typescript
// src/core/Fog.ts
export class Fog {
  readonly isFog = true;
  name: string;
  color: Color;
  near: number;
  far: number;
  
  constructor(color: number | Color, near = 1, far = 1000) {
    this.name = '';
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  }
  
  clone(): Fog {
    return new Fog(this.color, this.near, this.far);
  }
  
  toJSON(): any {
    return {
      type: 'Fog',
      name: this.name,
      color: this.color.getHex(),
      near: this.near,
      far: this.far,
    };
  }
}
```

雾效公式：

```
fogFactor = (far - distance) / (far - near)
finalColor = mix(objectColor, fogColor, fogFactor)
```

### 指数雾

更真实的大气散射效果：

```typescript
// src/core/FogExp2.ts
export class FogExp2 {
  readonly isFogExp2 = true;
  name: string;
  color: Color;
  density: number;
  
  constructor(color: number | Color, density = 0.00025) {
    this.name = '';
    this.color = new Color(color);
    this.density = density;
  }
  
  clone(): FogExp2 {
    return new FogExp2(this.color, this.density);
  }
  
  toJSON(): any {
    return {
      type: 'FogExp2',
      name: this.name,
      color: this.color.getHex(),
      density: this.density,
    };
  }
}
```

雾效公式：

```
fogFactor = 1.0 - exp(-density * density * distance * distance)
finalColor = mix(objectColor, fogColor, fogFactor)
```

### 使用雾效

```typescript
// 线性雾
scene.fog = new Fog(0xcccccc, 10, 100);

// 指数雾
scene.fog = new FogExp2(0xcccccc, 0.02);

// 雾效需要材质支持
material.fog = true;  // 默认为 true
```

## 覆盖材质

### 用途

强制场景中所有对象使用同一材质，常用于：
- 深度渲染
- 法线可视化
- 线框预览

```typescript
// 深度材质覆盖
scene.overrideMaterial = new MeshDepthMaterial();

// 法线材质覆盖
scene.overrideMaterial = new MeshNormalMaterial();

// 取消覆盖
scene.overrideMaterial = null;
```

### 在渲染器中使用

```typescript
function renderScene(scene: Scene, camera: Camera): void {
  const forceMaterial = scene.overrideMaterial;
  
  scene.traverseVisible((object) => {
    if (object instanceof Mesh) {
      const material = forceMaterial || object.material;
      renderObject(object, material, camera);
    }
  });
}
```

## 着色器实现

### 背景着色器

```glsl
// 顶点着色器
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}

// 片段着色器（纯色）
uniform vec3 backgroundColor;

void main() {
  gl_FragColor = vec4(backgroundColor, 1.0);
}

// 片段着色器（纹理）
uniform sampler2D backgroundTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(backgroundTexture, vUv);
}
```

### 雾效着色器

```glsl
// 线性雾
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

void applyFog(inout vec3 color, float distance) {
  float fogFactor = smoothstep(fogNear, fogFar, distance);
  color = mix(color, fogColor, fogFactor);
}

// 指数雾
uniform vec3 fogColor;
uniform float fogDensity;

void applyFog(inout vec3 color, float distance) {
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * distance * distance);
  color = mix(color, fogColor, saturate(fogFactor));
}
```

## 使用示例

### 完整场景设置

```typescript
// 创建场景
const scene = new Scene();

// 设置天蓝色背景
scene.background = new Color(0x87ceeb);

// 添加线性雾
scene.fog = new Fog(0xcccccc, 50, 200);

// 加载环境贴图
const pmremGenerator = new PMREMGenerator(renderer);
const hdriLoader = new RGBELoader();

hdriLoader.load('studio.hdr', (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  texture.dispose();
  pmremGenerator.dispose();
});

// 添加地面
const ground = new Mesh(
  new PlaneGeometry(100, 100),
  new MeshStandardMaterial({ color: 0x808080 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 添加物体
const sphere = new Mesh(
  new SphereGeometry(1, 32, 32),
  new MeshStandardMaterial({ 
    color: 0xff0000,
    metalness: 0.5,
    roughness: 0.5,
  })
);
sphere.position.y = 1;
scene.add(sphere);
```

### 动态背景

```typescript
// 渐变天空盒
function updateSkyColor(timeOfDay: number): void {
  const sunPosition = calculateSunPosition(timeOfDay);
  
  // 根据太阳位置调整天空颜色
  if (sunPosition.y > 0) {
    // 白天
    scene.background = new Color().setHSL(0.6, 0.6, 0.5 + sunPosition.y * 0.3);
  } else {
    // 夜晚
    scene.background = new Color(0x000033);
  }
  
  // 调整雾效颜色
  if (scene.fog) {
    scene.fog.color.copy(scene.background as Color);
  }
}
```

### 调试模式

```typescript
// 线框模式
function setWireframeMode(scene: Scene, enabled: boolean): void {
  if (enabled) {
    scene.overrideMaterial = new MeshBasicMaterial({
      wireframe: true,
      color: 0x00ff00,
    });
  } else {
    scene.overrideMaterial = null;
  }
}

// 法线可视化
function setNormalMode(scene: Scene, enabled: boolean): void {
  if (enabled) {
    scene.overrideMaterial = new MeshNormalMaterial();
  } else {
    scene.overrideMaterial = null;
  }
}
```

## Group 辅助类

Group 是一个轻量级的对象容器，没有自己的几何体和材质：

```typescript
// src/core/Group.ts
export class Group extends Object3D {
  readonly isGroup = true;
  type = 'Group';
  
  constructor() {
    super();
  }
}
```

使用示例：

```typescript
// 组织相关对象
const car = new Group();

const body = new Mesh(bodyGeometry, bodyMaterial);
const wheel1 = new Mesh(wheelGeometry, wheelMaterial);
const wheel2 = new Mesh(wheelGeometry, wheelMaterial);

car.add(body, wheel1, wheel2);
scene.add(car);

// 移动整辆车
car.position.x = 10;
```

## 本章小结

- Scene 是场景图的根节点
- 背景支持颜色、纹理和天空盒
- 环境贴图提供 PBR 反射和间接光
- 雾效增加场景深度感
- overrideMaterial 用于调试和特殊渲染
- Group 用于组织相关对象

下一章，我们将学习 BufferGeometry 的设计与实现。
