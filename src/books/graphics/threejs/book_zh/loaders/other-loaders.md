# 其他模型加载器

> "每种格式都有其适用场景，选择正确的加载器至关重要。"

## STLLoader - 3D 打印格式

STL（Stereolithography）是 3D 打印的标准格式，只包含几何数据。

```typescript
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const loader = new STLLoader();

// 加载 ASCII 或 Binary STL
loader.load(
  'model.stl',
  (geometry) => {
    // STLLoader 返回 BufferGeometry
    const material = new MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.3,
      roughness: 0.7,
    });
    
    const mesh = new Mesh(geometry, material);
    
    // 计算法线
    geometry.computeVertexNormals();
    
    // 居中模型
    geometry.center();
    
    scene.add(mesh);
  }
);

// 处理大型 STL
async function loadLargeSTL(url: string): Promise<Mesh> {
  const loader = new STLLoader();
  const geometry = await loader.loadAsync(url);
  
  // 计算边界和法线
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.computeVertexNormals();
  
  // 标准化大小
  const box = geometry.boundingBox!;
  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 10 / maxDim;
  geometry.scale(scale, scale, scale);
  
  // 居中
  geometry.center();
  
  return new Mesh(geometry, new MeshStandardMaterial());
}
```

## PLYLoader - 点云/扫描数据

PLY（Polygon File Format）常用于 3D 扫描和点云数据。

```typescript
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

const loader = new PLYLoader();

// 加载带顶点颜色的 PLY
loader.load(
  'scan.ply',
  (geometry) => {
    // 检查是否有顶点颜色
    const hasColors = geometry.hasAttribute('color');
    
    let material: Material;
    
    if (hasColors) {
      material = new MeshBasicMaterial({
        vertexColors: true,
      });
    } else {
      geometry.computeVertexNormals();
      material = new MeshStandardMaterial({
        color: 0x888888,
      });
    }
    
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);
  }
);

// 作为点云渲染
async function loadPointCloud(url: string): Promise<Points> {
  const loader = new PLYLoader();
  const geometry = await loader.loadAsync(url);
  
  const material = new PointsMaterial({
    size: 0.01,
    vertexColors: geometry.hasAttribute('color'),
    sizeAttenuation: true,
  });
  
  return new Points(geometry, material);
}
```

## ColladaLoader - DAE 格式

Collada（.dae）是开放的 3D 交换格式。

```typescript
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

const loader = new ColladaLoader();

loader.load(
  'model.dae',
  (collada) => {
    // 返回包含多种数据的对象
    const model = collada.scene;
    const animations = collada.animations;
    const kinematics = collada.kinematics;
    
    scene.add(model);
    
    // 处理动画
    if (animations && animations.length > 0) {
      const mixer = new AnimationMixer(model);
      animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    }
  }
);

// Collada 返回结构
interface ColladaResult {
  scene: Group;
  animations: AnimationClip[];
  kinematics?: {
    joints: Record<string, object>;
    links: Record<string, object>;
  };
  library: {
    geometries: Record<string, BufferGeometry>;
    materials: Record<string, Material>;
  };
}
```

## DRACOLoader - 压缩几何体

Draco 是 Google 开发的 3D 几何压缩库。

```typescript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const loader = new DRACOLoader();

// 设置解码器路径
loader.setDecoderPath('/libs/draco/');

// 配置解码器类型
loader.setDecoderConfig({ type: 'js' }); // 或 'wasm'

// 预加载解码器
loader.preload();

// 加载 Draco 压缩的 .drc 文件
loader.load(
  'model.drc',
  (geometry) => {
    const mesh = new Mesh(
      geometry,
      new MeshStandardMaterial()
    );
    scene.add(mesh);
  }
);

// 与 GLTFLoader 配合使用
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(loader);

// 加载完成后释放
loader.dispose();
```

## PCDLoader - 点云数据

PCD（Point Cloud Data）格式用于点云库数据。

```typescript
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js';

const loader = new PCDLoader();

loader.load(
  'pointcloud.pcd',
  (points) => {
    // 返回 Points 对象
    scene.add(points);
    
    // 调整点大小
    const material = points.material as PointsMaterial;
    material.size = 0.005;
    material.sizeAttenuation = true;
  }
);

// 大规模点云处理
async function loadLargePointCloud(url: string): Promise<Points> {
  const loader = new PCDLoader();
  const points = await loader.loadAsync(url);
  
  // 降采样
  const geometry = points.geometry as BufferGeometry;
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color?.array;
  
  const step = 4; // 每 4 个点取 1 个
  const newPositions: number[] = [];
  const newColors: number[] = [];
  
  for (let i = 0; i < positions.length; i += 3 * step) {
    newPositions.push(positions[i], positions[i + 1], positions[i + 2]);
    if (colors) {
      newColors.push(colors[i], colors[i + 1], colors[i + 2]);
    }
  }
  
  const newGeometry = new BufferGeometry();
  newGeometry.setAttribute('position', 
    new Float32BufferAttribute(newPositions, 3));
  if (newColors.length > 0) {
    newGeometry.setAttribute('color', 
      new Float32BufferAttribute(newColors, 3));
  }
  
  return new Points(newGeometry, points.material);
}
```

## SVGLoader - 矢量图形

加载 SVG 并转换为 3D 形状。

```typescript
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const loader = new SVGLoader();

loader.load(
  'logo.svg',
  (data) => {
    const paths = data.paths;
    const group = new Group();
    
    paths.forEach((path) => {
      const shapes = SVGLoader.createShapes(path);
      const color = path.userData.style.fill;
      
      shapes.forEach((shape) => {
        // 挤压成 3D
        const geometry = new ExtrudeGeometry(shape, {
          depth: 2,
          bevelEnabled: true,
          bevelThickness: 0.5,
          bevelSize: 0.2,
          bevelSegments: 3,
        });
        
        const material = new MeshStandardMaterial({
          color: new Color().setStyle(color),
          side: DoubleSide,
        });
        
        const mesh = new Mesh(geometry, material);
        group.add(mesh);
      });
    });
    
    // 缩放和定位
    group.scale.multiplyScalar(0.01);
    group.rotation.x = Math.PI;
    group.position.y = 5;
    
    scene.add(group);
  }
);

// 作为 2D 路径渲染
async function loadSVGAsLines(url: string): Promise<Group> {
  const loader = new SVGLoader();
  const data = await loader.loadAsync(url);
  
  const group = new Group();
  
  data.paths.forEach((path) => {
    const subPaths = path.subPaths;
    
    subPaths.forEach((subPath) => {
      const points = subPath.getPoints();
      const geometry = new BufferGeometry().setFromPoints(points);
      
      const material = new LineBasicMaterial({
        color: path.userData.style.stroke,
      });
      
      group.add(new Line(geometry, material));
    });
  });
  
  return group;
}
```

## 3DMLoader - Rhino 格式

加载 Rhino 3DM 格式文件。

```typescript
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';

const loader = new Rhino3dmLoader();

// 设置 rhino3dm.js 库路径
loader.setLibraryPath('/libs/rhino3dm/');

loader.load(
  'model.3dm',
  (object) => {
    scene.add(object);
    
    // 遍历图层
    object.traverse((child) => {
      if (child.userData.attributes) {
        console.log('Layer:', child.userData.attributes.layerIndex);
      }
    });
  }
);
```

## IFCLoader - 建筑信息模型

加载 IFC（Industry Foundation Classes）格式。

```typescript
import { IFCLoader } from 'three/addons/loaders/IFCLoader.js';

const loader = new IFCLoader();
loader.ifcManager.setWasmPath('/libs/web-ifc/');

loader.load(
  'building.ifc',
  (model) => {
    scene.add(model);
  }
);

// 查询 IFC 属性
async function getIFCProperties(model: any, expressID: number) {
  const props = await loader.ifcManager.getItemProperties(
    model.modelID,
    expressID
  );
  return props;
}
```

## 自定义加载器

```typescript
// 创建自定义加载器
import { Loader, FileLoader, LoadingManager } from 'three';

interface CustomModelData {
  vertices: number[];
  indices: number[];
  normals: number[];
}

class CustomLoader extends Loader {
  constructor(manager?: LoadingManager) {
    super(manager);
  }
  
  load(
    url: string,
    onLoad: (geometry: BufferGeometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): void {
    const loader = new FileLoader(this.manager);
    loader.setPath(this.path);
    loader.setResponseType('json');
    
    loader.load(
      url,
      (data) => {
        try {
          const geometry = this.parse(data as CustomModelData);
          onLoad(geometry);
        } catch (e) {
          if (onError) {
            onError(e as Error);
          } else {
            console.error(e);
          }
        }
      },
      onProgress,
      onError
    );
  }
  
  parse(data: CustomModelData): BufferGeometry {
    const geometry = new BufferGeometry();
    
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(data.vertices, 3)
    );
    
    geometry.setAttribute(
      'normal',
      new Float32BufferAttribute(data.normals, 3)
    );
    
    geometry.setIndex(data.indices);
    
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
  }
}

// 使用
const loader = new CustomLoader();
loader.load('model.custom', (geometry) => {
  const mesh = new Mesh(geometry, new MeshStandardMaterial());
  scene.add(mesh);
});
```

## 加载器对比

```
加载器性能对比：

加载器        解析速度  文件大小  功能完整度
──────────────────────────────────────────
GLTFLoader   快        小        高
FBXLoader    中        大        高
OBJLoader    快        大        低
STLLoader    快        中        最低
PLYLoader    中        中        低
ColladaLoader 慢       大        中
DRACOLoader  中        最小      低
```

## 本章小结

- STLLoader 用于 3D 打印模型
- PLYLoader 处理点云和扫描数据
- ColladaLoader 加载 DAE 交换格式
- DRACOLoader 解压 Draco 压缩数据
- PCDLoader 加载点云数据
- SVGLoader 将矢量图转 3D
- 可以创建自定义加载器

下一章，我们将学习 HDR 和环境贴图加载器。
