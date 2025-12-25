# LOD 细节层次

> "远处不必完美，近处才需精细。"

## LOD 原理

```
LOD 工作原理：

距离远 ──────────────────────────────► 距离近

┌──────┐    ┌──────────┐    ┌────────────────┐
│ Low  │    │  Medium  │    │     High       │
│ Poly │    │   Poly   │    │     Poly       │
│ 100  │    │   500    │    │    5000        │
│ tris │    │   tris   │    │    tris        │
└──────┘    └──────────┘    └────────────────┘
  d > 50      10 < d < 50        d < 10

自动切换，保持视觉质量的同时优化性能
```

## 基础使用

```typescript
import { LOD, Mesh, SphereGeometry, MeshStandardMaterial } from 'three';

// 创建 LOD 对象
const lod = new LOD();

// 高精度模型 (距离 < 10)
const highGeometry = new SphereGeometry(1, 64, 64);
const highMesh = new Mesh(highGeometry, material);
lod.addLevel(highMesh, 0);

// 中精度模型 (10 < 距离 < 30)
const medGeometry = new SphereGeometry(1, 16, 16);
const medMesh = new Mesh(medGeometry, material);
lod.addLevel(medMesh, 10);

// 低精度模型 (距离 > 30)
const lowGeometry = new SphereGeometry(1, 8, 8);
const lowMesh = new Mesh(lowGeometry, material);
lod.addLevel(lowMesh, 30);

// 最远距离隐藏 (距离 > 100)
lod.addLevel(new Object3D(), 100);

scene.add(lod);

// 每帧更新
function animate() {
  lod.update(camera);
}
```

## 自动 LOD 生成

```typescript
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

class AutoLODGenerator {
  private simplifier = new SimplifyModifier();
  
  generate(
    highPolyGeometry: BufferGeometry,
    levels: number = 3,
    reductions: number[] = [0.5, 0.25, 0.1]
  ): LOD {
    const lod = new LOD();
    const material = new MeshStandardMaterial();
    
    // 添加高精度模型
    const highMesh = new Mesh(highPolyGeometry, material);
    lod.addLevel(highMesh, 0);
    
    // 生成简化模型
    let currentGeometry = highPolyGeometry.clone();
    const baseVertexCount = currentGeometry.attributes.position.count;
    
    for (let i = 0; i < levels; i++) {
      const targetCount = Math.floor(baseVertexCount * reductions[i]);
      
      try {
        const simplified = this.simplifier.modify(
          currentGeometry.clone(),
          Math.max(targetCount, 100)
        );
        
        const mesh = new Mesh(simplified, material);
        const distance = (i + 1) * 20;
        lod.addLevel(mesh, distance);
      } catch (e) {
        console.warn(`LOD level ${i} generation failed`);
      }
    }
    
    return lod;
  }
}

// 使用
const lodGenerator = new AutoLODGenerator();
const lod = lodGenerator.generate(complexGeometry);
scene.add(lod);
```

## 纹理 LOD (Mipmapping)

```typescript
// 纹理 Mipmap 配置
const texture = textureLoader.load('texture.jpg');

// 启用 mipmapping
texture.generateMipmaps = true;

// 设置过滤器
texture.minFilter = LinearMipmapLinearFilter; // 最高质量
texture.magFilter = LinearFilter;

// 各向异性过滤（提高倾斜角度的质量）
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
texture.anisotropy = maxAnisotropy;

// Mipmap 偏移（正值更模糊，负值更锐利）
texture.offset.set(0, 0);
```

## 自定义 LOD 控制

```typescript
class CustomLOD extends LOD {
  private lodBias = 0;
  
  // 设置 LOD 偏移
  setLODBias(bias: number): void {
    this.lodBias = bias;
  }
  
  update(camera: Camera): void {
    if (this.levels.length === 0) return;
    
    // 计算到相机的距离
    const distance = this.getWorldPosition(new Vector3())
      .distanceTo(camera.position);
    
    // 应用偏移
    const adjustedDistance = distance + this.lodBias;
    
    // 选择合适的 LOD 级别
    let i, l;
    for (i = 1, l = this.levels.length; i < l; i++) {
      if (adjustedDistance < this.levels[i].distance) {
        break;
      }
    }
    
    // 显示选中的级别，隐藏其他
    for (let j = 0; j < this.levels.length; j++) {
      this.levels[j].object.visible = (j === i - 1);
    }
  }
}

// 基于帧率动态调整
class AdaptiveLOD {
  private lodBias = 0;
  private targetFPS = 60;
  private frameCount = 0;
  private lastTime = performance.now();
  
  update(lods: CustomLOD[]): void {
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
      
      // 根据帧率调整 LOD 偏移
      if (fps < this.targetFPS - 10) {
        this.lodBias += 5; // 降低质量
      } else if (fps > this.targetFPS + 5 && this.lodBias > 0) {
        this.lodBias -= 5; // 提高质量
      }
      
      for (const lod of lods) {
        lod.setLODBias(this.lodBias);
      }
    }
  }
}
```

## LOD 与 InstancedMesh 结合

```typescript
class InstancedLOD {
  private lodMeshes: InstancedMesh[] = [];
  private positions: Vector3[];
  private distances: number[];
  
  constructor(
    geometries: BufferGeometry[],
    material: Material,
    positions: Vector3[],
    distances: number[]
  ) {
    this.positions = positions;
    this.distances = distances;
    
    // 为每个 LOD 级别创建 InstancedMesh
    for (const geometry of geometries) {
      const mesh = new InstancedMesh(geometry, material, positions.length);
      mesh.count = 0; // 初始不渲染任何实例
      this.lodMeshes.push(mesh);
    }
  }
  
  update(camera: Camera): void {
    // 清空所有实例计数
    const counts = this.lodMeshes.map(() => 0);
    const matrices = this.lodMeshes.map(() => [] as Matrix4[]);
    
    const cameraPos = camera.position;
    const matrix = new Matrix4();
    
    // 根据距离分配实例到不同 LOD
    for (let i = 0; i < this.positions.length; i++) {
      const distance = this.positions[i].distanceTo(cameraPos);
      
      // 找到合适的 LOD 级别
      let lodIndex = this.distances.length - 1;
      for (let j = 0; j < this.distances.length; j++) {
        if (distance < this.distances[j]) {
          lodIndex = j;
          break;
        }
      }
      
      // 设置矩阵
      matrix.setPosition(this.positions[i]);
      matrices[lodIndex].push(matrix.clone());
      counts[lodIndex]++;
    }
    
    // 更新每个 LOD 的 InstancedMesh
    for (let i = 0; i < this.lodMeshes.length; i++) {
      this.lodMeshes[i].count = counts[i];
      
      for (let j = 0; j < matrices[i].length; j++) {
        this.lodMeshes[i].setMatrixAt(j, matrices[i][j]);
      }
      
      if (counts[i] > 0) {
        this.lodMeshes[i].instanceMatrix.needsUpdate = true;
      }
    }
  }
  
  addToScene(scene: Scene): void {
    for (const mesh of this.lodMeshes) {
      scene.add(mesh);
    }
  }
}
```

## 地形 LOD

```typescript
class TerrainLOD {
  private chunks: Map<string, LOD> = new Map();
  private chunkSize = 64;
  private levels = 4;
  
  generateChunk(x: number, z: number, heightmap: Float32Array): LOD {
    const lod = new LOD();
    
    for (let level = 0; level < this.levels; level++) {
      const resolution = this.chunkSize >> level;
      const geometry = this.createTerrainGeometry(
        heightmap,
        resolution,
        this.chunkSize
      );
      
      const material = new MeshStandardMaterial({
        wireframe: false,
        color: 0x228b22,
      });
      
      const mesh = new Mesh(geometry, material);
      const distance = (level + 1) * this.chunkSize;
      lod.addLevel(mesh, distance);
    }
    
    lod.position.set(x * this.chunkSize, 0, z * this.chunkSize);
    
    const key = `${x},${z}`;
    this.chunks.set(key, lod);
    
    return lod;
  }
  
  private createTerrainGeometry(
    heightmap: Float32Array,
    resolution: number,
    size: number
  ): BufferGeometry {
    const geometry = new PlaneGeometry(
      size,
      size,
      resolution - 1,
      resolution - 1
    );
    
    geometry.rotateX(-Math.PI / 2);
    
    const positions = geometry.attributes.position;
    const step = Math.floor(Math.sqrt(heightmap.length) / resolution);
    
    for (let i = 0; i < positions.count; i++) {
      const x = i % resolution;
      const z = Math.floor(i / resolution);
      const heightIndex = (z * step) * Math.sqrt(heightmap.length) + (x * step);
      positions.setY(i, heightmap[heightIndex] || 0);
    }
    
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  update(camera: Camera): void {
    for (const lod of this.chunks.values()) {
      lod.update(camera);
    }
  }
}
```

## 渐进式网格 (Progressive Mesh)

```typescript
class ProgressiveMesh {
  private geometry: BufferGeometry;
  private edgeCollapses: EdgeCollapse[] = [];
  private currentLevel = 0;
  
  constructor(geometry: BufferGeometry) {
    this.geometry = geometry.clone();
    this.precomputeCollapses();
  }
  
  private precomputeCollapses(): void {
    // 预计算边折叠操作
    // 实际实现需要复杂的网格简化算法
  }
  
  setDetailLevel(level: number): void {
    // 根据级别应用边折叠
    while (this.currentLevel < level && this.edgeCollapses.length > 0) {
      this.collapseEdge();
      this.currentLevel++;
    }
    
    while (this.currentLevel > level) {
      this.splitEdge();
      this.currentLevel--;
    }
  }
  
  setDetailByDistance(distance: number, maxDistance: number): void {
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const level = Math.floor(normalizedDistance * this.edgeCollapses.length);
    this.setDetailLevel(level);
  }
  
  private collapseEdge(): void {
    // 执行边折叠
  }
  
  private splitEdge(): void {
    // 执行边分裂（边折叠的逆操作）
  }
  
  getGeometry(): BufferGeometry {
    return this.geometry;
  }
}

interface EdgeCollapse {
  vertex1: number;
  vertex2: number;
  newPosition: Vector3;
}
```

## LOD 调试

```typescript
class LODDebugger {
  private labels: Map<LOD, CSS2DObject> = new Map();
  
  addDebugLabel(lod: LOD): void {
    const div = document.createElement('div');
    div.style.padding = '2px 5px';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.color = 'white';
    div.style.fontSize = '12px';
    
    const label = new CSS2DObject(div);
    lod.add(label);
    
    this.labels.set(lod, label);
  }
  
  update(lods: LOD[], camera: Camera): void {
    for (const lod of lods) {
      const distance = lod.position.distanceTo(camera.position);
      const currentLevel = this.getCurrentLevel(lod);
      
      const label = this.labels.get(lod);
      if (label) {
        (label.element as HTMLDivElement).textContent = 
          `LOD: ${currentLevel} | Dist: ${distance.toFixed(1)}`;
      }
    }
  }
  
  private getCurrentLevel(lod: LOD): number {
    for (let i = 0; i < lod.levels.length; i++) {
      if (lod.levels[i].object.visible) {
        return i;
      }
    }
    return -1;
  }
  
  // 可视化 LOD 边界
  showBoundaries(lod: LOD): void {
    for (let i = 0; i < lod.levels.length; i++) {
      const distance = lod.levels[i].distance;
      
      const geometry = new RingGeometry(distance - 0.5, distance + 0.5, 64);
      geometry.rotateX(-Math.PI / 2);
      
      const material = new MeshBasicMaterial({
        color: new Color().setHSL(i / lod.levels.length, 1, 0.5),
        transparent: true,
        opacity: 0.3,
      });
      
      const ring = new Mesh(geometry, material);
      ring.position.copy(lod.position);
      lod.parent?.add(ring);
    }
  }
}
```

## 本章小结

- LOD 根据距离自动切换模型精度
- addLevel 添加不同距离的模型
- SimplifyModifier 可自动生成简化模型
- 纹理使用 Mipmap 实现 LOD
- 可与 InstancedMesh 结合提高性能
- 地形使用分块 LOD 管理
- 帧率自适应调整 LOD 偏移

下一章，我们将学习 VR/AR 开发。
