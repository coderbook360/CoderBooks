# 性能优化：SIMD 与向量化

3D 数学运算是图形应用的性能瓶颈之一。本章探讨如何通过 SIMD 和其他技术优化数学库。

## 什么是 SIMD？

**SIMD**（Single Instruction, Multiple Data）允许一条指令同时处理多个数据：

```
传统方式：
  a1 + b1 = c1
  a2 + b2 = c2
  a3 + b3 = c3
  a4 + b4 = c4
  （4条指令）

SIMD 方式：
  [a1, a2, a3, a4] + [b1, b2, b3, b4] = [c1, c2, c3, c4]
  （1条指令）
```

## JavaScript 中的 SIMD

### TypedArray

使用 TypedArray 可以获得更好的内存布局和性能：

```javascript
// 不推荐：对象数组
const vectors = [
  { x: 1, y: 2, z: 3 },
  { x: 4, y: 5, z: 6 },
  // ...
];

// 推荐：TypedArray
const vectorData = new Float32Array([
  1, 2, 3,  // 向量1
  4, 5, 6,  // 向量2
  // ...
]);
```

### Structure of Arrays (SoA)

更进一步，使用 SoA 布局：

```javascript
// Array of Structures (AoS) - 常规方式
const positions = new Float32Array([
  x1, y1, z1,  // 顶点1
  x2, y2, z2,  // 顶点2
  x3, y3, z3,  // 顶点3
]);

// Structure of Arrays (SoA) - SIMD 友好
const positionsX = new Float32Array([x1, x2, x3, x4]);
const positionsY = new Float32Array([y1, y2, y3, y4]);
const positionsZ = new Float32Array([z1, z2, z3, z4]);
```

SoA 布局允许批量处理同一分量，更容易被 JIT 编译器向量化。

## 向量运算优化

### 避免对象分配

```javascript
// 慢：每次创建新对象
function addVectors(a, b) {
  return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

// 快：原地修改或使用输出参数
function addVectorsTo(a, b, out) {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

// 使用对象池
const tempVec = new Vec3();
function addVectorsPooled(a, b) {
  tempVec.x = a.x + b.x;
  tempVec.y = a.y + b.y;
  tempVec.z = a.z + b.z;
  return tempVec;
}
```

### 循环展开

```javascript
// 原始循环
function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// 展开后
function dotProductUnrolled(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
```

### 批量处理

```javascript
// 逐个变换（慢）
function transformPoints(matrix, points) {
  return points.map(p => matrix.transformPoint(p));
}

// 批量变换（快）
function transformPointsBatch(matrix, pointsFlat) {
  const result = new Float32Array(pointsFlat.length);
  const m = matrix.elements;
  
  for (let i = 0; i < pointsFlat.length; i += 3) {
    const x = pointsFlat[i];
    const y = pointsFlat[i + 1];
    const z = pointsFlat[i + 2];
    
    result[i]     = m[0] * x + m[4] * y + m[8] * z + m[12];
    result[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
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
