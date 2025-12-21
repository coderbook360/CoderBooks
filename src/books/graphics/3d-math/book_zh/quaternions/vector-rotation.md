# 四元数与向量旋转

四元数最重要的应用：旋转3D向量。

## 基本公式

用四元数 $\mathbf{q}$ 旋转向量 $\mathbf{v}$：

$$
\mathbf{v}' = \mathbf{q} \times \mathbf{v} \times \mathbf{q}^*
$$

其中：
- $\mathbf{v}$ 转换为纯四元数：$[0, \mathbf{v}]$
- $\mathbf{q}^*$ 是 $\mathbf{q}$ 的共轭

## 代码实现

```javascript
class Quaternion {
  // 旋转向量
  rotateVector(v) {
    // 将向量转为纯四元数 [0, v]
    const vQuat = new Quaternion(0, v.x, v.y, v.z);
    
    // q * v * q^*
    const result = this.multiply(vQuat).multiply(this.conjugate());
    
    // 提取虚部（结果是纯四元数）
    return new Vector3(result.x, result.y, result.z);
  }
}

// 示例：绕Y轴旋转90度
const q = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
const v = new Vector3(1, 0, 0);
const rotated = q.rotateVector(v);
console.log(rotated.toString());  // 约 Vector3(0, 0, -1)
```

## 优化实现

上述方法需要两次四元数乘法（8次叉乘 + 24次乘法），可以优化：

```javascript
class Quaternion {
  rotateVectorOptimized(v) {
    // t = 2 * (q.xyz × v)
    const qVec = new Vector3(this.x, this.y, this.z);
    const t = qVec.cross(v).multiplyScalar(2);
    
    // v' = v + q.w * t + (q.xyz × t)
    return v
      .add(t.multiplyScalar(this.w))
      .add(qVec.cross(t));
  }
}
```

**性能对比**：
- 原始方法：2次四元数乘法
- 优化方法：2次向量叉乘 + 若干向量加法
- **提升**：约2-3倍性能提升

## 数学推导（简化）

设 $\mathbf{q} = [w, \mathbf{u}]$，$\mathbf{v}$ 是待旋转向量。

展开 $\mathbf{q} \times [0, \mathbf{v}] \times \mathbf{q}^*$：

$$
\mathbf{v}' = \mathbf{v} + 2w(\mathbf{u} \times \mathbf{v}) + 2\mathbf{u} \times (\mathbf{u} \times \mathbf{v})
$$

利用向量三重叉乘恒等式进一步简化。

## 验证正确性

```javascript
// 测试：绕Z轴旋转90度
const q = Quaternion.fromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);

const v1 = new Vector3(1, 0, 0);
const r1 = q.rotateVector(v1);
console.log(r1.toString());  // 应该是 (0, 1, 0)

const v2 = new Vector3(0, 1, 0);
const r2 = q.rotateVector(v2);
console.log(r2.toString());  // 应该是 (-1, 0, 0)

// 验证旋转后长度不变
console.log('Original length:', v1.length());
console.log('Rotated length:', r1.length());
```

## 连续旋转

多次旋转：先组合四元数，再旋转向量

```javascript
// 方法1：逐次旋转（慢）
let v = new Vector3(1, 0, 0);
v = q1.rotateVector(v);
v = q2.rotateVector(v);
v = q3.rotateVector(v);

// 方法2：先组合（快）
const qCombined = q3.multiply(q2).multiply(q1);
const v = qCombined.rotateVector(new Vector3(1, 0, 0));
```

**优化建议**：如果对同一四元数旋转多个向量，先组合四元数。

## 反向旋转

使用四元数的逆（或共轭）：

```javascript
// 正向旋转
const rotated = q.rotateVector(v);

// 反向旋转
const original = q.conjugate().rotateVector(rotated);

// 验证
console.log('Original:', v.toString());
console.log('Recovered:', original.toString());  // 应该相同
```

## 应用：旋转法向量

法向量是方向，旋转逻辑相同：

```javascript
class Transform {
  constructor() {
    this.rotation = new Quaternion();
  }
  
  rotateNormal(normal) {
    return this.rotation.rotateVector(normal).normalize();
  }
}
```

## 小结

- **旋转公式**：$\mathbf{v}' = \mathbf{q} \times \mathbf{v} \times \mathbf{q}^*$
- **优化实现**：使用向量叉乘代替四元数乘法
- **连续旋转**：先组合四元数，再旋转向量
- **反向旋转**：使用共轭四元数
- **性能**：优化后比矩阵旋转更快
