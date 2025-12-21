# OBB碰撞检测

AABB简单高效，但有个致命问题：**旋转物体的AABB会变得很大**，导致大量误判。

想象一根细长的棒子斜着旋转——AABB会把整个旋转范围包住，浪费空间。

**OBB**（Oriented Bounding Box，有向包围盒）解决了这个问题：它可以旋转，紧密贴合物体。

## 为什么需要OBB？

### AABB的局限性

```javascript
// 一个2x10的细长盒子，旋转45度
const box = {
  size: { x: 2, y: 10, z: 2 },
  rotation: 45 * Math.PI / 180
};

// AABB需要包住整个旋转范围
const aabb = computeAABB(box);
console.log(aabb.size);  // { x: 8.5, y: 8.5, z: 2 } ❌ 太大！

// OBB紧密贴合
const obb = new OBB(box.center, box.size, box.rotation);
console.log(obb.size);  // { x: 2, y: 10, z: 2 } ✅ 精确！
```

**应用场景**：
- **旋转的飞机、汽车、角色**：AABB会浪费大量空间
- **精确碰撞**：减少误判，提升游戏体验
- **物理模拟**：更准确的力学计算

## OBB的表示

OBB用**中心、半尺寸、方向**表示：

```javascript
class OBB {
  constructor(center, halfSize, orientation) {
    this.center = center;      // { x, y, z }：中心点
    this.halfSize = halfSize;  // { x, y, z }：半尺寸
    
    // 方向可以用旋转矩阵或三个轴向量表示
    if (orientation.type === 'matrix') {
      this.axes = [
        { x: orientation.m[0], y: orientation.m[1], z: orientation.m[2] },
        { x: orientation.m[4], y: orientation.m[5], z: orientation.m[6] },
        { x: orientation.m[8], y: orientation.m[9], z: orientation.m[10] }
      ];
    } else {
      this.axes = orientation.axes;  // 三个单位正交向量
    }
  }
  
  // 从AABB和旋转矩阵创建OBB
  static fromAABBAndMatrix(aabb, matrix) {
    const center = transformPoint(aabb.getCenter(), matrix);
    const halfSize = {
      x: (aabb.max.x - aabb.min.x) / 2,
      y: (aabb.max.y - aabb.min.y) / 2,
      z: (aabb.max.z - aabb.min.z) / 2
    };
    
    return new OBB(center, halfSize, { type: 'matrix', m: matrix });
  }
  
  // 获取8个顶点
  getVertices() {
    const vertices = [];
    
    for (let i = 0; i < 8; i++) {
      const signs = {
        x: (i & 1) ? 1 : -1,
        y: (i & 2) ? 1 : -1,
        z: (i & 4) ? 1 : -1
      };
      
      vertices.push({
        x: this.center.x + 
           signs.x * this.halfSize.x * this.axes[0].x +
           signs.y * this.halfSize.y * this.axes[1].x +
           signs.z * this.halfSize.z * this.axes[2].x,
        y: this.center.y + 
           signs.x * this.halfSize.x * this.axes[0].y +
           signs.y * this.halfSize.y * this.axes[1].y +
           signs.z * this.halfSize.z * this.axes[2].y,
        z: this.center.z + 
           signs.x * this.halfSize.x * this.axes[0].z +
           signs.y * this.halfSize.y * this.axes[1].z +
           signs.z * this.halfSize.z * this.axes[2].z
      });
    }
    
    return vertices;
  }
}
```

## OBB与OBB碰撞：分离轴定理（SAT）

核心思想：**如果两个凸多面体不相交，必然存在一个轴，使得它们在该轴上的投影不重叠。**

对于两个OBB，需要测试**15个潜在分离轴**：
- A的3个轴
- B的3个轴
- A和B轴的9个叉积（边与边）

```javascript
function obbIntersectsOBB(a, b) {
  // 测试A的3个轴
  for (let i = 0; i < 3; i++) {
    if (isSeparatingAxis(a.axes[i], a, b)) {
      return false;
    }
  }
  
  // 测试B的3个轴
  for (let i = 0; i < 3; i++) {
    if (isSeparatingAxis(b.axes[i], a, b)) {
      return false;
    }
  }
  
  // 测试9个叉积轴
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const axis = cross(a.axes[i], b.axes[j]);
      const len = magnitude(axis);
      
      if (len > 0.0001) {  // 避免平行轴
        const normalizedAxis = scale(axis, 1 / len);
        if (isSeparatingAxis(normalizedAxis, a, b)) {
          return false;
        }
      }
    }
  }
  
  return true;  // 所有轴都重叠，确认相交
}

function isSeparatingAxis(axis, a, b) {
  // 计算A在axis上的投影半径
  const aRadius = 
    Math.abs(dot(axis, scale(a.axes[0], a.halfSize.x))) +
    Math.abs(dot(axis, scale(a.axes[1], a.halfSize.y))) +
    Math.abs(dot(axis, scale(a.axes[2], a.halfSize.z)));
  
  // 计算B在axis上的投影半径
  const bRadius = 
    Math.abs(dot(axis, scale(b.axes[0], b.halfSize.x))) +
    Math.abs(dot(axis, scale(b.axes[1], b.halfSize.y))) +
    Math.abs(dot(axis, scale(b.axes[2], b.halfSize.z)));
  
  // 中心距离在axis上的投影
  const distance = Math.abs(dot(axis, subtract(b.center, a.center)));
  
  // 如果距离大于半径之和，是分离轴
  return distance > aRadius + bRadius;
}
```

### 优化版本（提前退出）

```javascript
function obbIntersectsOBBFast(a, b) {
  const axes = [
    ...a.axes,
    ...b.axes
  ];
  
  // 先测试主轴（最可能分离）
  for (const axis of axes) {
    if (isSeparatingAxis(axis, a, b)) {
      return false;  // 提前退出
    }
  }
  
  // 再测试叉积轴（计算量大）
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const axis = normalize(cross(a.axes[i], b.axes[j]));
      if (magnitude(axis) > 0.0001 && isSeparatingAxis(axis, a, b)) {
        return false;
      }
    }
  }
  
  return true;
}
```

## 点与OBB碰撞

将点转换到OBB的局部坐标系：

```javascript
function pointInOBB(point, obb) {
  // 将点转换到OBB局部空间
  const d = subtract(point, obb.center);
  
  // 投影到三个轴上
  for (let i = 0; i < 3; i++) {
    const dist = dot(d, obb.axes[i]);
    const halfSize = [obb.halfSize.x, obb.halfSize.y, obb.halfSize.z][i];
    
    if (Math.abs(dist) > halfSize) {
      return false;
    }
  }
  
  return true;
}

// 计算点到OBB的最近点
function closestPointOnOBB(point, obb) {
  const d = subtract(point, obb.center);
  let result = { ...obb.center };
  
  for (let i = 0; i < 3; i++) {
    const dist = dot(d, obb.axes[i]);
    const halfSize = [obb.halfSize.x, obb.halfSize.y, obb.halfSize.z][i];
    
    // 夹紧到[-halfSize, halfSize]
    const clampedDist = Math.max(-halfSize, Math.min(halfSize, dist));
    
    result.x += clampedDist * obb.axes[i].x;
    result.y += clampedDist * obb.axes[i].y;
    result.z += clampedDist * obb.axes[i].z;
  }
  
  return result;
}
```

## 射线与OBB相交

将射线转换到OBB局部空间，然后按AABB处理：

```javascript
function rayOBBIntersect(ray, obb) {
  // 1. 构造逆变换矩阵（从世界空间到OBB局部空间）
  const invTransform = {
    axes: obb.axes,  // 列向量
    center: obb.center
  };
  
  // 2. 变换射线到OBB局部空间
  const localOrigin = worldToLocal(ray.origin, invTransform);
  const localDir = {
    x: dot(ray.direction, obb.axes[0]),
    y: dot(ray.direction, obb.axes[1]),
    z: dot(ray.direction, obb.axes[2])
  };
  
  // 3. 在局部空间中，OBB变成AABB
  const localAABB = new AABB(
    { x: -obb.halfSize.x, y: -obb.halfSize.y, z: -obb.halfSize.z },
    { x: obb.halfSize.x, y: obb.halfSize.y, z: obb.halfSize.z }
  );
  
  const localRay = new Ray(localOrigin, normalize(localDir));
  
  // 4. AABB相交测试（Slab方法）
  return rayAABBIntersect(localRay, localAABB);
}

function worldToLocal(point, invTransform) {
  const d = subtract(point, invTransform.center);
  return {
    x: dot(d, invTransform.axes[0]),
    y: dot(d, invTransform.axes[1]),
    z: dot(d, invTransform.axes[2])
  };
}
```

## 实际应用场景

### 场景1：精确的汽车碰撞

```javascript
class Car {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = 0;  // 绕Y轴
    this.size = { x: 2, y: 1, z: 4 };  // 宽2m，高1m，长4m
  }
  
  getOBB() {
    // 构造旋转矩阵
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    return new OBB(
      this.position,
      { x: this.size.x / 2, y: this.size.y / 2, z: this.size.z / 2 },
      {
        axes: [
          { x: cos, y: 0, z: sin },    // 右方向
          { x: 0, y: 1, z: 0 },        // 上方向
          { x: -sin, y: 0, z: cos }    // 前方向
        ]
      }
    );
  }
  
  checkCollision(other) {
    return obbIntersectsOBB(this.getOBB(), other.getOBB());
  }
}

// 使用
const car1 = new Car();
car1.rotation = Math.PI / 4;  // 45度

const car2 = new Car();
car2.position.x = 3;

if (car1.checkCollision(car2)) {
  console.log('碰撞！');
}
```

### 场景2：射击游戏的命中检测

```javascript
class Character {
  getBodyOBB() {
    // 身体：窄高的OBB
    return new OBB(
      { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z },
      { x: 0.4, y: 0.9, z: 0.3 },
      this.getOrientationAxes()
    );
  }
  
  getHeadOBB() {
    // 头部：小OBB，爆头伤害更高
    return new OBB(
      { x: this.pos.x, y: this.pos.y + 1.8, z: this.pos.z },
      { x: 0.15, y: 0.15, z: 0.15 },
      this.getOrientationAxes()
    );
  }
}

class BulletSystem {
  checkHit(ray, target) {
    // 先检查头部（爆头）
    const headHit = rayOBBIntersect(ray, target.getHeadOBB());
    if (headHit) {
      return { damage: 100, type: 'headshot', point: headHit.point };
    }
    
    // 再检查身体
    const bodyHit = rayOBBIntersect(ray, target.getBodyOBB());
    if (bodyHit) {
      return { damage: 25, type: 'body', point: bodyHit.point };
    }
    
    return null;
  }
}
```

### 场景3：精确的拾取系统

```javascript
class InventorySystem {
  findPickableItems(player, items) {
    const playerReach = new OBB(
      player.position,
      { x: 1, y: 1, z: 1.5 },  // 伸手范围
      player.getOrientationAxes()
    );
    
    const pickable = [];
    
    for (const item of items) {
      if (obbIntersectsOBB(playerReach, item.obb)) {
        // 进一步检查：玩家是否面向物品
        const toItem = normalize(subtract(item.position, player.position));
        const facingDot = dot(toItem, player.forward);
        
        if (facingDot > 0.7) {  // 夹角<45度
          pickable.push({
            item,
            distance: distance(player.position, item.position)
          });
        }
      }
    }
    
    // 返回最近的物品
    return pickable.sort((a, b) => a.distance - b.distance)[0]?.item;
  }
}
```

### 场景4：飞行模拟的建筑碰撞

```javascript
class Building {
  getOBBs() {
    // 复杂建筑用多个OBB组合
    return [
      // 主楼体
      new OBB(
        { x: 0, y: 10, z: 0 },
        { x: 10, y: 10, z: 10 },
        this.baseOrientation
      ),
      // 塔楼
      new OBB(
        { x: 0, y: 25, z: 0 },
        { x: 3, y: 5, z: 3 },
        this.towerOrientation
      )
    ];
  }
}

class Aircraft {
  checkBuildingCollision(building) {
    const aircraftOBB = this.getOBB();
    
    for (const buildingOBB of building.getOBBs()) {
      if (obbIntersectsOBB(aircraftOBB, buildingOBB)) {
        this.crash();
        return true;
      }
    }
    
    return false;
  }
}
```

## 性能优化

### 技巧1：层次化OBB树

```javascript
class OBBTree {
  constructor(objects) {
    if (objects.length === 1) {
      this.obb = objects[0].obb;
      this.object = objects[0];
    } else {
      const mid = Math.floor(objects.length / 2);
      this.left = new OBBTree(objects.slice(0, mid));
      this.right = new OBBTree(objects.slice(mid));
      
      this.obb = mergeOBBs(this.left.obb, this.right.obb);
    }
  }
  
  query(testOBB, results = []) {
    if (!obbIntersectsOBB(this.obb, testOBB)) {
      return results;
    }
    
    if (this.object) {
      results.push(this.object);
    } else {
      this.left.query(testOBB, results);
      this.right.query(testOBB, results);
    }
    
    return results;
  }
}
```

### 技巧2：AABB粗检 + OBB精检

```javascript
class HybridCollisionSystem {
  broadPhase(objects) {
    const pairs = [];
    
    // 先用AABB快速剔除
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        if (aabbIntersectsAABB(objects[i].aabb, objects[j].aabb)) {
          pairs.push([i, j]);
        }
      }
    }
    
    return pairs;
  }
  
  narrowPhase(pairs, objects) {
    const collisions = [];
    
    // 对通过粗检的用OBB精确测试
    for (const [i, j] of pairs) {
      if (obbIntersectsOBB(objects[i].obb, objects[j].obb)) {
        collisions.push([i, j]);
      }
    }
    
    return collisions;
  }
}
```

## 常见陷阱

### 陷阱1：轴未正交归一化

```javascript
// 错误：轴不正交
const obb = new OBB(center, halfSize, {
  axes: [
    { x: 1, y: 0.1, z: 0 },  // ❌ 不正交
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 }
  ]
});

// 正确：使用Gram-Schmidt正交化
function orthonormalize(axes) {
  const u1 = normalize(axes[0]);
  const u2 = normalize(subtract(axes[1], scale(u1, dot(axes[1], u1))));
  const u3 = cross(u1, u2);
  
  return [u1, u2, u3];
}
```

### 陷阱2：忘记测试叉积轴

```javascript
// 错误：只测试6个主轴
function obbIntersectsOBBWrong(a, b) {
  for (const axis of [...a.axes, ...b.axes]) {
    if (isSeparatingAxis(axis, a, b)) {
      return false;
    }
  }
  return true;  // ❌ 可能漏掉边-边情况
}

// 正确：必须测试15个轴
// （3个A轴 + 3个B轴 + 9个叉积轴）
```

### 陷阱3：叉积轴接近零

```javascript
// 错误：平行轴产生零向量
const axis = cross(a.axes[0], b.axes[0]);  // 可能是(0,0,0)
if (isSeparatingAxis(axis, a, b)) {  // ❌ 除零错误
  return false;
}

// 正确：检查长度
const axis = cross(a.axes[i], b.axes[j]);
if (magnitude(axis) > 0.0001) {
  const normalizedAxis = normalize(axis);
  if (isSeparatingAxis(normalizedAxis, a, b)) {
    return false;
  }
}
```

## 总结

OBB提供**精确的旋转物体碰撞检测**：

| 特性 | OBB | AABB | 包围球 |
|------|-----|------|--------|
| **精确度** | 高 | 中 | 低 |
| **计算成本** | 高（SAT） | 低 | 最低 |
| **旋转不变** | ✅ | ❌ | ✅ |
| **适用场景** | 汽车、飞机、角色 | 静态物体、粗检 | 球形物体、粗检 |

关键要点：
- **分离轴定理**：测试15个轴（6主轴 + 9叉积）
- **提前退出**：找到分离轴立即返回
- **层次化**：用OBB树加速查询
- **混合策略**：AABB粗检 + OBB精检

OBB是精确碰撞检测的核心，掌握它能让游戏物理更真实！
