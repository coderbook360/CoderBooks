# 性能优化：SIMD 与向量化

3D 数学运算是图形应用的性能瓶颈之一。本章探讨如何通过 SIMD 和其他技术优化数学库。

## 为什么需要关注性能？

在深入优化技术之前，让我们理解为什么 3D 数学性能如此重要。

一个典型的 3D 游戏场景可能需要：
- **每帧变换数万个顶点**：每个顶点都要经过 MVP 矩阵变换
- **大量碰撞检测**：上百个物体两两之间的碰撞测试
- **物理模拟**：力、速度、加速度的向量运算
- **动画骨骼计算**：每个骨骼的矩阵运算

所有这些运算都在**每一帧**（通常 16ms 内）完成。如果数学运算慢 2 倍，帧率可能从 60fps 降到 40fps。

## 什么是 SIMD？

**SIMD**（Single Instruction, Multiple Data）是现代 CPU 的一种并行计算能力。理解它的原理，才能有效利用它。

### 传统方式 vs SIMD

假设我们要计算 4 个向量加法：

```
传统方式（标量运算）：
  a1 + b1 = c1    ← 第1条指令
  a2 + b2 = c2    ← 第2条指令
  a3 + b3 = c3    ← 第3条指令
  a4 + b4 = c4    ← 第4条指令
  （共4条指令，4个时钟周期）

SIMD 方式（向量运算）：
  [a1, a2, a3, a4] + [b1, b2, b3, b4] = [c1, c2, c3, c4]
  （1条指令，1个时钟周期）
```

### 为什么 SIMD 能加速？

关键在于 CPU 的硬件设计：

1. **宽寄存器**：现代 CPU 有 128 位（SSE）或 256 位（AVX）的寄存器，可以同时存放 4 个或 8 个 32 位浮点数
2. **并行执行单元**：CPU 有多个浮点运算单元可以同时工作
3. **单指令控制**：用一条指令同时操作多个数据，减少了指令解码的开销

3D 数学特别适合 SIMD，因为：
- 向量有 3-4 个分量，刚好填满 128 位寄存器
- 矩阵运算本质是大量独立的乘加操作
- 批量处理顶点时，相同操作应用于大量数据

### JavaScript 中的 SIMD 现状

遗憾的是，JavaScript 曾经有 `SIMD.js` API，但后来被废弃了。不过我们仍可以通过以下方式获得部分 SIMD 优势：

1. **TypedArray**：让 JIT 编译器更容易生成向量化代码
2. **WebAssembly SIMD**：在 WASM 中使用真正的 SIMD 指令
3. **良好的内存布局**：让自动向量化更有效

## JavaScript 中的优化策略

## JavaScript 中的优化策略

### TypedArray：不只是类型标注

使用 TypedArray 可以获得更好的内存布局和性能。但为什么？

普通 JavaScript 数组的问题：
- **动态类型**：每个元素可以是任意类型，需要额外的类型信息
- **非连续存储**：数组元素可能分散在内存各处
- **装箱开销**：数字被包装成对象

TypedArray 的优势：
- **类型确定**：所有元素都是同一类型，无需类型检查
- **连续内存**：数据紧密排列，缓存友好
- **无装箱**：直接操作原始数值

```javascript
// 不推荐：对象数组
// 每个对象都有额外的内存开销，且分散存储
const vectors = [
  { x: 1, y: 2, z: 3 },
  { x: 4, y: 5, z: 6 },
  // ...
];

// 推荐：TypedArray
// 数据紧密排列在连续内存中
const vectorData = new Float32Array([
  1, 2, 3,  // 向量1
  4, 5, 6,  // 向量2
  // ...
]);
```

### Structure of Arrays (SoA)：为批处理而生

SoA 是一种更激进的优化策略，特别适合批量处理。

传统布局是 AoS（Array of Structures）：

```javascript
// Array of Structures (AoS) - 常规方式
// 内存布局：[x1, y1, z1, x2, y2, z2, x3, y3, z3, ...]
const positions = new Float32Array([
  x1, y1, z1,  // 顶点1
  x2, y2, z2,  // 顶点2
  x3, y3, z3,  // 顶点3
]);
```

而 SoA 将同一分量的数据放在一起：

```javascript
// Structure of Arrays (SoA) - SIMD 友好
// 每个分量单独存储
const positionsX = new Float32Array([x1, x2, x3, x4]);
const positionsY = new Float32Array([y1, y2, y3, y4]);
const positionsZ = new Float32Array([z1, z2, z3, z4]);
```

**为什么 SoA 更快？**

1. **缓存效率**：处理所有 X 分量时，数据连续排列，减少缓存未命中
2. **SIMD 友好**：可以同时加载 4 个 X 值到 SIMD 寄存器
3. **向量化**：JIT 编译器更容易识别并优化循环

## 向量运算优化

接下来看具体的向量运算优化技巧。每个技巧都有其背后的原理。

### 避免对象分配：GC 是性能杀手

JavaScript 的垃圾回收（GC）会暂停程序执行，造成帧率波动。减少对象分配可以减轻 GC 压力。

```javascript
// 慢：每次创建新对象
// 问题：每帧调用 1000 次，就创建 1000 个对象等待 GC 回收
function addVectors(a, b) {
  return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

// 快：原地修改或使用输出参数
// 优点：零内存分配，GC 完全不参与
function addVectorsTo(a, b, out) {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

// 更灵活：使用对象池
// 原理：预先创建对象，反复使用
const tempVec = new Vec3();
function addVectorsPooled(a, b) {
  tempVec.x = a.x + b.x;
  tempVec.y = a.y + b.y;
  tempVec.z = a.z + b.z;
  return tempVec;  // 注意：返回的是共享对象，调用者要小心
}
```

### 循环展开：减少循环开销

循环本身有开销：递增计数器、比较条件、分支跳转。对于小循环，这些开销占比很大。

```javascript
// 原始循环
// 问题：每次迭代都有 i++, i<3, 分支判断
function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// 展开后
// 优点：没有循环开销，JIT 可以进一步优化
function dotProductUnrolled(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
```

### 批量处理：摊薄函数调用开销

函数调用有开销（压栈、跳转、返回）。批量处理可以摊薄这些开销。

```javascript
// 逐个变换（慢）
// 问题：每个点都有一次函数调用开销
function transformPoints(matrix, points) {
  return points.map(p => matrix.transformPoint(p));
}

// 批量变换（快）
// 优点：一次函数调用处理所有点，内联后 JIT 可高度优化
function transformPointsBatch(matrix, pointsFlat) {
  const result = new Float32Array(pointsFlat.length);
  const m = matrix.elements;
  
  // 每次循环处理一个顶点（3个浮点数）
  for (let i = 0; i < pointsFlat.length; i += 3) {
    const x = pointsFlat[i];
    const y = pointsFlat[i + 1];
    const z = pointsFlat[i + 2];
    
    // 矩阵变换：M * v
    // 这里假设列主序矩阵（OpenGL 风格）
    result[i]     = m[0] * x + m[4] * y + m[8]  * z + m[12];
    result[i + 1] = m[1] * x + m[5] * y + m[9]  * z + m[13];
    result[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  }
  
  return result;
}
```

## 矩阵运算优化

### 缓存友好的布局

```javascript
// 列主序（OpenGL 风格）
// 内存布局：[m00, m10, m20, m30, m01, m11, m21, m31, ...]

// 行主序（DirectX 风格）
// 内存布局：[m00, m01, m02, m03, m10, m11, m12, m13, ...]

// 矩阵乘法时，选择对缓存友好的遍历顺序
function multiplyMatricesCacheFriendly(a, b, out) {
  const ae = a.elements;
  const be = b.elements;
  const oe = out.elements;
  
  // 对于列主序，按列遍历 B
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += ae[i + k * 4] * be[k + j * 4];
      }
      oe[i + j * 4] = sum;
    }
  }
}
```

### 特殊矩阵快速路径

```javascript
function multiplyMatrix4(a, b, out) {
  // 检测特殊情况
  if (isIdentity(a)) {
    copyMatrix(b, out);
    return;
  }
  
  if (isIdentity(b)) {
    copyMatrix(a, out);
    return;
  }
  
  // 检测仿射变换（最后一行是 [0,0,0,1]）
  if (isAffine(a) && isAffine(b)) {
    multiplyAffine(a, b, out);  // 跳过部分计算
    return;
  }
  
  // 通用乘法
  multiplyGeneral(a, b, out);
}

function multiplyAffine(a, b, out) {
  const ae = a.elements;
  const be = b.elements;
  const oe = out.elements;
  
  // 只计算前3行
  const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
  const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
  const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
  
  const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
  const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
  const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
  
  oe[0] = a11 * b11 + a12 * b21 + a13 * b31;
  oe[1] = a21 * b11 + a22 * b21 + a23 * b31;
  oe[2] = a31 * b11 + a32 * b21 + a33 * b31;
  oe[3] = 0;
  
  // ... 类似处理其他列
  
  oe[15] = 1;
}
```

## 四元数优化

### 避免归一化

```javascript
// 如果输入已归一化，可以跳过归一化
function quaternionMultiplyNormalized(a, b, out) {
  // 假设 a 和 b 都是单位四元数
  out.x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  out.y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  out.z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  out.w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  // 跳过归一化
  return out;
}
```

### SLERP 优化

```javascript
function slerpOptimized(a, b, t, out) {
  let cosom = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  
  // 处理反向情况
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  if (cosom < 0) {
    cosom = -cosom;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }
  
  let scale0, scale1;
  
  // 对于小角度，使用线性插值
  if (1 - cosom > 0.001) {
    const omega = Math.acos(cosom);
    const sinom = Math.sin(omega);
    scale0 = Math.sin((1 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // 线性插值（避免除以接近0的数）
    scale0 = 1 - t;
    scale1 = t;
  }
  
  out.x = scale0 * a.x + scale1 * bx;
  out.y = scale0 * a.y + scale1 * by;
  out.z = scale0 * a.z + scale1 * bz;
  out.w = scale0 * a.w + scale1 * bw;
  
  return out;
}
```

## WebGL 相关优化

### 预分配 Uniform 缓冲

```javascript
// 避免每帧创建新数组
const modelViewMatrix = new Float32Array(16);
const projectionMatrix = new Float32Array(16);
const normalMatrix = new Float32Array(9);

function render(mvp, proj, normal) {
  // 直接复制到预分配数组
  modelViewMatrix.set(mvp.elements);
  projectionMatrix.set(proj.elements);
  
  // 上传到 GPU
  gl.uniformMatrix4fv(mvpLocation, false, modelViewMatrix);
  gl.uniformMatrix4fv(projLocation, false, projectionMatrix);
}
```

### 减少状态变化

```javascript
// 批量更新矩阵
class MatrixStack {
  private stack: Float32Array[];
  private current: Float32Array;
  private dirty = true;
  
  push(): void {
    this.stack.push(this.current.slice());
  }
  
  pop(): void {
    this.current = this.stack.pop()!;
    this.dirty = true;
  }
  
  // 只在需要时上传
  uploadIfDirty(location: WebGLUniformLocation): void {
    if (this.dirty) {
      gl.uniformMatrix4fv(location, false, this.current);
      this.dirty = false;
    }
  }
}
```

## 性能对比

| 优化技术 | 性能提升 | 适用场景 |
|---------|---------|---------|
| TypedArray | 2-3x | 大量数值运算 |
| 对象池 | 5-10x | 频繁创建对象 |
| 循环展开 | 1.5-2x | 小循环 |
| SoA 布局 | 2-4x | 批量处理 |
| 特殊快速路径 | 2-5x | 常见变换 |

## 基准测试

```javascript
function benchmark() {
  const iterations = 1000000;
  
  // 测试对象创建
  console.time('Object creation');
  for (let i = 0; i < iterations; i++) {
    const v = new Vec3(1, 2, 3);
  }
  console.timeEnd('Object creation');
  
  // 测试原地修改
  const reuse = new Vec3();
  console.time('Object reuse');
  for (let i = 0; i < iterations; i++) {
    reuse.set(1, 2, 3);
  }
  console.timeEnd('Object reuse');
  
  // 测试 TypedArray
  const arr = new Float32Array(3);
  console.time('TypedArray');
  for (let i = 0; i < iterations; i++) {
    arr[0] = 1; arr[1] = 2; arr[2] = 3;
  }
  console.timeEnd('TypedArray');
}
```

## 小结

1. **使用 TypedArray**：Float32Array 比对象数组快
2. **减少分配**：使用对象池和原地修改
3. **批量处理**：一次处理多个元素
4. **特殊快速路径**：检测常见情况
5. **缓存友好**：选择合适的内存布局

优化原则：
- 先测量，再优化
- 关注热点代码
- 权衡代码可读性和性能
