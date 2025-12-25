# WebGLObjects 对象系统

> "对象系统是渲染器与场景的桥梁，协调几何体的实时更新。"

## 对象系统结构

```
WebGLObjects
├── 更新追踪
│   ├── frame 标记
│   └── geometry 版本
├── 对象类型
│   ├── Mesh
│   ├── Line
│   ├── Points
│   ├── Sprite
│   └── SkinnedMesh
├── 属性同步
│   ├── position
│   ├── normal
│   ├── uv
│   └── 自定义属性
└── 形态目标
    ├── morphAttributes
    └── morphTargetInfluences
```

## WebGLObjects 完整实现

```typescript
// src/renderers/webgl/WebGLObjects.ts
export class WebGLObjects {
  private _gl: WebGL2RenderingContext;
  private _geometries: WebGLGeometries;
  private _attributes: WebGLAttributes;
  private _info: WebGLInfo;
  private _bindingStates: WebGLBindingStates;
  
  // 帧更新追踪
  private _updateMap = new WeakMap<BufferGeometry, number>();
  
  constructor(
    gl: WebGL2RenderingContext,
    geometries: WebGLGeometries,
    attributes: WebGLAttributes,
    bindingStates: WebGLBindingStates,
    info: WebGLInfo
  ) {
    this._gl = gl;
    this._geometries = geometries;
    this._attributes = attributes;
    this._bindingStates = bindingStates;
    this._info = info;
  }
  
  // ==================== 更新对象 ====================
  
  update(object: Object3D): BufferGeometry {
    const frame = this._info.render.frame;
    
    // 获取几何体
    let geometry: BufferGeometry;
    
    if (object.isMesh || object.isLine || object.isPoints) {
      geometry = (object as Mesh).geometry;
    } else if (object.isSprite) {
      geometry = (object as Sprite).geometry;
    } else {
      throw new Error('Unknown object type');
    }
    
    // 检查是否已在本帧更新
    const lastFrame = this._updateMap.get(geometry);
    
    if (lastFrame !== frame) {
      // 执行更新
      this._updateGeometry(geometry);
      this._updateMap.set(geometry, frame);
    }
    
    return geometry;
  }
  
  private _updateGeometry(geometry: BufferGeometry): void {
    const gl = this._gl;
    
    // 确保几何体已注册
    this._geometries.get(geometry);
    
    // 更新所有属性
    const geometryAttributes = geometry.attributes;
    
    for (const name in geometryAttributes) {
      this._attributes.update(geometryAttributes[name], gl.ARRAY_BUFFER);
    }
    
    // 更新索引
    if (geometry.index !== null) {
      this._attributes.update(geometry.index, gl.ELEMENT_ARRAY_BUFFER);
    }
    
    // 更新形态目标属性
    this._updateMorphTargets(geometry);
  }
  
  // ==================== 形态目标 ====================
  
  private _updateMorphTargets(geometry: BufferGeometry): void {
    const gl = this._gl;
    const morphAttributes = geometry.morphAttributes;
    
    if (!morphAttributes) return;
    
    for (const name in morphAttributes) {
      const morphArray = morphAttributes[name];
      
      for (let i = 0; i < morphArray.length; i++) {
        this._attributes.update(morphArray[i], gl.ARRAY_BUFFER);
      }
    }
  }
  
  // ==================== 实例化对象 ====================
  
  updateInstancedMesh(mesh: InstancedMesh): void {
    const gl = this._gl;
    
    // 更新实例矩阵
    if (mesh.instanceMatrix) {
      this._attributes.update(mesh.instanceMatrix, gl.ARRAY_BUFFER);
    }
    
    // 更新实例颜色
    if (mesh.instanceColor) {
      this._attributes.update(mesh.instanceColor, gl.ARRAY_BUFFER);
    }
  }
  
  // ==================== 蒙皮对象 ====================
  
  updateSkinnedMesh(mesh: SkinnedMesh): void {
    // 更新骨骼矩阵纹理
    mesh.skeleton.update();
    
    // 骨骼纹理作为 uniform 传递，不在这里处理
  }
  
  // ==================== 清理 ====================
  
  dispose(): void {
    // WeakMap 自动清理，无需额外操作
  }
}
```

## WebGLInfo 统计信息

```typescript
// src/renderers/webgl/WebGLInfo.ts
interface MemoryInfo {
  geometries: number;
  textures: number;
}

interface RenderInfo {
  frame: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
}

export class WebGLInfo {
  private _gl: WebGL2RenderingContext;
  
  memory: MemoryInfo = {
    geometries: 0,
    textures: 0,
  };
  
  render: RenderInfo = {
    frame: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
  };
  
  programs: WebGLProgram[] | null = null;
  
  autoReset = true;
  
  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }
  
  // ==================== 重置渲染统计 ====================
  
  reset(): void {
    this.render.calls = 0;
    this.render.triangles = 0;
    this.render.points = 0;
    this.render.lines = 0;
  }
  
  // ==================== 更新统计 ====================
  
  update(
    object: Object3D,
    geometry: BufferGeometry,
    material: Material,
    group: any
  ): void {
    this.render.calls++;
    
    // 计算图元数量
    const index = geometry.index;
    const position = geometry.attributes.position;
    
    let rangeStart = 0;
    let rangeCount = Infinity;
    
    if (group) {
      rangeStart = group.start;
      rangeCount = group.count;
    } else {
      const drawRange = geometry.drawRange;
      rangeStart = drawRange.start;
      rangeCount = drawRange.count;
    }
    
    const count = index !== null
      ? Math.min(index.count, rangeCount)
      : Math.min(position.count, rangeCount);
    
    // 实例化乘数
    let instanceCount = 1;
    
    if (object.isInstancedMesh) {
      instanceCount = (object as InstancedMesh).count;
    } else if (geometry.isInstancedBufferGeometry) {
      instanceCount = (geometry as InstancedBufferGeometry).instanceCount;
    }
    
    // 根据绘制模式统计
    if (object.isMesh) {
      if (material.wireframe) {
        this.render.lines += count * instanceCount;
      } else {
        this.render.triangles += (count / 3) * instanceCount;
      }
    } else if (object.isLine) {
      if (object.isLineSegments) {
        this.render.lines += (count / 2) * instanceCount;
      } else if (object.isLineLoop) {
        this.render.lines += count * instanceCount;
      } else {
        this.render.lines += (count - 1) * instanceCount;
      }
    } else if (object.isPoints) {
      this.render.points += count * instanceCount;
    } else if (object.isSprite) {
      this.render.triangles += 2;
    }
  }
}
```

## WebGLRenderLists 渲染列表

```typescript
// src/renderers/webgl/WebGLRenderLists.ts
export interface RenderItem {
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

export class WebGLRenderList {
  private _renderItems: RenderItem[] = [];
  private _renderItemsIndex = 0;
  
  opaque: RenderItem[] = [];
  transmissive: RenderItem[] = [];
  transparent: RenderItem[] = [];
  
  init(): void {
    this._renderItemsIndex = 0;
    
    this.opaque.length = 0;
    this.transmissive.length = 0;
    this.transparent.length = 0;
  }
  
  push(
    object: Object3D,
    geometry: BufferGeometry,
    material: Material,
    groupOrder: number,
    z: number,
    group: any
  ): void {
    // 获取或创建渲染项
    let renderItem = this._renderItems[this._renderItemsIndex];
    
    if (!renderItem) {
      renderItem = {
        id: object.id,
        object,
        geometry,
        material,
        program: material.program!,
        groupOrder,
        renderOrder: object.renderOrder,
        z,
        group,
      };
      
      this._renderItems[this._renderItemsIndex] = renderItem;
    } else {
      renderItem.id = object.id;
      renderItem.object = object;
      renderItem.geometry = geometry;
      renderItem.material = material;
      renderItem.program = material.program!;
      renderItem.groupOrder = groupOrder;
      renderItem.renderOrder = object.renderOrder;
      renderItem.z = z;
      renderItem.group = group;
    }
    
    this._renderItemsIndex++;
    
    // 分类
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
  
  finish(): void {
    // 清理多余的渲染项（释放引用）
    for (let i = this._renderItemsIndex; i < this._renderItems.length; i++) {
      const renderItem = this._renderItems[i];
      
      if (!renderItem.id) break;
      
      renderItem.id = 0;
      renderItem.object = null!;
      renderItem.geometry = null!;
      renderItem.material = null!;
      renderItem.program = null!;
      renderItem.group = null;
    }
  }
}

// 排序函数
export function painterSortStable(a: RenderItem, b: RenderItem): number {
  // 先按组顺序
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  }
  
  // 再按渲染顺序
  if (a.renderOrder !== b.renderOrder) {
    return a.renderOrder - b.renderOrder;
  }
  
  // 再按程序（减少程序切换）
  if (a.program !== b.program) {
    return a.program.id - b.program.id;
  }
  
  // 再按材质
  if (a.material.id !== b.material.id) {
    return a.material.id - b.material.id;
  }
  
  // 最后按深度（前到后）
  if (a.z !== b.z) {
    return a.z - b.z;
  }
  
  // 保持稳定性
  return a.id - b.id;
}

export function reversePainterSortStable(a: RenderItem, b: RenderItem): number {
  // 先按组顺序
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  }
  
  // 再按渲染顺序
  if (a.renderOrder !== b.renderOrder) {
    return a.renderOrder - b.renderOrder;
  }
  
  // 按深度（后到前，透明物体）
  if (a.z !== b.z) {
    return b.z - a.z;
  }
  
  // 保持稳定性
  return a.id - b.id;
}

// 渲染列表管理
export class WebGLRenderLists {
  private _lists = new WeakMap<Scene, Map<Camera, WebGLRenderList>>();
  
  get(scene: Scene, camera: Camera): WebGLRenderList {
    let cameras = this._lists.get(scene);
    let list: WebGLRenderList | undefined;
    
    if (!cameras) {
      list = new WebGLRenderList();
      cameras = new Map();
      cameras.set(camera, list);
      this._lists.set(scene, cameras);
    } else {
      list = cameras.get(camera);
      
      if (!list) {
        list = new WebGLRenderList();
        cameras.set(camera, list);
      }
    }
    
    return list;
  }
  
  dispose(): void {
    // WeakMap 自动清理
  }
}
```

## 使用示例

```typescript
// 创建对象系统
const objects = new WebGLObjects(gl, geometries, attributes, bindingStates, info);

// 渲染循环
function render(scene: Scene, camera: Camera) {
  // 重置统计
  info.reset();
  
  // 获取渲染列表
  const renderList = renderLists.get(scene, camera);
  renderList.init();
  
  // 收集渲染项
  scene.traverse((object) => {
    if (object.isMesh) {
      const geometry = objects.update(object);
      const material = object.material;
      
      renderList.push(object, geometry, material, 0, computeZ(object), null);
    }
  });
  
  // 排序
  renderList.sort(painterSortStable, reversePainterSortStable);
  
  // 渲染不透明
  for (const item of renderList.opaque) {
    renderObject(item);
    info.update(item.object, item.geometry, item.material, item.group);
  }
  
  // 渲染透明
  for (const item of renderList.transparent) {
    renderObject(item);
    info.update(item.object, item.geometry, item.material, item.group);
  }
  
  // 完成
  renderList.finish();
  info.render.frame++;
  
  console.log(`Calls: ${info.render.calls}, Triangles: ${info.render.triangles}`);
}
```

## 本章小结

- WebGLObjects 每帧更新对象几何体
- 使用帧标记避免重复更新
- WebGLInfo 统计渲染信息
- WebGLRenderList 分类和排序渲染项
- 不透明前到后，透明后到前排序
- 按程序分组减少状态切换

下一章，我们将学习 WebGLCapabilities 能力检测。
