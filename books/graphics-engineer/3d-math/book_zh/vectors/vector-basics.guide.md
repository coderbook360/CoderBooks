# 第1章：向量的概念与表示 - 写作指导

**章节**: 第1章 向量的概念与表示  
**文件**: `vector-basics.md`  
**预计字数**: 3000-3500  
**难度级别**: ⭐ 基础

---

## 一、学习目标

完成本章学习后，读者应该能够：

1. **理解向量的本质**：明白向量是"有方向的量"，区别于标量
2. **掌握向量的表示方法**：数学记号、坐标形式、JavaScript对象
3. **实现 Vector3 类**：用ES6 class创建基础的3D向量类
4. **可视化向量**：在2D/3D空间中绘制向量
5. **理解向量的应用场景**：知道在3D图形学中哪些地方用到向量

**核心能力**：
- 理论理解：能用自己的话解释什么是向量
- 代码实现：能从零实现一个 Vector3 类
- 实际应用：能用向量表示位置、方向、速度等

---

## 二、前置知识

### 必须掌握
- **JavaScript ES6 基础** - class语法、构造函数
- **基本几何知识** - 坐标系、平面直角坐标系
- **初中数学** - 有向线段的概念

### 建议了解
- **Canvas 2D** - 如果学过Book 1，理解会更快（但非必需）
- **2D向量** - 便于从2D扩展到3D

**知识检查点**：
- [ ] 理解什么是坐标系（X轴、Y轴、Z轴）
- [ ] 知道如何用坐标表示一个点 (x, y, z)
- [ ] 会使用 JavaScript class 创建对象

---

## 三、核心概念

### 主要概念

1. **向量 (Vector)**
   - 定义：既有大小又有方向的量
   - 重要性：3D图形学的基础，表示位置、方向、速度、力等
   - 应用：物体位置、相机方向、光照方向、物理模拟

2. **向量的表示**
   - 定义：用坐标形式 (x, y, z) 或箭头图形表示
   - 重要性：连接数学概念和代码实现的桥梁
   - 应用：在代码中存储和操作向量数据

3. **向量 vs 点**
   - 定义：点是位置，向量是位移或方向
   - 重要性：理解两者区别能避免概念混淆
   - 应用：在不同场景中选择正确的表示方法

### 关键术语
- **向量 (Vector)**: 有方向的量 - Vector
- **标量 (Scalar)**: 只有大小没有方向的量 - Scalar  
- **分量 (Component)**: 向量在各坐标轴上的投影值 - Component
- **起点和终点**: 向量箭头的起始位置和结束位置 - Origin & End Point

---

## 四、章节大纲

### 建议结构

```markdown
# 1. 向量的概念与表示

## 为什么需要学习向量？

### 向量在3D图形学中无处不在
- **位置表示**: 物体在3D空间的位置就是一个从原点出发的向量
- **方向表示**: 相机朝向、光照方向都用向量表示
- **运动描述**: 速度、加速度都是向量
- **变换计算**: 平移、旋转等变换都基于向量运算

### 在 Three.js 中的应用
```javascript
// 创建一个立方体并设置位置
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

// 位置就是一个向量！
cube.position.set(2, 3, 4); // Vector3(2, 3, 4)

// 相机朝向也是向量
camera.lookAt(0, 0, 0); // 看向原点，方向是个向量
```

---

## 从2D到3D：什么是向量？

### 先回顾2D向量

[2D坐标系图示]
- X轴向右，Y轴向上
- 一个向量 v = (3, 2)
- 用箭头表示：从原点(0,0)指向点(3,2)

**关键理解**：向量不是一个点，而是一个"位移"或"方向"

### 扩展到3D向量

[3D坐标系图示]
- X轴向右（红色）
- Y轴向上（绿色）
- Z轴向前/向观察者（蓝色）
- 右手坐标系规则

**3D向量示例**：
- v = (2, 3, 1)
- 表示：从原点出发，沿X轴移动2，沿Y轴移动3，沿Z轴移动1

---

## 向量的数学表示

### 几何表示（箭头）
[可视化图示：显示多个不同的向量箭头]
- 向量用带箭头的线段表示
- 箭头长度表示大小
- 箭头方向表示方向

### 代数表示（坐标）

**列向量形式**（数学常用）：
$$
\vec{v} = \begin{bmatrix} x \\ y \\ z \end{bmatrix}
$$

**坐标形式**（编程常用）：
$$
\vec{v} = (x, y, z)
$$

**分量表示**：
$$
\vec{v} = x\vec{i} + y\vec{j} + z\vec{k}
$$
其中 $\vec{i}, \vec{j}, \vec{k}$ 是 X, Y, Z 轴的单位向量

### JavaScript 表示

```javascript
// 方法1: 对象字面量
const v1 = { x: 2, y: 3, z: 1 };

// 方法2: 数组
const v2 = [2, 3, 1];

// 方法3: 类实例（推荐）
const v3 = new Vector3(2, 3, 1);
```

---

## 代码实现：Vector3 类

### 基础实现

```javascript
/**
 * 三维向量类
 * 用于表示3D空间中的向量或点
 */
class Vector3 {
  /**
   * 构造函数
   * @param {number} x - X分量，默认为0
   * @param {number} y - Y分量，默认为0
   * @param {number} z - Z分量，默认为0
   */
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * 设置向量的值
   * @param {number} x - X分量
   * @param {number} y - Y分量
   * @param {number} z - Z分量
   * @returns {Vector3} 返回this以支持链式调用
   */
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * 克隆向量
   * @returns {Vector3} 新的Vector3实例
   */
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * 从另一个向量复制值
   * @param {Vector3} v - 源向量
   * @returns {Vector3} 返回this
   */
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  /**
   * 转换为字符串
   * @returns {string}
   */
  toString() {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }

  /**
   * 转换为数组
   * @returns {Array<number>}
   */
  toArray() {
    return [this.x, this.y, this.z];
  }
}
```

### 测试代码

```javascript
// 创建向量
const v1 = new Vector3();
console.log(v1.toString()); // Vector3(0, 0, 0)

const v2 = new Vector3(1, 2, 3);
console.log(v2.toString()); // Vector3(1, 2, 3)

// 设置值
v1.set(5, 6, 7);
console.log(v1.toString()); // Vector3(5, 6, 7)

// 克隆
const v3 = v2.clone();
console.log(v3.toString()); // Vector3(1, 2, 3)
console.log(v3 === v2);     // false（不同对象）

// 复制
v1.copy(v2);
console.log(v1.toString()); // Vector3(1, 2, 3)

// 转换为数组
console.log(v2.toArray());  // [1, 2, 3]
```

### 与 Three.js 对比

```javascript
import { Vector3 } from 'three';

// Three.js 的使用方式几乎相同
const v = new THREE.Vector3(1, 2, 3);
v.set(4, 5, 6);
const cloned = v.clone();

// API设计理念：
// 1. 构造函数参数默认为0
// 2. 大部分方法返回this支持链式调用
// 3. 提供clone和copy区分"创建新对象"和"修改现有对象"
```

**设计思想对比**：
- ✅ 默认参数避免undefined
- ✅ 链式调用提高代码可读性
- ✅ clone vs copy：前者创建新对象，后者修改自身
- ✅ 提供toString方便调试

---

## 向量 vs 点：重要的概念区分

### 数学上的区别

**点 (Point)**：
- 表示位置
- 在空间中的一个确定位置
- 示例：立方体的顶点位置 (1, 1, 1)

**向量 (Vector)**：
- 表示方向和大小
- 从一个点到另一个点的位移
- 示例：从点A(0,0,0)到点B(1,1,1)的向量是 (1,1,1)

### 实际使用中

虽然在代码中都用 `Vector3` 表示，但语义不同：

```javascript
// 当作点：表示位置
cube.position = new Vector3(2, 3, 1);

// 当作向量：表示方向
camera.up = new Vector3(0, 1, 0); // Y轴正方向

// 当作向量：表示速度（每秒移动多少）
velocity = new Vector3(1, 0, 0); // 向右移动
```

**关键理解**：
- 两个点可以相减得到向量：$\vec{AB} = B - A$
- 点加向量得到新的点：$B = A + \vec{v}$
- 向量加向量得到向量：$\vec{c} = \vec{a} + \vec{b}$

---

## 实际应用

### 示例1：表示物体位置

```javascript
// 场景：在3D空间中放置多个立方体

class Cube {
  constructor(position) {
    this.position = position; // Vector3
  }

  move(offset) {
    // offset是一个位移向量
    this.position.x += offset.x;
    this.position.y += offset.y;
    this.position.z += offset.z;
  }
}

// 创建立方体
const cube1 = new Cube(new Vector3(0, 0, 0));
const cube2 = new Cube(new Vector3(2, 0, 0));
const cube3 = new Vector3(0, 3, 0));

// 移动立方体
cube1.move(new Vector3(1, 0, 0)); // 向右移动1个单位
console.log(cube1.position); // Vector3(1, 0, 0)
```

[可视化演示：显示3个立方体在不同位置，移动其中一个]

### 示例2：表示相机方向

```javascript
// 场景：简单的相机系统

class Camera {
  constructor() {
    this.position = new Vector3(0, 0, 5);  // 相机位置（点）
    this.target = new Vector3(0, 0, 0);    // 看向的目标（点）
  }

  getDirection() {
    // 方向 = 目标 - 位置（后续章节会详细讲解）
    return new Vector3(
      this.target.x - this.position.x,
      this.target.y - this.position.y,
      this.target.z - this.position.z
    );
  }
}

const camera = new Camera();
const dir = camera.getDirection();
console.log(dir); // Vector3(0, 0, -5) 指向Z轴负方向
```

[可视化演示：显示相机位置、目标点、方向向量]

---

## 常见陷阱

### ⚠️ 陷阱1：混淆向量和点
```javascript
// ❌ 错误：将两个位置相加没有意义
const pos1 = new Vector3(1, 2, 3);
const pos2 = new Vector3(4, 5, 6);
const result = pos1.add(pos2); // 什么含义？不清晰

// ✅ 正确：点加向量（位移）
const position = new Vector3(1, 2, 3);  // 当前位置
const velocity = new Vector3(1, 0, 0);  // 速度向量
const newPosition = position.add(velocity); // 新位置
```

### ⚠️ 陷阱2：直接修改 vs 创建新对象
```javascript
// ❌ 可能出错：意外修改原对象
const v1 = new Vector3(1, 2, 3);
const v2 = v1; // v2和v1指向同一个对象
v2.set(4, 5, 6);
console.log(v1); // Vector3(4, 5, 6) - v1也被修改了！

// ✅ 正确：使用clone创建独立的副本
const v1 = new Vector3(1, 2, 3);
const v2 = v1.clone(); // 创建新对象
v2.set(4, 5, 6);
console.log(v1); // Vector3(1, 2, 3) - v1不受影响
```

### ⚠️ 陷阱3：忘记设置默认值
```javascript
// ❌ 不好：没有默认值
class Vector3 {
  constructor(x, y, z) {
    this.x = x; // 如果不传参数，x是undefined
    this.y = y;
    this.z = z;
  }
}

// ✅ 好：有默认值
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; // 不传参数时默认为0
    this.y = y;
    this.z = z;
  }
}
```

---

## 可视化工具

### 2D 向量可视化（便于理解）

[Canvas 2D代码示例：绘制多个向量]

```javascript
// 在Canvas上绘制向量
function drawVector(ctx, v, color = 'blue') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  // 绘制箭头主体
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(v.x * 20, -v.y * 20); // 缩放以便显示，Y轴翻转
  ctx.stroke();

  // 绘制箭头头部（简化版）
  const angle = Math.atan2(-v.y, v.x);
  const headLen = 10;
  ctx.beginPath();
  ctx.moveTo(v.x * 20, -v.y * 20);
  ctx.lineTo(
    v.x * 20 - headLen * Math.cos(angle - Math.PI / 6),
    -v.y * 20 + headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(v.x * 20, -v.y * 20);
  ctx.lineTo(
    v.x * 20 - headLen * Math.cos(angle + Math.PI / 6),
    -v.y * 20 + headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();

  ctx.restore();
}
```

### 3D 向量可视化

[Three.js代码示例：用ArrowHelper绘制向量]

```javascript
import * as THREE from 'three';

// 创建场景、相机、渲染器...

// 绘制向量
function createVectorHelper(vector, color = 0x0000ff) {
  const origin = new THREE.Vector3(0, 0, 0);
  const length = vector.length();
  const direction = vector.clone().normalize();
  
  const arrowHelper = new THREE.ArrowHelper(
    direction,
    origin,
    length,
    color,
    length * 0.2,  // 箭头长度
    length * 0.1   // 箭头宽度
  );
  
  return arrowHelper;
}

// 使用
const v1 = new THREE.Vector3(2, 3, 1);
const arrow = createVectorHelper(v1, 0x00ff00);
scene.add(arrow);
```

---

## 进一步学习

### 相关章节
- **第2章：向量的加减与数乘** - 学习向量的基本运算
- **第3章：向量的长度与归一化** - 理解向量的大小
- **第4章：点积与叉积** - 掌握向量的高级运算

### 外部资源
- 📺 [3Blue1Brown - 向量](https://www.youtube.com/watch?v=fNk_zzaMoSs) - 优秀的可视化讲解
- 📚 [Immersive Linear Algebra](http://immersivemath.com/ila/ch02_vectors/ch02.html) - 交互式教程

### 扩展话题
- **向量空间** - 高级数学概念，本书不深入
- **齐次坐标** - 第11章会详细讲解
- **向量的物理意义** - 在物理模拟中的应用

---

## 本章小结

- ✅ **向量是有方向的量**，用于表示位置、方向、速度等
- ✅ **向量用坐标表示**：3D向量有三个分量 (x, y, z)
- ✅ **Vector3类**：用ES6 class实现，包含基本属性和方法
- ✅ **向量vs点**：点是位置，向量是位移/方向，但在代码中用相同结构表示
- ✅ **可视化重要**：用箭头表示向量，帮助理解几何意义

**核心代码**：
```javascript
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
}
```

---

## 练习题

### 基础练习

1. **概念理解**：用自己的话解释向量和点的区别。

2. **手动计算**：如果点A的坐标是(1, 2, 3)，点B的坐标是(4, 6, 8)，从A到B的向量是什么？

3. **代码实现**：为Vector3类添加一个 `equals(v)` 方法，判断两个向量是否相等（三个分量都相等）。

4. **调试练习**：以下代码有什么问题？如何修复？
```javascript
const v1 = new Vector3(1, 2, 3);
const v2 = v1;
v2.x = 10;
console.log(v1.x); // 期望输出1，实际输出？
```

### 进阶练习

1. **API扩展**：为Vector3类添加以下方法：
   - `setX(x)`, `setY(y)`, `setZ(z)` - 单独设置某个分量
   - `setScalar(s)` - 将三个分量都设置为同一个值
   - `fromArray(arr, offset = 0)` - 从数组中读取值

2. **可视化实现**：使用Canvas 2D绘制几个2D向量，要求：
   - 从原点出发
   - 不同颜色表示不同向量
   - 标注坐标值

3. **实际应用**：实现一个简单的粒子系统，每个粒子有位置和速度（都是Vector3），每帧更新位置。

### 参考答案
答案和详细解释见：[练习题答案](./vector-basics-answers.md)

---

**创建日期**: 2025-12-16  
**最后更新**: 2025-12-16  
**状态**: ✅ 已完成
