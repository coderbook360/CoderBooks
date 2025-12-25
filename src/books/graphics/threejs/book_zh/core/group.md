# Group 辅助类

> "Group 是组织对象的逻辑容器，让场景结构更清晰。"

## Group 概述

Group 是 Object3D 的简单子类，用于逻辑分组：

```typescript
// src/objects/Group.ts
import { Object3D } from '../core/Object3D';

export class Group extends Object3D {
  readonly isGroup = true;
  type = 'Group';
  
  constructor() {
    super();
  }
}
```

## 为什么需要 Group

### 与直接使用 Object3D 的区别

| 特性 | Object3D | Group |
|------|----------|-------|
| 标识 | isObject3D | isGroup |
| 类型 | 'Object3D' | 'Group' |
| 语义 | 通用基类 | 逻辑分组 |
| 序列化 | 保存为 Object3D | 保存为 Group |

### 使用场景

```typescript
// 1. 场景组织
const scene = new Scene();

const environment = new Group();
environment.name = 'Environment';

const characters = new Group();
characters.name = 'Characters';

const ui = new Group();
ui.name = 'UI';

scene.add(environment, characters, ui);
```

```
Scene
├── Environment (Group)
│   ├── Ground
│   ├── Trees
│   └── Buildings
├── Characters (Group)
│   ├── Player
│   └── Enemies
└── UI (Group)
    ├── HUD
    └── Minimap
```

## 组变换

### 统一变换

```typescript
// 创建一辆车（由多个部件组成）
const car = new Group();
car.name = 'Car';

const body = new Mesh(bodyGeometry, bodyMaterial);
const wheel1 = new Mesh(wheelGeometry, wheelMaterial);
const wheel2 = new Mesh(wheelGeometry, wheelMaterial);
const wheel3 = new Mesh(wheelGeometry, wheelMaterial);
const wheel4 = new Mesh(wheelGeometry, wheelMaterial);

// 相对位置
wheel1.position.set(-1, -0.5, 1);
wheel2.position.set(1, -0.5, 1);
wheel3.position.set(-1, -0.5, -1);
wheel4.position.set(1, -0.5, -1);

car.add(body, wheel1, wheel2, wheel3, wheel4);

// 移动整辆车
car.position.x += 10;

// 旋转整辆车
car.rotation.y = Math.PI / 4;

// 缩放整辆车
car.scale.setScalar(2);
```

### 轴心点调整

```typescript
// 默认轴心在原点
const door = new Mesh(doorGeometry, doorMaterial);
door.position.x = 0.5; // 门的中心

// 使用 Group 调整轴心
const doorGroup = new Group();
doorGroup.position.x = -0.5; // 移动 Group 到门的边缘

door.position.x = 0.5; // 门相对于 Group 偏移
doorGroup.add(door);

// 现在旋转 doorGroup，门绕边缘旋转
doorGroup.rotation.y = Math.PI / 2;
```

```
调整前:
    ┌────────┐
    │   ●    │  ● = 旋转轴心（中心）
    └────────┘
    
调整后:
  ● ┌────────┐
    │        │  ● = 旋转轴心（边缘）
    └────────┘
```

## 实用模式

### 层级管理器

```typescript
class LayerManager {
  private groups: Map<string, Group> = new Map();
  
  constructor(private scene: Scene) {}
  
  createLayer(name: string, order = 0): Group {
    const group = new Group();
    group.name = name;
    group.renderOrder = order;
    
    this.groups.set(name, group);
    this.scene.add(group);
    
    return group;
  }
  
  getLayer(name: string): Group | undefined {
    return this.groups.get(name);
  }
  
  addToLayer(name: string, object: Object3D): void {
    const group = this.groups.get(name);
    if (group) {
      group.add(object);
    }
  }
  
  setLayerVisible(name: string, visible: boolean): void {
    const group = this.groups.get(name);
    if (group) {
      group.visible = visible;
    }
  }
  
  removeLayer(name: string): void {
    const group = this.groups.get(name);
    if (group) {
      group.removeFromParent();
      this.groups.delete(name);
    }
  }
}

// 使用
const layers = new LayerManager(scene);

layers.createLayer('background', 0);
layers.createLayer('game', 1);
layers.createLayer('foreground', 2);

layers.addToLayer('game', player);
layers.addToLayer('game', enemies);

// 隐藏背景层
layers.setLayerVisible('background', false);
```

### 对象池分组

```typescript
class ObjectPool {
  private active: Group;
  private inactive: Group;
  private factory: () => Object3D;
  
  constructor(scene: Scene, factory: () => Object3D) {
    this.factory = factory;
    
    this.active = new Group();
    this.active.name = 'Active';
    
    this.inactive = new Group();
    this.inactive.name = 'Inactive';
    this.inactive.visible = false;
    
    scene.add(this.active, this.inactive);
  }
  
  acquire(): Object3D {
    let object = this.inactive.children[0];
    
    if (!object) {
      object = this.factory();
    } else {
      this.inactive.remove(object);
    }
    
    this.active.add(object);
    return object;
  }
  
  release(object: Object3D): void {
    this.active.remove(object);
    this.inactive.add(object);
  }
  
  releaseAll(): void {
    while (this.active.children.length > 0) {
      const object = this.active.children[0];
      this.release(object);
    }
  }
  
  get count(): number {
    return this.active.children.length;
  }
}
```

### 选择组

```typescript
class SelectionGroup extends Group {
  readonly isSelectionGroup = true;
  
  private selectedSet: Set<Object3D> = new Set();
  
  select(object: Object3D): void {
    if (!this.selectedSet.has(object)) {
      this.selectedSet.add(object);
      this.add(object);
      this.dispatchEvent({ type: 'select', object });
    }
  }
  
  deselect(object: Object3D): void {
    if (this.selectedSet.has(object)) {
      this.selectedSet.delete(object);
      this.remove(object);
      this.dispatchEvent({ type: 'deselect', object });
    }
  }
  
  toggle(object: Object3D): void {
    if (this.selectedSet.has(object)) {
      this.deselect(object);
    } else {
      this.select(object);
    }
  }
  
  clear(): void {
    const objects = [...this.selectedSet];
    
    for (const object of objects) {
      this.deselect(object);
    }
  }
  
  isSelected(object: Object3D): boolean {
    return this.selectedSet.has(object);
  }
  
  get selectedObjects(): Object3D[] {
    return [...this.selectedSet];
  }
  
  // 批量操作选中对象
  applyToSelection(fn: (object: Object3D) => void): void {
    this.selectedSet.forEach(fn);
  }
}

// 使用
const selection = new SelectionGroup();
scene.add(selection);

selection.select(mesh1);
selection.select(mesh2);

// 移动所有选中对象
selection.position.x += 5;

// 或批量操作
selection.applyToSelection((object) => {
  object.userData.selected = true;
});
```

### LOD Group

```typescript
class LODGroup extends Group {
  private levels: Array<{ distance: number; object: Object3D }> = [];
  private currentLevel = -1;
  
  addLevel(object: Object3D, distance: number): this {
    this.levels.push({ distance, object });
    this.levels.sort((a, b) => a.distance - b.distance);
    
    this.add(object);
    object.visible = false;
    
    return this;
  }
  
  update(camera: Camera): void {
    const distance = this.getWorldPosition(new Vector3())
      .distanceTo(camera.getWorldPosition(new Vector3()));
    
    let newLevel = 0;
    
    for (let i = 0; i < this.levels.length; i++) {
      if (distance >= this.levels[i].distance) {
        newLevel = i;
      }
    }
    
    if (newLevel !== this.currentLevel) {
      if (this.currentLevel >= 0) {
        this.levels[this.currentLevel].object.visible = false;
      }
      
      this.levels[newLevel].object.visible = true;
      this.currentLevel = newLevel;
    }
  }
}

// 使用
const lod = new LODGroup();

const highDetail = new Mesh(highGeometry, material);
const mediumDetail = new Mesh(mediumGeometry, material);
const lowDetail = new Mesh(lowGeometry, material);

lod.addLevel(highDetail, 0);
lod.addLevel(mediumDetail, 50);
lod.addLevel(lowDetail, 100);

scene.add(lod);

// 在渲染循环中更新
function animate() {
  lod.update(camera);
  renderer.render(scene, camera);
}
```

## 性能考虑

### 减少层级深度

```typescript
// 避免过深的层级
// 不好
const a = new Group();
const b = new Group();
const c = new Group();
a.add(b);
b.add(c);
c.add(mesh);

// 更好
const group = new Group();
group.add(mesh);
```

### 合并静态对象

```typescript
// 多个静态对象可以合并
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const geometries: BufferGeometry[] = [];

staticGroup.traverse((object) => {
  if (object.isMesh) {
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    geometries.push(geometry);
  }
});

const mergedGeometry = mergeGeometries(geometries);
const mergedMesh = new Mesh(mergedGeometry, material);
```

### 批量可见性

```typescript
// 控制整个分组的可见性
// 比遍历设置每个对象更高效
enemiesGroup.visible = false;
```

## 本章小结

- Group 是用于逻辑分组的 Object3D 子类
- 可以统一变换组内所有对象
- 适合组织场景结构
- 可用于实现轴心调整、对象池、选择等功能
- 注意避免过深的层级

下一章，我们将学习 BufferAttribute 属性类。
