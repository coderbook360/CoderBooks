# OBJLoader OBJ 加载器

> "OBJ 格式简单直观，适合快速导入静态模型。"

## OBJ 格式概述

OBJ 是由 Wavefront 开发的简单 3D 模型格式，以纯文本存储几何数据。

```
OBJ 格式特点：

优点：
✓ 纯文本，易于阅读和编辑
✓ 广泛支持，几乎所有 3D 软件都支持
✓ 简单直观的语法
✓ 适合静态模型

缺点：
✗ 不支持动画
✗ 文件体积大（纯文本）
✗ 材质支持有限（需要 .mtl 文件）
✗ 没有场景层级
```

## OBJ 文件格式

```
OBJ 文件示例：

# 立方体
# 顶点位置
v -1.0 -1.0  1.0
v  1.0 -1.0  1.0
v  1.0  1.0  1.0
v -1.0  1.0  1.0
v -1.0 -1.0 -1.0
v  1.0 -1.0 -1.0
v  1.0  1.0 -1.0
v -1.0  1.0 -1.0

# 纹理坐标
vt 0.0 0.0
vt 1.0 0.0
vt 1.0 1.0
vt 0.0 1.0

# 法线
vn  0.0  0.0  1.0
vn  1.0  0.0  0.0
vn  0.0  0.0 -1.0
vn -1.0  0.0  0.0
vn  0.0  1.0  0.0
vn  0.0 -1.0  0.0

# 使用材质
usemtl Material

# 面（顶点/纹理/法线 索引）
f 1/1/1 2/2/1 3/3/1 4/4/1
f 2/1/2 6/2/2 7/3/2 3/4/2
f 6/1/3 5/2/3 8/3/3 7/4/3
f 5/1/4 1/2/4 4/3/4 8/4/4
f 4/1/5 3/2/5 7/3/5 8/4/5
f 5/1/6 6/2/6 2/3/6 1/4/6

# 引用材质文件
mtllib cube.mtl
```

## MTL 材质文件

```
MTL 文件示例：

# 材质定义
newmtl Material
Ns 225.000000              # 高光指数
Ka 1.000000 1.000000 1.000000  # 环境光颜色
Kd 0.800000 0.800000 0.800000  # 漫反射颜色
Ks 0.500000 0.500000 0.500000  # 高光颜色
Ke 0.000000 0.000000 0.000000  # 自发光
Ni 1.450000              # 折射率
d 1.000000               # 透明度
illum 2                  # 光照模型

# 纹理贴图
map_Kd diffuse.jpg       # 漫反射贴图
map_Ks specular.jpg      # 高光贴图
map_Ns roughness.jpg     # 粗糙度贴图
map_bump normal.jpg      # 法线/凹凸贴图
map_d alpha.png          # 透明度贴图
```

## 基础使用

```typescript
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const loader = new OBJLoader();

// 基本加载
loader.load(
  'models/model.obj',
  (object) => {
    scene.add(object);
    
    // 遍历网格
    object.traverse((child) => {
      if (child instanceof Mesh) {
        console.log('Mesh:', child.name);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  },
  (progress) => {
    console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
  },
  (error) => {
    console.error('Error loading OBJ:', error);
  }
);

// Promise 方式
async function loadOBJ() {
  const object = await loader.loadAsync('models/model.obj');
  scene.add(object);
  return object;
}
```

## 加载材质

```typescript
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

async function loadOBJWithMaterials(
  objPath: string,
  mtlPath: string
): Promise<Group> {
  // 先加载材质
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath('models/');
  
  const materials = await mtlLoader.loadAsync(mtlPath);
  materials.preload();
  
  // 再加载 OBJ 并应用材质
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.setPath('models/');
  
  const object = await objLoader.loadAsync(objPath);
  return object;
}

// 使用
const model = await loadOBJWithMaterials('model.obj', 'model.mtl');
scene.add(model);
```

## MTLLoader 详解

```typescript
import { MTLLoader, MaterialCreator } from 'three/addons/loaders/MTLLoader.js';

const mtlLoader = new MTLLoader();

// 设置基础路径
mtlLoader.setPath('models/');

// 设置资源路径（纹理等）
mtlLoader.setResourcePath('textures/');

// 设置材质选项
mtlLoader.setMaterialOptions({
  side: DoubleSide,       // 双面渲染
  wrap: RepeatWrapping,   // 纹理重复
  normalizeRGB: false,    // RGB 标准化
  ignoreZeroRGBs: false,  // 忽略零 RGB
  invertTrAlpha: false,   // 反转透明度
});

// 加载材质
mtlLoader.load('model.mtl', (materialCreator: MaterialCreator) => {
  // 预加载所有材质
  materialCreator.preload();
  
  // 获取特定材质
  const material = materialCreator.create('MaterialName');
  
  // 列出所有材质名
  for (const name in materialCreator.materials) {
    console.log('Material:', name);
  }
});
```

## 自定义材质

```typescript
// 替换为 PBR 材质
async function loadOBJWithPBRMaterials(objPath: string): Promise<Group> {
  const loader = new OBJLoader();
  const object = await loader.loadAsync(objPath);
  
  // 加载 PBR 纹理
  const textureLoader = new TextureLoader();
  const [diffuse, normal, roughness, metalness] = await Promise.all([
    textureLoader.loadAsync('textures/diffuse.jpg'),
    textureLoader.loadAsync('textures/normal.jpg'),
    textureLoader.loadAsync('textures/roughness.jpg'),
    textureLoader.loadAsync('textures/metalness.jpg'),
  ]);
  
  // 设置颜色空间
  diffuse.colorSpace = SRGBColorSpace;
  
  // 创建 PBR 材质
  const pbrMaterial = new MeshStandardMaterial({
    map: diffuse,
    normalMap: normal,
    roughnessMap: roughness,
    metalnessMap: metalness,
    roughness: 1.0,
    metalness: 1.0,
  });
  
  // 应用材质
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = pbrMaterial;
    }
  });
  
  return object;
}

// 材质映射
function applyMaterialMap(
  object: Group,
  materialMap: Record<string, Material>
): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      const meshName = child.name;
      
      if (materialMap[meshName]) {
        child.material = materialMap[meshName];
      }
    }
  });
}

// 使用
const materialMap = {
  'Body': new MeshStandardMaterial({ color: 0xff0000 }),
  'Wheel': new MeshStandardMaterial({ color: 0x333333 }),
  'Glass': new MeshPhysicalMaterial({ 
    transmission: 1, 
    roughness: 0 
  }),
};

const car = await new OBJLoader().loadAsync('car.obj');
applyMaterialMap(car, materialMap);
```

## 几何体处理

```typescript
// 合并几何体
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

async function loadAndMerge(objPath: string): Promise<Mesh> {
  const object = await new OBJLoader().loadAsync(objPath);
  
  const geometries: BufferGeometry[] = [];
  
  object.traverse((child) => {
    if (child instanceof Mesh) {
      // 应用世界变换
      child.updateMatrixWorld();
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      geometries.push(geometry);
    }
  });
  
  const mergedGeometry = mergeGeometries(geometries);
  const mergedMesh = new Mesh(
    mergedGeometry,
    new MeshStandardMaterial()
  );
  
  return mergedMesh;
}

// 计算法线
function recomputeNormals(object: Group): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.computeVertexNormals();
    }
  });
}

// 优化几何体
function optimizeGeometry(object: Group): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      // 计算边界
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
      
      // 删除不需要的属性
      if (child.geometry.hasAttribute('uv2')) {
        child.geometry.deleteAttribute('uv2');
      }
    }
  });
}
```

## 解析 OBJ 字符串

```typescript
// 直接解析 OBJ 文本
const objText = `
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
vn 0 0 1
f 1//1 2//1 3//1 4//1
`;

const loader = new OBJLoader();
const object = loader.parse(objText);
scene.add(object);

// 从 ArrayBuffer 解析
async function loadFromBuffer(buffer: ArrayBuffer): Promise<Group> {
  const text = new TextDecoder().decode(buffer);
  return new OBJLoader().parse(text);
}
```

## 大型 OBJ 加载

```typescript
// 分块加载大型 OBJ
class StreamingOBJLoader {
  private loader = new OBJLoader();
  
  async loadChunked(
    url: string,
    onProgress?: (percent: number) => void
  ): Promise<Group> {
    const response = await fetch(url);
    const reader = response.body!.getReader();
    const contentLength = parseInt(
      response.headers.get('Content-Length') || '0'
    );
    
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (onProgress && contentLength > 0) {
        onProgress(receivedLength / contentLength * 100);
      }
    }
    
    // 合并 chunks
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }
    
    // 解析
    const text = new TextDecoder().decode(allChunks);
    return this.loader.parse(text);
  }
}

// 使用 Web Worker 加载
// obj-worker.js
self.onmessage = async (e) => {
  const { url } = e.data;
  const response = await fetch(url);
  const text = await response.text();
  self.postMessage({ text });
};

// 主线程
const worker = new Worker('obj-worker.js');
worker.postMessage({ url: 'large-model.obj' });
worker.onmessage = (e) => {
  const object = new OBJLoader().parse(e.data.text);
  scene.add(object);
};
```

## 坐标系转换

```typescript
// OBJ 通常使用右手坐标系，可能需要转换
function convertCoordinateSystem(object: Group): void {
  // 从 Y-up 转换为 Z-up
  object.rotation.x = -Math.PI / 2;
  
  // 或者变换几何体
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.rotateX(-Math.PI / 2);
    }
  });
}

// 缩放到标准大小
function normalizeScale(object: Group, targetSize = 1): void {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  
  const scale = targetSize / maxDim;
  object.scale.setScalar(scale);
  
  // 居中
  const center = box.getCenter(new Vector3());
  object.position.sub(center.multiplyScalar(scale));
}
```

## 本章小结

- OBJLoader 加载简单的 OBJ 模型
- MTLLoader 加载对应的材质文件
- 可以自定义替换为 PBR 材质
- 支持几何体合并和优化
- 注意坐标系和缩放问题

下一章，我们将学习 FBXLoader 加载带动画的模型。
