# Point 与 ObservablePoint

在 2D 图形系统中，点（Point）是最基础的数据结构。PixiJS 提供了两种点类型：普通的 `Point` 和可观察的 `ObservablePoint`。本章解析它们的设计与实现。

## 为什么需要两种 Point？

考虑以下代码：

```javascript
sprite.position.x = 100;
```

当我们修改 `position.x` 时，Sprite 需要知道位置发生了变化，以便标记变换矩阵需要更新。

**问题**：普通的对象属性赋值不会触发任何通知。

**解决方案**：使用 `ObservablePoint`，当属性被修改时自动通知所有者。

## Point 实现

`Point` 是最简单的 2D 点表示：

```typescript
// src/maths/Point.ts

/**
 * 2D 点/向量
 * 用于不需要变化追踪的场景
 */
export class Point {
  public x: number;
  public y: number;
  
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  /**
   * 设置坐标
   */
  public set(x = 0, y = x): this {
    this.x = x;
    this.y = y;
    return this;
  }
  
  /**
   * 从另一个点复制
   */
  public copyFrom(point: PointData): this {
    this.x = point.x;
    this.y = point.y;
    return this;
  }
  
  /**
   * 复制到另一个点
   */
  public copyTo<T extends PointData>(point: T): T {
    point.x = this.x;
    point.y = this.y;
    return point;
  }
  
  /**
   * 比较是否相等
   */
  public equals(point: PointData): boolean {
    return point.x === this.x && point.y === this.y;
  }
  
  /**
   * 克隆
   */
  public clone(): Point {
    return new Point(this.x, this.y);
  }
}

/**
 * 点数据接口
 * 任何具有 x, y 属性的对象都可以作为点使用
 */
export interface PointData {
  x: number;
  y: number;
}
```

## ObservablePoint 实现

`ObservablePoint` 在属性被修改时通知观察者：

```typescript
// src/maths/ObservablePoint.ts

/**
 * 观察者接口
 * 当点的值变化时会被调用
 */
export interface Observer<T> {
  /** 当值变化时调用 */
  _onUpdate(point: T): void;
}

/**
 * 可观察的 2D 点
 * 当 x 或 y 被修改时，会通知观察者
 */
export class ObservablePoint {
  // 观察者（通常是 Transform）
  private _observer: Observer<ObservablePoint>;
  
  // 内部存储的坐标值
  private _x: number;
  private _y: number;
  
  constructor(observer: Observer<ObservablePoint>, x = 0, y = 0) {
    this._observer = observer;
    this._x = x;
    this._y = y;
  }
  
  /**
   * X 坐标
   * 使用 getter/setter 实现变化追踪
   */
  get x(): number {
    return this._x;
  }
  
  set x(value: number) {
    if (this._x !== value) {
      this._x = value;
      // 通知观察者
      this._observer._onUpdate(this);
    }
  }
  
  /**
   * Y 坐标
   */
  get y(): number {
    return this._y;
  }
  
  set y(value: number) {
    if (this._y !== value) {
      this._y = value;
      this._observer._onUpdate(this);
    }
  }
  
  /**
   * 设置坐标
   * 只在值真正变化时才通知（性能优化）
   */
  public set(x = 0, y = x): this {
    if (this._x !== x || this._y !== y) {
      this._x = x;
      this._y = y;
      this._observer._onUpdate(this);
    }
    return this;
  }
  
  /**
   * 从另一个点复制
   */
  public copyFrom(point: PointData): this {
    return this.set(point.x, point.y);
  }
  
  /**
   * 复制到另一个点
   */
  public copyTo<T extends PointData>(point: T): T {
    point.x = this._x;
    point.y = this._y;
    return point;
  }
  
  /**
   * 比较是否相等
   */
  public equals(point: PointData): boolean {
    return point.x === this._x && point.y === this._y;
  }
  
  /**
   * 克隆为普通 Point
   */
  public clone(): Point {
    return new Point(this._x, this._y);
  }
}
```

### 为什么使用 getter/setter 而不是 Proxy？

1. **性能**：getter/setter 比 Proxy 快得多
2. **兼容性**：Proxy 在某些旧浏览器中不支持
3. **可预测性**：只追踪 x 和 y 两个属性

## 在 Transform 中的应用

```typescript
// Transform 作为观察者

export class Transform implements Observer<ObservablePoint> {
  // position、scale、pivot 都是可观察的
  public readonly position: ObservablePoint;
  public readonly scale: ObservablePoint;
  public readonly pivot: ObservablePoint;
  public readonly skew: ObservablePoint;
  
  // 变换矩阵
  public readonly localTransform: Matrix;
  
  // 脏标记
  private _dirty: boolean = true;
  
  constructor() {
    // 将 this（Transform）作为观察者传入
    this.position = new ObservablePoint(this, 0, 0);
    this.scale = new ObservablePoint(this, 1, 1);
    this.pivot = new ObservablePoint(this, 0, 0);
    this.skew = new ObservablePoint(this, 0, 0);
    
    this.localTransform = new Matrix();
  }
  
  /**
   * 当任何可观察点变化时被调用
   * 标记变换需要重新计算
   */
  public _onUpdate(point: ObservablePoint): void {
    this._dirty = true;
  }
  
  /**
   * 更新本地变换矩阵
   * 只有在脏标记为 true 时才真正计算
   */
  public updateLocalTransform(): void {
    if (!this._dirty) return;
    
    this.localTransform.setTransform(
      this.position.x,
      this.position.y,
      this.pivot.x,
      this.pivot.y,
      this.scale.x,
      this.scale.y,
      this._rotation,
      this.skew.x,
      this.skew.y
    );
    
    this._dirty = false;
  }
}
```

## 使用示例

```typescript
// 创建精灵
const sprite = new Sprite(texture);

// 修改位置（会自动触发变换更新标记）
sprite.position.x = 100;
sprite.position.y = 200;

// 或使用 set 方法（只触发一次更新）
sprite.position.set(100, 200);

// 缩放
sprite.scale.set(2, 2);  // 放大两倍

// 锚点
sprite.pivot.set(50, 50);  // 设置旋转中心

// 直接使用 Point 进行临时计算
const offset = new Point(10, 20);
const newPos = new Point(
  sprite.position.x + offset.x,
  sprite.position.y + offset.y
);
```

## 性能考虑

### 1. 批量更新

如果需要同时修改 x 和 y，使用 `set()` 而不是分别赋值：

```typescript
// 不推荐：触发两次更新通知
sprite.position.x = 100;
sprite.position.y = 200;

// 推荐：只触发一次更新通知
sprite.position.set(100, 200);
```

### 2. 值相同时跳过

ObservablePoint 会检查值是否真的变化：

```typescript
sprite.position.set(100, 100);
sprite.position.set(100, 100);  // 不会触发更新，因为值没变
```

### 3. 避免频繁创建

复用 Point 对象而不是每帧创建新的：

```typescript
// 不推荐：每帧创建新对象
function update() {
  const temp = new Point(sprite.x + 1, sprite.y);  // GC 压力
  // ...
}

// 推荐：复用对象
const temp = new Point();
function update() {
  temp.set(sprite.x + 1, sprite.y);
  // ...
}
```

## 小结

Point 系统的设计原则：

1. **分离关注点**：Point 用于简单存储，ObservablePoint 用于需要追踪变化的场景
2. **观察者模式**：通过回调机制实现变化通知
3. **性能优先**：只在值真正变化时才通知
4. **接口一致**：两种 Point 实现相同的 PointData 接口

这种设计使得：
- 变换属性的修改能自动触发矩阵更新
- 避免不必要的矩阵重计算
- 保持简洁的 API（直接赋值即可）