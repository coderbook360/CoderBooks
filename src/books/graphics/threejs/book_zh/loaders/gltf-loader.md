# GLTFLoader glTF 加载器

> "glTF 是 3D 界的 JPEG。"

## GLTFLoader 概述

GLTFLoader 是 Three.js 中最重要的模型加载器，支持加载 glTF 2.0 格式的 3D 模型，包括几何体、材质、纹理、动画和场景图。

```
GLTFLoader 功能：

┌─────────────────────────────────────┐
│           GLTFLoader               │
├─────────────────────────────────────┤
│  ✓ 网格和几何体                     │
│  ✓ PBR 材质                        │
│  ✓ 纹理（包括压缩纹理）             │
│  ✓ 骨骼动画                        │
│  ✓ 变形目标动画                     │
│  ✓ 场景层级                        │
│  ✓ 相机和灯光                      │
│  ✓ Draco 压缩                      │
│  ✓ KTX2 纹理                       │
│  ✓ 扩展支持                        │
└─────────────────────────────────────┘
```

## 基础使用

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// 回调方式
loader.load(
  'models/scene.glb',
  (gltf) => {
    // 成功回调
    scene.add(gltf.scene);
    
    // 访问动画
    const mixer = new AnimationMixer(gltf.scene);
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
  },
  (progress) => {
    // 进度回调
    const percent = (progress.loaded / progress.total * 100).toFixed(1);
    console.log(`Loading: ${percent}%`);
  },
  (error) => {
    // 错误回调
    console.error('Failed to load model:', error);
  }
);

// Promise 方式
async function loadModel() {
  const gltf = await loader.loadAsync('models/scene.glb');
  scene.add(gltf.scene);
  return gltf;
}
```

## GLTF 对象结构

```typescript
interface GLTF {
  // 场景根节点
  scene: Group;
  
  // 所有场景
  scenes: Group[];
  
  // 动画剪辑
  animations: AnimationClip[];
  
  // 相机
  cameras: Camera[];
  
  // 资源映射
  asset: {
    version: string;
    generator?: string;
    copyright?: string;
  };
  
  // 原始 JSON
  parser: GLTFParser;
  
  // 用户自定义数据
  userData: Record<string, unknown>;
}
```

## 配置压缩支持

### Draco 压缩

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/libs/draco/gltf/');
dracoLoader.setDecoderConfig({ type: 'js' }); // 'js' 或 'wasm'
dracoLoader.preload(); // 预加载解码器

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// 加载 Draco 压缩模型
const gltf = await gltfLoader.loadAsync('model-draco.glb');
```

### KTX2 纹理

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('/libs/basis/');
ktx2Loader.detectSupport(renderer);

const gltfLoader = new GLTFLoader();
gltfLoader.setKTX2Loader(ktx2Loader);

// 加载带 KTX2 纹理的模型
const gltf = await gltfLoader.loadAsync('model-ktx2.glb');
```

### Meshopt 压缩

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

const gltf = await gltfLoader.loadAsync('model-meshopt.glb');
```

## 处理加载的模型

### 遍历场景

```typescript
gltf.scene.traverse((child) => {
  if (child instanceof Mesh) {
    // 处理网格
    console.log('Mesh:', child.name);
    
    // 启用阴影
    child.castShadow = true;
    child.receiveShadow = true;
    
    // 访问材质
    if (child.material instanceof MeshStandardMaterial) {
      child.material.envMapIntensity = 1.0;
    }
  }
  
  if (child instanceof Bone) {
    // 处理骨骼
    console.log('Bone:', child.name);
  }
  
  if (child instanceof SkinnedMesh) {
    // 处理蒙皮网格
    console.log('SkinnedMesh:', child.name);
    child.frustumCulled = false;
  }
});
```

### 查找特定对象

```typescript
// 按名称查找
const wheel = gltf.scene.getObjectByName('Wheel_FL');

// 按类型查找
const meshes: Mesh[] = [];
gltf.scene.traverse((child) => {
  if (child instanceof Mesh) {
    meshes.push(child);
  }
});

// 按用户属性查找
function findByUserData(
  object: Object3D,
  key: string,
  value: unknown
): Object3D | undefined {
  if (object.userData[key] === value) {
    return object;
  }
  
  for (const child of object.children) {
    const result = findByUserData(child, key, value);
    if (result) return result;
  }
  
  return undefined;
}

const interactable = findByUserData(gltf.scene, 'interactive', true);
```

## 动画处理

```typescript
// 创建动画混合器
const mixer = new AnimationMixer(gltf.scene);

// 播放所有动画
gltf.animations.forEach((clip) => {
  const action = mixer.clipAction(clip);
  action.play();
});

// 播放特定动画
const idleClip = AnimationClip.findByName(gltf.animations, 'Idle');
if (idleClip) {
  const idleAction = mixer.clipAction(idleClip);
  idleAction.play();
}

// 更新循环中
function animate() {
  const delta = clock.getDelta();
  mixer.update(delta);
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// 动画控制
class AnimationController {
  private mixer: AnimationMixer;
  private actions = new Map<string, AnimationAction>();
  private currentAction?: AnimationAction;
  
  constructor(model: Group, animations: AnimationClip[]) {
    this.mixer = new AnimationMixer(model);
    
    animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    });
  }
  
  play(name: string, fadeTime = 0.3): void {
    const newAction = this.actions.get(name);
    if (!newAction) return;
    
    if (this.currentAction) {
      this.currentAction.fadeOut(fadeTime);
    }
    
    newAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(fadeTime)
      .play();
    
    this.currentAction = newAction;
  }
  
  update(delta: number): void {
    this.mixer.update(delta);
  }
  
  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
```

## 材质处理

```typescript
// 替换材质
gltf.scene.traverse((child) => {
  if (child instanceof Mesh) {
    // 替换为自定义材质
    child.material = new MeshStandardMaterial({
      map: child.material.map,
      normalMap: child.material.normalMap,
      roughness: 0.5,
      metalness: 0.8,
    });
  }
});

// 环境贴图
const envMap = await new RGBELoader().loadAsync('environment.hdr');
envMap.mapping = EquirectangularReflectionMapping;

gltf.scene.traverse((child) => {
  if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
    child.material.envMap = envMap;
    child.material.envMapIntensity = 1.0;
    child.material.needsUpdate = true;
  }
});

// 或使用场景环境
scene.environment = envMap;
```

## 多实例化

```typescript
// 创建多个模型实例
async function createInstances(
  url: string,
  count: number,
  positions: Vector3[]
): Promise<Group[]> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const instances: Group[] = [];
  
  for (let i = 0; i < count; i++) {
    // 克隆场景
    const instance = gltf.scene.clone();
    instance.position.copy(positions[i]);
    
    // 克隆动画
    if (gltf.animations.length > 0) {
      const mixer = new AnimationMixer(instance);
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip.clone()).play();
      });
      instance.userData.mixer = mixer;
    }
    
    instances.push(instance);
    scene.add(instance);
  }
  
  return instances;
}

// 使用 InstancedMesh 优化相同几何体
function createInstancedMeshes(
  gltf: GLTF,
  count: number,
  transforms: Matrix4[]
): InstancedMesh[] {
  const instancedMeshes: InstancedMesh[] = [];
  
  gltf.scene.traverse((child) => {
    if (child instanceof Mesh) {
      const instancedMesh = new InstancedMesh(
        child.geometry,
        child.material,
        count
      );
      
      transforms.forEach((matrix, i) => {
        instancedMesh.setMatrixAt(i, matrix);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMeshes.push(instancedMesh);
    }
  });
  
  return instancedMeshes;
}
```

## 加载优化

```typescript
// 预加载和缓存
class ModelCache {
  private cache = new Map<string, GLTF>();
  private loading = new Map<string, Promise<GLTF>>();
  private loader: GLTFLoader;
  
  constructor() {
    this.loader = new GLTFLoader();
    // 配置解码器...
  }
  
  async load(url: string): Promise<GLTF> {
    // 检查缓存
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    // 检查正在加载
    if (this.loading.has(url)) {
      return this.loading.get(url)!;
    }
    
    // 开始加载
    const promise = this.loader.loadAsync(url);
    this.loading.set(url, promise);
    
    const gltf = await promise;
    this.cache.set(url, gltf);
    this.loading.delete(url);
    
    return gltf;
  }
  
  // 预加载多个模型
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.load(url)));
  }
  
  // 获取克隆
  getClone(url: string): Group | null {
    const gltf = this.cache.get(url);
    return gltf ? gltf.scene.clone() : null;
  }
  
  dispose(url: string): void {
    const gltf = this.cache.get(url);
    if (gltf) {
      gltf.scene.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.cache.delete(url);
    }
  }
}
```

## 错误处理

```typescript
async function safeLoadModel(url: string): Promise<GLTF | null> {
  const loader = new GLTFLoader();
  
  try {
    const gltf = await loader.loadAsync(url);
    
    // 验证模型
    if (!gltf.scene) {
      console.error('Model has no scene');
      return null;
    }
    
    let hasMeshes = false;
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        hasMeshes = true;
      }
    });
    
    if (!hasMeshes) {
      console.warn('Model contains no meshes');
    }
    
    return gltf;
  } catch (error) {
    console.error(`Failed to load model: ${url}`, error);
    
    // 返回占位符
    const placeholder = new Group();
    placeholder.add(new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    ));
    
    return {
      scene: placeholder,
      scenes: [placeholder],
      animations: [],
      cameras: [],
      asset: { version: '2.0' },
      parser: {} as GLTFParser,
      userData: { error: true },
    };
  }
}
```

## 本章小结

- GLTFLoader 是加载 3D 模型的首选工具
- 支持 Draco、KTX2、meshopt 等压缩格式
- 可访问动画、材质、场景层级等完整数据
- 使用缓存和预加载优化性能
- 正确处理模型克隆和实例化

下一章，我们将学习 OBJ 和 FBX 等其他模型加载器。
