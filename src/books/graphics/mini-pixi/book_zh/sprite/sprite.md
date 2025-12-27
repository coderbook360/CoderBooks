# Sprite 核心实现

在 2D 游戏和交互应用中，**Sprite（精灵）** 是最基础也是最常用的渲染对象。本章将深入解析 PixiJS 中 Sprite 的核心实现，理解它如何将纹理渲染到屏幕上。

## 为什么 Sprite 如此重要？

首先要问一个问题：**什么是 Sprite？为什么 2D 渲染离不开它？**

Sprite 本质上是一个**带有纹理的矩形**。虽然概念简单，但它承载了 2D 渲染的核心需求：

1. **纹理映射**：将图片贴到矩形上显示
2. **变换控制**：位置、旋转、缩放
3. **锚点系统**：控制变换中心点
4. **混合模式**：控制与背景的混合方式
5. **批量渲染**：多个 Sprite 可以合并绘制，提升性能

几乎所有 2D 游戏中的角色、道具、UI 元素都是通过 Sprite 实现的。

## Sprite 的数据结构

### 核心属性

```typescript
// src/sprite/Sprite.ts
import { Container } from '../scene/Container';
import { Texture } from '../texture/Texture';
import { ObservablePoint } from '../maths/ObservablePoint';
import { Bounds } from '../scene/Bounds';

export class Sprite extends Container {
  // 标识
  public readonly renderPipeId = 'sprite';
  
  // 纹理引用
  private _texture: Texture;
  
  // 锚点：控制旋转和缩放的中心点
  // (0, 0) = 左上角, (0.5, 0.5) = 中心, (1, 1) = 右下角
  public readonly anchor: ObservablePoint;
  
  // 着色：与纹理颜色相乘
  private _tint: number = 0xFFFFFF;
  
  // 批次数据：优化渲染用
  public batched: boolean = true;
  
  constructor(texture: Texture = Texture.EMPTY) {
    super();
    
    // 锚点变化时标记需要重新计算
    this.anchor = new ObservablePoint(
      () => this.onUpdate(),
      0, 0
    );
    
    this.texture = texture;
  }
}
```

### 为什么需要锚点（Anchor）？

锚点是 Sprite 区别于普通矩形的关键特性。让我们理解它的作用：

```typescript
// 默认锚点 (0, 0)：左上角
// 旋转时，Sprite 围绕左上角旋转
sprite.anchor.set(0, 0);

// 中心锚点 (0.5, 0.5)：
// 旋转时，Sprite 围绕中心旋转（更自然的效果）
sprite.anchor.set(0.5, 0.5);

// 底部中心 (0.5, 1)：
// 适合人物角色，脚部固定在地面上
sprite.anchor.set(0.5, 1);
```

**工程意义**：
- 不同的锚点适用于不同的应用场景
- 角色通常使用底部中心（脚部固定）
- UI 按钮通常使用中心（便于缩放动画）
- 粒子效果通常使用中心（便于旋转）

## 纹理的 Getter/Setter

```typescript
get texture(): Texture {
  return this._texture;
}

set texture(value: Texture) {
  if (this._texture === value) return;
  
  // 解除旧纹理的监听
  if (this._texture) {
    this._texture.off('update', this.onTextureUpdate, this);
  }
  
  this._texture = value;
  
  // 监听新纹理的更新
  this._texture.on('update', this.onTextureUpdate, this);
  
  // 标记需要重新渲染
  this.onUpdate();
}

private onTextureUpdate(): void {
  // 纹理内容变化时，重新计算边界和渲染数据
  this._boundsDirty = true;
  this.onUpdate();
}
```

### 为什么要监听纹理更新？

纹理可能在运行时变化：
1. **异步加载**：纹理从空白变为加载完成
2. **动态纹理**：视频纹理或 Canvas 纹理的内容变化
3. **纹理压缩**：加载更高质量版本时替换

通过事件监听，Sprite 能及时响应这些变化。

## 着色（Tint）

```typescript
get tint(): number {
  return this._tint;
}

set tint(value: number) {
  if (this._tint === value) return;
  this._tint = value;
  this.onUpdate();
}

// 获取 RGB 分量（用于着色器）
get tintRgb(): Float32Array {
  const tint = this._tint;
  return new Float32Array([
    ((tint >> 16) & 0xFF) / 255,  // R
    ((tint >> 8) & 0xFF) / 255,   // G
    (tint & 0xFF) / 255           // B
  ]);
}
```

**Tint 的工作原理**：
- 在片段着色器中，纹理颜色与 tint 颜色相乘
- `0xFFFFFF`（白色）= 原色不变
- `0xFF0000`（红色）= 只保留红色通道
- `0x808080`（灰色）= 整体变暗 50%

## 边界计算

```typescript
/**
 * 计算 Sprite 的本地边界
 * 这是碰撞检测和视锥剔除的基础
 */
public getBounds(): Bounds {
  const texture = this._texture;
  const anchor = this.anchor;
  
  // 纹理尺寸
  const width = texture.width;
  const height = texture.height;
  
  // 根据锚点计算边界
  const x = -anchor.x * width;
  const y = -anchor.y * height;
  
  return new Bounds(x, y, x + width, y + height);
}

/**
 * 检测点是否在 Sprite 内
 * 用于点击检测、拾取等交互
 */
public containsPoint(point: Point): boolean {
  const bounds = this.getBounds();
  
  // 将世界坐标转换为本地坐标
  const localPoint = this.worldTransform.applyInverse(point);
  
  return bounds.contains(localPoint.x, localPoint.y);
}
```

## 渲染流程

Sprite 的渲染通过渲染管线完成，核心是构建批次数据：

```typescript
/**
 * 构建用于批量渲染的顶点数据
 * 每个 Sprite 需要 4 个顶点（矩形的 4 个角）
 */
public buildBatchData(batcher: Batcher): void {
  const texture = this._texture;
  const frame = texture.frame;
  const anchor = this.anchor;
  
  // 计算 4 个顶点的本地坐标
  const w0 = -anchor.x * frame.width;
  const w1 = (1 - anchor.x) * frame.width;
  const h0 = -anchor.y * frame.height;
  const h1 = (1 - anchor.y) * frame.height;
  
  // 应用世界变换矩阵
  const wt = this.worldTransform;
  const a = wt.a, b = wt.b, c = wt.c, d = wt.d;
  const tx = wt.tx, ty = wt.ty;
  
  // 顶点位置（2D 仿射变换）
  const vertices = [
    a * w0 + c * h0 + tx, b * w0 + d * h0 + ty,  // 左上
    a * w1 + c * h0 + tx, b * w1 + d * h0 + ty,  // 右上
    a * w1 + c * h1 + tx, b * w1 + d * h1 + ty,  // 右下
    a * w0 + c * h1 + tx, b * w0 + d * h1 + ty   // 左下
  ];
  
  // 纹理坐标（UV）
  const uvs = texture.uvs;
  
  // 添加到批次
  batcher.addQuad(vertices, uvs, this._tint, texture);
}
```

### 为什么 Sprite 适合批量渲染？

批量渲染是 2D 性能优化的核心。关键在于：

1. **相同的着色器**：所有 Sprite 使用同一个着色器程序
2. **纹理图集**：多个 Sprite 可以共享同一张纹理
3. **简单的几何体**：都是矩形，顶点格式统一

当这三个条件满足时，可以将多个 Sprite 合并为一个 Draw Call，大幅提升渲染效率。

## 使用示例

```typescript
// 创建 Sprite
const sprite = new Sprite(Texture.from('character.png'));

// 设置位置
sprite.position.set(100, 100);

// 设置锚点为中心
sprite.anchor.set(0.5, 0.5);

// 设置缩放
sprite.scale.set(2, 2);

// 设置旋转（弧度）
sprite.rotation = Math.PI / 4;

// 设置着色（变红）
sprite.tint = 0xFF0000;

// 添加到场景
container.addChild(sprite);
```

## 小结

Sprite 是 2D 渲染的基石，理解它的实现对于掌握 PixiJS 至关重要：

1. **纹理 + 矩形**：Sprite 的本质是带纹理的矩形
2. **锚点系统**：控制变换中心，适应不同使用场景
3. **着色支持**：通过 tint 实现颜色变化
4. **批量渲染友好**：设计上支持高效的合批渲染
5. **边界计算**：支持碰撞检测和视锥剔除
