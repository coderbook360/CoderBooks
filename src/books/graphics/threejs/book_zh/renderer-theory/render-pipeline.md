# Three.js 渲染管线

> "理解渲染管线是优化性能和实现高级效果的基础。"

## 渲染流程概览

```
render() 调用
      │
      ▼
┌─────────────────┐
│  场景更新       │ updateMatrixWorld
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  投影矩阵       │ camera.updateProjectionMatrix
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  视锥剔除       │ frustum.containsPoint
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  渲染列表       │ 收集可渲染对象
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  排序           │ 透明/不透明分组
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  阴影图         │ 可选
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  渲染不透明     │ 前向渲染
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  渲染天空盒     │ 可选
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  渲染透明       │ 从后向前
└─────────────────┘
```

## 场景准备

### 矩阵更新

```typescript
function projectObject(
  object: Object3D,
  camera: Camera,
  sortObjects: boolean
): void {
  if (object.visible === false) return;
  
  // 测试图层
  if (!object.layers.test(camera.layers)) return;
  
  if (object.isGroup) {
    // Group 只是容器
  } else if (object.isLOD) {
    // LOD 选择合适级别
    if (object.autoUpdate) {
      object.update(camera);
    }
  } else if (object.isLight) {
    // 收集光源
    currentRenderState.pushLight(object);
    
    if (object.castShadow) {
      currentRenderState.pushShadow(object);
    }
  } else if (object.isSprite) {
    // 精灵
    if (!object.frustumCulled || frustum.intersectsSprite(object)) {
      if (sortObjects) {
        _vector3.setFromMatrixPosition(object.matrixWorld)
          .applyMatrix4(projScreenMatrix);
      }
      
      const geometry = objects.update(object);
      const material = object.material;
      
      currentRenderState.push(object, geometry, material, _vector3.z);
    }
  } else if (object.isMesh || object.isLine || object.isPoints) {
    // 可渲染对象
    if (!object.frustumCulled || frustum.intersectsObject(object)) {
      const geometry = objects.update(object);
      const material = object.material;
      
      if (sortObjects) {
        if (geometry.boundingSphere === null) {
          geometry.computeBoundingSphere();
        }
        
        _vector3
          .copy(geometry.boundingSphere.center)
          .applyMatrix4(object.matrixWorld)
          .applyMatrix4(projScreenMatrix);
      }
      
      if (Array.isArray(material)) {
        const groups = geometry.groups;
        
        for (const group of groups) {
          const groupMaterial = material[group.materialIndex];
          
          if (groupMaterial && groupMaterial.visible) {
            currentRenderState.push(
              object, geometry, groupMaterial, _vector3.z, group
            );
          }
        }
      } else if (material.visible) {
        currentRenderState.push(object, geometry, material, _vector3.z);
      }
    }
  }
  
  // 递归处理子对象
  const children = object.children;
  
  for (const child of children) {
    projectObject(child, camera, sortObjects);
  }
}
```

### 视锥剔除

```typescript
class Frustum {
  planes: Plane[];
  
  constructor() {
    this.planes = [
      new Plane(), // left
      new Plane(), // right
      new Plane(), // bottom
      new Plane(), // top
      new Plane(), // near
      new Plane(), // far
    ];
  }
  
  setFromProjectionMatrix(m: Matrix4): this {
    const planes = this.planes;
    const me = m.elements;
    const me0 = me[0], me1 = me[1], me2 = me[2], me3 = me[3];
    const me4 = me[4], me5 = me[5], me6 = me[6], me7 = me[7];
    const me8 = me[8], me9 = me[9], me10 = me[10], me11 = me[11];
    const me12 = me[12], me13 = me[13], me14 = me[14], me15 = me[15];
    
    // Left
    planes[0].setComponents(
      me3 + me0, me7 + me4, me11 + me8, me15 + me12
    ).normalize();
    
    // Right
    planes[1].setComponents(
      me3 - me0, me7 - me4, me11 - me8, me15 - me12
    ).normalize();
    
    // Bottom
    planes[2].setComponents(
      me3 + me1, me7 + me5, me11 + me9, me15 + me13
    ).normalize();
    
    // Top
    planes[3].setComponents(
      me3 - me1, me7 - me5, me11 - me9, me15 - me13
    ).normalize();
    
    // Near
    planes[4].setComponents(
      me3 + me2, me7 + me6, me11 + me10, me15 + me14
    ).normalize();
    
    // Far
    planes[5].setComponents(
      me3 - me2, me7 - me6, me11 - me10, me15 - me14
    ).normalize();
    
    return this;
  }
  
  intersectsObject(object: Object3D): boolean {
    const geometry = object.geometry;
    
    if (geometry.boundingSphere === null) {
      geometry.computeBoundingSphere();
    }
    
    _sphere.copy(geometry.boundingSphere)
      .applyMatrix4(object.matrixWorld);
    
    return this.intersectsSphere(_sphere);
  }
  
  intersectsSphere(sphere: Sphere): boolean {
    const planes = this.planes;
    const center = sphere.center;
    const negRadius = -sphere.radius;
    
    for (let i = 0; i < 6; i++) {
      const distance = planes[i].distanceToPoint(center);
      
      if (distance < negRadius) {
        return false;
      }
    }
    
    return true;
  }
}
```

## 渲染列表

### RenderList 结构

```typescript
interface RenderItem {
  id: number;
  object: Object3D;
  geometry: BufferGeometry;
  material: Material;
  program: WebGLProgram;
  groupOrder: number;
  renderOrder: number;
  z: number;
  group: any;
}

class WebGLRenderList {
  opaque: RenderItem[] = [];
  transmissive: RenderItem[] = [];
  transparent: RenderItem[] = [];
  
  init(): void {
    this.opaque.length = 0;
    this.transmissive.length = 0;
    this.transparent.length = 0;
  }
  
  push(
    object: Object3D,
    geometry: BufferGeometry,
    material: Material,
    z: number,
    group?: any
  ): void {
    const renderItem: RenderItem = {
      id: object.id,
      object,
      geometry,
      material,
      program: material.program,
      groupOrder: object.renderOrder,
      renderOrder: material.renderOrder,
      z,
      group,
    };
    
    if (material.transmission > 0) {
      this.transmissive.push(renderItem);
    } else if (material.transparent) {
      this.transparent.push(renderItem);
    } else {
      this.opaque.push(renderItem);
    }
  }
  
  sort(
    opaqueSort: (a: RenderItem, b: RenderItem) => number,
    transparentSort: (a: RenderItem, b: RenderItem) => number
  ): void {
    if (this.opaque.length > 1) {
      this.opaque.sort(opaqueSort);
    }
    if (this.transmissive.length > 1) {
      this.transmissive.sort(transparentSort);
    }
    if (this.transparent.length > 1) {
      this.transparent.sort(transparentSort);
    }
  }
}
```

### 排序策略

```typescript
// 不透明排序：程序 > 材质 > 前向后
function painterSortStable(a: RenderItem, b: RenderItem): number {
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  } else if (a.renderOrder !== b.renderOrder) {
    return a.renderOrder - b.renderOrder;
  } else if (a.program !== b.program) {
    return a.program.id - b.program.id;
  } else if (a.material.id !== b.material.id) {
    return a.material.id - b.material.id;
  } else if (a.z !== b.z) {
    return a.z - b.z;
  } else {
    return a.id - b.id;
  }
}

// 透明排序：后向前
function reversePainterSortStable(a: RenderItem, b: RenderItem): number {
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  } else if (a.renderOrder !== b.renderOrder) {
    return a.renderOrder - b.renderOrder;
  } else if (a.z !== b.z) {
    return b.z - a.z; // 反向
  } else {
    return a.id - b.id;
  }
}
```

## 渲染执行

### 渲染对象

```typescript
function renderObject(
  object: Object3D,
  scene: Scene,
  camera: Camera,
  geometry: BufferGeometry,
  material: Material,
  group: any
): void {
  object.onBeforeRender(renderer, scene, camera, geometry, material, group);
  
  // 计算模型视图矩阵
  object.modelViewMatrix.multiplyMatrices(
    camera.matrixWorldInverse,
    object.matrixWorld
  );
  
  // 计算法线矩阵
  object.normalMatrix.getNormalMatrix(object.modelViewMatrix);
  
  // 处理变形目标
  if (geometry.morphAttributes.position || geometry.morphAttributes.normal) {
    morphtargets.update(object, geometry, program);
  }
  
  // 获取/创建程序
  const program = setProgram(camera, scene, geometry, material, object);
  
  // 绑定状态
  state.setMaterial(material);
  
  // 绑定几何体
  bindingStates.setup(object, material, program, geometry);
  
  // 索引
  let index = geometry.index;
  let rangeFactor = 1;
  
  if (material.wireframe) {
    index = geometries.getWireframeAttribute(geometry);
    rangeFactor = 2;
  }
  
  // 绘制范围
  const drawRange = geometry.drawRange;
  const position = geometry.attributes.position;
  
  let drawStart = drawRange.start * rangeFactor;
  let drawEnd = (drawRange.start + drawRange.count) * rangeFactor;
  
  if (group !== null) {
    drawStart = Math.max(drawStart, group.start * rangeFactor);
    drawEnd = Math.min(drawEnd, (group.start + group.count) * rangeFactor);
  }
  
  // 执行绘制
  if (index !== null) {
    const count = Math.max(0, Math.min(drawEnd, index.count) - drawStart);
    renderer.renderBufferDirect(
      camera, scene, geometry, material, object, group
    );
  } else if (position !== undefined) {
    const count = Math.max(0, Math.min(drawEnd, position.count) - drawStart);
    renderer.renderBufferDirect(
      camera, scene, geometry, material, object, group
    );
  }
  
  object.onAfterRender(renderer, scene, camera, geometry, material, group);
}
```

### 绘制调用

```typescript
renderBufferDirect(
  camera: Camera,
  scene: Scene,
  geometry: BufferGeometry,
  material: Material,
  object: Object3D,
  group: any
): void {
  const index = geometry.index;
  const position = geometry.attributes.position;
  
  // 实例化
  const isInstancedMesh = object.isInstancedMesh;
  const isInstancedBufferGeometry = geometry.isInstancedBufferGeometry;
  
  // 获取绘制信息
  let drawStart = 0;
  let drawCount = Infinity;
  
  if (index !== null) {
    drawCount = index.count;
  } else if (position !== undefined) {
    drawCount = position.count;
  }
  
  const drawRange = geometry.drawRange;
  
  drawStart = Math.max(drawStart, drawRange.start);
  drawCount = Math.min(drawCount, drawRange.count);
  
  if (group !== null) {
    drawStart = Math.max(drawStart, group.start);
    drawCount = Math.min(drawCount, group.count);
  }
  
  if (drawCount === 0) return;
  
  // 执行绘制
  if (isInstancedMesh) {
    if (index !== null) {
      gl.drawElementsInstanced(
        this.getDrawMode(material),
        drawCount,
        this.getIndexType(index),
        drawStart * index.array.BYTES_PER_ELEMENT,
        object.count
      );
    } else {
      gl.drawArraysInstanced(
        this.getDrawMode(material),
        drawStart,
        drawCount,
        object.count
      );
    }
  } else if (isInstancedBufferGeometry) {
    const instanceCount = geometry.instanceCount;
    
    if (index !== null) {
      gl.drawElementsInstanced(
        this.getDrawMode(material),
        drawCount,
        this.getIndexType(index),
        drawStart * index.array.BYTES_PER_ELEMENT,
        instanceCount
      );
    } else {
      gl.drawArraysInstanced(
        this.getDrawMode(material),
        drawStart,
        drawCount,
        instanceCount
      );
    }
  } else {
    if (index !== null) {
      gl.drawElements(
        this.getDrawMode(material),
        drawCount,
        this.getIndexType(index),
        drawStart * index.array.BYTES_PER_ELEMENT
      );
    } else {
      gl.drawArrays(
        this.getDrawMode(material),
        drawStart,
        drawCount
      );
    }
  }
}

private getDrawMode(material: Material): number {
  const gl = this.gl;
  
  if (material.wireframe) {
    return gl.LINES;
  }
  
  switch (material.side) {
    case DoubleSide:
      return gl.TRIANGLES;
    default:
      return gl.TRIANGLES;
  }
}
```

## 渲染状态

### 状态管理

```typescript
class WebGLState {
  private gl: WebGL2RenderingContext;
  
  // 缓存的状态
  private currentBlendingEnabled: boolean = false;
  private currentBlendSrc: number | null = null;
  private currentBlendDst: number | null = null;
  private currentDepthTest: boolean = false;
  private currentDepthWrite: boolean = true;
  private currentCullFace: number | null = null;
  
  setMaterial(material: Material): void {
    // 背面剔除
    if (material.side === DoubleSide) {
      this.disable(this.gl.CULL_FACE);
    } else {
      this.enable(this.gl.CULL_FACE);
    }
    
    let flipSided = material.side === BackSide;
    
    if (flipSided) {
      this.gl.cullFace(this.gl.FRONT);
    } else {
      this.gl.cullFace(this.gl.BACK);
    }
    
    // 混合
    this.setBlending(
      material.blending,
      material.blendEquation,
      material.blendSrc,
      material.blendDst,
      material.blendEquationAlpha,
      material.blendSrcAlpha,
      material.blendDstAlpha,
      material.premultipliedAlpha
    );
    
    // 深度
    this.setDepthTest(material.depthTest);
    this.setDepthWrite(material.depthWrite);
    
    // 颜色写入
    this.setColorWrite(
      material.colorWrite,
      material.colorWrite,
      material.colorWrite,
      material.colorWrite
    );
    
    // 多边形偏移
    this.setPolygonOffset(
      material.polygonOffset,
      material.polygonOffsetFactor,
      material.polygonOffsetUnits
    );
  }
  
  setBlending(
    blending: number,
    blendEquation?: number,
    blendSrc?: number,
    blendDst?: number,
    blendEquationAlpha?: number,
    blendSrcAlpha?: number,
    blendDstAlpha?: number,
    premultipliedAlpha?: boolean
  ): void {
    const gl = this.gl;
    
    if (blending === NoBlending) {
      if (this.currentBlendingEnabled) {
        this.disable(gl.BLEND);
        this.currentBlendingEnabled = false;
      }
      return;
    }
    
    if (!this.currentBlendingEnabled) {
      this.enable(gl.BLEND);
      this.currentBlendingEnabled = true;
    }
    
    if (blending === CustomBlending) {
      // 自定义混合
      blendEquation = blendEquation || AddEquation;
      blendSrc = blendSrc || SrcAlphaFactor;
      blendDst = blendDst || OneMinusSrcAlphaFactor;
    } else {
      // 预设混合模式
      switch (blending) {
        case NormalBlending:
          blendEquation = AddEquation;
          blendSrc = SrcAlphaFactor;
          blendDst = OneMinusSrcAlphaFactor;
          break;
        case AdditiveBlending:
          blendEquation = AddEquation;
          blendSrc = OneFactor;
          blendDst = OneFactor;
          break;
        case SubtractiveBlending:
          blendEquation = AddEquation;
          blendSrc = ZeroFactor;
          blendDst = OneMinusSrcColorFactor;
          break;
        case MultiplyBlending:
          blendEquation = AddEquation;
          blendSrc = ZeroFactor;
          blendDst = SrcColorFactor;
          break;
      }
    }
    
    if (blendSrc !== this.currentBlendSrc || blendDst !== this.currentBlendDst) {
      gl.blendFunc(
        this.getBlendFactor(blendSrc),
        this.getBlendFactor(blendDst)
      );
      this.currentBlendSrc = blendSrc;
      this.currentBlendDst = blendDst;
    }
  }
  
  setDepthTest(depthTest: boolean): void {
    const gl = this.gl;
    
    if (depthTest !== this.currentDepthTest) {
      if (depthTest) {
        gl.enable(gl.DEPTH_TEST);
      } else {
        gl.disable(gl.DEPTH_TEST);
      }
      this.currentDepthTest = depthTest;
    }
  }
  
  setDepthWrite(depthWrite: boolean): void {
    const gl = this.gl;
    
    if (depthWrite !== this.currentDepthWrite) {
      gl.depthMask(depthWrite);
      this.currentDepthWrite = depthWrite;
    }
  }
}
```

## 本章小结

- 渲染从 render() 开始，依次更新矩阵、剔除、排序、绘制
- 视锥剔除通过 6 个平面测试包围球
- RenderList 按透明度分组排序
- 不透明前向后，透明后向前
- 状态管理避免重复 WebGL 调用
- 支持实例化渲染减少绘制调用

下一章，我们将学习 WebGL 状态管理。
