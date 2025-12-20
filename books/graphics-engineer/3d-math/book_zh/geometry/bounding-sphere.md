# 包围球碰撞检测

想象一下：数千个敌人在屏幕上移动，如何高效判断哪些与玩家发生碰撞？

**包围球**（Bounding Sphere）是最快的碰撞检测形状——只需一次距离计算，比AABB更简单。

## 包围球的表示

包围球用**中心**和**半径**定义：

```javascript
class BoundingSphere {
  constructor(center, radius) {
    this.center = center;  // { x, y, z }
    this.radius = radius;  // 标量
  }
  
  // 从AABB创建包围球
  static fromAABB(aabb) {
    const center = {
      x: (aabb.min.x + aabb.max.x) / 2,
      y: (aabb.min.y + aabb.max.y) / 2,
      z: (aabb.min.z + aabb.max.z) / 2
    };
    
    const size = {
      x: aabb.max.x - aabb.min.x,
      y: aabb.max.y - aabb.min.y,
      z: aabb.max.z - aabb.min.z
    };
    
    // 半对角线长度
    const radius = Math.sqrt(
      size.x * size.x + size.y * size.y + size.z * size.z
    ) / 2;
    
    return new BoundingSphere(center, radius);
  }
  
  // 从点集创建最小包围球（Ritter算法）
  static fromPoints(points) {
    if (points.length === 0) return null;
    
    // 1. 找到最远的两个点
    let maxDist = 0;
    let p1 = points[0];
    let p2 = points[0];
    
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = distance(points[i], points[j]);
        if (dist > maxDist) {
          maxDist = dist;
          p1 = points[i];
          p2 = points[j];
        }
      }
    }
    
    // 2. 初始球：以p1和p2的中点为中心
    const center = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      z: (p1.z + p2.z) / 2
    };
    
    let radius = maxDist / 2;
    
    // 3. 扩展球包含所有点
    for (const point of points) {
      const dist = distance(center, point);
      if (dist > radius) {
        radius = (radius + dist) / 2;
        // 调整中心
        const t = (dist - radius) / dist;
        center.x += (point.x - center.x) * t;
        center.y += (point.y - center.y) * t;
        center.z += (point.z - center.z) * t;
      }
    }
    
    return new BoundingSphere(center, radius);
  }
}
```

## 球与球碰撞

最简单的碰撞检测——检查中心距离：

```javascript
function sphereIntersectsSphere(s1, s2) {
  const dx = s2.center.x - s1.center.x;
  const dy = s2.center.y - s1.center.y;
  const dz = s2.center.z - s1.center.z;
  
  const distSq = dx * dx + dy * dy + dz * dz;
  const radiusSum = s1.radius + s2.radius;
  
  return distSq <= radiusSum * radiusSum;  // 避免sqrt
}

// 测试
const sphere1 = new BoundingSphere({ x: 0, y: 0, z: 0 }, 2);
const sphere2 = new BoundingSphere({ x: 3, y: 0, z: 0 }, 1.5);

console.log(sphereIntersectsSphere(sphere1, sphere2));  // true
```

**优化**：使用平方距离避免昂贵的`sqrt`操作。

## 点与球碰撞

检查点是否在球内：

```javascript
function pointInSphere(point, sphere) {
  const dx = point.x - sphere.center.x;
  const dy = point.y - sphere.center.y;
  const dz = point.z - sphere.center.z;
  
  const distSq = dx * dx + dy * dy + dz * dz;
  
  return distSq <= sphere.radius * sphere.radius;
}

// 计算最近点（用于碰撞响应）
function closestPointOnSphere(point, sphere) {
  const dir = {
    x: point.x - sphere.center.x,
    y: point.y - sphere.center.y,
    z: point.z - sphere.center.z
  };
  
  const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  
  if (dist === 0) {
    // 点在球心，随便选一个方向
    return { x: sphere.center.x + sphere.radius, y: sphere.center.y, z: sphere.center.z };
  }
  
  // 归一化方向，缩放到半径
  const scale = sphere.radius / dist;
  
  return {
    x: sphere.center.x + dir.x * scale,
    y: sphere.center.y + dir.y * scale,
    z: sphere.center.z + dir.z * scale
  };
}
```

## 射线与球相交

经典的**二次方程求解**：

```javascript
function raySphereIntersect(ray, sphere) {
  // 射线：P(t) = O + tD
  // 球：|P - C|² = r²
  // 代入：|O + tD - C|² = r²
  
  const oc = {
    x: ray.origin.x - sphere.center.x,
    y: ray.origin.y - sphere.center.y,
    z: ray.origin.z - sphere.center.z
  };
  
  const a = dot(ray.direction, ray.direction);
  const b = 2 * dot(oc, ray.direction);
  const c = dot(oc, oc) - sphere.radius * sphere.radius;
  
  const discriminant = b * b - 4 * a * c;
  
  if (discriminant < 0) {
    return null;  // 无交点
  }
  
  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);
  
  // 返回最近的正数t
  let t = t1;
  if (t1 < 0) {
    t = t2;
    if (t2 < 0) return null;  // 两个交点都在背后
  }
  
  return {
    point: ray.getPoint(t),
    distance: t,
    normal: normalize({
      x: ray.getPoint(t).x - sphere.center.x,
      y: ray.getPoint(t).y - sphere.center.y,
      z: ray.getPoint(t).z - sphere.center.z
    })
  };
}

// 示例
const ray = new Ray(
  { x: -5, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 }
);

const sphere = new BoundingSphere({ x: 0, y: 0, z: 0 }, 2);

const hit = raySphereIntersect(ray, sphere);
console.log(hit);  // { point: { x: -2, y: 0, z: 0 }, distance: 3, normal: {...} }
```

## 实际应用场景

### 场景1：粗略碰撞检测

```javascript
class PhysicsSystem {
  broadPhase(objects) {
    const pairs = [];
    
    // O(n²) 但每次检测非常快
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        if (sphereIntersectsSphere(objects[i].sphere, objects[j].sphere)) {
          pairs.push([i, j]);
        }
      }
    }
    
    return pairs;
  }
  
  narrowPhase(pairs, objects) {
    // 对通过粗检的物体进行精确检测（AABB、凸包等）
    for (const [i, j] of pairs) {
      if (this.preciseCollision(objects[i], objects[j])) {
        this.resolveCollision(objects[i], objects[j]);
      }
    }
  }
}

// 两阶段检测：包围球（快） → 精确形状（准）
const physics = new PhysicsSystem();
const potentialCollisions = physics.broadPhase(gameObjects);  // 快速剔除
physics.narrowPhase(potentialCollisions, gameObjects);  // 精确检测
```

### 场景2：视锥剔除

```javascript
class FrustumCuller {
  isSphereVisible(sphere, frustumPlanes) {
    // 对6个平面逐一测试
    for (const plane of frustumPlanes) {
      const dist = dot(plane.normal, sphere.center) + plane.distance;
      
      // 球心到平面的距离 < -半径，整个球在外
      if (dist < -sphere.radius) {
        return false;
      }
    }
    
    return true;
  }
}

// 使用
const frustum = camera.getFrustumPlanes();
const culler = new FrustumCuller();

for (const object of scene.objects) {
  if (culler.isSphereVisible(object.boundingSphere, frustum)) {
    renderer.draw(object);
  } else {
    skippedCount++;
  }
}

console.log(`Culled ${skippedCount} objects`);
```

### 场景3：粒子系统碰撞

```javascript
class ParticleSystem {
  update(dt, obstacles) {
    for (const particle of this.particles) {
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      particle.position.z += particle.velocity.z * dt;
      
      // 检查与障碍物碰撞
      for (const obstacle of obstacles) {
        if (pointInSphere(particle.position, obstacle.sphere)) {
          // 反弹
          const normal = normalize({
            x: particle.position.x - obstacle.sphere.center.x,
            y: particle.position.y - obstacle.sphere.center.y,
            z: particle.position.z - obstacle.sphere.center.z
          });
          
          const vdotn = dot(particle.velocity, normal);
          particle.velocity.x -= 2 * vdotn * normal.x;
          particle.velocity.y -= 2 * vdotn * normal.y;
          particle.velocity.z -= 2 * vdotn * normal.z;
          
          // 推出球外
          particle.position = closestPointOnSphere(particle.position, obstacle.sphere);
        }
      }
    }
  }
}
```

### 场景4：LOD选择（细节层次）

```javascript
class LODManager {
  selectLOD(object, camera) {
    const dist = distance(object.boundingSphere.center, camera.position);
    const screenRadius = this.projectRadius(
      object.boundingSphere.radius,
      dist,
      camera.fov
    );
    
    if (screenRadius > 200) return 'high';
    if (screenRadius > 50) return 'medium';
    if (screenRadius > 10) return 'low';
    return 'billboard';  // 太远，用2D替代
  }
  
  projectRadius(radius, distance, fov) {
    const screenHeight = canvas.height;
    const fovRad = fov * Math.PI / 180;
    return (radius / distance) * (screenHeight / (2 * Math.tan(fovRad / 2)));
  }
}

// 使用
const lodManager = new LODManager();

for (const object of scene.objects) {
  const lod = lodManager.selectLOD(object, camera);
  renderer.drawWithLOD(object, lod);
}
```

## 包围球的层次结构（BVH）

```javascript
class BVHNode {
  constructor(objects) {
    if (objects.length === 1) {
      // 叶子节点
      this.sphere = objects[0].boundingSphere;
      this.object = objects[0];
      this.left = null;
      this.right = null;
    } else {
      // 内部节点：递归分割
      const mid = Math.floor(objects.length / 2);
      this.left = new BVHNode(objects.slice(0, mid));
      this.right = new BVHNode(objects.slice(mid));
      
      // 合并子节点的包围球
      this.sphere = mergeSpheres(this.left.sphere, this.right.sphere);
    }
  }
  
  raycast(ray, hits = []) {
    // 先测试当前节点的包围球
    if (!raySphereIntersect(ray, this.sphere)) {
      return hits;
    }
    
    // 叶子节点
    if (this.object) {
      const hit = this.object.raycast(ray);
      if (hit) hits.push(hit);
      return hits;
    }
    
    // 递归测试子节点
    this.left.raycast(ray, hits);
    this.right.raycast(ray, hits);
    
    return hits;
  }
}

function mergeSpheres(s1, s2) {
  const dir = {
    x: s2.center.x - s1.center.x,
    y: s2.center.y - s1.center.y,
    z: s2.center.z - s1.center.z
  };
  
  const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  
  // 一个球包含另一个
  if (dist + s2.radius <= s1.radius) return s1;
  if (dist + s1.radius <= s2.radius) return s2;
  
  // 需要新球
  const newRadius = (dist + s1.radius + s2.radius) / 2;
  const t = (newRadius - s1.radius) / dist;
  
  return new BoundingSphere(
    {
      x: s1.center.x + dir.x * t,
      y: s1.center.y + dir.y * t,
      z: s1.center.z + dir.z * t
    },
    newRadius
  );
}
```

## 常见陷阱

### 陷阱1：忘记使用平方距离

```javascript
// 错误：不必要的sqrt
function sphereIntersectsSlow(s1, s2) {
  const dist = distance(s1.center, s2.center);
  return dist <= s1.radius + s2.radius;  // ❌ 慢
}

// 正确：平方距离
function sphereIntersectsFast(s1, s2) {
  const distSq = distanceSquared(s1.center, s2.center);
  const radiusSum = s1.radius + s2.radius;
  return distSq <= radiusSum * radiusSum;  // ✅ 快3倍
}
```

### 陷阱2：不精确的包围球

```javascript
// 错误：从AABB创建包围球会浪费空间
const aabb = new AABB(
  { x: -10, y: -1, z: -1 },
  { x: 10, y: 1, z: 1 }
);

const sphere = BoundingSphere.fromAABB(aabb);
console.log(sphere.radius);  // ~10.2（太大！）

// 正确：从实际几何体创建
const sphere = BoundingSphere.fromPoints(mesh.vertices);
```

### 陷阱3：射线方向未归一化

```javascript
// 错误：方向向量长度不是1
const ray = new Ray(
  { x: 0, y: 0, z: 0 },
  { x: 2, y: 3, z: 1 }  // ❌ 长度3.74
);

const hit = raySphereIntersect(ray, sphere);
console.log(hit.distance);  // 错误的距离

// 正确
const ray = new Ray(origin, normalize(direction));
```

## 包围球 vs AABB

| 特性 | 包围球 | AABB |
|------|--------|------|
| **检测速度** | 最快（1次sqrt或平方距离） | 快（3次比较） |
| **旋转不变** | ✅ 无需更新 | ❌ 需重新计算 |
| **空间利用率** | 差（细长物体浪费大） | 好（紧密贴合） |
| **应用场景** | 粗略剔除、LOD | 精确碰撞、空间分割 |

## 总结

包围球是最快的碰撞检测形状：

| 操作 | 公式 | 复杂度 |
|------|------|--------|
| **球与球** | $\|\mathbf{C}_1 - \mathbf{C}_2\| \leq r_1 + r_2$ | O(1) |
| **点与球** | $\|\mathbf{P} - \mathbf{C}\| \leq r$ | O(1) |
| **射线与球** | 二次方程 $at^2 + bt + c = 0$ | O(1) |

关键要点：
- **避免sqrt**：使用平方距离比较
- **旋转不变**：球体旋转后半径不变
- **两阶段检测**：包围球粗检 → 精确形状精检
- **BVH加速**：层次化包围球树

包围球简单高效，但精度不如AABB和OBB，适合快速剔除和粗略检测！
