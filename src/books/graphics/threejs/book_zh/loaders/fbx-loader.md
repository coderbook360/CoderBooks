# FBXLoader FBX 加载器

> "FBX 是专业动画软件的标准交换格式。"

## FBX 格式概述

FBX（Filmbox）是 Autodesk 开发的专有 3D 格式，广泛用于游戏和影视行业。

```
FBX 格式特点：

优点：
✓ 支持复杂骨骼动画
✓ 支持变形动画（Morph/Blend Shape）
✓ 完整的材质和纹理信息
✓ 场景层级结构
✓ 主流 DCC 软件广泛支持

缺点：
✗ 专有格式（非开放标准）
✗ 文件体积较大
✗ 版本兼容性问题
✗ 某些高级特性不被 Web 支持
```

## 基础使用

```typescript
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const loader = new FBXLoader();

// 基本加载
loader.load(
  'models/character.fbx',
  (object) => {
    // FBX 直接返回 Group
    scene.add(object);
    
    // 设置阴影
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    // 缩放（FBX 常使用厘米单位）
    object.scale.setScalar(0.01);
  },
  (progress) => {
    const percent = (progress.loaded / progress.total * 100).toFixed(1);
    console.log(`Loading: ${percent}%`);
  },
  (error) => {
    console.error('Error loading FBX:', error);
  }
);

// Promise 方式
async function loadFBX(path: string): Promise<Group> {
  const loader = new FBXLoader();
  return await loader.loadAsync(path);
}
```

## 动画处理

```typescript
// 完整动画加载示例
class FBXAnimatedModel {
  group: Group;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction> = new Map();
  currentAction?: AnimationAction;
  
  constructor(fbx: Group) {
    this.group = fbx;
    this.mixer = new AnimationMixer(fbx);
    
    // 提取动画
    if (fbx.animations.length > 0) {
      fbx.animations.forEach((clip) => {
        const action = this.mixer.clipAction(clip);
        this.actions.set(clip.name, action);
      });
    }
  }
  
  play(name: string, options?: {
    loop?: boolean;
    fadeTime?: number;
    timeScale?: number;
  }): void {
    const action = this.actions.get(name);
    if (!action) return;
    
    const {
      loop = true,
      fadeTime = 0.3,
      timeScale = 1,
    } = options || {};
    
    // 淡出当前动画
    if (this.currentAction) {
      this.currentAction.fadeOut(fadeTime);
    }
    
    // 配置新动画
    action.reset();
    action.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.timeScale = timeScale;
    action.fadeIn(fadeTime);
    action.play();
    
    this.currentAction = action;
  }
  
  update(delta: number): void {
    this.mixer.update(delta);
  }
  
  getAnimationNames(): string[] {
    return Array.from(this.actions.keys());
  }
  
  dispose(): void {
    this.mixer.stopAllAction();
    this.actions.clear();
  }
}

// 使用
const loader = new FBXLoader();
const fbx = await loader.loadAsync('character.fbx');
const model = new FBXAnimatedModel(fbx);

scene.add(model.group);

// 播放动画
model.play('Walk');

// 更新循环
function animate() {
  const delta = clock.getDelta();
  model.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## 分离动画文件

FBX 常见做法是将模型和动画分开：

```typescript
// 加载模型和多个动画文件
class CharacterLoader {
  private loader = new FBXLoader();
  
  async load(
    modelPath: string,
    animationPaths: Record<string, string>
  ): Promise<{
    model: Group;
    mixer: AnimationMixer;
    actions: Map<string, AnimationAction>;
  }> {
    // 加载模型
    const model = await this.loader.loadAsync(modelPath);
    model.scale.setScalar(0.01);
    
    const mixer = new AnimationMixer(model);
    const actions = new Map<string, AnimationAction>();
    
    // 加载动画
    const animPromises = Object.entries(animationPaths).map(
      async ([name, path]) => {
        const anim = await this.loader.loadAsync(path);
        if (anim.animations.length > 0) {
          const clip = anim.animations[0];
          clip.name = name;
          const action = mixer.clipAction(clip);
          actions.set(name, action);
        }
      }
    );
    
    await Promise.all(animPromises);
    
    return { model, mixer, actions };
  }
}

// 使用
const characterLoader = new CharacterLoader();
const { model, mixer, actions } = await characterLoader.load(
  'character.fbx',
  {
    idle: 'animations/idle.fbx',
    walk: 'animations/walk.fbx',
    run: 'animations/run.fbx',
    jump: 'animations/jump.fbx',
  }
);

scene.add(model);

// 播放空闲动画
actions.get('idle')?.play();
```

## 骨骼系统

```typescript
// 访问骨骼
function getBones(fbx: Group): Bone[] {
  const bones: Bone[] = [];
  
  fbx.traverse((child) => {
    if (child instanceof Bone) {
      bones.push(child);
    }
  });
  
  return bones;
}

// 骨骼可视化
function visualizeSkeleton(fbx: Group): void {
  fbx.traverse((child) => {
    if (child instanceof SkinnedMesh) {
      const helper = new SkeletonHelper(child.skeleton.bones[0]);
      scene.add(helper);
    }
  });
}

// 获取特定骨骼
function findBone(fbx: Group, name: string): Bone | undefined {
  let result: Bone | undefined;
  
  fbx.traverse((child) => {
    if (child instanceof Bone && child.name === name) {
      result = child;
    }
  });
  
  return result;
}

// 绑定物体到骨骼
function attachToBone(
  fbx: Group,
  boneName: string,
  attachment: Object3D,
  offset?: { position?: Vector3; rotation?: Euler }
): void {
  const bone = findBone(fbx, boneName);
  
  if (bone) {
    if (offset?.position) {
      attachment.position.copy(offset.position);
    }
    if (offset?.rotation) {
      attachment.rotation.copy(offset.rotation);
    }
    
    bone.add(attachment);
  }
}

// 使用示例 - 将武器绑定到手部骨骼
const weapon = await gltfLoader.loadAsync('weapon.glb');
attachToBone(character, 'RightHand', weapon.scene, {
  position: new Vector3(0, 0.1, 0),
  rotation: new Euler(0, Math.PI / 2, 0),
});
```

## 变形目标动画

```typescript
// 处理变形目标（Morph Targets / Blend Shapes）
function getMorphTargets(fbx: Group): Map<string, SkinnedMesh> {
  const morphMeshes = new Map<string, SkinnedMesh>();
  
  fbx.traverse((child) => {
    if (child instanceof SkinnedMesh) {
      if (child.morphTargetInfluences && 
          child.morphTargetInfluences.length > 0) {
        morphMeshes.set(child.name, child);
        
        // 列出变形目标
        if (child.morphTargetDictionary) {
          console.log(`Mesh ${child.name} morph targets:`);
          for (const name in child.morphTargetDictionary) {
            console.log(`  - ${name}: ${child.morphTargetDictionary[name]}`);
          }
        }
      }
    }
  });
  
  return morphMeshes;
}

// 控制变形目标
function setMorphInfluence(
  mesh: SkinnedMesh,
  targetName: string,
  influence: number
): void {
  if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
    const index = mesh.morphTargetDictionary[targetName];
    if (index !== undefined) {
      mesh.morphTargetInfluences[index] = influence;
    }
  }
}

// 面部表情控制
class FacialController {
  private mesh: SkinnedMesh;
  
  constructor(mesh: SkinnedMesh) {
    this.mesh = mesh;
  }
  
  setExpression(expressions: Record<string, number>): void {
    // 重置所有表情
    if (this.mesh.morphTargetInfluences) {
      this.mesh.morphTargetInfluences.fill(0);
    }
    
    // 设置指定表情
    for (const [name, value] of Object.entries(expressions)) {
      setMorphInfluence(this.mesh, name, value);
    }
  }
  
  smile(intensity = 1): void {
    this.setExpression({
      'MouthSmile': intensity,
      'EyeSquint': intensity * 0.3,
    });
  }
  
  blink(intensity = 1): void {
    this.setExpression({
      'EyesClosed': intensity,
    });
  }
}
```

## 材质处理

```typescript
// FBX 材质转 PBR
function convertToPBR(fbx: Group): void {
  fbx.traverse((child) => {
    if (child instanceof Mesh) {
      const oldMaterial = child.material as MeshPhongMaterial;
      
      const newMaterial = new MeshStandardMaterial({
        map: oldMaterial.map,
        normalMap: oldMaterial.normalMap,
        color: oldMaterial.color,
        roughness: 0.5,
        metalness: 0.0,
      });
      
      child.material = newMaterial;
      oldMaterial.dispose();
    }
  });
}

// 修复纹理路径
function fixTexturePaths(fbx: Group, basePath: string): void {
  fbx.traverse((child) => {
    if (child instanceof Mesh) {
      const material = child.material as MeshStandardMaterial;
      
      if (material.map) {
        // FBX 可能包含绝对路径
        const textureName = material.map.name || 
          material.map.image?.src?.split('/').pop();
        
        if (textureName) {
          const newTexture = new TextureLoader().load(
            `${basePath}/${textureName}`
          );
          newTexture.colorSpace = SRGBColorSpace;
          material.map = newTexture;
        }
      }
    }
  });
}
```

## 常见问题处理

```typescript
// 单位转换（FBX 常用厘米）
function convertUnits(fbx: Group, fromUnit: 'cm' | 'm' = 'cm'): void {
  const scale = fromUnit === 'cm' ? 0.01 : 1;
  fbx.scale.setScalar(scale);
}

// 修复旋转（FBX 可能使用不同坐标系）
function fixRotation(fbx: Group): void {
  // 某些 FBX 需要绕 X 轴旋转
  fbx.rotation.x = -Math.PI / 2;
}

// 处理嵌入纹理
function hasEmbeddedTextures(fbx: Group): boolean {
  let hasEmbedded = false;
  
  fbx.traverse((child) => {
    if (child instanceof Mesh) {
      const material = child.material as MeshStandardMaterial;
      if (material.map && material.map.image instanceof ImageBitmap) {
        hasEmbedded = true;
      }
    }
  });
  
  return hasEmbedded;
}

// 优化蒙皮网格
function optimizeSkinnedMesh(fbx: Group): void {
  fbx.traverse((child) => {
    if (child instanceof SkinnedMesh) {
      // 禁用视锥剔除（蒙皮动画可能超出边界）
      child.frustumCulled = false;
      
      // 更新矩阵
      child.skeleton.update();
    }
  });
}
```

## 完整加载示例

```typescript
class FBXModelManager {
  private loader = new FBXLoader();
  private cache = new Map<string, Group>();
  
  async loadModel(
    url: string,
    options?: {
      scale?: number;
      castShadow?: boolean;
      receiveShadow?: boolean;
      convertToPBR?: boolean;
    }
  ): Promise<Group> {
    // 检查缓存
    if (this.cache.has(url)) {
      return this.cache.get(url)!.clone();
    }
    
    const {
      scale = 0.01,
      castShadow = true,
      receiveShadow = true,
      convertToPBR = true,
    } = options || {};
    
    const fbx = await this.loader.loadAsync(url);
    
    // 应用缩放
    fbx.scale.setScalar(scale);
    
    // 遍历处理
    fbx.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
        
        if (convertToPBR && child.material instanceof MeshPhongMaterial) {
          const oldMat = child.material;
          child.material = new MeshStandardMaterial({
            map: oldMat.map,
            normalMap: oldMat.normalMap,
            color: oldMat.color,
          });
          oldMat.dispose();
        }
      }
      
      if (child instanceof SkinnedMesh) {
        child.frustumCulled = false;
      }
    });
    
    // 缓存
    this.cache.set(url, fbx);
    
    return fbx;
  }
  
  dispose(url: string): void {
    const model = this.cache.get(url);
    if (model) {
      model.traverse((child) => {
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

## 本章小结

- FBXLoader 支持复杂的骨骼和变形动画
- 动画可以分离为独立文件加载
- 需要注意单位转换（厘米到米）
- 可以访问和控制骨骼、变形目标
- 建议转换为 PBR 材质获得更好效果

下一章，我们将学习其他常用模型加载器。
