# Hit Testing 命中测试

命中测试（Hit Testing）是事件系统的核心环节。它解决的问题是：当用户点击画布上的某个位置时，如何确定点击了哪个对象？

## 为什么命中测试很重要？

Canvas 和 WebGL 只负责绘制像素，不保留"对象"的概念。点击画布时：

```
用户点击 (300, 200)
      ↓
画布上有 10 个精灵重叠
      ↓
哪个精灵应该接收事件？
```

命中测试需要：
1. 判断点是否在某个对象内
2. 处理对象的层叠关系
3. 处理变换（旋转、缩放后的对象）
4. 高效处理大量对象

## 命中测试的基本原理

### 点在矩形内测试

最简单的情况是轴对齐矩形：

```typescript
/**
 * 判断点是否在矩形内
 */
function pointInRect(x: number, y: number, rect: Rectangle): boolean {
  return x >= rect.x && x <= rect.x + rect.width &&
         y >= rect.y && y <= rect.y + rect.height;
}
```

### 变换后的测试

当对象有旋转、缩放时，直接比较世界坐标是不行的。

**解决方案**：将测试点转换到对象的本地坐标系。

```typescript
/**
 * 在变换后的对象上进行命中测试
 */
function hitTestTransformed(
  x: number,
  y: number,
  target: Container
): boolean {
  // 将世界坐标转换为对象的本地坐标
  const local = target.worldTransform.applyInverse({ x, y });
  
  // 在本地坐标系中测试
  return target.containsPointLocal(local.x, local.y);
}
```

### 为什么要转换到本地坐标？

考虑一个旋转 45 度的矩形：

```
世界坐标系中测试很复杂：
     ╱╲
    ╱  ╲
   ╱ ● ╲   ← 点在菱形内吗？需要复杂的几何计算
   ╲    ╱
    ╲  ╱
     ╲╱

转换到本地坐标系后：
┌──────────┐
│          │
│    ●     │   ← 简单的矩形测试
│          │
└──────────┘
```

## Container 的命中测试

```typescript
// src/scene/Container.ts

export class Container {
  /**
   * 判断点（世界坐标）是否在此对象内
   */
  public containsPoint(x: number, y: number): boolean {
    // 转换到本地坐标
    const local = this.worldTransform.applyInverse({ x, y });
    
    // 调用本地坐标测试（子类覆盖）
    return this.containsPointLocal(local.x, local.y);
  }
  
  /**
   * 本地坐标命中测试
   * Container 本身没有形状，返回 false
   * 子类（Sprite、Graphics 等）会覆盖此方法
   */
  protected containsPointLocal(x: number, y: number): boolean {
    return false;
  }
}
```

## Sprite 的命中测试

Sprite 的形状是一个矩形（可能有 anchor 偏移）：

```typescript
// src/scene/Sprite.ts

export class Sprite extends Container {
  /**
   * Sprite 的本地坐标命中测试
   */
  protected containsPointLocal(x: number, y: number): boolean {
    const width = this.texture.orig.width;
    const height = this.texture.orig.height;
    
    // 计算边界（考虑 anchor）
    const x1 = -this.anchor.x * width;
    const y1 = -this.anchor.y * height;
    const x2 = x1 + width;
    const y2 = y1 + height;
    
    // 矩形测试
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  }
}
```

### 像素级命中测试

有时需要更精确的测试（忽略透明像素）：

```typescript
/**
 * 像素级命中测试
 * 检查点击位置的像素是否透明
 */
public containsPointPixel(x: number, y: number): boolean {
  // 先做边界测试
  if (!this.containsPointLocal(x, y)) {
    return false;
  }
  
  // 获取纹理数据
  const texture = this.texture;
  const source = texture.source;
  
  // 计算纹理坐标
  const u = (x + this.anchor.x * texture.width) / texture.width;
  const v = (y + this.anchor.y * texture.height) / texture.height;
  
  // 读取像素 alpha 值
  const alpha = this.getPixelAlpha(u, v);
  
  return alpha > 0;
}
```

## Graphics 的命中测试

Graphics 包含多种形状，需要根据形状类型进行测试：

```typescript
// src/scene/Graphics.ts

export class Graphics extends Container {
  // 存储的图形数据
  private _geometry: GraphicsGeometry;
  
  protected containsPointLocal(x: number, y: number): boolean {
    // 遍历所有形状
    for (const shape of this._geometry.shapes) {
      if (this.hitTestShape(x, y, shape)) {
        return true;
      }
    }
    return false;
  }
  
  private hitTestShape(
    x: number,
    y: number,
    shape: Shape
  ): boolean {
    switch (shape.type) {
      case 'rectangle':
        return this.hitTestRectangle(x, y, shape as RectangleShape);
      case 'circle':
        return this.hitTestCircle(x, y, shape as CircleShape);
      case 'polygon':
        return this.hitTestPolygon(x, y, shape as PolygonShape);
      default:
        return false;
    }
  }
  
  /**
   * 圆形命中测试
   */
  private hitTestCircle(
    x: number,
    y: number,
    circle: CircleShape
  ): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    const distSq = dx * dx + dy * dy;
    return distSq <= circle.radius * circle.radius;
  }
  
  /**
   * 多边形命中测试（射线法）
   */
  private hitTestPolygon(
    x: number,
    y: number,
    polygon: PolygonShape
  ): boolean {
    const points = polygon.points;
    let inside = false;
    
    // 射线法：从点向右发射射线，计算与多边形边的交点数
    // 奇数个交点 = 在内部，偶数个交点 = 在外部
    for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
      const xi = points[i];
      const yi = points[i + 1];
      const xj = points[j];
      const yj = points[j + 1];
      
      // 检查边是否与射线相交
      if (((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
}
```

## 场景图命中测试

遍历场景图，找到最上层的命中对象：

```typescript
/**
 * 递归进行场景图命中测试
 */
function hitTestRecursive(
  target: Container,
  x: number,
  y: number
): Container | null {
  // 1. 检查是否可交互
  if (!target.interactive && !target.interactiveChildren) {
    return null;
  }
  
  // 2. 不可见则跳过
  if (!target.visible || target.worldAlpha === 0) {
    return null;
  }
  
  // 3. 先检查子对象（后添加的在上层，先遍历）
  for (let i = target.children.length - 1; i >= 0; i--) {
    const hit = hitTestRecursive(target.children[i], x, y);
    if (hit) return hit;
  }
  
  // 4. 检查自身
  if (target.interactive && target.containsPoint(x, y)) {
    return target;
  }
  
  return null;
}
```

### 遍历顺序的重要性

子对象需要倒序遍历，因为：
- 后添加的子对象渲染在上层
- 上层对象应该先接收事件

```
添加顺序：A, B, C
渲染顺序：A（底层）→ B → C（顶层）
命中测试顺序：C → B → A（先测试顶层）
```

## 优化策略

### 1. 边界盒快速排除

先用边界盒（AABB）快速排除不可能命中的对象：

```typescript
function hitTestOptimized(
  target: Container,
  x: number,
  y: number
): Container | null {
  // 快速排除：边界盒测试
  const bounds = target.getBounds();
  if (x < bounds.minX || x > bounds.maxX ||
      y < bounds.minY || y > bounds.maxY) {
    return null;  // 肯定不在对象内
  }
  
  // 精确测试
  return target.containsPoint(x, y) ? target : null;
}
```

### 2. 空间分区

对于大量对象，使用空间分区结构：

```typescript
// 四叉树示例
class QuadTree {
  private bounds: Rectangle;
  private objects: Container[] = [];
  private children: QuadTree[] | null = null;
  
  /**
   * 查询可能命中的对象
   */
  public query(x: number, y: number): Container[] {
    const result: Container[] = [];
    
    // 点不在此节点范围内
    if (!this.bounds.contains(x, y)) {
      return result;
    }
    
    // 添加此节点的对象
    result.push(...this.objects);
    
    // 查询子节点
    if (this.children) {
      for (const child of this.children) {
        result.push(...child.query(x, y));
      }
    }
    
    return result;
  }
}
```

### 3. 脏标记优化

缓存命中测试相关的计算：

```typescript
class Container {
  // 缓存的世界边界
  private _worldBoundsCache: Rectangle | null = null;
  private _worldBoundsDirty: boolean = true;
  
  public getWorldBounds(): Rectangle {
    if (this._worldBoundsDirty) {
      this._worldBoundsCache = this.calculateWorldBounds();
      this._worldBoundsDirty = false;
    }
    return this._worldBoundsCache!;
  }
}
```

## 使用示例

```typescript
// 基本交互
const sprite = new Sprite(texture);
sprite.interactive = true;

sprite.on('click', (event) => {
  console.log('点击了精灵!');
});

// 精确的像素级测试
sprite.hitArea = new PixelHitArea(sprite.texture);

// 自定义命中区域
sprite.hitArea = new Circle(50, 50, 30);  // 圆形点击区域

// 禁止子对象接收事件
container.interactiveChildren = false;
```

## 小结

命中测试的核心要点：

1. **坐标转换**：将世界坐标转换到本地坐标进行测试
2. **形状测试**：矩形、圆形、多边形各有不同算法
3. **遍历顺序**：倒序遍历保证上层对象优先
4. **性能优化**：边界盒快速排除、空间分区

理解命中测试对于实现任何交互式图形应用都至关重要。
