# 射线与平面相交

游戏中，玩家点击地面移动角色——如何计算点击位置？这需要**射线与平面相交测试**。

从鼠标屏幕坐标生成射线，与地面平面求交，就得到世界坐标系中的点击位置。

## 射线的表示

射线由**起点**和**方向**定义：

```javascript
class Ray {
  constructor(origin, direction) {
    this.origin = origin;          // 起点 P₀
    this.direction = normalize(direction);  // 单位方向向量 d
  }
  
  // 获取射线上的点：P(t) = P₀ + t·d
  getPoint(t) {
    return {
      x: this.origin.x + t * this.direction.x,
      y: this.origin.y + t * this.direction.y,
      z: this.origin.z + t * this.direction.z
    };
  }
}
```

射线方程：

$$
\mathbf{P}(t) = \mathbf{P}_0 + t\mathbf{d}, \quad t \geq 0
$$

其中 $t$ 是距离参数。

## 平面的表示

平面用**法线**和**到原点距离**表示：

```javascript
class Plane {
  constructor(normal, distance) {
    this.normal = normalize(normal);  // 单位法向量 n
    this.distance = distance;         // 原点到平面的有向距离 d
  }
  
  // 从三个点构造平面
  static fromPoints(p1, p2, p3) {
    const v1 = subtract(p2, p1);
    const v2 = subtract(p3, p1);
    const normal = normalize(cross(v1, v2));
    const distance = -dot(normal, p1);
    
    return new Plane(normal, distance);
  }
}
```

平面方程：

$$
\mathbf{n} \cdot \mathbf{P} + d = 0
$$

其中 $\mathbf{n}$ 是单位法向量，$d$ 是到原点的有向距离。

## 相交测试

### 数学推导

将射线方程代入平面方程：

$$
\mathbf{n} \cdot (\mathbf{P}_0 + t\mathbf{d}) + d = 0
$$

展开：

$$
\mathbf{n} \cdot \mathbf{P}_0 + t(\mathbf{n} \cdot \mathbf{d}) + d = 0
$$

解出 $t$：

$$
t = \frac{-(\mathbf{n} \cdot \mathbf{P}_0 + d)}{\mathbf{n} \cdot \mathbf{d}}
$$

### 完整实现

```javascript
function rayPlaneIntersect(ray, plane) {
  const denom = dot(plane.normal, ray.direction);
  
  // 检查平行（分母为0）
  if (Math.abs(denom) < 0.0001) {
    return null;  // 射线平行于平面
  }
  
  // 计算t
  const t = -(dot(plane.normal, ray.origin) + plane.distance) / denom;
  
  // 检查t是否为正（射线方向）
  if (t < 0) {
    return null;  // 交点在射线背后
  }
  
  // 计算交点
  return {
    point: ray.getPoint(t),
    distance: t
  };
}
```

### 分类讨论

**情况1：射线平行于平面**

```javascript
const ray = new Ray(
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 0, z: 0 }  // 水平方向
);

const plane = new Plane(
  { x: 0, y: 1, z: 0 },  // 法线向上
  0
);

const result = rayPlaneIntersect(ray, plane);
console.log(result);  // null（平行，无交点）
```

**情况2：射线背对平面**

```javascript
const ray = new Ray(
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 1, z: 0 }   // 向上
);

const plane = new Plane(
  { x: 0, y: 1, z: 0 },
  0  // xz平面
);

const result = rayPlaneIntersect(ray, plane);
console.log(result);  // null（t < 0）
```

**情况3：正常相交**

```javascript
const ray = new Ray(
  { x: 0, y: 5, z: 0 },
  { x: 0, y: -1, z: 0 }  // 向下
);

const plane = new Plane(
  { x: 0, y: 1, z: 0 },
  0  // xz平面
);

const result = rayPlaneIntersect(ray, plane);
console.log(result);
// { point: { x: 0, y: 0, z: 0 }, distance: 5 }
```

## 实际应用场景

### 场景1：鼠标点击地面

```javascript
function getGroundClickPosition(mouseX, mouseY, camera) {
  // 1. 将屏幕坐标转换为NDC
  const ndcX = (mouseX / canvas.width) * 2 - 1;
  const ndcY = -((mouseY / canvas.height) * 2 - 1);
  
  // 2. 构造射线
  const ray = camera.screenPointToRay(ndcX, ndcY);
  
  // 3. 地面平面（y=0）
  const groundPlane = new Plane(
    { x: 0, y: 1, z: 0 },
    0
  );
  
  // 4. 求交
  const intersection = rayPlaneIntersect(ray, groundPlane);
  
  if (intersection) {
    return intersection.point;  // 世界坐标
  }
  
  return null;
}

// 使用
canvas.addEventListener('click', (e) => {
  const worldPos = getGroundClickPosition(e.clientX, e.clientY, camera);
  if (worldPos) {
    character.moveTo(worldPos);
  }
});
```

### 场景2：镜面反射

```javascript
function computeReflection(incident, plane) {
  // 1. 找到入射点
  const intersection = rayPlaneIntersect(incident, plane);
  if (!intersection) return null;
  
  // 2. 反射方向：r = d - 2(d·n)n
  const d = incident.direction;
  const n = plane.normal;
  
  const reflectedDir = {
    x: d.x - 2 * dot(d, n) * n.x,
    y: d.y - 2 * dot(d, n) * n.y,
    z: d.z - 2 * dot(d, n) * n.z
  };
  
  // 3. 构造反射射线
  return new Ray(intersection.point, reflectedDir);
}

// 示例：激光反射
const laserRay = new Ray(
  { x: 0, y: 5, z: 0 },
  { x: 1, y: -1, z: 0 }
);

const mirror = new Plane(
  { x: 0, y: 1, z: 0 },
  0
);

const reflectedRay = computeReflection(laserRay, mirror);
```

### 场景3：平面裁剪

```javascript
function clipLineSegmentByPlane(start, end, plane) {
  const ray = new Ray(start, subtract(end, start));
  const maxT = length(subtract(end, start));
  
  const intersection = rayPlaneIntersect(ray, plane);
  
  if (!intersection || intersection.distance > maxT) {
    // 无交点或交点在线段外
    const startDist = dot(plane.normal, start) + plane.distance;
    const endDist = dot(plane.normal, end) + plane.distance;
    
    if (startDist > 0 && endDist > 0) {
      return { start, end };  // 完全在正侧
    }
    return null;  // 完全在负侧
  }
  
  // 线段被裁剪
  const startDist = dot(plane.normal, start) + plane.distance;
  
  if (startDist > 0) {
    return { start, end: intersection.point };  // 保留start到交点
  } else {
    return { start: intersection.point, end };  // 保留交点到end
  }
}
```

### 场景4：阴影投射

```javascript
function projectShadowOnGround(objectPos, lightDir, groundPlane) {
  // 从物体向光源反方向发射射线
  const ray = new Ray(objectPos, {
    x: -lightDir.x,
    y: -lightDir.y,
    z: -lightDir.z
  });
  
  const intersection = rayPlaneIntersect(ray, groundPlane);
  
  if (intersection) {
    return intersection.point;  // 阴影位置
  }
  
  return null;
}

// 使用
const shadowPos = projectShadowOnGround(
  player.position,
  sunLight.direction,
  groundPlane
);

if (shadowPos) {
  drawShadowAt(shadowPos);
}
```

## 优化技巧

### 技巧1：预计算分母

```javascript
class Plane {
  constructor(normal, distance) {
    this.normal = normalize(normal);
    this.distance = distance;
    this.precomputedDots = new Map();  // 缓存常用方向
  }
  
  intersectRayFast(ray) {
    const key = `${ray.direction.x},${ray.direction.y},${ray.direction.z}`;
    
    let denom = this.precomputedDots.get(key);
    if (denom === undefined) {
      denom = dot(this.normal, ray.direction);
      this.precomputedDots.set(key, denom);
    }
    
    if (Math.abs(denom) < 0.0001) return null;
    
    const t = -(dot(this.normal, ray.origin) + this.distance) / denom;
    if (t < 0) return null;
    
    return ray.getPoint(t);
  }
}
```

### 技巧2：双面测试

```javascript
function rayPlaneIntersectDoubleSided(ray, plane) {
  const denom = dot(plane.normal, ray.direction);
  
  if (Math.abs(denom) < 0.0001) return null;
  
  const t = -(dot(plane.normal, ray.origin) + plane.distance) / denom;
  
  // ✅ 不检查t<0，允许背面相交
  return {
    point: ray.getPoint(Math.abs(t)),
    distance: Math.abs(t),
    frontFacing: denom < 0
  };
}
```

## 常见陷阱

### 陷阱1：忘记归一化方向

```javascript
// 错误：方向未归一化
const ray = new Ray(
  { x: 0, y: 0, z: 0 },
  { x: 2, y: 3, z: 1 }  // ❌ 长度不是1
);

const result = rayPlaneIntersect(ray, plane);
console.log(result.distance);  // 错误的距离值

// 正确
const ray = new Ray(origin, normalize(direction));
```

### 陷阱2：浮点精度问题

```javascript
// 错误：直接比较0
if (denom === 0) return null;  // ❌ 永远不成立

// 正确：使用epsilon
const EPSILON = 0.0001;
if (Math.abs(denom) < EPSILON) return null;
```

### 陷阱3：忘记检查t的符号

```javascript
// 错误：返回负数t
const t = -(dot(plane.normal, ray.origin) + plane.distance) / denom;
return ray.getPoint(t);  // ❌ 可能在射线背后

// 正确
if (t < 0) return null;
return ray.getPoint(t);
```

## 扩展：线段与平面相交

线段有起点和终点，需要额外检查 $t$ 是否在范围内：

```javascript
function segmentPlaneIntersect(start, end, plane) {
  const direction = subtract(end, start);
  const length = magnitude(direction);
  const ray = new Ray(start, normalize(direction));
  
  const result = rayPlaneIntersect(ray, plane);
  
  if (result && result.distance <= length) {
    return result;  // 交点在线段上
  }
  
  return null;
}
```

## 总结

射线与平面相交是最基础的几何测试：

| 概念 | 公式 |
|------|------|
| **射线方程** | $\mathbf{P}(t) = \mathbf{P}_0 + t\mathbf{d}$ |
| **平面方程** | $\mathbf{n} \cdot \mathbf{P} + d = 0$ |
| **交点参数** | $t = -\frac{\mathbf{n} \cdot \mathbf{P}_0 + d}{\mathbf{n} \cdot \mathbf{d}}$ |

关键要点：
- 检查**平行情况**（分母为0）
- 验证**t为正**（射线方向）
- 使用**epsilon容差**（浮点精度）
- 应用于**鼠标拾取**、**镜面反射**、**阴影投射**

掌握这个算法，更复杂的相交测试就是基础！
