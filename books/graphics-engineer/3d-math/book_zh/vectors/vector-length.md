# 向量的长度与归一化

思考两个问题：

1. 如何计算两点之间的距离？
2. 如何判断一个物体是否在某个范围内（比如敌人是否在攻击范围内）？

答案都需要用到**向量的长度**。

## 向量长度的定义

向量的**长度**（也叫**模**或**大小**）表示向量的大小，几何意义是**从起点到终点的距离**。

用数学符号表示为 $\|\mathbf{v}\|$（读作"v 的模"）。

### 从 2D 勾股定理说起

如果你熟悉 2D 几何，那么一定知道勾股定理：

对于一个直角三角形，如果两条直角边的长度是 a 和 b，那么斜边的长度是：

$$
c = \sqrt{a^2 + b^2}
$$

在 2D 平面中，点 `(x, y)` 到原点的距离就是：

$$
\text{距离} = \sqrt{x^2 + y^2}
$$

这正是勾股定理：把 `(x, y)` 看作一个直角三角形的两条直角边，斜边就是从原点到点的距离。

### 扩展到 3D

在 3D 空间中，只需要再加上 z 轴：

$$
\|\mathbf{v}\| = \sqrt{x^2 + y^2 + z^2}
$$

可以这样理解：
1. 先用 2D 勾股定理算出 xy 平面上的距离：$\sqrt{x^2 + y^2}$
2. 再把这个距离和 z 组成新的直角三角形，算出最终距离：$\sqrt{(\sqrt{x^2 + y^2})^2 + z^2} = \sqrt{x^2 + y^2 + z^2}$

例如，向量 `(3, 4, 0)` 的长度是：

$$
\|(3, 4, 0)\| = \sqrt{3^2 + 4^2 + 0^2} = \sqrt{9 + 16} = 5
$$

向量 `(1, 2, 2)` 的长度是：

$$
\|(1, 2, 2)\| = \sqrt{1^2 + 2^2 + 2^2} = \sqrt{1 + 4 + 4} = 3
$$

## 代码实现：length() 方法

为 `Vector3` 类添加 `length()` 方法：

```javascript
class Vector3 {
  // ... 前面的代码 ...

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}
```

使用示例：

```javascript
const v1 = new Vector3(3, 4, 0);
console.log(v1.length()); // 5

const v2 = new Vector3(1, 2, 2);
console.log(v2.length()); // 3

// 计算两点之间的距离
const pointA = new Vector3(1, 2, 3);
const pointB = new Vector3(4, 6, 8);
const distance = pointB.sub(pointA).length();
console.log(distance); // 7.0710678...
```

## 单位向量与归一化

### 什么是单位向量

**单位向量**是长度为 1 的向量。

为什么需要单位向量？因为在很多场景中，我们只关心**方向**，不关心**大小**。

例如：
- 光线的方向
- 相机的朝向
- 物体的前进方向
- 平面的法向量

这些情况下，向量的长度都统一为 1，只保留方向信息。

### 归一化：获得方向

**归一化（Normalization）** 是将任意向量转换为单位向量的过程。

计算方法：用向量的每个分量除以向量的长度：

$$
\hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|} = \left( \frac{x}{\|\mathbf{v}\|}, \frac{y}{\|\mathbf{v}\|}, \frac{z}{\|\mathbf{v}\|} \right)
$$

符号 $\hat{\mathbf{v}}$ 读作"v hat"，表示 v 的单位向量。

例如，向量 `(3, 4, 0)` 的长度是 5，归一化后是：

$$
\hat{\mathbf{v}} = \left( \frac{3}{5}, \frac{4}{5}, \frac{0}{5} \right) = (0.6, 0.8, 0)
$$

验证：$(0.6)^2 + (0.8)^2 + 0^2 = 0.36 + 0.64 = 1$

### 代码实现：normalize() 方法

```javascript
normalize() {
  const len = this.length();
  if (len === 0) {
    console.warn('Cannot normalize zero vector');
    return this;
  }
  return this.multiplyScalar(1 / len);
}
```

注意这里的**边界情况处理**：

如果向量是零向量 `(0, 0, 0)`，长度是 0，除以 0 会得到 `NaN`（Not a Number）。我们选择：
- 打印警告信息
- 返回原向量（不做归一化）

这是一种常见的防御性编程策略。Three.js 也采用类似的处理方式。

使用示例：

```javascript
const v = new Vector3(3, 4, 0);
console.log(v.length()); // 5

const normalized = v.normalize();
console.log(normalized.toString()); // Vector3(0.6, 0.8, 0)
console.log(normalized.length()); // 1

// 零向量的归一化
const zero = new Vector3(0, 0, 0);
const normalizedZero = zero.normalize();
console.log(normalizedZero.toString()); // Vector3(0, 0, 0) - 警告：无法归一化零向量
```

### 归一化的应用场景

**场景 1：计算光照**

在光照计算中，法向量和光线方向都必须是单位向量：

```javascript
const normal = new Vector3(1, 1, 0).normalize(); // 平面法向量
const lightDir = new Vector3(-1, -1, -1).normalize(); // 光线方向

// 计算漫反射强度（下一章会详细讲解）
const intensity = Math.max(0, normal.dot(lightDir));
```

**场景 2：物体移动方向**

计算从当前位置到目标位置的单位方向向量：

```javascript
const current = new Vector3(0, 0, 0);
const target = new Vector3(10, 0, 5);

// 计算方向向量并归一化
const direction = target.sub(current).normalize();
console.log(direction.toString()); // Vector3(0.894, 0, 0.447)

// 按固定速度移动
const speed = 2; // 单位/秒
const velocity = direction.multiplyScalar(speed);
const newPosition = current.add(velocity);
```

**场景 3：相机朝向**

相机的前方向、上方向都是单位向量：

```javascript
const forward = new Vector3(0, 0, -1); // 相机朝向 -z 方向
const up = new Vector3(0, 1, 0);       // 相机上方向是 +y 方向
```

## 性能优化：平方长度

### 开方运算的性能成本

计算长度需要用 `Math.sqrt()`（平方根），这是一个相对昂贵的运算。

在某些场景中，我们并不需要精确的长度值，只需要**比较长度大小**。这时可以用**平方长度**优化性能。

### lengthSquared() 方法

平方长度是向量长度的平方：

$$
\|\mathbf{v}\|^2 = x^2 + y^2 + z^2
$$

注意：这里没有开方运算。

```javascript
lengthSquared() {
  return this.x * this.x + this.y * this.y + this.z * this.z;
}
```

### 使用场景

**场景 1：比较长度**

如果只需要判断哪个向量更长，不需要计算实际长度：

```javascript
const v1 = new Vector3(3, 4, 0);
const v2 = new Vector3(1, 2, 2);

// 低效写法：计算两次开方
if (v1.length() > v2.length()) {
  console.log('v1 更长');
}

// 高效写法：只计算平方
if (v1.lengthSquared() > v2.lengthSquared()) {
  console.log('v1 更长');
}
```

为什么可以这样做？因为对于正数 a 和 b：

$$
a > b \Leftrightarrow a^2 > b^2
$$

**场景 2：判断是否在范围内**

判断物体是否在某个范围内（如敌人是否在攻击范围内）：

```javascript
const player = new Vector3(0, 0, 0);
const enemy = new Vector3(5, 0, 3);
const attackRange = 10;

// 低效写法
const distance = enemy.sub(player).length();
if (distance < attackRange) {
  console.log('敌人在攻击范围内');
}

// 高效写法
const distanceSquared = enemy.sub(player).lengthSquared();
if (distanceSquared < attackRange * attackRange) {
  console.log('敌人在攻击范围内');
}
```

注意：范围也要平方（`attackRange * attackRange`）。

### 性能提升有多大？

在现代浏览器中，`Math.sqrt()` 已经非常快，但在以下场景中仍然有价值：

- 大量物体的距离计算（如粒子系统）
- 每帧执行的距离检测（如碰撞检测）
- 移动设备上的性能优化

经验法则：**如果不需要精确长度，就用 lengthSquared()**。

## 小结

在本章中，我们学习了：

- **向量长度**：$\|\mathbf{v}\| = \sqrt{x^2 + y^2 + z^2}$（3D 勾股定理）
  - 几何意义：从起点到终点的距离
  - 应用：计算距离、判断范围

- **单位向量**：长度为 1 的向量
  - 只保留方向信息
  - 用于光照、运动方向、相机朝向等

- **归一化**：$\hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|}$
  - 将向量转换为单位向量
  - 注意处理零向量的边界情况

- **平方长度**：$\|\mathbf{v}\|^2 = x^2 + y^2 + z^2$
  - 避免开方运算，提升性能
  - 适用于长度比较和范围检测

单位向量在点积和叉积中扮演重要角色，下一章我们将深入学习这两种核心运算。

---

**练习**：

1. 计算向量 `(6, 8, 0)` 的长度
2. 将向量 `(3, 0, 4)` 归一化
3. 判断点 `(7, 0, 0)` 是否在原点半径 10 的范围内（用 `lengthSquared()` 实现）
4. 实现一个 `distance(v)` 方法，计算当前向量到向量 v 的距离

尝试在浏览器控制台中完成这些练习。
