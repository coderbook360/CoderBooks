# 矩阵与矩阵运算

> "矩阵是变换的数学表达，是连接物体空间和屏幕空间的桥梁。"

## 矩阵基础

### 什么是矩阵

矩阵是一个按行列排列的数字阵列。在 3D 图形中，我们主要使用：
- **3×3 矩阵**：旋转、缩放
- **4×4 矩阵**：旋转、缩放、平移、投影

### 矩阵表示

```
4×4 矩阵：

┌                      ┐
│ m00  m01  m02  m03  │   第0行
│ m10  m11  m12  m13  │   第1行
│ m20  m21  m22  m23  │   第2行
│ m30  m31  m32  m33  │   第3行
└                      ┘
  │    │    │    │
 第0列 第1列 第2列 第3列
```

### 存储顺序

```typescript
// Three.js 使用列主序（Column-Major）
// elements 数组布局：
const elements = [
  m00, m10, m20, m30,  // 第0列
  m01, m11, m21, m31,  // 第1列
  m02, m12, m22, m32,  // 第2列
  m03, m13, m23, m33,  // 第3列
];

// 索引映射
// elements[row + col * 4]
// 例如：m12 = elements[2 + 1 * 4] = elements[6]
```

## Matrix4 实现

### 基础结构

```typescript
// src/math/Matrix4.ts
export class Matrix4 {
  elements: number[];
  
  constructor() {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
  }
  
  set(
    n11: number, n12: number, n13: number, n14: number,
    n21: number, n22: number, n23: number, n24: number,
    n31: number, n32: number, n33: number, n34: number,
    n41: number, n42: number, n43: number, n44: number
  ): this {
    const te = this.elements;
    
    te[0] = n11; te[4] = n12; te[8] = n13; te[12] = n14;
    te[1] = n21; te[5] = n22; te[9] = n23; te[13] = n24;
    te[2] = n31; te[6] = n32; te[10] = n33; te[14] = n34;
    te[3] = n41; te[7] = n42; te[11] = n43; te[15] = n44;
    
    return this;
  }
  
  identity(): this {
    this.set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    return this;
  }
  
  clone(): Matrix4 {
    return new Matrix4().fromArray(this.elements);
  }
  
  copy(m: Matrix4): this {
    const te = this.elements;
    const me = m.elements;
    
    for (let i = 0; i < 16; i++) {
      te[i] = me[i];
    }
    
    return this;
  }
}
```

### 复制与数组操作

```typescript
copyPosition(m: Matrix4): this {
  const te = this.elements;
  const me = m.elements;
  
  te[12] = me[12];
  te[13] = me[13];
  te[14] = me[14];
  
  return this;
}

extractBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this {
  xAxis.setFromMatrixColumn(this, 0);
  yAxis.setFromMatrixColumn(this, 1);
  zAxis.setFromMatrixColumn(this, 2);
  return this;
}

makeBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this {
  this.set(
    xAxis.x, yAxis.x, zAxis.x, 0,
    xAxis.y, yAxis.y, zAxis.y, 0,
    xAxis.z, yAxis.z, zAxis.z, 0,
    0, 0, 0, 1
  );
  return this;
}

fromArray(array: number[], offset = 0): this {
  for (let i = 0; i < 16; i++) {
    this.elements[i] = array[i + offset];
  }
  return this;
}

toArray(array: number[] = [], offset = 0): number[] {
  const te = this.elements;
  
  for (let i = 0; i < 16; i++) {
    array[offset + i] = te[i];
  }
  
  return array;
}
```

## 矩阵乘法

### 原理

```
C = A × B

cij = Σ(k=0 to 3) aik × bkj

┌            ┐   ┌            ┐   ┌                    ┐
│ a00 a01 .. │ × │ b00 b01 .. │ = │ Σ(a0k×bk0) ...    │
│ a10 a11 .. │   │ b10 b11 .. │   │ ...               │
│ ... ... .. │   │ ... ... .. │   │                    │
└            ┘   └            ┘   └                    ┘
```

### 实现

```typescript
multiply(m: Matrix4): this {
  return this.multiplyMatrices(this, m);
}

premultiply(m: Matrix4): this {
  return this.multiplyMatrices(m, this);
}

multiplyMatrices(a: Matrix4, b: Matrix4): this {
  const ae = a.elements;
  const be = b.elements;
  const te = this.elements;
  
  const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
  const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
  const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
  const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
  
  const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
  const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
  const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
  const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
  
  te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
  te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
  te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
  te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
  
  te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
  te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
  te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
  te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
  
  te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
  te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
  te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
  te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
  
  te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
  te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
  te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
  te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  
  return this;
}

multiplyScalar(s: number): this {
  const te = this.elements;
  
  te[0] *= s; te[4] *= s; te[8] *= s; te[12] *= s;
  te[1] *= s; te[5] *= s; te[9] *= s; te[13] *= s;
  te[2] *= s; te[6] *= s; te[10] *= s; te[14] *= s;
  te[3] *= s; te[7] *= s; te[11] *= s; te[15] *= s;
  
  return this;
}
```

## 变换矩阵

### 平移矩阵

```
┌           ┐   ┌   ┐   ┌       ┐
│ 1 0 0 tx │   │ x │   │ x + tx│
│ 0 1 0 ty │ × │ y │ = │ y + ty│
│ 0 0 1 tz │   │ z │   │ z + tz│
│ 0 0 0 1  │   │ 1 │   │   1   │
└           ┘   └   ┘   └       ┘
```

```typescript
makeTranslation(x: number | Vector3, y?: number, z?: number): this {
  if (x instanceof Vector3) {
    this.set(
      1, 0, 0, x.x,
      0, 1, 0, x.y,
      0, 0, 1, x.z,
      0, 0, 0, 1
    );
  } else {
    this.set(
      1, 0, 0, x,
      0, 1, 0, y!,
      0, 0, 1, z!,
      0, 0, 0, 1
    );
  }
  return this;
}
```

### 旋转矩阵

#### 绕 X 轴旋转

```
┌               ┐
│ 1    0     0  │
│ 0  cosθ -sinθ │
│ 0  sinθ  cosθ │
└               ┘
```

```typescript
makeRotationX(theta: number): this {
  const c = Math.cos(theta), s = Math.sin(theta);
  
  this.set(
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1
  );
  
  return this;
}
```

#### 绕 Y 轴旋转

```
┌               ┐
│  cosθ  0  sinθ │
│    0   1    0  │
│ -sinθ  0  cosθ │
└               ┘
```

```typescript
makeRotationY(theta: number): this {
  const c = Math.cos(theta), s = Math.sin(theta);
  
  this.set(
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1
  );
  
  return this;
}
```

#### 绕 Z 轴旋转

```
┌               ┐
│ cosθ -sinθ  0 │
│ sinθ  cosθ  0 │
│   0     0   1 │
└               ┘
```

```typescript
makeRotationZ(theta: number): this {
  const c = Math.cos(theta), s = Math.sin(theta);
  
  this.set(
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
  
  return this;
}
```

#### 绕任意轴旋转

```typescript
makeRotationAxis(axis: Vector3, angle: number): this {
  // 使用 Rodrigues 旋转公式
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const x = axis.x, y = axis.y, z = axis.z;
  const tx = t * x, ty = t * y;
  
  this.set(
    tx * x + c,     tx * y - s * z, tx * z + s * y, 0,
    tx * y + s * z, ty * y + c,     ty * z - s * x, 0,
    tx * z - s * y, ty * z + s * x, t * z * z + c,  0,
    0, 0, 0, 1
  );
  
  return this;
}
```

### 缩放矩阵

```
┌           ┐   ┌   ┐   ┌      ┐
│ sx 0  0  0│   │ x │   │ x*sx │
│ 0  sy 0  0│ × │ y │ = │ y*sy │
│ 0  0  sz 0│   │ z │   │ z*sz │
│ 0  0  0  1│   │ 1 │   │  1   │
└           ┘   └   ┘   └      ┘
```

```typescript
makeScale(x: number, y: number, z: number): this {
  this.set(
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1
  );
  return this;
}
```

## 组合变换

### compose 和 decompose

```typescript
// 从位置、旋转、缩放构建矩阵
compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
  const te = this.elements;
  
  const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  
  const sx = scale.x, sy = scale.y, sz = scale.z;
  
  te[0] = (1 - (yy + zz)) * sx;
  te[1] = (xy + wz) * sx;
  te[2] = (xz - wy) * sx;
  te[3] = 0;
  
  te[4] = (xy - wz) * sy;
  te[5] = (1 - (xx + zz)) * sy;
  te[6] = (yz + wx) * sy;
  te[7] = 0;
  
  te[8] = (xz + wy) * sz;
  te[9] = (yz - wx) * sz;
  te[10] = (1 - (xx + yy)) * sz;
  te[11] = 0;
  
  te[12] = position.x;
  te[13] = position.y;
  te[14] = position.z;
  te[15] = 1;
  
  return this;
}

// 从矩阵提取位置、旋转、缩放
decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
  const te = this.elements;
  
  let sx = _v1.set(te[0], te[1], te[2]).length();
  const sy = _v1.set(te[4], te[5], te[6]).length();
  const sz = _v1.set(te[8], te[9], te[10]).length();
  
  // 检测负缩放
  const det = this.determinant();
  if (det < 0) sx = -sx;
  
  position.x = te[12];
  position.y = te[13];
  position.z = te[14];
  
  // 构建旋转矩阵
  _m1.copy(this);
  
  const invSX = 1 / sx;
  const invSY = 1 / sy;
  const invSZ = 1 / sz;
  
  _m1.elements[0] *= invSX;
  _m1.elements[1] *= invSX;
  _m1.elements[2] *= invSX;
  
  _m1.elements[4] *= invSY;
  _m1.elements[5] *= invSY;
  _m1.elements[6] *= invSY;
  
  _m1.elements[8] *= invSZ;
  _m1.elements[9] *= invSZ;
  _m1.elements[10] *= invSZ;
  
  quaternion.setFromRotationMatrix(_m1);
  
  scale.x = sx;
  scale.y = sy;
  scale.z = sz;
  
  return this;
}
```

## 行列式与逆矩阵

### 行列式

```typescript
determinant(): number {
  const te = this.elements;
  
  const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
  const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
  const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
  const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
  
  return (
    n41 * (
      +n14 * n23 * n32
      - n13 * n24 * n32
      - n14 * n22 * n33
      + n12 * n24 * n33
      + n13 * n22 * n34
      - n12 * n23 * n34
    ) +
    n42 * (
      +n11 * n23 * n34
      - n11 * n24 * n33
      + n14 * n21 * n33
      - n13 * n21 * n34
      + n13 * n24 * n31
      - n14 * n23 * n31
    ) +
    n43 * (
      +n11 * n24 * n32
      - n11 * n22 * n34
      - n14 * n21 * n32
      + n12 * n21 * n34
      + n14 * n22 * n31
      - n12 * n24 * n31
    ) +
    n44 * (
      -n13 * n22 * n31
      - n11 * n23 * n32
      + n11 * n22 * n33
      + n13 * n21 * n32
      - n12 * n21 * n33
      + n12 * n23 * n31
    )
  );
}
```

### 逆矩阵

```typescript
invert(): this {
  const te = this.elements,
    n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3],
    n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7],
    n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11],
    n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15],
    
    t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
    t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
    t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
    t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
  
  const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
  
  if (det === 0) {
    return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
  
  const detInv = 1 / det;
  
  te[0] = t11 * detInv;
  te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
  te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
  te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
  
  te[4] = t12 * detInv;
  te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
  te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
  te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
  
  te[8] = t13 * detInv;
  te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
  te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
  te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
  
  te[12] = t14 * detInv;
  te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
  te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
  te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
  
  return this;
}
```

### 转置

```typescript
transpose(): this {
  const te = this.elements;
  let tmp;
  
  tmp = te[1]; te[1] = te[4]; te[4] = tmp;
  tmp = te[2]; te[2] = te[8]; te[8] = tmp;
  tmp = te[6]; te[6] = te[9]; te[9] = tmp;
  
  tmp = te[3]; te[3] = te[12]; te[12] = tmp;
  tmp = te[7]; te[7] = te[13]; te[13] = tmp;
  tmp = te[11]; te[11] = te[14]; te[14] = tmp;
  
  return this;
}
```

## 视图矩阵

### lookAt

```typescript
lookAt(eye: Vector3, target: Vector3, up: Vector3): this {
  const te = this.elements;
  
  _z.subVectors(eye, target);
  
  if (_z.lengthSq() === 0) {
    // eye 和 target 重合
    _z.z = 1;
  }
  
  _z.normalize();
  _x.crossVectors(up, _z);
  
  if (_x.lengthSq() === 0) {
    // up 和 z 平行
    if (Math.abs(up.z) === 1) {
      _z.x += 0.0001;
    } else {
      _z.z += 0.0001;
    }
    _z.normalize();
    _x.crossVectors(up, _z);
  }
  
  _x.normalize();
  _y.crossVectors(_z, _x);
  
  te[0] = _x.x; te[4] = _y.x; te[8] = _z.x;
  te[1] = _x.y; te[5] = _y.y; te[9] = _z.y;
  te[2] = _x.z; te[6] = _y.z; te[10] = _z.z;
  
  return this;
}
```

## 投影矩阵

### 透视投影

```
        top
         │
    ┌────┼────┐  near plane
    │    │    │
left├────┼────┤right
    │    │    │
    └────┼────┘
         │
       bottom
         
           ╲   ╱
            ╲ ╱  far plane
             ╳
            ╱ ╲
           ╱   ╲
```

```typescript
makePerspective(
  left: number, right: number,
  top: number, bottom: number,
  near: number, far: number
): this {
  const te = this.elements;
  
  const x = 2 * near / (right - left);
  const y = 2 * near / (top - bottom);
  
  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);
  const c = -(far + near) / (far - near);
  const d = -2 * far * near / (far - near);
  
  te[0] = x;  te[4] = 0;  te[8] = a;   te[12] = 0;
  te[1] = 0;  te[5] = y;  te[9] = b;   te[13] = 0;
  te[2] = 0;  te[6] = 0;  te[10] = c;  te[14] = d;
  te[3] = 0;  te[7] = 0;  te[11] = -1; te[15] = 0;
  
  return this;
}
```

### 正交投影

```typescript
makeOrthographic(
  left: number, right: number,
  top: number, bottom: number,
  near: number, far: number
): this {
  const te = this.elements;
  
  const w = 1.0 / (right - left);
  const h = 1.0 / (top - bottom);
  const p = 1.0 / (far - near);
  
  const x = (right + left) * w;
  const y = (top + bottom) * h;
  const z = (far + near) * p;
  
  te[0] = 2 * w;  te[4] = 0;      te[8] = 0;       te[12] = -x;
  te[1] = 0;      te[5] = 2 * h;  te[9] = 0;       te[13] = -y;
  te[2] = 0;      te[6] = 0;      te[10] = -2 * p; te[14] = -z;
  te[3] = 0;      te[7] = 0;      te[11] = 0;      te[15] = 1;
  
  return this;
}
```

## Matrix3

### 用途

- 2D 变换
- 法线变换
- UV 变换

### 实现

```typescript
export class Matrix3 {
  elements: number[];
  
  constructor() {
    this.elements = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
  }
  
  // 从 Matrix4 提取左上 3×3
  setFromMatrix4(m: Matrix4): this {
    const me = m.elements;
    
    this.set(
      me[0], me[4], me[8],
      me[1], me[5], me[9],
      me[2], me[6], me[10]
    );
    
    return this;
  }
  
  // 法线矩阵 = (ModelMatrix⁻¹)ᵀ 的左上 3×3
  getNormalMatrix(matrix4: Matrix4): this {
    return this.setFromMatrix4(matrix4).invert().transpose();
  }
  
  invert(): this {
    const te = this.elements,
      n11 = te[0], n21 = te[1], n31 = te[2],
      n12 = te[3], n22 = te[4], n32 = te[5],
      n13 = te[6], n23 = te[7], n33 = te[8],
      
      t11 = n33 * n22 - n32 * n23,
      t12 = n32 * n13 - n33 * n12,
      t13 = n23 * n12 - n22 * n13,
      
      det = n11 * t11 + n21 * t12 + n31 * t13;
    
    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
    
    const detInv = 1 / det;
    
    te[0] = t11 * detInv;
    te[1] = (n31 * n23 - n33 * n21) * detInv;
    te[2] = (n32 * n21 - n31 * n22) * detInv;
    
    te[3] = t12 * detInv;
    te[4] = (n33 * n11 - n31 * n13) * detInv;
    te[5] = (n31 * n12 - n32 * n11) * detInv;
    
    te[6] = t13 * detInv;
    te[7] = (n21 * n13 - n23 * n11) * detInv;
    te[8] = (n22 * n11 - n21 * n12) * detInv;
    
    return this;
  }
  
  transpose(): this {
    let tmp;
    const m = this.elements;
    
    tmp = m[1]; m[1] = m[3]; m[3] = tmp;
    tmp = m[2]; m[2] = m[6]; m[6] = tmp;
    tmp = m[5]; m[5] = m[7]; m[7] = tmp;
    
    return this;
  }
}
```

## 静态临时变量

```typescript
const _v1 = new Vector3();
const _m1 = new Matrix4();
const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
```

## 本章小结

- Matrix4 使用列主序存储
- 变换矩阵包括平移、旋转、缩放
- compose/decompose 用于矩阵分解
- 行列式判断矩阵可逆性
- lookAt 构建视图矩阵
- 透视/正交投影矩阵不同

下一章，我们将学习四元数与旋转表示。
