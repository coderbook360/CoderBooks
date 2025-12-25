# RGBELoader 和 HDR 加载

> "HDR 环境贴图是实现真实感光照的关键。"

## HDR 概述

HDR（High Dynamic Range）纹理存储超过标准 0-1 范围的亮度值，能够表现真实世界的光照变化。

```
HDR 与 LDR 对比：

LDR (标准图像)           HDR (高动态范围)
────────────────────────────────────────
0.0 - 1.0 范围           0.0 - ∞ 范围
8-bit 每通道            16/32-bit 每通道
无法表现太阳亮度         真实亮度比例
色调映射后的结果         原始光照信息

       ┌──────────────────┐
 LDR   │▓▓▓▓▓▓░░░░░░░░░░░░│  0-1
       └──────────────────┘
       
       ┌──────────────────────────────────┐
 HDR   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░│  0-∞
       └──────────────────────────────────┘
```

## RGBELoader 使用

```typescript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const loader = new RGBELoader();

// 基本加载
loader.load(
  'environment.hdr',
  (texture) => {
    // 设置映射类型
    texture.mapping = EquirectangularReflectionMapping;
    
    // 作为场景背景
    scene.background = texture;
    
    // 作为环境光照
    scene.environment = texture;
  },
  (progress) => {
    console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
  },
  (error) => {
    console.error('Error loading HDR:', error);
  }
);

// Promise 方式
async function loadHDR(url: string): Promise<DataTexture> {
  const loader = new RGBELoader();
  const texture = await loader.loadAsync(url);
  texture.mapping = EquirectangularReflectionMapping;
  return texture;
}
```

## PMREM 环境预处理

PMREMGenerator 将等距柱状投影 HDR 转换为预过滤的 Mipmap 立方体贴图。

```typescript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

async function loadHDREnvironment(
  renderer: WebGLRenderer,
  url: string
): Promise<Texture> {
  // 创建 PMREM 生成器
  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  
  // 加载 HDR
  const rgbeLoader = new RGBELoader();
  const texture = await rgbeLoader.loadAsync(url);
  
  // 生成预过滤环境贴图
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  
  // 清理
  texture.dispose();
  pmremGenerator.dispose();
  
  return envMap;
}

// 使用
const envMap = await loadHDREnvironment(renderer, 'studio.hdr');
scene.environment = envMap;

// 可选：作为背景（需要原始纹理）
const background = await new RGBELoader().loadAsync('studio.hdr');
background.mapping = EquirectangularReflectionMapping;
scene.background = background;
```

## EXRLoader 使用

EXR（OpenEXR）是电影工业标准的 HDR 格式。

```typescript
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

const loader = new EXRLoader();

// 设置数据类型
loader.setDataType(FloatType); // 或 HalfFloatType

loader.load(
  'environment.exr',
  (texture) => {
    texture.mapping = EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  }
);

// 加载带预处理
async function loadEXREnvironment(
  renderer: WebGLRenderer,
  url: string
): Promise<Texture> {
  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  
  const exrLoader = new EXRLoader();
  exrLoader.setDataType(HalfFloatType);
  
  const texture = await exrLoader.loadAsync(url);
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  
  texture.dispose();
  pmremGenerator.dispose();
  
  return envMap;
}
```

## 立方体贴图加载

```typescript
import { CubeTextureLoader } from 'three';

// 加载 6 面立方体贴图
const cubeLoader = new CubeTextureLoader();
cubeLoader.setPath('textures/cube/');

const cubeTexture = cubeLoader.load([
  'px.jpg', // +X (right)
  'nx.jpg', // -X (left)
  'py.jpg', // +Y (top)
  'ny.jpg', // -Y (bottom)
  'pz.jpg', // +Z (front)
  'nz.jpg', // -Z (back)
]);

scene.background = cubeTexture;
scene.environment = cubeTexture;

// HDR 立方体贴图
import { HDRCubeTextureLoader } from 'three/addons/loaders/HDRCubeTextureLoader.js';

const hdrCubeLoader = new HDRCubeTextureLoader();
hdrCubeLoader.setPath('textures/cube/hdr/');

const hdrCubeTexture = hdrCubeLoader.load(
  ['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr'],
  (texture) => {
    scene.background = texture;
    scene.environment = texture;
  }
);
```

## 环境贴图生成

```typescript
// 从场景生成环境贴图
function createEnvironmentFromScene(
  renderer: WebGLRenderer,
  scene: Scene,
  position: Vector3 = new Vector3()
): Texture {
  const cubeRenderTarget = new WebGLCubeRenderTarget(256);
  
  const cubeCamera = new CubeCamera(0.1, 1000, cubeRenderTarget);
  cubeCamera.position.copy(position);
  
  // 渲染立方体贴图
  cubeCamera.update(renderer, scene);
  
  return cubeRenderTarget.texture;
}

// 实时环境反射
class RealtimeEnvMap {
  private cubeCamera: CubeCamera;
  private cubeRenderTarget: WebGLCubeRenderTarget;
  
  constructor(resolution = 256) {
    this.cubeRenderTarget = new WebGLCubeRenderTarget(resolution, {
      format: RGBAFormat,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
    });
    
    this.cubeCamera = new CubeCamera(0.1, 1000, this.cubeRenderTarget);
  }
  
  update(renderer: WebGLRenderer, scene: Scene, position: Vector3): void {
    this.cubeCamera.position.copy(position);
    this.cubeCamera.update(renderer, scene);
  }
  
  getTexture(): Texture {
    return this.cubeRenderTarget.texture;
  }
  
  dispose(): void {
    this.cubeRenderTarget.dispose();
  }
}

// 使用
const envMap = new RealtimeEnvMap(512);
const reflectiveSphere = new Mesh(
  new SphereGeometry(1, 32, 32),
  new MeshStandardMaterial({
    metalness: 1,
    roughness: 0,
    envMap: envMap.getTexture(),
  })
);

function animate() {
  // 隐藏反射物体，更新环境贴图
  reflectiveSphere.visible = false;
  envMap.update(renderer, scene, reflectiveSphere.position);
  reflectiveSphere.visible = true;
  
  renderer.render(scene, camera);
}
```

## 环境强度控制

```typescript
// 控制环境贴图强度
scene.environment = envMap;

// 材质级别控制
const material = new MeshStandardMaterial({
  envMapIntensity: 1.5, // 增强反射
});

// 全局环境强度
function setGlobalEnvIntensity(scene: Scene, intensity: number): void {
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      const material = object.material as MeshStandardMaterial;
      if (material.envMapIntensity !== undefined) {
        material.envMapIntensity = intensity;
      }
    }
  });
}

// 旋转环境贴图
function rotateEnvironment(texture: Texture, rotation: number): void {
  // 对于等距柱状投影贴图
  texture.offset.x = rotation / (2 * Math.PI);
  texture.needsUpdate = true;
}
```

## 环境贴图类型选择

```
环境贴图类型：

类型                  用途              质量    文件大小
───────────────────────────────────────────────────────
等距柱状 HDR          主流环境贴图      高      中
等距柱状 EXR          高端制作          最高    大
立方体贴图 JPG        低端设备/背景     中      小
HDR 立方体贴图        平衡方案          高      中
预过滤 PMREM         PBR 材质          最高    -

映射方式：
EquirectangularReflectionMapping  等距柱状反射
EquirectangularRefractionMapping  等距柱状折射
CubeReflectionMapping            立方体反射
CubeRefractionMapping            立方体折射
```

## 环境贴图预加载

```typescript
class EnvironmentManager {
  private loader = new RGBELoader();
  private pmremGenerator: PMREMGenerator;
  private cache = new Map<string, Texture>();
  
  constructor(renderer: WebGLRenderer) {
    this.pmremGenerator = new PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
  }
  
  async load(url: string): Promise<Texture> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    const texture = await this.loader.loadAsync(url);
    const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
    texture.dispose();
    
    this.cache.set(url, envMap);
    return envMap;
  }
  
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.load(url)));
  }
  
  get(url: string): Texture | undefined {
    return this.cache.get(url);
  }
  
  async setEnvironment(scene: Scene, url: string): Promise<void> {
    const envMap = await this.load(url);
    scene.environment = envMap;
  }
  
  dispose(): void {
    for (const texture of this.cache.values()) {
      texture.dispose();
    }
    this.cache.clear();
    this.pmremGenerator.dispose();
  }
}

// 使用
const envManager = new EnvironmentManager(renderer);

// 预加载多个环境
await envManager.preload([
  'environments/studio.hdr',
  'environments/outdoor.hdr',
  'environments/night.hdr',
]);

// 切换环境
await envManager.setEnvironment(scene, 'environments/outdoor.hdr');
```

## 本章小结

- RGBELoader 加载 .hdr 格式环境贴图
- EXRLoader 加载高端 .exr 格式
- PMREMGenerator 预处理 PBR 所需的环境贴图
- CubeTextureLoader 加载传统立方体贴图
- 可以从场景实时生成环境贴图
- 使用缓存避免重复加载

下一章，我们将学习字体和音频加载器。
