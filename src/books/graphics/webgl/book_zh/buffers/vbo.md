# 顶点缓冲对象（VBO）

> "VBO 是将顶点数据从 CPU 传送到 GPU 的标准方式。"

## 什么是 VBO

### 定义

顶点缓冲对象（Vertex Buffer Object，VBO）存储顶点属性数据，如位置、法线、纹理坐标等。

```
┌─────────────────────────────────────────────────────────┐
│                    VBO 数据结构                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  VBO 内容:                                              │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐    │
│  │ x0  │ y0  │ z0  │ x1  │ y1  │ z1  │ x2  │ y2  │... │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘    │
│  │     顶点 0     │     顶点 1     │     顶点 2     │  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 创建和使用 VBO

### 基本流程

```javascript
// 1. 准备顶点数据
const positions = new Float32Array([
  // 三角形三个顶点
  0.0,  0.5, 0.0,   // 顶点 0
 -0.5, -0.5, 0.0,   // 顶点 1
  0.5, -0.5, 0.0    // 顶点 2
]);

// 2. 创建 VBO
const positionBuffer = gl.createBuffer();

// 3. 绑定到 ARRAY_BUFFER
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// 4. 上传数据
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
```

### 配置顶点属性

```javascript
// 获取属性位置
const positionLoc = gl.getAttribLocation(program, 'a_position');

// 绑定 VBO
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// 配置属性指针
gl.vertexAttribPointer(
  positionLoc,  // 属性位置
  3,            // 每个顶点的分量数
  gl.FLOAT,     // 数据类型
  false,        // 是否归一化
  0,            // 步长（0 = 紧密排列）
  0             // 偏移量
);

// 启用属性
gl.enableVertexAttribArray(positionLoc);
```

## 数据布局

### 独立缓冲（Separate Buffers）

每种属性使用独立的缓冲：

```javascript
// 位置缓冲
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  0, 0, 0,
  1, 0, 0,
  0.5, 1, 0
]), gl.STATIC_DRAW);

// 颜色缓冲
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  1, 0, 0,  // 红
  0, 1, 0,  // 绿
  0, 0, 1   // 蓝
]), gl.STATIC_DRAW);

// 法线缓冲
const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  0, 0, 1,
  0, 0, 1,
  0, 0, 1
]), gl.STATIC_DRAW);
```

```
独立布局:
Position VBO: [x0, y0, z0, x1, y1, z1, x2, y2, z2]
Color VBO:    [r0, g0, b0, r1, g1, b1, r2, g2, b2]
Normal VBO:   [nx0, ny0, nz0, nx1, ny1, nz1, nx2, ny2, nz2]
```

### 交错缓冲（Interleaved Buffer）

所有属性在一个缓冲中交错排列：

```javascript
// 交错数据：位置 + 颜色 + 法线
const interleavedData = new Float32Array([
  // 位置          颜色         法线
  0, 0, 0,     1, 0, 0,    0, 0, 1,  // 顶点 0
  1, 0, 0,     0, 1, 0,    0, 0, 1,  // 顶点 1
  0.5, 1, 0,   0, 0, 1,    0, 0, 1   // 顶点 2
]);

const interleavedBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, interleavedBuffer);
gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.STATIC_DRAW);

// 配置属性指针
const stride = 9 * 4;  // 9 个 float，每个 4 字节

// 位置：偏移 0
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, stride, 0);

// 颜色：偏移 12 字节（3 * 4）
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 12);

// 法线：偏移 24 字节（6 * 4）
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, stride, 24);
```

```
交错布局:
VBO: [x0, y0, z0, r0, g0, b0, nx0, ny0, nz0, x1, y1, z1, r1, g1, b1, ...]
     │─────────── 顶点 0 ───────────│────────── 顶点 1 ──────────│
     │← stride (36 bytes) →│
```

### 布局对比

| 方面 | 独立缓冲 | 交错缓冲 |
|------|---------|---------|
| 缓存效率 | 较低 | 较高 |
| 部分更新 | 容易 | 困难 |
| 代码复杂度 | 简单 | 复杂 |
| 推荐场景 | 属性独立变化 | 属性一起使用 |

## 属性配置详解

### vertexAttribPointer 参数

```javascript
gl.vertexAttribPointer(
  index,      // 属性位置索引
  size,       // 分量数量（1-4）
  type,       // 数据类型
  normalized, // 是否归一化
  stride,     // 步长（字节）
  offset      // 起始偏移（字节）
);
```

### 数据类型

```javascript
// 浮点类型
gl.FLOAT           // 32 位浮点
gl.HALF_FLOAT      // 16 位浮点（WebGL 2.0）

// 整数类型（配合 vertexAttribIPointer 使用）
gl.BYTE            // 8 位有符号整数
gl.UNSIGNED_BYTE   // 8 位无符号整数
gl.SHORT           // 16 位有符号整数
gl.UNSIGNED_SHORT  // 16 位无符号整数
gl.INT             // 32 位有符号整数
gl.UNSIGNED_INT    // 32 位无符号整数
```

### 归一化

```javascript
// 归一化：将整数映射到 [0, 1] 或 [-1, 1]

// 颜色使用 0-255 范围
const colors = new Uint8Array([255, 128, 64, 255]);
gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, 0, 0);
// normalized = true: 255 → 1.0, 128 → 0.5, 64 → 0.25

// 法线使用 -128 到 127 范围
const normals = new Int8Array([0, 0, 127, 0, 0, 127]);
gl.vertexAttribPointer(normalLoc, 3, gl.BYTE, true, 0, 0);
// normalized = true: 127 → 1.0, -128 → -1.0
```

### 整数属性（WebGL 2.0）

```javascript
// 骨骼索引需要保持为整数
const boneIndices = new Uint8Array([0, 1, 2, 3]);

// 使用 vertexAttribIPointer（注意 I）
gl.vertexAttribIPointer(boneIdLoc, 4, gl.UNSIGNED_BYTE, 0, 0);

// 着色器中使用整数类型
// in ivec4 a_boneIds;
```

## 动态更新

### 部分更新

```javascript
// 创建缓冲
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, 1000 * 4, gl.DYNAMIC_DRAW);

// 更新部分数据
const updateData = new Float32Array([1.0, 2.0, 3.0]);
gl.bufferSubData(gl.ARRAY_BUFFER, 100, updateData);  // 偏移 100 字节
```

### 动画更新

```javascript
// 粒子系统示例
const particleCount = 1000;
const positions = new Float32Array(particleCount * 3);
const velocities = new Float32Array(particleCount * 3);

function updateParticles(dt) {
  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;
    positions[idx] += velocities[idx] * dt;
    positions[idx + 1] += velocities[idx + 1] * dt;
    positions[idx + 2] += velocities[idx + 2] * dt;
  }
  
  // 更新 VBO
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
}
```

### 孤儿缓冲技术

```javascript
// 避免 GPU/CPU 同步
function updateBuffer(buffer, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  
  // 先"孤儿化"旧缓冲（分配新空间）
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  
  // 再填充数据
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
}
```

## 常量属性

### 禁用顶点属性

```javascript
// 当属性为常量时，可以禁用数组并设置常量值
gl.disableVertexAttribArray(colorLoc);
gl.vertexAttrib4f(colorLoc, 1.0, 0.0, 0.0, 1.0);  // 所有顶点都是红色

// 或使用向量版本
gl.vertexAttrib4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]);
```

### 其他 vertexAttrib 变体

```javascript
// 不同分量数
gl.vertexAttrib1f(loc, x);
gl.vertexAttrib2f(loc, x, y);
gl.vertexAttrib3f(loc, x, y, z);
gl.vertexAttrib4f(loc, x, y, z, w);

// 向量版本
gl.vertexAttrib1fv(loc, [x]);
gl.vertexAttrib2fv(loc, [x, y]);
gl.vertexAttrib3fv(loc, [x, y, z]);
gl.vertexAttrib4fv(loc, [x, y, z, w]);

// 整数版本（WebGL 2.0）
gl.vertexAttribI4i(loc, x, y, z, w);
gl.vertexAttribI4ui(loc, x, y, z, w);
```

## 性能优化

### 减少 VBO 数量

```javascript
// 不好：每个网格一个 VBO
meshes.forEach(mesh => {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
});

// 好：合并到一个 VBO
gl.bindBuffer(gl.ARRAY_BUFFER, combinedVBO);
meshes.forEach(mesh => {
  gl.drawArrays(gl.TRIANGLES, mesh.offset, mesh.count);
});
```

### 使用合适的数据类型

```javascript
// 位置：Float32（需要精度）
const positions = new Float32Array([...]);

// 法线：可以用 Int8（归一化后精度足够）
const normals = new Int8Array([...]);  // 节省 75% 内存

// UV：可以用 Uint16（归一化）
const uvs = new Uint16Array([...]);  // 节省 50% 内存

// 骨骼索引：Uint8（最多 256 根骨骼）
const boneIds = new Uint8Array([...]);

// 骨骼权重：Uint8（归一化）
const boneWeights = new Uint8Array([...]);
```

### 数据对齐

```javascript
// 确保 4 字节对齐
// 不好：3 字节的法线
const badData = new Int8Array([nx, ny, nz, nx, ny, nz, ...]);

// 好：填充到 4 字节
const goodData = new Int8Array([nx, ny, nz, 0, nx, ny, nz, 0, ...]);
```

## 本章小结

- VBO 存储顶点属性数据在 GPU 内存中
- 可以使用独立缓冲或交错缓冲布局
- vertexAttribPointer 配置如何解释缓冲数据
- 归一化可以使用较小的数据类型
- 动态更新使用 bufferSubData 或孤儿技术
- 常量属性可以禁用数组并使用 vertexAttrib*

下一章，我们将学习索引缓冲对象（IBO/EBO）。
