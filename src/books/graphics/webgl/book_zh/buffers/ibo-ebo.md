# 索引缓冲对象（IBO/EBO）

> "索引缓冲让顶点复用成为可能，大幅减少数据冗余。"

## 什么是索引缓冲

### 定义

索引缓冲对象（Index Buffer Object，IBO）也称为元素缓冲对象（Element Buffer Object，EBO），存储顶点的索引，允许复用顶点数据。

```
┌─────────────────────────────────────────────────────────┐
│                    无索引 vs 有索引                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  无索引（6个顶点）:                                      │
│  [v0, v1, v2, v0, v2, v3]  ← 顶点重复                   │
│                                                         │
│  有索引（4个顶点 + 6个索引）:                            │
│  顶点: [v0, v1, v2, v3]    ← 无重复                     │
│  索引: [0, 1, 2, 0, 2, 3]  ← 引用顶点                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 索引绘制示意

```
顶点数组:           索引数组:
┌─────┐            ┌─────┐
│ v0  │◄───────────│  0  │
├─────┤            ├─────┤
│ v1  │◄───────────│  1  │
├─────┤            ├─────┤
│ v2  │◄─┬─────────│  2  │
├─────┤  │         ├─────┤
│ v3  │  │    ┌────│  0  │  ← 复用 v0
└─────┘  │    │    ├─────┤
         └────│────│  2  │  ← 复用 v2
              │    ├─────┤
              └────│  3  │
                   └─────┘
```

## 创建和使用 IBO

### 基本流程

```javascript
// 顶点数据（正方形，4个顶点）
const positions = new Float32Array([
  -0.5, -0.5, 0.0,  // v0: 左下
   0.5, -0.5, 0.0,  // v1: 右下
   0.5,  0.5, 0.0,  // v2: 右上
  -0.5,  0.5, 0.0   // v3: 左上
]);

// 索引数据（两个三角形）
const indices = new Uint16Array([
  0, 1, 2,  // 第一个三角形
  0, 2, 3   // 第二个三角形
]);

// 创建并上传 VBO
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// 创建并上传 IBO
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
```

### 索引绘制

```javascript
// 绑定 VAO（包含 VBO 和 IBO 配置）
gl.bindVertexArray(vao);

// 使用索引绘制
gl.drawElements(
  gl.TRIANGLES,       // 图元类型
  6,                  // 索引数量
  gl.UNSIGNED_SHORT,  // 索引类型
  0                   // 偏移（字节）
);
```

## 索引类型

### 支持的类型

```javascript
// Uint8：最多 256 个顶点
const indices8 = new Uint8Array([0, 1, 2]);
gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_BYTE, 0);

// Uint16：最多 65536 个顶点（常用）
const indices16 = new Uint16Array([0, 1, 2]);
gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);

// Uint32：最多 4,294,967,296 个顶点（大型模型）
const indices32 = new Uint32Array([0, 1, 2]);
gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_INT, 0);
```

### 类型选择

| 类型 | 字节数 | 最大顶点数 | 适用场景 |
|------|--------|-----------|---------|
| UNSIGNED_BYTE | 1 | 256 | 小型图元 |
| UNSIGNED_SHORT | 2 | 65,536 | 大多数模型 |
| UNSIGNED_INT | 4 | 4B+ | 超大型模型 |

```javascript
// 自动选择最小类型
function chooseIndexType(vertexCount) {
  if (vertexCount <= 256) {
    return { type: gl.UNSIGNED_BYTE, ArrayType: Uint8Array };
  } else if (vertexCount <= 65536) {
    return { type: gl.UNSIGNED_SHORT, ArrayType: Uint16Array };
  } else {
    return { type: gl.UNSIGNED_INT, ArrayType: Uint32Array };
  }
}
```

## 常见图元的索引

### 正方形

```javascript
// 两个三角形组成正方形
//  v3──v2
//  │ ╲ │
//  v0──v1

const squareIndices = new Uint16Array([
  0, 1, 2,  // 右下三角形
  0, 2, 3   // 左上三角形
]);
```

### 立方体

```javascript
// 6 面 × 4 顶点 = 24 顶点（因为法线不同）
// 6 面 × 2 三角形 × 3 索引 = 36 索引

const cubeIndices = new Uint16Array([
  // 前面
  0, 1, 2, 0, 2, 3,
  // 后面
  4, 5, 6, 4, 6, 7,
  // 上面
  8, 9, 10, 8, 10, 11,
  // 下面
  12, 13, 14, 12, 14, 15,
  // 右面
  16, 17, 18, 16, 18, 19,
  // 左面
  20, 21, 22, 20, 22, 23
]);
```

### 球体

```javascript
// 生成球体索引
function generateSphereIndices(latBands, longBands) {
  const indices = [];
  
  for (let lat = 0; lat < latBands; lat++) {
    for (let long = 0; long < longBands; long++) {
      const first = lat * (longBands + 1) + long;
      const second = first + longBands + 1;
      
      // 两个三角形
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  
  return new Uint16Array(indices);
}
```

### 网格（Grid）

```javascript
// 生成网格索引
function generateGridIndices(width, height) {
  const indices = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * (width + 1) + x;
      
      // 两个三角形
      indices.push(i, i + width + 1, i + 1);
      indices.push(i + 1, i + width + 1, i + width + 2);
    }
  }
  
  return new Uint16Array(indices);
}
```

## 索引优化

### 顶点缓存优化

GPU 有顶点缓存，优化索引顺序可提高缓存命中率：

```
未优化:                      优化后:
索引: [0, 5, 100, 3, 99, 50] 索引: [0, 1, 2, 2, 1, 3, 3, 4, 5]
缓存效率: 低                  缓存效率: 高
```

### 三角形条带

使用 TRIANGLE_STRIP 减少索引数量：

```javascript
// 三角形列表：6 个索引
// [0, 1, 2, 2, 1, 3]

// 三角形条带：4 个顶点，自动生成三角形
// [0, 1, 2, 3] → 三角形 (0,1,2) 和 (2,1,3)
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

// 或使用退化三角形连接多个条带
const stripIndices = new Uint16Array([
  0, 1, 2, 3,     // 第一个条带
  3, 4,           // 退化三角形（连接用）
  4, 5, 6, 7      // 第二个条带
]);
```

### 图元重启（WebGL 2.0）

```javascript
// 启用图元重启
gl.enable(gl.PRIMITIVE_RESTART_FIXED_INDEX);

// 使用最大索引值作为重启标记
// Uint16: 65535, Uint32: 4294967295
const indices = new Uint16Array([
  0, 1, 2, 3,    // 第一个条带
  65535,         // 重启标记
  4, 5, 6, 7     // 第二个条带
]);

gl.drawElements(gl.TRIANGLE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);
```

## 范围绘制

### drawRangeElements（WebGL 2.0）

```javascript
// 提示 GPU 索引值的范围，可能提升性能
gl.drawRangeElements(
  gl.TRIANGLES,
  0,                  // start：最小索引值
  99,                 // end：最大索引值
  150,                // count：索引数量
  gl.UNSIGNED_SHORT,
  0
);
```

## 多次绘制

### drawElementsInstanced（WebGL 2.0）

```javascript
// 实例化绘制：一次绘制多个实例
gl.drawElementsInstanced(
  gl.TRIANGLES,
  indexCount,
  gl.UNSIGNED_SHORT,
  0,
  instanceCount  // 实例数量
);
```

### 偏移绘制

```javascript
// 绘制索引缓冲的子集
const subset1Offset = 0;
const subset1Count = 36;

const subset2Offset = 36 * 2;  // 字节偏移
const subset2Count = 24;

// 绘制第一部分
gl.drawElements(gl.TRIANGLES, subset1Count, gl.UNSIGNED_SHORT, subset1Offset);

// 绘制第二部分
gl.drawElements(gl.TRIANGLES, subset2Count, gl.UNSIGNED_SHORT, subset2Offset);
```

## 与 VAO 配合

### VAO 存储 IBO 绑定

```javascript
// 创建 VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// 配置 VBO
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(posLoc);

// 绑定 IBO（会被记录到 VAO）
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

// 解绑 VAO
gl.bindVertexArray(null);

// 渲染时只需绑定 VAO
gl.bindVertexArray(vao);
gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
```

## 内存节省计算

### 示例：立方体

```
无索引:
- 6 面 × 2 三角形 × 3 顶点 = 36 顶点
- 每顶点: 位置(12) + 法线(12) + UV(8) = 32 字节
- 总计: 36 × 32 = 1152 字节

有索引:
- 24 顶点 × 32 字节 = 768 字节
- 36 索引 × 2 字节 = 72 字节
- 总计: 840 字节

节省: (1152 - 840) / 1152 = 27%
```

### 大型模型

```
10000 个三角形的模型:

无索引:
- 30000 顶点 × 32 字节 = 960 KB

有索引（假设 50% 顶点复用）:
- 15000 顶点 × 32 字节 = 480 KB
- 30000 索引 × 2 字节 = 60 KB
- 总计: 540 KB

节省: 44%
```

## 本章小结

- 索引缓冲允许复用顶点数据
- 使用 ELEMENT_ARRAY_BUFFER 绑定目标
- 根据顶点数量选择合适的索引类型
- drawElements 使用索引进行绘制
- 优化索引顺序可提高顶点缓存效率
- 图元重启可合并多个三角形条带
- 索引缓冲显著减少内存使用

下一章，我们将学习顶点数组对象（VAO）。
