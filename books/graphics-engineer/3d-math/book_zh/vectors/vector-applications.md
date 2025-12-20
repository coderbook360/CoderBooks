# 向量在图形学中的应用

前面我们学习了向量的基础运算：加减、数乘、长度、点积、叉积。现在让我们看看这些运算在实际 3D 图形学中的应用。

这一章将展示三个核心应用场景：
1. **光照计算** - 如何用向量计算物体表面的明暗
2. **运动模拟** - 如何用向量表示物体的位置和运动
3. **几何判断** - 如何用向量判断点与平面的关系

## 应用一：光照计算

### Lambert 漫反射模型

想象一个场景：一个平面在阳光下，哪些部分会更亮？

答案是：**垂直于光线方向的部分最亮，平行于光线方向的部分最暗**。

这就是 **Lambert 漫反射模型**，它是 3D 图形学中最基础的光照模型。

### 数学原理

Lambert 模型的核心公式：

$$
I = I_0 \cdot \max(0, \mathbf{N} \cdot \mathbf{L})
$$

其中：
- $I$ 是最终光照强度
- $I_0$ 是光源强度
- $\mathbf{N}$ 是表面**法向量**（垂直于表面的单位向量）
- $\mathbf{L}$ 是**光线方向**（从表面指向光源的单位向量）
- $\mathbf{N} \cdot \mathbf{L}$ 是点积

为什么用点积？回顾第4章：

$$
\mathbf{N} \cdot \mathbf{L} = \|\mathbf{N}\| \cdot \|\mathbf{L}\| \cdot \cos\theta = \cos\theta
$$

（因为 $\mathbf{N}$ 和 $\mathbf{L}$ 都是单位向量，长度为 1）

余弦值的含义：
- $\cos(0°) = 1$：光线垂直照射，最亮
- $\cos(60°) = 0.5$：光线斜照，亮度减半
- $\cos(90°) = 0$：光线平行于表面，无光照
- $\cos(120°) = -0.5$：光线从背面照射，无光照（用 `max(0, ...)` 截断）

### 代码实现

```javascript
function calculateDiffuse(normal, lightDir, lightIntensity) {
  // 确保法向量和光照方向都是单位向量
  const N = normal.normalize();
  const L = lightDir.normalize();
  
  // 计算点积
  const nDotL = N.dot(L);
  
  // 截断负值（背面光照）
  const diffuse = Math.max(0, nDotL);
  
  return diffuse * lightIntensity;
}

// 使用示例
const surfaceNormal = new Vector3(0, 1, 0); // 平面朝上
const lightDirection = new Vector3(0, 1, 0); // 光从上方照下来
const intensity = 1.0;

const brightness = calculateDiffuse(surfaceNormal, lightDirection, intensity);
console.log(brightness); // 1.0 - 最亮

// 斜照
const slantLight = new Vector3(1, 1, 0);
const brightness2 = calculateDiffuse(surfaceNormal, slantLight, intensity);
console.log(brightness2.toFixed(2)); // 0.71 - 亮度减弱
```

### 带颜色的光照

实际应用中，光源有颜色，物体表面也有颜色：

```javascript
class Color {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  
  multiplyScalar(k) {
    return new Color(this.r * k, this.g * k, this.b * k);
  }
  
  multiply(color) {
    return new Color(this.r * color.r, this.g * color.g, this.b * color.b);
  }
}

function calculateLighting(normal, lightDir, lightColor, surfaceColor) {
  const N = normal.normalize();
  const L = lightDir.normalize();
  
  const nDotL = Math.max(0, N.dot(L));
  
  // 光源颜色 * 表面颜色 * 光照强度
  return lightColor.multiply(surfaceColor).multiplyScalar(nDotL);
}

// 红色表面，白光照射
const surface = new Color(1, 0, 0); // 红色
const light = new Color(1, 1, 1);   // 白色光
const normal = new Vector3(0, 1, 0);
const lightDir = new Vector3(0, 1, 0);

const finalColor = calculateLighting(normal, lightDir, light, surface);
console.log(finalColor); // Color(1, 0, 0) - 红色
```

### 多光源

真实场景中通常有多个光源，只需累加每个光源的贡献：

```javascript
function calculateMultipleLights(normal, surfaceColor, lights) {
  let totalColor = new Color(0, 0, 0);
  
  for (const light of lights) {
    const contribution = calculateLighting(
      normal,
      light.direction,
      light.color,
      surfaceColor
    );
    
    totalColor.r += contribution.r;
    totalColor.g += contribution.g;
    totalColor.b += contribution.b;
  }
  
  return totalColor;
}

// 两个光源
const lights = [
  { direction: new Vector3(0, 1, 0), color: new Color(1, 1, 1) },  // 顶光
  { direction: new Vector3(1, 0, 0), color: new Color(0.3, 0.3, 0.5) }  // 侧光（蓝色）
];

const finalColor = calculateMultipleLights(normal, surface, lights);
```

## 应用二：运动模拟

### 位置、速度、加速度

在物理模拟中，向量的三个核心概念：

- **位置（Position）**：物体在空间中的坐标 $\mathbf{p}$
- **速度（Velocity）**：位置的变化率 $\mathbf{v}$（单位：米/秒）
- **加速度（Acceleration）**：速度的变化率 $\mathbf{a}$（单位：米/秒²）

它们之间的关系：

$$
\mathbf{v}_{new} = \mathbf{v} + \mathbf{a} \cdot \Delta t
$$

$$
\mathbf{p}_{new} = \mathbf{p} + \mathbf{v} \cdot \Delta t
$$

其中 $\Delta t$ 是时间步长（通常是 1/60 秒，即 60 FPS）。

### 代码实现：简单的物理对象

```javascript
class PhysicsObject {
  constructor(position, velocity, acceleration) {
    this.position = position;       // 位置向量
    this.velocity = velocity;       // 速度向量
    this.acceleration = acceleration; // 加速度向量
  }
  
  update(deltaTime) {
    // 更新速度：v = v + a * dt
    this.velocity = this.velocity.add(
      this.acceleration.multiplyScalar(deltaTime)
    );
    
    // 更新位置：p = p + v * dt
    this.position = this.position.add(
      this.velocity.multiplyScalar(deltaTime)
    );
  }
}
```

### 示例：自由落体

物体在重力作用下的运动：

```javascript
// 创建物体：初始位置 (0, 10, 0)，初始速度为 0
const ball = new PhysicsObject(
  new Vector3(0, 10, 0),    // position
  new Vector3(0, 0, 0),     // velocity
  new Vector3(0, -9.8, 0)   // acceleration (重力)
);

// 模拟 1 秒（60 帧）
for (let i = 0; i < 60; i++) {
  ball.update(1 / 60); // deltaTime = 0.0167 秒
  console.log(`第 ${i+1} 帧: y = ${ball.position.y.toFixed(2)}`);
}

// 输出：y 逐渐减小，物体下落
```

### 示例：抛物线运动

斜抛物体的轨迹：

```javascript
const projectile = new PhysicsObject(
  new Vector3(0, 0, 0),       // 从原点发射
  new Vector3(10, 15, 0),     // 初速度（向右上方）
  new Vector3(0, -9.8, 0)     // 重力
);

const trajectory = [];

for (let i = 0; i < 120; i++) {
  projectile.update(1 / 60);
  trajectory.push({ x: projectile.position.x, y: projectile.position.y });
  
  if (projectile.position.y < 0) {
    console.log('物体落地');
    break;
  }
}

console.log(`飞行距离：${projectile.position.x.toFixed(2)} 米`);
```

### 示例：恒速运动

让物体沿指定方向匀速运动：

```javascript
function moveTowards(current, target, speed, deltaTime) {
  // 计算方向向量
  const direction = target.sub(current).normalize();
  
  // 计算位移
  const displacement = direction.multiplyScalar(speed * deltaTime);
  
  // 更新位置
  return current.add(displacement);
}

// 使用示例：物体从 (0,0,0) 移动到 (10,0,0)，速度 5 米/秒
let position = new Vector3(0, 0, 0);
const target = new Vector3(10, 0, 0);
const speed = 5;

for (let frame = 0; frame < 120; frame++) {
  position = moveTowards(position, target, speed, 1/60);
  
  // 检查是否到达
  if (position.sub(target).length() < 0.1) {
    console.log('到达目标');
    break;
  }
}
```

## 应用三：平面与距离

### 平面的表示

一个平面可以用以下信息定义：
- **法向量** $\mathbf{n}$：垂直于平面的单位向量
- **平面上的一个点** $\mathbf{p_0}$

数学表达式：

$$
\mathbf{n} \cdot (\mathbf{p} - \mathbf{p_0}) = 0
$$

意思是：平面上的任意点 $\mathbf{p}$ 到 $\mathbf{p_0}$ 的向量都垂直于法向量。

### 点到平面的距离

点 $\mathbf{p}$ 到平面的**有向距离**（Signed Distance）：

$$
d = \mathbf{n} \cdot (\mathbf{p} - \mathbf{p_0})
$$

- $d > 0$：点在平面的正面（法向量指向的一侧）
- $d = 0$：点在平面上
- $d < 0$：点在平面的背面

绝对距离：$|d|$

### 代码实现

```javascript
class Plane {
  constructor(normal, point) {
    this.normal = normal.normalize(); // 法向量（单位向量）
    this.point = point;               // 平面上的一个点
  }
  
  distanceToPoint(p) {
    // 有向距离：n · (p - p0)
    return this.normal.dot(p.sub(this.point));
  }
  
  isPointInFront(p) {
    return this.distanceToPoint(p) > 0;
  }
}

// 使用示例：水平面 y = 0
const groundPlane = new Plane(
  new Vector3(0, 1, 0),  // 法向量朝上
  new Vector3(0, 0, 0)   // 平面上的一个点
);

const pointA = new Vector3(0, 5, 0);
console.log(groundPlane.distanceToPoint(pointA)); // 5 - 在上方

const pointB = new Vector3(0, -3, 0);
console.log(groundPlane.distanceToPoint(pointB)); // -3 - 在下方
```

### 应用：点投影到平面

将点 $\mathbf{p}$ 投影到平面上：

$$
\mathbf{p}_{proj} = \mathbf{p} - d \cdot \mathbf{n}
$$

其中 $d$ 是点到平面的有向距离。

```javascript
projectPoint(p) {
  const d = this.distanceToPoint(p);
  return p.sub(this.normal.multiplyScalar(d));
}

// 使用示例
const point = new Vector3(3, 5, 2);
const projected = groundPlane.projectPoint(point);
console.log(projected.toString()); // Vector3(3, 0, 2) - y 变为 0
```

### 应用：射线与平面相交

射线 $\mathbf{r}(t) = \mathbf{o} + t \cdot \mathbf{d}$ 与平面的交点：

$$
t = \frac{(\mathbf{p_0} - \mathbf{o}) \cdot \mathbf{n}}{\mathbf{d} \cdot \mathbf{n}}
$$

```javascript
function rayPlaneIntersection(rayOrigin, rayDirection, plane) {
  const dDotN = rayDirection.dot(plane.normal);
  
  // 射线平行于平面
  if (Math.abs(dDotN) < 0.0001) {
    return null;
  }
  
  const t = plane.point.sub(rayOrigin).dot(plane.normal) / dDotN;
  
  // 交点在射线起点之前
  if (t < 0) {
    return null;
  }
  
  // 计算交点
  return rayOrigin.add(rayDirection.multiplyScalar(t));
}

// 使用示例
const rayOrigin = new Vector3(0, 10, 0);
const rayDirection = new Vector3(0, -1, 0); // 向下射线

const intersection = rayPlaneIntersection(rayOrigin, rayDirection, groundPlane);
console.log(intersection.toString()); // Vector3(0, 0, 0) - 击中地面
```

## 综合示例：带光照和物理的场景

最后，让我们把这三个应用结合起来，创建一个简单但完整的场景：

```javascript
// 创建一个会反弹的球
class Ball extends PhysicsObject {
  constructor(position, velocity, radius) {
    super(position, velocity, new Vector3(0, -9.8, 0)); // 重力
    this.radius = radius;
  }
  
  checkGroundCollision(groundPlane) {
    const distance = groundPlane.distanceToPoint(this.position);
    
    // 球触碰地面
    if (distance < this.radius) {
      // 反弹：速度在法向量方向上反向
      const normalVel = groundPlane.normal.multiplyScalar(
        this.velocity.dot(groundPlane.normal)
      );
      
      // 反弹系数 0.8（损失 20% 能量）
      this.velocity = this.velocity.sub(normalVel.multiplyScalar(1.8));
      
      // 修正位置（避免陷入地面）
      this.position = this.position.add(
        groundPlane.normal.multiplyScalar(this.radius - distance)
      );
    }
  }
  
  calculateLighting(lightDir, lightColor) {
    // 球面顶部的法向量（简化）
    const normal = new Vector3(0, 1, 0);
    
    const nDotL = Math.max(0, normal.dot(lightDir.normalize()));
    return lightColor.multiplyScalar(nDotL);
  }
}

// 模拟场景
const ball = new Ball(new Vector3(0, 10, 0), new Vector3(5, 0, 0), 1);
const ground = new Plane(new Vector3(0, 1, 0), new Vector3(0, 0, 0));
const light = new Vector3(-1, 1, 0); // 斜向光

for (let frame = 0; frame < 300; frame++) {
  ball.update(1 / 60);
  ball.checkGroundCollision(ground);
  
  const brightness = ball.calculateLighting(light, new Color(1, 1, 1));
  
  if (frame % 30 === 0) {
    console.log(`Frame ${frame}: y=${ball.position.y.toFixed(2)}, light=${brightness.r.toFixed(2)}`);
  }
}
```

## 小结

在本章中，我们看到了向量运算在实际场景中的应用：

- **光照计算**：用点积计算 Lambert 漫反射
  - 法向量与光线方向的点积决定亮度
  - 多光源只需累加贡献

- **运动模拟**：用向量表示物理运动
  - 位置、速度、加速度的向量关系
  - 重力、抛物线、恒速运动

- **平面与距离**：用向量判断几何关系
  - 点到平面的有向距离
  - 投影和射线相交

向量是 3D 图形学的基础，但对于更复杂的变换（旋转、缩放、变换组合），我们需要更强大的工具——**矩阵**。

下一章将学习矩阵的概念和基础运算。

---

**练习**：

1. 计算法向量 `(0, 1, 0)` 和光照方向 `(1, 1, 1)` 的 Lambert 光照强度
2. 创建一个物体，初始位置 `(0, 0, 0)`，速度 `(1, 0, 0)`，在 10 秒后的位置
3. 计算点 `(3, 5, 2)` 到平面（法向量 `(0, 1, 0)`，过点 `(0, 2, 0)`）的距离
4. 修改反弹球示例，让球在 xz 平面上也能反弹（而不是只在 y 方向）

尝试在浏览器控制台中完成这些练习。
