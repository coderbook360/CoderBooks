# BatchGeometry 批次几何体

在现代 GPU 渲染中，**减少 Draw Call** 是最重要的性能优化手段之一。BatchGeometry 是 PixiJS 批处理系统的核心，它将多个精灵的顶点数据合并到同一个几何缓冲区中。

## 为什么需要批处理？

每次调用 `gl.drawElements()` 或 `renderPass.draw()` 都有开销：

1. **CPU 端**：准备绘制命令、切换状态
2. **GPU 端**：命令解析、状态切换
3. **驱动层**：CPU-GPU 通信

**问题**：如果每个精灵单独绘制，1000 个精灵就需要 1000 次 Draw Call，性能急剧下降。

**解决方案**：将使用相同纹理和混合模式的精灵合并成一次绘制。

```
不使用批处理：                    使用批处理：
┌─────────────────┐              ┌─────────────────┐
│ Sprite 1 → Draw │              │ Sprite 1 ───┐   │
│ Sprite 2 → Draw │   优化为     │ Sprite 2 ───┼─→ │  1 次 Draw
│ Sprite 3 → Draw │  ────────►   │ Sprite 3 ───┘   │
│ ...             │              │                  │
│ 1000 次 Draw    │              │ 1 次 Draw       │
└─────────────────┘              └─────────────────┘
```

## 批次几何数据结构

### 顶点格式

每个精灵需要 4 个顶点（四边形），每个顶点包含：

```typescript
// 顶点属性布局
interface BatchVertex {
  // 位置（已变换到世界坐标）
  x: number;        // float32
  y: number;        // float32
  
  // UV 纹理坐标
  u: number;        // float32
  v: number;        // float32
  
  // 颜色（带 alpha 预乘）
  color: number;    // uint32 (ABGR)
  
  // 纹理索引（支持多纹理批处理）
  textureId: number; // float32
}

// 每个顶点 6 个 float32 = 24 字节
// 每个精灵 4 个顶点 = 96 字节
```

### BatchGeometry 实现

```typescript
// src/rendering/batch/BatchGeometry.ts

export interface BatchGeometryOptions {
  // 最大批次大小（精灵数）
  maxSize?: number;
  // 属性描述
  attributeDescriptors?: AttributeDescriptor[];
}

export class BatchGeometry {
  // 最大精灵数量
  public readonly maxSize: number;
  
  // 顶点缓冲区
  private _buffer: ArrayBuffer;
  private _float32View: Float32Array;
  private _uint32View: Uint32Array;
  
  // 索引缓冲区
  private _indexBuffer: Uint16Array;
  
  // 当前批次中的精灵数量
  private _size: number = 0;
  
  // 每个顶点的浮点数数量
  private _vertexSize: number = 6;  // x, y, u, v, color, textureId
  
  // 属性描述
  public readonly attributes: Attribute[];
  
  // GPU 缓冲区（由渲染器管理）
  public vertexBuffer: Buffer | null = null;
  public indexBuffer: Buffer | null = null;
  
  constructor(options: BatchGeometryOptions = {}) {
    this.maxSize = options.maxSize ?? 4096;  // 默认最大 4096 个精灵
    
    // 每个精灵 4 个顶点，每个顶点 6 个浮点数
    const vertexCount = this.maxSize * 4;
    const floatCount = vertexCount * this._vertexSize;
    
    // 创建顶点缓冲区
    this._buffer = new ArrayBuffer(floatCount * 4);  // 4 bytes per float
    this._float32View = new Float32Array(this._buffer);
    this._uint32View = new Uint32Array(this._buffer);
    
    // 创建索引缓冲区
    // 每个精灵 6 个索引（2 个三角形）
    this._indexBuffer = new Uint16Array(this.maxSize * 6);
    this.initIndices();
    
    // 定义顶点属性
    this.attributes = [
      { name: 'aPosition', size: 2, type: 'float32', offset: 0 },
      { name: 'aUv', size: 2, type: 'float32', offset: 2 },
      { name: 'aColor', size: 4, type: 'unorm8', offset: 4 },
      { name: 'aTextureId', size: 1, type: 'float32', offset: 5 },
    ];
  }
  
  /**
   * 初始化索引缓冲区
   * 四边形索引模式：0-1-2, 0-2-3
   */
  private initIndices(): void {
    const indices = this._indexBuffer;
    
    for (let i = 0, j = 0; i < this.maxSize; i++) {
      const vertexOffset = i * 4;
      
      // 第一个三角形
      indices[j++] = vertexOffset + 0;
      indices[j++] = vertexOffset + 1;
      indices[j++] = vertexOffset + 2;
      
      // 第二个三角形
      indices[j++] = vertexOffset + 0;
      indices[j++] = vertexOffset + 2;
      indices[j++] = vertexOffset + 3;
    }
  }
  
  /**
   * 重置批次
   */
  public reset(): void {
    this._size = 0;
  }
  
  /**
   * 获取当前批次大小
   */
  get size(): number {
    return this._size;
  }
  
  /**
   * 检查是否还能添加更多精灵
   */
  public canBatch(count: number = 1): boolean {
    return this._size + count <= this.maxSize;
  }
}
```

## 添加精灵到批次

```typescript
/**
 * 添加一个精灵到批次
 * 将精灵的顶点数据写入缓冲区
 */
public addSprite(sprite: Sprite): void {
  if (this._size >= this.maxSize) {
    throw new Error('Batch is full');
  }
  
  const float32 = this._float32View;
  const uint32 = this._uint32View;
  
  // 计算写入位置
  // 每个精灵 4 个顶点，每个顶点 6 个浮点数
  const offset = this._size * 4 * this._vertexSize;
  
  // 获取精灵的世界变换
  const wt = sprite.worldTransform;
  const a = wt.a;
  const b = wt.b;
  const c = wt.c;
  const d = wt.d;
  const tx = wt.tx;
  const ty = wt.ty;
  
  // 获取纹理信息
  const texture = sprite.texture;
  const uvs = texture.uvs;
  
  // 计算精灵的本地顶点位置
  const anchor = sprite.anchor;
  const width = texture.orig.width;
  const height = texture.orig.height;
  
  const x0 = -anchor.x * width;
  const y0 = -anchor.y * height;
  const x1 = x0 + width;
  const y1 = y0 + height;
  
  // 获取颜色（预乘 alpha）
  const color = sprite.tintColor;
  const textureId = sprite.textureId;
  
  // 顶点 0 (左上)
  float32[offset + 0] = a * x0 + c * y0 + tx;  // x
  float32[offset + 1] = b * x0 + d * y0 + ty;  // y
  float32[offset + 2] = uvs.x0;                 // u
  float32[offset + 3] = uvs.y0;                 // v
  uint32[offset + 4] = color;                   // color
  float32[offset + 5] = textureId;              // textureId
  
  // 顶点 1 (右上)
  float32[offset + 6] = a * x1 + c * y0 + tx;
  float32[offset + 7] = b * x1 + d * y0 + ty;
  float32[offset + 8] = uvs.x1;
  float32[offset + 9] = uvs.y1;
  uint32[offset + 10] = color;
  float32[offset + 11] = textureId;
  
  // 顶点 2 (右下)
  float32[offset + 12] = a * x1 + c * y1 + tx;
  float32[offset + 13] = b * x1 + d * y1 + ty;
  float32[offset + 14] = uvs.x2;
  float32[offset + 15] = uvs.y2;
  uint32[offset + 16] = color;
  float32[offset + 17] = textureId;
  
  // 顶点 3 (左下)
  float32[offset + 18] = a * x0 + c * y1 + tx;
  float32[offset + 19] = b * x0 + d * y1 + ty;
  float32[offset + 20] = uvs.x3;
  float32[offset + 21] = uvs.y3;
  uint32[offset + 22] = color;
  float32[offset + 23] = textureId;
  
  this._size++;
}
```

### 为什么在 CPU 端做变换？

你可能会问：为什么不直接传递矩阵给 GPU，让 GPU 做变换？

**原因**：
1. **减少 uniform 更新**：每个精灵都有不同的矩阵，需要频繁更新 uniform
2. **批处理兼容**：GPU 变换需要每个精灵一个 Draw Call
3. **CPU 变换足够快**：现代 CPU 处理简单的 2D 变换非常高效

## 多纹理批处理

为了进一步减少 Draw Call，PixiJS 支持在一个批次中使用多个纹理：

```typescript
// 最大支持的纹理数量（取决于 GPU 的纹理单元数量）
const MAX_TEXTURES = 16;

// Shader 中使用纹理数组
const fragmentShader = `
  uniform sampler2D uTextures[16];
  
  varying vec2 vUv;
  varying float vTextureId;
  varying vec4 vColor;
  
  void main() {
    int textureId = int(vTextureId);
    vec4 color;
    
    // 动态选择纹理（WebGL 1 需要分支）
    if (textureId == 0) color = texture2D(uTextures[0], vUv);
    else if (textureId == 1) color = texture2D(uTextures[1], vUv);
    // ... 更多纹理
    
    gl_FragColor = color * vColor;
  }
`;
```

## 刷新批次

当需要绘制时，将缓冲区数据上传到 GPU：

```typescript
/**
 * 刷新批次，执行绘制
 */
public flush(renderer: WebGLRenderer): void {
  if (this._size === 0) return;
  
  const gl = renderer.gl;
  
  // 上传顶点数据
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferSubData(
    gl.ARRAY_BUFFER,
    0,
    this._float32View.subarray(0, this._size * 4 * this._vertexSize)
  );
  
  // 设置顶点属性
  this.setupAttributes(gl);
  
  // 绑定索引缓冲区
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  
  // 绘制
  gl.drawElements(
    gl.TRIANGLES,
    this._size * 6,  // 每个精灵 6 个索引
    gl.UNSIGNED_SHORT,
    0
  );
  
  // 重置批次
  this.reset();
}
```

## 内存布局优化

### 交错布局 vs 分离布局

PixiJS 使用**交错布局（Interleaved Layout）**：

```
交错布局（PixiJS 使用）：
[v0.pos, v0.uv, v0.color, v1.pos, v1.uv, v1.color, ...]

分离布局：
positions: [v0.pos, v1.pos, ...]
uvs: [v0.uv, v1.uv, ...]
colors: [v0.color, v1.color, ...]
```

**交错布局的优势**：
1. **缓存友好**：顶点数据在内存中连续
2. **单次上传**：只需更新一个缓冲区
3. **GPU 读取高效**：所有属性在一起

### TypedArray 双视图

使用两个视图访问同一块内存：

```typescript
// 创建共享的 ArrayBuffer
const buffer = new ArrayBuffer(floatCount * 4);

// Float32 视图用于位置和 UV
const float32View = new Float32Array(buffer);

// Uint32 视图用于颜色（ABGR 打包）
const uint32View = new Uint32Array(buffer);

// 同一位置，不同解释
float32View[4] = ...;  // 作为浮点数
uint32View[4] = 0xFF00FF00;  // 作为 32 位整数（颜色）
```

## 使用示例

```typescript
// 创建批次几何体
const batchGeometry = new BatchGeometry({ maxSize: 4096 });

// 渲染循环
function render(sprites: Sprite[]) {
  batchGeometry.reset();
  
  for (const sprite of sprites) {
    // 如果批次满了，刷新并继续
    if (!batchGeometry.canBatch()) {
      batchGeometry.flush(renderer);
    }
    
    // 添加精灵
    batchGeometry.addSprite(sprite);
  }
  
  // 刷新剩余的精灵
  batchGeometry.flush(renderer);
}
```

## 小结

BatchGeometry 的核心设计：

1. **预分配缓冲区**：避免动态分配内存
2. **交错顶点格式**：缓存友好的内存布局
3. **CPU 端变换**：允许多精灵合并绘制
4. **多纹理支持**：进一步减少批次切换

性能收益：
- 1000 个精灵从 1000 次 Draw Call 减少到 1 次
- 减少 CPU-GPU 通信开销
- 提高 GPU 利用率
