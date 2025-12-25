# Raycaster 交互

> "射线是连接虚拟与现实的桥梁。"

## Raycaster 基础

```
射线检测原理：

        Camera
           │
           │ Ray (射线)
           │
           ▼
    ┌──────┴──────┐
    │   Object1   │ ← 命中
    └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   Object2   │ ← 命中
    └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   Object3   │ ← 未命中（被遮挡或不在路径上）
    └─────────────┘

返回：按距离排序的交点数组
```

## 基础使用

```typescript
import { Raycaster, Vector2, Object3D, Intersection } from 'three';

const raycaster = new Raycaster();
const mouse = new Vector2();

// 从鼠标位置发射射线
function onMouseMove(event: MouseEvent): void {
  // 将鼠标坐标转换为标准化设备坐标 (-1 到 +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function checkIntersection(objects: Object3D[]): Intersection[] {
  // 从相机发射射线
  raycaster.setFromCamera(mouse, camera);
  
  // 检测相交
  const intersects = raycaster.intersectObjects(objects);
  
  return intersects;
}

// 使用
window.addEventListener('mousemove', onMouseMove);

function animate() {
  const intersects = checkIntersection(scene.children);
  
  if (intersects.length > 0) {
    const firstHit = intersects[0];
    console.log('Hit object:', firstHit.object.name);
    console.log('Hit point:', firstHit.point);
    console.log('Distance:', firstHit.distance);
  }
}
```

## Intersection 对象

```typescript
interface Intersection {
  object: Object3D;          // 被击中的物体
  point: Vector3;            // 世界坐标中的交点
  distance: number;          // 射线原点到交点的距离
  face?: Face | null;        // 被击中的面
  faceIndex?: number;        // 面索引
  uv?: Vector2;              // 交点的 UV 坐标
  uv1?: Vector2;             // 第二套 UV
  normal?: Vector3;          // 交点的法线
  instanceId?: number;       // InstancedMesh 的实例 ID
}

// 访问详细信息
function handleIntersection(intersect: Intersection): void {
  // 获取物体
  const obj = intersect.object as Mesh;
  
  // 获取交点位置
  const hitPoint = intersect.point;
  
  // 获取法线
  const normal = intersect.normal;
  
  // 获取 UV（用于纹理交互）
  const uv = intersect.uv;
  
  // 获取面信息
  const face = intersect.face;
  if (face) {
    console.log('Face normal:', face.normal);
    console.log('Vertex indices:', face.a, face.b, face.c);
  }
}
```

## 鼠标交互系统

```typescript
class MouseInteraction {
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private camera: Camera;
  private interactiveObjects: Object3D[] = [];
  
  private hoveredObject: Object3D | null = null;
  private selectedObject: Object3D | null = null;
  
  constructor(
    camera: Camera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.addEventListener('click', this.onClick.bind(this));
    domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  addInteractiveObject(object: Object3D): void {
    this.interactiveObjects.push(object);
    object.userData.interactive = true;
  }
  
  removeInteractiveObject(object: Object3D): void {
    const index = this.interactiveObjects.indexOf(object);
    if (index !== -1) {
      this.interactiveObjects.splice(index, 1);
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    
    const intersects = this.getIntersects();
    
    if (intersects.length > 0) {
      const newHovered = intersects[0].object;
      
      if (this.hoveredObject !== newHovered) {
        // 离开旧物体
        if (this.hoveredObject) {
          this.onHoverEnd(this.hoveredObject);
        }
        
        // 进入新物体
        this.hoveredObject = newHovered;
        this.onHoverStart(this.hoveredObject, intersects[0]);
      }
      
      // 持续悬停
      this.onHover(this.hoveredObject, intersects[0]);
    } else {
      if (this.hoveredObject) {
        this.onHoverEnd(this.hoveredObject);
        this.hoveredObject = null;
      }
    }
  }
  
  private onClick(event: MouseEvent): void {
    this.updateMouse(event);
    
    const intersects = this.getIntersects();
    
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      
      if (this.selectedObject !== clickedObject) {
        if (this.selectedObject) {
          this.onDeselect(this.selectedObject);
        }
        
        this.selectedObject = clickedObject;
        this.onSelect(clickedObject, intersects[0]);
      }
    } else {
      if (this.selectedObject) {
        this.onDeselect(this.selectedObject);
        this.selectedObject = null;
      }
    }
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.updateMouse(event);
    const intersects = this.getIntersects();
    
    if (intersects.length > 0) {
      this.onDragStart(intersects[0].object, intersects[0]);
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
    if (this.selectedObject) {
      this.onDragEnd(this.selectedObject);
    }
  }
  
  private updateMouse(event: MouseEvent): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  private getIntersects(): Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(this.interactiveObjects, true);
  }
  
  // 事件回调（可重写）
  protected onHoverStart(object: Object3D, intersect: Intersection): void {
    document.body.style.cursor = 'pointer';
    
    if (object instanceof Mesh) {
      (object.material as MeshStandardMaterial).emissive.setHex(0x333333);
    }
  }
  
  protected onHover(object: Object3D, intersect: Intersection): void {
    // 持续悬停处理
  }
  
  protected onHoverEnd(object: Object3D): void {
    document.body.style.cursor = 'default';
    
    if (object instanceof Mesh) {
      (object.material as MeshStandardMaterial).emissive.setHex(0x000000);
    }
  }
  
  protected onSelect(object: Object3D, intersect: Intersection): void {
    console.log('Selected:', object.name);
  }
  
  protected onDeselect(object: Object3D): void {
    console.log('Deselected:', object.name);
  }
  
  protected onDragStart(object: Object3D, intersect: Intersection): void {
    console.log('Drag start:', object.name);
  }
  
  protected onDragEnd(object: Object3D): void {
    console.log('Drag end:', object.name);
  }
}
```

## 拖拽系统

```typescript
class DragControls {
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private camera: Camera;
  private domElement: HTMLElement;
  
  private draggableObjects: Object3D[] = [];
  private draggedObject: Object3D | null = null;
  private dragPlane = new Plane();
  private offset = new Vector3();
  
  constructor(
    camera: Camera,
    domElement: HTMLElement,
    objects: Object3D[]
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.draggableObjects = objects;
    
    domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.draggableObjects);
    
    if (intersects.length > 0) {
      this.draggedObject = intersects[0].object;
      
      // 创建拖拽平面（平行于相机）
      const cameraDirection = new Vector3();
      this.camera.getWorldDirection(cameraDirection);
      this.dragPlane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        intersects[0].point
      );
      
      // 计算偏移（保持点击点和物体位置的关系）
      this.offset.copy(intersects[0].point).sub(this.draggedObject.position);
      
      this.domElement.style.cursor = 'grabbing';
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (!this.draggedObject) return;
    
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // 获取射线与平面的交点
    const intersection = new Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    
    if (intersection) {
      this.draggedObject.position.copy(intersection.sub(this.offset));
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
    this.draggedObject = null;
    this.domElement.style.cursor = 'auto';
  }
  
  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
}
```

## 射线配置

```typescript
// Raycaster 参数
const raycaster = new Raycaster();

// 设置远近裁剪
raycaster.near = 0;   // 最近检测距离
raycaster.far = 1000; // 最远检测距离

// 设置线段检测阈值
raycaster.params.Line.threshold = 0.1;

// 设置点检测阈值
raycaster.params.Points.threshold = 0.1;

// 设置 Sprite 检测
raycaster.params.Sprite = {};

// 手动设置射线
raycaster.set(
  new Vector3(0, 0, 0),      // 原点
  new Vector3(0, -1, 0)       // 方向（需要归一化）
);
```

## 特殊物体检测

```typescript
// 检测 InstancedMesh
function checkInstancedMesh(
  raycaster: Raycaster,
  instancedMesh: InstancedMesh
): { instanceId: number; intersection: Intersection } | null {
  const intersects = raycaster.intersectObject(instancedMesh);
  
  if (intersects.length > 0) {
    const hit = intersects[0];
    return {
      instanceId: hit.instanceId!,
      intersection: hit,
    };
  }
  
  return null;
}

// 检测 Sprite
function checkSprites(
  raycaster: Raycaster,
  sprites: Sprite[]
): Intersection[] {
  return raycaster.intersectObjects(sprites);
}

// 检测 Line
function checkLines(
  raycaster: Raycaster,
  lines: Line[]
): Intersection[] {
  raycaster.params.Line.threshold = 0.5; // 增大阈值更容易选中
  return raycaster.intersectObjects(lines);
}

// 检测 Points
function checkPoints(
  raycaster: Raycaster,
  points: Points
): Intersection[] {
  raycaster.params.Points.threshold = 0.1;
  return raycaster.intersectObject(points);
}
```

## 性能优化

```typescript
// 使用边界盒预筛选
class OptimizedRaycaster {
  private raycaster = new Raycaster();
  private boundingBoxes = new Map<Object3D, Box3>();
  
  addObject(object: Object3D): void {
    const box = new Box3().setFromObject(object);
    this.boundingBoxes.set(object, box);
  }
  
  check(
    origin: Vector3,
    direction: Vector3,
    objects: Object3D[]
  ): Intersection[] {
    this.raycaster.set(origin, direction);
    const ray = this.raycaster.ray;
    
    // 先用边界盒筛选
    const candidates: Object3D[] = [];
    
    for (const obj of objects) {
      const box = this.boundingBoxes.get(obj);
      if (box && ray.intersectsBox(box)) {
        candidates.push(obj);
      }
    }
    
    // 只对候选物体做精确检测
    return this.raycaster.intersectObjects(candidates);
  }
}

// 使用八叉树加速
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

const octree = new Octree();
octree.fromGraphNode(scene);

// 使用八叉树进行射线检测
function raycastWithOctree(
  origin: Vector3,
  direction: Vector3
): any {
  const ray = new Ray(origin, direction);
  return octree.raycast(ray);
}
```

## 3D 绘制

```typescript
// 在物体表面绘制
class SurfaceDrawer {
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private camera: Camera;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: CanvasTexture;
  
  constructor(
    camera: Camera,
    targetMesh: Mesh,
    resolution = 512
  ) {
    this.camera = camera;
    
    // 创建画布纹理
    this.canvas = document.createElement('canvas');
    this.canvas.width = resolution;
    this.canvas.height = resolution;
    this.context = this.canvas.getContext('2d')!;
    
    // 填充白色背景
    this.context.fillStyle = 'white';
    this.context.fillRect(0, 0, resolution, resolution);
    
    this.texture = new CanvasTexture(this.canvas);
    (targetMesh.material as MeshStandardMaterial).map = this.texture;
  }
  
  draw(
    event: MouseEvent,
    targetMesh: Mesh,
    color = 'red',
    size = 10
  ): void {
    // 更新鼠标位置
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(targetMesh);
    
    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      
      // UV 坐标转画布坐标
      const x = uv.x * this.canvas.width;
      const y = (1 - uv.y) * this.canvas.height;
      
      // 绘制
      this.context.beginPath();
      this.context.arc(x, y, size, 0, Math.PI * 2);
      this.context.fillStyle = color;
      this.context.fill();
      
      this.texture.needsUpdate = true;
    }
  }
}
```

## 本章小结

- Raycaster 从相机或任意点发射射线
- intersectObjects 返回按距离排序的交点
- 鼠标坐标需要转换为标准化设备坐标
- 拖拽需要计算拖拽平面
- 使用边界盒或八叉树优化性能
- UV 坐标可用于表面绘制

下一章，我们将学习自定义着色器。
