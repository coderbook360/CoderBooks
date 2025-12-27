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

OBB 碰撞检测的核心是**分离轴定理（Separating Axis Theorem，SAT）**。这是凸多面体碰撞检测的理论基础，理解它非常重要。

### 分离轴定理的直观理解

核心思想：**如果两个凸多面体不相交，必然存在一个轴，使得它们在该轴上的投影不重叠。**

想象用手电筒从某个角度照射两个物体，墙上会出现两个影子。如果能找到一个角度，使两个影子完全分开（不重叠），那这两个物体肯定不相交。

反过来，如果无论从哪个角度照射，两个影子都有重叠部分，那这两个物体一定相交。

### 为什么是 15 个轴？

对于两个 OBB，需要测试**15 个潜在分离轴**。你可能会问：为什么偏偏是 15 个？这不是随意规定的，而是数学推导的结果。

**情况 1：面分离（6 个轴）**

如果两个 OBB 被某个面分开，那分离轴就是这个面的法向量。每个 OBB 有 3 个面（每对平行面共享法向量），所以：
- A 的 3 个面法向量（即 A 的 3 个轴）
- B 的 3 个面法向量（即 B 的 3 个轴）
- **共 6 个轴**

**情况 2：边分离（9 个轴）**

两个 OBB 也可能通过"边与边接近但不接触"的方式分离。这种情况下，分离轴垂直于两条接近的边。

数学上，垂直于两条边的向量是这两条边的**叉积**。每个 OBB 有 3 条边方向，两两叉积：
- 3 × 3 = **9 个叉积轴**

**总计：6 + 9 = 15 个轴**

如果在这 15 个轴上都存在投影重叠，那两个 OBB **必定相交**。这是数学定理，不会遗漏任何情况。

### 代码实现

### 代码实现

现在把理论转化为代码。关键在于两个函数：
1. `obbIntersectsOBB`：主函数，遍历 15 个轴
2. `isSeparatingAxis`：辅助函数，判断某轴是否为分离轴

```javascript
/**
 * 检测两个 OBB 是否相交
 * @param {OBB} a - 第一个 OBB
 * @param {OBB} b - 第二个 OBB
 * @returns {boolean} 是否相交
 */
function obbIntersectsOBB(a, b) {
  // 第一部分：测试 A 的 3 个面法向量（A 的局部坐标轴）
  // 如果在这些轴上投影分离，说明 B 在 A 的某个面外侧
  for (let i = 0; i < 3; i++) {
    if (isSeparatingAxis(a.axes[i], a, b)) {
      return false;  // 找到分离轴，不相交
    }
  }
  
  // 第二部分：测试 B 的 3 个面法向量（B 的局部坐标轴）
  // 如果在这些轴上投影分离，说明 A 在 B 的某个面外侧
  for (let i = 0; i < 3; i++) {
    if (isSeparatingAxis(b.axes[i], a, b)) {
      return false;
    }
  }
  
  // 第三部分：测试 9 个叉积轴（边与边可能的分离方向）
  // 这是最容易被遗漏的部分，但对于某些边界情况至关重要
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      // 计算 A 的第 i 条边与 B 的第 j 条边的叉积
      const axis = cross(a.axes[i], b.axes[j]);
      const len = magnitude(axis);
      
      // 如果叉积长度接近 0，说明两边平行，跳过
      // 平行边不会产生有效的分离轴
      if (len > 0.0001) {
        const normalizedAxis = scale(axis, 1 / len);
        if (isSeparatingAxis(normalizedAxis, a, b)) {
          return false;
        }
      }
    }
  }
  
  // 所有 15 个轴都存在投影重叠，确认相交
  return true;
}

/**
 * 判断给定轴是否为分离轴
 * 原理：计算两个 OBB 在该轴上的投影，检查是否重叠
 * @param {Vector3} axis - 待测试的轴（单位向量）
 * @param {OBB} a - 第一个 OBB
 * @param {OBB} b - 第二个 OBB
 * @returns {boolean} 是否为分离轴（投影不重叠）
 */
function isSeparatingAxis(axis, a, b) {
  // 计算 A 在 axis 上的投影半径
  // 将 OBB 的三个半尺寸分别投影到 axis 上，取绝对值后相加
  // 这给出了 OBB 在该轴方向上的"最大延伸"
  const aRadius = 
    Math.abs(dot(axis, scale(a.axes[0], a.halfSize.x))) +
    Math.abs(dot(axis, scale(a.axes[1], a.halfSize.y))) +
    Math.abs(dot(axis, scale(a.axes[2], a.halfSize.z)));
  
  // 计算 B 在 axis 上的投影半径
  const bRadius = 
    Math.abs(dot(axis, scale(b.axes[0], b.halfSize.x))) +
    Math.abs(dot(axis, scale(b.axes[1], b.halfSize.y))) +
    Math.abs(dot(axis, scale(b.axes[2], b.halfSize.z)));
  
  // 计算两个 OBB 中心在 axis 上的距离
  const distance = Math.abs(dot(axis, subtract(b.center, a.center)));
  
  // 关键判断：如果中心距离大于两个投影半径之和
  // 说明投影不重叠，找到了分离轴
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
