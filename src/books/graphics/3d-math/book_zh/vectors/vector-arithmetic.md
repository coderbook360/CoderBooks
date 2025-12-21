# 向量的加减与数乘

思考一个问题：如果一个物体先向右移动 3 个单位，再向上移动 2 个单位，最终的位移是多少？

在 2D 中，你可能会这样计算：

```javascript
const totalX = 3;
const totalY = 2;
```

但如果是在 3D 空间，物体的运动轨迹可能是这样的：

1. 先沿向量 `(3, 0, 0)` 移动
2. 再沿向量 `(0, 2, 1)` 移动
3. 最终位移是多少？

答案是向量相加：`(3, 0, 0) + (0, 2, 1) = (3, 2, 1)`。

这就是**向量加法**。

## 向量加法

### 几何意义：位移叠加

向量加法的几何意义是**首尾相接**：

想象两个向量：
- 向量 $\mathbf{a} = (1, 2, 0)$
- 向量 $\mathbf{b} = (2, 1, 0)$

要计算 $\mathbf{a} + \mathbf{b}$：

1. 先画出向量 $\mathbf{a}$（从原点指向 (1, 2, 0)）
2. 再从 $\mathbf{a}$ 的终点画出向量 $\mathbf{b}$（相对位移 (2, 1, 0)）
3. 结果向量是从原点指向最终位置的向量

```
原点 (0,0,0) 
   --a--> (1,2,0) 
         --b--> (3,3,0)
```

最终位置是 `(1+2, 2+1, 0+0) = (3, 3, 0)`，这就是 $\mathbf{a} + \mathbf{b}$。

这个过程也可以用**平行四边形法则**理解：把两个向量的起点重合，以它们为邻边画一个平行四边形，对角线就是结果向量。

### 计算规则：逐分量相加

向量加法非常简单：**对应分量相加**。

$$
\mathbf{a} + \mathbf{b} = (a_x + b_x, a_y + b_y, a_z + b_z)
$$

例如：

$$
(1, 2, 3) + (4, 5, 6) = (5, 7, 9)
$$

### 代码实现

现在让我们为 `Vector3` 类添加 `add` 方法：

```javascript
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(v) {
    return new Vector3(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z
    );
  }

  toString() {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }
}
```

注意这里的设计决策：**返回一个新的 `Vector3` 对象，而不是修改当前对象**。

这种设计称为**不可变（Immutable）**设计，好处是：
- 避免意外修改原向量
- 更容易调试（原向量保持不变）
- 支持函数式编程风格

使用示例：

```javascript
const a = new Vector3(1, 2, 3);
const b = new Vector3(4, 5, 6);
const c = a.add(b);

console.log(c.toString()); // Vector3(5, 7, 9)
console.log(a.toString()); // Vector3(1, 2, 3) - 原向量未改变
```

### 交换律和结合律

向量加法满足**交换律**和**结合律**：

$$
\mathbf{a} + \mathbf{b} = \mathbf{b} + \mathbf{a}
$$

$$
(\mathbf{a} + \mathbf{b}) + \mathbf{c} = \mathbf{a} + (\mathbf{b} + \mathbf{c})
$$

这意味着：
- 顺序不影响结果：`a.add(b)` 和 `b.add(a)` 结果相同
- 可以连续相加：`a.add(b).add(c)` 的结果确定

## 向量减法

### 几何意义：计算方向

向量减法的几何意义是什么？

关键问题：**如何计算从点 A 到点 B 的方向向量？**

答案是：$\mathbf{B} - \mathbf{A}$

$$
\mathbf{v} = \mathbf{B} - \mathbf{A}
$$

例如：
- 点 A 在 `(1, 2, 3)`
- 点 B 在 `(4, 6, 8)`
- 从 A 到 B 的方向向量是 `(4-1, 6-2, 8-3) = (3, 4, 5)`

你可以这样理解：$\mathbf{B} - \mathbf{A}$ 回答的是"从 A 走到 B 需要移动多少"。

用数学表达式验证：

$$
\mathbf{A} + (\mathbf{B} - \mathbf{A}) = \mathbf{B}
$$

这个公式说明：从 A 出发，沿 $\mathbf{B} - \mathbf{A}$ 方向移动，就能到达 B。

### 计算规则：逐分量相减

向量减法同样是**对应分量相减**：

$$
\mathbf{a} - \mathbf{b} = (a_x - b_x, a_y - b_y, a_z - b_z)
$$

### 代码实现

为 `Vector3` 类添加 `sub` 方法：

```javascript
sub(v) {
  return new Vector3(
    this.x - v.x,
    this.y - v.y,
    this.z - v.z
  );
}
```

使用示例：

```javascript
const target = new Vector3(10, 5, 0);
const current = new Vector3(3, 2, 0);

// 计算从 current 指向 target 的方向向量
const direction = target.sub(current);
console.log(direction.toString()); // Vector3(7, 3, 0)

// 验证：current + direction = target
const result = current.add(direction);
console.log(result.toString()); // Vector3(10, 5, 0)
```

### 负向量

向量减法还可以用来创建**负向量**。

零向量减去任意向量 $\mathbf{v}$，结果是 $-\mathbf{v}$（方向相反，长度相同）：

$$
-\mathbf{v} = (0, 0, 0) - (x, y, z) = (-x, -y, -z)
$$

例如：

```javascript
const v = new Vector3(1, 2, 3);
const zero = new Vector3(0, 0, 0);
const negV = zero.sub(v);
console.log(negV.toString()); // Vector3(-1, -2, -3)
```

负向量在物理模拟中很有用，例如计算反作用力、反弹方向等。

## 向量数乘

### 几何意义：缩放和反向

向量数乘（也叫**标量乘法**）是指用一个数字（标量）乘以向量。

几何意义：**方向不变，长度变为原来的 k 倍**。

$$
k \cdot \mathbf{v} = (k \cdot x, k \cdot y, k \cdot z)
$$

例如：

$$
2 \cdot (1, 2, 3) = (2, 4, 6)
$$

长度变为原来的 2 倍，但方向不变（仍然指向 (1, 2, 3) 的方向）。

### 特殊情况

**情况 1：k = 0**

$$
0 \cdot \mathbf{v} = (0, 0, 0)
$$

结果是零向量，没有方向。

**情况 2：k = 1**

$$
1 \cdot \mathbf{v} = \mathbf{v}
$$

向量不变。

**情况 3：k = -1**

$$
-1 \cdot \mathbf{v} = (-x, -y, -z)
$$

方向反转，长度不变。这就是负向量。

**情况 4：0 < k < 1**

$$
0.5 \cdot (4, 6, 8) = (2, 3, 4)
$$

长度缩小，方向不变。

**情况 5：k < 0**

$$
-2 \cdot (1, 2, 3) = (-2, -4, -6)
$$

方向反转，长度变为原来的 |k| 倍。

### 代码实现

为 `Vector3` 类添加 `multiplyScalar` 方法：

```javascript
multiplyScalar(k) {
  return new Vector3(
    this.x * k,
    this.y * k,
    this.z * k
  );
}
```

使用示例：

```javascript
const v = new Vector3(1, 2, 3);

const doubled = v.multiplyScalar(2);
console.log(doubled.toString()); // Vector3(2, 4, 6)

const halved = v.multiplyScalar(0.5);
console.log(halved.toString()); // Vector3(0.5, 1, 1.5)

const negated = v.multiplyScalar(-1);
console.log(negated.toString()); // Vector3(-1, -2, -3)
```

## 综合应用：简单的物理模拟

现在让我们用向量运算实现一个简单的物理模拟：一个物体在重力作用下的运动。

```javascript
class GameObject {
  constructor(position, velocity) {
    this.position = position; // 位置向量
    this.velocity = velocity; // 速度向量
  }

  update(deltaTime) {
    // 重力加速度（向下）
    const gravity = new Vector3(0, -9.8, 0);
    
    // 速度变化：v = v + a * t
    this.velocity = this.velocity.add(gravity.multiplyScalar(deltaTime));
    
    // 位置变化：p = p + v * t
    this.position = this.position.add(this.velocity.multiplyScalar(deltaTime));
  }
}

// 创建一个物体，初始位置 (0, 10, 0)，初始速度 (5, 0, 0)
const obj = new GameObject(
  new Vector3(0, 10, 0),
  new Vector3(5, 0, 0)
);

// 模拟 0.1 秒
obj.update(0.1);
console.log(obj.position.toString()); // 物体下落了一点
console.log(obj.velocity.toString()); // 速度变化了
```

这个例子展示了向量运算的实际价值：
- **加法**：叠加位移和速度
- **数乘**：应用时间步长和重力系数
- **组合使用**：实现复杂的物理效果

## 设计考虑：不可变 vs 可变

在上面的实现中，我们选择了**不可变**设计（返回新对象）。但 Three.js 采用了**可变**设计（修改自身）：

```javascript
// Three.js 风格（可变）
add(v) {
  this.x += v.x;
  this.y += v.y;
  this.z += v.z;
  return this; // 返回 this 支持链式调用
}
```

两种设计各有优劣：

| 设计方式 | 优点 | 缺点 |
|---------|------|------|
| 不可变 | 安全，易调试 | 频繁创建对象，性能稍差 |
| 可变 | 性能好，内存占用少 | 容易出错，需小心使用 |

在实际项目中，**可变设计更常见**，因为 3D 图形学对性能要求很高，频繁创建对象会带来 GC（垃圾回收）压力。

在后续章节中，我们将采用 Three.js 的可变设计，以更接近实际工程实践。

## 小结

在本章中，我们学习了三种基本的向量运算：

- **向量加法**：位移叠加，对应分量相加
  - 几何意义：首尾相接
  - 应用：叠加多个位移、合成速度

- **向量减法**：计算方向，对应分量相减
  - 几何意义：从一个点指向另一个点
  - 应用：计算方向向量、求距离

- **向量数乘**：缩放，每个分量乘以标量
  - 几何意义：长度变化，方向不变
  - 应用：应用比例、创建负向量、时间步长

这三种运算是所有复杂变换的基础。有了加减和数乘，我们还需要知道向量的长度，这将在下一章介绍。

---

**练习**：

1. 计算 `(1, 2, 3) + (4, 5, 6)` 的结果
2. 计算从点 `(2, 5, 1)` 到点 `(7, 8, 4)` 的方向向量
3. 将向量 `(3, 4, 0)` 的长度缩小到原来的一半（提示：使用数乘）
4. 实现一个 `negate()` 方法，返回负向量（提示：使用 `multiplyScalar(-1)`）

尝试在浏览器控制台中完成这些练习。
