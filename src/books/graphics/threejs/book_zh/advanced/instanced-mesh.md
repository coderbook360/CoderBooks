# InstancedMesh 实例化

> "实例化让万物成为可能。"

## 实例化原理

```
传统渲染 vs 实例化渲染：

传统渲染（1000个物体 = 1000次 Draw Call）：
┌─────┐  ┌─────┐  ┌─────┐       ┌─────┐
│ Obj │→│ Draw│→│ Obj │→ ... →│ Obj │
│  1  │  │Call │  │  2  │       │1000 │
└─────┘  └─────┘  └─────┘       └─────┘

实例化渲染（1000个物体 = 1次 Draw Call）：
┌─────────────────────────────────┐
│        Geometry (共享)           │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Instance Matrices (1000个)      │
│  [Matrix0, Matrix1, ..., Matrix999] │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│        1 Draw Call               │
│   渲染 1000 个实例               │
└─────────────────────────────────┘
```

## 基本使用

```typescript
import {
  InstancedMesh,
  BoxGeometry,
  MeshStandardMaterial,
  Matrix4,
  Vector3,
  Quaternion,
  Color,
} from 'three';

// 创建实例化网格
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: 0xffffff });
const count = 1000;

const instancedMesh = new InstancedMesh(geometry, material, count);

// 设置每个实例的变换
const matrix = new Matrix4();
const position = new Vector3();
const rotation = new Quaternion();
const scale = new Vector3(1, 1, 1);

for (let i = 0; i < count; i++) {
  // 随机位置
  position.set(
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50
  );
  
  // 随机旋转
  rotation.setFromEuler(
    new Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
  );
  
  // 随机缩放
  const s = 0.5 + Math.random() * 1.5;
  scale.set(s, s, s);
  
  // 组合变换矩阵
  matrix.compose(position, rotation, scale);
  
  // 设置到实例
  instancedMesh.setMatrixAt(i, matrix);
}

// 标记需要更新
instancedMesh.instanceMatrix.needsUpdate = true;

scene.add(instancedMesh);
```

## 实例颜色

```typescript
const instancedMesh = new InstancedMesh(geometry, material, count);

// 设置实例颜色
const color = new Color();

for (let i = 0; i < count; i++) {
  color.setHSL(Math.random(), 0.7, 0.5);
  instancedMesh.setColorAt(i, color);
}

// 标记颜色更新
instancedMesh.instanceColor!.needsUpdate = true;
```

## 动态更新实例

```typescript
class InstancedParticles {
  private mesh: InstancedMesh;
  private velocities: Vector3[] = [];
  private positions: Vector3[] = [];
  private count: number;
  
  constructor(count: number) {
    this.count = count;
    
    const geometry = new SphereGeometry(0.1, 8, 8);
    const material = new MeshBasicMaterial();
    
    this.mesh = new InstancedMesh(geometry, material, count);
    
    // 初始化粒子
    for (let i = 0; i < count; i++) {
      this.positions.push(new Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ));
      
      this.velocities.push(new Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ));
    }
    
    this.updateMatrices();
  }
  
  update(deltaTime: number): void {
    const bounds = 10;
    
    for (let i = 0; i < this.count; i++) {
      // 更新位置
      this.positions[i].add(this.velocities[i]);
      
      // 边界反弹
      ['x', 'y', 'z'].forEach(axis => {
        if (Math.abs(this.positions[i][axis]) > bounds) {
          this.velocities[i][axis] *= -1;
          this.positions[i][axis] = Math.sign(this.positions[i][axis]) * bounds;
        }
      });
    }
    
    this.updateMatrices();
  }
  
  private updateMatrices(): void {
    const matrix = new Matrix4();
    
    for (let i = 0; i < this.count; i++) {
      matrix.setPosition(this.positions[i]);
      this.mesh.setMatrixAt(i, matrix);
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  
  getMesh(): InstancedMesh {
    return this.mesh;
  }
}
```

## 自定义实例属性

```typescript
// 添加自定义属性
const instancedMesh = new InstancedMesh(geometry, material, count);

// 自定义属性数组
const customData = new Float32Array(count);
for (let i = 0; i < count; i++) {
  customData[i] = Math.random();
}

// 添加到几何体
geometry.setAttribute(
  'aCustom',
  new InstancedBufferAttribute(customData, 1)
);

// 在着色器中使用
const customMaterial = new ShaderMaterial({
  vertexShader: `
    attribute float aCustom;
    varying float vCustom;
    
    void main() {
      vCustom = aCustom;
      
      // 使用实例矩阵
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vCustom;
    
    void main() {
      gl_FragColor = vec4(vec3(vCustom), 1.0);
    }
  `,
});
```

## 射线检测实例

```typescript
const raycaster = new Raycaster();

function checkInstanceClick(event: MouseEvent): void {
  const mouse = new Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObject(instancedMesh);
  
  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;
    console.log('Clicked instance:', instanceId);
    
    // 高亮选中的实例
    if (instanceId !== undefined) {
      const color = new Color(0xff0000);
      instancedMesh.setColorAt(instanceId, color);
      instancedMesh.instanceColor!.needsUpdate = true;
    }
  }
}
```

## 分批渲染

```typescript
// 对于超大量实例，分批处理
class BatchedInstances {
  private batches: InstancedMesh[] = [];
  private batchSize = 10000;
  
  constructor(
    geometry: BufferGeometry,
    material: Material,
    totalCount: number
  ) {
    const batchCount = Math.ceil(totalCount / this.batchSize);
    
    for (let i = 0; i < batchCount; i++) {
      const count = Math.min(
        this.batchSize,
        totalCount - i * this.batchSize
      );
      
      const mesh = new InstancedMesh(geometry, material, count);
      this.batches.push(mesh);
    }
  }
  
  setMatrixAt(index: number, matrix: Matrix4): void {
    const batchIndex = Math.floor(index / this.batchSize);
    const localIndex = index % this.batchSize;
    this.batches[batchIndex].setMatrixAt(localIndex, matrix);
  }
  
  update(): void {
    for (const batch of this.batches) {
      batch.instanceMatrix.needsUpdate = true;
    }
  }
  
  addToScene(scene: Scene): void {
    for (const batch of this.batches) {
      scene.add(batch);
    }
  }
}
```

## 视锥剔除优化

```typescript
class FrustumCulledInstances {
  private mesh: InstancedMesh;
  private positions: Vector3[];
  private visibleIndices: number[] = [];
  private frustum = new Frustum();
  private projScreenMatrix = new Matrix4();
  
  constructor(geometry: BufferGeometry, material: Material, positions: Vector3[]) {
    this.positions = positions;
    this.mesh = new InstancedMesh(geometry, material, positions.length);
  }
  
  update(camera: Camera): void {
    // 更新视锥
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    
    // 筛选可见实例
    this.visibleIndices = [];
    const sphere = new Sphere();
    
    for (let i = 0; i < this.positions.length; i++) {
      sphere.center.copy(this.positions[i]);
      sphere.radius = 1; // 物体半径
      
      if (this.frustum.intersectsSphere(sphere)) {
        this.visibleIndices.push(i);
      }
    }
    
    // 更新实例数量
    this.mesh.count = this.visibleIndices.length;
    
    // 重新排列矩阵
    const matrix = new Matrix4();
    for (let i = 0; i < this.visibleIndices.length; i++) {
      const srcIndex = this.visibleIndices[i];
      matrix.setPosition(this.positions[srcIndex]);
      this.mesh.setMatrixAt(i, matrix);
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
```

## 森林示例

```typescript
class Forest {
  private trees: InstancedMesh;
  private count: number;
  
  constructor(count: number, terrain: Mesh) {
    this.count = count;
    
    // 加载树模型（假设已有）
    const treeGeometry = new ConeGeometry(0.5, 2, 8);
    const treeMaterial = new MeshLambertMaterial({ color: 0x228b22 });
    
    this.trees = new InstancedMesh(treeGeometry, treeMaterial, count);
    
    this.placeTreesOnTerrain(terrain);
  }
  
  private placeTreesOnTerrain(terrain: Mesh): void {
    const raycaster = new Raycaster();
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    
    let placed = 0;
    
    while (placed < this.count) {
      // 随机 XZ 位置
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      
      // 从上向下发射射线
      raycaster.set(
        new Vector3(x, 100, z),
        new Vector3(0, -1, 0)
      );
      
      const intersects = raycaster.intersectObject(terrain);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
        
        // 获取地形高度
        position.copy(hit.point);
        
        // 根据地形法线调整旋转
        const normal = hit.face!.normal.clone();
        rotation.setFromUnitVectors(new Vector3(0, 1, 0), normal);
        
        // 随机缩放
        const s = 0.8 + Math.random() * 0.4;
        scale.set(s, s, s);
        
        // 添加随机旋转
        rotation.multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(0, 1, 0),
            Math.random() * Math.PI * 2
          )
        );
        
        matrix.compose(position, rotation, scale);
        this.trees.setMatrixAt(placed, matrix);
        
        placed++;
      }
    }
    
    this.trees.instanceMatrix.needsUpdate = true;
  }
  
  getMesh(): InstancedMesh {
    return this.trees;
  }
}
```

## 性能对比

| 方案 | 10,000 物体 | Draw Calls | 内存 |
|------|------------|------------|------|
| 独立 Mesh | ~10 FPS | 10,000 | 高 |
| 合并几何体 | ~50 FPS | 1 | 中 |
| InstancedMesh | ~60 FPS | 1 | 低 |

```typescript
// 性能测试
function benchmark(type: 'individual' | 'merged' | 'instanced'): void {
  const count = 10000;
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial();
  
  console.time(type);
  
  switch (type) {
    case 'individual':
      // 独立网格（最慢）
      for (let i = 0; i < count; i++) {
        const mesh = new Mesh(geometry, material);
        scene.add(mesh);
      }
      break;
      
    case 'merged':
      // 合并几何体
      const geometries: BufferGeometry[] = [];
      for (let i = 0; i < count; i++) {
        const g = geometry.clone();
        g.translate(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50
        );
        geometries.push(g);
      }
      const merged = BufferGeometryUtils.mergeGeometries(geometries);
      scene.add(new Mesh(merged, material));
      break;
      
    case 'instanced':
      // 实例化（最快）
      const instanced = new InstancedMesh(geometry, material, count);
      const matrix = new Matrix4();
      for (let i = 0; i < count; i++) {
        matrix.setPosition(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50
        );
        instanced.setMatrixAt(i, matrix);
      }
      scene.add(instanced);
      break;
  }
  
  console.timeEnd(type);
}
```

## 本章小结

- InstancedMesh 复用几何体和材质
- 每个实例有独立的变换矩阵和颜色
- 可添加自定义实例属性
- 射线检测返回 instanceId
- 视锥剔除可进一步优化性能
- 适合草地、森林、粒子等大量相似物体

下一章，我们将学习 LOD 细节层次系统。
