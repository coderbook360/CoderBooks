# Transform 变换系统

Transform（变换）是场景图中每个对象的核心组件。它管理对象的位置、旋转、缩放等属性，并计算出最终的变换矩阵。本章深入解析 PixiJS 的 Transform 实现。

## 为什么需要 Transform 类？

直接在对象上存储 x、y、rotation 等属性有什么问题？

1. **矩阵计算分散**：每个对象都要自己计算变换矩阵
2. **更新时机难控制**：不知道什么时候需要重新计算矩阵
3. **代码重复**：每种对象类型都要写相同的变换逻辑

**解决方案**：将变换逻辑封装到独立的 Transform 类中。

## Transform 的职责

```
┌─────────────────────────────────────────────────────────────┐
│                       Transform                              │
│                                                              │
│  输入属性：                    输出：                         │
│  ┌─────────────┐             ┌─────────────────────────────┐ │
│  │ position    │             │                             │ │
│  │ scale       │   计算得到   │     localTransform          │ │
│  │ rotation    │ ──────────► │     (本地变换矩阵)           │ │
│  │ skew        │             │                             │ │
│  │ pivot       │             └─────────────────────────────┘ │
│  └─────────────┘                                             │
│                                                              │
│  特性：                                                       │
│  • 自动脏检测                                                 │
│  • 懒计算                                                     │
│  • 可观察属性                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Transform 实现

```typescript
// src/maths/Transform.ts

import { Matrix } from './Matrix';
import { ObservablePoint, Observer } from './ObservablePoint';

/**
 * 变换组件
 * 管理对象的位置、旋转、缩放等属性
 */
export class Transform implements Observer<ObservablePoint> {
  // 本地变换矩阵
  public readonly localTransform: Matrix;
  
  // 位置（可观察）
  public readonly position: ObservablePoint;
  
  // 缩放（可观察）
  public readonly scale: ObservablePoint;
  
  // 锚点/枢轴点（可观察）
  public readonly pivot: ObservablePoint;
  
  // 斜切（可观察）
  public readonly skew: ObservablePoint;
  
  // 旋转（弧度）
  private _rotation: number = 0;
  
  // 脏标记：是否需要重新计算矩阵
  private _dirty: boolean = true;
  
  // 旋转的 sin/cos 缓存
  private _cx: number = 1;  // cos(rotation + skew.y)
  private _sx: number = 0;  // sin(rotation + skew.y)
  private _cy: number = 0;  // cos(PI/2 - rotation + skew.x) = sin(rotation - skew.x)
  private _sy: number = 1;  // sin(PI/2 - rotation + skew.x) = cos(rotation - skew.x)
  
  constructor() {
    this.localTransform = new Matrix();
    
    // 创建可观察点，将 this 作为观察者
    this.position = new ObservablePoint(this, 0, 0);
    this.scale = new ObservablePoint(this, 1, 1);
    this.pivot = new ObservablePoint(this, 0, 0);
    this.skew = new ObservablePoint(this, 0, 0);
  }
  
  /**
   * 旋转角度（弧度）
   */
  get rotation(): number {
    return this._rotation;
  }
  
  set rotation(value: number) {
    if (this._rotation !== value) {
      this._rotation = value;
      this._dirty = true;
    }
  }
  
  /**
   * 当可观察点变化时被调用
   * 实现 Observer 接口
   */
  public _onUpdate(point: ObservablePoint): void {
    // 标记需要重新计算
    this._dirty = true;
    
    // 如果是 skew 变化，需要更新 sin/cos 缓存
    if (point === this.skew) {
      this.updateSkew();
    }
  }
  
  /**
   * 更新斜切相关的 sin/cos 缓存
   */
  private updateSkew(): void {
    this._cx = Math.cos(this._rotation + this.skew.y);
    this._sx = Math.sin(this._rotation + this.skew.y);
    this._cy = -Math.sin(this._rotation - this.skew.x);  // cos(PI/2 - r + s)
    this._sy = Math.cos(this._rotation - this.skew.x);   // sin(PI/2 - r + s)
  }
  
  /**
   * 更新本地变换矩阵
   * 只有在脏标记为 true 时才真正计算
   */
  public updateLocalTransform(): void {
    if (!this._dirty) return;
    
    const lt = this.localTransform;
    
    // 如果没有斜切，使用简化计算
    if (this.skew.x === 0 && this.skew.y === 0) {
      // 计算旋转的 sin/cos
      const cos = Math.cos(this._rotation);
      const sin = Math.sin(this._rotation);
      
      // a = scaleX * cos(rotation)
      lt.a = cos * this.scale.x;
      // b = scaleX * sin(rotation)
      lt.b = sin * this.scale.x;
      // c = -scaleY * sin(rotation)
      lt.c = -sin * this.scale.y;
      // d = scaleY * cos(rotation)
      lt.d = cos * this.scale.y;
    } else {
      // 有斜切时的完整计算
      lt.a = this._cx * this.scale.x;
      lt.b = this._sx * this.scale.x;
      lt.c = this._cy * this.scale.y;
      lt.d = this._sy * this.scale.y;
    }
    
    // 平移，考虑锚点
    // tx = position.x - pivot.x * a - pivot.y * c
    lt.tx = this.position.x - this.pivot.x * lt.a - this.pivot.y * lt.c;
    // ty = position.y - pivot.x * b - pivot.y * d
    lt.ty = this.position.y - this.pivot.x * lt.b - this.pivot.y * lt.d;
    
    this._dirty = false;
  }
  
  /**
   * 设置所有变换属性
   */
  public setFromMatrix(matrix: Matrix): void {
    // 从矩阵提取变换参数
    // 这是 updateLocalTransform 的逆运算
    
    const a = matrix.a;
    const b = matrix.b;
    const c = matrix.c;
    const d = matrix.d;
    
    // 提取缩放
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);
    
    // 提取旋转
    const rotation = Math.atan2(b, a);
    
    // 设置属性
    this.scale.set(scaleX, scaleY);
    this.rotation = rotation;
    this.position.set(matrix.tx, matrix.ty);
    this.skew.set(0, 0);
    this.pivot.set(0, 0);
  }
  
  /**
   * 重置为默认状态
   */
  public identity(): void {
    this.position.set(0, 0);
    this.scale.set(1, 1);
    this.pivot.set(0, 0);
    this.skew.set(0, 0);
    this._rotation = 0;
    this._dirty = true;
  }
}
```

## Pivot（锚点）的作用

Pivot 决定了旋转和缩放的中心点。

```
默认 pivot (0, 0)：                 pivot 在中心：
┌──────────────┐                    ┌──────────────┐
│ ●            │  旋转围绕左上角     │      ●       │  旋转围绕中心
│              │                    │              │
│              │                    │              │
└──────────────┘                    └──────────────┘
```

```typescript
// 设置精灵围绕中心旋转
sprite.pivot.set(sprite.width / 2, sprite.height / 2);
sprite.position.set(200, 200);  // 中心点在 (200, 200)
sprite.rotation = Math.PI / 4;  // 围绕中心旋转 45 度
```

### 为什么平移要减去 pivot？

变换的应用顺序：
1. 先将对象移动到原点（减去 pivot）
2. 应用缩放和旋转
3. 再移动回去（加上 position）

数学表示：

$$
\mathbf{v}' = \mathbf{R} \cdot \mathbf{S} \cdot (\mathbf{v} - \mathbf{pivot}) + \mathbf{position}
$$

展开为矩阵形式：

$$
\begin{bmatrix} x' \\ y' \end{bmatrix} = 
\begin{bmatrix} a & c \\ b & d \end{bmatrix} 
\begin{bmatrix} x - pivot_x \\ y - pivot_y \end{bmatrix} +
\begin{bmatrix} position_x \\ position_y \end{bmatrix}
$$

简化后：

$$
\begin{aligned}
x' &= a \cdot x + c \cdot y + (position_x - a \cdot pivot_x - c \cdot pivot_y) \\
y' &= b \cdot x + d \cdot y + (position_y - b \cdot pivot_x - d \cdot pivot_y)
\end{aligned}
$$

这就是代码中 `lt.tx = position.x - pivot.x * a - pivot.y * c` 的由来。

## 斜切（Skew）

斜切是一种特殊的变形，使矩形变成平行四边形：

```typescript
// 水平斜切
sprite.skew.x = 0.5;  // 水平方向倾斜

// 垂直斜切
sprite.skew.y = 0.5;  // 垂直方向倾斜
```

斜切的数学原理：

$$
\text{Skew Matrix} = \begin{bmatrix} 
1 & \tan(skew_x) \\ 
\tan(skew_y) & 1 
\end{bmatrix}
$$

与旋转组合后，变换矩阵的计算变得更复杂，这就是为什么代码中有 `_cx`、`_sx`、`_cy`、`_sy` 四个缓存值。

## 脏标记优化

Transform 使用脏标记（dirty flag）避免不必要的计算：

```typescript
// 场景：动画循环
function animate() {
  // 只有属性真正改变时才标记为脏
  if (needsMove) {
    sprite.position.x += 1;  // 触发 _onUpdate，设置 _dirty = true
  }
  
  // updateLocalTransform 只在 _dirty 为 true 时计算
  sprite.transform.updateLocalTransform();
  
  // 如果位置没变，矩阵计算被跳过
  requestAnimationFrame(animate);
}
```

## 使用示例

```typescript
// 创建精灵
const sprite = new Sprite(texture);

// 设置位置
sprite.position.set(100, 100);

// 设置缩放
sprite.scale.set(2, 2);

// 设置旋转（弧度）
sprite.rotation = Math.PI / 4;

// 设置锚点（旋转中心）
sprite.pivot.set(50, 50);

// 设置斜切
sprite.skew.set(0.2, 0);

// 内部流程：
// 1. 修改属性触发 _onUpdate
// 2. _dirty 被设置为 true
// 3. 渲染时调用 updateLocalTransform
// 4. 矩阵被计算，_dirty 设置为 false
```

## 小结

Transform 系统的核心设计：

1. **封装变换逻辑**：所有变换相关代码集中管理
2. **可观察属性**：属性变化自动触发脏标记
3. **懒计算**：只在需要时才计算矩阵
4. **Pivot 支持**：灵活控制变换中心

这种设计使得：
- 用户代码简洁（直接赋值属性）
- 性能优化透明（脏标记自动管理）
- 变换组合正确（矩阵数学封装）