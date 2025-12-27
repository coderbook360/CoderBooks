# Container 容器实现

在任何场景图系统中，**Container（容器）** 都是最核心的概念之一。它实现了对象的层级关系，是构建复杂场景的基础。本章将深入解析 PixiJS 中 Container 的核心实现。

## 为什么需要 Container？

首先要问一个问题：**为什么不直接渲染所有对象，而要引入 Container 的概念？**

考虑一个简单的游戏场景：一个角色由身体、手臂、武器组成。当角色移动时，所有部件都需要跟随移动。如果没有容器，你需要手动更新每个部件的位置。

Container 解决了这个问题：**将相关对象组织在一起，共享变换**。

```
角色 Container
├── 身体 Sprite
├── 左臂 Container
│   └── 左手 Sprite
├── 右臂 Container
│   ├── 右手 Sprite
│   └── 武器 Sprite
└── 头部 Sprite
```

移动角色 Container，所有子对象自动跟随移动。旋转手臂 Container，武器也跟着旋转。

这就是**场景图（Scene Graph）** 的核心思想。

## Container 的数据结构

### 核心属性

```typescript
// src/scene/Container.ts
import { Transform } from '../maths/Transform';
import { Bounds } from './Bounds';

export class Container {
  // 标识
  public readonly uid: number;
  public label: string = '';
  
  // 层级关系
  public parent: Container | null = null;
  public readonly children: Container[] = [];
  
  // 变换
  public readonly transform: Transform;
  
  // 可见性
  public visible: boolean = true;
  
  // 渲染相关
  public renderable: boolean = true;
  public alpha: number = 1;
  
  // 世界变换（缓存）
  public worldTransform: Matrix;
  public worldAlpha: number = 1;
  
  // 边界（缓存）
  private _bounds: Bounds | null = null;
  private _boundsDirty: boolean = true;
  
  // 排序
  public sortableChildren: boolean = false;
  public zIndex: number = 0;
  
  // 更新标记
  private _dirty: boolean = true;
  
  constructor() {
    this.uid = uid++;
    this.transform = new Transform();
    this.worldTransform = new Matrix();
  }
}
```

### 变换属性的快捷访问

为了使用方便，Container 提供了变换属性的快捷访问器：

```typescript
// 位置
get position(): ObservablePoint {
  return this.transform.position;
}

get x(): number {
  return this.transform.position.x;
}

set x(value: number) {
  this.transform.position.x = value;
}

get y(): number {
  return this.transform.position.y;
}

set y(value: number) {
  this.transform.position.y = value;
}

// 缩放
get scale(): ObservablePoint {
  return this.transform.scale;
}

// 旋转
get rotation(): number {
  return this.transform.rotation;
}

set rotation(value: number) {
  this.transform.rotation = value;
}

// 斜切
get skew(): ObservablePoint {
  return this.transform.skew;
}

// 锚点（枢轴点）
get pivot(): ObservablePoint {
  return this.transform.pivot;
}
```

## 子对象管理

### 添加子对象

```typescript
/**
 * 添加一个或多个子对象
 * @param children 要添加的子对象
 */
public addChild<T extends Container>(...children: T[]): T {
  for (const child of children) {
    // 如果已有父对象，先从原父对象移除
    if (child.parent) {
      child.parent.removeChild(child);
    }
    
    // 设置新的父对象
    child.parent = this;
    
    // 添加到子对象列表
    this.children.push(child);
    
    // 标记需要重新排序
    if (this.sortableChildren) {
      this._sortDirty = true;
    }
    
    // 触发添加事件
    child.emit('added', this);
  }
  
  // 标记需要重新计算边界
  this._boundsDirty = true;
  
  return children[0];
}

/**
 * 在指定位置插入子对象
 */
public addChildAt<T extends Container>(child: T, index: number): T {
  if (child.parent) {
    child.parent.removeChild(child);
  }
  
  child.parent = this;
  this.children.splice(index, 0, child);
  
  this._boundsDirty = true;
  child.emit('added', this);
  
  return child;
}
```

### 移除子对象

```typescript
/**
 * 移除一个或多个子对象
 */
public removeChild<T extends Container>(...children: T[]): T {
  for (const child of children) {
    const index = this.children.indexOf(child);
    
    if (index === -1) continue;
    
    this.children.splice(index, 1);
    child.parent = null;
    
    child.emit('removed', this);
  }
  
  this._boundsDirty = true;
  return children[0];
}

/**
 * 移除指定位置的子对象
 */
public removeChildAt(index: number): Container {
  const child = this.children[index];
  
  if (!child) {
    throw new Error(`removeChildAt: Index ${index} out of bounds`);
  }
  
  return this.removeChild(child);
}

/**
 * 移除所有子对象
 */
public removeChildren(beginIndex = 0, endIndex = this.children.length): Container[] {
  const removed = this.children.splice(beginIndex, endIndex - beginIndex);
  
  for (const child of removed) {
    child.parent = null;
    child.emit('removed', this);
  }
  
  this._boundsDirty = true;
  return removed;
}
```

### 子对象排序

```typescript
/**
 * 根据 zIndex 排序子对象
 * 只有当 sortableChildren 为 true 时才生效
 */
public sortChildren(): void {
  if (!this.sortableChildren) return;
  
  this.children.sort((a, b) => a.zIndex - b.zIndex);
  this._sortDirty = false;
}
```

## 变换更新

### 世界变换计算

这是 Container 最核心的功能：**将本地变换和父对象的世界变换合并，计算出最终的世界变换**。

```typescript
/**
 * 更新世界变换矩阵
 * 
 * 核心公式：
 * worldTransform = parent.worldTransform * localTransform
 * 
 * 这意味着：子对象的变换是相对于父对象的
 */
public updateTransform(): void {
  // 更新本地变换矩阵
  this.transform.updateLocalTransform();
  
  const localMatrix = this.transform.localTransform;
  
  if (this.parent) {
    // 与父对象的世界变换合并
    // C = P * L
    this.worldTransform = multiply(
      this.parent.worldTransform,
      localMatrix
    );
    
    // 世界透明度 = 父透明度 * 本地透明度
    this.worldAlpha = this.parent.worldAlpha * this.alpha;
  } else {
    // 没有父对象，本地变换就是世界变换
    this.worldTransform.copyFrom(localMatrix);
    this.worldAlpha = this.alpha;
  }
  
  // 递归更新所有子对象
  for (const child of this.children) {
    if (child.visible) {
      child.updateTransform();
    }
  }
}
```

### 为什么是矩阵乘法？

变换的组合本质上是矩阵乘法。假设：
- 父对象在世界坐标 (100, 100)
- 子对象在本地坐标 (50, 50)
- 父对象旋转 45 度

子对象的世界坐标不是简单的 (150, 150)，而是需要考虑父对象的旋转。矩阵乘法自动处理了这种复杂的变换组合。

## 渲染流程

```typescript
/**
 * 渲染容器及其所有子对象
 * 这是场景图渲染的核心递归函数
 */
public render(renderer: Renderer): void {
  // 不可见则跳过
  if (!this.visible) return;
  
  // 更新变换
  this.updateTransform();
  
  // 如果需要排序
  if (this._sortDirty) {
    this.sortChildren();
  }
  
  // 渲染自身（Container 本身不渲染，子类如 Sprite 会覆盖）
  if (this.renderable) {
    this.renderSelf(renderer);
  }
  
  // 递归渲染子对象
  for (const child of this.children) {
    child.render(renderer);
  }
}

/**
 * 渲染自身（子类覆盖）
 */
protected renderSelf(renderer: Renderer): void {
  // Container 本身不渲染任何内容
  // Sprite、Graphics 等子类会覆盖此方法
}
```

## 边界计算

```typescript
/**
 * 获取容器的边界（包括所有子对象）
 */
public getBounds(): Bounds {
  if (!this._boundsDirty && this._bounds) {
    return this._bounds;
  }
  
  const bounds = new Bounds();
  
  // 合并自身边界
  this.addBoundsToRect(bounds);
  
  // 合并所有子对象的边界
  for (const child of this.children) {
    if (child.visible) {
      const childBounds = child.getBounds();
      bounds.addBounds(childBounds);
    }
  }
  
  this._bounds = bounds;
  this._boundsDirty = false;
  
  return bounds;
}
```

## 使用示例

```typescript
// 创建场景
const stage = new Container();

// 创建角色容器
const character = new Container();
character.position.set(200, 200);
stage.addChild(character);

// 添加身体部件
const body = new Sprite(bodyTexture);
body.anchor.set(0.5, 0.5);
character.addChild(body);

// 添加手臂（可以独立旋转）
const arm = new Container();
arm.position.set(30, 0);  // 相对于角色中心
character.addChild(arm);

const hand = new Sprite(handTexture);
hand.anchor.set(0, 0.5);  // 锚点在手臂连接处
arm.addChild(hand);

// 移动角色，所有部件跟随
character.x = 300;

// 旋转手臂，手跟随旋转
arm.rotation = Math.PI / 4;
```

## 小结

Container 是场景图的核心，理解它对于掌握任何 2D/3D 渲染引擎都至关重要：

1. **层级关系**：parent/children 构成树形结构
2. **变换继承**：世界变换 = 父变换 × 本地变换
3. **透明度继承**：世界透明度 = 父透明度 × 本地透明度
4. **边界合并**：容器边界包含所有子对象
5. **递归渲染**：从根节点开始，深度优先遍历渲染
