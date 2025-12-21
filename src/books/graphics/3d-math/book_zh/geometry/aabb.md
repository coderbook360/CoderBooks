# AABB碰撞检测

游戏中，子弹击中敌人、玩家捡起道具——都需要**碰撞检测**。

**AABB**（Axis-Aligned Bounding Box，轴对齐包围盒）是最快的碰撞检测方法：简单、高效、易实现。

## 什么是AABB？

AABB是**与坐标轴平行的长方体**，用两个点表示：

```javascript
class AABB {
  constructor(min, max) {
    this.min = min;  // { x, y, z }：最小角
    this.max = max;  // { x, y, z }：最大角
  }
  
  // 从中心和半径创建
  static fromCenterAndSize(center, size) {
    const halfSize = {
      x: size.x / 2,
      y: size.y / 2,
      z: size.z / 2
    };
    
    return new AABB(
      { x: center.x - halfSize.x, y: center.y - halfSize.y, z: center.z - halfSize.z },
      { x: center.x + halfSize.x, y: center.y + halfSize.y, z: center.z + halfSize.z }
    );
  }
  
  getCenter() {
    return {
      x: (this.min.x + this.max.x) / 2,
      y: (this.min.y + this.max.y) / 2,
      z: (this.min.z + this.max.z) / 2
    };
  }
  
  getSize() {
    return {
      x: this.max.x - this.min.x,
      y: this.max.y - this.min.y,
      z: this.max.z - this.min.z
    };
  }
}
```

示例：

```javascript
// 一个2x3x4的盒子，中心在(0,0,0)
const box = AABB.fromCenterAndSize(
  { x: 0, y: 0, z: 0 },
  { x: 2, y: 3, z: 4 }
);

console.log(box.min);  // { x: -1, y: -1.5, z: -2 }
console.log(box.max);  // { x: 1, y: 1.5, z: 2 }
```

## AABB与AABB碰撞

### 2D情况（直观理解）

两个矩形相交，当且仅当**在X轴和Y轴上的投影都重叠**：

```
矩形A:  [minA.x, maxA.x] × [minA.y, maxA.y]
矩形B:  [minB.x, maxB.x] × [minB.y, maxB.y]

X轴重叠：maxA.x >= minB.x && minA.x <= maxB.x
Y轴重叠：maxA.y >= minB.y && minA.y <= maxB.y
```

### 3D扩展

同理，3D中需要**三个轴都重叠**：

```javascript
function aabbIntersectsAABB(a, b) {
  return (
    a.max.x >= b.min.x && a.min.x <= b.max.x &&
    a.max.y >= b.min.y && a.min.y <= b.max.y &&
    a.max.z >= b.min.z && a.min.z <= b.max.z
  );
}

// 测试
const boxA = new AABB(
  { x: 0, y: 0, z: 0 },
  { x: 2, y: 2, z: 2 }
);

const boxB = new AABB(
  { x: 1, y: 1, z: 1 },
  { x: 3, y: 3, z: 3 }
);

console.log(aabbIntersectsAABB(boxA, boxB));  // true（部分重叠）

const boxC = new AABB(
  { x: 5, y: 5, z: 5 },
  { x: 7, y: 7, z: 7 }
);

console.log(aabbIntersectsAABB(boxA, boxC));  // false（不相交）
```

### 优化：早期退出

```javascript
function aabbIntersectsAABBFast(a, b) {
  // 任何一个轴不重叠，立即返回false
  if (a.max.x < b.min.x || a.min.x > b.max.x) return false;
  if (a.max.y < b.min.y || a.min.y > b.max.y) return false;
  if (a.max.z < b.min.z || a.min.z > b.max.z) return false;
  
  return true;
}
```

## 点与AABB相交

检查点是否在盒子内：

```javascript
function pointInAABB(point, aabb) {
  return (
    point.x >= aabb.min.x && point.x <= aabb.max.x &&
    point.y >= aabb.min.y && point.y <= aabb.max.y &&
    point.z >= aabb.min.z && point.z <= aabb.max.z
  );
}

// 示例
const point = { x: 1, y: 1, z: 1 };
const box = new AABB(
  { x: 0, y: 0, z: 0 },
  { x: 2, y: 2, z: 2 }
);

console.log(pointInAABB(point, box));  // true
```

## 射线与AABB相交（光线追踪必备）

经典的**Slab方法**：

```javascript
function rayAABBIntersect(ray, aabb) {
  let tMin = 0;
  let tMax = Infinity;
  
  // 对三个轴分别计算
  for (const axis of ['x', 'y', 'z']) {
    const invD = 1 / ray.direction[axis];
    const t0 = (aabb.min[axis] - ray.origin[axis]) * invD;
    const t1 = (aabb.max[axis] - ray.origin[axis]) * invD;
    
    // 确保t0 < t1
    const tNear = Math.min(t0, t1);
    const tFar = Math.max(t0, t1);
    
    tMin = Math.max(tMin, tNear);
    tMax = Math.min(tMax, tFar);
    
    // 提前退出
    if (tMin > tMax) return null;
  }
  
  if (tMin < 0 && tMax < 0) return null;  // 射线背后
  
  const t = tMin >= 0 ? tMin : tMax;
  return {
    point: ray.getPoint(t),
    distance: t
  };
}

// 示例
const ray = new Ray(
  { x: -5, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 }  // 向+X方向
);

const box = new AABB(
  { x: -1, y: -1, z: -1 },
  { x: 1, y: 1, z: 1 }
);

const hit = rayAABBIntersect(ray, box);
console.log(hit);  // { point: { x: -1, y: 0, z: 0 }, distance: 4 }
```

## 实际应用场景

### 场景1：拾取系统

```javascript
class PickupSystem {
  checkPickups(player, items) {
    const playerAABB = player.getAABB();
    
    for (const item of items) {
      if (aabbIntersectsAABB(playerAABB, item.getAABB())) {
        this.pickup(player, item);
      }
    }
  }
  
  pickup(player, item) {
    player.inventory.add(item);
    item.destroy();
  }
}

// 使用
class Player {
  getAABB() {
    return AABB.fromCenterAndSize(
      this.position,
      { x: 1, y: 2, z: 1 }  // 1米宽，2米高
    );
  }
}

class Coin {
  getAABB() {
    return AABB.fromCenterAndSize(
      this.position,
      { x: 0.5, y: 0.5, z: 0.5 }
    );
  }
}
```

### 场景2：空间分割（Octree）

```javascript
class Octree {
  constructor(boundary, capacity) {
    this.boundary = boundary;  // AABB
    this.capacity = capacity;
    this.objects = [];
    this.divided = false;
    this.children = [];
  }
  
  insert(object) {
    // 不在边界内
    if (!aabbIntersectsAABB(object.aabb, this.boundary)) {
      return false;
    }
    
    // 容量未满
    if (this.objects.length < this.capacity) {
      this.objects.push(object);
      return true;
    }
    
    // 需要分割
    if (!this.divided) {
      this.subdivide();
    }
    
    // 插入子节点
    for (const child of this.children) {
      if (child.insert(object)) {
        return true;
      }
    }
    
    return false;
  }
  
  subdivide() {
    const center = this.boundary.getCenter();
    const size = this.boundary.getSize();
    const halfSize = { x: size.x / 2, y: size.y / 2, z: size.z / 2 };
    
    // 创建8个子节点
    for (let i = 0; i < 8; i++) {
      const offset = {
        x: (i & 1) ? halfSize.x / 2 : -halfSize.x / 2,
        y: (i & 2) ? halfSize.y / 2 : -halfSize.y / 2,
        z: (i & 4) ? halfSize.z / 2 : -halfSize.z / 2
      };
      
      const childCenter = {
        x: center.x + offset.x,
        y: center.y + offset.y,
        z: center.z + offset.z
      };
      
      const childBoundary = AABB.fromCenterAndSize(childCenter, halfSize);
      this.children.push(new Octree(childBoundary, this.capacity));
    }
    
    this.divided = true;
  }
  
  query(range, found = []) {
    if (!aabbIntersectsAABB(this.boundary, range)) {
      return found;
    }
    
    for (const obj of this.objects) {
      if (aabbIntersectsAABB(obj.aabb, range)) {
        found.push(obj);
      }
    }
    
    if (this.divided) {
      for (const child of this.children) {
        child.query(range, found);
      }
    }
    
    return found;
  }
}

// 使用
const worldBounds = new AABB(
  { x: -100, y: -100, z: -100 },
  { x: 100, y: 100, z: 100 }
);

const octree = new Octree(worldBounds, 8);

// 插入1000个物体
for (let i = 0; i < 1000; i++) {
  const obj = {
    position: randomPosition(),
    aabb: AABB.fromCenterAndSize(randomPosition(), { x: 1, y: 1, z: 1 })
  };
  octree.insert(obj);
}

// 查询特定区域
const queryRange = AABB.fromCenterAndSize(
  { x: 10, y: 10, z: 10 },
  { x: 20, y: 20, z: 20 }
);

const nearbyObjects = octree.query(queryRange);
console.log(`Found ${nearbyObjects.length} objects`);
```

### 场景3：视锥剔除（Frustum Culling）

```javascript
class FrustumCuller {
  constructor(frustumPlanes) {
    this.planes = frustumPlanes;  // 6个平面
  }
  
  isAABBVisible(aabb) {
    // 对每个平面测试
    for (const plane of this.planes) {
      // 找到离平面最远的角点
      const p = {
        x: plane.normal.x > 0 ? aabb.max.x : aabb.min.x,
        y: plane.normal.y > 0 ? aabb.max.y : aabb.min.y,
        z: plane.normal.z > 0 ? aabb.max.z : aabb.min.z
      };
      
      // 如果最远的点都在平面负侧，整个AABB在外
      if (dot(plane.normal, p) + plane.distance < 0) {
        return false;
      }
    }
    
    return true;
  }
}

// 使用
const frustum = camera.getFrustumPlanes();
const culler = new FrustumCuller(frustum);

for (const object of scene.objects) {
  if (culler.isAABBVisible(object.aabb)) {
    renderer.draw(object);
  }
}
```

### 场景4：合并AABB

```javascript
function mergeAABB(a, b) {
  return new AABB(
    {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z)
    },
    {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z)
    }
  );
}

// 从多个物体创建总包围盒
function computeSceneAABB(objects) {
  if (objects.length === 0) return null;
  
  let result = objects[0].aabb;
  for (let i = 1; i < objects.length; i++) {
    result = mergeAABB(result, objects[i].aabb);
  }
  
  return result;
}
```

## 常见陷阱

### 陷阱1：混淆min和max

```javascript
// 错误：构造时min和max顺序错误
const box = new AABB(
  { x: 2, y: 2, z: 2 },
  { x: 0, y: 0, z: 0 }  // ❌ 应该是min
);

// 正确：确保min < max
function createAABB(p1, p2) {
  return new AABB(
    {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      z: Math.min(p1.z, p2.z)
    },
    {
      x: Math.max(p1.x, p2.x),
      y: Math.max(p1.y, p2.y),
      z: Math.max(p1.z, p2.z)
    }
  );
}
```

### 陷阱2：忘记更新AABB

```javascript
// 错误：物体移动后AABB未更新
class GameObject {
  move(delta) {
    this.position.x += delta.x;
    // ❌ 忘记更新AABB
  }
}

// 正确
class GameObject {
  move(delta) {
    this.position.x += delta.x;
    this.updateAABB();  // ✅
  }
  
  updateAABB() {
    this.aabb = AABB.fromCenterAndSize(this.position, this.size);
  }
}
```

### 陷阱3：浮点精度导致的边界情况

```javascript
// 错误：严格相等判断
function aabbTouching(a, b) {
  return a.max.x === b.min.x;  // ❌ 浮点误差
}

// 正确：使用epsilon
const EPSILON = 0.0001;
function aabbTouching(a, b) {
  return Math.abs(a.max.x - b.min.x) < EPSILON;
}
```

## 总结

AABB是最常用的碰撞检测形状：

| 操作 | 时间复杂度 | 应用场景 |
|------|----------|---------|
| **AABB vs AABB** | O(1) | 物体碰撞、拾取检测 |
| **点 vs AABB** | O(1) | 鼠标拾取、粒子碰撞 |
| **射线 vs AABB** | O(1) | 光线追踪、射线检测 |

关键要点：
- **轴对齐约束**：旋转后需重新计算AABB
- **分离轴定理**：任一轴投影不重叠则不相交
- **空间分割**：Octree/BVH加速大规模检测
- **早期退出**：逐轴检测，失败立即返回

AABB简单高效，但精度不如OBB，适合粗略检测和剔除！
