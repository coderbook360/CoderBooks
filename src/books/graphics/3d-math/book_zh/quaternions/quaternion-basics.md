# 四元数基础理论

四元数（Quaternion）是3D旋转的最佳表示方式，解决了欧拉角的万向节死锁问题。

## 什么是四元数？

四元数是一种扩展的复数，由一个实部和三个虚部组成：

$$
\mathbf{q} = w + xi + yj + zk
$$

其中：
- $w$ 是实部（scalar）
- $(x, y, z)$ 是虚部（vector）

通常写成：

$$
\mathbf{q} = [w, (x, y, z)] = [w, \mathbf{v}]
$$

## 虚数单位规则

四元数的虚数单位满足：

$$
i^2 = j^2 = k^2 = ijk = -1
$$

乘法规则（非交换）：

$$
ij = k, \quad ji = -k
$$
$$
jk = i, \quad kj = -i
$$
$$
ki = j, \quad ik = -j
$$

**记忆技巧**：按照循环顺序 $i \rightarrow j \rightarrow k$ 是正，逆序是负。

## 单位四元数与旋转

**关键事实**：单位四元数（长度为1）可以表示3D旋转。

绕轴 $\mathbf{axis}$ 旋转角度 $\theta$ 的四元数：

$$
\mathbf{q} = \left[ \cos\left(\frac{\theta}{2}\right), \sin\left(\frac{\theta}{2}\right) \cdot \mathbf{axis} \right]
$$

注意：角度要**除以2**！

## 代码实现

```javascript
class Quaternion {
  constructor(w = 1, x = 0, y = 0, z = 0) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  // 从轴角创建
  static fromAxisAngle(axis, angle) {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return new Quaternion(
      Math.cos(halfAngle),
      axis.x * s,
      axis.y * s,
      axis.z * s
    );
  }
  
  // 长度（模）
  length() {
    return Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
  }
  
  // 归一化
  normalize() {
    const len = this.length();
    if (len === 0) return new Quaternion();
    return new Quaternion(
      this.w / len,
      this.x / len,
      this.y / len,
      this.z / len
    );
  }
  
  toString() {
    return `Quat(${this.w.toFixed(3)}, ${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
  }
}

// 示例：绕Y轴旋转90度
const axis = new Vector3(0, 1, 0);
const angle = Math.PI / 2;
const q = Quaternion.fromAxisAngle(axis, angle);
console.log(q.toString());  // Quat(0.707, 0, 0.707, 0)
```

## 为什么角度除以2？

这是四元数的数学性质。旋转 $\theta$ 角度，四元数参数是 $\frac{\theta}{2}$。

**后果**：
- 旋转360度：$\mathbf{q} = [\cos(180°), 0] = [-1, 0]$
- 旋转720度：$\mathbf{q} = [\cos(360°), 0] = [1, 0]$

这意味着四元数有**双重覆盖**（double cover）：$\mathbf{q}$ 和 $-\mathbf{q}$ 表示相同旋转。

## 特殊四元数

### 单位四元数（无旋转）

$$
\mathbf{q}_{identity} = [1, (0, 0, 0)]
$$

```javascript
const identity = new Quaternion(1, 0, 0, 0);
```

### 绕轴旋转90度

- **绕X轴**：$\mathbf{q}_x = [\cos(45°), \sin(45°), 0, 0] = [0.707, 0.707, 0, 0]$
- **绕Y轴**：$\mathbf{q}_y = [0.707, 0, 0.707, 0]$
- **绕Z轴**：$\mathbf{q}_z = [0.707, 0, 0, 0.707]$

## 四元数 vs 其他旋转表示

| 表示方式 | 存储空间 | 万向节死锁 | 插值平滑 | 组合效率 |
|----------|----------|------------|----------|----------|
| 欧拉角 | 3个数字 | 有 | 差 | 差 |
| 旋转矩阵 | 9个数字 | 无 | 差 | 中 |
| 轴角 | 4个数字 | 无 | 中 | 差 |
| 四元数 | 4个数字 | 无 | 优秀（Slerp） | 优秀 |

## 小结

- **四元数**：$\mathbf{q} = [w, (x, y, z)]$，4个数字表示旋转
- **单位四元数**：长度为1，表示3D旋转
- **从轴角创建**：$\mathbf{q} = [\cos(\frac{\theta}{2}), \sin(\frac{\theta}{2}) \cdot \mathbf{axis}]$
- **双重覆盖**：$\mathbf{q}$ 和 $-\mathbf{q}$ 是同一旋转
- **优势**：无万向节死锁，插值平滑，组合高效
