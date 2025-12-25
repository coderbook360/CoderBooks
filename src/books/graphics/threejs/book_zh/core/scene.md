# Scene 类详细实现

> "Scene 是 3D 世界的容器，定义了渲染的范围和环境。"

## Scene 结构

```
Scene extends Object3D
├── background (Color | Texture | CubeTexture)
├── environment (Texture)
├── fog (Fog | FogExp2)
├── backgroundBlurriness (number)
├── backgroundIntensity (number)
├── environmentIntensity (number)
├── environmentRotation (Euler)
└── overrideMaterial (Material)
```

## 完整实现

```typescript
// src/scenes/Scene.ts
import { Object3D } from '../core/Object3D';
import { Color } from '../math/Color';
import { Euler } from '../math/Euler';

export class Scene extends Object3D {
  readonly isScene = true;
  type = 'Scene';
  
  background: Color | Texture | CubeTexture | null;
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
  
  copy(source: Scene, recursive?: boolean): this {
    super.copy(source, recursive);
    
    if (source.background !== null) {
      this.background = source.background.clone();
    }
    
    if (source.environment !== null) {
      this.environment = source.environment.clone();
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
    
    if (this.fog !== null) data.object.fog = this.fog.toJSON();
    
    if (this.backgroundBlurriness > 0) {
      data.object.backgroundBlurriness = this.backgroundBlurriness;
    }
    if (this.backgroundIntensity !== 1) {
      data.object.backgroundIntensity = this.backgroundIntensity;
    }
    if (this.environmentIntensity !== 1) {
      data.object.environmentIntensity = this.environmentIntensity;
    }
    
    return data;
  }
}
```

## 背景设置

### 纯色背景

```typescript
const scene = new Scene();

// 使用 Color 对象
scene.background = new Color(0x87ceeb); // 天蓝色

// 使用 CSS 颜色字符串
scene.background = new Color('skyblue');

// 使用 RGB
scene.background = new Color(0.53, 0.81, 0.92);
```

### 纹理背景

```typescript
const loader = new TextureLoader();

// 2D 纹理背景
loader.load('background.jpg', (texture) => {
  scene.background = texture;
});

// 天空盒（6 面立方体纹理）
const cubeLoader = new CubeTextureLoader();
scene.background = cubeLoader.load([
  'px.jpg', 'nx.jpg',  // positive/negative X
  'py.jpg', 'ny.jpg',  // positive/negative Y
  'pz.jpg', 'nz.jpg',  // positive/negative Z
]);
```

### 背景参数

```typescript
// 背景模糊度（0-1）
scene.backgroundBlurriness = 0.5;

// 背景强度
scene.backgroundIntensity = 0.8;

// 背景旋转（仅对环境贴图有效）
scene.backgroundRotation.y = Math.PI / 4;
```

## 环境光照

### 环境贴图

```typescript
// HDR 环境贴图
const rgbeLoader = new RGBELoader();
rgbeLoader.load('environment.hdr', (texture) => {
  texture.mapping = EquirectangularReflectionMapping;
  
  scene.environment = texture;
  scene.background = texture; // 也可用作背景
});
```

### 环境参数

```typescript
// 环境光强度
scene.environmentIntensity = 1.5;

// 环境旋转
scene.environmentRotation.y = Math.PI / 2;
```

### 渲染器中的处理

```typescript
// WebGLRenderer 中
function setEnvironment(scene: Scene): void {
  const environment = scene.environment;
  
  if (environment) {
    // 上传环境贴图
    const envMap = textures.get(environment);
    
    // 设置全局环境 uniform
    uniforms.envMap.value = envMap;
    uniforms.envMapIntensity.value = scene.environmentIntensity;
  }
}
```

## Fog 系统

### 线性雾

```typescript
// src/scenes/Fog.ts
import { Color } from '../math/Color';

export class Fog {
  readonly isFog = true;
  name: string;
  color: Color;
  near: number;
  far: number;
  
  constructor(
    color: ColorRepresentation,
    near = 1,
    far = 1000
  ) {
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

### 指数雾

```typescript
// src/scenes/FogExp2.ts
import { Color } from '../math/Color';

export class FogExp2 {
  readonly isFogExp2 = true;
  name: string;
  color: Color;
  density: number;
  
  constructor(color: ColorRepresentation, density = 0.00025) {
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

### 雾着色器

```glsl
// 顶点着色器
varying float vFogDepth;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}

// 片段着色器
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float fogDensity;

varying float vFogDepth;

void main() {
  vec4 color = /* 物体颜色计算 */;
  
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      // 指数雾
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      // 线性雾
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    
    color.rgb = mix(color.rgb, fogColor, fogFactor);
  #endif
  
  gl_FragColor = color;
}
```

### 使用示例

```typescript
// 线性雾
scene.fog = new Fog(0xcccccc, 10, 100);

// 指数雾
scene.fog = new FogExp2(0xcccccc, 0.01);

// 更新雾参数
scene.fog.color.setHex(0x000000);
scene.fog.near = 5;
scene.fog.far = 50;
```

## 材质覆盖

```typescript
// 深度可视化
const depthMaterial = new MeshDepthMaterial();
scene.overrideMaterial = depthMaterial;

// 法线可视化
const normalMaterial = new MeshNormalMaterial();
scene.overrideMaterial = normalMaterial;

// 取消覆盖
scene.overrideMaterial = null;
```

### 渲染器中的处理

```typescript
function renderScene(scene: Scene, camera: Camera): void {
  const overrideMaterial = scene.overrideMaterial;
  
  scene.traverse((object) => {
    if (object.isMesh) {
      const material = overrideMaterial || object.material;
      renderObject(object, material, camera);
    }
  });
}
```

## 场景管理

### 场景切换

```typescript
class SceneManager {
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  
  addScene(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
  }
  
  switchTo(name: string): void {
    const scene = this.scenes.get(name);
    
    if (scene) {
      // 卸载当前场景
      if (this.currentScene) {
        this.unloadScene(this.currentScene);
      }
      
      // 加载新场景
      this.loadScene(scene);
      this.currentScene = scene;
    }
  }
  
  private loadScene(scene: Scene): void {
    // 预编译材质
    scene.traverse((object) => {
      if (object.isMesh) {
        renderer.compile(scene, camera);
      }
    });
  }
  
  private unloadScene(scene: Scene): void {
    // 清理资源
    scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();
        
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
```

### 层级查询

```typescript
// 按名称查找
const player = scene.getObjectByName('player');

// 按类型查找
const meshes: Mesh[] = [];
scene.traverse((object) => {
  if (object.isMesh) {
    meshes.push(object);
  }
});

// 按标签查找
function findByTag(scene: Scene, tag: string): Object3D[] {
  const result: Object3D[] = [];
  
  scene.traverse((object) => {
    if (object.userData.tag === tag) {
      result.push(object);
    }
  });
  
  return result;
}

const enemies = findByTag(scene, 'enemy');
```

### 场景序列化

```typescript
// 导出
const json = scene.toJSON();
const jsonString = JSON.stringify(json);

// 导入
const loader = new ObjectLoader();
const loadedScene = loader.parse(JSON.parse(jsonString));
```

## 本章小结

- Scene 继承自 Object3D，是根节点
- 支持颜色、纹理、立方体纹理背景
- environment 用于 PBR 环境光照
- Fog 和 FogExp2 实现雾效
- overrideMaterial 覆盖所有对象材质
- 支持场景切换和资源管理

下一章，我们将学习 Group 辅助类。
